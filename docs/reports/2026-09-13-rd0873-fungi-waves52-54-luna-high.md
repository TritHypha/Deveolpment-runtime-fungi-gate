# RD-0873 direct Fungi conversion — waves 52-54

Date: 2026-09-13
Head: 675e1048304b11e109b1de4f68af97ebc64f5949
Tree: b20138180928ed9d787d157d1faedbe86050be64
Worker ceiling: **Luna - High**
Execution: local only; Git is storage, with no CI or hosted build.

Three bounded leaves were produced by fungi_translate_core_compute,
fungi_translate_core_economics and fungi_translate_core_reports:

- galerina-devtools-context#DEVTOOLS_CONTEXT_VERSION ->
  packages/fungi/products/galerina-devtools-context/devtools-context-version.fungi
  (252 bytes), exact constant parity 1/1.
- galerina-devtools-flowgraph#FLOWGRAPH_VERSION ->
  packages/fungi/products/galerina-devtools-flowgraph/flowgraph-version.fungi
  (295 bytes), exact constant parity 1/1.
- galerina-devtools-fungi-scan#PLANNED_CONSTRUCT_WORDS ->
  packages/fungi/products/galerina-devtools-fungi-scan/planned-construct-words.fungi
  (1,103 bytes), ordered interpreter and signed-Wasm parity 15/15.

All three targets pass strict checks and serial local builds. Retained package
suites pass 99/99 tests (context 38, flowgraph 36 and fungi-scan 25). Ten
fresh local strict-check invocations per target pass 30/30, averaging
267.3 ms, 262.6 ms and 267.3 ms including Node/compiler startup. The CLI
benchmark subcommand remains an unimplemented diagnostic.

The direct aggregate now passes 53/53 strict checks and 53/53 serial builds.
The three constants remain non-authorizing; scanner traversal, collision
measurement, reporting, graph consumers and package/version authority remain
host/toolchain boundaries.

The direct-tree ledger is now 52/100 package roots with 53 buildable leaves
totalling 109,422 bytes; 48 package roots remain. No production authority or
consumer switch changed.
