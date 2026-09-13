# RD-0873 direct Fungi conversion — waves 49-51

Date: 2026-09-13
Head: 675e1048304b11e109b1de4f68af97ebc64f5949
Tree: b20138180928ed9d787d157d1faedbe86050be64
Worker ceiling: **Luna - High**
Execution: local only; Git is storage, with no CI or hosted build.

Three bounded leaves were produced by the three designated Fungi workers
(fungi_translate_core_compute, fungi_translate_core_economics and
fungi_translate_core_reports). TypeScript shadows remain active:

- galerina-core-cli#formatCliResult -> packages/fungi/products/galerina-core-cli/format-cli-result.fungi (1,477 bytes), parity 6/6.
- galerina-core-sentinel-egress#readEgressLedger -> packages/fungi/products/galerina-core-sentinel-egress/read-egress-ledger.fungi (1,612 bytes), parity 12/12.
- galerina-devtools-graph-project#createPackageNode -> packages/fungi/products/galerina-devtools-graph-project/create-package-node.fungi (1,242 bytes), interpreter and signed-Wasm parity 7/7 each.

All three targets pass strict checks and serial local builds. Retained package
suites pass 63/63 tests (core-cli 21, sentinel-egress 34 and graph-project 8).
Ten fresh local strict-check invocations per target pass 30/30, averaging
272.5 ms, 267.3 ms and 267.6 ms including Node/compiler startup. The CLI
benchmark subcommand remains an unimplemented diagnostic.

Root verification changed the CLI tripwire Bool check to an explicit comparison
and rechecked it with zero warnings. The direct aggregate passes 50/50 strict
checks and 50/50 serial builds. The egress leaf returns trimmed JSONL text while
the host retains filesystem/UTF-8/JSON parsing responsibilities; graph scanning,
persistence, indexing and publication remain host-owned.

The direct-tree ledger is now 49/100 package roots with 50 buildable leaves
totalling 107,772 bytes; 51 package roots remain. No production authority or
consumer switch changed.
