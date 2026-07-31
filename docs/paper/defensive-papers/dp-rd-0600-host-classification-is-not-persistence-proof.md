# Host classification is not persistence proof

**Disclosure ID:** DP-RD-0600 · **Date:** 2026-07-30 · **Type:** defensive
publication (prior-art disclosure — NOT a patent claim) · **Tier:**
defensive-pub · **Status:** candidate construction; production durability is
not implemented or admitted · **Novelty:** disclaimed

## Abstract

A software update path can correctly identify a local filesystem and still
fail to prove that newly published authority survives a crash. This note
records a two-stage construction for a content-addressed registry:

1. a bounded, non-authorizing host probe may refuse unsupported paths,
   namespace indirection, remote drives and unknown filesystems; and
2. a separately admitted persistence primitive must own the complete
   write/barrier/exclusive-publication/re-open/metadata-barrier operation and
   demonstrate recovery under real faults.

The critical rule is that stage 1 can only deny or produce a candidate. It can
never authorize stage 2. This prevents a successful filesystem query from
being laundered into a durability claim.

## Threat model

The operating system, namespace, filesystem, storage stack, process memory and
co-resident software are treated as fallible or hostile. Relevant failures
include path substitution, reparse or symlink traversal, network and removable
storage, short writes, disk-full behavior, reordered persistence, failed
barriers, process termination, restart, controller caches and power loss.

The safety invariant is:

> After every failure or uncertainty, selected authority is either the prior
> complete generation or the newly verified complete generation; mixed,
> unverified or uncovered state is never selected.

An observation that a volume is local NTFS, ReFS, ext4, XFS, Btrfs or APFS is
not evidence that this invariant held.

## Construction

### Stage 1 — bounded host classification

The candidate Windows probe accepts one absolute existing directory. It
refuses `.` and `..`, a reparse point at the target, a reparse point in any
existing ancestor, unavailable attributes, non-fixed drives, filesystems other
than NTFS/ReFS and the `FILE_SUPPORTS_REMOTE_STORAGE` flag.

The probe uses documented operating-system queries:

- `GetFileAttributesW` for directory and reparse-point attributes;
- `GetVolumePathNameW` for the containing volume;
- `GetDriveTypeW` for the drive class; and
- `GetVolumeInformationW` for the filesystem name, serial and flags.

Its output is a closed `Candidate` or `Deny` record. It does not return an
authorization token, load a native module, open a write handle, publish a
generation or issue a persistence receipt. The non-Windows build denies.

### Stage 2 — content-bound persistence authority

A different component must:

1. load an exact source-reviewed binary through a fixed loader path;
2. re-derive its binary digest, ABI, target triple, toolchain and build-recipe
   identity without a caller-selected verifier;
3. obtain and retain least-authority handles that prevent a later path lookup
   from changing the object under test;
4. write bounded verified bytes to unique same-volume staging;
5. flush file data and propagate every error;
6. publish exclusively without replacing existing authority;
7. re-open, re-read, re-hash and re-verify the published generation;
8. perform the strongest admitted metadata/directory persistence barrier; and
9. emit a production receipt only after a real-platform evidence digest is
   itself admitted.

Unknown results, unsupported storage, loader races and unexecuted evidence all
refuse. A shell, spawned command, writable sidecar or callback that merely
returns `true` is outside the authority boundary.

## Why the separation matters

Microsoft documents the meaning of drive and volume queries, not a
crash-survival theorem for an application protocol. `FlushFileBuffers`
operates on an open handle, while `MoveFileExW` has distinct publication and
write-through behavior. On Linux, `fsync(2)` explicitly distinguishes file
data from the containing directory entry. Apple documents `F_FULLFSYNC` as a
stronger request than ordinary `fsync`, while the hardware guarantee remains
bounded by the storage stack.

Accordingly, “supported local filesystem” is necessary input to a support
matrix but is never sufficient proof of persistence. Combining the two stages
into one permissive Boolean would erase that distinction and create an
authority-confusion fault.

## Executable evidence and honest limits

The Windows host-probe crate is dependency-free and has four focused tests:

- pure admission admits fixed NTFS/ReFS and refuses remote, remote-storage and
  unlisted filesystem facts;
- the live temporary-directory probe is total and verifies only the measured
  local candidate facts;
- relative and unavailable paths refuse; and
- a disposable reparse ancestor refuses when the host permits creating it.

The reparse-ancestor test first exposed a real gap: checking only the final
directory accepted an indirect ancestor. The implementation was then changed
to inspect every existing ancestor, and the four-test suite passed.

This evidence does **not** cover an in-process binary loader, a write or flush,
exclusive publication, reboot, power loss, Linux, macOS, ReFS, or a Windows 11
host. The path checks also remain susceptible to namespace TOCTOU if reused as
authority; the production design must operate on retained handles rather than
trusting this preflight result.

## Falsification plan

The construction should be rejected or remain non-authorizing if any of these
tests succeeds unexpectedly:

1. a network, removable, reparse-mediated or unsupported volume reaches
   `Candidate`;
2. malformed, inherited, accessor-backed or extra host facts are accepted by
   the higher-level descriptor;
3. a measured path can be substituted between probe and retained-handle
   acquisition;
4. a binary with the right filename but the wrong digest, ABI or target loads;
5. short write, disk full, access denial or any failed barrier produces a
   production receipt;
6. a kill, reboot or power-loss campaign selects mixed bytes;
7. an unexecuted platform row is inferred from another operating system; or
8. a candidate result can be transformed into a production receipt by copying
   fields or a digest.

## Zero-trust adoption score

The host probe scores **7.7/10 — ADOPT-WITH-CONTROLS as non-authorizing
telemetry only**:

| Dimension | Score | Reason |
|---|---:|---|
| Authority separation | 10 | Candidate cannot mint production authority |
| Fail-close behavior | 9 | Unsupported, unknown and non-Windows paths deny |
| Input/namespace integrity | 8 | Closed checks and ancestor refusal; handle-level TOCTOU still open |
| Supply-chain/provenance | 6 | Zero dependencies, but binary loader proof is not implemented |
| Determinism | 8 | Pure matrix is deterministic; live host facts vary by machine |
| Recovery/durability | 3 | No write, barrier, crash or power-loss evidence |
| Compatibility | 7 | Windows probe builds elsewhere but denies; other platform probes absent |
| Test/falsification evidence | 8 | Red/green reparse regression plus four focused tests |
| Benefit/cost | 9 | Small refusal surface with no authority grant |

No adoption score is assigned to the production adapter because it does not
yet exist. The hard veto remains active: host classification must never be
treated as persistence proof.

## Primary references

- Microsoft,
  [`GetFileAttributesW`](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getfileattributesw)
- Microsoft,
  [`GetVolumePathNameW`](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getvolumepathnamew)
- Microsoft,
  [`GetDriveTypeW`](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getdrivetypew)
- Microsoft,
  [`GetVolumeInformationW`](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getvolumeinformationw)
- Microsoft,
  [`FlushFileBuffers`](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-flushfilebuffers)
- Microsoft,
  [`MoveFileExW`](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-movefileexw)
- Linux man-pages,
  [`fsync(2)`](https://www.man7.org/linux/man-pages/man2/fsync.2.html)
- Apple,
  [`fcntl(2)` (`F_FULLFSYNC`)](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/fcntl.2.html)

## Declarations

- **Type/tier:** defensive publication; engineering composition of established
  platform mechanisms; novelty disclaimed.
- **Authorship and AI assistance:** drafted with AI assistance under owner
  direction and grounded in the cited primary documentation and in-repository
  executable tests.
- **Funding:** none.
- **Competing interests:** none declared.
- **Data and artifact availability:** source and tests are in
  `packages-galerina/galerina-framework-app-kernel/native/registry-durability/`.
- **Licence:** Apache-2.0.
