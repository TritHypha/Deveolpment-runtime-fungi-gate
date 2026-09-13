# RD-0873 direct package waves 25–27 — 2026-09-13

Three Luna – High workers completed one bounded leaf per package:

- `packages-ts/galerina-core/src/index.ts#hasErrors` →
  `packages/fungi/products/galerina-core/has-errors.fungi`;
- `packages-ts/galerina-data-database/src/index.ts#validateDatabaseChecksum` →
  `packages/fungi/products/galerina-data-database/validate-database-checksum.fungi`;
- `packages-ts/galerina-core-runtime-wasm/src/record-abi.ts#WAT_HEAP_BASE` →
  `packages/fungi/products/galerina-core-runtime-wasm/wat-heap-base.fungi`.

All TypeScript shadows remain unchanged. Strict Fungi checking and building
passed **3/3**. Focused parity passed **6/6**, **3/3** (with the retained
database suite **22/22**), and **12/12**. The WAT constant also passed its
interpreter and signed-Wasm checks. Ten fresh local strict-check invocations per
target passed **30/30**, averaging **244.0 ms**, **253.6 ms** and **241.4 ms**.
The CLI benchmark subcommand remains an unimplemented diagnostic, so these are
build/check baselines rather than runtime performance claims.

The leaves preserve error-severity folding, checksum admission and the exact
WAT heap-base constant. Sparse or hostile JavaScript objects, database and
native effects, record allocation/layout, compiler integration and production
authority remain explicit boundaries. No consumer switch or production
authorization is claimed.

Receipts:

- `docs/independent-audits/2026-09-13-rd0873-fungi-wave25-core.json`
- `docs/independent-audits/2026-09-13-rd0873-fungi-wave26-data-database.json`
- `docs/independent-audits/2026-09-13-rd0873-fungi-wave27-runtime-wasm.json`
