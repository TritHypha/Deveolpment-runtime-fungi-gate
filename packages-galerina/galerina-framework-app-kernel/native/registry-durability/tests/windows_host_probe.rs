use std::path::Path;

use galerina_registry_durability_native::{
    admit_measured_windows_host, probe_windows_host, MeasuredWindowsHost, WindowsHostProbeVerdict,
    DRIVE_FIXED, DRIVE_REMOTE, FILE_SUPPORTS_REMOTE_STORAGE,
};

fn measured(filesystem: &str) -> MeasuredWindowsHost {
    MeasuredWindowsHost {
        drive_type: DRIVE_FIXED,
        filesystem: filesystem.to_owned(),
        filesystem_flags: 0,
        volume_serial: 1,
    }
}

#[test]
fn pure_host_admission_accepts_only_fixed_ntfs_or_refs() {
    assert!(matches!(
        admit_measured_windows_host(measured("NTFS")),
        WindowsHostProbeVerdict::Candidate(_)
    ));
    assert!(matches!(
        admit_measured_windows_host(measured("ReFS")),
        WindowsHostProbeVerdict::Candidate(_)
    ));

    let mut remote = measured("NTFS");
    remote.drive_type = DRIVE_REMOTE;
    assert!(matches!(
        admit_measured_windows_host(remote),
        WindowsHostProbeVerdict::Deny(_)
    ));

    let mut remote_storage = measured("NTFS");
    remote_storage.filesystem_flags = FILE_SUPPORTS_REMOTE_STORAGE;
    assert!(matches!(
        admit_measured_windows_host(remote_storage),
        WindowsHostProbeVerdict::Deny(_)
    ));

    for filesystem in ["FAT32", "exFAT", "CIFS", "unknown", ""] {
        assert!(matches!(
            admit_measured_windows_host(measured(filesystem)),
            WindowsHostProbeVerdict::Deny(_)
        ));
    }
}

#[test]
fn live_probe_is_total_and_never_invents_an_admitted_filesystem() {
    let verdict = probe_windows_host(std::env::temp_dir().as_path());
    #[cfg(windows)]
    match verdict {
        WindowsHostProbeVerdict::Candidate(facts) => {
            assert_eq!(facts.drive_type, DRIVE_FIXED);
            assert!(facts.filesystem == "ntfs" || facts.filesystem == "refs");
            assert_eq!(facts.filesystem_flags & FILE_SUPPORTS_REMOTE_STORAGE, 0,);
        }
        WindowsHostProbeVerdict::Deny(error) => {
            panic!("local Windows test volume was refused: {}", error.code());
        }
    }
    #[cfg(not(windows))]
    assert!(matches!(verdict, WindowsHostProbeVerdict::Deny(_)));
}

#[test]
fn live_probe_refuses_relative_and_unavailable_paths() {
    assert!(matches!(
        probe_windows_host(Path::new(".")),
        WindowsHostProbeVerdict::Deny(_)
    ));
    assert!(matches!(
        probe_windows_host(Path::new(
            r"C:\this-path-must-not-exist\galerina-registry-durability",
        )),
        WindowsHostProbeVerdict::Deny(_)
    ));
}

#[cfg(windows)]
#[test]
fn live_probe_refuses_a_reparse_ancestor_when_the_host_can_create_one() {
    use std::fs;
    use std::os::windows::fs::symlink_dir;
    use std::time::{SystemTime, UNIX_EPOCH};

    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("clock must be available for a disposable test path")
        .as_nanos();
    let root = std::env::temp_dir().join(format!(
        "galerina-registry-probe-{}-{nonce}",
        std::process::id(),
    ));
    let real = root.join("real");
    let child = real.join("child");
    let linked = root.join("linked");
    fs::create_dir_all(&child).expect("disposable real directory");
    if symlink_dir(&real, &linked).is_err() {
        fs::remove_dir_all(&root).expect("disposable directory cleanup");
        return;
    }
    assert!(matches!(
        probe_windows_host(linked.join("child").as_path()),
        WindowsHostProbeVerdict::Deny(_)
    ));
    fs::remove_dir_all(&root).expect("disposable directory cleanup");
}
