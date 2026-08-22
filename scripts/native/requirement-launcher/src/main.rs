#[cfg(windows)]
mod identity;
mod protocol;
#[cfg(windows)]
mod windows;

use std::io::{self, Read, Write};
use std::path::PathBuf;

use protocol::{
    decode_request, refusal_frame, refusal_frame_with_evidence, ReceiptEvidence, MAX_FRAME_BYTES,
};

const ZERO_NONCE: &str = "00000000000000000000000000000000";
const ZERO_DIGEST: &str = "0000000000000000000000000000000000000000000000000000000000000000";

fn refuse(code: &str, nonce: &str, request_digest: &str) -> ! {
    let frame = refusal_frame(nonce, code, request_digest);
    let _ = io::stdout().write_all(&frame);
    let _ = io::stdout().flush();
    eprintln!("UNIT4_REFUSED:{code}");
    std::process::exit(1);
}

enum Mode {
    NoRegistry,
    #[cfg(test_contract)]
    DecodeOnly,
    Registry(PathBuf),
}

fn validate_mode() -> Mode {
    let arguments: Vec<_> = std::env::args_os().skip(1).collect();
    if arguments.is_empty() {
        return Mode::NoRegistry;
    }

    #[cfg(test_contract)]
    if arguments.len() == 1 && arguments[0] == "--decode-only" {
        return Mode::DecodeOnly;
    }

    if arguments.len() == 2 && arguments[0] == "--registry" {
        let registry = PathBuf::from(&arguments[1]);
        if !registry.is_absolute() {
            refuse("REGISTRY_PATH", ZERO_NONCE, ZERO_DIGEST);
        }
        return Mode::Registry(registry);
    }

    refuse("MODE_NOT_ADMITTED", ZERO_NONCE, ZERO_DIGEST);
}

#[cfg(windows)]
fn execute_registry(mode: Mode, request: protocol::RequestEvidence) -> ! {
    let registry = match mode {
        Mode::Registry(path) => path,
        _ => refuse(
            "WORKER_NOT_ADMITTED",
            &request.nonce,
            &request.request_digest,
        ),
    };
    let package = match identity::verify_registry(&registry) {
        Ok(package) => package,
        Err(error) => refuse(error.code, &request.nonce, &request.request_digest),
    };
    let (mut environment, environment_digest) =
        match windows::environment_block(&package.environment, &request.nonce) {
            Ok(value) => value,
            Err(code) => refuse(code, &request.nonce, &request.request_digest),
        };
    let evidence = || ReceiptEvidence {
        launcher_digest: &package.launcher.digest,
        runtime_digest: &package.runtime.digest,
        worker_digest: &package.worker.digest,
        environment_policy_digest: &environment_digest,
        scalar_profile_digest: &package.scalar_profile_digest,
    };
    let worker_mode = if request.flow_locator.ends_with("/timeout") {
        "timeout"
    } else if request.flow_locator.ends_with("/extra-child") {
        "extra-child"
    } else {
        "sentinel"
    };
    let mut worker = match windows::create_suspended_worker(
        &package.runtime.path,
        &package.worker.path,
        &package.package_root,
        &mut environment,
        worker_mode,
    ) {
        Ok(worker) => worker,
        Err(code) => refuse(code, &request.nonce, &request.request_digest),
    };
    if let Err(code) = windows::verify_process_image(&worker, &package.runtime.path) {
        refuse(code, &request.nonce, &request.request_digest);
    }
    if let Err(code) = windows::resume_worker(&mut worker) {
        refuse(code, &request.nonce, &request.request_digest);
    }
    let outcome = match windows::wait_owned_worker(&mut worker, package.timeout_ms) {
        Ok(outcome) => outcome,
        Err(code) => refuse(code, &request.nonce, &request.request_digest),
    };
    let code = if outcome.timed_out {
        "WORKER_TIMEOUT"
    } else if worker_mode == "extra-child" && outcome.exit_code == 88 {
        "CHILD_ESCAPE"
    } else if worker_mode == "extra-child" {
        "CHILD_BLOCKED"
    } else if outcome.exit_code == 86 {
        "SENTINEL_REFUSED"
    } else {
        "WORKER_EXIT"
    };
    let frame = refusal_frame_with_evidence(
        &request.nonce,
        code,
        &request.request_digest,
        Some(evidence()),
        outcome.timed_out,
    );
    let _ = io::stdout().write_all(&frame);
    let _ = io::stdout().flush();
    eprintln!("UNIT4_REFUSED:{code}");
    std::process::exit(1);
}

fn main() {
    if !cfg!(all(target_os = "windows", target_arch = "x86_64")) {
        refuse("PLATFORM_NOT_ADMITTED", ZERO_NONCE, ZERO_DIGEST);
    }

    let mode = validate_mode();

    let mut input = Vec::new();
    match io::stdin()
        .take((MAX_FRAME_BYTES + 9) as u64)
        .read_to_end(&mut input)
    {
        Ok(_) if input.len() <= MAX_FRAME_BYTES + 8 => {}
        Ok(_) => refuse("FRAME_BOUND", ZERO_NONCE, ZERO_DIGEST),
        Err(_) => refuse("STDIN_READ", ZERO_NONCE, ZERO_DIGEST),
    }

    match decode_request(&input) {
        #[cfg(windows)]
        Ok(request) => execute_registry(mode, request),
        #[cfg(not(windows))]
        Ok(request) => refuse(
            "UNSUPPORTED_PLATFORM",
            &request.nonce,
            &request.request_digest,
        ),
        Err(error) => refuse(error.code, ZERO_NONCE, ZERO_DIGEST),
    }
}
