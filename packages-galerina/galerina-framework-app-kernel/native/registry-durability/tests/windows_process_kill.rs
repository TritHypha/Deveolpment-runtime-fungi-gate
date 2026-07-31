#![cfg(all(windows, feature = "fault-injection"))]

use std::fs;
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::time::{SystemTime, UNIX_EPOCH};

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

#[test]
fn terminating_each_publication_boundary_leaves_prior_and_never_partial_candidate() {
    for boundary in BOUNDARIES {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock must be available for a disposable kill path")
            .as_nanos();
        let root = std::env::temp_dir().join(format!(
            "galerina-registry-kill-{}-{boundary}-{nonce}",
            std::process::id(),
        ));
        fs::create_dir(&root).expect("disposable process-kill directory");

        let prior_id = "a".repeat(64);
        let candidate_id = "b".repeat(64);
        let prior_bytes = br#"{"schema":"galerina.registry.generation.v1","prior":true}"#;
        let prior_path = root.join(format!("registry-generation-{prior_id}.json"));
        let candidate_path = root.join(format!("registry-generation-{candidate_id}.json"));
        fs::write(&prior_path, prior_bytes).expect("disposable prior generation");

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
        assert!(read > 0, "fault worker exited before boundary '{boundary}'");
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
