#[cfg(windows)]
mod identity;
mod protocol;
#[cfg(windows)]
mod windows;

use std::io::{self, Read, Write};
use std::path::PathBuf;

use protocol::{
    decode_request, decode_worker_ready, decode_worker_result, refusal_frame, sha256_hex,
    terminal_frame_with_evidence, worker_execution_frame, ReceiptEvidence, MAX_FRAME_BYTES,
};

const ZERO_NONCE: &str = "00000000000000000000000000000000";
const ZERO_DIGEST: &str = "0000000000000000000000000000000000000000000000000000000000000000";
const NO_MISSING_EVIDENCE: [&str; 0] = [];
const MISSING_RESULT_EVIDENCE: [&str; 3] =
    ["evidence/audit", "evidence/response", "evidence/value"];

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
    let operation_started = windows::monotonic_millis();
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
    let operation_deadline = operation_started.saturating_add(package.timeout_ms as u64);
    let process_owner_digest = windows::process_owner_digest();
    let (mut environment, environment_digest) =
        match windows::environment_block(&package.environment, &request.nonce) {
            Ok(value) => value,
            Err(code) => refuse(code, &request.nonce, &request.request_digest),
        };
    let scalar_flow = request.flow_locator == "rd0858/unit4/scalar-oracle";
    if scalar_flow && request.flow_digest != package.checked_artifact.digest {
        refuse(
            "CHECKED_ARTIFACT_DIGEST",
            &request.nonce,
            &request.request_digest,
        );
    }
    let worker_mode = if request.flow_locator == "rd0858/unit4/bootstrap-probe" {
        "bootstrap-probe"
    } else if scalar_flow {
        "scalar-oracle"
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
    if package.checked_artifact.verify_retained().is_err()
        || sha256_hex(&package.checked_artifact_bytes) != package.checked_artifact.digest
    {
        refuse(
            "CHECKED_ARTIFACT_CHANGED",
            &request.nonce,
            &request.request_digest,
        );
    }
    let mut worker_result = None;
    if worker_mode == "bootstrap-probe" || worker_mode == "scalar-oracle" {
        let exchange_request = if scalar_flow {
            match worker_execution_frame(
                &request.nonce,
                &package.checked_artifact.digest,
                &package.checked_artifact_bytes,
                &request.request_digest,
                request_frame,
            ) {
                Ok(frame) => frame,
                Err(error) => refuse(error.code, &request.nonce, &request.request_digest),
            }
        } else {
            request_frame.to_vec()
        };
        let exchange = match windows::exchange_worker(
            &mut worker,
            &exchange_request,
            operation_deadline,
            |ready_frame| {
                let ready = decode_worker_ready(ready_frame).map_err(|error| error.code)?;
                if ready.nonce != request.nonce
                    || ready.worker_digest != package.worker.digest
                    || ready.runtime_digest != package.runtime.digest
                {
                    return Err("WORKER_READY_IDENTITY");
                }
                Ok(ready)
            },
        ) {
            Ok(exchange) => exchange,
            Err(code) => {
                windows::kill_owned_tree(&mut worker);
                let terminal_code = if scalar_flow && code != "WORKER_TIMEOUT" {
                    "WORKER_CRASH"
                } else {
                    code
                };
                let terminal_state =
                    if terminal_code == "WORKER_TIMEOUT" || terminal_code == "WORKER_CRASH" {
                        "ERROR"
                    } else {
                        "REFUSED"
                    };
                let frame = terminal_frame_with_evidence(
                    &request.nonce,
                    terminal_code,
                    &request.request_digest,
                    Some(ReceiptEvidence {
                        launcher_digest: &package.launcher.digest,
                        process_owner_digest: &process_owner_digest,
                        runtime_digest: &package.runtime.digest,
                        worker_digest: &package.worker.digest,
                        registry_digest: &package.registry_digest,
                        environment_policy_digest: &environment_digest,
                        scalar_profile_digest: &package.scalar_profile_digest,
                        subject_digest: &request.subject_digest,
                        flow_digest: &request.flow_digest,
                        argument_digest: &request.argument_digest,
                        response_digest: ZERO_DIGEST,
                        value_digest: ZERO_DIGEST,
                        audit_digest: ZERO_DIGEST,
                        monotonic_duration_ms: windows::monotonic_millis()
                            .saturating_sub(operation_started)
                            .min(u32::MAX as u64)
                            as u32,
                        execution_state: terminal_state,
                        exit_code: windows::TERMINATION_EXIT,
                        missing_evidence: &MISSING_RESULT_EVIDENCE,
                    }),
                    terminal_code == "WORKER_TIMEOUT",
                    scalar_flow && terminal_code == "WORKER_CRASH",
                );
                let _ = io::stdout().write_all(&frame);
                let _ = io::stdout().flush();
                eprintln!("UNIT4_TERMINAL:{terminal_code}");
                std::process::exit(1);
            }
        };
        let ready = exchange.ready;
        let result = match decode_worker_result(&exchange.result_frame) {
            Ok(result) => result,
            Err(error) => {
                if !scalar_flow {
                    refuse(error.code, &request.nonce, &request.request_digest);
                }
                windows::kill_owned_tree(&mut worker);
                let frame = terminal_frame_with_evidence(
                    &request.nonce,
                    "WORKER_CRASH",
                    &request.request_digest,
                    Some(ReceiptEvidence {
                        launcher_digest: &package.launcher.digest,
                        process_owner_digest: &process_owner_digest,
                        runtime_digest: &package.runtime.digest,
                        worker_digest: &package.worker.digest,
                        registry_digest: &package.registry_digest,
                        environment_policy_digest: &environment_digest,
                        scalar_profile_digest: &package.scalar_profile_digest,
                        subject_digest: &request.subject_digest,
                        flow_digest: &request.flow_digest,
                        argument_digest: &request.argument_digest,
                        response_digest: ZERO_DIGEST,
                        value_digest: ZERO_DIGEST,
                        audit_digest: ZERO_DIGEST,
                        monotonic_duration_ms: windows::monotonic_millis()
                            .saturating_sub(operation_started)
                            .min(u32::MAX as u64)
                            as u32,
                        execution_state: "ERROR",
                        exit_code: windows::TERMINATION_EXIT,
                        missing_evidence: &MISSING_RESULT_EVIDENCE,
                    }),
                    false,
                    true,
                );
                let _ = io::stdout().write_all(&frame);
                let _ = io::stdout().flush();
                eprintln!("UNIT4_TERMINAL:WORKER_CRASH");
                std::process::exit(1);
            }
        };
        if result.nonce != request.nonce
            || result.bootstrap_control_digest != ready.bootstrap_control_digest
            || result.flow_digest != request.flow_digest
            || result.subject_digest != request.subject_digest
        {
            refuse(
                "WORKER_RESULT_IDENTITY",
                &request.nonce,
                &request.request_digest,
            );
        }
        if (scalar_flow && result.operation != "scalar-oracle")
            || (!scalar_flow && result.operation != "bootstrap-probe")
        {
            refuse(
                "WORKER_RESULT_IDENTITY",
                &request.nonce,
                &request.request_digest,
            );
        }
        if !scalar_flow && result.execution_state != "REFUSED" {
            refuse(
                "WORKER_ERROR_STATE",
                &request.nonce,
                &request.request_digest,
            );
        }
        if scalar_flow
            && ((result.execution_state == "COMPLETE" && result.decision.is_none())
                || (result.execution_state != "COMPLETE" && result.decision.is_some()))
        {
            refuse(
                "WORKER_ERROR_STATE",
                &request.nonce,
                &request.request_digest,
            );
        }
        worker_result = Some(result);
    }
    let outcome = match windows::wait_owned_worker(&mut worker, operation_deadline) {
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
    let missing_evidence = if worker_result.is_some() {
        NO_MISSING_EVIDENCE.as_slice()
    } else {
        MISSING_RESULT_EVIDENCE.as_slice()
    };
    let execution_state = if outcome.timed_out {
        "ERROR"
    } else {
        worker_result
            .as_ref()
            .map_or("REFUSED", |value| value.execution_state.as_str())
    };
    let frame = terminal_frame_with_evidence(
        &request.nonce,
        code,
        &request.request_digest,
        Some(ReceiptEvidence {
            launcher_digest: &package.launcher.digest,
            process_owner_digest: &process_owner_digest,
            runtime_digest: &package.runtime.digest,
            worker_digest: &package.worker.digest,
            registry_digest: &package.registry_digest,
            environment_policy_digest: &environment_digest,
            scalar_profile_digest: &package.scalar_profile_digest,
            subject_digest: &request.subject_digest,
            flow_digest: &request.flow_digest,
            argument_digest: &request.argument_digest,
            response_digest,
            value_digest,
            audit_digest,
            monotonic_duration_ms: windows::monotonic_millis()
                .saturating_sub(operation_started)
                .min(u32::MAX as u64) as u32,
            execution_state,
            exit_code: outcome.exit_code,
            missing_evidence,
        }),
        outcome.timed_out,
        false,
    );
    let _ = io::stdout().write_all(&frame);
    let _ = io::stdout().flush();
    if execution_state == "COMPLETE" && code == "NONE" {
        eprintln!("UNIT4_COMPLETE:NONE");
        std::process::exit(0);
    }
    eprintln!("UNIT4_TERMINAL:{code}");
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
