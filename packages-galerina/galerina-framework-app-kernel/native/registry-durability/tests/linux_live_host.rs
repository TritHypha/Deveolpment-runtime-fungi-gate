#![cfg(target_os = "linux")]

use std::fs;
use std::path::PathBuf;

use galerina_registry_durability_native::{
    probe_linux_host, publish_linux_generation_candidate, LinuxGenerationPublicationVerdict,
    LinuxHostProbeVerdict,
};

#[cfg(feature = "fault-injection")]
use galerina_registry_durability_native::publish_linux_generation_fault_candidate;

fn evidence_root() -> PathBuf {
    PathBuf::from(
        std::env::var_os("GALERINA_LINUX_EVIDENCE_DIRECTORY")
            .expect("named bare-host evidence directory is required"),
    )
}

#[test]
#[ignore = "requires the named Ubuntu bare-host evidence directory"]
fn live_host_observation_admits_only_the_named_direct_local_directory() {
    assert!(matches!(
        probe_linux_host(&evidence_root()),
        LinuxHostProbeVerdict::Candidate(_)
    ));
}

#[test]
#[ignore = "requires the named Ubuntu bare-host evidence directory"]
fn retained_handle_publication_is_exact_idempotent_and_no_replace() {
    let root = evidence_root().join(format!(".galerina-linux-live-{}", std::process::id()));
    fs::create_dir(&root).expect("disposable evidence directory");
    let generation_id = "a".repeat(64);
    let expected = br#"{"schema":"galerina.registry.generation.v1"}"#;
    let changed = br#"{"schema":"changed"}"#;

    assert!(matches!(
        publish_linux_generation_candidate(&root, &generation_id, expected),
        LinuxGenerationPublicationVerdict::Candidate { byte_length }
            if byte_length == expected.len()
    ));
    assert!(matches!(
        publish_linux_generation_candidate(&root, &generation_id, expected),
        LinuxGenerationPublicationVerdict::Candidate { byte_length }
            if byte_length == expected.len()
    ));
    assert!(matches!(
        publish_linux_generation_candidate(&root, &generation_id, changed),
        LinuxGenerationPublicationVerdict::Deny(_)
    ));
    assert_eq!(
        fs::read(root.join(format!("registry-generation-{generation_id}.json")))
            .expect("published generation"),
        expected
    );
    fs::remove_dir_all(root).expect("disposable evidence cleanup");
}

#[test]
#[ignore = "requires the named Ubuntu bare-host evidence directory"]
fn retained_handle_publication_refuses_symlink_and_hard_link_collisions() {
    use std::os::unix::fs::symlink;

    let root = evidence_root().join(format!(".galerina-linux-hostile-{}", std::process::id()));
    fs::create_dir(&root).expect("disposable evidence directory");
    let external = root.with_extension("external");
    fs::write(&external, b"hostile").expect("external hostile file");

    let symlink_id = "b".repeat(64);
    symlink(
        &external,
        root.join(format!("registry-generation-{symlink_id}.json")),
    )
    .expect("hostile symlink");
    assert!(matches!(
        publish_linux_generation_candidate(&root, &symlink_id, b"hostile"),
        LinuxGenerationPublicationVerdict::Deny(_)
    ));

    let hard_link_id = "c".repeat(64);
    fs::hard_link(
        &external,
        root.join(format!("registry-generation-{hard_link_id}.json")),
    )
    .expect("hostile hard link");
    assert!(matches!(
        publish_linux_generation_candidate(&root, &hard_link_id, b"hostile"),
        LinuxGenerationPublicationVerdict::Deny(_)
    ));
    assert_eq!(fs::read(&external).expect("external content"), b"hostile");

    fs::remove_dir_all(root).expect("disposable evidence cleanup");
    fs::remove_file(external).expect("external evidence cleanup");
}

#[cfg(feature = "fault-injection")]
#[test]
#[ignore = "requires the named Linux bare-host evidence directory"]
fn retained_anchor_refuses_namespace_substitution_after_directory_barrier() {
    let root = evidence_root().join(format!(".galerina-linux-namespace-{}", std::process::id()));
    let moved = root.with_extension("moved");
    fs::create_dir(&root).expect("disposable namespace directory");
    let generation_id = "d".repeat(64);
    let expected = br#"{"schema":"galerina.registry.generation.v1","namespace":true}"#;

    let verdict =
        publish_linux_generation_fault_candidate(&root, &generation_id, expected, |boundary| {
            if boundary == "directory-flushed" {
                fs::rename(&root, &moved).expect("controlled namespace substitution");
            }
        });
    assert!(matches!(
        verdict,
        LinuxGenerationPublicationVerdict::Deny(error)
            if error.code() == "LINUX_PUBLICATION_HOST_RECHECK_REFUSED"
    ));
    assert_eq!(
        fs::read(moved.join(format!("registry-generation-{generation_id}.json")))
            .expect("complete generation behind retained identity"),
        expected
    );
    fs::remove_dir_all(moved).expect("disposable namespace cleanup");
}
