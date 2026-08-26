#![cfg(feature = "recovery-evidence")]

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use galerina_registry_durability_native::sha256;

const CANDIDATE_BYTES: &[u8] = br#"{"schema":"galerina.registry.generation.v1","candidate":true}"#;

struct Fixture {
    root: PathBuf,
    target: PathBuf,
    repository: PathBuf,
    home: PathBuf,
    system: PathBuf,
    experiment: String,
    prior_id: String,
    candidate_id: String,
    prior_digest: String,
    candidate_digest: String,
}

impl Fixture {
    fn new() -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("test clock")
            .as_nanos();
        let root = std::env::temp_dir().join(format!(
            "galerina-recovery-protocol-{}-{nonce}",
            std::process::id()
        ));
        let target = root.join("sacrificial");
        let repository = root.join("repository");
        let home = root.join("home");
        let system = root.join("system");
        for path in [&target, &repository, &home, &system] {
            fs::create_dir_all(path).expect("fixture directory");
        }
        let experiment = "e".repeat(64);
        let prior_id = "a".repeat(64);
        let candidate_id = "b".repeat(64);
        let prior_bytes = br#"{"schema":"galerina.registry.generation.v1","prior":true}"#;
        let prior_digest = sha256(prior_bytes);
        let candidate_digest = sha256(CANDIDATE_BYTES);
        fs::write(
            target.join(format!("registry-generation-{prior_id}.json")),
            prior_bytes,
        )
        .expect("prior generation");
        fs::write(
            target.join(".galerina-durability-sacrificial-v1"),
            format!(
                "GALERINA_DURABILITY_SACRIFICIAL_V1\nexperiment={experiment}\ndevice={}\n",
                "1".repeat(64)
            ),
        )
        .expect("sacrificial marker");
        fs::write(
            target.join("registry-durability-checkpoint-v1"),
            format!(
                "GALERINA_DURABILITY_CHECKPOINT_V1\nexperiment={experiment}\nselected={prior_id}\n"
            ),
        )
        .expect("prior checkpoint");
        Self {
            root,
            target,
            repository,
            home,
            system,
            experiment,
            prior_id,
            candidate_id,
            prior_digest,
            candidate_digest,
        }
    }

    fn base_args(&self, execution: &str) -> Vec<String> {
        vec![
            "--execution".into(),
            execution.into(),
            "--mode".into(),
            "controlled-reboot".into(),
            "--target".into(),
            self.target.display().to_string(),
            "--experiment-id".into(),
            self.experiment.clone(),
            "--boundary".into(),
            "stage-opened".into(),
            "--prior-id".into(),
            self.prior_id.clone(),
            "--candidate-id".into(),
            self.candidate_id.clone(),
            "--prior-digest".into(),
            self.prior_digest.clone(),
            "--candidate-digest".into(),
            self.candidate_digest.clone(),
            "--target-device-digest".into(),
            "1".repeat(64),
            "--repository-root".into(),
            self.repository.display().to_string(),
            "--home-root".into(),
            self.home.display().to_string(),
            "--system-root".into(),
            self.system.display().to_string(),
            "--repository-device-digest".into(),
            "2".repeat(64),
            "--home-device-digest".into(),
            "3".repeat(64),
            "--system-device-digest".into(),
            "4".repeat(64),
        ]
    }

    fn arm_path(&self) -> PathBuf {
        self.target
            .join(format!("registry-durability-arm-{}.json", self.experiment))
    }

    fn result_path(&self) -> PathBuf {
        self.target.join(format!(
            "registry-durability-result-{}.json",
            self.experiment
        ))
    }
}

impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.root);
    }
}

fn run(binary: &Path, args: &[String]) -> std::process::Output {
    Command::new(binary)
        .args(args)
        .output()
        .expect("recovery protocol binary")
}

#[test]
fn test_only_arm_is_canonical_and_verifies_prior_once() {
    let fixture = Fixture::new();
    let worker = Path::new(env!("CARGO_BIN_EXE_registry-durability-recovery-worker"));
    let verifier = Path::new(env!("CARGO_BIN_EXE_registry-durability-recovery-verifier"));
    let args = fixture.base_args("test-only");
    let armed = run(worker, &args);
    assert!(
        armed.status.success(),
        "{}",
        String::from_utf8_lossy(&armed.stderr)
    );
    let arm = fs::read_to_string(fixture.arm_path()).expect("arm record");
    assert!(arm.ends_with("}\n"));
    assert!(arm.contains("\"schema\": \"galerina.registry.durability.recovery-arm.v1\""));
    assert!(arm.contains("\"productionAuthorizing\": false"));

    let verified = run(verifier, &args);
    assert!(
        verified.status.success(),
        "{}",
        String::from_utf8_lossy(&verified.stderr)
    );
    let result = fs::read_to_string(fixture.result_path()).expect("result record");
    assert!(result.contains("\"outcome\": \"PRIOR\""));
    assert!(result.contains("\"schema\": \"galerina.registry.durability.recovery-result.v1\""));
    assert!(result.contains("\"productionAuthorizing\": false"));

    let replay = run(verifier, &args);
    assert!(!replay.status.success());
    assert!(String::from_utf8_lossy(&replay.stderr).contains("RECOVERY_RESULT_EXISTS"));
}

#[test]
fn exact_candidate_plus_candidate_checkpoint_verifies_candidate() {
    let fixture = Fixture::new();
    let worker = Path::new(env!("CARGO_BIN_EXE_registry-durability-recovery-worker"));
    let verifier = Path::new(env!("CARGO_BIN_EXE_registry-durability-recovery-verifier"));
    let args = fixture.base_args("test-only");
    assert!(run(worker, &args).status.success());
    fs::write(
        fixture
            .target
            .join(format!("registry-generation-{}.json", fixture.candidate_id)),
        CANDIDATE_BYTES,
    )
    .expect("exact candidate");
    fs::write(
        fixture.target.join("registry-durability-checkpoint-v1"),
        format!(
            "GALERINA_DURABILITY_CHECKPOINT_V1\nexperiment={}\nselected={}\n",
            fixture.experiment, fixture.candidate_id
        ),
    )
    .expect("candidate checkpoint");
    let verified = run(verifier, &args);
    assert!(
        verified.status.success(),
        "{}",
        String::from_utf8_lossy(&verified.stderr)
    );
    assert!(fs::read_to_string(fixture.result_path())
        .expect("candidate result")
        .contains("\"outcome\": \"CANDIDATE\""));
}

#[test]
fn target_path_or_device_overlap_refuses_before_arming() {
    for mutate in ["path", "device"] {
        let fixture = Fixture::new();
        let worker = Path::new(env!("CARGO_BIN_EXE_registry-durability-recovery-worker"));
        let mut args = fixture.base_args("test-only");
        if mutate == "path" {
            let position = args
                .iter()
                .position(|value| value == "--repository-root")
                .unwrap();
            args[position + 1] = fixture.target.display().to_string();
        } else {
            let position = args
                .iter()
                .position(|value| value == "--repository-device-digest")
                .unwrap();
            args[position + 1] = "1".repeat(64);
        }
        let output = run(worker, &args);
        assert!(!output.status.success());
        assert!(!fixture.arm_path().exists());
    }
}

#[test]
fn live_mode_rederives_and_refuses_the_same_native_device() {
    let fixture = Fixture::new();
    let worker = Path::new(env!("CARGO_BIN_EXE_registry-durability-recovery-worker"));
    let args = fixture.base_args("live");
    let output = run(worker, &args);
    assert!(!output.status.success());
    assert!(String::from_utf8_lossy(&output.stderr)
        .contains("RECOVERY_PROHIBITED_NATIVE_DEVICE_REFUSED"));
    assert!(!fixture.arm_path().exists());
}

#[test]
fn unknown_boundary_and_changed_marker_refuse_before_arming() {
    for mutation in ["boundary", "marker"] {
        let fixture = Fixture::new();
        let worker = Path::new(env!("CARGO_BIN_EXE_registry-durability-recovery-worker"));
        let mut args = fixture.base_args("test-only");
        if mutation == "boundary" {
            let position = args.iter().position(|value| value == "--boundary").unwrap();
            args[position + 1] = "after-everything".into();
        } else {
            fs::write(
                fixture.target.join(".galerina-durability-sacrificial-v1"),
                b"changed\n",
            )
            .expect("changed marker");
        }
        let output = run(worker, &args);
        assert!(!output.status.success());
        assert!(!fixture.arm_path().exists());
    }
}

#[test]
fn corrupt_arm_partial_candidate_and_ambiguous_checkpoint_refuse() {
    for mutation in ["arm", "candidate", "checkpoint"] {
        let fixture = Fixture::new();
        let worker = Path::new(env!("CARGO_BIN_EXE_registry-durability-recovery-worker"));
        let verifier = Path::new(env!("CARGO_BIN_EXE_registry-durability-recovery-verifier"));
        let args = fixture.base_args("test-only");
        assert!(run(worker, &args).status.success());
        match mutation {
            "arm" => fs::write(fixture.arm_path(), b"{}\n").expect("mutate arm"),
            "candidate" => fs::write(
                fixture
                    .target
                    .join(format!("registry-generation-{}.json", fixture.candidate_id)),
                b"partial",
            )
            .expect("partial candidate"),
            _ => fs::write(
                fixture.target.join("registry-durability-checkpoint-v1"),
                format!(
                    "GALERINA_DURABILITY_CHECKPOINT_V1\nexperiment={}\nselected={}{}\n",
                    fixture.experiment, fixture.prior_id, fixture.candidate_id
                ),
            )
            .expect("ambiguous checkpoint"),
        }
        let output = run(verifier, &args);
        assert!(!output.status.success());
        assert!(!fixture.result_path().exists());
    }
}
