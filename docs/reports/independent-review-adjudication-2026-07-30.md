# Independent review adjudication

Date: 2026-07-30

Status: ten-report Galerina/SLIDE/GATE/TLL/KB review pass reconciled

Policy: reviewer reports are advisory evidence; source and fresh execution
decide implementation state

The cross-repository finding ledger and dependency order are recorded in
`../../../ZTF-Knowledge-Bases/ai-reviews/INDEPENDENT-REVIEW-ADJUDICATION-2026-07-30.md`.
This in-repository report remains the Galerina release-facing view.
External/AI proposals must complete the companion
`../../../ZTF-Knowledge-Bases/ai-reviews/ZERO-TRUST-ADOPTION-SCORE.md` gate
after R&D and before architectural adoption.

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
| Nineteen signing refusal codes lacked direct test mention | Accepted, fixed | The recon now reports 51/51 signing-path refusal codes with direct test mention. Each formerly uncovered code has a specific negative/control witness; fault injection also exposed and fixed the pre-emptive compiler import that made the hybrid-verifier-unavailable diagnostic unreachable |
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

The additional SLIDE/predecessor findings add four explicit prerequisites:

1. move the live V2 GIR contracts out of the uncommitted predecessor and into
   a committed SLIDE authority path before archiving the predecessor;
2. bind every profile claim to its exact executable envelope and source-set
   digest;
3. add an ordinary action-cache control to the VPEG experiment so graph reuse
   is not compared only with “no reuse”; and
4. close the historical `while -> if -> if -> while` mutation-propagation
   regression in Galerina and share it with SLIDE.

The digest-suite agility finding is accepted as a versioned shared-contract
migration. It must not be “fixed” by loosening the current canonical digest
regex: old/new decoding, downgrade refusal and fixture migration are required.

## Adjacent-project consequences

GATE v3 remains outside the beta authority path and `.gate` remains late/on
hold. Before any future integration, its fail-open unknown registry-type path,
untrusted default `check`, port-name-derived K3 shape, missing resource
ceilings, unsigned registry generation and incomplete semantic fingerprint
must close at the public seam.

The Knowledge Base review found a producer-side private-index gap and stale
diagnostic branding. The KB generator now excludes private-classified sources
before reading/indexing them, the five review prompts use portable workspace
placeholders, and the current authority model uses `FUNGI-SEC-014`. A
machine-readable authority/supersession snapshot and generation-mismatch gate
remain open; until they exist, lexical retrieval is evidence discovery rather
than implementation authority.

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
crash/fault evidence. Detached GIR and pinned release-receipt work also remain
before the terminal release gate. No new owner-key ceremony is required for
these engineering tasks.
