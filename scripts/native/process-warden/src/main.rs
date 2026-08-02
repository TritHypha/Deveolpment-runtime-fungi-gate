#![deny(unsafe_op_in_unsafe_fn)]

#[cfg(not(windows))]
fn main() {
    eprintln!("WARDEN_PLATFORM_REFUSED");
    std::process::exit(126);
}

#[cfg(windows)]
mod windows {
    use std::env;
    use std::ffi::{c_void, OsStr, OsString};
    use std::mem::{size_of, zeroed};
    use std::os::windows::ffi::OsStrExt;
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
    const WAIT_OBJECT_0: Dword = 0x0000_0000;
    const WAIT_TIMEOUT: Dword = 0x0000_0102;
    const INFINITE: Dword = 0xffff_ffff;
    const WARDEN_TIMEOUT_EXIT: Dword = 124;
    const WARDEN_OWNER_EXIT: Dword = 125;
    const WARDEN_SETUP_EXIT: Dword = 126;

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
        fn WaitForMultipleObjects(
            count: Dword,
            handles: *const Handle,
            wait_all: Bool,
            milliseconds: Dword,
        ) -> Dword;
        fn WaitForSingleObject(handle: Handle, milliseconds: Dword) -> Dword;
        fn GetExitCodeProcess(process: Handle, exit_code: *mut Dword) -> Bool;
        fn TerminateJobObject(job: Handle, exit_code: Dword) -> Bool;
        fn TerminateProcess(process: Handle, exit_code: Dword) -> Bool;
        fn CloseHandle(handle: Handle) -> Bool;
        fn GetLastError() -> Dword;
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

    fn parse() -> (Dword, Dword, Vec<OsString>) {
        let arguments: Vec<OsString> = env::args_os().skip(1).collect();
        if arguments.len() < 6
            || arguments[0] != "--timeout-ms"
            || arguments[2] != "--owner-pid"
            || arguments[4] != "--"
        {
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
        let command = arguments[5..].to_vec();
        if command.is_empty() {
            fail("command");
        }
        (timeout, owner_pid, command)
    }

    pub fn main() {
        let (timeout, owner_pid, command) = parse();
        let owner = unsafe { OpenProcess(SYNCHRONIZE, FALSE, owner_pid) };
        if owner.is_null() {
            fail(&last_error("OpenProcess(owner)"));
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
        process::exit(exit as i32);
    }
}

#[cfg(windows)]
fn main() {
    windows::main();
}
