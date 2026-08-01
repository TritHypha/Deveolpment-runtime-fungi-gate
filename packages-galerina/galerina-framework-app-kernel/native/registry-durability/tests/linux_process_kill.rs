#![cfg(all(target_os = "linux", feature = "fault-injection"))]

use std::fs;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};

use galerina_registry_durability_native::{
    publish_linux_generation_candidate, LinuxGenerationPublicationVerdict,
};

const CANDIDATE_BYTES: &[u8] = br#"{"schema":"galerina.registry.generation.v1","candidate":true}"#;
const BOUNDARIES: [&str; 7] = [
    "stage-opened",
    "bytes-written",
    "file-flushed",
    "stage-closed",
    "published",
    "reopened-verified",
    "directory-flushed",
];

fn evidence_root() -> PathBuf {
    PathBuf::from(
        std::env::var_os("GALERINA_LINUX_EVIDENCE_DIRECTORY")
            .expect("named bare-host evidence directory is required"),
    )
}

#[test]
#[ignore = "requires the named Ubuntu bare-host evidence directory"]
fn terminating_each_linux_boundary_never_exposes_partial_authority() {
    for boundary in BOUNDARIES {
        let root = evidence_root().join(format!(
            ".galerina-linux-kill-{}-{boundary}",
            std::process::id()
        ));
        fs::create_dir(&root).expect("disposable process-kill directory");
        let prior_id = "a".repeat(64);
        let candidate_id = "b".repeat(64);
        let prior_bytes = br#"{"schema":"galerina.registry.generation.v1","prior":true}"#;
        assert!(matches!(
            publish_linux_generation_candidate(&root, &prior_id, prior_bytes),
            LinuxGenerationPublicationVerdict::Candidate { .. }
        ));
        let prior_path = root.join(format!("registry-generation-{prior_id}.json"));
        let candidate_path = root.join(format!("registry-generation-{candidate_id}.json"));

        let mut child = Command::new(env!("CARGO_BIN_EXE_registry-durability-fault-worker"))
            .arg(&root)
            .arg(&candidate_id)
            .arg(boundary)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .expect("fault worker must start");
        let stdout = child.stdout.take().expect("fault worker stdout");
        let mut reader = BufReader::new(stdout);
        let mut marker = String::new();
        let read = reader
            .read_line(&mut marker)
            .expect("fault worker marker read");
        assert!(read > 0, "worker exited before '{boundary}'");
        assert_eq!(marker.trim(), format!("BOUNDARY:{boundary}"));
        child.kill().expect("fault worker termination");
        assert!(!child.wait().expect("worker wait").success());

        assert_eq!(fs::read(&prior_path).expect("prior exact"), prior_bytes);
        if matches!(
            boundary,
            "published" | "reopened-verified" | "directory-flushed"
        ) {
            assert_eq!(
                fs::read(&candidate_path).expect("candidate exact"),
                CANDIDATE_BYTES
            );
        } else {
            assert!(
                !candidate_path.exists(),
                "premature candidate at '{boundary}'"
            );
        }
        fs::remove_dir_all(root).expect("disposable process-kill cleanup");
    }
}
