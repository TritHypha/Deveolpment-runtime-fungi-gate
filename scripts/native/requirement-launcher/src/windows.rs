use std::collections::BTreeMap;
use std::ffi::{c_void, OsStr, OsString};
use std::mem::{size_of, zeroed};
use std::os::windows::ffi::{OsStrExt, OsStringExt};
use std::path::Path;
use std::ptr::null;

use crate::protocol::sha256_hex;

type Bool = i32;
type Dword = u32;
type Handle = *mut c_void;

const FALSE: Bool = 0;
const CREATE_SUSPENDED: Dword = 0x0000_0004;
const CREATE_NEW_PROCESS_GROUP: Dword = 0x0000_0200;
const CREATE_UNICODE_ENVIRONMENT: Dword = 0x0000_0400;
const JOB_OBJECT_EXTENDED_LIMIT_INFORMATION: i32 = 9;
const JOB_OBJECT_LIMIT_ACTIVE_PROCESS: Dword = 0x0000_0008;
const JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE: Dword = 0x0000_2000;
const WAIT_OBJECT_0: Dword = 0;
const WAIT_TIMEOUT: Dword = 0x102;
const STILL_ACTIVE: Dword = 259;
const TERMINATION_EXIT: Dword = 126;

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
    process_id: Dword,
    thread_id: Dword,
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
    fn QueryFullProcessImageNameW(
        process: Handle,
        flags: Dword,
        path: *mut u16,
        size: *mut Dword,
    ) -> Bool;
    fn ResumeThread(thread: Handle) -> Dword;
    fn WaitForSingleObject(handle: Handle, milliseconds: Dword) -> Dword;
    fn GetExitCodeProcess(process: Handle, exit_code: *mut Dword) -> Bool;
    fn TerminateJobObject(job: Handle, exit_code: Dword) -> Bool;
    fn CloseHandle(handle: Handle) -> Bool;
}

pub struct OwnedWorker {
    job: Handle,
    process: Handle,
    thread: Handle,
    resumed: bool,
}

pub struct WorkerOutcome {
    pub exit_code: u32,
    pub timed_out: bool,
}

impl Drop for OwnedWorker {
    fn drop(&mut self) {
        if !self.job.is_null() {
            unsafe { TerminateJobObject(self.job, TERMINATION_EXIT) };
        }
        close(self.thread);
        close(self.process);
        close(self.job);
    }
}

fn close(handle: Handle) {
    if !handle.is_null() {
        unsafe { CloseHandle(handle) };
    }
}

fn wide_nul(value: &OsStr) -> Vec<u16> {
    value.encode_wide().chain(std::iter::once(0)).collect()
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
        } else if unit == 0x22 {
            output.extend(std::iter::repeat_n(0x5c, backslashes * 2 + 1));
            output.push(unit);
            backslashes = 0;
        } else {
            output.extend(std::iter::repeat_n(0x5c, backslashes));
            output.push(unit);
            backslashes = 0;
        }
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
        quote_windows_argument(argument, &mut output);
    }
    output.push(0);
    output
}

pub fn environment_block(
    admitted: &BTreeMap<String, String>,
    nonce: &str,
) -> Result<(Vec<u16>, String), &'static str> {
    let mut values = admitted.clone();
    values.insert("GALERINA_UNIT4_NONCE".to_string(), nonce.to_string());
    let mut block = Vec::new();
    for (key, value) in values {
        if key.contains(['=', '\0']) || value.contains('\0') {
            return Err("ENVIRONMENT");
        }
        block.extend(OsStr::new(&format!("{key}={value}")).encode_wide());
        block.push(0);
    }
    block.push(0);
    let mut bytes = Vec::with_capacity(block.len() * 2);
    for unit in &block {
        bytes.extend_from_slice(&unit.to_le_bytes());
    }
    Ok((block, sha256_hex(&bytes)))
}

pub fn create_suspended_worker(
    runtime: &Path,
    worker: &Path,
    package_root: &Path,
    environment: &mut [u16],
    mode: &str,
) -> Result<OwnedWorker, &'static str> {
    let job = unsafe { CreateJobObjectW(null(), null()) };
    if job.is_null() {
        return Err("JOB_CREATE");
    }
    let mut limits: JobObjectExtendedLimitInformation = unsafe { zeroed() };
    limits.basic_limit_information.limit_flags =
        JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE | JOB_OBJECT_LIMIT_ACTIVE_PROCESS;
    limits.basic_limit_information.active_process_limit = 1;
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
        return Err("JOB_POLICY");
    }

    let runtime_wide = wide_nul(runtime.as_os_str());
    let root_wide = wide_nul(package_root.as_os_str());
    let mut command = command_line(&[
        runtime.as_os_str().to_os_string(),
        worker.as_os_str().to_os_string(),
        OsString::from(mode),
    ]);
    let mut startup: StartupInfoW = unsafe { zeroed() };
    startup.cb = size_of::<StartupInfoW>() as Dword;
    let mut information: ProcessInformation = unsafe { zeroed() };
    let created = unsafe {
        CreateProcessW(
            runtime_wide.as_ptr(),
            command.as_mut_ptr(),
            null(),
            null(),
            FALSE,
            CREATE_SUSPENDED | CREATE_NEW_PROCESS_GROUP | CREATE_UNICODE_ENVIRONMENT,
            environment.as_mut_ptr().cast::<c_void>(),
            root_wide.as_ptr(),
            &mut startup,
            &mut information,
        )
    };
    if created == FALSE {
        close(job);
        return Err("PROCESS_CREATE");
    }
    if unsafe { AssignProcessToJobObject(job, information.h_process) } == FALSE {
        unsafe { TerminateJobObject(job, TERMINATION_EXIT) };
        close(information.h_thread);
        close(information.h_process);
        close(job);
        return Err("PROCESS_ASSIGN");
    }
    Ok(OwnedWorker {
        job,
        process: information.h_process,
        thread: information.h_thread,
        resumed: false,
    })
}

pub fn verify_process_image(worker: &OwnedWorker, expected: &Path) -> Result<(), &'static str> {
    let mut buffer = vec![0u16; 32_768];
    let mut size = buffer.len() as Dword;
    if unsafe { QueryFullProcessImageNameW(worker.process, 0, buffer.as_mut_ptr(), &mut size) }
        == FALSE
    {
        return Err("PROCESS_IMAGE");
    }
    buffer.truncate(size as usize);
    let actual = OsString::from_wide(&buffer);
    if actual != expected.as_os_str() {
        return Err("PROCESS_IMAGE");
    }
    Ok(())
}

pub fn resume_worker(worker: &mut OwnedWorker) -> Result<(), &'static str> {
    if unsafe { ResumeThread(worker.thread) } == Dword::MAX {
        return Err("PROCESS_RESUME");
    }
    worker.resumed = true;
    close(worker.thread);
    worker.thread = null::<c_void>() as Handle;
    Ok(())
}

pub fn kill_owned_tree(worker: &mut OwnedWorker) {
    if !worker.job.is_null() {
        unsafe { TerminateJobObject(worker.job, TERMINATION_EXIT) };
    }
}

pub fn wait_owned_worker(
    worker: &mut OwnedWorker,
    timeout_ms: u32,
) -> Result<WorkerOutcome, &'static str> {
    if !worker.resumed {
        return Err("PROCESS_NOT_RESUMED");
    }
    let wait = unsafe { WaitForSingleObject(worker.process, timeout_ms) };
    if wait == WAIT_TIMEOUT {
        kill_owned_tree(worker);
        return Ok(WorkerOutcome {
            exit_code: TERMINATION_EXIT,
            timed_out: true,
        });
    }
    if wait != WAIT_OBJECT_0 {
        kill_owned_tree(worker);
        return Err("PROCESS_WAIT");
    }
    let mut exit_code = STILL_ACTIVE;
    if unsafe { GetExitCodeProcess(worker.process, &mut exit_code) } == FALSE
        || exit_code == STILL_ACTIVE
    {
        kill_owned_tree(worker);
        return Err("PROCESS_EXIT");
    }
    Ok(WorkerOutcome {
        exit_code,
        timed_out: false,
    })
}
