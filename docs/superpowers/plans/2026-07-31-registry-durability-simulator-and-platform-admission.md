# Registry durability simulator and platform-admission implementation plan

Date: 2026-07-31

Status: in progress

Policy: verify rather than assume; fail closed; simulation never authorizes

## Outcome

Close every repository-local prerequisite for production registry-generation
durability without pretending that one Windows development host proves
Windows, Linux and macOS crash semantics. The repository will contain:

1. a canonical seeded activation simulator covering every write, barrier,
   publication, verification, checkpoint, switch, canary, fallback, drain and
   custody boundary;
2. replay receipts binding the complete schedule and evidence identity;
3. planted-fault, anti-vacuity and budget-exhaustion tests;
4. a narrow `.fungi` decision contract for the terminal authority invariant;
5. an explicit platform-adapter ABI and admission ledger that remains empty
   until reviewed native source and real platform evidence exist;
6. a host execution matrix that reports unexecuted operating systems as
   unverified, never inferred green.

## Non-negotiable boundary

- A simulator receipt is model evidence only. It is never a
  `PersistedRegistryGeneration`, never enters the production adapter allow-set
  and never changes authenticated registry authority.
- The only successful authority states are the prior complete generation or
  the newly verified complete generation.
- Mixed bytes, unknown operations, duplicate faults, malformed digests,
  unreachable fault schedules, insufficient exploration budget and uncovered
  terminal states are `INDETERMINATE` and refuse.
- A production adapter owns the complete platform-specific write/barrier/
  exclusive-publication/re-open/barrier operation. A caller callback, shell,
  PowerShell process, spawned CLI or writable sidecar is not admitted.
- Exact Windows 10/11, Debian/Ubuntu, Fedora/Mint and macOS evidence remains a
  release requirement. Local Windows evidence cannot be relabelled as proof
  for another host or filesystem.

## Implementation sequence

- [x] Add RED tests for deterministic replay, receipt identity, malformed
  schedules, planted faults, fallback failure and exhausted budgets.
- [x] Implement the smallest pure activation simulator and canonical receipt.
- [x] Add a checker-clean `.fungi` terminal-authority decision contract using
  Boolean-only `if`, K3 `check` and exhaustive `match` as applicable.
- [x] Add a deterministic matrix runner proving control and planted-fault
  cases execute and that no mixed generation can authorize.
- [x] Define the source-bound native adapter ABI and empty admission ledger.
- [x] Add and test a zero-dependency Windows host-probe candidate that refuses
  relative/unavailable paths, reparse targets/ancestors, non-fixed drives,
  remote-storage capability and non-NTFS/ReFS filesystems. Its result is
  explicitly non-authorizing; 4/4 focused Rust tests pass on the Windows 10
  development host.
- [x] Add a non-executing native-artifact inspector that materializes one
  fixed-path, single-link file, rejects symbolic ancestry, bounds bytes,
  compares stable open-handle metadata, validates PE/ELF/Mach-O architecture
  markers and re-derives the exact binary digest. Focused evidence is 7/7 and
  its `.fungi` terminal contract is 0 errors/0 warnings.
- [ ] Add the actual content-bound N-API loader/export proof and retained-handle
  substitution resistance before any platform persistence implementation can
  be considered. The inspector returns only `CANDIDATE`, never executes bytes
  and cannot prove ABI behavior.
- [ ] Run focused app-kernel tests, mutation/security gates and the complete
  Galerina fixed point.
- [ ] Update TODO, roadmap, completion report and Knowledge Base evidence with
  exact implemented versus unverified boundaries.

## Platform evidence still required

| Platform | Local execution now | Production admission requirement |
|---|---|---|
| Windows 10/11 | Windows 10 development host only | reviewed in-process adapter plus NTFS/ReFS kill, reboot and power-loss matrix |
| Debian/Ubuntu | unexecuted | reviewed adapter plus ext4/XFS/Btrfs support/refusal matrix and real crash evidence |
| Fedora/Mint | unexecuted | same evidence, recorded on the named distributions and filesystems |
| macOS | unexecuted | reviewed APFS adapter using the strongest admitted barrier plus real crash evidence |

An absent row, unsupported filesystem, network share, virtual/overlay storage
or unknown device is a refusal, not a portability assumption.

The current Windows evidence is deliberately smaller than the production row:
the native probe observed a fixed local NTFS candidate and passed 4/4 focused
tests, including reparse-ancestor refusal. It performs no write, publication,
barrier or loader operation and supplies no crash or power-loss evidence.
