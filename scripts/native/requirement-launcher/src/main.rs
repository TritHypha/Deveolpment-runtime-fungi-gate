mod protocol;

use std::io::{self, Read, Write};
use std::path::PathBuf;

use protocol::{decode_request, refusal_frame, MAX_FRAME_BYTES};

const ZERO_NONCE: &str = "00000000000000000000000000000000";
const ZERO_DIGEST: &str = "0000000000000000000000000000000000000000000000000000000000000000";

fn refuse(code: &str, nonce: &str, request_digest: &str) -> ! {
    let frame = refusal_frame(nonce, code, request_digest);
    let _ = io::stdout().write_all(&frame);
    let _ = io::stdout().flush();
    eprintln!("UNIT4_REFUSED:{code}");
    std::process::exit(1);
}

fn validate_mode() {
    let arguments: Vec<_> = std::env::args_os().skip(1).collect();
    if arguments.is_empty() {
        return;
    }

    #[cfg(test_contract)]
    if arguments.len() == 1 && arguments[0] == "--decode-only" {
        return;
    }

    if arguments.len() == 2 && arguments[0] == "--registry" {
        let registry = PathBuf::from(&arguments[1]);
        if !registry.is_absolute() {
            refuse("REGISTRY_PATH", ZERO_NONCE, ZERO_DIGEST);
        }
        // Registry admission is deliberately absent in the Task 3 skeleton.
        // Task 5 binds and verifies the file before any worker can exist.
        return;
    }

    refuse("MODE_NOT_ADMITTED", ZERO_NONCE, ZERO_DIGEST);
}

fn main() {
    if !cfg!(all(target_os = "windows", target_arch = "x86_64")) {
        refuse("PLATFORM_NOT_ADMITTED", ZERO_NONCE, ZERO_DIGEST);
    }

    validate_mode();

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
        Ok(request) => refuse(
            "WORKER_NOT_ADMITTED",
            &request.nonce,
            &request.request_digest,
        ),
        Err(error) => refuse(error.code, ZERO_NONCE, ZERO_DIGEST),
    }
}
