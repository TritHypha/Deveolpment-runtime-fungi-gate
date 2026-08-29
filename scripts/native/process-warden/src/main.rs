#![deny(unsafe_op_in_unsafe_fn)]

#[cfg(not(windows))]
fn main() {
    eprintln!("WARDEN_PLATFORM_REFUSED");
    std::process::exit(126);
}

#[cfg(windows)]
mod windows {
    use serde::{Deserialize, Serialize};
    use sha2::{Digest, Sha256};
    use std::cmp::Ordering;
    use std::collections::HashSet;
    use std::env;
    use std::ffi::{c_void, OsStr, OsString};
    use std::fs;
    use std::io::{self, Read};
    use std::mem::{size_of, zeroed};
    use std::os::windows::ffi::OsStrExt;
    use std::path::{Path, PathBuf};
    use std::process;
    use std::ptr::null;

    type Bool = i32;
    type Dword = u32;
    type Handle = *mut c_void;

    const FALSE: Bool = 0;
    const TRUE: Bool = 1;
    const CREATE_SUSPENDED: Dword = 0x0000_0004;
    const CREATE_UNICODE_ENVIRONMENT: Dword = 0x0000_0400;
    const JOB_OBJECT_EXTENDED_LIMIT_INFORMATION: i32 = 9;
    const JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE: Dword = 0x0000_2000;
    const SYNCHRONIZE: Dword = 0x0010_0000;
    const GENERIC_READ: Dword = 0x8000_0000;
    const FILE_READ_ATTRIBUTES: Dword = 0x0000_0080;
    const FILE_SHARE_READ: Dword = 0x0000_0001;
    const OPEN_EXISTING: Dword = 3;
    const FILE_ATTRIBUTE_DIRECTORY: Dword = 0x0000_0010;
    const FILE_ATTRIBUTE_NORMAL: Dword = 0x0000_0080;
    const FILE_ATTRIBUTE_REPARSE_POINT: Dword = 0x0000_0400;
    const FILE_FLAG_BACKUP_SEMANTICS: Dword = 0x0200_0000;
    const FILE_FLAG_OPEN_REPARSE_POINT: Dword = 0x0020_0000;
    const FILE_TYPE_DISK: Dword = 0x0000_0001;
    const INVALID_FILE_ATTRIBUTES: Dword = Dword::MAX;
    const FILE_BASIC_INFO_CLASS: i32 = 0;
    const NORMALIZATION_C: i32 = 0x1;
    const CSTR_LESS_THAN: i32 = 1;
    const CSTR_EQUAL: i32 = 2;
    const CSTR_GREATER_THAN: i32 = 3;
    const WAIT_OBJECT_0: Dword = 0x0000_0000;
    const WAIT_TIMEOUT: Dword = 0x0000_0102;
    const INFINITE: Dword = 0xffff_ffff;
    const WARDEN_TIMEOUT_EXIT: Dword = 124;
    const WARDEN_OWNER_EXIT: Dword = 125;
    const WARDEN_SETUP_EXIT: Dword = 126;
    const PROTECTED_MANIFEST_MAX_BYTES: usize = 4 * 1024 * 1024;
    const PROTECTED_FILE_MAX_COUNT: usize = 8_192;
    const PROTECTED_PATH_MAX_BYTES: usize = 4_096;
    const INVALID_HANDLE_VALUE: Handle = -1isize as Handle;

    #[repr(C)]
    struct StartupInfoW {
        cb: Dword,
        lp_reserved: *mut u16,
        lp_desktop: *mut u16,
        lp_title: *mut u16,
        dw_x: Dword,
        dw_y: Dword,
        dw_x_size: Dword,
        dw_y_size: Dword,
        dw_x_count_chars: Dword,
        dw_y_count_chars: Dword,
        dw_fill_attribute: Dword,
        dw_flags: Dword,
        w_show_window: u16,
        cb_reserved2: u16,
        lp_reserved2: *mut u8,
        h_std_input: Handle,
        h_std_output: Handle,
        h_std_error: Handle,
    }

    #[repr(C)]
    struct ProcessInformation {
        h_process: Handle,
        h_thread: Handle,
        dw_process_id: Dword,
        dw_thread_id: Dword,
    }

    #[repr(C)]
    struct JobObjectBasicLimitInformation {
        per_process_user_time_limit: i64,
        per_job_user_time_limit: i64,
        limit_flags: Dword,
        minimum_working_set_size: usize,
        maximum_working_set_size: usize,
        active_process_limit: Dword,
        affinity: usize,
        priority_class: Dword,
        scheduling_class: Dword,
    }

    #[repr(C)]
    struct IoCounters {
        read_operation_count: u64,
        write_operation_count: u64,
        other_operation_count: u64,
        read_transfer_count: u64,
        write_transfer_count: u64,
        other_transfer_count: u64,
    }

    #[repr(C)]
    struct JobObjectExtendedLimitInformation {
        basic_limit_information: JobObjectBasicLimitInformation,
        io_info: IoCounters,
        process_memory_limit: usize,
        job_memory_limit: usize,
        peak_process_memory_used: usize,
        peak_job_memory_used: usize,
    }

    #[repr(C)]
    struct FileBasicInfo {
        creation_time: i64,
        last_access_time: i64,
        last_write_time: i64,
        change_time: i64,
        file_attributes: Dword,
    }

    #[derive(Debug, Deserialize, Serialize)]
    #[serde(deny_unknown_fields)]
    struct ProtectedFileSet {
        schema: String,
        root: String,
        files: Vec<ProtectedFile>,
    }

    #[derive(Debug, Deserialize, Serialize)]
    #[serde(deny_unknown_fields)]
    struct ProtectedFile {
        path: String,
        sha256: String,
    }

    enum ProtectionMode {
        None,
        ReadTree(OsString),
        FileSetStdin,
    }

    #[link(name = "kernel32")]
    unsafe extern "system" {
        fn CreateJobObjectW(attributes: *const c_void, name: *const u16) -> Handle;
        fn SetInformationJobObject(
            job: Handle,
            class: i32,
            information: *const c_void,
            information_length: Dword,
        ) -> Bool;
        fn CreateProcessW(
            application_name: *const u16,
            command_line: *mut u16,
            process_attributes: *const c_void,
            thread_attributes: *const c_void,
            inherit_handles: Bool,
            creation_flags: Dword,
            environment: *const c_void,
            current_directory: *const u16,
            startup_info: *mut StartupInfoW,
            process_information: *mut ProcessInformation,
        ) -> Bool;
        fn AssignProcessToJobObject(job: Handle, process: Handle) -> Bool;
        fn ResumeThread(thread: Handle) -> Dword;
        fn OpenProcess(access: Dword, inherit_handle: Bool, process_id: Dword) -> Handle;
        fn CreateFileW(
            file_name: *const u16,
            desired_access: Dword,
            share_mode: Dword,
            security_attributes: *const c_void,
            creation_disposition: Dword,
            flags_and_attributes: Dword,
            template_file: Handle,
        ) -> Handle;
        fn GetFileAttributesW(file_name: *const u16) -> Dword;
        fn GetFileInformationByHandleEx(
            file: Handle,
            file_information_class: i32,
            file_information: *mut c_void,
            buffer_size: Dword,
        ) -> Bool;
        fn GetFinalPathNameByHandleW(
            file: Handle,
            file_path: *mut u16,
            file_path_length: Dword,
            flags: Dword,
        ) -> Dword;
        fn GetFileType(file: Handle) -> Dword;
        fn ReadFile(
            file: Handle,
            buffer: *mut c_void,
            bytes_to_read: Dword,
            bytes_read: *mut Dword,
            overlapped: *mut c_void,
        ) -> Bool;
        fn CompareStringOrdinal(
            string1: *const u16,
            string1_length: i32,
            string2: *const u16,
            string2_length: i32,
            ignore_case: Bool,
        ) -> i32;
        fn WaitForMultipleObjects(
            count: Dword,
            handles: *const Handle,
            wait_all: Bool,
            milliseconds: Dword,
        ) -> Dword;
        fn WaitForSingleObject(handle: Handle, milliseconds: Dword) -> Dword;
        fn GetExitCodeProcess(process: Handle, exit_code: *mut Dword) -> Bool;
        fn GetCurrentProcessId() -> Dword;
        fn SetEnvironmentVariableW(name: *const u16, value: *const u16) -> Bool;
        fn TerminateJobObject(job: Handle, exit_code: Dword) -> Bool;
        fn TerminateProcess(process: Handle, exit_code: Dword) -> Bool;
        fn CloseHandle(handle: Handle) -> Bool;
        fn GetLastError() -> Dword;
    }

    #[link(name = "Normaliz")]
    unsafe extern "system" {
        fn IsNormalizedString(
            normalization_form: i32,
            source: *const u16,
            source_length: i32,
        ) -> Bool;
    }

    fn fail(message: &str) -> ! {
        eprintln!("WARDEN_SETUP_REFUSED {message}");
        process::exit(WARDEN_SETUP_EXIT as i32);
    }

    fn last_error(label: &str) -> String {
        let code = unsafe { GetLastError() };
        format!("{label} error={code}")
    }

    fn close(handle: Handle) {
        if !handle.is_null() {
            unsafe { CloseHandle(handle) };
        }
    }

    fn close_all(handles: &[Handle]) {
        for &handle in handles {
            close(handle);
        }
    }

    fn owner_has_exited(owner: Handle) -> Result<bool, String> {
        match unsafe { WaitForSingleObject(owner, 0) } {
            WAIT_OBJECT_0 => Ok(true),
            WAIT_TIMEOUT => Ok(false),
            _ => Err(last_error("WaitForSingleObject(owner)")),
        }
    }

    fn quote_windows_argument(argument: &OsStr, output: &mut Vec<u16>) {
        let units: Vec<u16> = argument.encode_wide().collect();
        let needs_quotes =
            units.is_empty() || units.iter().any(|unit| matches!(*unit, 0x20 | 0x09 | 0x22));
        if !needs_quotes {
            output.extend(units);
            return;
        }
        output.push(0x22);
        let mut backslashes = 0usize;
        for unit in units {
            if unit == 0x5c {
                backslashes += 1;
                continue;
            }
            if unit == 0x22 {
                output.extend(std::iter::repeat_n(0x5c, (backslashes * 2) + 1));
                output.push(unit);
                backslashes = 0;
                continue;
            }
            output.extend(std::iter::repeat_n(0x5c, backslashes));
            backslashes = 0;
            output.push(unit);
        }
        output.extend(std::iter::repeat_n(0x5c, backslashes * 2));
        output.push(0x22);
    }

    fn command_line(arguments: &[OsString]) -> Vec<u16> {
        let mut output = Vec::new();
        for (index, argument) in arguments.iter().enumerate() {
            if index > 0 {
                output.push(0x20);
            }
            quote_windows_argument(argument.as_os_str(), &mut output);
        }
        output.push(0);
        output
    }

    fn wide_nul(value: &OsStr) -> Vec<u16> {
        value.encode_wide().chain(std::iter::once(0)).collect()
    }

    fn ordinal_compare(
        left: &str,
        right: &str,
        ignore_case: bool,
    ) -> Result<Ordering, &'static str> {
        let left_wide: Vec<u16> = OsStr::new(left).encode_wide().collect();
        let right_wide: Vec<u16> = OsStr::new(right).encode_wide().collect();
        let left_length = i32::try_from(left_wide.len()).map_err(|_| "manifest-path")?;
        let right_length = i32::try_from(right_wide.len()).map_err(|_| "manifest-path")?;
        let result = unsafe {
            CompareStringOrdinal(
                left_wide.as_ptr(),
                left_length,
                right_wide.as_ptr(),
                right_length,
                if ignore_case { TRUE } else { FALSE },
            )
        };
        match result {
            CSTR_LESS_THAN => Ok(Ordering::Less),
            CSTR_EQUAL => Ok(Ordering::Equal),
            CSTR_GREATER_THAN => Ok(Ordering::Greater),
            _ => Err("manifest-compare"),
        }
    }

    fn is_nfc(value: &str) -> bool {
        let source: Vec<u16> = OsStr::new(value).encode_wide().collect();
        let Ok(source_length) = i32::try_from(source.len()) else {
            return false;
        };
        unsafe { IsNormalizedString(NORMALIZATION_C, source.as_ptr(), source_length) != FALSE }
    }

    fn protected_path_is_valid(value: &str) -> bool {
        if value.is_empty()
            || value.len() > PROTECTED_PATH_MAX_BYTES
            || value.contains('\0')
            || value.contains('\\')
            || value.contains(':')
            || value.starts_with('/')
            || !is_nfc(value)
        {
            return false;
        }
        value
            .split('/')
            .all(|segment| !segment.is_empty() && segment != "." && segment != "..")
    }

    fn digest_is_valid(value: &str) -> bool {
        value.len() == 64
            && value
                .as_bytes()
                .iter()
                .all(|byte| byte.is_ascii_digit() || matches!(*byte, b'a'..=b'f'))
    }

    fn parse_protected_manifest(bytes: &[u8]) -> Result<ProtectedFileSet, &'static str> {
        if bytes.is_empty() || bytes.len() > PROTECTED_MANIFEST_MAX_BYTES {
            return Err("manifest-size");
        }
        let manifest: ProtectedFileSet =
            serde_json::from_slice(bytes).map_err(|_| "manifest-json")?;
        if manifest.schema != "galerina.protected-file-set.v1"
            || manifest.root.contains('\0')
            || !Path::new(&manifest.root).is_absolute()
        {
            return Err("manifest-schema");
        }
        if manifest.files.is_empty() || manifest.files.len() > PROTECTED_FILE_MAX_COUNT {
            return Err("manifest-count");
        }

        let mut previous: Option<&str> = None;
        for file in &manifest.files {
            if !protected_path_is_valid(&file.path) {
                return Err("manifest-path");
            }
            if !digest_is_valid(&file.sha256) {
                return Err("manifest-digest");
            }
            if let Some(previous_path) = previous {
                if ordinal_compare(previous_path, &file.path, false)? != Ordering::Less {
                    return Err("manifest-order");
                }
            }
            previous = Some(&file.path);
        }

        let mut aliases: Vec<&str> = manifest
            .files
            .iter()
            .map(|file| file.path.as_str())
            .collect();
        let mut compare_failed = false;
        aliases.sort_by(|left, right| match ordinal_compare(left, right, true) {
            Ok(ordering) => ordering,
            Err(_) => {
                compare_failed = true;
                Ordering::Equal
            }
        });
        if compare_failed {
            return Err("manifest-compare");
        }
        for pair in aliases.windows(2) {
            if ordinal_compare(pair[0], pair[1], true)? == Ordering::Equal {
                return Err("manifest-alias");
            }
        }

        let canonical = serde_json::to_vec(&manifest).map_err(|_| "manifest-json")?;
        if canonical != bytes {
            return Err("manifest-canonical");
        }
        Ok(manifest)
    }

    fn read_protected_manifest() -> ProtectedFileSet {
        let mut bytes = Vec::new();
        let limit = u64::try_from(PROTECTED_MANIFEST_MAX_BYTES + 1)
            .unwrap_or_else(|_| fail("manifest-size"));
        io::stdin()
            .lock()
            .take(limit)
            .read_to_end(&mut bytes)
            .unwrap_or_else(|_| fail("manifest-read"));
        parse_protected_manifest(&bytes).unwrap_or_else(|error| fail(error))
    }

    fn direct_attributes(path: &Path, directory: bool) -> Result<Dword, &'static str> {
        let wide = wide_nul(path.as_os_str());
        let attributes = unsafe { GetFileAttributesW(wide.as_ptr()) };
        if attributes == INVALID_FILE_ATTRIBUTES
            || attributes & FILE_ATTRIBUTE_REPARSE_POINT != 0
            || (attributes & FILE_ATTRIBUTE_DIRECTORY != 0) != directory
        {
            return Err("protected-path");
        }
        Ok(attributes)
    }

    fn strip_extended_prefix(mut value: Vec<u16>) -> Vec<u16> {
        const PREFIX: [u16; 4] = [b'\\' as u16, b'\\' as u16, b'?' as u16, b'\\' as u16];
        const UNC: [u16; 4] = [b'U' as u16, b'N' as u16, b'C' as u16, b'\\' as u16];
        if value.starts_with(&PREFIX) {
            value.drain(..PREFIX.len());
            if value.starts_with(&UNC) {
                value.drain(..UNC.len());
                value.splice(0..0, [b'\\' as u16, b'\\' as u16]);
            }
        }
        value
    }

    fn final_handle_path(handle: Handle) -> Result<Vec<u16>, &'static str> {
        let required = unsafe { GetFinalPathNameByHandleW(handle, std::ptr::null_mut(), 0, 0) };
        if required == 0 || required > 32_768 {
            return Err("protected-final-path");
        }
        let mut output = vec![0u16; required as usize + 1];
        let written = unsafe {
            GetFinalPathNameByHandleW(handle, output.as_mut_ptr(), output.len() as Dword, 0)
        };
        if written == 0 || written as usize >= output.len() {
            return Err("protected-final-path");
        }
        output.truncate(written as usize);
        Ok(strip_extended_prefix(output))
    }

    fn expected_path(path: &Path) -> Vec<u16> {
        strip_extended_prefix(path.as_os_str().encode_wide().collect())
    }

    fn open_authenticated_handle(path: &Path, directory: bool) -> Result<Handle, &'static str> {
        direct_attributes(path, directory)?;
        let wide = wide_nul(path.as_os_str());
        let handle = unsafe {
            CreateFileW(
                wide.as_ptr(),
                if directory {
                    FILE_READ_ATTRIBUTES
                } else {
                    GENERIC_READ
                },
                FILE_SHARE_READ,
                null(),
                OPEN_EXISTING,
                FILE_FLAG_OPEN_REPARSE_POINT
                    | if directory {
                        FILE_FLAG_BACKUP_SEMANTICS
                    } else {
                        FILE_ATTRIBUTE_NORMAL
                    },
                null::<c_void>() as Handle,
            )
        };
        if handle == INVALID_HANDLE_VALUE {
            return Err("protected-open");
        }

        let mut information: FileBasicInfo = unsafe { zeroed() };
        let observed = unsafe {
            GetFileInformationByHandleEx(
                handle,
                FILE_BASIC_INFO_CLASS,
                &mut information as *mut _ as *mut c_void,
                size_of::<FileBasicInfo>() as Dword,
            )
        };
        let valid = observed != FALSE
            && unsafe { GetFileType(handle) } == FILE_TYPE_DISK
            && information.file_attributes & FILE_ATTRIBUTE_REPARSE_POINT == 0
            && (information.file_attributes & FILE_ATTRIBUTE_DIRECTORY != 0) == directory
            && final_handle_path(handle)
                .is_ok_and(|observed_path| observed_path == expected_path(path));
        if !valid {
            close(handle);
            return Err("protected-identity");
        }
        Ok(handle)
    }

    fn declared_digest(value: &str) -> [u8; 32] {
        let mut digest = [0u8; 32];
        for (index, output) in digest.iter_mut().enumerate() {
            let start = index * 2;
            *output = u8::from_str_radix(&value[start..start + 2], 16)
                .unwrap_or_else(|_| fail("manifest-digest"));
        }
        digest
    }

    fn hash_handle(handle: Handle) -> Result<[u8; 32], &'static str> {
        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 64 * 1024];
        loop {
            let mut read = 0u32;
            let ok = unsafe {
                ReadFile(
                    handle,
                    buffer.as_mut_ptr() as *mut c_void,
                    buffer.len() as Dword,
                    &mut read,
                    std::ptr::null_mut(),
                )
            };
            if ok == FALSE {
                return Err("protected-read");
            }
            if read == 0 {
                break;
            }
            hasher.update(&buffer[..read as usize]);
        }
        Ok(hasher.finalize().into())
    }

    fn digest_matches(observed: &[u8; 32], declared: &[u8; 32]) -> bool {
        observed
            .iter()
            .zip(declared)
            .fold(0u8, |difference, (left, right)| difference | (left ^ right))
            == 0
    }

    fn protect_file_set() -> Vec<Handle> {
        let manifest = read_protected_manifest();
        let root = PathBuf::from(&manifest.root);
        let root_handle =
            open_authenticated_handle(&root, true).unwrap_or_else(|error| fail(error));
        let mut handles = vec![root_handle];
        let mut held_directories = HashSet::new();
        held_directories.insert(manifest.root.clone());

        for file in manifest.files {
            let segments: Vec<&str> = file.path.split('/').collect();
            let mut current = root.clone();
            for segment in &segments[..segments.len() - 1] {
                current.push(segment);
                let key = current.as_os_str().to_string_lossy().into_owned();
                if held_directories.insert(key) {
                    let handle = open_authenticated_handle(&current, true)
                        .unwrap_or_else(|error| fail(error));
                    handles.push(handle);
                }
            }
            current.push(segments[segments.len() - 1]);
            let leaf =
                open_authenticated_handle(&current, false).unwrap_or_else(|error| fail(error));
            let observed = hash_handle(leaf).unwrap_or_else(|error| fail(error));
            let declared = declared_digest(&file.sha256);
            if !digest_matches(&observed, &declared) {
                close(leaf);
                fail("protected-digest");
            }
            handles.push(leaf);
        }
        handles
    }

    fn open_protected_handle(path: &Path, directory: bool) -> Handle {
        let wide = wide_nul(path.as_os_str());
        let handle = unsafe {
            CreateFileW(
                wide.as_ptr(),
                if directory {
                    FILE_READ_ATTRIBUTES
                } else {
                    GENERIC_READ
                },
                FILE_SHARE_READ,
                null(),
                OPEN_EXISTING,
                if directory {
                    FILE_FLAG_BACKUP_SEMANTICS
                } else {
                    FILE_ATTRIBUTE_NORMAL
                },
                null::<c_void>() as Handle,
            )
        };
        if handle == INVALID_HANDLE_VALUE {
            fail(&last_error("CreateFileW(protected-read-tree)"));
        }
        handle
    }

    fn protect_read_tree(root: &OsStr) -> Vec<Handle> {
        fn visit(path: &Path, handles: &mut Vec<Handle>) {
            let metadata = fs::symlink_metadata(path)
                .unwrap_or_else(|error| fail(&format!("protected-read-tree metadata: {error}")));
            if metadata.file_type().is_symlink() {
                fail("protected-read-tree symlink");
            }
            if !metadata.is_dir() && !metadata.is_file() {
                fail("protected-read-tree unsupported entry");
            }
            handles.push(open_protected_handle(path, metadata.is_dir()));
            if metadata.is_dir() {
                let mut entries: Vec<_> = fs::read_dir(path)
                    .unwrap_or_else(|error| fail(&format!("protected-read-tree read: {error}")))
                    .map(|entry| {
                        entry.unwrap_or_else(|error| {
                            fail(&format!("protected-read-tree entry: {error}"))
                        })
                    })
                    .collect();
                entries.sort_by_key(|entry| entry.file_name());
                for entry in entries {
                    visit(&entry.path(), handles);
                }
            }
        }

        let canonical = fs::canonicalize(root)
            .unwrap_or_else(|error| fail(&format!("protected-read-tree canonical: {error}")));
        let mut handles = Vec::new();
        visit(&canonical, &mut handles);
        if handles.is_empty() {
            fail("protected-read-tree empty");
        }
        handles
    }

    fn parse() -> (Dword, Dword, ProtectionMode, Vec<OsString>) {
        let arguments: Vec<OsString> = env::args_os().skip(1).collect();
        if arguments.len() < 6 || arguments[0] != "--timeout-ms" || arguments[2] != "--owner-pid" {
            fail("arguments");
        }
        let timeout = arguments[1]
            .to_string_lossy()
            .parse::<Dword>()
            .ok()
            .filter(|value| *value > 0)
            .unwrap_or_else(|| fail("timeout"));
        let owner_pid = arguments[3]
            .to_string_lossy()
            .parse::<Dword>()
            .ok()
            .filter(|value| *value > 0)
            .unwrap_or_else(|| fail("owner-pid"));
        let mut index = 4usize;
        let protection = if arguments
            .get(index)
            .is_some_and(|value| value == "--protect-read-tree")
        {
            let value = arguments
                .get(index + 1)
                .cloned()
                .unwrap_or_else(|| fail("protected-read-tree"));
            index += 2;
            ProtectionMode::ReadTree(value)
        } else if arguments
            .get(index)
            .is_some_and(|value| value == "--protect-file-set-stdin")
        {
            index += 1;
            ProtectionMode::FileSetStdin
        } else {
            ProtectionMode::None
        };
        if arguments.get(index).is_none_or(|value| value != "--") {
            fail("arguments");
        }
        let command = arguments[index + 1..].to_vec();
        if command.is_empty() {
            fail("command");
        }
        (timeout, owner_pid, protection, command)
    }

    pub fn main() {
        let (timeout, owner_pid, protection, command) = parse();
        let owner = unsafe { OpenProcess(SYNCHRONIZE, FALSE, owner_pid) };
        if owner.is_null() {
            fail(&last_error("OpenProcess(owner)"));
        }
        let protected_handles = match protection {
            ProtectionMode::None => Vec::new(),
            ProtectionMode::ReadTree(root) => protect_read_tree(root.as_os_str()),
            ProtectionMode::FileSetStdin => protect_file_set(),
        };
        match owner_has_exited(owner) {
            Ok(false) => {}
            Ok(true) => {
                close_all(&protected_handles);
                close(owner);
                eprintln!("WARDEN_OWNER_EXIT_TREE_CLOSED");
                process::exit(WARDEN_OWNER_EXIT as i32);
            }
            Err(error) => {
                close_all(&protected_handles);
                close(owner);
                fail(&error);
            }
        }

        let job = unsafe { CreateJobObjectW(null(), null()) };
        if job.is_null() {
            close(owner);
            fail(&last_error("CreateJobObjectW"));
        }
        let mut limits: JobObjectExtendedLimitInformation = unsafe { zeroed() };
        limits.basic_limit_information.limit_flags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        let set = unsafe {
            SetInformationJobObject(
                job,
                JOB_OBJECT_EXTENDED_LIMIT_INFORMATION,
                &limits as *const _ as *const c_void,
                size_of::<JobObjectExtendedLimitInformation>() as Dword,
            )
        };
        if set == FALSE {
            close(job);
            close(owner);
            fail(&last_error("SetInformationJobObject"));
        }

        let mut startup: StartupInfoW = unsafe { zeroed() };
        startup.cb = size_of::<StartupInfoW>() as Dword;
        let mut process_info: ProcessInformation = unsafe { zeroed() };
        let mut command_line = command_line(&command);
        let mediator_name = wide_nul(OsStr::new("GALERINA_SUITE_LEASE_MEDIATOR_PID"));
        let mediator_value = wide_nul(OsStr::new(&unsafe { GetCurrentProcessId() }.to_string()));
        if unsafe { SetEnvironmentVariableW(mediator_name.as_ptr(), mediator_value.as_ptr()) }
            == FALSE
        {
            close(job);
            close(owner);
            fail(&last_error("SetEnvironmentVariableW"));
        }
        let created = unsafe {
            CreateProcessW(
                null(),
                command_line.as_mut_ptr(),
                null(),
                null(),
                TRUE,
                CREATE_SUSPENDED | CREATE_UNICODE_ENVIRONMENT,
                null(),
                null(),
                &mut startup,
                &mut process_info,
            )
        };
        if created == FALSE {
            close(job);
            close(owner);
            fail(&last_error("CreateProcessW"));
        }

        let assigned = unsafe { AssignProcessToJobObject(job, process_info.h_process) };
        if assigned == FALSE {
            unsafe { TerminateProcess(process_info.h_process, WARDEN_SETUP_EXIT) };
            close(process_info.h_thread);
            close(process_info.h_process);
            close(job);
            close(owner);
            fail(&last_error("AssignProcessToJobObject"));
        }
        match owner_has_exited(owner) {
            Ok(false) => {}
            Ok(true) => {
                unsafe { TerminateJobObject(job, WARDEN_OWNER_EXIT) };
                unsafe { WaitForSingleObject(process_info.h_process, INFINITE) };
                close(process_info.h_thread);
                close(process_info.h_process);
                close(job);
                close(owner);
                close_all(&protected_handles);
                eprintln!("WARDEN_OWNER_EXIT_TREE_CLOSED");
                process::exit(WARDEN_OWNER_EXIT as i32);
            }
            Err(error) => {
                unsafe { TerminateJobObject(job, WARDEN_SETUP_EXIT) };
                unsafe { WaitForSingleObject(process_info.h_process, INFINITE) };
                close(process_info.h_thread);
                close(process_info.h_process);
                close(job);
                close(owner);
                close_all(&protected_handles);
                fail(&error);
            }
        }
        if unsafe { ResumeThread(process_info.h_thread) } == Dword::MAX {
            unsafe { TerminateJobObject(job, WARDEN_SETUP_EXIT) };
            close(process_info.h_thread);
            close(process_info.h_process);
            close(job);
            close(owner);
            fail(&last_error("ResumeThread"));
        }
        close(process_info.h_thread);

        let handles = [process_info.h_process, owner];
        let wait = unsafe { WaitForMultipleObjects(2, handles.as_ptr(), FALSE, timeout) };
        let exit = if wait == WAIT_OBJECT_0 {
            let mut child_exit = WARDEN_SETUP_EXIT;
            if unsafe { GetExitCodeProcess(process_info.h_process, &mut child_exit) } == FALSE {
                unsafe { TerminateJobObject(job, WARDEN_SETUP_EXIT) };
                WARDEN_SETUP_EXIT
            } else {
                unsafe { TerminateJobObject(job, child_exit) };
                child_exit
            }
        } else if wait == WAIT_OBJECT_0 + 1 {
            unsafe { TerminateJobObject(job, WARDEN_OWNER_EXIT) };
            eprintln!("WARDEN_OWNER_EXIT_TREE_CLOSED");
            WARDEN_OWNER_EXIT
        } else if wait == WAIT_TIMEOUT {
            unsafe { TerminateJobObject(job, WARDEN_TIMEOUT_EXIT) };
            unsafe { WaitForSingleObject(process_info.h_process, INFINITE) };
            eprintln!("WARDEN_TIMEOUT_TREE_CLOSED");
            WARDEN_TIMEOUT_EXIT
        } else {
            unsafe { TerminateJobObject(job, WARDEN_SETUP_EXIT) };
            eprintln!(
                "WARDEN_WAIT_REFUSED {}",
                last_error("WaitForMultipleObjects")
            );
            WARDEN_SETUP_EXIT
        };

        close(process_info.h_process);
        close(job);
        close(owner);
        close_all(&protected_handles);
        process::exit(exit as i32);
    }

    #[cfg(test)]
    mod tests {
        use super::{
            close, ordinal_compare, owner_has_exited, parse_protected_manifest, Bool, Handle,
            FALSE, TRUE,
        };
        use std::cmp::Ordering;
        use std::ffi::c_void;
        use std::ptr::null;

        #[link(name = "kernel32")]
        unsafe extern "system" {
            fn CreateEventW(
                event_attributes: *const c_void,
                manual_reset: Bool,
                initial_state: Bool,
                name: *const u16,
            ) -> Handle;
            fn SetEvent(event: Handle) -> Bool;
        }

        const DIGEST: &str = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

        fn manifest(files: &str) -> Vec<u8> {
            format!(
                r#"{{"schema":"galerina.protected-file-set.v1","root":"C:\\repo","files":[{files}]}}"#
            )
            .into_bytes()
        }

        #[test]
        fn protected_manifest_rejects_unknown_fields() {
            let bytes = format!(
                r#"{{"schema":"galerina.protected-file-set.v1","root":"C:\\repo","files":[{{"path":"a.txt","sha256":"{DIGEST}"}}],"unknown":true}}"#
            );
            assert_eq!(
                parse_protected_manifest(bytes.as_bytes()).unwrap_err(),
                "manifest-json"
            );
        }

        #[test]
        fn protected_manifest_accepts_only_canonical_bounded_json() {
            let canonical = manifest(&format!(r#"{{"path":"a.txt","sha256":"{DIGEST}"}}"#));
            let admitted = parse_protected_manifest(&canonical).unwrap();
            assert_eq!(admitted.schema, "galerina.protected-file-set.v1");
            assert_eq!(admitted.files.len(), 1);

            let noncanonical = format!(
                r#"{{ "schema":"galerina.protected-file-set.v1","root":"C:\\repo","files":[{{"path":"a.txt","sha256":"{DIGEST}"}}]}}"#
            );
            assert_eq!(
                parse_protected_manifest(noncanonical.as_bytes()).unwrap_err(),
                "manifest-canonical"
            );
            assert_eq!(
                parse_protected_manifest(&vec![b'x'; (4 * 1024 * 1024) + 1]).unwrap_err(),
                "manifest-size"
            );
        }

        #[test]
        fn protected_manifest_rejects_empty_file_sets() {
            let empty =
                br#"{"schema":"galerina.protected-file-set.v1","root":"C:\\repo","files":[]}"#;
            assert_eq!(
                parse_protected_manifest(empty).unwrap_err(),
                "manifest-count"
            );
        }

        #[test]
        fn protected_manifest_rejects_unsorted_and_case_alias_paths() {
            let unsorted = manifest(&format!(
                r#"{{"path":"z.txt","sha256":"{DIGEST}"}},{{"path":"a.txt","sha256":"{DIGEST}"}}"#
            ));
            assert_eq!(
                parse_protected_manifest(&unsorted).unwrap_err(),
                "manifest-order"
            );

            let alias = manifest(&format!(
                r#"{{"path":"A.txt","sha256":"{DIGEST}"}},{{"path":"a.txt","sha256":"{DIGEST}"}}"#
            ));
            assert_eq!(
                parse_protected_manifest(&alias).unwrap_err(),
                "manifest-alias"
            );
        }

        #[test]
        fn ordinal_alias_vectors_match_windows_nonexpanding_case_rules() {
            let vectors = [
                ("ss.txt", "ß.txt", false),
                ("ffi.txt", "ﬃ.txt", false),
                ("A.txt", "a.txt", true),
            ];
            for (left, right, equal_ignoring_case) in vectors {
                assert_eq!(
                    ordinal_compare(left, right, true).unwrap() == Ordering::Equal,
                    equal_ignoring_case,
                    "vector {left:?} / {right:?}"
                );
            }
            assert_eq!(
                ordinal_compare("a.txt", "a.txt", true).unwrap(),
                Ordering::Equal
            );
        }

        #[test]
        fn owner_wait_state_is_checked_on_the_retained_handle() {
            let event = unsafe { CreateEventW(null(), TRUE, FALSE, null()) };
            assert!(!event.is_null());
            assert_eq!(owner_has_exited(event).unwrap(), false);
            assert_ne!(unsafe { SetEvent(event) }, FALSE);
            assert_eq!(owner_has_exited(event).unwrap(), true);
            close(event);
        }

        #[test]
        fn protected_manifest_rejects_traversal_and_bad_digest() {
            let traversal = manifest(&format!(
                r#"{{"path":"../escape.txt","sha256":"{DIGEST}"}}"#
            ));
            assert_eq!(
                parse_protected_manifest(&traversal).unwrap_err(),
                "manifest-path"
            );

            let digest = manifest(r#"{"path":"a.txt","sha256":"ABC"}"#);
            assert_eq!(
                parse_protected_manifest(&digest).unwrap_err(),
                "manifest-digest"
            );
        }
    }
}

#[cfg(windows)]
fn main() {
    windows::main();
}
