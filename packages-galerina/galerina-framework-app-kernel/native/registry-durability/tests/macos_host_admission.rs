use galerina_registry_durability_native::{
    admit_measured_macos_host, probe_macos_host, MacosHostProbeVerdict, MacosStorageKind,
    MeasuredMacosHost,
};

fn measured() -> MeasuredMacosHost {
    MeasuredMacosHost {
        facts_complete: true,
        operating_system: "macos".to_owned(),
        architecture: "arm64".to_owned(),
        target_is_absolute: true,
        target_is_direct_directory: true,
        symbolic_ancestor_present: false,
        filesystem: "apfs".to_owned(),
        storage_kind: MacosStorageKind::DirectInternal,
        mount_is_local: true,
        mount_is_read_write: true,
        identity_stable: true,
        link_count: 2,
        full_flush_available: true,
        device_id: 1,
    }
}

fn denial_code(measured: MeasuredMacosHost) -> &'static str {
    match admit_measured_macos_host(measured) {
        MacosHostProbeVerdict::Candidate(_) => panic!("host facts unexpectedly admitted"),
        MacosHostProbeVerdict::Deny(error) => error.code(),
    }
}

#[test]
fn pure_profile_admits_only_complete_arm64_apfs_internal_facts() {
    let verdict = admit_measured_macos_host(measured());
    match verdict {
        MacosHostProbeVerdict::Candidate(facts) => {
            assert_eq!(facts.operating_system, "macos");
            assert_eq!(facts.architecture, "arm64");
            assert_eq!(facts.filesystem, "apfs");
            assert_eq!(facts.storage_kind, MacosStorageKind::DirectInternal);
            assert_eq!(facts.link_count, 2);
            assert_eq!(facts.device_id, 1);
        }
        MacosHostProbeVerdict::Deny(error) => {
            panic!("exact profile refused: {}", error.code());
        }
    }
}

#[test]
fn pure_profile_refuses_each_unknown_or_unsupported_fact_with_a_stable_code() {
    let mut value = measured();
    value.facts_complete = false;
    assert_eq!(denial_code(value), "MACOS_HOST_FACTS_INCOMPLETE");

    let mut value = measured();
    value.operating_system = "darwin".to_owned();
    assert_eq!(denial_code(value), "MACOS_PLATFORM_NOT_ADMITTED");

    let mut value = measured();
    value.architecture = "x86_64".to_owned();
    assert_eq!(denial_code(value), "MACOS_ARCHITECTURE_NOT_ADMITTED");

    let mut value = measured();
    value.target_is_absolute = false;
    assert_eq!(
        denial_code(value),
        "MACOS_PATH_NOT_ABSOLUTE_DIRECT_DIRECTORY"
    );

    let mut value = measured();
    value.target_is_direct_directory = false;
    assert_eq!(
        denial_code(value),
        "MACOS_PATH_NOT_ABSOLUTE_DIRECT_DIRECTORY"
    );

    let mut value = measured();
    value.symbolic_ancestor_present = true;
    assert_eq!(denial_code(value), "MACOS_PATH_SYMBOLIC_ANCESTOR");

    for filesystem in ["hfs", "hfs+", "fat", "exfat", "smb", "nfs", ""] {
        let mut value = measured();
        value.filesystem = filesystem.to_owned();
        assert_eq!(denial_code(value), "MACOS_FILESYSTEM_NOT_ADMITTED");
    }

    for storage_kind in [
        MacosStorageKind::Network,
        MacosStorageKind::DiskImage,
        MacosStorageKind::Removable,
        MacosStorageKind::Virtual,
        MacosStorageKind::Unknown,
    ] {
        let mut value = measured();
        value.storage_kind = storage_kind;
        assert_eq!(denial_code(value), "MACOS_STORAGE_KIND_NOT_ADMITTED");
    }

    let mut value = measured();
    value.mount_is_local = false;
    assert_eq!(denial_code(value), "MACOS_MOUNT_NOT_LOCAL");

    let mut value = measured();
    value.mount_is_read_write = false;
    assert_eq!(denial_code(value), "MACOS_MOUNT_NOT_READ_WRITE");

    let mut value = measured();
    value.identity_stable = false;
    assert_eq!(denial_code(value), "MACOS_IDENTITY_UNSTABLE");

    let mut value = measured();
    value.link_count = 0;
    assert_eq!(denial_code(value), "MACOS_LINK_COUNT_UNAVAILABLE");

    let mut value = measured();
    value.full_flush_available = false;
    assert_eq!(denial_code(value), "MACOS_FULL_FLUSH_UNAVAILABLE");

    let mut value = measured();
    value.device_id = 0;
    assert_eq!(denial_code(value), "MACOS_DEVICE_ID_UNAVAILABLE");
}

#[test]
fn off_host_probe_returns_only_platform_unavailable() {
    let verdict = probe_macos_host(std::env::temp_dir().as_path());
    #[cfg(not(target_os = "macos"))]
    match verdict {
        MacosHostProbeVerdict::Candidate(_) => panic!("off-host probe invented macOS evidence"),
        MacosHostProbeVerdict::Deny(error) => {
            assert_eq!(error.code(), "MACOS_PLATFORM_UNAVAILABLE");
            assert_eq!(error.os_code(), None);
        }
    }
    #[cfg(target_os = "macos")]
    let _ = verdict;
}

#[cfg(feature = "fault-injection")]
#[test]
fn fault_vocabulary_is_closed_and_maps_to_exact_denial_codes() {
    use galerina_registry_durability_native::{
        macos_publication_fault_code, MacosPublicationFault,
    };

    let cases = [
        (MacosPublicationFault::None, None),
        (
            MacosPublicationFault::ShortWrite,
            Some("MACOS_WRITE_SHORT_REFUSED"),
        ),
        (
            MacosPublicationFault::ZeroProgress,
            Some("MACOS_WRITE_ZERO_PROGRESS_REFUSED"),
        ),
        (
            MacosPublicationFault::DiskFull,
            Some("MACOS_DISK_FULL_REFUSED"),
        ),
        (
            MacosPublicationFault::FullFlush,
            Some("MACOS_FULL_FLUSH_REFUSED"),
        ),
        (
            MacosPublicationFault::Publish,
            Some("MACOS_PUBLICATION_REFUSED"),
        ),
        (MacosPublicationFault::Reopen, Some("MACOS_REOPEN_REFUSED")),
        (
            MacosPublicationFault::DirectoryBarrier,
            Some("MACOS_DIRECTORY_BARRIER_REFUSED"),
        ),
        (
            MacosPublicationFault::NamespaceChanged,
            Some("MACOS_NAMESPACE_CHANGED_REFUSED"),
        ),
        (
            MacosPublicationFault::ReadbackChanged,
            Some("MACOS_READBACK_MISMATCH_REFUSED"),
        ),
    ];

    for (fault, expected) in cases {
        assert_eq!(macos_publication_fault_code(fault), expected);
    }
}
