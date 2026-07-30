# Independent review prompt 7 — flat package and SLIDE migration gates

You are an independent monorepo, package-manager, build-system, and migration
reviewer. Work read-only.

## Question

Does Galerina's one-package-one-top-level-instance rule, combined with the
SLIDE migration ledger, prevent npm-style nested duplication without creating
dependency confusion, undeclared reach-through, or premature component
deletion?

## Evidence

- `docs/architecture/flat-package-topology-and-post-slide-migration.md`
- `scripts/audit-flat-package-topology.mjs`
- `scripts/tests/audit-flat-package-topology.test.mjs`
- `galerina.workspace.json`
- `packages-galerina/galerina-devtools-wasmtime-oracle/`
- `../SLIDE/docs/GALERINA-INTEGRATION-MIGRATION-PLAN.md`
- package graph, provenance, SBOM, naming, registry, and test tools

Do not crawl `node_modules`, Cargo `target`, or generated build trees. Use
manifests, generated summaries, and explicit small samples.

## Required output

1. Current topology facts and measured debt.
2. Canonical identity/version/ABI/digest/signature/root-lock resolution
   algorithm.
3. Conflict, cycle, duplicate, shadowing, symlink, nested-manifest, and
   runtime-download attacks.
4. How Cargo crates used by a development oracle differ from Galerina
   application packages/plugins.
5. Producer-consumer migration map for Wasm, WAT, TypeScript, Node packages,
   Tower Citizen, Tri-Pipe, Tri-Fuse, memory, brokers, and SLIDE.
6. Named proof required before each old component can be removed.
7. Rollback and coexistence rules without unsafe fallback.
8. Cross-platform clean-clone/reproducibility tests.
9. Final post-SLIDE zero-debt gate.
10. Verdict and prioritized corrections.

No passing graph, signature, cache, or local package presence may itself grant
execution authority.
