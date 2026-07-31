#![deny(unsafe_op_in_unsafe_fn)]

#[cfg(all(feature = "fault-injection", not(debug_assertions)))]
compile_error!("fault-injection is test-only and must not be compiled into an optimized build");

use std::path::Path;

pub const DRIVE_FIXED: u32 = 3;
pub const DRIVE_REMOTE: u32 = 4;
pub const FILE_SUPPORTS_REMOTE_STORAGE: u32 = 0x0000_0100;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MeasuredWindowsHost {
    pub drive_type: u32,
    pub filesystem: String,
    pub filesystem_flags: u32,
    pub volume_serial: u32,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdmittedWindowsHost {
    pub drive_type: u32,
    pub filesystem: String,
    pub filesystem_flags: u32,
    pub volume_serial: u32,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WindowsHostProbeError {
    code: &'static str,
    os_code: Option<u32>,
}

impl WindowsHostProbeError {
    pub fn code(&self) -> &'static str {
        self.code
    }

    pub fn os_code(&self) -> Option<u32> {
        self.os_code
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum WindowsHostProbeVerdict {
    Candidate(AdmittedWindowsHost),
    Deny(WindowsHostProbeError),
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum WindowsDirectoryFlushVerdict {
    Candidate,
    Deny(WindowsHostProbeError),
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum WindowsGenerationPublicationVerdict {
    Candidate { byte_length: usize },
    Deny(WindowsHostProbeError),
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LinuxStorageKind {
    DirectLocalBlock,
    DeviceMapper,
    SoftwareRaid,
    Network,
    Overlay,
    Removable,
    Virtual,
    Unknown,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MeasuredLinuxHost {
    pub facts_complete: bool,
    pub target_is_absolute: bool,
    pub target_is_direct_directory: bool,
    pub symbolic_ancestor_present: bool,
    pub filesystem: String,
    pub storage_kind: LinuxStorageKind,
    pub mount_read_write: bool,
    pub mount_namespace_stable: bool,
    pub filesystem_magic_matches: bool,
    pub device_identity_stable: bool,
    pub device_major: u32,
    pub device_minor: u32,
    pub mount_id: u64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdmittedLinuxHost {
    pub filesystem: String,
    pub device_major: u32,
    pub device_minor: u32,
    pub mount_id: u64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LinuxHostProbeError {
    code: &'static str,
}

impl LinuxHostProbeError {
    pub fn code(&self) -> &'static str {
        self.code
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum LinuxHostProbeVerdict {
    Candidate(AdmittedLinuxHost),
    Deny(LinuxHostProbeError),
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LinuxMountInfo {
    pub mount_id: u64,
    pub parent_id: u64,
    pub device_major: u32,
    pub device_minor: u32,
    pub root: String,
    pub mount_point: String,
    pub filesystem: String,
    pub mount_source: String,
    pub read_write: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LinuxMountInfoError {
    code: &'static str,
}

impl LinuxMountInfoError {
    pub fn code(&self) -> &'static str {
        self.code
    }
}

fn mountinfo_error(code: &'static str) -> LinuxMountInfoError {
    LinuxMountInfoError { code }
}

fn decode_mountinfo_field(field: &str) -> Result<String, LinuxMountInfoError> {
    if field.is_empty() || field.len() > 2048 {
        return Err(mountinfo_error("LINUX_MOUNTINFO_FIELD_BOUNDS"));
    }
    let bytes = field.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] != b'\\' {
            decoded.push(bytes[index]);
            index += 1;
            continue;
        }
        if index + 3 >= bytes.len() {
            return Err(mountinfo_error("LINUX_MOUNTINFO_ESCAPE_MALFORMED"));
        }
        let escape = &bytes[index + 1..index + 4];
        let value = match escape {
            b"040" => b' ',
            b"011" => b'\t',
            b"012" => b'\n',
            b"134" => b'\\',
            _ => return Err(mountinfo_error("LINUX_MOUNTINFO_ESCAPE_UNKNOWN")),
        };
        if value.is_ascii_control() {
            return Err(mountinfo_error("LINUX_MOUNTINFO_CONTROL_PATH"));
        }
        decoded.push(value);
        index += 4;
    }
    String::from_utf8(decoded).map_err(|_| mountinfo_error("LINUX_MOUNTINFO_NOT_UTF8"))
}

fn is_canonical_absolute_linux_path(path: &str) -> bool {
    if !path.starts_with('/') || path.contains('\0') || path.chars().any(char::is_control) {
        return false;
    }
    if path == "/" {
        return true;
    }
    if path.ends_with('/') {
        return false;
    }
    path[1..]
        .split('/')
        .all(|component| !component.is_empty() && component != "." && component != "..")
}

pub fn parse_linux_mountinfo_line(line: &str) -> Result<LinuxMountInfo, LinuxMountInfoError> {
    if line.is_empty() || line.len() > 4096 || line.contains(['\r', '\n', '\0']) || !line.is_ascii()
    {
        return Err(mountinfo_error("LINUX_MOUNTINFO_LINE_BOUNDS"));
    }
    let fields: Vec<&str> = line.split_ascii_whitespace().collect();
    if fields.len() < 10 || fields.len() > 64 {
        return Err(mountinfo_error("LINUX_MOUNTINFO_FIELD_COUNT"));
    }
    let separators: Vec<usize> = fields
        .iter()
        .enumerate()
        .filter_map(|(index, field)| (*field == "-").then_some(index))
        .collect();
    if separators.len() != 1 {
        return Err(mountinfo_error("LINUX_MOUNTINFO_SEPARATOR_COUNT"));
    }
    let separator = separators[0];
    if separator < 6 || fields.len() != separator + 4 {
        return Err(mountinfo_error("LINUX_MOUNTINFO_SHAPE"));
    }
    let mount_id = fields[0]
        .parse::<u64>()
        .map_err(|_| mountinfo_error("LINUX_MOUNTINFO_MOUNT_ID"))?;
    let parent_id = fields[1]
        .parse::<u64>()
        .map_err(|_| mountinfo_error("LINUX_MOUNTINFO_PARENT_ID"))?;
    if mount_id == 0 {
        return Err(mountinfo_error("LINUX_MOUNTINFO_MOUNT_ID"));
    }
    let (major, minor) = fields[2]
        .split_once(':')
        .ok_or_else(|| mountinfo_error("LINUX_MOUNTINFO_DEVICE_ID"))?;
    let device_major = major
        .parse::<u32>()
        .map_err(|_| mountinfo_error("LINUX_MOUNTINFO_DEVICE_ID"))?;
    let device_minor = minor
        .parse::<u32>()
        .map_err(|_| mountinfo_error("LINUX_MOUNTINFO_DEVICE_ID"))?;
    let root = decode_mountinfo_field(fields[3])?;
    let mount_point = decode_mountinfo_field(fields[4])?;
    if !is_canonical_absolute_linux_path(&root) || !is_canonical_absolute_linux_path(&mount_point) {
        return Err(mountinfo_error("LINUX_MOUNTINFO_PATH_NOT_CANONICAL"));
    }
    let options: Vec<&str> = fields[5].split(',').collect();
    if options.is_empty() || options.iter().any(|option| option.is_empty()) {
        return Err(mountinfo_error("LINUX_MOUNTINFO_OPTIONS_MALFORMED"));
    }
    let has_read_write = options.contains(&"rw");
    let has_read_only = options.contains(&"ro");
    if has_read_write == has_read_only {
        return Err(mountinfo_error("LINUX_MOUNTINFO_ACCESS_AMBIGUOUS"));
    }
    let filesystem = fields[separator + 1];
    if filesystem.is_empty()
        || filesystem.len() > 32
        || !filesystem
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b'-'))
    {
        return Err(mountinfo_error("LINUX_MOUNTINFO_FILESYSTEM_MALFORMED"));
    }
    let mount_source = decode_mountinfo_field(fields[separator + 2])?;
    if fields[separator + 3].is_empty() {
        return Err(mountinfo_error("LINUX_MOUNTINFO_SUPER_OPTIONS_MALFORMED"));
    }
    Ok(LinuxMountInfo {
        mount_id,
        parent_id,
        device_major,
        device_minor,
        root,
        mount_point,
        filesystem: filesystem.to_owned(),
        mount_source,
        read_write: has_read_write,
    })
}

pub fn select_linux_mount_for_target<'a>(
    records: &'a [LinuxMountInfo],
    target: &str,
) -> Result<&'a LinuxMountInfo, LinuxMountInfoError> {
    if !is_canonical_absolute_linux_path(target) {
        return Err(mountinfo_error("LINUX_TARGET_PATH_NOT_CANONICAL"));
    }
    let mut selected: Option<&LinuxMountInfo> = None;
    for record in records {
        let matches = record.mount_point == "/"
            || target == record.mount_point
            || target
                .strip_prefix(&record.mount_point)
                .is_some_and(|suffix| suffix.starts_with('/'));
        if !matches {
            continue;
        }
        match selected {
            Some(current) if current.mount_point.len() == record.mount_point.len() => {
                return Err(mountinfo_error("LINUX_MOUNTINFO_TARGET_AMBIGUOUS"));
            }
            Some(current) if current.mount_point.len() > record.mount_point.len() => {}
            _ => selected = Some(record),
        }
    }
    selected.ok_or_else(|| mountinfo_error("LINUX_MOUNTINFO_TARGET_UNMAPPED"))
}

fn linux_deny(code: &'static str) -> LinuxHostProbeVerdict {
    LinuxHostProbeVerdict::Deny(LinuxHostProbeError { code })
}

pub fn admit_measured_linux_host(measured: MeasuredLinuxHost) -> LinuxHostProbeVerdict {
    if !measured.facts_complete {
        return linux_deny("LINUX_HOST_FACTS_INCOMPLETE");
    }
    if !measured.target_is_absolute || !measured.target_is_direct_directory {
        return linux_deny("LINUX_PATH_NOT_ABSOLUTE_DIRECT_DIRECTORY");
    }
    if measured.symbolic_ancestor_present {
        return linux_deny("LINUX_PATH_SYMBOLIC_ANCESTOR");
    }
    if measured.storage_kind != LinuxStorageKind::DirectLocalBlock {
        return linux_deny("LINUX_STORAGE_KIND_NOT_ADMITTED");
    }
    if !measured.mount_read_write {
        return linux_deny("LINUX_MOUNT_NOT_READ_WRITE");
    }
    if !measured.mount_namespace_stable {
        return linux_deny("LINUX_MOUNT_NAMESPACE_CHANGED");
    }
    if !measured.filesystem_magic_matches {
        return linux_deny("LINUX_FILESYSTEM_IDENTITY_MISMATCH");
    }
    if !measured.device_identity_stable || measured.device_major == 0 || measured.mount_id == 0 {
        return linux_deny("LINUX_DEVICE_IDENTITY_UNAVAILABLE");
    }
    if !matches!(measured.filesystem.as_str(), "ext4" | "xfs" | "btrfs") {
        return linux_deny("LINUX_FILESYSTEM_NOT_ADMITTED");
    }
    LinuxHostProbeVerdict::Candidate(AdmittedLinuxHost {
        filesystem: measured.filesystem,
        device_major: measured.device_major,
        device_minor: measured.device_minor,
        mount_id: measured.mount_id,
    })
}

pub const STATIC_LINK_PROFILE_SCHEMA: &str = "galerina-registry-durability-static-link-profile/v1";
pub const STATIC_LINK_PROFILE_ABI: &str = "galerina.registry.durability.abi.v1";

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StaticLinkProfileClaim {
    pub schema: &'static str,
    pub abi: &'static str,
    pub adapter_source_sha256: String,
    pub fungi_contract_sha256: String,
    pub build_profile: &'static str,
    pub adapter_is_statically_linked: bool,
    pub external_adapter_loader_present: bool,
    pub fault_injection_present: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StaticLinkProfileEvidence {
    pub schema: &'static str,
    pub abi: &'static str,
    pub adapter_source_sha256: String,
    pub fungi_contract_sha256: String,
    pub build_profile: &'static str,
    pub adapter_is_statically_linked: bool,
    pub external_adapter_loader_present: bool,
    pub fault_injection_present: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum StaticLinkProfileVerdict {
    Candidate(StaticLinkProfileEvidence),
    Deny(&'static str),
}

const ADAPTER_SOURCE_BYTES: &[u8] = include_bytes!("lib.rs");
const FUNGI_CONTRACT_BYTES: &[u8] =
    include_bytes!("../../../src/self-hosted/registry-durability-admission.fungi");

/// Dependency-free SHA-256 for binding the compile-time embedded source and
/// contract. It is intentionally public so an independent harness can compare
/// it with a second implementation and published test vectors.
pub fn sha256(input: &[u8]) -> String {
    const INITIAL: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
        0x5be0cd19,
    ];
    const ROUND: [u32; 64] = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
        0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
        0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
        0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
        0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
        0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
        0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
        0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
        0xc67178f2,
    ];

    let bit_length = (input.len() as u64).wrapping_mul(8);
    let mut padded = Vec::with_capacity(input.len().saturating_add(72));
    padded.extend_from_slice(input);
    padded.push(0x80);
    while padded.len() % 64 != 56 {
        padded.push(0);
    }
    padded.extend_from_slice(&bit_length.to_be_bytes());

    let mut state = INITIAL;
    for block in padded.chunks_exact(64) {
        let mut words = [0_u32; 64];
        for (index, bytes) in block.chunks_exact(4).enumerate() {
            words[index] = u32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]);
        }
        for index in 16..64 {
            let s0 = words[index - 15].rotate_right(7)
                ^ words[index - 15].rotate_right(18)
                ^ (words[index - 15] >> 3);
            let s1 = words[index - 2].rotate_right(17)
                ^ words[index - 2].rotate_right(19)
                ^ (words[index - 2] >> 10);
            words[index] = words[index - 16]
                .wrapping_add(s0)
                .wrapping_add(words[index - 7])
                .wrapping_add(s1);
        }

        let [mut a, mut b, mut c, mut d, mut e, mut f, mut g, mut h] = state;
        for index in 0..64 {
            let upper = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let choose = (e & f) ^ ((!e) & g);
            let first = h
                .wrapping_add(upper)
                .wrapping_add(choose)
                .wrapping_add(ROUND[index])
                .wrapping_add(words[index]);
            let lower = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let majority = (a & b) ^ (a & c) ^ (b & c);
            let second = lower.wrapping_add(majority);
            h = g;
            g = f;
            f = e;
            e = d.wrapping_add(first);
            d = c;
            c = b;
            b = a;
            a = first.wrapping_add(second);
        }
        state[0] = state[0].wrapping_add(a);
        state[1] = state[1].wrapping_add(b);
        state[2] = state[2].wrapping_add(c);
        state[3] = state[3].wrapping_add(d);
        state[4] = state[4].wrapping_add(e);
        state[5] = state[5].wrapping_add(f);
        state[6] = state[6].wrapping_add(g);
        state[7] = state[7].wrapping_add(h);
    }

    state.iter().map(|word| format!("{word:08x}")).collect()
}

pub fn embedded_static_link_profile() -> StaticLinkProfileEvidence {
    StaticLinkProfileEvidence {
        schema: STATIC_LINK_PROFILE_SCHEMA,
        abi: STATIC_LINK_PROFILE_ABI,
        adapter_source_sha256: sha256(ADAPTER_SOURCE_BYTES),
        fungi_contract_sha256: sha256(FUNGI_CONTRACT_BYTES),
        build_profile: if cfg!(debug_assertions) {
            "debug"
        } else {
            "release"
        },
        adapter_is_statically_linked: true,
        external_adapter_loader_present: false,
        fault_injection_present: cfg!(feature = "fault-injection"),
    }
}

pub fn assess_static_link_profile(claim: &StaticLinkProfileClaim) -> StaticLinkProfileVerdict {
    let embedded = embedded_static_link_profile();
    if embedded.fault_injection_present || claim.fault_injection_present {
        return StaticLinkProfileVerdict::Deny("STATIC_PROFILE_FAULT_INJECTION_PRESENT");
    }
    if claim.schema != embedded.schema {
        return StaticLinkProfileVerdict::Deny("STATIC_PROFILE_SCHEMA_MISMATCH");
    }
    if claim.abi != embedded.abi {
        return StaticLinkProfileVerdict::Deny("STATIC_PROFILE_ABI_MISMATCH");
    }
    if claim.adapter_source_sha256 != embedded.adapter_source_sha256 {
        return StaticLinkProfileVerdict::Deny("STATIC_PROFILE_SOURCE_MISMATCH");
    }
    if claim.fungi_contract_sha256 != embedded.fungi_contract_sha256 {
        return StaticLinkProfileVerdict::Deny("STATIC_PROFILE_CONTRACT_MISMATCH");
    }
    if claim.build_profile != embedded.build_profile || embedded.build_profile != "release" {
        return StaticLinkProfileVerdict::Deny("STATIC_PROFILE_NOT_RELEASE");
    }
    if !claim.adapter_is_statically_linked || !embedded.adapter_is_statically_linked {
        return StaticLinkProfileVerdict::Deny("STATIC_PROFILE_NOT_STATIC");
    }
    if claim.external_adapter_loader_present || embedded.external_adapter_loader_present {
        return StaticLinkProfileVerdict::Deny("STATIC_PROFILE_EXTERNAL_LOADER_PRESENT");
    }
    StaticLinkProfileVerdict::Candidate(embedded)
}

fn deny(code: &'static str, os_code: Option<u32>) -> WindowsHostProbeVerdict {
    WindowsHostProbeVerdict::Deny(WindowsHostProbeError { code, os_code })
}

pub fn admit_measured_windows_host(measured: MeasuredWindowsHost) -> WindowsHostProbeVerdict {
    if measured.drive_type != DRIVE_FIXED {
        return deny("WINDOWS_VOLUME_NOT_FIXED_LOCAL", None);
    }
    if measured.filesystem_flags & FILE_SUPPORTS_REMOTE_STORAGE != 0 {
        return deny("WINDOWS_VOLUME_SUPPORTS_REMOTE_STORAGE", None);
    }
    let filesystem = if measured.filesystem.eq_ignore_ascii_case("NTFS") {
        "ntfs"
    } else if measured.filesystem.eq_ignore_ascii_case("ReFS") {
        "refs"
    } else {
        return deny("WINDOWS_FILESYSTEM_NOT_ADMITTED", None);
    };
    WindowsHostProbeVerdict::Candidate(AdmittedWindowsHost {
        drive_type: measured.drive_type,
        filesystem: filesystem.to_owned(),
        filesystem_flags: measured.filesystem_flags,
        volume_serial: measured.volume_serial,
    })
}

#[cfg(windows)]
mod windows {
    use super::{
        admit_measured_windows_host, deny, MeasuredWindowsHost, WindowsDirectoryFlushVerdict,
        WindowsGenerationPublicationVerdict, WindowsHostProbeError, WindowsHostProbeVerdict,
    };
    use std::ffi::c_void;
    use std::ffi::OsStr;
    use std::fs::{self, File, OpenOptions};
    use std::io::{Read, Write};
    use std::os::windows::ffi::OsStrExt;
    use std::os::windows::fs::OpenOptionsExt;
    use std::os::windows::io::{AsRawHandle, IntoRawHandle};
    use std::path::{Component, Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    const INVALID_FILE_ATTRIBUTES: u32 = u32::MAX;
    const INVALID_HANDLE_VALUE: *mut c_void = -1_isize as *mut c_void;
    const FILE_ATTRIBUTE_DIRECTORY: u32 = 0x0000_0010;
    const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x0000_0400;
    const FILE_FLAG_WRITE_THROUGH: u32 = 0x8000_0000;
    const FILE_FLAG_OPEN_REPARSE_POINT: u32 = 0x0020_0000;
    const FILE_SHARE_READ: u32 = 0x0000_0001;
    const FILE_SHARE_WRITE: u32 = 0x0000_0002;
    const FILE_SHARE_DELETE: u32 = 0x0000_0004;
    const GENERIC_WRITE: u32 = 0x4000_0000;
    const OPEN_EXISTING: u32 = 3;
    const FILE_FLAG_BACKUP_SEMANTICS: u32 = 0x0200_0000;
    const MOVEFILE_WRITE_THROUGH: u32 = 0x0000_0008;
    const MAX_GENERATION_BYTES: usize = 16 * 1024 * 1024;
    const MAX_PATH_CHARS: usize = 32_768;
    const FILESYSTEM_NAME_CHARS: usize = 64;

    #[repr(C)]
    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    struct FileTime {
        low: u32,
        high: u32,
    }

    #[repr(C)]
    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    struct ByHandleFileInformation {
        attributes: u32,
        creation_time: FileTime,
        last_access_time: FileTime,
        last_write_time: FileTime,
        volume_serial_number: u32,
        file_size_high: u32,
        file_size_low: u32,
        number_of_links: u32,
        file_index_high: u32,
        file_index_low: u32,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    struct OpenFileIdentity {
        attributes: u32,
        volume_serial_number: u32,
        byte_length: u64,
        number_of_links: u32,
        file_index: u64,
        last_write_time: FileTime,
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn CloseHandle(object: *mut c_void) -> i32;
        fn CreateFileW(
            file_name: *const u16,
            desired_access: u32,
            share_mode: u32,
            security_attributes: *mut c_void,
            creation_disposition: u32,
            flags_and_attributes: u32,
            template_file: *mut c_void,
        ) -> *mut c_void;
        fn FlushFileBuffers(file: *mut c_void) -> i32;
        fn GetDriveTypeW(root_path_name: *const u16) -> u32;
        fn GetFileAttributesW(file_name: *const u16) -> u32;
        fn GetLastError() -> u32;
        fn GetVolumeInformationW(
            root_path_name: *const u16,
            volume_name_buffer: *mut u16,
            volume_name_size: u32,
            volume_serial_number: *mut u32,
            maximum_component_length: *mut u32,
            filesystem_flags: *mut u32,
            filesystem_name_buffer: *mut u16,
            filesystem_name_size: u32,
        ) -> i32;
        fn GetVolumePathNameW(
            file_name: *const u16,
            volume_path_name: *mut u16,
            buffer_length: u32,
        ) -> i32;
        fn GetFileInformationByHandle(
            file: *mut c_void,
            information: *mut ByHandleFileInformation,
        ) -> i32;
        fn MoveFileExW(
            existing_file_name: *const u16,
            new_file_name: *const u16,
            flags: u32,
        ) -> i32;
    }

    fn last_error() -> u32 {
        // SAFETY: GetLastError takes no pointers and has no preconditions.
        unsafe { GetLastError() }
    }

    fn wide_nul(value: &OsStr) -> Option<Vec<u16>> {
        let units: Vec<u16> = value.encode_wide().collect();
        if units.is_empty() || units.contains(&0) {
            return None;
        }
        let mut terminated = units;
        terminated.push(0);
        Some(terminated)
    }

    fn terminated_length(buffer: &[u16]) -> Option<usize> {
        buffer.iter().position(|unit| *unit == 0)
    }

    fn reparse_component(path: &Path) -> Result<bool, u32> {
        let mut ancestors: Vec<&Path> = path
            .ancestors()
            .filter(|ancestor| !ancestor.as_os_str().is_empty())
            .collect();
        ancestors.reverse();
        for ancestor in ancestors {
            let wide = wide_nul(ancestor.as_os_str()).ok_or(87_u32)?;
            // SAFETY: wide is NUL-terminated and remains alive for the call.
            let attributes = unsafe { GetFileAttributesW(wide.as_ptr()) };
            if attributes == INVALID_FILE_ATTRIBUTES {
                return Err(last_error());
            }
            if attributes & FILE_ATTRIBUTE_REPARSE_POINT != 0 {
                return Ok(true);
            }
        }
        Ok(false)
    }

    pub fn probe(path: &Path) -> WindowsHostProbeVerdict {
        if !path.is_absolute()
            || path
                .components()
                .any(|component| matches!(component, Component::ParentDir | Component::CurDir))
        {
            return deny("WINDOWS_PATH_NOT_ABSOLUTE_CANONICAL_INPUT", None);
        }
        let metadata = match fs::symlink_metadata(path) {
            Ok(metadata) => metadata,
            Err(_) => return deny("WINDOWS_PATH_UNAVAILABLE", None),
        };
        if !metadata.is_dir() || metadata.file_type().is_symlink() {
            return deny("WINDOWS_PATH_NOT_DIRECT_DIRECTORY", None);
        }
        let input_wide = match wide_nul(path.as_os_str()) {
            Some(value) => value,
            None => return deny("WINDOWS_PATH_ENCODING_REFUSED", None),
        };
        // SAFETY: input_wide is NUL-terminated and lives for the call.
        let attributes = unsafe { GetFileAttributesW(input_wide.as_ptr()) };
        if attributes == INVALID_FILE_ATTRIBUTES {
            return deny("WINDOWS_PATH_ATTRIBUTES_UNAVAILABLE", Some(last_error()));
        }
        if attributes & FILE_ATTRIBUTE_DIRECTORY == 0
            || attributes & FILE_ATTRIBUTE_REPARSE_POINT != 0
        {
            return deny("WINDOWS_PATH_REPARSE_OR_NON_DIRECTORY", None);
        }
        match reparse_component(path) {
            Ok(false) => {}
            Ok(true) => return deny("WINDOWS_PATH_REPARSE_ANCESTOR", None),
            Err(code) => {
                return deny("WINDOWS_PATH_ANCESTRY_UNAVAILABLE", Some(code));
            }
        }
        if fs::canonicalize(path).is_err() {
            return deny("WINDOWS_PATH_CANONICALIZATION_FAILED", None);
        }

        let mut volume_path = vec![0_u16; MAX_PATH_CHARS];
        // SAFETY: buffers are valid for their declared lengths and input_wide
        // is NUL-terminated.
        let volume_ok = unsafe {
            GetVolumePathNameW(
                input_wide.as_ptr(),
                volume_path.as_mut_ptr(),
                volume_path.len() as u32,
            )
        };
        if volume_ok == 0 {
            return deny("WINDOWS_VOLUME_PATH_UNAVAILABLE", Some(last_error()));
        }
        let volume_length = match terminated_length(&volume_path) {
            Some(length) if length > 0 => length,
            _ => return deny("WINDOWS_VOLUME_PATH_MALFORMED", None),
        };
        volume_path.truncate(volume_length + 1);

        // SAFETY: volume_path is NUL-terminated.
        let drive_type = unsafe { GetDriveTypeW(volume_path.as_ptr()) };
        let mut volume_serial = 0_u32;
        let mut maximum_component_length = 0_u32;
        let mut filesystem_flags = 0_u32;
        let mut filesystem_name = vec![0_u16; FILESYSTEM_NAME_CHARS];
        // SAFETY: all output pointers reference writable values or buffers of
        // the declared sizes; volume_path remains NUL-terminated.
        let information_ok = unsafe {
            GetVolumeInformationW(
                volume_path.as_ptr(),
                std::ptr::null_mut(),
                0,
                &mut volume_serial,
                &mut maximum_component_length,
                &mut filesystem_flags,
                filesystem_name.as_mut_ptr(),
                filesystem_name.len() as u32,
            )
        };
        if information_ok == 0 {
            return deny("WINDOWS_VOLUME_INFORMATION_UNAVAILABLE", Some(last_error()));
        }
        let filesystem_length = match terminated_length(&filesystem_name) {
            Some(length) if length > 0 => length,
            _ => return deny("WINDOWS_FILESYSTEM_NAME_MALFORMED", None),
        };
        let filesystem = match String::from_utf16(&filesystem_name[..filesystem_length]) {
            Ok(value) => value,
            Err(_) => return deny("WINDOWS_FILESYSTEM_NAME_NOT_UTF16", None),
        };
        admit_measured_windows_host(MeasuredWindowsHost {
            drive_type,
            filesystem,
            filesystem_flags,
            volume_serial,
        })
    }

    fn flush_deny(code: &'static str, os_code: Option<u32>) -> WindowsDirectoryFlushVerdict {
        WindowsDirectoryFlushVerdict::Deny(WindowsHostProbeError { code, os_code })
    }

    pub fn flush_directory(path: &Path) -> WindowsDirectoryFlushVerdict {
        if !matches!(probe(path), WindowsHostProbeVerdict::Candidate(_)) {
            return flush_deny("WINDOWS_DIRECTORY_HOST_NOT_CANDIDATE", None);
        }
        let wide = match wide_nul(path.as_os_str()) {
            Some(value) => value,
            None => return flush_deny("WINDOWS_DIRECTORY_PATH_ENCODING_REFUSED", None),
        };
        // SAFETY: wide is NUL-terminated. Null security/template pointers are
        // permitted, and the handle is checked before use.
        let handle = unsafe {
            CreateFileW(
                wide.as_ptr(),
                GENERIC_WRITE,
                FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                std::ptr::null_mut(),
                OPEN_EXISTING,
                FILE_FLAG_BACKUP_SEMANTICS,
                std::ptr::null_mut(),
            )
        };
        if handle == INVALID_HANDLE_VALUE {
            return flush_deny("WINDOWS_DIRECTORY_OPEN_REFUSED", Some(last_error()));
        }
        // SAFETY: handle was returned successfully by CreateFileW and remains
        // open for this call.
        let flush_ok = unsafe { FlushFileBuffers(handle) };
        let flush_error = if flush_ok == 0 {
            Some(last_error())
        } else {
            None
        };
        // SAFETY: handle is a live kernel handle owned by this function.
        let close_ok = unsafe { CloseHandle(handle) };
        if flush_error.is_some() {
            return flush_deny("WINDOWS_DIRECTORY_FLUSH_REFUSED", flush_error);
        }
        if close_ok == 0 {
            return flush_deny("WINDOWS_DIRECTORY_CLOSE_REFUSED", Some(last_error()));
        }
        WindowsDirectoryFlushVerdict::Candidate
    }

    fn publication_deny(
        code: &'static str,
        os_code: Option<u32>,
    ) -> WindowsGenerationPublicationVerdict {
        WindowsGenerationPublicationVerdict::Deny(WindowsHostProbeError { code, os_code })
    }

    fn io_code(error: &std::io::Error) -> Option<u32> {
        error
            .raw_os_error()
            .and_then(|code| u32::try_from(code).ok())
    }

    fn generation_id_valid(generation_id: &str) -> bool {
        generation_id.len() == 64
            && generation_id
                .bytes()
                .all(|value| value.is_ascii_digit() || (b'a'..=b'f').contains(&value))
    }

    fn close_file(file: File) -> Result<(), u32> {
        let handle = file.into_raw_handle().cast::<c_void>();
        // SAFETY: ownership of the live handle moved out of File and into this
        // function, so exactly one CloseHandle call is required.
        if unsafe { CloseHandle(handle) } == 0 {
            Err(last_error())
        } else {
            Ok(())
        }
    }

    fn open_file_identity(file: &File) -> Result<Option<OpenFileIdentity>, u32> {
        let mut information = ByHandleFileInformation {
            attributes: 0,
            creation_time: FileTime { low: 0, high: 0 },
            last_access_time: FileTime { low: 0, high: 0 },
            last_write_time: FileTime { low: 0, high: 0 },
            volume_serial_number: 0,
            file_size_high: 0,
            file_size_low: 0,
            number_of_links: 0,
            file_index_high: 0,
            file_index_low: 0,
        };
        // SAFETY: file owns a live handle and information is a writable
        // BY_HANDLE_FILE_INFORMATION-compatible value for the call.
        if unsafe {
            GetFileInformationByHandle(file.as_raw_handle().cast::<c_void>(), &mut information)
        } == 0
        {
            return Err(last_error());
        }
        if information.attributes & (FILE_ATTRIBUTE_DIRECTORY | FILE_ATTRIBUTE_REPARSE_POINT) != 0
            || information.number_of_links != 1
        {
            return Ok(None);
        }
        Ok(Some(OpenFileIdentity {
            attributes: information.attributes,
            volume_serial_number: information.volume_serial_number,
            byte_length: u64::from(information.file_size_high) << 32
                | u64::from(information.file_size_low),
            number_of_links: information.number_of_links,
            file_index: u64::from(information.file_index_high) << 32
                | u64::from(information.file_index_low),
            last_write_time: information.last_write_time,
        }))
    }

    fn read_exact_candidate(path: &Path, expected: &[u8]) -> Result<bool, u32> {
        let mut file = OpenOptions::new()
            .read(true)
            .share_mode(0)
            .custom_flags(FILE_FLAG_OPEN_REPARSE_POINT)
            .open(path)
            .map_err(|error| io_code(&error).unwrap_or(1))?;
        let before = match open_file_identity(&file)? {
            Some(identity) => identity,
            None => {
                close_file(file)?;
                return Ok(false);
            }
        };
        if usize::try_from(before.byte_length).ok() != Some(expected.len()) {
            close_file(file)?;
            return Ok(false);
        }
        let mut observed = Vec::with_capacity(expected.len());
        file.read_to_end(&mut observed)
            .map_err(|error| io_code(&error).unwrap_or(1))?;
        let after = open_file_identity(&file)?;
        close_file(file)?;
        Ok(after == Some(before) && observed == expected)
    }

    fn stage_path(directory: &Path, generation_id: &str) -> Result<PathBuf, ()> {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| ())?
            .as_nanos();
        Ok(directory.join(format!(
            ".registry-generation-{generation_id}.{}-{nonce}.tmp",
            std::process::id(),
        )))
    }

    fn publish_generation_observed<F>(
        directory: &Path,
        generation_id: &str,
        bytes: &[u8],
        mut observe: F,
    ) -> WindowsGenerationPublicationVerdict
    where
        F: FnMut(&'static str),
    {
        if !generation_id_valid(generation_id)
            || bytes.is_empty()
            || bytes.len() > MAX_GENERATION_BYTES
        {
            return publication_deny("WINDOWS_PUBLICATION_INPUT_REFUSED", None);
        }
        if !matches!(probe(directory), WindowsHostProbeVerdict::Candidate(_)) {
            return publication_deny("WINDOWS_PUBLICATION_HOST_NOT_CANDIDATE", None);
        }
        let final_path = directory.join(format!("registry-generation-{generation_id}.json"));
        if final_path.exists() {
            return match read_exact_candidate(&final_path, bytes) {
                Ok(true)
                    if matches!(
                        flush_directory(directory),
                        WindowsDirectoryFlushVerdict::Candidate
                    ) =>
                {
                    WindowsGenerationPublicationVerdict::Candidate {
                        byte_length: bytes.len(),
                    }
                }
                Ok(_) => publication_deny("WINDOWS_PUBLICATION_COLLISION", None),
                Err(code) => {
                    publication_deny("WINDOWS_PUBLICATION_EXISTING_READ_REFUSED", Some(code))
                }
            };
        }
        let staging_path = match stage_path(directory, generation_id) {
            Ok(path) => path,
            Err(()) => return publication_deny("WINDOWS_PUBLICATION_NONCE_UNAVAILABLE", None),
        };
        let mut staging = match OpenOptions::new()
            .write(true)
            .create_new(true)
            .share_mode(0)
            .custom_flags(FILE_FLAG_WRITE_THROUGH)
            .open(&staging_path)
        {
            Ok(file) => file,
            Err(error) => {
                return publication_deny("WINDOWS_PUBLICATION_STAGE_OPEN_REFUSED", io_code(&error));
            }
        };
        observe("stage-opened");
        let staged = (|| -> Result<(), (&'static str, Option<u32>)> {
            staging
                .write_all(bytes)
                .map_err(|error| ("WINDOWS_PUBLICATION_WRITE_REFUSED", io_code(&error)))?;
            observe("bytes-written");
            staging
                .flush()
                .map_err(|error| ("WINDOWS_PUBLICATION_USER_FLUSH_REFUSED", io_code(&error)))?;
            // SAFETY: staging owns a live file handle for the duration of the
            // call. FlushFileBuffers is the required file-data barrier.
            if unsafe { FlushFileBuffers(staging.as_raw_handle().cast::<c_void>()) } == 0 {
                return Err(("WINDOWS_PUBLICATION_FILE_FLUSH_REFUSED", Some(last_error())));
            }
            observe("file-flushed");
            let identity = open_file_identity(&staging)
                .map_err(|code| ("WINDOWS_PUBLICATION_STAGE_STAT_REFUSED", Some(code)))?;
            if identity.and_then(|value| usize::try_from(value.byte_length).ok())
                != Some(bytes.len())
            {
                return Err(("WINDOWS_PUBLICATION_SHORT_WRITE", None));
            }
            Ok(())
        })();
        if let Err((code, os_code)) = staged {
            drop(staging);
            return publication_deny(code, os_code);
        }
        if let Err(code) = close_file(staging) {
            return publication_deny("WINDOWS_PUBLICATION_STAGE_CLOSE_REFUSED", Some(code));
        }
        observe("stage-closed");

        let staging_wide = match wide_nul(staging_path.as_os_str()) {
            Some(value) => value,
            None => return publication_deny("WINDOWS_PUBLICATION_STAGE_PATH_REFUSED", None),
        };
        let final_wide = match wide_nul(final_path.as_os_str()) {
            Some(value) => value,
            None => return publication_deny("WINDOWS_PUBLICATION_FINAL_PATH_REFUSED", None),
        };
        // SAFETY: both paths are NUL-terminated and remain alive. No replace
        // flag is supplied, so an existing destination cannot be overwritten.
        let moved = unsafe {
            MoveFileExW(
                staging_wide.as_ptr(),
                final_wide.as_ptr(),
                MOVEFILE_WRITE_THROUGH,
            )
        };
        if moved == 0 {
            let move_error = last_error();
            return match read_exact_candidate(&final_path, bytes) {
                Ok(true)
                    if matches!(
                        flush_directory(directory),
                        WindowsDirectoryFlushVerdict::Candidate
                    ) =>
                {
                    WindowsGenerationPublicationVerdict::Candidate {
                        byte_length: bytes.len(),
                    }
                }
                _ => publication_deny("WINDOWS_PUBLICATION_MOVE_REFUSED", Some(move_error)),
            };
        }
        observe("published");

        let reopened = read_exact_candidate(&final_path, bytes);
        if !matches!(reopened, Ok(true)) {
            return publication_deny("WINDOWS_PUBLICATION_REOPEN_REFUSED", None);
        }
        observe("reopened-verified");
        let directory_flushed = matches!(
            flush_directory(directory),
            WindowsDirectoryFlushVerdict::Candidate
        );
        if !directory_flushed {
            return publication_deny("WINDOWS_PUBLICATION_BARRIER_REFUSED", None);
        }
        observe("directory-flushed");
        WindowsGenerationPublicationVerdict::Candidate {
            byte_length: bytes.len(),
        }
    }

    pub fn publish_generation(
        directory: &Path,
        generation_id: &str,
        bytes: &[u8],
    ) -> WindowsGenerationPublicationVerdict {
        publish_generation_observed(directory, generation_id, bytes, |_| {})
    }

    #[cfg(feature = "fault-injection")]
    pub fn publish_generation_fault_candidate<F>(
        directory: &Path,
        generation_id: &str,
        bytes: &[u8],
        observe: F,
    ) -> WindowsGenerationPublicationVerdict
    where
        F: FnMut(&'static str),
    {
        publish_generation_observed(directory, generation_id, bytes, observe)
    }
}

pub fn probe_windows_host(path: &Path) -> WindowsHostProbeVerdict {
    #[cfg(windows)]
    {
        windows::probe(path)
    }
    #[cfg(not(windows))]
    {
        let _ = path;
        deny("WINDOWS_PLATFORM_UNAVAILABLE", None)
    }
}

pub fn flush_windows_directory_candidate(path: &Path) -> WindowsDirectoryFlushVerdict {
    #[cfg(windows)]
    {
        windows::flush_directory(path)
    }
    #[cfg(not(windows))]
    {
        let _ = path;
        WindowsDirectoryFlushVerdict::Deny(WindowsHostProbeError {
            code: "WINDOWS_PLATFORM_UNAVAILABLE",
            os_code: None,
        })
    }
}

pub fn publish_windows_generation_candidate(
    directory: &Path,
    generation_id: &str,
    bytes: &[u8],
) -> WindowsGenerationPublicationVerdict {
    #[cfg(windows)]
    {
        windows::publish_generation(directory, generation_id, bytes)
    }
    #[cfg(not(windows))]
    {
        let _ = (directory, generation_id, bytes);
        WindowsGenerationPublicationVerdict::Deny(WindowsHostProbeError {
            code: "WINDOWS_PLATFORM_UNAVAILABLE",
            os_code: None,
        })
    }
}

#[cfg(feature = "fault-injection")]
#[doc(hidden)]
pub fn publish_windows_generation_fault_candidate<F>(
    directory: &Path,
    generation_id: &str,
    bytes: &[u8],
    observe: F,
) -> WindowsGenerationPublicationVerdict
where
    F: FnMut(&'static str),
{
    #[cfg(windows)]
    {
        windows::publish_generation_fault_candidate(directory, generation_id, bytes, observe)
    }
    #[cfg(not(windows))]
    {
        let _ = (directory, generation_id, bytes, observe);
        WindowsGenerationPublicationVerdict::Deny(WindowsHostProbeError {
            code: "WINDOWS_PLATFORM_UNAVAILABLE",
            os_code: None,
        })
    }
}
