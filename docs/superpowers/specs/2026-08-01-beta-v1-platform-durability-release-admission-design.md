# Beta-v1 platform durability and release-admission design

**Date:** 2026-08-01

**Status:** owner-approved for strict zero-trust implementation

**Policy:** verify rather than assume; fail closed `_=>`; platform variance is
allowed only where the declared semantics remain exact

## Outcome

Close the three remaining release gates in dependency order:

1. admit a fresh Ubuntu round-two live-adapter evidence set;
2. activate production rotation only through an exact admitted native
   durability profile; and
3. admit Galerina beta v1 only after every listed operating system has returned
   its own complete functional evidence and every production durability profile
   has returned the stronger recovery evidence required by its native boundary.

Galerina must build, check, compile and execute its bounded smoke workload on
Windows 10, Windows 11, Ubuntu, Debian, Fedora, Linux Mint and macOS without a
critical functional or security failure. Differences in timing, scheduling,
filesystem identity, native barrier and optional acceleration are expected and
are not failures when they remain inside a declared platform profile.

Production rotation has a narrower promise than general execution. It is
available only when the current host, filesystem, storage topology, adapter
source, linked executable, ABI and admitted evidence exactly match one governed
profile. Galerina continues to run on an unsupported or indeterminate storage
profile, but production rotation returns K3 `0` and terminates `_=>`; it never
falls back to an unverified persistence path.

## Alternatives considered

### Adopted: strict evidence ladder

Keep universal functional compatibility separate from storage-authority
admission. Hosted runners may prove compilation and bounded execution. Exact
bare hosts prove native adapter behavior. Process termination, controlled
reboot and controlled power loss remain distinct evidence classes. This is the
only approach that preserves the existing zero-trust contract.

### Rejected: narrow beta to Windows 10 and Ubuntu

This would remove red roadmap nodes by weakening the public compatibility
promise. It would also defer defects in Windows 11, macOS and the named Linux
families until after release. The owner did not authorize that reduction.

### Rejected: treat hosted CI or process kill as durability proof

Hosted virtual machines are valuable portability evidence but do not expose a
stable storage/controller identity or a controlled physical power boundary.
Process kill proves only process recovery. Neither can authorize a production
durability profile.

## Evidence classes

Every record uses one closed class. A verifier refuses a record whose claims
exceed its class.

| Class | What it may prove | What it may not prove |
|---|---|---|
| `FUNCTIONAL_PORTABILITY` | build, tests, strict `.fungi`, bounded compilation and execution on one exact OS/architecture | native durability or physical persistence |
| `NATIVE_LIVE` | exact host/storage admission plus successful write, barrier, publication, reopen and verification on one named profile | recovery after termination or loss |
| `PROCESS_TERMINATION` | old-or-new exact recovery after terminating the worker at every named boundary | kernel crash, reboot or power loss |
| `CONTROLLED_REBOOT` | recovery after an operator-controlled OS restart at every admitted reboot boundary | sudden power loss |
| `CONTROLLED_POWER_LOSS` | recovery after loss of power on a sacrificial evidence volume and named storage/controller profile | another device, filesystem or controller |
| `PRODUCTION_ADMISSION` | exact composition of all required lower evidence plus governed digest admission | broader platform or filesystem claims |

All evidence remains non-authorizing until the production admission verifier
recomputes its identities and returns the exact positive terminal state. A
self-hash, filename, prose report, CI badge or caller Boolean is insufficient.

## Platform compatibility matrix

### Functional beta matrix

The beta functional gate requires one complete record for each row:

- Windows 10 x64;
- Windows 11 x64;
- Ubuntu x64;
- Debian x64;
- Fedora x64;
- Linux Mint x64; and
- macOS Arm64, with an Intel build/contract lane retained where a current
  runner is available.

Every row runs the same closed platform-smoke contract, compiler build, strict
`.fungi` check, package aggregate, security/refusal tests and one real compiled
workload. Platform-specific test exclusions are allowed only when the receipt
names the unavailable feature and the common functional contract still passes.
Zero executed tests, silent skips, fallback execution and missing receipt facts
are terminal failures.

### Durability profiles

The first production profiles are deliberately narrow:

- Windows 10/11 x64 on fixed local NTFS; ReFS remains denied until separately
  measured;
- GNU Linux x64 on a direct, stable local block device using exact ext4;
  XFS and Btrfs remain denied until separately measured; and
- macOS Arm64 on direct local APFS using the strongest admitted full-flush
  primitive.

Debian, Ubuntu, Fedora and Mint must each pass functional execution. A Linux
durability receipt additionally binds the kernel, libc ABI, filesystem,
mount/device identities and adapter executable; a receipt from one
distribution cannot be relabelled as another distribution's functional run.
Where two distributions use the same admitted Linux adapter profile, each must
still execute the live and process-termination lanes. The more destructive
power-loss evidence binds the exact adapter/kernel/filesystem/storage profile,
not the distribution name alone.

## Native adapter contract

Every production adapter is compiled into the measured host. No shell,
PowerShell bridge, spawned CLI, writable sidecar, pathname-loaded addon or
caller callback enters the authority path.

The adapter owns one indivisible operation:

```text
admit retained directory/storage identity
  -> create exclusive same-directory stage
  -> write all canonical bytes with checked progress
  -> flush file data and required metadata
  -> publish without replacing an existing generation
  -> reopen by the retained authority boundary
  -> verify exact bytes, digest, identity and single-link state
  -> flush directory/namespace metadata
  -> recheck host, mount and namespace identity
  -> return CANDIDATE_NON_AUTHORIZING
```

Short writes, zero progress, access denial, disk full, interrupted operations,
unsupported barriers, collisions, links, reparse/symbolic components,
namespace changes, device changes, readback differences and close failures all
terminate without a receipt. Uncertain cleanup leaves only a named
non-authoritative orphan for a separately identity-checked reclaimer; it never
deletes a raced pathname to make a test look clean.

Platform primitives remain distinct:

- Linux uses descriptor-relative operations, `renameat2` with
  `RENAME_NOREPLACE`, exact file `fsync` and containing-directory `fsync`.
  The Linux manual explicitly requires the directory barrier for directory
  entry persistence.
- Windows uses the statically linked Win32 profile, exclusive same-directory
  staging, checked `FlushFileBuffers`, no-replace publication and checked
  directory/volume identity. Microsoft documents that `FlushFileBuffers`
  requires a writable handle and writes buffered information to the device;
  real recovery evidence remains mandatory because an API success is not
  physical proof.
- macOS uses descriptor-bound staging, exclusive publication, exact reopen and
  `F_FULLFSYNC` where the admitted filesystem supports it. Apple documents that
  ordinary `fsync` can leave drive-buffered data vulnerable and that
  `F_FULLFSYNC` asks the drive to flush buffered data; the documentation also
  warns that some devices may ignore that request. Physical evidence therefore
  remains part of admission.

Primary references:

- <https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-flushfilebuffers>
- <https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-movefileexw>
- <https://man7.org/linux/man-pages/man2/fsync.2.html>
- <https://man7.org/linux/man-pages/man2/rename.2.html>
- <https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/fsync.2.html>
- <https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/fcntl.2.html>

## Fault and recovery matrix

The common matrix names every authority boundary:

1. stage opened;
2. partial bytes written;
3. complete bytes written;
4. file barrier entered;
5. file barrier completed;
6. stage closed;
7. publication entered;
8. publication completed;
9. exact reopen entered;
10. exact reopen completed;
11. directory barrier entered;
12. directory barrier completed;
13. candidate checkpoint staged;
14. key switch recorded;
15. canary recorded;
16. acceptance checkpoint recorded;
17. fallback recorded;
18. prior custody retired.

Deterministic injection first proves that every boundary is reachable and that
short write, disk full, barrier refusal, collision, namespace substitution and
readback corruption are detected. A fresh child process is then terminated at
each reachable native boundary. Controlled reboot and power-loss workers arm
exactly one boundary, durably record only public experiment metadata, stop, and
resume through a separate read-only recovery verifier after restart.

The only admissible recovery states are:

- the prior complete, authenticated generation remains selected; or
- the new complete, independently verified generation is selected after its
  acceptance checkpoint.

Partial bytes, mixed package/index generations, missing checkpoints, ambiguous
selection, unexecuted boundaries or exhausted experiments are K3 `0` and fail
the release gate.

Power-loss tests run only on an explicitly named sacrificial test host and
sacrificial evidence volume. They never target a home directory, repository,
workspace root, system volume or volume containing unique data. The operator
must confirm a separate backup and exact target identity before arming the
test. The automation may prepare and verify the experiment but may not cut
power without explicit operator action.

## Production rotation activation

The automatic rotation state machine remains unchanged: trigger, readiness,
Triple-Lock, M-of-N, candidate staging, switch, canary, fallback, drain and
private retirement advance one phase at a time. The new activation gate
requires:

- one exact production-admitted durability profile;
- the statically linked host/source/contract/ABI identity;
- the current non-revoked hybrid registry authority;
- a complete signed candidate package/index generation;
- an authenticated restart checkpoint;
- a complete fault/recovery evidence manifest; and
- no unsupported, expired, superseded or contradictory evidence row.

Disposable hybrid keys exercise the complete engineering path. Real release
admission uses the existing offline custody process and never reads production
private material from the repository or normal development host. Cryptographic
suites are referenced through versioned suite identifiers so a future admitted
suite can be added and an old suite retired without changing application
artifacts or silently reinterpreting old signatures.

## Beta-v1 release gate

Beta v1 becomes green only when one verifier recomputes and combines:

1. all seven functional platform rows;
2. all admitted native durability rows;
3. the complete recovery matrix for each production profile;
4. automatic rotation through disposable and offline-authorized evidence;
5. the complete package/test/conformance/fidelity/SLIDE-adapter aggregate;
6. strict and exhaustive `.fungi` checks;
7. security, audit, graph, provenance and generator fixed points; and
8. a clean, reproducible release build with no uncommitted evidence ambiguity.

The release receipt is immutable, bounded, contains no local path, secret,
private key or PII, and binds the exact repository commits and evidence
digests. It does not claim identical performance across systems. It does claim
that the same language and security contracts passed without a critical issue
on every listed OS.

## Roadmap colour rules

- Linux round two becomes green only after the current-commit Ubuntu live,
  process-termination and SLIDE receipts pass independent verification.
- Production rotation becomes yellow while repository-local implementation is
  complete but any required external durability row is absent. It becomes
  green only after production admission succeeds.
- Beta-v1 release becomes yellow while all code is complete but external
  platform evidence is incomplete. It becomes green only after the complete
  release verifier succeeds.
- Red is reserved for a demonstrated release-blocking defect or missing
  implementation. Missing external execution is never disguised as green, but
  once all executable machinery is complete it is accurately distinguished
  from a code defect.

## Verification strategy

Every new behavior follows RED -> GREEN -> refactor. Focused tests prove closed
schemas, hostile inputs, stable refusal identities, arithmetic and lifecycle
invariants. Platform integration tests exercise real native primitives.
Recovery verifiers are independently implemented and never reuse the worker's
decision function.

Before any roadmap promotion, run the focused native suites, package suites,
complete Galerina aggregate, strict phase close, exhaustive phase close,
security scans, all graph tools, audit tools, generator fixed points and the
release-admission verifier. Each document states exactly what ran, where it
ran, and what remains unavailable.

## Completion boundary

Repository implementation is complete when the Linux, Windows and macOS
adapters, injectors, workers, independent recovery verifier, evidence schemas,
rotation composition and beta release verifier are test-complete and locally
committed.

The three roadmap gates are completely green only after the required external
hosts return their exact admitted receipts and the offline release admission
step succeeds. No unavailable host, skipped test, simulation or prose report
is promoted to evidence.
