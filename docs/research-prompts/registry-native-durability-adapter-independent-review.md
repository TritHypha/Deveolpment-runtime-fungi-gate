# Independent deep-research prompt — native registry durability adapters

Date: 2026-07-30

Status: read-only research; no implementation or authority grant

## Purpose

Independently challenge the proposed in-process, cross-platform durability
adapter for Galerina registry generations. The goal is not to approve a
preferred API. Determine the smallest technically defensible mechanism that
can persist an already verified, content-addressed generation on Windows
10/11, Linux families and macOS while keeping old authority after every
failure or uncertainty.

Read:

- `Galerina/docs/architecture/registry-generation-platform-durability-2026-07-30.md`;
- `Galerina/packages-galerina/galerina-framework-app-kernel/src/registry-generation-store.ts`;
- its registry-generation and rotation tests;
- the immutable-generation and rotation design documents;
- `ZTF-Knowledge-Bases/ai-reviews/ZERO-TRUST-ADOPTION-SCORE.md`.

Galerina, SLIDE and the Knowledge Base are read-only. Write only the assigned
report. Do not inspect private material, install tooling, compile native code,
change generated files, sign, commit or push.

## Threat model and non-negotiable rules

- OS, filesystem, storage controller, process memory and co-resident software
  are hostile or fallible.
- Only an exact verified generation may be published.
- Existing authority is never replaced in place.
- Crash recovery selects the old complete generation or the new complete
  generation, never mixed bytes.
- Unknown, remote, virtualized, unsupported or unmeasured storage refuses.
- A copied digest or structurally similar object cannot forge adapter
  authority.
- No shell, spawned CLI, writable sidecar or PowerShell bridge may enter the
  production authority path.
- The bootstrap may use a narrowly bounded native component, but its
  authoritative contract is `.fungi`; implementation language earns no trust.
- Only exact K3 ALLOW may authorize. DENY and INDETERMINATE both stop with an
  explicit exit.

## Deep-research questions

Use current primary operating-system, filesystem, runtime and standards
documentation. Clearly distinguish documented guarantees, measured behavior,
inference and unknowns.

1. For Windows NTFS and ReFS, what exact sequence gives the strongest
   defensible exclusive file publication and persistence boundary? Compare
   `FlushFileBuffers`, `MoveFileExW(MOVEFILE_WRITE_THROUGH)`, directory
   handles, file attributes, hard links and rename semantics. Identify what
   is not guaranteed.
2. For Linux ext4, XFS and Btrfs, assess file `fsync`, hard-link or rename,
   containing-directory `fsync`, mount modes, delayed allocation, writeback
   errors and filesystem/device lies.
3. For macOS APFS, assess `fsync`, `F_FULLFSYNC`, directory synchronization,
   rename/link publication and Apple's best-effort limitations.
4. Should one adapter own write, file barrier, read-only metadata, exclusive
   publication and directory barrier as one operation? Find any safe reason to
   keep a post-publication callback seam.
5. What measured host facts are needed to reject network shares, removable
   media, overlay filesystems, unsupported volume types, containers and
   virtual disks?
6. How should an in-process native module be loaded so path substitution,
   symlink/reparse escape, ABI confusion, unsigned binaries, wrong target
   triples and load-time races refuse?
7. Can a no-third-party-dependency native implementation be materially
   smaller or safer in C, Rust or another bootstrap language? Compare actual
   TCB and toolchain consequences without trusting a language brand.
8. Design the crash/fault matrix for short write, ENOSPC/disk-full,
   access-denied, file-barrier failure, publication collision,
   directory-barrier failure, kill, reboot and power loss at every boundary.
9. Define the recovery invariant and an executable checker that proves no
   mixed generation can become selected authority.
10. Identify any security property the current plan misses, including memory
    injection, path injection, filesystem namespace attacks, rollback,
    confused deputy, denial of service and audit suppression.

## Required answer

1. Executive verdict: `REJECT`, `RESEARCH`, `PROTOTYPE` or `ADMIT-CANDIDATE`.
2. Evidence-labelled platform tables.
3. Exact recommended syscall/API sequences per platform.
4. Smallest safe adapter ABI.
5. Loader and binary-provenance design.
6. Host/filesystem refusal matrix.
7. Crash/fault/recovery test plan.
8. TCB and migration analysis for the later SLIDE implementation.
9. Zero-trust adoption score, hard-veto audit and evidence gaps.
10. Falsification tests.
11. Questions that genuinely require owner authority.
12. Additional findings outside scope.

Use your own intuition. Prefer discovering that a proposed guarantee is
impossible over repeating the intended architecture. Do not turn advisory
research into an implementation claim.
