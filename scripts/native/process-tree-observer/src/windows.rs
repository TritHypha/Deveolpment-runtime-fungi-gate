#[cfg(windows)]
use std::collections::{HashMap, HashSet};
use std::ffi::c_void;
#[cfg(windows)]
use std::fs::OpenOptions;
#[cfg(windows)]
use std::mem::{size_of, zeroed};
#[cfg(windows)]
use std::os::windows::ffi::OsStrExt;
#[cfg(windows)]
use std::os::windows::io::AsRawHandle;
use std::path::Path;
#[cfg(windows)]
use std::ptr::{null, null_mut};

#[cfg(windows)]
use crate::protocol::{write_result, Event, ObserverResult};

type Handle = *mut c_void;
type Bool = i32;
type Dword = u32;

const FALSE: Bool = 0;
const TRUE: Bool = 1;
const CREATE_SUSPENDED: Dword = 0x0000_0004;
const DEBUG_PROCESS: Dword = 0x0000_0001;
const CREATE_UNICODE_ENVIRONMENT: Dword = 0x0000_0400;
const STARTF_USESTDHANDLES: Dword = 0x0000_0100;
const JOB_OBJECT_EXTENDED_LIMIT_INFORMATION: i32 = 9;
const JOB_OBJECT_ASSOCIATE_COMPLETION_PORT_INFORMATION: i32 = 7;
const JOB_OBJECT_BASIC_ACCOUNTING_INFORMATION: i32 = 1;
const JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE: Dword = 0x0000_2000;
const JOB_OBJECT_MSG_NEW_PROCESS: Dword = 6;
const JOB_OBJECT_MSG_EXIT_PROCESS: Dword = 7;
const JOB_OBJECT_MSG_ACTIVE_PROCESS_ZERO: Dword = 4;
const DBG_CONTINUE: Dword = 0x0001_0002;
const DBG_EXCEPTION_NOT_HANDLED: Dword = 0x8001_0001;
const EXCEPTION_DEBUG_EVENT: Dword = 1;
const EXCEPTION_BREAKPOINT: Dword = 0x8000_0003;
const CREATE_PROCESS_DEBUG_EVENT: Dword = 3;
const LOAD_DLL_DEBUG_EVENT: Dword = 6;
const EXIT_PROCESS_DEBUG_EVENT: Dword = 5;
const ERROR_IO_PENDING: Dword = 997;
const ERROR_TIMEOUT: Dword = 258;
const ERROR_SEM_TIMEOUT: Dword = 121;
const HANDLE_FLAG_INHERIT: Dword = 1;
const DUPLICATE_SAME_ACCESS: Dword = 2;
const INVALID_HANDLE_VALUE: Handle = -1isize as Handle;

#[repr(C)]
struct StartupInfoW { cb: Dword, lp_reserved: *mut u16, lp_desktop: *mut u16, lp_title: *mut u16, dw_x: Dword, dw_y: Dword, dw_x_size: Dword, dw_y_size: Dword, dw_x_count_chars: Dword, dw_y_count_chars: Dword, dw_fill_attribute: Dword, dw_flags: Dword, w_show_window: u16, cb_reserved2: u16, lp_reserved2: *mut u8, h_std_input: Handle, h_std_output: Handle, h_std_error: Handle }
#[repr(C)]
struct ProcessInformation { h_process: Handle, h_thread: Handle, dw_process_id: Dword, dw_thread_id: Dword }
#[repr(C)]
struct JobObjectBasicLimitInformation { per_process_user_time_limit: i64, per_job_user_time_limit: i64, limit_flags: Dword, minimum_working_set_size: usize, maximum_working_set_size: usize, active_process_limit: Dword, affinity: usize, priority_class: Dword, scheduling_class: Dword }
#[repr(C)]
struct IoCounters { read_operation_count: u64, write_operation_count: u64, other_operation_count: u64, read_transfer_count: u64, write_transfer_count: u64, other_transfer_count: u64 }
#[repr(C)]
struct JobObjectExtendedLimitInformation { basic_limit_information: JobObjectBasicLimitInformation, io_info: IoCounters, process_memory_limit: usize, job_memory_limit: usize, peak_process_memory_used: usize, peak_job_memory_used: usize }
#[repr(C)]
struct JobObjectAssociateCompletionPortInformation { completion_key: Handle, completion_port: Handle }
#[repr(C)]
struct JobObjectBasicAccountingInformation { total_user_time: i64, total_kernel_time: i64, this_period_total_user_time: i64, this_period_total_kernel_time: i64, total_page_fault_count: Dword, total_processes: Dword, active_processes: Dword, total_terminated_processes: Dword }
#[repr(C)]
struct ProcessMemoryCounters { cb: Dword, page_fault_count: Dword, peak_working_set_size: usize, working_set_size: usize, quota_peak_paged_pool_usage: usize, quota_paged_pool_usage: usize, quota_peak_non_paged_pool_usage: usize, quota_non_paged_pool_usage: usize, pagefile_usage: usize, peak_pagefile_usage: usize }
#[repr(C)]
struct ProcessBasicInformation { reserved1: *mut c_void, peb_base_address: *mut c_void, reserved2: [*mut c_void; 2], unique_process_id: *mut c_void, inherited_from_unique_process_id: *mut c_void }
#[repr(C, align(8))]
struct DebugEvent { code: Dword, process_id: Dword, thread_id: Dword, _padding: Dword, data: [u8; 160] }

#[cfg(windows)]
const _: () = assert!(size_of::<DebugEvent>() == 176);

#[cfg(windows)]
#[link(name = "kernel32")]
unsafe extern "system" {
    fn CreateProcessW(application_name: *const u16, command_line: *mut u16, process_attributes: *const c_void, thread_attributes: *const c_void, inherit_handles: Bool, creation_flags: Dword, environment: *const c_void, current_directory: *const u16, startup_info: *mut StartupInfoW, process_information: *mut ProcessInformation) -> Bool;
    fn ResumeThread(thread: Handle) -> Dword;
    fn CloseHandle(handle: Handle) -> Bool;
    fn CreateJobObjectW(attributes: *const c_void, name: *const u16) -> Handle;
    fn SetInformationJobObject(job: Handle, class: i32, information: *const c_void, information_length: Dword) -> Bool;
    fn QueryInformationJobObject(job: Handle, class: i32, information: *mut c_void, information_length: Dword, returned_length: *mut Dword) -> Bool;
    fn AssignProcessToJobObject(job: Handle, process: Handle) -> Bool;
    fn CreateIoCompletionPort(file: Handle, existing: Handle, key: usize, concurrency: Dword) -> Handle;
    fn GetQueuedCompletionStatus(port: Handle, bytes: *mut Dword, key: *mut usize, overlapped: *mut *mut c_void, milliseconds: Dword) -> Bool;
    fn WaitForDebugEvent(event: *mut DebugEvent, milliseconds: Dword) -> Bool;
    fn ContinueDebugEvent(process_id: Dword, thread_id: Dword, status: Dword) -> Bool;
    fn QueryPerformanceCounter(value: *mut i64) -> Bool;
    fn QueryPerformanceFrequency(value: *mut i64) -> Bool;
    fn GetLastError() -> Dword;
    fn SetHandleInformation(handle: Handle, mask: Dword, flags: Dword) -> Bool;
    fn GetCurrentProcess() -> Handle;
    fn DuplicateHandle(source_process: Handle, source_handle: Handle, target_process: Handle, target_handle: *mut Handle, desired_access: Dword, inherit_handle: Bool, options: Dword) -> Bool;
}

#[cfg(windows)]
#[link(name = "psapi")]
unsafe extern "system" { fn GetProcessMemoryInfo(process: Handle, counters: *mut ProcessMemoryCounters, size: Dword) -> Bool; }

#[cfg(windows)]
#[link(name = "ntdll")]
unsafe extern "system" { fn NtQueryInformationProcess(process: Handle, class: u32, info: *mut c_void, length: u32, returned: *mut u32) -> i32; }

#[cfg(windows)]
fn wide(value: &str) -> Vec<u16> { std::ffi::OsStr::new(value).encode_wide().chain(std::iter::once(0)).collect() }

#[cfg(windows)]
fn quote_arg(value: &str) -> String {
    if !value.is_empty() && !value.chars().any(|c| c.is_whitespace() || c == '"') { return value.to_string(); }
    let mut result = String::from("\""); let mut slashes = 0usize;
    for ch in value.chars() {
        if ch == '\\' { slashes += 1; continue; }
        if ch == '"' { result.push_str(&"\\".repeat(slashes * 2 + 1)); result.push('"'); slashes = 0; continue; }
        if slashes != 0 { result.push_str(&"\\".repeat(slashes)); slashes = 0; }
        result.push(ch);
    }
    if slashes != 0 { result.push_str(&"\\".repeat(slashes * 2)); }
    result.push('"'); result
}

#[cfg(windows)]
fn qpc() -> Result<i64, &'static str> { let mut value = 0; if unsafe { QueryPerformanceCounter(&mut value) } == FALSE { return Err("HOLD_WINDOWS_CLOCK"); } Ok(value) }

#[cfg(windows)]
fn ppid(process: Handle) -> Result<u32, &'static str> {
    let mut info: ProcessBasicInformation = unsafe { zeroed() }; let mut returned = 0;
    let status = unsafe { NtQueryInformationProcess(process, 0, (&mut info as *mut ProcessBasicInformation).cast(), size_of::<ProcessBasicInformation>() as u32, &mut returned) };
    if status < 0 { return Err("HOLD_WINDOWS_PARENTAGE"); }
    Ok(info.inherited_from_unique_process_id as usize as u32)
}

#[cfg(windows)]
fn peak_rss_kib(process: Handle) -> Result<u64, &'static str> {
    let mut counters: ProcessMemoryCounters = unsafe { zeroed() }; counters.cb = size_of::<ProcessMemoryCounters>() as u32;
    if unsafe { GetProcessMemoryInfo(process, &mut counters, counters.cb) } == FALSE { return Err("HOLD_WINDOWS_MEMORY"); }
    Ok((counters.peak_working_set_size as u64).saturating_add(1023) / 1024)
}

#[cfg(windows)]
fn read_u32(data: &[u8], offset: usize) -> u32 { u32::from_ne_bytes(data[offset..offset + 4].try_into().unwrap_or([0; 4])) }
#[cfg(windows)]
fn read_handle(data: &[u8], offset: usize) -> Handle { usize::from_ne_bytes(data[offset..offset + size_of::<usize>()].try_into().unwrap_or([0; size_of::<usize>()])) as Handle }

#[cfg(windows)]
struct ProcessRow { key: String, parent_key: Option<String>, pid: u32, parent_pid: u32, handle: Handle, ended: bool }

#[cfg(windows)]
pub fn observe(event_path: &Path, stdout_path: &Path, stderr_path: &Path, executable: &str, args: &[String]) -> Result<(), &'static str> {
    let mut frequency = 0; if unsafe { QueryPerformanceFrequency(&mut frequency) } == FALSE || frequency <= 0 { return Err("HOLD_WINDOWS_CLOCK"); }
    let stdout = OpenOptions::new().create_new(true).write(true).open(stdout_path).map_err(|_| "HOLD_WINDOWS_OUTPUT")?;
    let stderr = OpenOptions::new().create_new(true).write(true).open(stderr_path).map_err(|_| "HOLD_WINDOWS_OUTPUT")?;
    let stdout_handle = stdout.as_raw_handle() as Handle; let stderr_handle = stderr.as_raw_handle() as Handle;
    if unsafe { SetHandleInformation(stdout_handle, HANDLE_FLAG_INHERIT, HANDLE_FLAG_INHERIT) } == FALSE || unsafe { SetHandleInformation(stderr_handle, HANDLE_FLAG_INHERIT, HANDLE_FLAG_INHERIT) } == FALSE { return Err("HOLD_WINDOWS_OUTPUT"); }
    let job = unsafe { CreateJobObjectW(null(), null()) }; if job.is_null() { return Err("HOLD_WINDOWS_JOB"); }
    let port = unsafe { CreateIoCompletionPort(INVALID_HANDLE_VALUE, null_mut(), 0, 1) }; if port.is_null() { unsafe { CloseHandle(job); } return Err("HOLD_WINDOWS_JOB"); }
    let mut limits: JobObjectExtendedLimitInformation = unsafe { zeroed() }; limits.basic_limit_information.limit_flags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
    if unsafe { SetInformationJobObject(job, JOB_OBJECT_EXTENDED_LIMIT_INFORMATION, (&limits as *const JobObjectExtendedLimitInformation).cast::<c_void>(), size_of::<JobObjectExtendedLimitInformation>() as Dword) } == FALSE { unsafe { CloseHandle(port); CloseHandle(job); } return Err("HOLD_WINDOWS_JOB"); }
    let association = JobObjectAssociateCompletionPortInformation { completion_key: job, completion_port: port };
    if unsafe { SetInformationJobObject(job, JOB_OBJECT_ASSOCIATE_COMPLETION_PORT_INFORMATION, (&association as *const JobObjectAssociateCompletionPortInformation).cast::<c_void>(), size_of::<JobObjectAssociateCompletionPortInformation>() as Dword) } == FALSE { unsafe { CloseHandle(port); CloseHandle(job); } return Err("HOLD_WINDOWS_JOB"); }
    let app = wide(executable); let mut command = quote_arg(executable); for arg in args { command.push(' '); command.push_str(&quote_arg(arg)); } let mut command_w = wide(&command);
    let mut startup: StartupInfoW = unsafe { zeroed() }; startup.cb = size_of::<StartupInfoW>() as Dword; startup.dw_flags = STARTF_USESTDHANDLES; startup.h_std_output = stdout_handle; startup.h_std_error = stderr_handle;
    let mut info: ProcessInformation = unsafe { zeroed() };
    if unsafe { CreateProcessW(app.as_ptr(), command_w.as_mut_ptr(), null(), null(), TRUE, CREATE_SUSPENDED | DEBUG_PROCESS | CREATE_UNICODE_ENVIRONMENT, null(), null(), &mut startup, &mut info) } == FALSE { unsafe { CloseHandle(port); CloseHandle(job); } return Err("HOLD_WINDOWS_CREATE_PROCESS"); }
    if unsafe { AssignProcessToJobObject(job, info.h_process) } == FALSE { unsafe { CloseHandle(info.h_thread); CloseHandle(info.h_process); CloseHandle(port); CloseHandle(job); } return Err("HOLD_WINDOWS_JOB_ASSIGN"); }
    if unsafe { ResumeThread(info.h_thread) } == u32::MAX { unsafe { CloseHandle(info.h_thread); CloseHandle(info.h_process); CloseHandle(port); CloseHandle(job); } return Err("HOLD_WINDOWS_RESUME"); }
    unsafe { CloseHandle(info.h_thread); }
    let root_pid = info.dw_process_id; let mut rows: HashMap<u32, ProcessRow> = HashMap::new(); let mut events = Vec::new();
    let mut debug_creates = 0u64; let mut debug_exits = 0u64; let mut job_creates = 0u64; let mut job_exits = 0u64; let mut job_created_pids = HashSet::new(); let mut job_exited_pids = HashSet::new(); let mut job_zero = false; let mut root_exit = None; let mut unsupported_exception = false; let mut initial_breakpoints = HashSet::new();
    loop {
        let mut debug: DebugEvent = unsafe { zeroed() }; let got = unsafe { WaitForDebugEvent(&mut debug, 100) } != FALSE;
        if got {
            let mut continue_status = DBG_CONTINUE;
            match debug.code {
                EXCEPTION_DEBUG_EVENT => {
                    let exception_code = read_u32(&debug.data, 0);
                    let first_chance = read_u32(&debug.data, 152);
                    if exception_code == EXCEPTION_BREAKPOINT && first_chance == 1 && initial_breakpoints.insert(debug.process_id) {
                        continue_status = DBG_CONTINUE;
                    } else {
                        unsupported_exception = true;
                        continue_status = DBG_EXCEPTION_NOT_HANDLED;
                    }
                }
                CREATE_PROCESS_DEBUG_EVENT => {
                    // CREATE_PROCESS_DEBUG_INFO starts with hFile, then hProcess and
                    // hThread.  The process handle is therefore the second native
                    // handle in the union, not the file handle at offset zero.
                    let file_handle = read_handle(&debug.data, 0);
                    let supplied_handle = read_handle(&debug.data, size_of::<Handle>()); if supplied_handle.is_null() { return Err("HOLD_WINDOWS_HANDLE"); }
                    if !file_handle.is_null() && file_handle != INVALID_HANDLE_VALUE { unsafe { CloseHandle(file_handle); } }
                    let mut handle = null_mut();
                    if unsafe { DuplicateHandle(GetCurrentProcess(), supplied_handle, GetCurrentProcess(), &mut handle, 0, FALSE, DUPLICATE_SAME_ACCESS) } == FALSE || handle.is_null() { return Err("HOLD_WINDOWS_HANDLE"); }
                    let parent_pid = ppid(handle)?; let start = qpc()?; let parent_key = rows.get(&parent_pid).map(|row| row.key.clone()); let key = format!("producer:{}:{}", debug.process_id, start);
                    rows.insert(debug.process_id, ProcessRow { key: key.clone(), parent_key: parent_key.clone(), pid: debug.process_id, parent_pid, handle, ended: false });
                    events.push(Event { kind: "create", process_key: key, parent_process_key: parent_key, pid: debug.process_id as u64, parent_pid: parent_pid as u64, tick: start.to_string(), peak_rss_kib: None, termination_kind: None, termination_code: None }); debug_creates += 1;
                }
                LOAD_DLL_DEBUG_EVENT => {
                    let file_handle = read_handle(&debug.data, 0);
                    if !file_handle.is_null() && file_handle != INVALID_HANDLE_VALUE { unsafe { CloseHandle(file_handle); } }
                }
                EXIT_PROCESS_DEBUG_EVENT => {
                    let code = read_u32(&debug.data, 0); let end = qpc()?; let row = rows.get_mut(&debug.process_id).ok_or("HOLD_WINDOWS_LIFECYCLE")?; if row.ended { return Err("HOLD_WINDOWS_LIFECYCLE"); } row.ended = true;
                    let rss = peak_rss_kib(row.handle)?; unsafe { CloseHandle(row.handle); } events.push(Event { kind: "exit", process_key: row.key.clone(), parent_process_key: row.parent_key.clone(), pid: row.pid as u64, parent_pid: row.parent_pid as u64, tick: end.to_string(), peak_rss_kib: Some(rss), termination_kind: Some("exit"), termination_code: Some(code as i64) }); debug_exits += 1; if debug.process_id == root_pid { root_exit = Some(code); }
                }
                _ => {}
            }
            if unsafe { ContinueDebugEvent(debug.process_id, debug.thread_id, continue_status) } == FALSE { return Err("HOLD_WINDOWS_DEBUG_CONTINUE"); }
        } else { let error = unsafe { GetLastError() }; if error != ERROR_TIMEOUT && error != ERROR_SEM_TIMEOUT { return Err("HOLD_WINDOWS_DEBUG_WAIT"); } }
        loop {
            let mut bytes = 0; let mut key = 0usize; let mut overlapped = null_mut(); let ok = unsafe { GetQueuedCompletionStatus(port, &mut bytes, &mut key, &mut overlapped, 0) } != FALSE;
            if !ok { let error = unsafe { GetLastError() }; if error == ERROR_TIMEOUT || error == ERROR_IO_PENDING { break; } return Err("HOLD_WINDOWS_JOB_DRAIN"); }
            if key != job as usize { return Err("HOLD_WINDOWS_JOB_IDENTITY"); }
            match bytes {
                JOB_OBJECT_MSG_NEW_PROCESS => {
                    let pid = overlapped as usize as u32;
                    if pid == 0 || !job_created_pids.insert(pid) { return Err("HOLD_WINDOWS_JOB_IDENTITY"); }
                    job_creates += 1;
                }
                JOB_OBJECT_MSG_EXIT_PROCESS => {
                    let pid = overlapped as usize as u32;
                    if pid == 0 || !job_exited_pids.insert(pid) { return Err("HOLD_WINDOWS_JOB_IDENTITY"); }
                    job_exits += 1;
                }
                JOB_OBJECT_MSG_ACTIVE_PROCESS_ZERO => job_zero = true,
                _ => return Err("HOLD_WINDOWS_JOB_DRAIN"),
            }
        }
        if root_exit.is_some() && debug_creates == debug_exits && job_zero { break; }
    }
    drop(stdout); drop(stderr);
    if unsupported_exception { unsafe { CloseHandle(info.h_process); CloseHandle(port); CloseHandle(job); } return Err("HOLD_WINDOWS_EXCEPTION"); }
    let mut accounting: JobObjectBasicAccountingInformation = unsafe { zeroed() }; let mut returned = 0;
    let accounting_ok = unsafe { QueryInformationJobObject(job, JOB_OBJECT_BASIC_ACCOUNTING_INFORMATION, (&mut accounting as *mut JobObjectBasicAccountingInformation).cast(), size_of::<JobObjectBasicAccountingInformation>() as Dword, &mut returned) } != FALSE;
    unsafe { CloseHandle(info.h_process); CloseHandle(port); CloseHandle(job); }
    if !accounting_ok { return Err("HOLD_WINDOWS_RECONCILIATION"); }
    if root_exit != Some(0) || debug_creates == 0 || debug_creates != debug_exits || job_creates != debug_creates || job_exits != debug_exits || !job_zero || accounting.total_processes as usize != rows.len() || accounting.active_processes != 0 || job_created_pids.len() != rows.len() || job_exited_pids.len() != rows.len() || rows.values().any(|row| !row.ended || !job_created_pids.contains(&row.pid) || !job_exited_pids.contains(&row.pid)) { return Err("HOLD_WINDOWS_RECONCILIATION"); }
    if stdout_path.metadata().map_err(|_| "HOLD_WINDOWS_OUTPUT")?.len() > 1024 * 1024 || stderr_path.metadata().map_err(|_| "HOLD_WINDOWS_OUTPUT")?.len() > 1024 * 1024 { return Err("HOLD_WINDOWS_OUTPUT_LIMIT"); }
    let mut digest_events = events.clone();
    digest_events.sort_by(|left, right| left.process_key.cmp(&right.process_key).then(left.kind.cmp(right.kind)).then(left.tick.cmp(&right.tick)));
    let digest_input = digest_events.iter().map(|event| format!("{}\0{}\0{}\0{}\0{}\0{}\0{}\0{}\0{}", event.kind, event.process_key, event.parent_process_key.as_deref().unwrap_or(""), event.pid, event.parent_pid, event.tick, event.peak_rss_kib.unwrap_or(0), event.termination_kind.unwrap_or(""), event.termination_code.unwrap_or(-1))).collect::<Vec<_>>().join("\0");
    let result = ObserverResult { platform: "win32", mechanism: "windows-debug-job-v1", clock_kind: "qpc", clock_frequency: frequency.to_string(), native_create_events: debug_creates, native_exit_events: debug_exits, secondary_create_events: job_creates, secondary_exit_events: job_exits, retained_handle_rows: rows.len() as u64, terminal_state: "reconciled", root_termination_kind: "exit", root_exit_code: 0, observer_digest: sha256_hex(digest_input.as_bytes()), events };
    write_result(event_path, &result)
}

#[cfg(windows)]
fn sha256_hex(bytes: &[u8]) -> String {
    const INITIAL: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
        0x5be0cd19,
    ];
    const K: [u32; 64] = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
        0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
        0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
        0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
        0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
        0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
        0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
        0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
        0xc67178f2,
    ];
    let bit_len = (bytes.len() as u64).wrapping_mul(8);
    let mut padded = bytes.to_vec();
    padded.push(0x80);
    while padded.len() % 64 != 56 { padded.push(0); }
    padded.extend_from_slice(&bit_len.to_be_bytes());
    let mut state = INITIAL;
    for block in padded.chunks_exact(64) {
        let mut words = [0u32; 64];
        for (index, chunk) in block.chunks_exact(4).enumerate() { words[index] = u32::from_be_bytes(chunk.try_into().unwrap_or([0; 4])); }
        for index in 16..64 {
            let s0 = words[index - 15].rotate_right(7) ^ words[index - 15].rotate_right(18) ^ (words[index - 15] >> 3);
            let s1 = words[index - 2].rotate_right(17) ^ words[index - 2].rotate_right(19) ^ (words[index - 2] >> 10);
            words[index] = words[index - 16].wrapping_add(s0).wrapping_add(words[index - 7]).wrapping_add(s1);
        }
        let [mut a, mut b, mut c, mut d, mut e, mut f, mut g, mut h] = state;
        for index in 0..64 {
            let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let choice = (e & f) ^ ((!e) & g);
            let temp1 = h.wrapping_add(s1).wrapping_add(choice).wrapping_add(K[index]).wrapping_add(words[index]);
            let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let majority = (a & b) ^ (a & c) ^ (b & c);
            let temp2 = s0.wrapping_add(majority);
            h = g; g = f; f = e; e = d.wrapping_add(temp1); d = c; c = b; b = a; a = temp1.wrapping_add(temp2);
        }
        state[0] = state[0].wrapping_add(a); state[1] = state[1].wrapping_add(b); state[2] = state[2].wrapping_add(c); state[3] = state[3].wrapping_add(d);
        state[4] = state[4].wrapping_add(e); state[5] = state[5].wrapping_add(f); state[6] = state[6].wrapping_add(g); state[7] = state[7].wrapping_add(h);
    }
    state.iter().map(|word| format!("{word:08x}")).collect()
}

#[cfg(all(test, windows))]
mod tests {
    #[test]
    fn sha256_known_answer_abc() {
        assert_eq!(super::sha256_hex(b"abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }
}

#[cfg(not(windows))]
pub fn observe(_: &Path, _: &Path, _: &Path, _: &str, _: &[String]) -> Result<(), &'static str> { Err("HOLD_NATIVE_PLATFORM_UNAVAILABLE") }
