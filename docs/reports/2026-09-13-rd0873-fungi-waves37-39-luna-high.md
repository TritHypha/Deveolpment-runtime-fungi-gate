# RD-0873 direct Fungi conversion — waves 37–39

Date: 2026-09-13  
Head: `675e1048304b11e109b1de4f68af97ebc64f5949`  
Tree: `b20138180928ed9d787d157d1faedbe86050be64`  
Worker ceiling: **Luna - High**  
Execution: local only; Git is storage, with no CI or hosted build.

Three bounded leaves were produced by the three designated Fungi workers. The TypeScript shadow sources remain active:

- `galerina-data-query#isSome` → `packages/fungi/products/galerina-data-query/is-some.fungi` (573 bytes); strict check/build and parity **12/12**.
- `galerina-data-query#optionSome` → `packages/fungi/products/galerina-data-query/option-some.fungi` (483 bytes); strict check/build and parity **12/12**.
- `galerina-data-search#validateSearchQuery` → `packages/fungi/products/galerina-data-search/validate-search-query.fungi` (4,618 bytes); strict check/build and interpreter/signed-Wasm parity **10/10**.

The two data-query leaves use concrete String specializations for the generic Option API; arbitrary payload types and malformed structural objects remain host-owned. The search leaf preserves diagnostic order and intentionally leaves parser/index lookup, provider/transport/egress, host search effects and nonfinite Float64 handling to the host. Root verification found and repaired an unsupported Char literal and implicit Bool checks in the search target using `Char.fromCode(34)` and explicit comparisons, then rechecked it with zero warnings.

Ten fresh local strict-check invocations per target passed **30/30**, averaging **248.5 ms**, **242.0 ms** and **250.9 ms**. The CLI benchmark subcommand remains an unimplemented diagnostic. The direct-tree ledger is now **37/100** package roots with **38** buildable leaves totalling **69,674 bytes**; **63** package roots remain. No production authority or consumer switch changed.
