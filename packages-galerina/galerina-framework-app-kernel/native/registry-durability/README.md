# Registry durability native host probe

Status: candidate host classification only; non-authorizing

This zero-dependency Rust crate measures whether a Windows directory is on a
fixed local NTFS or ReFS volume. It is a deliberately narrow precursor to a
registry durability adapter. A `Candidate` verdict means only that the path
passed the implemented host-refusal checks. It does **not** prove that a write,
publication, metadata barrier, restart or physical power-loss sequence is
durable, and it cannot mint a Galerina production durability receipt.

## Implemented boundary

The Windows probe:

- accepts only absolute paths without `.` or `..` components;
- requires an existing direct directory;
- refuses a reparse point at the target or any existing ancestor;
- resolves the containing volume with `GetVolumePathNameW`;
- requires `GetDriveTypeW` to report `DRIVE_FIXED`;
- admits only NTFS or ReFS;
- refuses a volume reporting `FILE_SUPPORTS_REMOTE_STORAGE`;
- returns a bounded `Candidate` or `Deny` value without returning the path.

The crate also has a non-authorizing Windows directory-barrier candidate. It
first requires the host probe to return `Candidate`, opens the direct directory
with `CreateFileW` using `GENERIC_WRITE` and
`FILE_FLAG_BACKUP_SEMANTICS`, calls `FlushFileBuffers`, closes the handle and
returns `Candidate` only when every call succeeds. On the current Windows 10
fixed-local NTFS development host, this focused live test succeeds.

The non-Windows build is total and always returns
`WINDOWS_PLATFORM_UNAVAILABLE`.

## Verification

From this directory:

```text
cargo fmt --check
cargo test --locked
cargo build --locked --release
```

The focused test suite covers the pure filesystem/drive matrix, the live local
Windows temp volume, malformed and unavailable paths, a reparse-ancestor case
when the host permits creation of a disposable directory link, and the live
directory `FlushFileBuffers` barrier. Current evidence is 5/5.

## Security boundary

This probe is not a security authority. Namespace state can change between
measurement and later use (TOCTOU), and a local fixed volume can still sit on
virtual, removable-behind-a-controller or otherwise unreliable storage. A
production adapter must open and retain least-authority handles, bind the
loaded binary and ABI to the admitted descriptor, own the complete
write/flush/exclusive-publication/re-open/metadata-barrier sequence, and pass
real crash and power-loss tests. Until then, the production adapter digest
allow-list remains empty.

The successful live directory barrier proves only that the documented calls
were accepted on one Windows 10 NTFS host. It does not establish physical
durability, device-cache truthfulness, write/publication ordering, ReFS
behavior, Windows 11 behavior or recovery after a crash.

No shell, PowerShell process, spawned CLI or writable sidecar is used by this
crate.

## Primary platform references

- [GetVolumePathNameW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getvolumepathnamew)
- [GetDriveTypeW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getdrivetypew)
- [GetVolumeInformationW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getvolumeinformationw)
- [GetFileAttributesW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getfileattributesw)
- [CreateFileW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew)
- [FlushFileBuffers](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-flushfilebuffers)

The later publication primitive is separately constrained by
`FlushFileBuffers`, exclusive namespace publication and physical durability
evidence. Host classification alone is intentionally insufficient.
