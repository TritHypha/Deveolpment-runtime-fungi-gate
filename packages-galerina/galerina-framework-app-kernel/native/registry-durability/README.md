# Registry durability native experiments

Status: host, directory-barrier and generation-publication candidates;
non-authorizing

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

The generation-publication candidate exercises the complete Windows syscall
order without granting authority:

- accepts only a lowercase 64-hex generation identity and 1 byte–16 MiB;
- re-runs host admission before any write;
- creates a unique same-directory staging file exclusively with write-through
  requested and no sharing;
- writes, flushes, calls `FlushFileBuffers`, checks the open-handle file
  identity and single-link state, and checks close;
- calls `MoveFileExW(MOVEFILE_WRITE_THROUGH)` without replacement;
- re-opens with no sharing and `FILE_FLAG_OPEN_REPARSE_POINT`, refuses
  directories, reparse points and multi-link files, reads exact bytes, and
  requires stable volume/file identity and metadata;
- runs the native directory barrier before returning `Candidate`;
- treats an existing exact single-link generation as idempotent and refuses an
  existing-different or hard-linked collision.

The caller remains responsible for proving that the supplied ID is the
domain-separated digest of the canonical bytes. The Rust function deliberately
does not mint a generation identity or production receipt.
An uncertain failure does not delete a path after closing its handle; it may
leave a non-authoritative staging orphan for a future identity-checked
reclaimer rather than risk deleting a raced object.

The non-Windows build is total and always returns
`WINDOWS_PLATFORM_UNAVAILABLE`.

## Verification

From this directory:

```text
cargo fmt --check
cargo test --locked
cargo test --locked --all-features
cargo build --locked --release
```

The focused test suite covers the pure filesystem/drive matrix, the live local
Windows temp volume, malformed and unavailable paths, a reparse-ancestor case
when the host permits creation of a disposable directory link, the live
directory `FlushFileBuffers` barrier, publication idempotence, an
existing-different collision and a hard-link collision. Current evidence is
7/7.

The non-default `fault-injection` feature builds a disposable worker and an
observer seam that cannot mint a receipt. The integration test starts a fresh
worker for each of seven boundaries—stage open, bytes written, file flush,
stage close, publication, exact re-open and directory flush—waits for that
exact boundary, terminates the process, and then verifies the prior generation
is unchanged and the candidate name is absent or contains the complete exact
bytes. The seven-boundary process-termination matrix passes on the current
Windows 10 NTFS host. Default builds do not compile this worker or observer
API, and an optimized build with `fault-injection` enabled is rejected at
compile time.

## Security boundary

These experiments are not a security authority. Namespace state can change between
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

The successful live publication test likewise proves only the observed API
sequence and exact re-read on one disposable directory. It does not prove that
the old-or-new invariant survives process kill, kernel crash, reboot or
physical power loss. It also cannot close a hostile parent-directory rename
race because Win32 publication remains path-addressed rather than relative to
a retained directory handle.

Process termination is stronger evidence than deterministic simulation but is
not kernel-crash, reboot or physical power-loss evidence. It also cannot prove
that controller caches honoured the requested barriers.

No shell, PowerShell process, spawned CLI or writable sidecar is used by this
crate.

## Primary platform references

- [GetVolumePathNameW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getvolumepathnamew)
- [GetDriveTypeW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getdrivetypew)
- [GetVolumeInformationW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getvolumeinformationw)
- [GetFileAttributesW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getfileattributesw)
- [CreateFileW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew)
- [FlushFileBuffers](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-flushfilebuffers)
- [GetFileInformationByHandle](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getfileinformationbyhandle)
- [MoveFileExW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-movefileexw)

The later publication primitive is separately constrained by
`FlushFileBuffers`, exclusive namespace publication and physical durability
evidence. Host classification alone is intentionally insufficient.
