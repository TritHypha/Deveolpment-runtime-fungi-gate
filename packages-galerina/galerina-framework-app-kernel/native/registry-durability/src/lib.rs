#![deny(unsafe_op_in_unsafe_fn)]

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
        WindowsHostProbeError, WindowsHostProbeVerdict,
    };
    use std::ffi::c_void;
    use std::ffi::OsStr;
    use std::fs;
    use std::os::windows::ffi::OsStrExt;
    use std::path::{Component, Path};

    const INVALID_FILE_ATTRIBUTES: u32 = u32::MAX;
    const INVALID_HANDLE_VALUE: *mut c_void = -1_isize as *mut c_void;
    const FILE_ATTRIBUTE_DIRECTORY: u32 = 0x0000_0010;
    const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x0000_0400;
    const FILE_SHARE_READ: u32 = 0x0000_0001;
    const FILE_SHARE_WRITE: u32 = 0x0000_0002;
    const FILE_SHARE_DELETE: u32 = 0x0000_0004;
    const GENERIC_WRITE: u32 = 0x4000_0000;
    const OPEN_EXISTING: u32 = 3;
    const FILE_FLAG_BACKUP_SEMANTICS: u32 = 0x0200_0000;
    const MAX_PATH_CHARS: usize = 32_768;
    const FILESYSTEM_NAME_CHARS: usize = 64;

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
