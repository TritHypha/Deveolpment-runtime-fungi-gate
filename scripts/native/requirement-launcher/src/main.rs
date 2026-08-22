#[cfg(windows)]
mod identity;
mod protocol;
#[cfg(windows)]
mod windows;

use std::io::{self, Read, Write};
use std::path::PathBuf;

use protocol::{
    decode_request, decode_worker_ready, decode_worker_result, refusal_frame,
    refusal_frame_with_evidence, ReceiptEvidence, MAX_FRAME_BYTES,
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
fn execute_registry(mode: Mode, request: protocol::RequestEvidence, request_frame: &[u8]) -> ! {
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
    let worker_mode = if request.flow_locator == "rd0858/unit4/bootstrap-probe" {
        "bootstrap-probe"
    } else if request.flow_locator.ends_with("/timeout") {
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
    let mut worker_result = None;
    let mut remaining_timeout = package.timeout_ms;
    if worker_mode == "bootstrap-probe" {
        let exchange =
            match windows::exchange_worker(&mut worker, request_frame, package.timeout_ms) {
                Ok(exchange) => exchange,
                Err(code) => {
                    windows::kill_owned_tree(&mut worker);
                    let frame = refusal_frame_with_evidence(
                        &request.nonce,
                        code,
                        &request.request_digest,
                        Some(ReceiptEvidence {
                            launcher_digest: &package.launcher.digest,
                            runtime_digest: &package.runtime.digest,
                            worker_digest: &package.worker.digest,
                            environment_policy_digest: &environment_digest,
                            scalar_profile_digest: &package.scalar_profile_digest,
                            subject_digest: &request.subject_digest,
                            flow_digest: &request.flow_digest,
                            argument_digest: &request.argument_digest,
                            response_digest: ZERO_DIGEST,
                            value_digest: ZERO_DIGEST,
                            audit_digest: ZERO_DIGEST,
                        }),
                        code == "WORKER_TIMEOUT",
                    );
                    let _ = io::stdout().write_all(&frame);
                    let _ = io::stdout().flush();
                    eprintln!("UNIT4_REFUSED:{code}");
                    std::process::exit(1);
                }
            };
        let ready = match decode_worker_ready(&exchange.ready_frame) {
            Ok(ready) => ready,
            Err(error) => refuse(error.code, &request.nonce, &request.request_digest),
        };
        if ready.nonce != request.nonce
            || ready.worker_digest != package.worker.digest
            || ready.runtime_digest != package.runtime.digest
        {
            refuse(
                "WORKER_READY_IDENTITY",
                &request.nonce,
                &request.request_digest,
            );
        }
        let result = match decode_worker_result(&exchange.result_frame) {
            Ok(result) => result,
            Err(error) => refuse(error.code, &request.nonce, &request.request_digest),
        };
        if result.nonce != request.nonce
            || result.bootstrap_control_digest != ready.bootstrap_control_digest
        {
            refuse(
                "WORKER_RESULT_IDENTITY",
                &request.nonce,
                &request.request_digest,
            );
        }
        if result.execution_state != "REFUSED" {
            refuse(
                "WORKER_ERROR_STATE",
                &request.nonce,
                &request.request_digest,
            );
        }
        remaining_timeout = package
            .timeout_ms
            .saturating_sub(exchange.elapsed_ms)
            .max(1);
        worker_result = Some(result);
    }
    let outcome = match windows::wait_owned_worker(&mut worker, remaining_timeout) {
        Ok(outcome) => outcome,
        Err(code) => refuse(code, &request.nonce, &request.request_digest),
    };
    let code = if outcome.timed_out {
        "WORKER_TIMEOUT"
    } else if let Some(result) = worker_result.as_ref() {
        result.refusal_code.as_str()
    } else if worker_mode == "extra-child" && outcome.exit_code == 88 {
        "CHILD_ESCAPE"
    } else if worker_mode == "extra-child" {
        "CHILD_BLOCKED"
    } else if outcome.exit_code == 86 {
        "SENTINEL_REFUSED"
    } else {
        "WORKER_EXIT"
    };
    let response_digest = worker_result
        .as_ref()
        .map_or(ZERO_DIGEST, |value| value.response_digest.as_str());
    let value_digest = worker_result
        .as_ref()
        .map_or(ZERO_DIGEST, |value| value.value_digest.as_str());
    let audit_digest = worker_result
        .as_ref()
        .map_or(ZERO_DIGEST, |value| value.audit_digest.as_str());
    let frame = refusal_frame_with_evidence(
        &request.nonce,
        code,
        &request.request_digest,
        Some(ReceiptEvidence {
            launcher_digest: &package.launcher.digest,
            runtime_digest: &package.runtime.digest,
            worker_digest: &package.worker.digest,
            environment_policy_digest: &environment_digest,
            scalar_profile_digest: &package.scalar_profile_digest,
            subject_digest: &request.subject_digest,
            flow_digest: &request.flow_digest,
            argument_digest: &request.argument_digest,
            response_digest,
            value_digest,
            audit_digest,
        }),
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
        Ok(request) => execute_registry(mode, request, &input),
        #[cfg(not(windows))]
        Ok(request) => refuse(
            "UNSUPPORTED_PLATFORM",
            &request.nonce,
            &request.request_digest,
        ),
        Err(error) => refuse(error.code, ZERO_NONCE, ZERO_DIGEST),
    }
}
