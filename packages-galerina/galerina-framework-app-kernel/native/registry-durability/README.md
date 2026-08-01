# Registry durability native experiments

Status: Windows/Linux/macOS host, publication, fault and recovery-evidence
candidates; non-authorizing

The RD-0601 first-production-profile proof is also implemented. An optimized
`registry-durability-static-profile` executable calls this crate through a
compile-time link and reports the SHA-256 identities of the exact embedded
adapter source and authoritative `.fungi` contract, the closed ABI, release
profile, absence of fault injection and absence of an external adapter loader.
The repository verifier independently re-hashes both sources and the resulting
executable, then repeats the run from a directory containing a hostile decoy
`registry-durability.node`; the result must remain byte-identical. The receipt
is deliberately `productionAuthorizing: false`: signing the host and completing
the named platform crash/reboot/power-loss matrices remain separate gates.

This zero-dependency Rust crate implements deliberately narrow Windows, GNU
Linux and macOS durability candidates. A `Candidate` verdict means only that
the exact host-refusal checks and observed native operation passed. It does
**not** prove restart or physical power-loss durability, and it cannot mint a
Galerina production durability receipt.

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

The Linux candidate is now implemented but unexecuted. A platform-neutral
measured-facts model admits only a complete, stable, read-write direct-local
block device on exact lowercase ext4, XFS or Btrfs and refuses Device Mapper,
RAID, network, overlay, removable, virtual and unknown storage. Bounded complete
`/proc/self/mountinfo` parsing, deepest component-boundary selection, Linux
device-number decoding and a closed sysfs-classification model reject malformed,
surplus, symbolic, incomplete or changing facts. Pure evidence is 10/10 on
Windows; this is not a live Linux claim.

On a GNU Linux x86-64 or AArch64 build, the candidate opens and retains the direct directory,
correlates its stable device/inode identity with before/after mountinfo,
descriptor-anchored `fstatfs` and bounded `/sys/dev/block` facts, and then
applies the same pure admission gate. Publication remains relative to that
descriptor: exclusive `0600` staging, checked exact single-link identity, file
barrier, atomic no-replace `renameat2`, exact single-link re-open,
directory barrier and a final path/mount identity recheck. The Linux-only live
and process-termination tests are ignored by default and require the explicitly
named bare-host evidence directory. They have not yet executed; candidate
source is not evidence.

## Verification

From this directory:

```text
cargo fmt --check
cargo test --locked
cargo test --locked --all-features
cargo build --locked --release
node ../../../../scripts/verify-registry-static-profile.mjs
```

The focused test suite covers the pure filesystem/drive matrix, the live local
Windows temp volume, malformed and unavailable paths, a reparse-ancestor case
when the host permits creation of a disposable directory link, the live
directory `FlushFileBuffers` barrier, publication idempotence, an
existing-different collision and a hard-link collision. Current evidence is
7/7.

The initial Ubuntu Desktop run proves that the optimized static-link profile
and the earlier six-test pure Linux matrix compile and pass on one Ubuntu 24.04
x86-64 ext4 host. It does not prove the new Linux live source. The second
handover must compile and run the 10-test pure matrix, three ignored live tests
and ignored seven-boundary process-termination matrix. Missing, refused or
skipped Linux evidence remains unverified.

The macOS profile is independently implemented for native Arm64 on direct,
internal, non-removable, non-network APFS. It requires `F_FULLFSYNC` for the
generation file, exclusive same-directory staging/publication, exact
single-link reopen/readback, a directory barrier and a final namespace recheck.
Ordinary file `fsync` is not a fallback. The pure profile and off-host refusal
tests pass on Windows, and Apple Arm64 cross-target Clippy/check passes. Those
facts do not replace a live Apple Arm64 APFS run, fault matrix or process-
termination matrix.

The Windows profile now distinguishes native Windows 10 and Windows 11 facts
and admits only native x64 on fixed local NTFS. Translated processes, Arm64,
ReFS and unknown identities remain denied. The current Windows 10 NTFS host
passes the seven live/profile cases and the seven-boundary process-termination
matrix; no Windows 11 live result is inferred.

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

No shell, PowerShell process, spawned CLI or writable sidecar is used by the
production candidate. The non-default fault worker is test evidence only,
cannot mint a receipt, is absent from default builds and is compile-refused in
optimized builds.

The separate non-default `recovery-evidence` feature adds a controlled reboot/
power-loss worker and an independent old-or-new verifier. It is debug-only,
inherits the fault-injection restriction and is compile-refused in optimized
builds. The worker can arm one of the same seven boundaries and wait; it has no
reboot, shutdown or power-control API. Before arming live evidence it
independently refuses a target on the repository, home or system device. The
verifier is read-only except for exclusive creation of one result record and
refuses replay, copied/changed arm state, partial candidate bytes and ambiguous
checkpoints. The protocol suite passes 6/6. Actual reboot and power-loss rows
remain external sacrificial-host evidence and are never inferred from the
protocol tests. See
`docs/platform-handover/durability-recovery/RUNBOOK.md`.

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
