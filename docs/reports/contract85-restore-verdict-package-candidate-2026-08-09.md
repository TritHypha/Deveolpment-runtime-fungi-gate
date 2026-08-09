# Contract 85 restoreVerdict package candidate

Date: 2026-08-09
Status: **COMPLETE — REFERENCE-ONLY, NON-AUTHORIZING**

## Outcome

The live `@galerina/core-sentinel-state` `restoreVerdict` flow now has a
canonical source manifest, a manifest-bound physical `.slide` object and a
receipt-bound package publication. The committed publication can be loaded
without the source file, executes all three K3-relevant Boolean input cases
through SLIDE's typed physical receipt path, rebuilds byte-for-byte with the
pinned SLIDE tool closure, and refuses a one-byte object mutation.

This closes Contract 85's package-evidence scope. It does **not** retire
`cold-boot.ts`: serialization, atomic/durable storage, recovery and memory
scrubbing remain host responsibilities until a separately admitted consumer
switch replaces them.

## Bound evidence

- Source: `packages-galerina/galerina-core-sentinel-state/src/self-hosted/cold-boot.fungi`
- Source SHA-256: `5040e0b1ff890f602b8629f6205cee95f4236c502a446579f9184f27d22cf996`
- Export: `restoreVerdict(snapshotPresent: Bool, integrityOk: Bool) -> Int`
- SLIDE tool head: `f302182ccdea6d4491ad0121e9ca3e56a8f85a3a`
- SLIDE tool-manifest digest: `sha256:6688de0478f8b2ed0c8358d4ae3c17277e459dbefe34f1aadf698e274fdd0c1e`
- Runtime digest: `sha256:9a4eb5f1c29c6a2e93852ead46b999e284a6a5ca8bab4d4e241d587d025a52de`
- Source-manifest digest: `sha256:96264f444a7ab5b6e285cbc3e8bce0dca53126670e1596644fbd9f8495fa85c2`
- Package-set digest: `sha256:0942ac025d842e9171f32b943e12e0dcb520ca93fd7653910a75c1b43ec83309`
- Physical object: `package-243795e71c23adfb-d8d192539e365aab.slide` (617 bytes)
- Power-loss durability: `0`
- `referenceOnly`: `true`
- `authorityReleased`: `false`

The tool pin records the complete 89-file SLIDE tool closure rather than
trusting a repository path or an asserted version string. The package receipt
binds the source, package descriptor, export, target/policy/verifier context,
physical object and package set.

## Executed parity

| snapshot present | integrity OK | verified result |
|---:|---:|---:|
| `true` | `true` | `1` |
| `false` | `true` | `-1` |
| `true` | `false` | `-1` |

The result is released only after typed receipt verification. The loader does
not expose a value from an unverified receipt, invoke a fallback or release
production authority.

## Verification

Command:

```powershell
$env:GALERINA_SLIDE_REPO = "<SLIDE checkout>"
node --test scripts/tests/restore-verdict-slide-candidate.integration.test.mjs
Remove-Item Env:GALERINA_SLIDE_REPO
```

Fresh result: **3/3 pass**, **0 fail**, Node process count **2 -> 2**.

The three cases prove:

1. committed source-free publication preparation, typed execution and exact
   receipt re-admission;
2. an exact byte-for-byte rebuild using the pinned tool manifest and runtime;
3. refusal after one byte of the physical `.slide` object is changed.

## Remaining boundary

Contract 85 proves a real package decision candidate, not a package retirement.
The next consumer-switch contract must bind the actual Galerina caller,
preserve fail-closed recovery and scrub semantics, and provide complete owning
Galerina plus SLIDE evidence before changing any retirement counter.
