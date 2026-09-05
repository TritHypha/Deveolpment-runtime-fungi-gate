#![deny(unsafe_op_in_unsafe_fn)]

mod linux;
mod protocol;
mod windows;

use std::env;
use std::path::PathBuf;

fn fail(code: &str) -> ! {
    eprintln!("{code}");
    std::process::exit(2);
}

fn parse_args() -> Result<(PathBuf, PathBuf, PathBuf, String, Vec<String>, String), &'static str> {
    let args: Vec<String> = env::args().skip(1).collect();
    if args.len() < 11 || args[0] != "--protocol" || args[1] != "galerina.process-tree-observer.v1"
        || args[2] != "--events" || args[4] != "--stdout" || args[6] != "--stderr" || args[8] != "--" {
        return Err("REFUSED_NATIVE_PROTOCOL");
    }
    let event_path = PathBuf::from(&args[3]);
    let stdout_path = PathBuf::from(&args[5]);
    let stderr_path = PathBuf::from(&args[7]);
    let executable = args[9].clone();
    if executable.is_empty() || args[10..].iter().any(|arg| arg.contains('\0')) {
        return Err("REFUSED_NATIVE_PROTOCOL");
    }
    if event_path.exists() || stdout_path.exists() || stderr_path.exists() {
        return Err("REFUSED_NATIVE_OUTPUT_PREEXISTS");
    }
    Ok((event_path, stdout_path, stderr_path, executable, args[10..].to_vec(), args[9].clone()))
}

fn main() {
    let (event_path, stdout_path, stderr_path, executable, stage_args, _duplicate) = match parse_args() {
        Ok(value) => value,
        Err(code) => fail(code),
    };
    let result = if cfg!(windows) {
        windows::observe(&event_path, &stdout_path, &stderr_path, &executable, &stage_args)
    } else if cfg!(target_os = "linux") {
        linux::observe(&event_path, &stdout_path, &stderr_path, &executable, &stage_args)
    } else {
        Err("HOLD_NATIVE_PLATFORM_UNAVAILABLE")
    };
    if let Err(code) = result { fail(code); }
}
