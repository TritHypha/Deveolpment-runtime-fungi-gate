use std::collections::BTreeMap;
use std::ffi::{c_void, OsStr, OsString};
use std::mem::{size_of, zeroed};
use std::os::windows::ffi::{OsStrExt, OsStringExt};
use std::path::Path;
use std::ptr::{null, null_mut};

use crate::protocol::{sha256_hex, MAX_FRAME_BYTES};

type Bool = i32;
type Dword = u32;
type Handle = *mut c_void;

const FALSE: Bool = 0;
const TRUE: Bool = 1;
const CREATE_SUSPENDED: Dword = 0x0000_0004;
const CREATE_NEW_PROCESS_GROUP: Dword = 0x0000_0200;
const CREATE_UNICODE_ENVIRONMENT: Dword = 0x0000_0400;
const EXTENDED_STARTUPINFO_PRESENT: Dword = 0x0008_0000;
const STARTF_USESTDHANDLES: Dword = 0x0000_0100;
const HANDLE_FLAG_INHERIT: Dword = 0x0000_0001;
const PROC_THREAD_ATTRIBUTE_HANDLE_LIST: usize = 0x0002_0002;
const JOB_OBJECT_EXTENDED_LIMIT_INFORMATION: i32 = 9;
const JOB_OBJECT_LIMIT_ACTIVE_PROCESS: Dword = 0x0000_0008;
const JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE: Dword = 0x0000_2000;
const WAIT_OBJECT_0: Dword = 0;
const WAIT_TIMEOUT: Dword = 0x102;
const STILL_ACTIVE: Dword = 259;
pub const TERMINATION_EXIT: Dword = 126;
const PROCESS_OWNER_POLICY: &[u8] =
    b"galerina.windows-job-policy.v1\0active-process=1\0kill-on-close=true";

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
struct StartupInfoExW {
    startup_info: StartupInfoW,
    attribute_list: *mut c_void,
}

#[repr(C)]
struct SecurityAttributes {
    length: Dword,
    security_descriptor: *mut c_void,
    inherit_handle: Bool,
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
    fn CreatePipe(
        read_pipe: *mut Handle,
        write_pipe: *mut Handle,
        attributes: *const SecurityAttributes,
        size: Dword,
    ) -> Bool;
    fn SetHandleInformation(handle: Handle, mask: Dword, flags: Dword) -> Bool;
    fn InitializeProcThreadAttributeList(
        attribute_list: *mut c_void,
        attribute_count: Dword,
        flags: Dword,
        size: *mut usize,
    ) -> Bool;
    fn UpdateProcThreadAttribute(
        attribute_list: *mut c_void,
        flags: Dword,
        attribute: usize,
        value: *mut c_void,
        size: usize,
        previous_value: *mut c_void,
        return_size: *mut usize,
    ) -> Bool;
    fn DeleteProcThreadAttributeList(attribute_list: *mut c_void);
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
    fn ReadFile(
        file: Handle,
        buffer: *mut c_void,
        bytes_to_read: Dword,
        bytes_read: *mut Dword,
        overlapped: *mut c_void,
    ) -> Bool;
    fn WriteFile(
        file: Handle,
        buffer: *const c_void,
        bytes_to_write: Dword,
        bytes_written: *mut Dword,
        overlapped: *mut c_void,
    ) -> Bool;
    fn PeekNamedPipe(
        pipe: Handle,
        buffer: *mut c_void,
        buffer_size: Dword,
        bytes_read: *mut Dword,
        total_bytes_available: *mut Dword,
        bytes_left_this_message: *mut Dword,
    ) -> Bool;
    fn GetTickCount64() -> u64;
    fn Sleep(milliseconds: Dword);
    fn CloseHandle(handle: Handle) -> Bool;
}

pub struct OwnedWorker {
    job: Handle,
    process: Handle,
    thread: Handle,
    stdin_write: Handle,
    stdout_read: Handle,
    stderr_read: Handle,
    resumed: bool,
}

pub struct WorkerOutcome {
    pub exit_code: u32,
    pub timed_out: bool,
}

pub struct WorkerExchange<Ready> {
    pub ready: Ready,
    pub result_frame: Vec<u8>,
}

impl Drop for OwnedWorker {
    fn drop(&mut self) {
        if !self.job.is_null() {
            unsafe { TerminateJobObject(self.job, TERMINATION_EXIT) };
        }
        close(self.thread);
        close(self.stdin_write);
        close(self.stdout_read);
        close(self.stderr_read);
        close(self.process);
        close(self.job);
    }
}

fn close(handle: Handle) {
    if !handle.is_null() {
        unsafe { CloseHandle(handle) };
    }
}

pub fn monotonic_millis() -> u64 {
    unsafe { GetTickCount64() }
}

pub fn process_owner_digest() -> String {
    sha256_hex(PROCESS_OWNER_POLICY)
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

    let security = SecurityAttributes {
        length: size_of::<SecurityAttributes>() as Dword,
        security_descriptor: null_mut(),
        inherit_handle: TRUE,
    };
    let mut child_stdin_read: Handle = null_mut();
    let mut parent_stdin_write: Handle = null_mut();
    let mut parent_stdout_read: Handle = null_mut();
    let mut child_stdout_write: Handle = null_mut();
    let mut parent_stderr_read: Handle = null_mut();
    let mut child_stderr_write: Handle = null_mut();
    let pipes_created = unsafe {
        CreatePipe(&mut child_stdin_read, &mut parent_stdin_write, &security, 0) != FALSE
            && CreatePipe(
                &mut parent_stdout_read,
                &mut child_stdout_write,
                &security,
                0,
            ) != FALSE
            && CreatePipe(
                &mut parent_stderr_read,
                &mut child_stderr_write,
                &security,
                0,
            ) != FALSE
    };
    if !pipes_created
        || unsafe { SetHandleInformation(parent_stdin_write, HANDLE_FLAG_INHERIT, 0) } == FALSE
        || unsafe { SetHandleInformation(parent_stdout_read, HANDLE_FLAG_INHERIT, 0) } == FALSE
        || unsafe { SetHandleInformation(parent_stderr_read, HANDLE_FLAG_INHERIT, 0) } == FALSE
    {
        close(child_stdin_read);
        close(parent_stdin_write);
        close(parent_stdout_read);
        close(child_stdout_write);
        close(parent_stderr_read);
        close(child_stderr_write);
        close(job);
        return Err("PROCESS_PIPE");
    }

    let mut attribute_bytes = 0usize;
    unsafe {
        InitializeProcThreadAttributeList(null_mut(), 1, 0, &mut attribute_bytes);
    }
    if attribute_bytes == 0 {
        close(child_stdin_read);
        close(parent_stdin_write);
        close(parent_stdout_read);
        close(child_stdout_write);
        close(parent_stderr_read);
        close(child_stderr_write);
        close(job);
        return Err("PROCESS_HANDLE_POLICY");
    }
    let attribute_words = attribute_bytes.div_ceil(size_of::<usize>());
    let mut attribute_storage = vec![0usize; attribute_words];
    let attribute_list = attribute_storage.as_mut_ptr().cast::<c_void>();
    if unsafe { InitializeProcThreadAttributeList(attribute_list, 1, 0, &mut attribute_bytes) }
        == FALSE
    {
        close(child_stdin_read);
        close(parent_stdin_write);
        close(parent_stdout_read);
        close(child_stdout_write);
        close(parent_stderr_read);
        close(child_stderr_write);
        close(job);
        return Err("PROCESS_HANDLE_POLICY");
    }
    let mut inherited = [child_stdin_read, child_stdout_write, child_stderr_write];
    if unsafe {
        UpdateProcThreadAttribute(
            attribute_list,
            0,
            PROC_THREAD_ATTRIBUTE_HANDLE_LIST,
            inherited.as_mut_ptr().cast::<c_void>(),
            size_of::<Handle>() * inherited.len(),
            null_mut(),
            null_mut(),
        )
    } == FALSE
    {
        unsafe { DeleteProcThreadAttributeList(attribute_list) };
        close(child_stdin_read);
        close(parent_stdin_write);
        close(parent_stdout_read);
        close(child_stdout_write);
        close(parent_stderr_read);
        close(child_stderr_write);
        close(job);
        return Err("PROCESS_HANDLE_POLICY");
    }

    let runtime_wide = wide_nul(runtime.as_os_str());
    let root_wide = wide_nul(package_root.as_os_str());
    let mut command = command_line(&[
        runtime.as_os_str().to_os_string(),
        worker.as_os_str().to_os_string(),
        OsString::from(mode),
    ]);
    let mut startup: StartupInfoExW = unsafe { zeroed() };
    startup.startup_info.cb = size_of::<StartupInfoExW>() as Dword;
    startup.startup_info.dw_flags = STARTF_USESTDHANDLES;
    startup.startup_info.h_std_input = child_stdin_read;
    startup.startup_info.h_std_output = child_stdout_write;
    startup.startup_info.h_std_error = child_stderr_write;
    startup.attribute_list = attribute_list;
    let mut information: ProcessInformation = unsafe { zeroed() };
    let created = unsafe {
        CreateProcessW(
            runtime_wide.as_ptr(),
            command.as_mut_ptr(),
            null(),
            null(),
            TRUE,
            CREATE_SUSPENDED
                | CREATE_NEW_PROCESS_GROUP
                | CREATE_UNICODE_ENVIRONMENT
                | EXTENDED_STARTUPINFO_PRESENT,
            environment.as_mut_ptr().cast::<c_void>(),
            root_wide.as_ptr(),
            &mut startup.startup_info,
            &mut information,
        )
    };
    unsafe { DeleteProcThreadAttributeList(attribute_list) };
    close(child_stdin_read);
    close(child_stdout_write);
    close(child_stderr_write);
    if created == FALSE {
        close(parent_stdin_write);
        close(parent_stdout_read);
        close(parent_stderr_read);
        close(job);
        return Err("PROCESS_CREATE");
    }
    if unsafe { AssignProcessToJobObject(job, information.h_process) } == FALSE {
        unsafe { TerminateJobObject(job, TERMINATION_EXIT) };
        close(information.h_thread);
        close(information.h_process);
        close(parent_stdin_write);
        close(parent_stdout_read);
        close(parent_stderr_read);
        close(job);
        return Err("PROCESS_ASSIGN");
    }
    Ok(OwnedWorker {
        job,
        process: information.h_process,
        thread: information.h_thread,
        stdin_write: parent_stdin_write,
        stdout_read: parent_stdout_read,
        stderr_read: parent_stderr_read,
        resumed: false,
    })
}

fn remaining(deadline: u64) -> Result<Dword, &'static str> {
    let now = monotonic_millis();
    if now >= deadline {
        return Err("WORKER_TIMEOUT");
    }
    Ok((deadline - now).min(Dword::MAX as u64) as Dword)
}

fn wait_pipe(pipe: Handle, process: Handle, deadline: u64) -> Result<(), &'static str> {
    loop {
        let mut available = 0u32;
        if unsafe { PeekNamedPipe(pipe, null_mut(), 0, null_mut(), &mut available, null_mut()) }
            == FALSE
        {
            return Err("WORKER_PIPE_READ");
        }
        if available > 0 {
            return Ok(());
        }
        if unsafe { WaitForSingleObject(process, 0) } == WAIT_OBJECT_0 {
            return Err("WORKER_PIPE_EOF");
        }
        remaining(deadline)?;
        unsafe { Sleep(1) };
    }
}

fn read_exact(
    pipe: Handle,
    process: Handle,
    length: usize,
    deadline: u64,
) -> Result<Vec<u8>, &'static str> {
    let mut output = vec![0u8; length];
    let mut offset = 0usize;
    while offset < length {
        wait_pipe(pipe, process, deadline)?;
        let mut read = 0u32;
        let requested = (length - offset).min(Dword::MAX as usize) as Dword;
        if unsafe {
            ReadFile(
                pipe,
                output[offset..].as_mut_ptr().cast::<c_void>(),
                requested,
                &mut read,
                null_mut(),
            )
        } == FALSE
            || read == 0
        {
            return Err("WORKER_PIPE_READ");
        }
        offset += read as usize;
    }
    Ok(output)
}

fn read_frame(worker: &OwnedWorker, deadline: u64) -> Result<Vec<u8>, &'static str> {
    let prefix = read_exact(worker.stdout_read, worker.process, 8, deadline)?;
    let declared = u64::from_be_bytes(prefix[..8].try_into().map_err(|_| "WORKER_FRAME")?);
    if declared == 0 || declared as usize > MAX_FRAME_BYTES {
        return Err("WORKER_FRAME_BOUND");
    }
    let body = read_exact(
        worker.stdout_read,
        worker.process,
        declared as usize,
        deadline,
    )?;
    let mut frame = prefix;
    frame.extend_from_slice(&body);
    Ok(frame)
}

fn write_all(pipe: Handle, bytes: &[u8]) -> Result<(), &'static str> {
    let mut offset = 0usize;
    while offset < bytes.len() {
        let mut written = 0u32;
        let requested = (bytes.len() - offset).min(Dword::MAX as usize) as Dword;
        if unsafe {
            WriteFile(
                pipe,
                bytes[offset..].as_ptr().cast::<c_void>(),
                requested,
                &mut written,
                null_mut(),
            )
        } == FALSE
            || written == 0
        {
            return Err("WORKER_PIPE_WRITE");
        }
        offset += written as usize;
    }
    Ok(())
}

pub fn exchange_worker<Ready, VerifyReady>(
    worker: &mut OwnedWorker,
    request: &[u8],
    deadline: u64,
    verify_ready: VerifyReady,
) -> Result<WorkerExchange<Ready>, &'static str>
where
    VerifyReady: FnOnce(&[u8]) -> Result<Ready, &'static str>,
{
    if !worker.resumed {
        return Err("PROCESS_NOT_RESUMED");
    }
    let ready_frame = read_frame(worker, deadline)?;
    let ready = verify_ready(&ready_frame)?;
    write_all(worker.stdin_write, request)?;
    close(worker.stdin_write);
    worker.stdin_write = null_mut();
    let result_frame = read_frame(worker, deadline)?;
    Ok(WorkerExchange {
        ready,
        result_frame,
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
    deadline: u64,
) -> Result<WorkerOutcome, &'static str> {
    if !worker.resumed {
        return Err("PROCESS_NOT_RESUMED");
    }
    let timeout_ms = match remaining(deadline) {
        Ok(value) => value,
        Err("WORKER_TIMEOUT") => {
            kill_owned_tree(worker);
            return Ok(WorkerOutcome {
                exit_code: TERMINATION_EXIT,
                timed_out: true,
            });
        }
        Err(code) => return Err(code),
    };
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
