# RD-0873 direct Fungi conversion — waves 28–30

Date: 2026-09-13  
Head: `675e1048304b11e109b1de4f68af97ebc64f5949`  
Tree: `b20138180928ed9d787d157d1faedbe86050be64`  
Worker ceiling: **Luna - High**  
Execution: local only; Git is storage, with no CI or hosted build.

Three bounded direct-package leaves were converted while retaining their TypeScript shadows:

- `galerina-core-logic#validateBoolBoundary` → `packages/fungi/products/galerina-core-logic/validate-bool-boundary.fungi`.
- `galerina-data-pipeline#validateBackpressurePolicy` → `packages/fungi/products/galerina-data-pipeline/validate-backpressure-policy.fungi`.
- `galerina-ai-lowbit#validateLowBitAiModel` → `packages/fungi/products/galerina-ai-lowbit/validate-low-bit-ai-model.fungi`.

All three targets passed strict Fungi check and build (**3/3**). Focused parity was **7/7**, **12/12**, and **9/9**. The low-bit leaf also matched finite interpreter and signed-Wasm cases **9/9** on each backend. Ten fresh local strict checks per target passed (**30/30**) with means **247.3 ms**, **247.8 ms**, and **245.7 ms**; the CLI benchmark subcommand remains an unimplemented diagnostic.

Two governance warnings were repaired during the run: structural truthiness in the bool-boundary and backpressure leaves now uses explicit boolean equality, and both were rechecked with zero warnings. The low-bit target records a deliberate manual boundary for `NaN`/`Infinity`: the current WAT emitter traps nonfinite `Float64` before TypeScript `<= 0` semantics can be compared. This is documented as host/manual work and is not treated as parity or production authority.

Per-item receipts are `docs/independent-audits/2026-09-13-rd0873-fungi-wave28-core-logic.json`, `...wave29-data-pipeline.json`, and `...wave30-ai-lowbit.json`. The manifest records the exact source/target hashes, limits and dispositions. No consumer switch or production authority changed.

The direct-tree ledger is now **29/100** package roots with **29** buildable leaves totalling **47,202 bytes**; **71** package roots remain. The next chapter continues with one bounded leaf per package under the same limits.
