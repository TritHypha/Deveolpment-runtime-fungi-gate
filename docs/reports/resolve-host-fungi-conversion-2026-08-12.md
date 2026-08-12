# Resolve host TypeScript-to-Fungi conversion - 2026-08-12

## Result

The exported TypeScript `resolveHost` decision now has a package-owned pure
Fungi twin in `galerina-core-compiler`:

```fungi
pure flow resolveHostFungi(name: String) -> HostResidencyCapabilityFungi
```

The physical adapter maps TypeScript absence to the explicit
`"<undeclared>"` String. The three declared host names return their exact
closed capability records. Every other String returns the no-capability record.
These records are declared capability claims, not live platform attestation.

This is a non-retiring physical conversion slice. TypeScript, the host-profile
registry, and every consumer remain active.

## SLIDE boundary correction

The first physical attempt exposed two bounded SLIDE constraints. A checked
pure-scalar module admits one record declaration, so the host-capability record
and flow were isolated in their own package-owned Fungi asset. The exact
four-arm resolver then exceeded the fixed 32-instruction ceiling because each
repeated Boolean and integer literal was lowered again inside the same basic
block.

SLIDE commits `5c84170` and `42b94af` now reuse immutable Boolean and integer
constants within one basic block. The instruction ceiling, registry contract,
record ABI, and authority boundary were not widened. The affected pure-scalar,
external-record, and transitive-work neighborhood passes **27/27**.

## Verification

- strict Fungi check: zero errors and zero governance warnings, with one flow
  and two top-level declarations;
- declared, absent, unknown, prototype-shaped, whitespace, case, Unicode, and
  embedded-NUL differential vectors: **1/1**;
- physical `.fungi` to checked package to `.slide` publication, independent
  re-admission, execution, and typed VOK record-receipt verification: **1/1**,
  zero skips across thirteen result vectors;
- the physical path pins registry
  `slide.registry.executable-gir.v2c-immutable-value-ops.v1`, registry digest
  `956e5f12ea00599f67fc4892774c01b78bedcc5d630df70f0164730ee8a25703`,
  and record-descriptor digest
  `sha256:1416308737ffb44988f8a01339d3d358fe5055ad1859584b52022615422c15bc`;
- hostile physical cases: wrong type/arity, invalid Unicode, insufficient
  steps, source mutation, receipt-field mutation, every safe-value-envelope
  byte mutation, and `.slide` mutation all refuse;
- compiler package: **6,376/6,376**;
- Golden Pack: **11/11** checked and **11/11** execution vectors;
- canonical aggregate owner: **100/100 packages, 9,596 tests, zero failures in
  274.9 seconds**;
- retirement owner: **1,442** executable-family paths and **128** source Fungi
  assets; self-test **17/17**.

## Authority boundary

No null, NaN, `else if`, `else`, throw, try/catch, `for`, `while`, or `loop`
was introduced. The physical receipt keeps `authorityReleased: false`. Unknown
and absent names receive no host capability, and no capability record is
treated as live platform evidence.

This evidence grants no consumer-switch, bootstrap-fixpoint, production,
runtime-residency, signing, release, or TypeScript-retirement authority.
Repository-wide closure remains **UNKNOWN** because the crash-linked full
tooling, normal phase-close, and monolithic memory evaluation lanes remain
deliberately excluded.
