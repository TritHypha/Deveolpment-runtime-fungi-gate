use std::collections::{BTreeMap, BTreeSet};
use std::ffi::c_void;
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Seek, SeekFrom};
use std::os::windows::fs::{MetadataExt, OpenOptionsExt};
use std::os::windows::io::AsRawHandle;
use std::path::{Path, PathBuf};

use crate::protocol::{parse_canonical_body, sha256_hex, Refusal, Value};

const FILE_ATTRIBUTE_DIRECTORY: u32 = 0x10;
const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x400;
const FILE_FLAG_OPEN_REPARSE_POINT: u32 = 0x0020_0000;
const FILE_SHARE_READ: u32 = 0x1;
const MAX_IDENTITY_BYTES: u64 = 268_435_456;

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

#[link(name = "kernel32")]
unsafe extern "system" {
    fn GetFileInformationByHandle(
        file: *mut c_void,
        information: *mut ByHandleFileInformation,
    ) -> i32;
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct FileIdentity {
    volume_serial: u32,
    file_index: u64,
    byte_length: u64,
    links: u32,
    last_write: FileTime,
}

pub struct AdmittedFile {
    pub path: PathBuf,
    pub digest: String,
    #[allow(dead_code)]
    file: File,
}

pub struct AdmittedPackage {
    pub launcher: AdmittedFile,
    pub runtime: AdmittedFile,
    pub worker: AdmittedFile,
    #[allow(dead_code)]
    pub protocol: AdmittedFile,
    pub package_root: PathBuf,
    pub registry_digest: String,
    pub environment: BTreeMap<String, String>,
    pub scalar_profile_digest: String,
    pub timeout_ms: u32,
}

struct RegisteredFile {
    path: PathBuf,
    digest: String,
    volume_serial: u32,
    file_index: u64,
    byte_length: u64,
}

fn refusal(code: &'static str) -> Refusal {
    Refusal::new(code)
}

fn object<'a>(
    value: &'a Value,
    code: &'static str,
) -> Result<&'a BTreeMap<String, Value>, Refusal> {
    match value {
        Value::Object(fields) => Ok(fields),
        _ => Err(refusal(code)),
    }
}

fn exact_fields(
    fields: &BTreeMap<String, Value>,
    expected: &[&str],
    code: &'static str,
) -> Result<(), Refusal> {
    let expected: BTreeSet<_> = expected.iter().copied().collect();
    if fields.len() != expected.len() || fields.keys().any(|key| !expected.contains(key.as_str())) {
        return Err(refusal(code));
    }
    Ok(())
}

fn string_field<'a>(
    fields: &'a BTreeMap<String, Value>,
    key: &str,
    code: &'static str,
) -> Result<&'a str, Refusal> {
    match fields.get(key) {
        Some(Value::String(value)) => Ok(value),
        _ => Err(refusal(code)),
    }
}

fn number_field(
    fields: &BTreeMap<String, Value>,
    key: &str,
    code: &'static str,
) -> Result<i64, Refusal> {
    match fields.get(key) {
        Some(Value::Number(value)) => Ok(*value),
        _ => Err(refusal(code)),
    }
}

fn decimal_field(
    fields: &BTreeMap<String, Value>,
    key: &str,
    code: &'static str,
) -> Result<u64, Refusal> {
    string_field(fields, key, code)?
        .parse::<u64>()
        .map_err(|_| refusal(code))
}

fn registered_file(value: &Value) -> Result<RegisteredFile, Refusal> {
    let fields = object(value, "REGISTRY_FILE")?;
    exact_fields(
        fields,
        &["byteLength", "digest", "fileIndex", "path", "volumeSerial"],
        "REGISTRY_FILE",
    )?;
    let digest = string_field(fields, "digest", "REGISTRY_FILE")?;
    if digest.len() != 64 || !digest.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err(refusal("REGISTRY_FILE"));
    }
    Ok(RegisteredFile {
        path: PathBuf::from(string_field(fields, "path", "REGISTRY_FILE")?),
        digest: digest.to_string(),
        volume_serial: decimal_field(fields, "volumeSerial", "REGISTRY_FILE")?
            .try_into()
            .map_err(|_| refusal("REGISTRY_FILE"))?,
        file_index: decimal_field(fields, "fileIndex", "REGISTRY_FILE")?,
        byte_length: decimal_field(fields, "byteLength", "REGISTRY_FILE")?,
    })
}

fn handle_identity(file: &File) -> Result<FileIdentity, Refusal> {
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
    let ok = unsafe {
        GetFileInformationByHandle(file.as_raw_handle().cast::<c_void>(), &mut information)
    };
    if ok == 0 {
        return Err(refusal("FILE_IDENTITY"));
    }
    Ok(FileIdentity {
        volume_serial: information.volume_serial_number,
        file_index: u64::from(information.file_index_high) << 32
            | u64::from(information.file_index_low),
        byte_length: u64::from(information.file_size_high) << 32
            | u64::from(information.file_size_low),
        links: information.number_of_links,
        last_write: information.last_write_time,
    })
}

fn display_canonical(path: &Path) -> Result<String, Refusal> {
    let resolved = fs::canonicalize(path).map_err(|_| refusal("FILE_OPEN"))?;
    let text = resolved.to_string_lossy();
    Ok(text.strip_prefix(r"\\?\").unwrap_or(&text).to_string())
}

fn reject_reparse_components(path: &Path) -> Result<(), Refusal> {
    let mut ancestors: Vec<_> = path.ancestors().collect();
    ancestors.reverse();
    for ancestor in ancestors {
        let metadata = fs::symlink_metadata(ancestor).map_err(|_| refusal("FILE_OPEN"))?;
        if metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0 {
            return Err(refusal("FILE_REPARSE"));
        }
    }
    Ok(())
}

fn read_and_hash(file: &File) -> Result<(Vec<u8>, String), Refusal> {
    let mut reader = file.try_clone().map_err(|_| refusal("FILE_READ"))?;
    reader
        .seek(SeekFrom::Start(0))
        .map_err(|_| refusal("FILE_READ"))?;
    let mut bytes = Vec::new();
    reader
        .take(MAX_IDENTITY_BYTES + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| refusal("FILE_READ"))?;
    if bytes.len() as u64 > MAX_IDENTITY_BYTES {
        return Err(refusal("FILE_BOUND"));
    }
    let digest = sha256_hex(&bytes);
    Ok((bytes, digest))
}

fn open_admitted(
    registered: &RegisteredFile,
    digest_code: &'static str,
) -> Result<(AdmittedFile, Vec<u8>), Refusal> {
    if !registered.path.is_absolute() {
        return Err(refusal("FILE_PATH"));
    }
    reject_reparse_components(&registered.path)?;
    let requested = registered.path.to_string_lossy();
    if display_canonical(&registered.path)? != requested {
        return Err(refusal("FILE_PATH_CASE"));
    }
    let file = OpenOptions::new()
        .read(true)
        .share_mode(FILE_SHARE_READ)
        .custom_flags(FILE_FLAG_OPEN_REPARSE_POINT)
        .open(&registered.path)
        .map_err(|_| refusal("FILE_OPEN"))?;
    let metadata = file.metadata().map_err(|_| refusal("FILE_IDENTITY"))?;
    if metadata.file_attributes() & (FILE_ATTRIBUTE_DIRECTORY | FILE_ATTRIBUTE_REPARSE_POINT) != 0 {
        return Err(refusal("FILE_REPARSE"));
    }
    let before = handle_identity(&file)?;
    if before.links != 1 {
        return Err(refusal("FILE_LINK_COUNT"));
    }
    if before.volume_serial != registered.volume_serial
        || before.file_index != registered.file_index
        || before.byte_length != registered.byte_length
    {
        return Err(refusal("FILE_IDENTITY"));
    }
    let (bytes, digest) = read_and_hash(&file)?;
    if digest != registered.digest {
        return Err(refusal(digest_code));
    }
    if handle_identity(&file)? != before {
        return Err(refusal("FILE_CHANGED"));
    }
    Ok((
        AdmittedFile {
            path: registered.path.clone(),
            digest,
            file,
        },
        bytes,
    ))
}

fn pinned_test_digest(name: &str) -> Option<&'static str> {
    #[cfg(test_contract)]
    {
        return match name {
            "runtime" => option_env!("GALERINA_TEST_RUNTIME_DIGEST"),
            "worker" => option_env!("GALERINA_TEST_WORKER_DIGEST"),
            "protocol" => option_env!("GALERINA_TEST_PROTOCOL_DIGEST"),
            _ => None,
        };
    }
    #[cfg(not(test_contract))]
    {
        let _ = name;
        None
    }
}

fn package_graph_digest(worker_digest: &str, protocol_digest: &str) -> String {
    let mut bytes = b"galerina.requirement-worker-package.v1\0".to_vec();
    bytes.extend_from_slice(worker_digest.as_bytes());
    bytes.push(0);
    bytes.extend_from_slice(protocol_digest.as_bytes());
    sha256_hex(&bytes)
}

pub fn verify_registry(registry_path: &Path) -> Result<AdmittedPackage, Refusal> {
    if !registry_path.is_absolute() {
        return Err(refusal("REGISTRY_PATH"));
    }
    if !registry_path.exists() {
        return Err(refusal("REGISTRY_OPEN"));
    }
    if reject_reparse_components(registry_path).is_err() {
        return Err(refusal("REGISTRY_REPARSE"));
    }
    let file = OpenOptions::new()
        .read(true)
        .share_mode(FILE_SHARE_READ)
        .custom_flags(FILE_FLAG_OPEN_REPARSE_POINT)
        .open(registry_path)
        .map_err(|_| refusal("REGISTRY_OPEN"))?;
    let metadata = file.metadata().map_err(|_| refusal("REGISTRY_IDENTITY"))?;
    if metadata.file_attributes() & (FILE_ATTRIBUTE_DIRECTORY | FILE_ATTRIBUTE_REPARSE_POINT) != 0 {
        return Err(refusal("REGISTRY_REPARSE"));
    }
    let before = handle_identity(&file)?;
    if before.links != 1 {
        return Err(refusal("REGISTRY_LINK_COUNT"));
    }
    let (bytes, registry_digest) = read_and_hash(&file)?;
    if handle_identity(&file)? != before {
        return Err(refusal("REGISTRY_CHANGED"));
    }
    let root = parse_canonical_body(&bytes)?;
    let fields = object(&root, "REGISTRY_SCHEMA")?;
    exact_fields(
        fields,
        &[
            "environment",
            "launcher",
            "packageRoot",
            "packageRootDigest",
            "protocol",
            "runtime",
            "scalarProfileDigest",
            "schemaVersion",
            "timeoutMs",
            "worker",
        ],
        "REGISTRY_SCHEMA",
    )?;
    if number_field(fields, "schemaVersion", "REGISTRY_SCHEMA")? != 1 {
        return Err(refusal("REGISTRY_SCHEMA"));
    }
    let launcher_record = registered_file(
        fields
            .get("launcher")
            .ok_or_else(|| refusal("REGISTRY_SCHEMA"))?,
    )?;
    let runtime_record = registered_file(
        fields
            .get("runtime")
            .ok_or_else(|| refusal("REGISTRY_SCHEMA"))?,
    )?;
    let worker_record = registered_file(
        fields
            .get("worker")
            .ok_or_else(|| refusal("REGISTRY_SCHEMA"))?,
    )?;
    let protocol_record = registered_file(
        fields
            .get("protocol")
            .ok_or_else(|| refusal("REGISTRY_SCHEMA"))?,
    )?;

    if Some(runtime_record.digest.as_str()) != pinned_test_digest("runtime") {
        return Err(refusal("RUNTIME_DIGEST"));
    }
    if Some(worker_record.digest.as_str()) != pinned_test_digest("worker") {
        return Err(refusal("WORKER_DIGEST"));
    }
    if Some(protocol_record.digest.as_str()) != pinned_test_digest("protocol") {
        return Err(refusal("PROTOCOL_DIGEST"));
    }
    let current = std::env::current_exe().map_err(|_| refusal("LAUNCHER_PATH"))?;
    if display_canonical(&current)? != launcher_record.path.to_string_lossy() {
        return Err(refusal("LAUNCHER_PATH"));
    }

    let (launcher, _) = open_admitted(&launcher_record, "LAUNCHER_DIGEST")?;
    let (runtime, _) = open_admitted(&runtime_record, "RUNTIME_DIGEST")?;
    let (worker, _) = open_admitted(&worker_record, "WORKER_DIGEST")?;
    let (protocol, _) = open_admitted(&protocol_record, "PROTOCOL_DIGEST")?;
    let expected_protocol = worker
        .path
        .parent()
        .ok_or_else(|| refusal("PROTOCOL_PATH"))?
        .join("requirement-process-protocol.js");
    if protocol.path != expected_protocol {
        return Err(refusal("PROTOCOL_PATH"));
    }

    let package_root = PathBuf::from(string_field(fields, "packageRoot", "PACKAGE_ROOT")?);
    if !package_root.is_absolute()
        || display_canonical(&package_root)? != package_root.to_string_lossy()
    {
        return Err(refusal("PACKAGE_ROOT"));
    }
    let package_root_digest = string_field(fields, "packageRootDigest", "PACKAGE_ROOT")?;
    if package_graph_digest(&worker.digest, &protocol.digest) != package_root_digest {
        return Err(refusal("PACKAGE_ROOT"));
    }

    let scalar_profile_digest = string_field(fields, "scalarProfileDigest", "PROFILE_DIGEST")?;
    if scalar_profile_digest != sha256_hex(b"scalar-1") {
        return Err(refusal("PROFILE_DIGEST"));
    }
    let timeout_ms: u32 = number_field(fields, "timeoutMs", "TIMEOUT")?
        .try_into()
        .ok()
        .filter(|value| (1..=30_000).contains(value))
        .ok_or_else(|| refusal("TIMEOUT"))?;

    let environment_fields = object(
        fields
            .get("environment")
            .ok_or_else(|| refusal("ENVIRONMENT"))?,
        "ENVIRONMENT",
    )?;
    exact_fields(
        environment_fields,
        &["COMSPEC", "SystemRoot", "TEMP", "TMP", "WINDIR"],
        "ENVIRONMENT",
    )?;
    let mut environment = BTreeMap::new();
    for key in ["COMSPEC", "SystemRoot", "TEMP", "TMP", "WINDIR"] {
        let value = string_field(environment_fields, key, "ENVIRONMENT")?;
        if value.is_empty() || value.contains('\0') {
            return Err(refusal("ENVIRONMENT"));
        }
        environment.insert(key.to_string(), value.to_string());
    }

    Ok(AdmittedPackage {
        launcher,
        runtime,
        worker,
        protocol,
        package_root,
        registry_digest,
        environment,
        scalar_profile_digest: scalar_profile_digest.to_string(),
        timeout_ms,
    })
}
