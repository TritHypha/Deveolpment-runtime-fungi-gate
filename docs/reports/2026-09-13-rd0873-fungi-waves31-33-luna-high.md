# RD-0873 direct Fungi conversion — waves 31–33

Date: 2026-09-13  
Head: `675e1048304b11e109b1de4f68af97ebc64f5949`  
Tree: `b20138180928ed9d787d157d1faedbe86050be64`  
Worker ceiling: **Luna - High**  
Execution: local only; Git is storage, with no CI or hosted build.

Three bounded direct-package leaves were produced by the three designated Fungi workers, with the TypeScript shadows retained:

- `galerina-ai-neuromorphic#validateSpikeTrain` → `packages/fungi/products/galerina-ai-neuromorphic/validate-spike-train.fungi` (3,433 bytes). Strict check/build passed and focused parity was **8/8**.
- `galerina-data-html#validateHtmlParsePlan` → `packages/fungi/products/galerina-data-html/validate-html-parse-plan.fungi` (2,685 bytes). Strict check/build passed and focused parity was **12/12**.
- `galerina-core-sentinel-power#validateEnvelope` → `packages/fungi/products/galerina-core-sentinel-power/validate-envelope.fungi` (1,819 bytes). Strict check/build passed; finite interpreter and signed-Wasm parity each passed **10/10**.

The leaves preserve their bounded validation and diagnostic semantics. The sentinel-power target initially raised one Truth/Falsy governance warning; it was repaired to explicit boolean equality and independently rechecked with zero warnings. Explicit host/manual boundaries remain recorded: JavaScript default/undefined/null/sparse-array normalization for the spike validator; browser/parser and optional-field marshalling for HTML plans; and nonfinite thermal thresholds, thermal sensing, governor transitions and enforcement for the power sentinel. No production authority or consumer switch changed. Ten fresh local strict-check invocations per target passed **30/30**, averaging **257.3 ms**, **250.8 ms** and **246.4 ms**; the CLI benchmark subcommand remains an unimplemented diagnostic.

Per-item source/target hashes, limits and dispositions are recorded in the manifest and in the wave receipts. The direct-tree ledger is now **32/100** package roots with **32** buildable leaves totalling **55,129 bytes**; **68** package roots remain. The next chapter continues under the same two-package, four-source-file, 16,384-byte and twelve-focused-test limits.



