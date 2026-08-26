#![cfg(all(target_os = "macos", feature = "fault-injection"))]

use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio};
use std::time::{SystemTime, UNIX_EPOCH};

use galerina_registry_durability_native::{
    publish_macos_generation_candidate, publish_macos_generation_fault_candidate,
    MacosGenerationPublicationVerdict, PUBLICATION_BOUNDARY_IDS,
};

const CANDIDATE_BYTES: &[u8] = br#"{"schema":"galerina.registry.generation.v1","candidate":true}"#;

#[test]
fn macos_fault_worker() {
    let Some(root) = std::env::var_os("GALERINA_MACOS_FAULT_WORKER_ROOT") else {
        return;
    };
    let generation_id = std::env::var("GALERINA_MACOS_FAULT_WORKER_GENERATION")
        .expect("worker generation identity");
    let stop_boundary =
        std::env::var("GALERINA_MACOS_FAULT_WORKER_BOUNDARY").expect("worker boundary");
    let verdict = publish_macos_generation_fault_candidate(
        std::path::Path::new(&root),
        &generation_id,
        CANDIDATE_BYTES,
        |boundary| {
            if boundary == stop_boundary {
                println!("BOUNDARY:{boundary}");
                std::io::stdout().flush().expect("worker marker flush");
                loop {
                    std::thread::park();
                }
            }
        },
    );
    panic!("worker did not stop at requested boundary: {verdict:?}");
}

#[test]
#[ignore = "requires an owner-operated Apple-silicon local-APFS evidence host"]
fn terminating_each_publication_boundary_leaves_prior_and_never_partial_candidate() {
    for boundary in PUBLICATION_BOUNDARY_IDS {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock must be available for a disposable kill path")
            .as_nanos();
        let root = std::env::temp_dir().join(format!(
            "galerina-macos-kill-{}-{boundary}-{nonce}",
            std::process::id(),
        ));
        fs::create_dir(&root).expect("disposable process-kill directory");

        let prior_id = "a".repeat(64);
        let candidate_id = "b".repeat(64);
        let prior_bytes = br#"{"schema":"galerina.registry.generation.v1","prior":true}"#;
        assert!(matches!(
            publish_macos_generation_candidate(&root, &prior_id, prior_bytes),
            MacosGenerationPublicationVerdict::Candidate { .. }
        ));
        let prior_path = root.join(format!("registry-generation-{prior_id}.json"));
        let candidate_path = root.join(format!("registry-generation-{candidate_id}.json"));

        let mut child = Command::new(std::env::current_exe().expect("current test executable"))
            .arg("--exact")
            .arg("macos_fault_worker")
            .arg("--nocapture")
            .env("GALERINA_MACOS_FAULT_WORKER_ROOT", &root)
            .env("GALERINA_MACOS_FAULT_WORKER_GENERATION", &candidate_id)
            .env("GALERINA_MACOS_FAULT_WORKER_BOUNDARY", boundary)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .expect("fault worker must start");
        let stdout = child.stdout.take().expect("fault worker stdout");
        let mut reader = BufReader::new(stdout);
        let marker = loop {
            let mut line = String::new();
            let read = reader.read_line(&mut line).expect("fault worker output");
            assert!(read > 0, "worker exited before boundary '{boundary}'");
            if line.trim() == format!("BOUNDARY:{boundary}") {
                break line;
            }
        };
        assert_eq!(marker.trim(), format!("BOUNDARY:{boundary}"));
        child.kill().expect("fault worker termination");
        let status = child.wait().expect("terminated worker wait");
        assert!(
            !status.success(),
            "terminated worker must not report success"
        );

        assert_eq!(
            fs::read(&prior_path).expect("prior generation remains readable"),
            prior_bytes,
            "prior generation changed at boundary '{boundary}'",
        );
        if matches!(
            boundary,
            "published" | "reopened-verified" | "directory-flushed"
        ) {
            assert_eq!(
                fs::read(&candidate_path).expect("candidate remains readable"),
                CANDIDATE_BYTES,
                "post-publication candidate is not exact at boundary '{boundary}'",
            );
        } else {
            assert!(
                !candidate_path.exists(),
                "candidate became addressable before publication at boundary '{boundary}'",
            );
        }
        fs::remove_dir_all(&root).expect("disposable process-kill cleanup");
    }
}
