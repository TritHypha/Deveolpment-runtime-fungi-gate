#[cfg(not(debug_assertions))]
compile_error!("recovery-evidence is test-only and must not be compiled into an optimized build");

#[path = "../recovery_support.rs"]
mod recovery_support;

use std::fs;

use galerina_registry_durability_native::sha256;
use recovery_support::{
    parse_arguments, read_stable_direct, selected_checkpoint, verify_common_inputs,
    write_exclusive_synced, MAX_GENERATION_BYTES,
};

fn candidate_digest(
    arguments: &recovery_support::RecoveryArguments,
) -> Result<Option<String>, &'static str> {
    match read_stable_direct(&arguments.candidate_path(), MAX_GENERATION_BYTES) {
        Ok(bytes) => Ok(Some(sha256(&bytes))),
        Err("RECOVERY_FILE_UNAVAILABLE") => {
            match fs::symlink_metadata(arguments.candidate_path()) {
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
                _ => Err("RECOVERY_CANDIDATE_REFUSED"),
            }
        }
        Err(_) => Err("RECOVERY_CANDIDATE_REFUSED"),
    }
}

fn execute() -> Result<(), &'static str> {
    let arguments = parse_arguments()?;
    verify_common_inputs(&arguments)?;
    let arm = read_stable_direct(&arguments.arm_path(), 4096)?;
    if arm != arguments.arm_bytes() {
        return Err("RECOVERY_ARM_REFUSED");
    }
    let checkpoint = selected_checkpoint(&arguments)?;
    let candidate = candidate_digest(&arguments)?;
    let outcome = match (checkpoint.as_str(), candidate) {
        ("PRIOR", None) => "PRIOR",
        ("PRIOR", Some(digest)) if digest == arguments.candidate_digest => "PRIOR",
        ("CANDIDATE", Some(digest)) if digest == arguments.candidate_digest => "CANDIDATE",
        _ => return Err("RECOVERY_OLD_OR_NEW_REFUSED"),
    };
    let arm_digest = sha256(&arm);
    let result = arguments.result_bytes(&arm_digest, outcome);
    write_exclusive_synced(&arguments.result_path(), &result)?;
    print!("{}", String::from_utf8_lossy(&result));
    Ok(())
}

fn main() {
    if let Err(code) = execute() {
        eprintln!("REFUSED:{code}");
        std::process::exit(1);
    }
}
