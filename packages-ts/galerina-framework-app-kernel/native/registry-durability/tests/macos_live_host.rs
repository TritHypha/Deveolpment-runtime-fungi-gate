use std::path::Path;

#[cfg(target_os = "macos")]
use galerina_registry_durability_native::{probe_macos_host, MacosHostProbeVerdict};
use galerina_registry_durability_native::{
    publish_macos_generation_candidate, MacosGenerationPublicationVerdict,
};

#[test]
fn off_host_publication_refuses_without_mutating_the_requested_namespace() {
    #[cfg(not(target_os = "macos"))]
    {
        let root = std::env::temp_dir();
        let generation_id = "c".repeat(64);
        let final_path = root.join(format!("registry-generation-{generation_id}.json"));
        let existed_before = final_path.exists();
        let verdict = publish_macos_generation_candidate(
            &root,
            &generation_id,
            br#"{"schema":"galerina.registry.generation.v1"}"#,
        );
        match verdict {
            MacosGenerationPublicationVerdict::Candidate { .. } => {
                panic!("off-host publication invented macOS authority")
            }
            MacosGenerationPublicationVerdict::Deny(error) => {
                assert_eq!(error.code(), "MACOS_PLATFORM_UNAVAILABLE");
                assert_eq!(error.os_code(), None);
            }
        }
        assert_eq!(final_path.exists(), existed_before);
    }
    #[cfg(target_os = "macos")]
    let _ = Path::new(".");
}

#[cfg(target_os = "macos")]
#[test]
#[ignore = "requires an owner-operated Apple-silicon local-APFS evidence host"]
fn live_arm64_apfs_probe_and_publication_are_exact_and_collision_safe() {
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    match probe_macos_host(std::env::temp_dir().as_path()) {
        MacosHostProbeVerdict::Candidate(facts) => {
            assert_eq!(facts.operating_system, "macos");
            assert_eq!(facts.architecture, "arm64");
            assert_eq!(facts.filesystem, "apfs");
        }
        MacosHostProbeVerdict::Deny(error) => {
            panic!("local macOS evidence host refused: {}", error.code());
        }
    }

    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("clock must be available for a disposable publication path")
        .as_nanos();
    let root = std::env::temp_dir().join(format!(
        "galerina-macos-publication-{}-{nonce}",
        std::process::id(),
    ));
    fs::create_dir(&root).expect("disposable publication directory");
    let generation_id = "a".repeat(64);
    let expected = br#"{"schema":"galerina.registry.generation.v1"}"#;
    let changed = br#"{"schema":"different"}"#;

    assert!(matches!(
        publish_macos_generation_candidate(&root, &generation_id, expected),
        MacosGenerationPublicationVerdict::Candidate { byte_length }
            if byte_length == expected.len()
    ));
    assert_eq!(
        fs::read(root.join(format!("registry-generation-{generation_id}.json")))
            .expect("published generation"),
        expected,
    );
    assert!(matches!(
        publish_macos_generation_candidate(&root, &generation_id, expected),
        MacosGenerationPublicationVerdict::Candidate { byte_length }
            if byte_length == expected.len()
    ));
    assert!(matches!(
        publish_macos_generation_candidate(&root, &generation_id, changed),
        MacosGenerationPublicationVerdict::Deny(_)
    ));

    let linked_generation_id = "b".repeat(64);
    fs::hard_link(
        root.join(format!("registry-generation-{generation_id}.json")),
        root.join(format!("registry-generation-{linked_generation_id}.json")),
    )
    .expect("disposable hard-link collision");
    assert!(matches!(
        publish_macos_generation_candidate(&root, &linked_generation_id, expected),
        MacosGenerationPublicationVerdict::Deny(_)
    ));
    fs::remove_dir_all(root).expect("disposable publication cleanup");
}

#[test]
fn malformed_publication_inputs_are_always_denied() {
    for generation_id in ["not-a-generation".to_owned(), "A".repeat(64)] {
        assert!(matches!(
            publish_macos_generation_candidate(Path::new("."), &generation_id, b"value"),
            MacosGenerationPublicationVerdict::Deny(_)
        ));
    }
    assert!(matches!(
        publish_macos_generation_candidate(Path::new("."), &"a".repeat(64), b""),
        MacosGenerationPublicationVerdict::Deny(_)
    ));
    assert!(matches!(
        publish_macos_generation_candidate(
            Path::new("."),
            &"a".repeat(64),
            &vec![0_u8; 16 * 1024 * 1024 + 1],
        ),
        MacosGenerationPublicationVerdict::Deny(_)
    ));
}

#[cfg(all(target_os = "macos", feature = "fault-injection"))]
#[test]
#[ignore = "requires an owner-operated Apple-silicon local-APFS evidence host"]
fn injected_faults_refuse_with_exact_codes_and_never_expose_partial_bytes() {
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    use galerina_registry_durability_native::{
        publish_macos_generation_injected_candidate, MacosPublicationFault,
    };

    let cases = [
        (
            MacosPublicationFault::ShortWrite,
            "MACOS_WRITE_SHORT_REFUSED",
            false,
        ),
        (
            MacosPublicationFault::ZeroProgress,
            "MACOS_WRITE_ZERO_PROGRESS_REFUSED",
            false,
        ),
        (
            MacosPublicationFault::DiskFull,
            "MACOS_DISK_FULL_REFUSED",
            false,
        ),
        (
            MacosPublicationFault::FullFlush,
            "MACOS_FULL_FLUSH_REFUSED",
            false,
        ),
        (
            MacosPublicationFault::Publish,
            "MACOS_PUBLICATION_REFUSED",
            false,
        ),
        (MacosPublicationFault::Reopen, "MACOS_REOPEN_REFUSED", true),
        (
            MacosPublicationFault::ReadbackChanged,
            "MACOS_READBACK_MISMATCH_REFUSED",
            true,
        ),
        (
            MacosPublicationFault::DirectoryBarrier,
            "MACOS_DIRECTORY_BARRIER_REFUSED",
            true,
        ),
        (
            MacosPublicationFault::NamespaceChanged,
            "MACOS_NAMESPACE_CHANGED_REFUSED",
            true,
        ),
    ];
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("clock must be available for a disposable fault path")
        .as_nanos();
    let root = std::env::temp_dir().join(format!(
        "galerina-macos-faults-{}-{nonce}",
        std::process::id(),
    ));
    fs::create_dir(&root).expect("disposable fault directory");
    let bytes = br#"{"schema":"galerina.registry.generation.v1"}"#;

    for (index, (fault, expected_code, published)) in cases.into_iter().enumerate() {
        let generation_id = format!("{index:064x}");
        let verdict =
            publish_macos_generation_injected_candidate(&root, &generation_id, bytes, fault);
        match verdict {
            MacosGenerationPublicationVerdict::Candidate { .. } => {
                panic!("fault {fault:?} unexpectedly admitted")
            }
            MacosGenerationPublicationVerdict::Deny(error) => {
                assert_eq!(error.code(), expected_code);
            }
        }
        let final_path = root.join(format!("registry-generation-{generation_id}.json"));
        if published {
            assert_eq!(fs::read(final_path).expect("exact candidate"), bytes);
        } else {
            assert!(!final_path.exists());
        }
    }
    fs::remove_dir_all(root).expect("disposable fault cleanup");
}
