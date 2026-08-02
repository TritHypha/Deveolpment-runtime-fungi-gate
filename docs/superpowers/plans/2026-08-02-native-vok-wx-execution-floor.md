# Native VOK W^X Execution Floor Implementation Plan

> Execute with test-driven development. Observe each required RED before its
> production implementation. Complete steps use `- [x]`; pending steps use
> `- [ ]`.

**Goal:** link the native VOK authority table to a bounded, owned-byte W^X
execution adapter without creating pathname, raw-machine-code or receipt
authority.

## Task 1 - freeze the closed object contract

- [x] Record the exact 16-byte semantic object, supported target identifiers,
  authority sequence and non-goals.
- [x] Keep the general RD-0656 VEO loader and cross-platform release evidence
  as separate gates.

## Task 2 - native parser and fixed emitter

- [x] Add RED tests for exact parsing and every malformed/surplus class.
- [x] Add RED target-mismatch and deterministic fixed-emitter tests.
- [x] Implement the safe closed parser and x86-64/AArch64 fixed return stubs.

## Task 3 - OS entropy and W^X boundary

- [x] Add RED tests for the safe entropy and executable-memory APIs.
- [x] Implement isolated Windows, Linux and macOS adapters with no RWX request.
- [x] Prove the exact RX transition before the call and always unmap; Windows
  and Linux additionally query the live mapping. macOS live hardened-runtime
  inspection remains an independent platform gate.
- [x] Record live Windows evidence and five-target compile evidence.

## Task 4 - affine authority linkage

- [x] Add RED tests for `OsNonceSource`, one-use execution, wrong context,
  stale lease, malformed object and terminal failure clearing.
- [x] Keep the executor private inside `vok-authority` and add `execute_lease`
  without exposing private bytes, a raw execution handle or a safe bypass crate.
- [x] Prove both success and failure receipts are ordinary, non-authorizing
  values and cannot be replayed.

## Task 5 - assurance and repository fixed point

- [x] Run formatting, clippy, unit, doctest and K3 parity tests for the
  consolidated authority crate.
- [x] Run Cargo deny/audit, Grype and unsafe/RWX/path-loader source audits.
- [x] Run core-runtime and relevant Galerina graph/security/phase-close gates.
- [x] Update README, TODO, architecture, report and vertical roadmap with the
  exact completed and still-open boundaries.
- [ ] Regenerate governed indexes/graphs/status as required, inspect for
  secrets and stale claims, commit locally and never push.
