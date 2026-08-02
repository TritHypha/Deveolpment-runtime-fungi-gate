# Windows static-host toolchain - current action

Status: **local toolchain and linked candidate build verified; no owner action
is required now; no production authority**.

The owner-supplied preflight and an independent rerun both returned
`CANDIDATE` with Visual Studio 18.8.12023.21, Clang 22.1.3 and NASM 3.02. The
full release host now links successfully after two exact, source-pinned
corrections. Its binary/accessor/decoy/one-use-receipt evidence is recorded in
`docs/reports/windows-static-linked-host-build-2026-08-02.md`.

## Do now

Nothing. Do not reinstall or modify Visual Studio, LLVM, NASM or Rust for this
chapter. Do not sign, copy or treat the local candidate executable as a
release artifact.

The next repository work is app-kernel receipt integration and reproducible
fresh-tree construction. Production remains fail closed because the governed
executable-digest set is empty and external platform/durability admission is
incomplete.
