# RD-0873 direct package waves 16–18 — 2026-09-13

Three Luna – High workers completed one bounded leaf per package under the
owner-authorized direct package plan:

- `packages-ts/galerina-ai/src/index.ts#defineAiSafetyPolicy` →
  `packages/fungi/products/galerina-ai/define-ai-safety-policy.fungi`;
- `packages-ts/galerina-ai-agent/src/index.ts#validateAgentLimits` →
  `packages/fungi/products/galerina-ai-agent/validate-agent-limits.fungi`;
- `packages-ts/galerina-data-archive/src/index.ts#validateChecksumRef` →
  `packages/fungi/products/galerina-data-archive/validate-checksum-ref.fungi`.

All three TypeScript shadows remain unchanged. Strict Fungi check and build
passed **3/3**. Focused parity passed **2/2**, **6/6** and **4/4**. Ten fresh
local strict-check invocations per target passed **30/30**, with mean startup-
inclusive timings of **245.9 ms**, **248.1 ms** and **244.8 ms** respectively.
The CLI benchmark subcommand remains an unimplemented diagnostic, so these are
interim build/check timings rather than runtime performance claims.

The archive target required one syntax repair: a nested quote expression was
rewritten as a plain concatenation accepted by the Fungi lexer. The resulting
target was rechecked and rebuilt successfully. This is recorded as an issue and
improvement rather than hidden.

The leaves preserve fail-closed defaults, ordered limits and checksum-shape
validation. JavaScript getter/proxy behavior, provider/model loading, host
marshalling, cryptographic computation, archive I/O and production authority
remain explicit boundaries. No consumer switch or production authorization is
claimed.

Receipts:

- `docs/independent-audits/2026-09-13-rd0873-fungi-wave16-ai.json`
- `docs/independent-audits/2026-09-13-rd0873-fungi-wave17-ai-agent.json`
- `docs/independent-audits/2026-09-13-rd0873-fungi-wave18-data-archive.json`
