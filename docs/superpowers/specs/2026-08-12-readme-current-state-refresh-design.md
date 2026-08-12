# Galerina README current-state refresh design

## Objective

Replace the README's accumulated historical claims with a concise, current and evidence-led entry point. The README must explain what Galerina is, how `.fungi` reaches executable targets today, what SLIDE/VOK has actually proved, what remains bootstrap or compatibility work, and where detailed evidence lives.

## Evidence boundary

The refresh derives current facts from repository-owned sources:

- `version.json` for the canonical package and test count;
- `galerina.workspace.json` and component health for package inventory;
- `scripts/status.mjs` and the beta-to-SLIDE roadmap for current blockers;
- the RD-0528 and RD-0361 ledgers through the generated subway block;
- `docs/examples/golden/` for checker-proven language examples;
- the benchmark result metadata and truth-audited reports for performance claims;
- the live CLI help for commands that currently execute.

No roadmap assertion is promoted to production authority. A bounded proof is described as bounded, a compatibility path as compatibility, and an absent production SLIDE measurement as unmeasured.

## Chosen structure

1. Product definition and current checkpoint.
2. Language and zero-trust properties.
3. Honest execution architecture: current CLI/bootstrap lane and bounded SLIDE/VOK lane.
4. Checker-proven example and CLI quick start.
5. Current project status, including the generated subway block.
6. Package families, benchmarks and evidence links.
7. Licence and contribution/navigation links.

This makes the README an index rather than a historical warehouse. Detailed security proofs, architecture adjudications, long status narratives and R&D remain in their owning documents.

## Alternatives considered

### Patch isolated stale sentences

Rejected. The same obsolete WASM-first model appears in the introduction, feature list, security section, architecture diagrams, application build description, benchmark prose and tool examples. Local edits would leave contradictions.

### Preserve the long historical narrative

Rejected. It duplicates generated status, embeds dated implementation details and makes current authority boundaries hard to find.

### Evidence-led rewrite

Selected. Preserve useful product explanations and generated owner regions, but rewrite the surrounding prose around current sources and explicit trust boundaries.

## Non-negotiable claims

- `.fungi` is the source language and GIR remains the governed intermediate representation.
- The live CLI still provides the compatibility/bootstrap WAT/WASM path.
- Independent SLIDE can execute bounded admitted source families through physical `.slide`, independent re-admission and affine VOK.
- That bounded evidence is not general backend completion, production authentication, platform durability or release authority.
- TypeScript remains in the executing/bootstrap and host-tool surface until exact retirement gates close.
- The former production DSS sidecar is retired; the optional Wasmtime lane is development evidence, not production authority.
- `null`, NaN, exceptions and implicit fall-through are not part of the governed authoring model; decisions and failures remain typed and exhaustive.
- Performance conclusions require like-for-like admitted workloads and units.

## Generated ownership

The `SUBWAY:BEGIN` to `SUBWAY:END` region remains generator-owned. The rewrite must preserve its markers and use `scripts/gen-roadmap-subway.mjs` for any generated change.

## Acceptance

- No statement calls WASM the future production path.
- No statement calls bounded SLIDE/VOK evidence production authority.
- Current package and test counts have one canonical rendered claim.
- Examples come from the strict Golden Pack.
- CLI commands match live help.
- Links, path-leak, generated-roadmap and README claim checks pass.
