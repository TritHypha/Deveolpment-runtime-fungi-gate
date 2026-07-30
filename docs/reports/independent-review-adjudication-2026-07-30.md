# Independent review adjudication

Date: 2026-07-30

Status: first Galerina/SLIDE review pass reconciled

Policy: reviewer reports are advisory evidence; source and fresh execution
decide implementation state

## Review timing

The independent reports under the Knowledge Base `ai-reviews/reports/`
directory inspected the worktree while the registry-generation slice was
uncommitted. Their Galerina reports identify HEAD `27ade1b2` and describe
generation persistence, accepted-state binding and exact generation loading
as absent or prototype-only.

Those observations were accurate for their inspection boundary. Commit
`1c20cd5c` subsequently added the content-addressed store, generation ID,
exclusive publication, re-open verification, authenticated accepted-generation
binding and exact production loading. The production controller still admits
no platform durability adapter, so the release conclusion remains red.

## Galerina finding adjudication

| Finding | Decision | Current evidence/action |
|---|---|---|
| Durable generation activation absent | Partly superseded | Immutable generation construction, publication, verification and exact state binding are implemented. Windows/Linux/macOS admitted durability adapters and the crash/fault matrix remain release-blocking |
| GIR still depends on producer AST for WAT lowering | Accepted, open | Detached GIR must become the only independently decoded backend semantic input before SLIDE replacement or TypeScript retirement |
| Cross-platform rows configured but unexecuted | Accepted, open | Clean-host Windows 10/11, Linux-family and macOS evidence remains required |
| No pinned release tree/toolchain receipt | Accepted, later release gate | Produce the machine-readable release receipt only after the red implementation gates close; a report or local branch name cannot authorize release |
| Public status contained local custody metadata | Accepted, corrected | Exact local file size and timestamp were removed from the public TODO. Key contents remain unread and private |
| Every release-critical tool needs anti-neuter/freshness evidence | Accepted, open | The existing audit meta-gate is strong but the terminal release receipt must bind tool subject, source snapshot, control/mutation evidence and output |
| Production might accept legacy v1 index | Already closed; test gap fixed | `verifyRegistryIndexUnderDelegation` already hard-refuses every schema except v2 and requires the hybrid envelope. A direct v1 downgrade-refusal assertion now preserves that boundary |
| Nineteen signing refusal codes lacked direct test mention | Accepted, open | Build one negative or mutation witness per release-relevant refusal code; do not mark a code covered merely because an aggregate suite is green |
| Canonical-string correspondence was the only generation equality check | Accepted, fixed | Generation verification now performs field-wise entry/list equality and canonical-byte equality |
| One nested package remains | Accepted, tracked | Keep the shrink-only ratchet and retire it with the flat-package/Node dependency cutover |

## SLIDE finding adjudication

Both reviewers agree that SLIDE is an executable bounded reference frontend,
not yet a general independent low-level platform or Wasm replacement. The
following remain dependency-ordered exit gates:

1. detach, encode, decode and independently validate complete GIR;
2. make GIR the sole backend semantic input;
3. freeze the memory, effect, capability, budget and package ABI profiles;
4. implement native object/lowering, loader, runner and broker lanes;
5. implement separate SLIDE trust domains and key lifecycle;
6. execute platform, fault, equivalence and reproducibility matrices;
7. only then switch Galerina packages and retire TypeScript/Wasm/npm oracles;
8. publish comparative benchmarks only over equivalent executable workloads.

VPEG and the Neural Shape Engine remain experimental. Learned or cached
proposals may reduce search, but cannot grant authority, change semantics,
collapse K3 or bypass deterministic re-derivation.

## Package conversion consequence

External AIs can safely prepare read-only per-package dossiers now. Actual
source translation remains locked until the executable SLIDE ABI, effects
boundary and differential harness are frozen. The coordinating artifacts are:

- `docs/research-prompts/galerina-package-fungi-conversion-agent-template.md`;
- `docs/research-prompts/galerina-package-fungi-conversion-batch-01.md`.

This separation allows parallel analysis without creating incompatible
`.fungi` dialects or silently weakening current security exits.

## Current release verdict

Galerina beta v1 remains non-authorizing. The current principal engineering
blocker is admitted cross-platform registry-generation durability plus
crash/fault evidence. Detached GIR, refusal-code witnesses and pinned
release-receipt work also remain before the terminal release gate. No new
owner-key ceremony is required for these engineering tasks.
