#[cfg(not(debug_assertions))]
compile_error!("recovery-evidence is test-only and must not be compiled into an optimized build");

#[path = "../recovery_support.rs"]
mod recovery_support;

use std::io::Write;

use recovery_support::{
    parse_arguments, verify_common_inputs, write_exclusive_synced, RecoveryArguments,
    CANDIDATE_BYTES,
};

fn arm_and_stop(arguments: &RecoveryArguments) -> ! {
    if let Err(code) = write_exclusive_synced(&arguments.arm_path(), &arguments.arm_bytes()) {
        eprintln!("REFUSED:{code}");
        std::process::exit(74);
    }
    println!("ARMED_FOR_OPERATOR_ACTION:{}", arguments.boundary);
    if std::io::stdout().flush().is_err() {
        std::process::exit(75);
    }
    if arguments.execution == "test-only" {
        std::process::exit(0);
    }
    loop {
        std::thread::park();
    }
}

fn run_live(arguments: &RecoveryArguments) -> Result<(), &'static str> {
    #[cfg(windows)]
    {
        use galerina_registry_durability_native::publish_windows_generation_fault_candidate;
        let _ = publish_windows_generation_fault_candidate(
            &arguments.target,
            &arguments.candidate_id,
            CANDIDATE_BYTES,
            |boundary| {
                if boundary == arguments.boundary {
                    arm_and_stop(arguments);
                }
            },
        );
        Err("RECOVERY_BOUNDARY_UNREACHED")
    }
    #[cfg(target_os = "linux")]
    {
        use galerina_registry_durability_native::publish_linux_generation_fault_candidate;
        let _ = publish_linux_generation_fault_candidate(
            &arguments.target,
            &arguments.candidate_id,
            CANDIDATE_BYTES,
            |boundary| {
                if boundary == arguments.boundary {
                    arm_and_stop(arguments);
                }
            },
        );
        Err("RECOVERY_BOUNDARY_UNREACHED")
    }
    #[cfg(target_os = "macos")]
    {
        use galerina_registry_durability_native::publish_macos_generation_fault_candidate;
        let _ = publish_macos_generation_fault_candidate(
            &arguments.target,
            &arguments.candidate_id,
            CANDIDATE_BYTES,
            |boundary| {
                if boundary == arguments.boundary {
                    arm_and_stop(arguments);
                }
            },
        );
        Err("RECOVERY_BOUNDARY_UNREACHED")
    }
    #[cfg(not(any(windows, target_os = "linux", target_os = "macos")))]
    {
        let _ = arguments;
        Err("RECOVERY_PLATFORM_UNAVAILABLE")
    }
}

fn execute() -> Result<(), &'static str> {
    let arguments = parse_arguments()?;
    verify_common_inputs(&arguments)?;
    if arguments.arm_path().exists() || arguments.result_path().exists() {
        return Err("RECOVERY_REPLAY_REFUSED");
    }
    if arguments.execution == "test-only" {
        arm_and_stop(&arguments);
    }
    run_live(&arguments)
}

fn main() {
    if let Err(code) = execute() {
        eprintln!("REFUSED:{code}");
        std::process::exit(1);
    }
}
