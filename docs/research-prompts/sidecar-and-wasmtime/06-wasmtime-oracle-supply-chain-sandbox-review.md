# Independent review prompt 6 — Wasmtime oracle supply chain and sandbox

Act as an independent Rust, Wasmtime, compiler-sandbox, and software-supply
chain reviewer. Read only the tracked oracle package files; do not inspect the
4K+ Cargo `target` tree, registry sources, generated fixtures, private keys, or
unrelated packages.

## Question

Is `packages-ts/galerina-devtools-wasmtime-oracle` sufficiently pinned,
isolated, and non-authoritative to serve as trustworthy differential evidence?

## Required checks

- exact `Cargo.lock` and `wasmtime = "47.0.2"` implications;
- current advisories and supported-version status;
- `deny.toml` effectiveness and gaps;
- build scripts, native code, proc macros, downloads, and transitive TCB;
- Wasmtime configuration for fuel, epoch interruption, memory/table ceilings,
  guard pages, pooling/reset, Spectre mitigations, host imports, WASI absence,
  component model, cache, and deterministic settings;
- fixture provenance and whether tests can silently skip;
- test process permissions, environment inheritance, filesystem/network
  access, crash artifacts, and secret exposure;
- SBOM, SLSA/provenance, reproducible build, and update procedure;
- Windows/Linux/macOS differences.

## Required output

1. Current dependency and configuration facts with primary-source citations.
2. Threats ranked by exploitability and impact on evidence integrity.
3. Required pin/update policy and emergency advisory response.
4. Exact hardened `Config` and `Store` requirements.
5. Hermetic test-runner design and least privileges.
6. Tests proving no silent skip and no authority release.
7. Evidence that must be recorded with each differential result.
8. Verdict: acceptable now, acceptable after changes, or unsuitable.

Do not treat “Rust” or “sandboxed Wasm” as a complete security argument.
