#[cfg(target_os = "linux")]
use std::collections::HashMap;
#[cfg(target_os = "linux")]
use std::ffi::{c_char, c_int, c_long, c_ulong, c_void, CString};
#[cfg(target_os = "linux")]
use std::fs::{metadata, read_to_string};
#[cfg(target_os = "linux")]
use std::mem::zeroed;
#[cfg(target_os = "linux")]
use std::os::unix::io::RawFd;
use std::path::Path;
#[cfg(target_os = "linux")]
use crate::protocol::{write_result, Event, ObserverResult};

#[cfg(target_os = "linux")]
type Pid = c_int;
#[cfg(target_os = "linux")]
const PR_SET_CHILD_SUBREAPER: c_int = 36;
#[cfg(target_os = "linux")]
const PR_GET_CHILD_SUBREAPER: c_int = 37;
#[cfg(target_os = "linux")]
const PTRACE_TRACEME: c_ulong = 0;
#[cfg(target_os = "linux")]
const PTRACE_CONT: c_ulong = 7;
#[cfg(target_os = "linux")]
const PTRACE_SETOPTIONS: c_ulong = 0x4200;
#[cfg(target_os = "linux")]
const PTRACE_GETEVENTMSG: c_ulong = 0x4201;
#[cfg(target_os = "linux")]
const PTRACE_O_TRACEFORK: c_ulong = 0x0002;
#[cfg(target_os = "linux")]
const PTRACE_O_TRACEVFORK: c_ulong = 0x0004;
#[cfg(target_os = "linux")]
const PTRACE_O_TRACECLONE: c_ulong = 0x0008;
#[cfg(target_os = "linux")]
const PTRACE_O_TRACEEXEC: c_ulong = 0x0010;
#[cfg(target_os = "linux")]
const PTRACE_O_TRACEEXIT: c_ulong = 0x0040;
#[cfg(target_os = "linux")]
const PTRACE_O_EXITKILL: c_ulong = 0x0010_0000;
#[cfg(target_os = "linux")]
const PTRACE_EVENT_FORK: c_int = 1;
#[cfg(target_os = "linux")]
const PTRACE_EVENT_VFORK: c_int = 2;
#[cfg(target_os = "linux")]
const PTRACE_EVENT_CLONE: c_int = 3;
#[cfg(target_os = "linux")]
const PTRACE_EVENT_EXEC: c_int = 4;
#[cfg(target_os = "linux")]
const PTRACE_EVENT_EXIT: c_int = 6;
#[cfg(target_os = "linux")]
const SIGSTOP: c_int = 19;
#[cfg(target_os = "linux")]
const SIGCHLD: c_int = 17;
#[cfg(target_os = "linux")]
const SIGKILL: c_int = 9;
#[cfg(target_os = "linux")]
const WALL: c_int = 0x4000_0000;
#[cfg(target_os = "linux")]
const WUNTRACED: c_int = 2;
#[cfg(target_os = "linux")]
const CLOCK_MONOTONIC_RAW: c_int = 4;
#[cfg(target_os = "linux")]
const O_WRONLY: c_int = 1;
#[cfg(target_os = "linux")]
const O_CREAT: c_int = 0o100;
#[cfg(target_os = "linux")]
const O_EXCL: c_int = 0o200;
#[cfg(target_os = "linux")]
const O_CLOEXEC: c_int = 0o2000000;
#[cfg(target_os = "linux")]
const ECHILD: c_int = 10;
#[cfg(target_os = "linux")]
const EINTR: c_int = 4;

#[cfg(target_os = "linux")]
#[repr(C)] struct Timespec { tv_sec: i64, tv_nsec: i64 }
#[cfg(target_os = "linux")]
#[repr(C)] struct Timeval { tv_sec: i64, tv_usec: i64 }
#[cfg(target_os = "linux")]
#[repr(C)] struct Rusage {
    ru_utime: Timeval, ru_stime: Timeval, ru_maxrss: i64, ru_ixrss: i64,
    ru_idrss: i64, ru_isrss: i64, ru_minflt: i64, ru_majflt: i64,
    ru_nswap: i64, ru_inblock: i64, ru_oublock: i64, ru_msgsnd: i64,
    ru_msgrcv: i64, ru_nsignals: i64, ru_nvcsw: i64, ru_nivcsw: i64,
}

#[cfg(target_os = "linux")]
#[link(name = "c")]
unsafe extern "C" {
    fn prctl(option: c_int, arg2: c_ulong, arg3: c_ulong, arg4: c_ulong, arg5: c_ulong) -> c_int;
    fn fork() -> Pid;
    fn getpid() -> Pid;
    fn ptrace(request: c_ulong, pid: Pid, address: *mut c_void, data: *mut c_void) -> c_long;
    fn wait4(pid: Pid, status: *mut c_int, options: c_int, usage: *mut Rusage) -> Pid;
    fn kill(pid: Pid, signal: c_int) -> c_int;
    fn setpgid(pid: Pid, group: Pid) -> c_int;
    fn execv(path: *const c_char, argv: *const *const c_char) -> c_int;
    fn _exit(status: c_int) -> !;
    fn open(path: *const c_char, flags: c_int, mode: c_int) -> RawFd;
    fn dup2(old: RawFd, new: RawFd) -> RawFd;
    fn close(fd: RawFd) -> c_int;
    fn clock_gettime(clock: c_int, value: *mut Timespec) -> c_int;
    fn __errno_location() -> *mut c_int;
}

#[cfg(target_os = "linux")]
fn errno() -> c_int { unsafe { *__errno_location() } }
#[cfg(target_os = "linux")]
fn ptrace_ok(request: c_ulong, pid: Pid, data: *mut c_void) -> Result<(), &'static str> {
    if unsafe { ptrace(request, pid, std::ptr::null_mut(), data) } == -1 { Err("HOLD_LINUX_PTRACE") } else { Ok(()) }
}
#[cfg(target_os = "linux")]
fn tick() -> Result<i64, &'static str> {
    let mut value: Timespec = unsafe { zeroed() };
    if unsafe { clock_gettime(CLOCK_MONOTONIC_RAW, &mut value) } != 0 || value.tv_sec < 0 || !(0..1_000_000_000).contains(&value.tv_nsec) { return Err("HOLD_LINUX_CLOCK"); }
    value.tv_sec.checked_mul(1_000_000_000).and_then(|base| base.checked_add(value.tv_nsec)).ok_or("HOLD_LINUX_CLOCK")
}
#[cfg(target_os = "linux")]
fn identity(pid: Pid) -> Result<(Pid, Pid), &'static str> {
    let body = read_to_string(format!("/proc/{pid}/status")).map_err(|_| "HOLD_LINUX_PARENTAGE")?;
    let mut tgid = None; let mut ppid = None;
    for line in body.lines() {
        if let Some(value) = line.strip_prefix("Tgid:\t") { tgid = value.parse::<Pid>().ok(); }
        if let Some(value) = line.strip_prefix("PPid:\t") { ppid = value.parse::<Pid>().ok(); }
    }
    Ok((tgid.filter(|value| *value > 0).ok_or("HOLD_LINUX_PARENTAGE")?, ppid.filter(|value| *value >= 0).ok_or("HOLD_LINUX_PARENTAGE")?))
}
#[cfg(target_os = "linux")]
fn open_output(path: &Path) -> Result<RawFd, &'static str> {
    let text = CString::new(path.as_os_str().as_encoded_bytes()).map_err(|_| "HOLD_LINUX_OUTPUT")?;
    let fd = unsafe { open(text.as_ptr(), O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC, 0o600) };
    if fd < 0 { Err("HOLD_LINUX_OUTPUT") } else { Ok(fd) }
}
#[cfg(target_os = "linux")]
struct SubreaperGuard { previous: c_int }
#[cfg(target_os = "linux")]
impl Drop for SubreaperGuard { fn drop(&mut self) { unsafe { let _ = prctl(PR_SET_CHILD_SUBREAPER, self.previous as c_ulong, 0, 0, 0); } } }
#[cfg(target_os = "linux")]
struct Tracee { key: String, parent_key: Option<String>, pid: Pid, parent_pid: Pid, tgid: Pid, leader: bool, ended: bool }
#[cfg(target_os = "linux")]
struct PendingChild { parent_key: Option<String>, parent_pid: Pid }
#[cfg(target_os = "linux")]
fn continue_tracee(pid: Pid) -> Result<(), &'static str> { ptrace_ok(PTRACE_CONT, pid, std::ptr::null_mut()) }
#[cfg(target_os = "linux")]
fn continue_tracee_signal(pid: Pid, signal: c_int) -> Result<(), &'static str> {
    ptrace_ok(PTRACE_CONT, pid, signal as usize as *mut c_void)
}
#[cfg(target_os = "linux")]
fn kill_group(root: Pid) { unsafe { let _ = kill(-root, SIGKILL); let _ = kill(root, SIGKILL); } }

#[cfg(target_os = "linux")]
pub fn observe(event_path: &Path, stdout_path: &Path, stderr_path: &Path, executable: &str, args: &[String]) -> Result<(), &'static str> {
    let mut previous = 0;
    if unsafe { prctl(PR_GET_CHILD_SUBREAPER, (&mut previous as *mut c_int).cast::<c_void>() as c_ulong, 0, 0, 0) } != 0 || unsafe { prctl(PR_SET_CHILD_SUBREAPER, 1, 0, 0, 0) } != 0 { return Err("HOLD_LINUX_SUBREAPER"); }
    let _guard = SubreaperGuard { previous };
    let executable_c = CString::new(executable).map_err(|_| "HOLD_LINUX_EXECUTABLE")?;
    let mut argv_c = Vec::with_capacity(args.len() + 2); argv_c.push(executable_c.clone());
    for arg in args { argv_c.push(CString::new(arg.as_str()).map_err(|_| "HOLD_LINUX_EXECUTABLE")?); }
    let mut argv: Vec<*const c_char> = argv_c.iter().map(|arg| arg.as_ptr()).collect(); argv.push(std::ptr::null());
    let root = unsafe { fork() }; if root < 0 { return Err("HOLD_LINUX_FORK"); }
    if root == 0 {
        if unsafe { setpgid(0, 0) } != 0 { unsafe { _exit(125); } }
        if unsafe { ptrace(PTRACE_TRACEME, 0, std::ptr::null_mut(), std::ptr::null_mut()) } == -1 { unsafe { _exit(126); } }
        let out = match open_output(stdout_path) { Ok(fd) => fd, Err(_) => unsafe { _exit(125) } };
        let err = match open_output(stderr_path) { Ok(fd) => fd, Err(_) => unsafe { close(out); _exit(125) } };
        if unsafe { dup2(out, 1) } < 0 || unsafe { dup2(err, 2) } < 0 { unsafe { close(out); close(err); _exit(125); } }
        unsafe { close(out); close(err); kill(getpid(), SIGSTOP); execv(executable_c.as_ptr(), argv.as_ptr()); _exit(127); }
    }
    let mut status = 0; let mut usage: Rusage = unsafe { zeroed() };
    if unsafe { wait4(root, &mut status, WUNTRACED, &mut usage) } != root || (status & 0x7f) != 0x7f || ((status >> 8) & 0xff) != SIGSTOP { kill_group(root); return Err("HOLD_LINUX_ROOT_STOP"); }
    let options = PTRACE_O_TRACEFORK | PTRACE_O_TRACEVFORK | PTRACE_O_TRACECLONE | PTRACE_O_TRACEEXEC | PTRACE_O_TRACEEXIT | PTRACE_O_EXITKILL;
    ptrace_ok(PTRACE_SETOPTIONS, root, options as *mut c_void)?;
    let start = tick()?; let root_key = format!("producer:{root}:{start}");
    let mut tracees = HashMap::new(); tracees.insert(root, Tracee { key: root_key.clone(), parent_key: None, pid: root, parent_pid: 0, tgid: root, leader: true, ended: false });
    let mut leader_keys = HashMap::new(); leader_keys.insert(root, root_key.clone());
    let mut pending_children: HashMap<Pid, PendingChild> = HashMap::new();
    let mut early_child_stops: HashMap<Pid, ()> = HashMap::new();
    let mut events = vec![Event { kind: "create", process_key: root_key, parent_process_key: None, pid: root as u64, parent_pid: 0, tick: start.to_string(), peak_rss_kib: None, termination_kind: None, termination_code: None }];
    let mut creates = 1u64; let mut exits = 0u64; let mut group_peak_rss: HashMap<Pid, u64> = HashMap::new(); let mut leader_exit_indices: HashMap<Pid, usize> = HashMap::new(); let mut root_exit: Option<(c_int, &'static str)> = None;
    continue_tracee(root)?;
    loop {
        let mut wait_status = 0; let mut wait_usage: Rusage = unsafe { zeroed() };
        let waited = unsafe { wait4(-1, &mut wait_status, WALL, &mut wait_usage) };
        if waited < 0 { let error = errno(); if error == EINTR { continue; } if error == ECHILD { break; } kill_group(root); return Err("HOLD_LINUX_WAIT4"); }
        if let Some(pending) = pending_children.remove(&waited) {
            if (wait_status & 0x7f) != 0x7f || ((wait_status >> 8) & 0xff) != SIGSTOP {
                kill_group(root); return Err("HOLD_LINUX_CHILD_STOP");
            }
            let (tgid, ppid) = identity(waited)?; let child_start = tick()?; let child_key = format!("producer:{waited}:{child_start}");
            let leader = waited == tgid;
            tracees.insert(waited, Tracee { key: child_key.clone(), parent_key: pending.parent_key.clone(), pid: waited, parent_pid: ppid, tgid, leader, ended: false });
            if leader { leader_keys.insert(tgid, child_key.clone()); creates += 1; events.push(Event { kind: "create", process_key: child_key, parent_process_key: pending.parent_key, pid: waited as u64, parent_pid: ppid as u64, tick: child_start.to_string(), peak_rss_kib: None, termination_kind: None, termination_code: None }); }
            ptrace_ok(PTRACE_SETOPTIONS, waited, options as *mut c_void)?; continue_tracee(waited)?; continue_tracee(pending.parent_pid)?; continue;
        }
        let tracee = match tracees.get_mut(&waited) {
            Some(tracee) => tracee,
            None => {
                if (wait_status & 0x7f) == 0x7f && ((wait_status >> 8) & 0xff) == SIGSTOP {
                    if early_child_stops.len() >= 16384 || early_child_stops.insert(waited, ()).is_some() { kill_group(root); return Err("HOLD_LINUX_LIFECYCLE"); }
                    continue;
                }
                kill_group(root); return Err("HOLD_LINUX_UNMATCHED_TRACE");
            }
        };
        if (wait_status & 0x7f) == 0 {
            if tracee.ended { kill_group(root); return Err("HOLD_LINUX_LIFECYCLE"); }
            let code = ((wait_status >> 8) & 0xff) as c_int;
            let rss = wait_usage.ru_maxrss.max(0) as u64; let tgid = tracee.tgid; let leader = tracee.leader; let key = tracee.key.clone(); let parent_key = tracee.parent_key.clone(); let pid = tracee.pid; let parent_pid = tracee.parent_pid; tracee.ended = true; let group_rss = group_peak_rss.entry(tgid).or_insert(0); *group_rss = (*group_rss).max(rss);
            if leader { exits += 1; let end = tick()?; let index = events.len(); events.push(Event { kind: "exit", process_key: key, parent_process_key: parent_key, pid: pid as u64, parent_pid: parent_pid as u64, tick: end.to_string(), peak_rss_kib: Some(*group_rss), termination_kind: Some("exit"), termination_code: Some(code as i64) }); leader_exit_indices.insert(tgid, index); }
            else if let Some(index) = leader_exit_indices.get(&tgid).copied() { if let Some(event) = events.get_mut(index) { event.peak_rss_kib = Some((*group_rss).max(event.peak_rss_kib.unwrap_or(0))); } }
            if waited == root { root_exit = Some((code, "exit")); }
            continue;
        }
        if (wait_status & 0x7f) != 0x7f {
            let signal = (wait_status & 0x7f) as c_int; let end = tick()?; let rss = wait_usage.ru_maxrss.max(0) as u64; let tgid = tracee.tgid; let leader = tracee.leader; let key = tracee.key.clone(); let parent_key = tracee.parent_key.clone(); let pid = tracee.pid; let parent_pid = tracee.parent_pid; tracee.ended = true; let group_rss = group_peak_rss.entry(tgid).or_insert(0); *group_rss = (*group_rss).max(rss);
            if leader { exits += 1; let index = events.len(); events.push(Event { kind: "exit", process_key: key, parent_process_key: parent_key, pid: pid as u64, parent_pid: parent_pid as u64, tick: end.to_string(), peak_rss_kib: Some(*group_rss), termination_kind: Some("signal"), termination_code: Some(signal as i64) }); leader_exit_indices.insert(tgid, index); }
            else if let Some(index) = leader_exit_indices.get(&tgid).copied() { if let Some(event) = events.get_mut(index) { event.peak_rss_kib = Some((*group_rss).max(event.peak_rss_kib.unwrap_or(0))); } }
            if waited == root { root_exit = Some((signal, "signal")); } continue;
        }
        let event = wait_status >> 16;
        let stop_signal = ((wait_status >> 8) & 0xff) as c_int;
        if event == 0 && stop_signal == SIGCHLD {
            continue_tracee_signal(waited, SIGCHLD)?;
            continue;
        }
        if event == PTRACE_EVENT_FORK || event == PTRACE_EVENT_VFORK || event == PTRACE_EVENT_CLONE {
            let mut child: c_ulong = 0; ptrace_ok(PTRACE_GETEVENTMSG, waited, (&mut child as *mut c_ulong).cast::<c_void>())?;
            let child = child as Pid; let parent_key = tracees.get(&waited).and_then(|entry| leader_keys.get(&entry.tgid).cloned()).or_else(|| tracees.get(&waited).map(|entry| entry.key.clone()));
            if early_child_stops.remove(&child).is_some() {
                let (tgid, ppid) = identity(child)?; let child_start = tick()?; let child_key = format!("producer:{child}:{child_start}");
                let leader = child == tgid;
                tracees.insert(child, Tracee { key: child_key.clone(), parent_key: parent_key.clone(), pid: child, parent_pid: ppid, tgid, leader, ended: false });
                if leader { leader_keys.insert(tgid, child_key.clone()); creates += 1; events.push(Event { kind: "create", process_key: child_key, parent_process_key: parent_key, pid: child as u64, parent_pid: ppid as u64, tick: child_start.to_string(), peak_rss_kib: None, termination_kind: None, termination_code: None }); }
                ptrace_ok(PTRACE_SETOPTIONS, child, options as *mut c_void)?; continue_tracee(child)?;
                continue_tracee(waited)?;
            } else if pending_children.insert(child, PendingChild { parent_key, parent_pid: waited }).is_some() { kill_group(root); return Err("HOLD_LINUX_LIFECYCLE"); }
        } else if event == PTRACE_EVENT_EXIT {
            continue_tracee(waited)?;
        } else if event == PTRACE_EVENT_EXEC {
            let mut former_tid: c_ulong = 0; ptrace_ok(PTRACE_GETEVENTMSG, waited, (&mut former_tid as *mut c_ulong).cast::<c_void>())?;
            let entry = tracees.get(&waited).ok_or("HOLD_LINUX_UNMATCHED_TRACE")?; let (tgid, ppid) = identity(waited)?;
            if former_tid as Pid != waited || !entry.leader || tgid != entry.tgid || (entry.parent_pid != 0 && ppid != entry.parent_pid) { kill_group(root); return Err("HOLD_LINUX_TGID"); }
            continue_tracee(waited)?;
        } else { kill_group(root); return Err("HOLD_LINUX_UNKNOWN_STOP"); }
    }
    if root_exit != Some((0, "exit")) || !pending_children.is_empty() || !early_child_stops.is_empty() || tracees.values().any(|entry| !entry.ended) || creates != exits { return Err("HOLD_LINUX_RECONCILIATION"); }
    if metadata(stdout_path).map_err(|_| "HOLD_LINUX_OUTPUT")?.len() > 1024 * 1024 || metadata(stderr_path).map_err(|_| "HOLD_LINUX_OUTPUT")?.len() > 1024 * 1024 { return Err("HOLD_LINUX_OUTPUT_LIMIT"); }
    let mut digest_events = events.clone();
    digest_events.sort_by(|left, right| left.process_key.cmp(&right.process_key).then(left.kind.cmp(right.kind)).then(left.tick.cmp(&right.tick)));
    let digest_input = digest_events.iter().map(|event| format!("{}\0{}\0{}\0{}\0{}\0{}\0{}\0{}\0{}", event.kind, event.process_key, event.parent_process_key.as_deref().unwrap_or(""), event.pid, event.parent_pid, event.tick, event.peak_rss_kib.unwrap_or(0), event.termination_kind.unwrap_or(""), event.termination_code.unwrap_or(-1))).collect::<Vec<_>>().join("\0");
    let result = ObserverResult { platform: "linux", mechanism: "linux-ptrace-wait4-v1", clock_kind: "monotonic-raw", clock_frequency: "1000000000".to_string(), native_create_events: creates, native_exit_events: exits, secondary_create_events: creates, secondary_exit_events: exits, retained_handle_rows: creates, terminal_state: "reconciled", root_termination_kind: "exit", root_exit_code: 0, observer_digest: sha256_hex(digest_input.as_bytes()), events };
    write_result(event_path, &result)
}

#[cfg(target_os = "linux")]
fn sha256_hex(bytes: &[u8]) -> String {
    const H0: [u32; 8] = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const K: [u32; 64] = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    let mut input = bytes.to_vec(); input.push(0x80); while input.len() % 64 != 56 { input.push(0); } input.extend_from_slice(&((bytes.len() as u64).wrapping_mul(8)).to_be_bytes());
    let mut state = H0;
    for block in input.chunks_exact(64) {
        let mut w = [0u32; 64]; for (i, chunk) in block.chunks_exact(4).enumerate() { w[i] = u32::from_be_bytes(chunk.try_into().unwrap_or([0; 4])); }
        for i in 16..64 { let s0 = w[i-15].rotate_right(7)^w[i-15].rotate_right(18)^(w[i-15]>>3); let s1 = w[i-2].rotate_right(17)^w[i-2].rotate_right(19)^(w[i-2]>>10); w[i] = w[i-16].wrapping_add(s0).wrapping_add(w[i-7]).wrapping_add(s1); }
        let [mut a,mut b,mut c,mut d,mut e,mut f,mut g,mut h] = state;
        for i in 0..64 { let s1=e.rotate_right(6)^e.rotate_right(11)^e.rotate_right(25); let ch=(e&f)^((!e)&g); let t1=h.wrapping_add(s1).wrapping_add(ch).wrapping_add(K[i]).wrapping_add(w[i]); let s0=a.rotate_right(2)^a.rotate_right(13)^a.rotate_right(22); let maj=(a&b)^(a&c)^(b&c); let t2=s0.wrapping_add(maj); h=g;g=f;f=e;e=d.wrapping_add(t1);d=c;c=b;b=a;a=t1.wrapping_add(t2); }
        state[0]=state[0].wrapping_add(a);state[1]=state[1].wrapping_add(b);state[2]=state[2].wrapping_add(c);state[3]=state[3].wrapping_add(d);state[4]=state[4].wrapping_add(e);state[5]=state[5].wrapping_add(f);state[6]=state[6].wrapping_add(g);state[7]=state[7].wrapping_add(h);
    }
    state.iter().map(|word| format!("{word:08x}")).collect()
}

#[cfg(all(test, target_os = "linux"))]
mod tests {
    #[test]
    fn sha256_known_answer_abc() {
        assert_eq!(super::sha256_hex(b"abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }
}

#[cfg(not(target_os = "linux"))]
pub fn observe(_: &Path, _: &Path, _: &Path, _: &str, _: &[String]) -> Result<(), &'static str> { Err("HOLD_NATIVE_PLATFORM_UNAVAILABLE") }
