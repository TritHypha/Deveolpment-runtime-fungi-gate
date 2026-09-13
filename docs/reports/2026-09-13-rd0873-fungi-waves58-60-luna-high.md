# RD-0873 direct Fungi conversion — waves 58-60

Date: 2026-09-13
Head: 675e1048304b11e109b1de4f68af97ebc64f5949
Tree: b20138180928ed9d787d157d1faedbe86050be64
Worker ceiling: **Luna - High**
Execution: local only; Git is storage, with no CI or hosted build.

Three bounded target leaves were produced by the three designated Fungi
workers:

- galerina-target-cpu#supportsCpuFeatures ->
  packages/fungi/products/galerina-target-cpu/supports-cpu-features.fungi
  (1,457 bytes), parity 7/7.
- galerina-target-native#validateNativeTarget ->
  packages/fungi/products/galerina-target-native/validate-native-target.fungi
  (2,979 bytes), parity 12/12.
- galerina-target-gpu#validateGpuKernelPlan ->
  packages/fungi/products/galerina-target-gpu/validate-gpu-kernel-plan.fungi
  (3,261 bytes), parity 5/5; root verification replaced an unsupported Char
  literal with Char.fromCode(34).

All three targets pass strict checks and serial local builds. Retained package
suites pass 15/15 tests (CPU 3, native 7 and GPU 5). Ten fresh local
strict-check invocations per target pass 30/30, averaging 250.0 ms, 267.3 ms
and 250.1 ms including Node/compiler startup. The CLI benchmark subcommand
remains an unimplemented diagnostic.

The direct aggregate now passes 59/59 strict checks and 59/59 serial builds.
SIMD probing, native execution/binary loading, GPU discovery/dispatch/lowering,
host marshalling, provider effects and physical ABI admission remain explicit
host/toolchain boundaries.

The direct-tree ledger is now 58/100 package roots with 59 buildable leaves
totalling 118,394 bytes; 42 package roots remain. No production authority or
consumer switch changed.
