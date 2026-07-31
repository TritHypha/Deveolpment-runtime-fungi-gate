use galerina_registry_durability_native::{
    admit_measured_linux_host, parse_linux_mountinfo_line, select_linux_mount_for_target,
    LinuxHostProbeVerdict, LinuxStorageKind, MeasuredLinuxHost,
};

fn direct(filesystem: &str) -> MeasuredLinuxHost {
    MeasuredLinuxHost {
        facts_complete: true,
        target_is_absolute: true,
        target_is_direct_directory: true,
        symbolic_ancestor_present: false,
        filesystem: filesystem.to_owned(),
        storage_kind: LinuxStorageKind::DirectLocalBlock,
        mount_read_write: true,
        mount_namespace_stable: true,
        filesystem_magic_matches: true,
        device_identity_stable: true,
        device_major: 8,
        device_minor: 1,
        mount_id: 42,
    }
}

#[test]
fn mountinfo_parser_is_bounded_exact_and_decodes_only_declared_escapes() {
    let parsed = parse_linux_mountinfo_line(
        "42 1 8:1 / /media/My\\040Disk rw,relatime shared:7 - ext4 /dev/sda1 rw,errors=remount-ro",
    )
    .expect("canonical mountinfo row");
    assert_eq!(parsed.mount_id, 42);
    assert_eq!(parsed.parent_id, 1);
    assert_eq!((parsed.device_major, parsed.device_minor), (8, 1));
    assert_eq!(parsed.root, "/");
    assert_eq!(parsed.mount_point, "/media/My Disk");
    assert_eq!(parsed.filesystem, "ext4");
    assert_eq!(parsed.mount_source, "/dev/sda1");
    assert!(parsed.read_write);

    for malformed in [
        "",
        "42 1 8:1 / / rw - ext4 /dev/sda1",
        "42 1 broken / / rw - ext4 /dev/sda1 rw",
        "0 1 8:1 / / rw - ext4 /dev/sda1 rw",
        "42 1 8:1 relative / rw - ext4 /dev/sda1 rw",
        "42 1 8:1 / relative rw - ext4 /dev/sda1 rw",
        "42 1 8:1 / /bad\\777 rw - ext4 /dev/sda1 rw",
        "42 1 8:1 / / rw - ext4 /dev/sda1 rw surplus",
        "42 1 8:1 / / rw - ext4 /dev/sda1 rw - xfs /dev/sdb1 rw",
    ] {
        assert!(
            parse_linux_mountinfo_line(malformed).is_err(),
            "{malformed}"
        );
    }
    assert!(parse_linux_mountinfo_line(&"x".repeat(4097)).is_err());
}

#[test]
fn mount_selection_uses_one_deepest_component_boundary() {
    let records = [
        parse_linux_mountinfo_line("1 0 8:1 / / rw - ext4 /dev/sda1 rw").unwrap(),
        parse_linux_mountinfo_line("2 1 8:2 / /var rw - xfs /dev/sda2 rw").unwrap(),
        parse_linux_mountinfo_line("3 2 8:3 / /var/lib rw - btrfs /dev/sda3 rw").unwrap(),
    ];
    assert_eq!(
        select_linux_mount_for_target(&records, "/var/lib/galerina")
            .unwrap()
            .mount_id,
        3
    );
    assert_eq!(
        select_linux_mount_for_target(&records, "/var/library")
            .unwrap()
            .mount_id,
        2
    );
    for malformed in ["", "relative", "/var/../etc", "/var//lib", "/var/./lib"] {
        assert!(select_linux_mount_for_target(&records, malformed).is_err());
    }

    let duplicate = [records[0].clone(), records[0].clone()];
    assert!(select_linux_mount_for_target(&duplicate, "/tmp").is_err());
}

#[test]
fn admits_only_the_closed_direct_local_filesystem_set() {
    for filesystem in ["ext4", "xfs", "btrfs"] {
        assert!(matches!(
            admit_measured_linux_host(direct(filesystem)),
            LinuxHostProbeVerdict::Candidate(_)
        ));
    }
    for filesystem in ["EXT4", "ext3", "zfs", "tmpfs", "overlay", "nfs", ""] {
        assert!(matches!(
            admit_measured_linux_host(direct(filesystem)),
            LinuxHostProbeVerdict::Deny(_)
        ));
    }
}

#[test]
fn every_unknown_or_hostile_fact_refuses() {
    let baseline = direct("ext4");
    let cases = [
        (
            MeasuredLinuxHost {
                facts_complete: false,
                ..baseline.clone()
            },
            "LINUX_HOST_FACTS_INCOMPLETE",
        ),
        (
            MeasuredLinuxHost {
                target_is_absolute: false,
                ..baseline.clone()
            },
            "LINUX_PATH_NOT_ABSOLUTE_DIRECT_DIRECTORY",
        ),
        (
            MeasuredLinuxHost {
                target_is_direct_directory: false,
                ..baseline.clone()
            },
            "LINUX_PATH_NOT_ABSOLUTE_DIRECT_DIRECTORY",
        ),
        (
            MeasuredLinuxHost {
                symbolic_ancestor_present: true,
                ..baseline.clone()
            },
            "LINUX_PATH_SYMBOLIC_ANCESTOR",
        ),
        (
            MeasuredLinuxHost {
                storage_kind: LinuxStorageKind::DeviceMapper,
                ..baseline.clone()
            },
            "LINUX_STORAGE_KIND_NOT_ADMITTED",
        ),
        (
            MeasuredLinuxHost {
                storage_kind: LinuxStorageKind::SoftwareRaid,
                ..baseline.clone()
            },
            "LINUX_STORAGE_KIND_NOT_ADMITTED",
        ),
        (
            MeasuredLinuxHost {
                storage_kind: LinuxStorageKind::Network,
                ..baseline.clone()
            },
            "LINUX_STORAGE_KIND_NOT_ADMITTED",
        ),
        (
            MeasuredLinuxHost {
                storage_kind: LinuxStorageKind::Overlay,
                ..baseline.clone()
            },
            "LINUX_STORAGE_KIND_NOT_ADMITTED",
        ),
        (
            MeasuredLinuxHost {
                storage_kind: LinuxStorageKind::Removable,
                ..baseline.clone()
            },
            "LINUX_STORAGE_KIND_NOT_ADMITTED",
        ),
        (
            MeasuredLinuxHost {
                storage_kind: LinuxStorageKind::Virtual,
                ..baseline.clone()
            },
            "LINUX_STORAGE_KIND_NOT_ADMITTED",
        ),
        (
            MeasuredLinuxHost {
                storage_kind: LinuxStorageKind::Unknown,
                ..baseline.clone()
            },
            "LINUX_STORAGE_KIND_NOT_ADMITTED",
        ),
        (
            MeasuredLinuxHost {
                mount_read_write: false,
                ..baseline.clone()
            },
            "LINUX_MOUNT_NOT_READ_WRITE",
        ),
        (
            MeasuredLinuxHost {
                mount_namespace_stable: false,
                ..baseline.clone()
            },
            "LINUX_MOUNT_NAMESPACE_CHANGED",
        ),
        (
            MeasuredLinuxHost {
                filesystem_magic_matches: false,
                ..baseline.clone()
            },
            "LINUX_FILESYSTEM_IDENTITY_MISMATCH",
        ),
        (
            MeasuredLinuxHost {
                device_identity_stable: false,
                ..baseline.clone()
            },
            "LINUX_DEVICE_IDENTITY_UNAVAILABLE",
        ),
        (
            MeasuredLinuxHost {
                device_major: 0,
                ..baseline.clone()
            },
            "LINUX_DEVICE_IDENTITY_UNAVAILABLE",
        ),
        (
            MeasuredLinuxHost {
                mount_id: 0,
                ..baseline
            },
            "LINUX_DEVICE_IDENTITY_UNAVAILABLE",
        ),
    ];
    for (measured, expected) in cases {
        match admit_measured_linux_host(measured) {
            LinuxHostProbeVerdict::Deny(error) => assert_eq!(error.code(), expected),
            LinuxHostProbeVerdict::Candidate(_) => panic!("hostile Linux facts were admitted"),
        }
    }
}
