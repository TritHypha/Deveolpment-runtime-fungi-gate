# RD-0361 housekeeping — 2026-09-13

## Current decision

**HOLD — RD-0361 is not complete at the current implementation point.**
This record is a documentation and routing update. It does not repin a digest,
change an authority array, switch a consumer, retire TypeScript, or authorize
production execution.

## Exact point and custody

- Galerina branch: `main`
- HEAD: `e716fc677d3ca609b016cf76d7f994b67fd36466`
- HEAD tree: `80aa41e53fd9cacd608bf0ba392b1d8f2c005e0a`
- Working tree: dirty; unrelated tracked and untracked changes were preserved.
- No repository `MEMORY.md` exists in this checkout. The external Codex
  `MEMORY.md` remains a locator index, so this report is the durable
  repository-owned pointer rather than a copied evidence warehouse.

## Fresh bounded checks

- RD-0361 execution lane: **26/26 passed** across 25 test files.
- Twin syntax/presence audit: **103/103 check-clean**; the registry reports
  29 authoritative entries and the #143 R4 classifier is live.
- Authority-hash verification: **28/29 clean, matching and admitted**; the
  command exits 1 and therefore remains a failed gate.
- The sole failure is
  `packages-ts/galerina-framework-app-kernel/src/self-hosted/secret-gate.fungi`:
  the ledger expects
  `ce662c325ef9ba682688a4b18097f5020fe54235ce522773f20e13d0cfda3c36`, while
  the current derived digest is
  `f062217154df66e3a72bc6adc82e47e72392c5a8d56bc8d40442090a8c8c9166`.
  WAT assembly is faithful; the refusal is the digest mismatch.
- Authority-classifier self-test passes. These checks do not prove that every
  declared twin is used by a live caller or that the retained TypeScript
  shadow can be retired.

## Independent and KB review

GPT-6 Astra's independent review classifies RD-0361 **HOLD**. R0 build
eligibility and bounded differential checks pass; R1 signed/hash-pinned
admission and R4 authority/shadow-bake completion remain open. The review also
requires immutable toolchain reproduction of the `secret-gate` result and
caller-route evidence before any retirement claim.

The KB gold control passes **12/12**. The exact RD-0361 query is preserved as
`REFUSED` because tracked RD source paths in the KB checkout are dirty; no
current supersession or private-RD decision is inferred from that refusal.

## Required next step

Reproduce `secret-gate.fungi` from an immutable committed compiler/toolchain
closure, determine whether the cause is source, emitter, module identity or a
stale pin, and repair only after that cause is identified. Then rerun the
hash/admission gate, the bounded differential and targeted mutation checks,
and document each twin's real caller route and mismatch refusal. Do not repin
solely to make the check green.
