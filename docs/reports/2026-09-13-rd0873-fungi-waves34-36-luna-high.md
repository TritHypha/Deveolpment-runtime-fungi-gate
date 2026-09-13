# RD-0873 direct Fungi conversion — waves 34–36

Date: 2026-09-13  
Head: `675e1048304b11e109b1de4f68af97ebc64f5949`  
Tree: `b20138180928ed9d787d157d1faedbe86050be64`  
Worker ceiling: **Luna - High**  
Execution: local only; Git is storage, with no CI or hosted build.

Three bounded direct-package leaves were produced by the three designated Fungi workers, retaining their TypeScript shadows:

- `galerina-auth#composeAuthVerdict` → `packages/fungi/products/galerina-auth/compose-auth-verdict.fungi` (1,023 bytes). Strict check/build passed and K3 fold parity was **8/8**.
- `galerina-data-reports#deriveDataReportStatus` → `packages/fungi/products/galerina-data-reports/derive-data-report-status.fungi` (1,013 bytes). Strict check/build passed and status-precedence parity was **12/12**.
- `galerina-data-response#validateResponseMapping` → `packages/fungi/products/galerina-data-response/validate-response-mapping.fungi` (7,039 bytes). Strict check/build passed; explicit parity was **10/10** on both interpreter and signed Wasm, including the default wrapper.

The leaves preserve bounded verdict, status and mapping metadata semantics. The response-mapping target required a root strict-check repair: unsupported character-literal quoting was replaced with `Char.fromCode(34)` and implicit Bool checks were made explicit; the data-reports leaf also required an explicit `hasWarning` comparison. All then passed with zero warnings while retaining quoted diagnostics. Host boundaries remain explicit: verdict-domain enforcement and credential/provider effects for auth; report construction/persistence and host array/proxy behavior for data reports; and response projection, transport/egress, provider effects and source-object admission for data response. No production authority or consumer switch changed. Retained package suites passed **37/37** (auth **8/8**, data-reports **12/12**, data-response **17/17**). Ten fresh local strict-check invocations per target passed **30/30**, averaging **248.7 ms**, **243.1 ms** and **247.6 ms**; the CLI benchmark subcommand remains an unimplemented diagnostic.

Per-item source/target hashes, limits and dispositions are recorded in the manifest and receipts. The direct-tree ledger is now **35/100** package roots with **35** buildable leaves totalling **64,000 bytes**; **65** package roots remain. The next chapter continues under the same two-package, four-source-file, 16,384-byte and twelve-focused-test limits.



