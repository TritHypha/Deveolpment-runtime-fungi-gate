#![deny(unsafe_op_in_unsafe_fn)]

#[cfg(all(feature = "fault-injection", not(debug_assertions)))]
compile_error!("fault-injection is test-only and must not be compiled into an optimized build");

use std::path::Path;

pub const DRIVE_FIXED: u32 = 3;
pub const DRIVE_REMOTE: u32 = 4;
pub const FILE_SUPPORTS_REMOTE_STORAGE: u32 = 0x0000_0100;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MeasuredWindowsHost {
    pub drive_type: u32,
    pub filesystem: String,
    pub filesystem_flags: u32,
    pub volume_serial: u32,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdmittedWindowsHost {
    pub drive_type: u32,
    pub filesystem: String,
    pub filesystem_flags: u32,
    pub volume_serial: u32,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WindowsHostProbeError {
    code: &'static str,
    os_code: Option<u32>,
}

impl WindowsHostProbeError {
    pub fn code(&self) -> &'static str {
        self.code
    }

    pub fn os_code(&self) -> Option<u32> {
        self.os_code
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum WindowsHostProbeVerdict {
    Candidate(AdmittedWindowsHost),
    Deny(WindowsHostProbeError),
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum WindowsDirectoryFlushVerdict {
    Candidate,
    Deny(WindowsHostProbeError),
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum WindowsGenerationPublicationVerdict {
    Candidate { byte_length: usize },
    Deny(WindowsHostProbeError),
}

fn deny(code: &'static str, os_code: Option<u32>) -> WindowsHostProbeVerdict {
    WindowsHostProbeVerdict::Deny(WindowsHostProbeError { code, os_code })
}

pub fn admit_measured_windows_host(measured: MeasuredWindowsHost) -> WindowsHostProbeVerdict {
    if measured.drive_type != DRIVE_FIXED {
        return deny("WINDOWS_VOLUME_NOT_FIXED_LOCAL", None);
    }
    if measured.filesystem_flags & FILE_SUPPORTS_REMOTE_STORAGE != 0 {
        return deny("WINDOWS_VOLUME_SUPPORTS_REMOTE_STORAGE", None);
    }
    let filesystem = if measured.filesystem.eq_ignore_ascii_case("NTFS") {
        "ntfs"
    } else if measured.filesystem.eq_ignore_ascii_case("ReFS") {
        "refs"
    } else {
        return deny("WINDOWS_FILESYSTEM_NOT_ADMITTED", None);
    };
    WindowsHostProbeVerdict::Candidate(AdmittedWindowsHost {
        drive_type: measured.drive_type,
        filesystem: filesystem.to_owned(),
        filesystem_flags: measured.filesystem_flags,
        volume_serial: measured.volume_serial,
    })
}

#[cfg(windows)]
mod windows {
    use super::{
        admit_measured_windows_host, deny, MeasuredWindowsHost, WindowsDirectoryFlushVerdict,
        WindowsGenerationPublicationVerdict, WindowsHostProbeError, WindowsHostProbeVerdict,
    };
    use std::ffi::c_void;
    use std::ffi::OsStr;
    use std::fs::{self, File, OpenOptions};
    use std::io::{Read, Write};
    use std::os::windows::ffi::OsStrExt;
    use std::os::windows::fs::OpenOptionsExt;
    use std::os::windows::io::{AsRawHandle, IntoRawHandle};
    use std::path::{Component, Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    const INVALID_FILE_ATTRIBUTES: u32 = u32::MAX;
    const INVALID_HANDLE_VALUE: *mut c_void = -1_isize as *mut c_void;
    const FILE_ATTRIBUTE_DIRECTORY: u32 = 0x0000_0010;
    const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x0000_0400;
    const FILE_FLAG_WRITE_THROUGH: u32 = 0x8000_0000;
    const FILE_FLAG_OPEN_REPARSE_POINT: u32 = 0x0020_0000;
    const FILE_SHARE_READ: u32 = 0x0000_0001;
    const FILE_SHARE_WRITE: u32 = 0x0000_0002;
    const FILE_SHARE_DELETE: u32 = 0x0000_0004;
    const GENERIC_WRITE: u32 = 0x4000_0000;
    const OPEN_EXISTING: u32 = 3;
    const FILE_FLAG_BACKUP_SEMANTICS: u32 = 0x0200_0000;
    const MOVEFILE_WRITE_THROUGH: u32 = 0x0000_0008;
    const MAX_GENERATION_BYTES: usize = 16 * 1024 * 1024;
    const MAX_PATH_CHARS: usize = 32_768;
    const FILESYSTEM_NAME_CHARS: usize = 64;

    #[repr(C)]
    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    struct FileTime {
        low: u32,
        high: u32,
    }

    #[repr(C)]
    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    struct ByHandleFileInformation {
        attributes: u32,
        creation_time: FileTime,
        last_access_time: FileTime,
        last_write_time: FileTime,
        volume_serial_number: u32,
        file_size_high: u32,
        file_size_low: u32,
        number_of_links: u32,
        file_index_high: u32,
        file_index_low: u32,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    struct OpenFileIdentity {
        attributes: u32,
        volume_serial_number: u32,
        byte_length: u64,
        number_of_links: u32,
        file_index: u64,
        last_write_time: FileTime,
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn CloseHandle(object: *mut c_void) -> i32;
        fn CreateFileW(
            file_name: *const u16,
            desired_access: u32,
            share_mode: u32,
            security_attributes: *mut c_void,
            creation_disposition: u32,
            flags_and_attributes: u32,
            template_file: *mut c_void,
        ) -> *mut c_void;
        fn FlushFileBuffers(file: *mut c_void) -> i32;
        fn GetDriveTypeW(root_path_name: *const u16) -> u32;
        fn GetFileAttributesW(file_name: *const u16) -> u32;
        fn GetLastError() -> u32;
        fn GetVolumeInformationW(
            root_path_name: *const u16,
            volume_name_buffer: *mut u16,
            volume_name_size: u32,
            volume_serial_number: *mut u32,
            maximum_component_length: *mut u32,
            filesystem_flags: *mut u32,
            filesystem_name_buffer: *mut u16,
            filesystem_name_size: u32,
        ) -> i32;
        fn GetVolumePathNameW(
            file_name: *const u16,
            volume_path_name: *mut u16,
            buffer_length: u32,
        ) -> i32;
        fn GetFileInformationByHandle(
            file: *mut c_void,
            information: *mut ByHandleFileInformation,
        ) -> i32;
        fn MoveFileExW(
            existing_file_name: *const u16,
            new_file_name: *const u16,
            flags: u32,
        ) -> i32;
    }

    fn last_error() -> u32 {
        // SAFETY: GetLastError takes no pointers and has no preconditions.
        unsafe { GetLastError() }
    }

    fn wide_nul(value: &OsStr) -> Option<Vec<u16>> {
        let units: Vec<u16> = value.encode_wide().collect();
        if units.is_empty() || units.contains(&0) {
            return None;
        }
        let mut terminated = units;
        terminated.push(0);
        Some(terminated)
    }

    fn terminated_length(buffer: &[u16]) -> Option<usize> {
        buffer.iter().position(|unit| *unit == 0)
    }

    fn reparse_component(path: &Path) -> Result<bool, u32> {
        let mut ancestors: Vec<&Path> = path
            .ancestors()
            .filter(|ancestor| !ancestor.as_os_str().is_empty())
            .collect();
        ancestors.reverse();
        for ancestor in ancestors {
            let wide = wide_nul(ancestor.as_os_str()).ok_or(87_u32)?;
            // SAFETY: wide is NUL-terminated and remains alive for the call.
            let attributes = unsafe { GetFileAttributesW(wide.as_ptr()) };
            if attributes == INVALID_FILE_ATTRIBUTES {
                return Err(last_error());
            }
            if attributes & FILE_ATTRIBUTE_REPARSE_POINT != 0 {
                return Ok(true);
            }
        }
        Ok(false)
    }

    pub fn probe(path: &Path) -> WindowsHostProbeVerdict {
        if !path.is_absolute()
            || path
                .components()
                .any(|component| matches!(component, Component::ParentDir | Component::CurDir))
        {
            return deny("WINDOWS_PATH_NOT_ABSOLUTE_CANONICAL_INPUT", None);
        }
        let metadata = match fs::symlink_metadata(path) {
            Ok(metadata) => metadata,
            Err(_) => return deny("WINDOWS_PATH_UNAVAILABLE", None),
        };
        if !metadata.is_dir() || metadata.file_type().is_symlink() {
            return deny("WINDOWS_PATH_NOT_DIRECT_DIRECTORY", None);
        }
        let input_wide = match wide_nul(path.as_os_str()) {
            Some(value) => value,
            None => return deny("WINDOWS_PATH_ENCODING_REFUSED", None),
        };
        // SAFETY: input_wide is NUL-terminated and lives for the call.
        let attributes = unsafe { GetFileAttributesW(input_wide.as_ptr()) };
        if attributes == INVALID_FILE_ATTRIBUTES {
            return deny("WINDOWS_PATH_ATTRIBUTES_UNAVAILABLE", Some(last_error()));
        }
        if attributes & FILE_ATTRIBUTE_DIRECTORY == 0
            || attributes & FILE_ATTRIBUTE_REPARSE_POINT != 0
        {
            return deny("WINDOWS_PATH_REPARSE_OR_NON_DIRECTORY", None);
        }
        match reparse_component(path) {
            Ok(false) => {}
            Ok(true) => return deny("WINDOWS_PATH_REPARSE_ANCESTOR", None),
            Err(code) => {
                return deny("WINDOWS_PATH_ANCESTRY_UNAVAILABLE", Some(code));
            }
        }
        if fs::canonicalize(path).is_err() {
            return deny("WINDOWS_PATH_CANONICALIZATION_FAILED", None);
        }

        let mut volume_path = vec![0_u16; MAX_PATH_CHARS];
        // SAFETY: buffers are valid for their declared lengths and input_wide
        // is NUL-terminated.
        let volume_ok = unsafe {
            GetVolumePathNameW(
                input_wide.as_ptr(),
                volume_path.as_mut_ptr(),
                volume_path.len() as u32,
            )
        };
        if volume_ok == 0 {
            return deny("WINDOWS_VOLUME_PATH_UNAVAILABLE", Some(last_error()));
        }
        let volume_length = match terminated_length(&volume_path) {
            Some(length) if length > 0 => length,
            _ => return deny("WINDOWS_VOLUME_PATH_MALFORMED", None),
        };
        volume_path.truncate(volume_length + 1);

        // SAFETY: volume_path is NUL-terminated.
        let drive_type = unsafe { GetDriveTypeW(volume_path.as_ptr()) };
        let mut volume_serial = 0_u32;
        let mut maximum_component_length = 0_u32;
        let mut filesystem_flags = 0_u32;
        let mut filesystem_name = vec![0_u16; FILESYSTEM_NAME_CHARS];
        // SAFETY: all output pointers reference writable values or buffers of
        // the declared sizes; volume_path remains NUL-terminated.
        let information_ok = unsafe {
            GetVolumeInformationW(
                volume_path.as_ptr(),
                std::ptr::null_mut(),
                0,
                &mut volume_serial,
                &mut maximum_component_length,
                &mut filesystem_flags,
                filesystem_name.as_mut_ptr(),
                filesystem_name.len() as u32,
            )
        };
        if information_ok == 0 {
            return deny("WINDOWS_VOLUME_INFORMATION_UNAVAILABLE", Some(last_error()));
        }
        let filesystem_length = match terminated_length(&filesystem_name) {
            Some(length) if length > 0 => length,
            _ => return deny("WINDOWS_FILESYSTEM_NAME_MALFORMED", None),
        };
        let filesystem = match String::from_utf16(&filesystem_name[..filesystem_length]) {
            Ok(value) => value,
            Err(_) => return deny("WINDOWS_FILESYSTEM_NAME_NOT_UTF16", None),
        };
        admit_measured_windows_host(MeasuredWindowsHost {
            drive_type,
            filesystem,
            filesystem_flags,
            volume_serial,
        })
    }

    fn flush_deny(code: &'static str, os_code: Option<u32>) -> WindowsDirectoryFlushVerdict {
        WindowsDirectoryFlushVerdict::Deny(WindowsHostProbeError { code, os_code })
    }

    pub fn flush_directory(path: &Path) -> WindowsDirectoryFlushVerdict {
        if !matches!(probe(path), WindowsHostProbeVerdict::Candidate(_)) {
            return flush_deny("WINDOWS_DIRECTORY_HOST_NOT_CANDIDATE", None);
        }
        let wide = match wide_nul(path.as_os_str()) {
            Some(value) => value,
            None => return flush_deny("WINDOWS_DIRECTORY_PATH_ENCODING_REFUSED", None),
        };
        // SAFETY: wide is NUL-terminated. Null security/template pointers are
        // permitted, and the handle is checked before use.
        let handle = unsafe {
            CreateFileW(
                wide.as_ptr(),
                GENERIC_WRITE,
                FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                std::ptr::null_mut(),
                OPEN_EXISTING,
                FILE_FLAG_BACKUP_SEMANTICS,
                std::ptr::null_mut(),
            )
        };
        if handle == INVALID_HANDLE_VALUE {
            return flush_deny("WINDOWS_DIRECTORY_OPEN_REFUSED", Some(last_error()));
        }
        // SAFETY: handle was returned successfully by CreateFileW and remains
        // open for this call.
        let flush_ok = unsafe { FlushFileBuffers(handle) };
        let flush_error = if flush_ok == 0 {
            Some(last_error())
        } else {
            None
        };
        // SAFETY: handle is a live kernel handle owned by this function.
        let close_ok = unsafe { CloseHandle(handle) };
        if flush_error.is_some() {
            return flush_deny("WINDOWS_DIRECTORY_FLUSH_REFUSED", flush_error);
        }
        if close_ok == 0 {
            return flush_deny("WINDOWS_DIRECTORY_CLOSE_REFUSED", Some(last_error()));
        }
        WindowsDirectoryFlushVerdict::Candidate
    }

    fn publication_deny(
        code: &'static str,
        os_code: Option<u32>,
    ) -> WindowsGenerationPublicationVerdict {
        WindowsGenerationPublicationVerdict::Deny(WindowsHostProbeError { code, os_code })
    }

    fn io_code(error: &std::io::Error) -> Option<u32> {
        error
            .raw_os_error()
            .and_then(|code| u32::try_from(code).ok())
    }

    fn generation_id_valid(generation_id: &str) -> bool {
        generation_id.len() == 64
            && generation_id
                .bytes()
                .all(|value| value.is_ascii_digit() || (b'a'..=b'f').contains(&value))
    }

    fn close_file(file: File) -> Result<(), u32> {
        let handle = file.into_raw_handle().cast::<c_void>();
        // SAFETY: ownership of the live handle moved out of File and into this
        // function, so exactly one CloseHandle call is required.
        if unsafe { CloseHandle(handle) } == 0 {
            Err(last_error())
        } else {
            Ok(())
        }
    }

    fn open_file_identity(file: &File) -> Result<Option<OpenFileIdentity>, u32> {
        let mut information = ByHandleFileInformation {
            attributes: 0,
            creation_time: FileTime { low: 0, high: 0 },
            last_access_time: FileTime { low: 0, high: 0 },
            last_write_time: FileTime { low: 0, high: 0 },
            volume_serial_number: 0,
            file_size_high: 0,
            file_size_low: 0,
            number_of_links: 0,
            file_index_high: 0,
            file_index_low: 0,
        };
        // SAFETY: file owns a live handle and information is a writable
        // BY_HANDLE_FILE_INFORMATION-compatible value for the call.
        if unsafe {
            GetFileInformationByHandle(file.as_raw_handle().cast::<c_void>(), &mut information)
        } == 0
        {
            return Err(last_error());
        }
        if information.attributes & (FILE_ATTRIBUTE_DIRECTORY | FILE_ATTRIBUTE_REPARSE_POINT) != 0
            || information.number_of_links != 1
        {
            return Ok(None);
        }
        Ok(Some(OpenFileIdentity {
            attributes: information.attributes,
            volume_serial_number: information.volume_serial_number,
            byte_length: u64::from(information.file_size_high) << 32
                | u64::from(information.file_size_low),
            number_of_links: information.number_of_links,
            file_index: u64::from(information.file_index_high) << 32
                | u64::from(information.file_index_low),
            last_write_time: information.last_write_time,
        }))
    }

    fn read_exact_candidate(path: &Path, expected: &[u8]) -> Result<bool, u32> {
        let mut file = OpenOptions::new()
            .read(true)
            .share_mode(0)
            .custom_flags(FILE_FLAG_OPEN_REPARSE_POINT)
            .open(path)
            .map_err(|error| io_code(&error).unwrap_or(1))?;
        let before = match open_file_identity(&file)? {
            Some(identity) => identity,
            None => {
                close_file(file)?;
                return Ok(false);
            }
        };
        if usize::try_from(before.byte_length).ok() != Some(expected.len()) {
            close_file(file)?;
            return Ok(false);
        }
        let mut observed = Vec::with_capacity(expected.len());
        file.read_to_end(&mut observed)
            .map_err(|error| io_code(&error).unwrap_or(1))?;
        let after = open_file_identity(&file)?;
        close_file(file)?;
        Ok(after == Some(before) && observed == expected)
    }

    fn stage_path(directory: &Path, generation_id: &str) -> Result<PathBuf, ()> {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| ())?
            .as_nanos();
        Ok(directory.join(format!(
            ".registry-generation-{generation_id}.{}-{nonce}.tmp",
            std::process::id(),
        )))
    }

    fn publish_generation_observed<F>(
        directory: &Path,
        generation_id: &str,
        bytes: &[u8],
        mut observe: F,
    ) -> WindowsGenerationPublicationVerdict
    where
        F: FnMut(&'static str),
    {
        if !generation_id_valid(generation_id)
            || bytes.is_empty()
            || bytes.len() > MAX_GENERATION_BYTES
        {
            return publication_deny("WINDOWS_PUBLICATION_INPUT_REFUSED", None);
        }
        if !matches!(probe(directory), WindowsHostProbeVerdict::Candidate(_)) {
            return publication_deny("WINDOWS_PUBLICATION_HOST_NOT_CANDIDATE", None);
        }
        let final_path = directory.join(format!("registry-generation-{generation_id}.json"));
        if final_path.exists() {
            return match read_exact_candidate(&final_path, bytes) {
                Ok(true)
                    if matches!(
                        flush_directory(directory),
                        WindowsDirectoryFlushVerdict::Candidate
                    ) =>
                {
                    WindowsGenerationPublicationVerdict::Candidate {
                        byte_length: bytes.len(),
                    }
                }
                Ok(_) => publication_deny("WINDOWS_PUBLICATION_COLLISION", None),
                Err(code) => {
                    publication_deny("WINDOWS_PUBLICATION_EXISTING_READ_REFUSED", Some(code))
                }
            };
        }
        let staging_path = match stage_path(directory, generation_id) {
            Ok(path) => path,
            Err(()) => return publication_deny("WINDOWS_PUBLICATION_NONCE_UNAVAILABLE", None),
        };
        let mut staging = match OpenOptions::new()
            .write(true)
            .create_new(true)
            .share_mode(0)
            .custom_flags(FILE_FLAG_WRITE_THROUGH)
            .open(&staging_path)
        {
            Ok(file) => file,
            Err(error) => {
                return publication_deny("WINDOWS_PUBLICATION_STAGE_OPEN_REFUSED", io_code(&error));
            }
        };
        observe("stage-opened");
        let staged = (|| -> Result<(), (&'static str, Option<u32>)> {
            staging
                .write_all(bytes)
                .map_err(|error| ("WINDOWS_PUBLICATION_WRITE_REFUSED", io_code(&error)))?;
            observe("bytes-written");
            staging
                .flush()
                .map_err(|error| ("WINDOWS_PUBLICATION_USER_FLUSH_REFUSED", io_code(&error)))?;
            // SAFETY: staging owns a live file handle for the duration of the
            // call. FlushFileBuffers is the required file-data barrier.
            if unsafe { FlushFileBuffers(staging.as_raw_handle().cast::<c_void>()) } == 0 {
                return Err(("WINDOWS_PUBLICATION_FILE_FLUSH_REFUSED", Some(last_error())));
            }
            observe("file-flushed");
            let identity = open_file_identity(&staging)
                .map_err(|code| ("WINDOWS_PUBLICATION_STAGE_STAT_REFUSED", Some(code)))?;
            if identity.and_then(|value| usize::try_from(value.byte_length).ok())
                != Some(bytes.len())
            {
                return Err(("WINDOWS_PUBLICATION_SHORT_WRITE", None));
            }
            Ok(())
        })();
        if let Err((code, os_code)) = staged {
            drop(staging);
            return publication_deny(code, os_code);
        }
        if let Err(code) = close_file(staging) {
            return publication_deny("WINDOWS_PUBLICATION_STAGE_CLOSE_REFUSED", Some(code));
        }
        observe("stage-closed");

        let staging_wide = match wide_nul(staging_path.as_os_str()) {
            Some(value) => value,
            None => return publication_deny("WINDOWS_PUBLICATION_STAGE_PATH_REFUSED", None),
        };
        let final_wide = match wide_nul(final_path.as_os_str()) {
            Some(value) => value,
            None => return publication_deny("WINDOWS_PUBLICATION_FINAL_PATH_REFUSED", None),
        };
        // SAFETY: both paths are NUL-terminated and remain alive. No replace
        // flag is supplied, so an existing destination cannot be overwritten.
        let moved = unsafe {
            MoveFileExW(
                staging_wide.as_ptr(),
                final_wide.as_ptr(),
                MOVEFILE_WRITE_THROUGH,
            )
        };
        if moved == 0 {
            let move_error = last_error();
            return match read_exact_candidate(&final_path, bytes) {
                Ok(true)
                    if matches!(
                        flush_directory(directory),
                        WindowsDirectoryFlushVerdict::Candidate
                    ) =>
                {
                    WindowsGenerationPublicationVerdict::Candidate {
                        byte_length: bytes.len(),
                    }
                }
                _ => publication_deny("WINDOWS_PUBLICATION_MOVE_REFUSED", Some(move_error)),
            };
        }
        observe("published");

        let reopened = read_exact_candidate(&final_path, bytes);
        if !matches!(reopened, Ok(true)) {
            return publication_deny("WINDOWS_PUBLICATION_REOPEN_REFUSED", None);
        }
        observe("reopened-verified");
        let directory_flushed = matches!(
            flush_directory(directory),
            WindowsDirectoryFlushVerdict::Candidate
        );
        if !directory_flushed {
            return publication_deny("WINDOWS_PUBLICATION_BARRIER_REFUSED", None);
        }
        observe("directory-flushed");
        WindowsGenerationPublicationVerdict::Candidate {
            byte_length: bytes.len(),
        }
    }

    pub fn publish_generation(
        directory: &Path,
        generation_id: &str,
        bytes: &[u8],
    ) -> WindowsGenerationPublicationVerdict {
        publish_generation_observed(directory, generation_id, bytes, |_| {})
    }

    #[cfg(feature = "fault-injection")]
    pub fn publish_generation_fault_candidate<F>(
        directory: &Path,
        generation_id: &str,
        bytes: &[u8],
        observe: F,
    ) -> WindowsGenerationPublicationVerdict
    where
        F: FnMut(&'static str),
    {
        publish_generation_observed(directory, generation_id, bytes, observe)
    }
}

pub fn probe_windows_host(path: &Path) -> WindowsHostProbeVerdict {
    #[cfg(windows)]
    {
        windows::probe(path)
    }
    #[cfg(not(windows))]
    {
        let _ = path;
        deny("WINDOWS_PLATFORM_UNAVAILABLE", None)
    }
}

pub fn flush_windows_directory_candidate(path: &Path) -> WindowsDirectoryFlushVerdict {
    #[cfg(windows)]
    {
        windows::flush_directory(path)
    }
    #[cfg(not(windows))]
    {
        let _ = path;
        WindowsDirectoryFlushVerdict::Deny(WindowsHostProbeError {
            code: "WINDOWS_PLATFORM_UNAVAILABLE",
            os_code: None,
        })
    }
}

pub fn publish_windows_generation_candidate(
    directory: &Path,
    generation_id: &str,
    bytes: &[u8],
) -> WindowsGenerationPublicationVerdict {
    #[cfg(windows)]
    {
        windows::publish_generation(directory, generation_id, bytes)
    }
    #[cfg(not(windows))]
    {
        let _ = (directory, generation_id, bytes);
        WindowsGenerationPublicationVerdict::Deny(WindowsHostProbeError {
            code: "WINDOWS_PLATFORM_UNAVAILABLE",
            os_code: None,
        })
    }
}

#[cfg(feature = "fault-injection")]
#[doc(hidden)]
pub fn publish_windows_generation_fault_candidate<F>(
    directory: &Path,
    generation_id: &str,
    bytes: &[u8],
    observe: F,
) -> WindowsGenerationPublicationVerdict
where
    F: FnMut(&'static str),
{
    #[cfg(windows)]
    {
        windows::publish_generation_fault_candidate(directory, generation_id, bytes, observe)
    }
    #[cfg(not(windows))]
    {
        let _ = (directory, generation_id, bytes, observe);
        WindowsGenerationPublicationVerdict::Deny(WindowsHostProbeError {
            code: "WINDOWS_PLATFORM_UNAVAILABLE",
            os_code: None,
        })
    }
}
