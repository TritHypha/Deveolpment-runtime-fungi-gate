# RD-0873 direct package waves 22–24 — 2026-09-13

Three Luna – High workers completed one bounded leaf per package:

- `packages-ts/galerina-core-photonic/src/index.ts#validateOpticalSignal` →
  `packages/fungi/products/galerina-core-photonic/validate-optical-signal.fungi`;
- `packages-ts/galerina-cpu-kernels/src/index.ts#requiresLowBitKernel` →
  `packages/fungi/products/galerina-cpu-kernels/requires-low-bit-kernel.fungi`;
- `packages-ts/galerina-data/src/index.ts#validateDataMemoryLimits` →
  `packages/fungi/products/galerina-data/validate-data-memory-limits.fungi`.

All TypeScript shadows remain unchanged. Strict Fungi checking and building
passed **3/3**. Focused parity passed **5/5**, **12/12**, and **9/9**; the last
set was run against both interpreter and signed Wasm backends (18 backend
assertions over the same nine vectors). Ten fresh local strict-check
invocations per target passed **30/30**, averaging **248.0 ms**, **247.4 ms**
and **241.7 ms**. The CLI benchmark subcommand remains an unimplemented
diagnostic, so these are build/check baselines rather than runtime performance
claims.

These leaves preserve finite optical validation, exact low-bit label routing and
fail-closed positive data limits. Host defaults, hostile object ingress, native
kernel loading, parsing/allocation, stream handling and production authority
remain explicit boundaries. No consumer switch or production authorization is
claimed.

Receipts:

- `docs/independent-audits/2026-09-13-rd0873-fungi-wave22-core-photonic.json`
- `docs/independent-audits/2026-09-13-rd0873-fungi-wave23-cpu-kernels.json`
- `docs/independent-audits/2026-09-13-rd0873-fungi-wave24-data.json`
