# VOK Forward-Probe Security Review

**Status:** remediated, verified, non-authorizing

## Outcome

The diff-focused security review found one pre-production object-binding defect
in the registry rotation forward probe. The original receipt was branded and
one-use, but the consumer compared only the content-addressed generation ID.
That did not prove that the freshly reopened bytes belonged to the exact
persisted object named by the production candidate.

The corrected receipt and consumer now bind:

- the module-verified target receipt;
- canonical persisted path;
- generation ID;
- delegation serial;
- operational key ID; and
- signed index issuance time.

Copied or proxied probe receipts, copied or proxied target receipts, identical
generation bytes reopened from another directory, mismatched facts and receipt
reuse all refuse. The checker-owned `.fungi` fold remains pure and cannot read
storage, mint a receipt or authorize a rotation.

## Evidence

- App-kernel typecheck and build pass.
- App-kernel package passes **204/204**.
- The hostile two-directory and copied-target cases are executable regression
  tests in `registry-generation.test.mjs`.
- The scan covered all 11 selected diff and directly supporting files.
- Final policy severity was low because the API is process-local, the caller
  already needs genuine branded state, and the production durability allow-list
  remains empty. The defect was still fixed before activation.

## Boundary retained

This forward probe establishes a bounded, process-local observation. It does
not claim protection against storage mutation after verification, kernel crash,
reboot, controller-cache loss or power loss. Those facts remain owned by the
linked native host/VOK durability boundary and authenticated platform receipts.

The canonical scan bundle is outside the repository at:

`%LOCALAPPDATA%/Temp/codex-security-scans/Galerina/0353478a_20260802T004809+0100`
