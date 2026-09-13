# RD-0873 direct Fungi conversion — waves 55-57

Date: 2026-09-13
Head: 675e1048304b11e109b1de4f68af97ebc64f5949
Tree: b20138180928ed9d787d157d1faedbe86050be64
Worker ceiling: **Luna - High**
Execution: local only; Git is storage, with no CI or hosted build.

Three bounded metadata leaves were produced by the three designated Fungi
workers:

- galerina-devtools-naming#DEVTOOLS_NAMING_VERSION ->
  packages/fungi/products/galerina-devtools-naming/devtools-naming-version.fungi
  (417 bytes), exact constant parity 1/1.
- galerina-devtools-provenance#DEVTOOLS_PROVENANCE_VERSION ->
  packages/fungi/products/galerina-devtools-provenance/devtools-provenance-version.fungi
  (321 bytes), exact constant parity 1/1.
- galerina-devtools-pci#DEVTOOLS_PCI_VERSION ->
  packages/fungi/products/galerina-devtools-pci/devtools-pci-version.fungi
  (537 bytes), exact constant parity 1/1.

All three targets pass strict checks and serial local builds. Retained package
suites pass 73/73 tests (naming 19, provenance 25 and PCI 29). Ten fresh local
strict-check invocations per target pass 30/30, averaging 268.9 ms, 273.8 ms
and 271.4 ms including Node/compiler startup. The CLI benchmark subcommand
remains an unimplemented diagnostic.

The direct aggregate now passes 56/56 strict checks and 56/56 serial builds.
These constants do not authorize naming, provenance or PCI execution; audits,
ledger persistence, external effects and consumer wiring remain host/toolchain
boundaries.

The direct-tree ledger is now 55/100 package roots with 56 buildable leaves
totalling 110,697 bytes; 45 package roots remain. No production authority or
consumer switch changed.
