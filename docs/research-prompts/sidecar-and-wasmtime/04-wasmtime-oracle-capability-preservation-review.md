# Independent review prompt 4 — former dss-host capability adjudication

Perform a read-only code and history audit of the Rust/Wasmtime work migrated
from `subprojects/dss-host` to:

`packages-ts/galerina-devtools-wasmtime-oracle/`

Do not crawl Cargo `target`, registry sources, generated fixtures, or
`node_modules`. The tracked review set is the package's source, tests, tools,
manifests, lockfile, policy, and README only.

## Question

Did the migration preserve every useful, independently demonstrated property
while correctly removing the obsolete claim that this crate is a production
sidecar TCB?

## Required checks

- fuel starts fail-closed and is granted explicitly;
- V_DPM and general corpus differentials actually execute through Wasmtime;
- value and trap comparisons are symmetric where intended;
- memory is zeroed across reuse;
- altered/missing/relabelled attestation is rejected;
- fixtures are regenerated from current authoritative sources;
- no network, database, secret, package-admission, capability-release, or
  Galerina production authority exists;
- active docs and tooling point only to the flat package;
- historical claims are labelled historical/superseded;
- the optional Wasm compatibility lane remains distinguishable from SLIDE.

## Required output

1. Tracked capability inventory with source/test evidence.
2. Preserve, rewrite, replace, or delete verdict for every capability.
3. Any hidden production assumption still embedded in code/tests.
4. Test sensitivity: demonstrate how each test would fail if its property were
   removed.
5. Missing hybrid/PQC, sandbox, resource, or attestation work.
6. Whether Rust is justified for independent differential value.
7. Exact removal gate for the oracle after executable SLIDE exists.
8. Final verdict and minimal remediation list.

Use primary Wasmtime/Bytecode Alliance and Rust sources for external claims.
Separate current facts from history and future proposals.
