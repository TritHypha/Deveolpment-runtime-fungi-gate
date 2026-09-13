# RD-0873 direct Fungi conversion — waves 46-48

Date: 2026-09-13
Head: 675e1048304b11e109b1de4f68af97ebc64f5949
Tree: b20138180928ed9d787d157d1faedbe86050be64
Worker ceiling: **Luna - High**
Execution: local only; Git is storage, with no CI or hosted build.

Three bounded leaves were produced by the three designated Fungi workers
(fungi_translate_core_compute, fungi_translate_core_economics and
fungi_translate_core_reports). The TypeScript shadows remain unchanged:

- galerina-target-wasm#validateWasmArtefact -> packages/fungi/products/galerina-target-wasm/validate-wasm-artefact.fungi (1,909 bytes), parity 6/6.
- galerina-tools-benchmark#validateBenchmarkConfig -> packages/fungi/products/galerina-tools-benchmark/validate-benchmark-config.fungi (4,062 bytes), parity 12/12.
- galerina-web#isServerOnlyImport -> packages/fungi/products/galerina-web/is-server-only-import.fungi (1,637 bytes), interpreter and signed-Wasm parity 11/11 each.

All three targets passed strict Fungi checks and serial local builds. The
retained TypeScript package suites passed 38/38 tests (Wasm target 4,
benchmark 9 and web 25). Ten fresh local strict-check invocations per target
passed 30/30, averaging 269.4 ms, 272.5 ms and 269.4 ms including
Node/compiler startup. The CLI benchmark subcommand remains an unimplemented
diagnostic.

Root verification repaired three implicit privacy Bool checks in the benchmark
target and rechecked the target with zero warnings. The direct aggregate now
passes 44/44 strict checks and 44/44 serial builds. Wasm artefact bytes,
module loading, browser bundling, host telemetry execution and capability
enforcement remain explicit host/toolchain boundaries; no production authority
or consumer switch changed.

The direct-tree ledger is now 46/100 package roots with 47 buildable leaves
totalling 103,449 bytes; 54 package roots remain.
