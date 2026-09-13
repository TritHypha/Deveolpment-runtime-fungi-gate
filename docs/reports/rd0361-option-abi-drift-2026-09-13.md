# RD-0361 Option-ABI drift diagnosis — 2026-09-13

This report records the initial non-authorizing diagnosis for the RD-0361
authority-hash hold at Galerina `main` HEAD
`e716fc677d3ca609b016cf76d7f994b67fd36466` / tree
`80aa41e53fd9cacd608bf0ba392b1d8f2c005e0a`. At that initial observation it did
not repin the authority ledger, switch a consumer, retire a TypeScript shadow,
or start Fungi translation; the controlled re-baseline is recorded below.

## Closure update

The owner-authorized re-baseline was completed after the cause was reproduced.
The authoritative `secret-gate` digest is now the current 365-byte artifact
(`f062217154df66e3a72bc6adc82e47e72392c5a8d56bc8d40442090a8c8c9166`), and
`gather-r4-twin-hashes.mjs --verify-ledger --json` now passes **29/29**. The
single secret-gate mutation probe (`rd0361-ak-secretgate-present`) also passes
its non-vacuity check (**1/1 killed**, anchor check **1/1**, no files left
dirty). This closes the stale-pin failure only; RD-0361's R4/shadow-bake
claim remains HOLD for caller-route, independent SLIDE integration and
production-authority evidence.

## Reproduced failure

`node scripts/gather-r4-twin-hashes.mjs --verify-ledger --json` exits 1 at
28/29. The only mismatch is
`packages-ts/galerina-framework-app-kernel/src/self-hosted/secret-gate.fungi`:

- recorded ledger digest: `ce662c325ef9ba682688a4b18097f5020fe54235ce522773f20e13d0cfda3c36`;
- current derived digest: `f062217154df66e3a72bc6adc82e47e72392c5a8d56bc8d40442090a8c8c9166`;
- recorded module size: 278 bytes;
- current module size: 365 bytes.

The `.fungi` source is unchanged since the package move commit
`1cdeb8a0a`. The current build now uses six versioned Option/array imports
(`__array_get_option_v2`, `__option_is_none_v2`, `__option_value_v2` and their
related helpers), whereas the old evidence lists only raw array get/length and
string equality.

## Cause identified

Commit `ca2bc2fb5` (`fix: separate option presence from payload`) changed the
compiler and runtime Option ABI from a sentinel payload convention to explicit
registry handles. `Array.get()` and `Some/None` matching therefore emit the
versioned presence/value checks. This preserves a present negative integer as a
valid value and rejects absence or malformed handles; it necessarily changes
the generated WASM bytes and digest for a twin that exercises those operations.
The source twin did not change, so the 278-byte pin is stale relative to the
current compiler semantics.

## Bounded verification

- RD-0361 secret-gate differential: **1/1 passed** (real WASM admission equals
  `createSecretGate().admit()` over the provider/status grid).
- Option ABI and wildcard regression tests: **22/22 passed**.
- `gather-r4-twin-hashes.mjs --self-test`: **4/4 passed**.
- The secret-gate mutation anchor and kill probe pass **1/1** each; the target
  was restored cleanly.
- After the controlled re-baseline, the enforcing hash check passes **29/29**
  with no stale or unexplained pin.

## Disposition and next gate

The cause was demonstrated as compiler/runtime ABI drift, and the owner
approved the bounded identity re-baseline after the current artifact, semantic
differential and mutation evidence were checked. This does not authorize a
consumer switch, TypeScript-shadow retirement, production authority or Fungi
translation. RD-0361 remains **HOLD** only for its separate R4/shadow-bake,
caller-route, independent SLIDE and production-authority gates.
