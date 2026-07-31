#[cfg(windows)]
fn main() {
    use std::io::Write;
    use std::path::PathBuf;

    use galerina_registry_durability_native::publish_windows_generation_fault_candidate;

    let arguments = std::env::args_os().skip(1).collect::<Vec<_>>();
    if arguments.len() != 3 {
        std::process::exit(64);
    }
    let directory = PathBuf::from(&arguments[0]);
    let generation_id = match arguments[1].to_str() {
        Some(value) => value.to_owned(),
        None => std::process::exit(65),
    };
    let stop_boundary = match arguments[2].to_str() {
        Some(value) => value.to_owned(),
        None => std::process::exit(66),
    };
    let bytes = br#"{"schema":"galerina.registry.generation.v1","candidate":true}"#;
    let _ =
        publish_windows_generation_fault_candidate(&directory, &generation_id, bytes, |boundary| {
            if boundary == stop_boundary {
                println!("BOUNDARY:{boundary}");
                let _ = std::io::stdout().flush();
                loop {
                    std::thread::park();
                }
            }
        });
    std::process::exit(67);
}

#[cfg(not(windows))]
fn main() {
    std::process::exit(69);
}
