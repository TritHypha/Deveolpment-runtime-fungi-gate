# RD-0873 GPT-6 Astra pre-translation architecture review

Date: 2026-09-12
Repository: Galerina
Reviewed commit: `f4b4b24d9be5ef1522423eff43286fe800ef66b5`
Reviewed tree: `5c99fd20ba78e21b607b860eab60ca5d14ec7721`
Provider/model: GPT-6 Astra
Status: advisory, non-authorizing

## Purpose and custody

GPT-6 Astra reviewed the bounded pre-translation architecture at the exact
committed head above. The review was read-only. It did not create Fungi source,
change the queue, switch a consumer, retire TypeScript, reopen corpus assurance,
or grant production authority. The composed prompt is retained in the session
bridge as `astra-rd0873-architecture-review-prompt.md`.

The review used these repository-owned records:

- `docs/plans/2026-09-11-selective-fungi-conversion-scope.md` (S)
- `docs/reports/2026-09-12-selective-conversion-role-reconciliation.md` (R)
- `docs/independent-audits/2026-09-12-rd0873-current-head-role-reconciliation-v1.json` (J)
- `docs/independent-audits/2026-09-11-rd0873-bulk-wave-admission-proposal.json` (P)
- `docs/TODO.md` (T)
- `docs/ROADMAP.md` (M)

The live queue remains 1,605 rows: `CANDIDATE: 0`, `BLOCKED: 921`,
`BOOTSTRAP_FLOOR: 684`. The available PROJECT receipt is stale and was not
rerun. Physical profile order remains scalar `1`, then packed `64`, then
high-throughput `256`; `32` is a compatibility fallback only.

## KB R&D cross-check

The KB R&D adapter gold control passed (`12/12`). The range query for
`RD-0858..RD-0873` was refused because tracked RD source paths in the KB working
tree are dirty; this is preserved as a refusal, not treated as current evidence.
The metadata index itself records:

- `RD-0858` — private, dated 2026-08-20, state `SOURCE-CHECKED design analysis; HOLD for compiler implementation and language admission`.
- `RD-0873` — private, dated 2026-08-28, state `SOURCE-CHECKED planning decision; HOLD for implementation until the corpus, conversion-receipt and queue foundations are green`.

Public KB locators in `research/RD-TODO-MAP.md`, `AI_INDEX.md` and
`00-KB-INDEX.md` point to those private records. The KB metadata was built at
observed source commit `1baff11943c6286fab376ebdbfef5a48300e4db7`; because the
adapter refused on dirty source paths, no current-decision claim is upgraded
from this index.

## Astra findings

### Claims

- **CONFIRMED:** governing text separates authorized candidate authoring and
  repair from proof of correct execution. Historical proposals and a zero
  whole-file candidate count do not invent repeated permission gates. Their
  continued exact-head applicability is **NOT VERIFIABLE**.
- **CONFIRMED:** a recorded housekeeping/compact pause remains in the supplied
  TODO/roadmap records. Whether an owner-visible disposition has since occurred
  is **NOT VERIFIABLE**. The pause must not be confused with a blanket
  withdrawal of standing work authority.
- **PLAUSIBLE:** selective conversion can preserve behavior while retaining
  JS/TS tooling, compiler/bootstrap shadows and native/host adapters. Complete
  deployment closure, current physical admission and durable pipeline recovery
  are **NOT VERIFIABLE**.
- **Weakest claim:** a package named `devtools` is not by itself proof that every
  symbol is non-runtime. Compiler dependencies and loaded assets require
  consumer evidence.

### Authority and architecture vector

**MUST:** keep standing work authority, scheduling, semantic verification,
physical admission and production activation as separate gates. Queue
reconciliation cannot replace authorization. An authorized repair may remain
schedulable after the recorded pause is resolved, while an unadmitted consumer
switch must refuse.

**MUST:** bind the same subject across the checked snapshot, canonical GIR,
SLIDE plan/object and VOK admission, including semantic, profile, toolchain and
target identities plus lengths/digests. Pairing a GIR from subject A with a
snapshot from subject B, or profile-64 planning with profile-1 evidence, must
fail before execution. Current enforcement is **NOT VERIFIABLE**.

**MUST:** retain a reversible candidate boundary and a separate activation
record. A Fungi twin, passing test, retained TypeScript wrapper or rollback
request must never implicitly select a production consumer.

**SHOULD:** classify mixed packages by symbol and deployment profile. Follow a
compiler entrypoint through devtools dependencies and loaded assets; shipping
evidence can reverse a tooling-only disposition.

**Non-negotiable control:** unknown, mismatched, stale or replayed execution
evidence must never acquire VOK execution authority.

### Semantic and physical vector

**MUST:** establish profile-1 parity over the caller contract: values, failures,
mutation visibility, callback order/count and host effects, not Boolean output
alone. Minimal discriminators include `NaN`, infinities, `-0`, fractions and
precision boundaries; absent versus explicit `undefined`; sparse holes; aliases
to one mutable container; Map order and object-key identity; and callbacks that
mutate later elements or throw. Applicability per symbol is **NOT VERIFIABLE**
until its source contract is fixed.

**MUST:** distinguish a bounded ABI from source-wide equivalence. The finite
Float64 Option lane must not accept a caller value that the source contract
allows as infinity. Wrong-kind handles and accessor/mutation effects during
marshalling need explicit checks.

**MUST:** before profile 64, test lengths `0,1,63,64,65`, tail masks, invalid
packed Trit encodings and callback/state ordering. Before profile 256, test
`255,256,257`, block boundaries, overlap, alignment and target-feature refusal.
Preserve required floating reduction order; `[1e16,-1e16,1]` distinguishes
regrouping.

**DEFER:** profile 256, compatibility 32 and speculative adapter rewrites until
measured benefit or demanded behavior justifies them. No supplied measurement
establishes that benefit.

### Operational continuity vector

**MUST:** use one immutable wave manifest and a durable per-item transition
record containing scope, dependency identities, limits, attempts, output
digests, stage and terminal reason. Acceptance is stage-qualified and follows a
durable evidence recheck; it never means production activation.

The discriminating crash test is to terminate after output creation but before
acceptance, then resume without duplicate execution or false completion.
Durability is **NOT VERIFIABLE** from the supplied records.

**MUST:** treat proposal limits as proposals, not executed policy. Revalidate
identities and cumulative accounting on resume; changed dependencies invalidate
affected acceptance; manual retries are distinct attempts.

**SHOULD:** continue independent eligible items while failed entries and their
dependants remain visible. Close a package with manifest reconciliation,
affected-caller checks and broader package evidence. A global compiler change
requires impact-based expansion; one twin does not justify a full-corpus rerun.

## Adjudication

| Review point | Disposition | Basis |
| --- | --- | --- |
| Separate role, scheduling, verification, physical admission and activation gates | UPHELD | Matches the selective-conversion plan and existing authority ledger. |
| Profile order `1 -> 64 -> 256`, with `32` fallback only | UPHELD | Matches current TODO/roadmap; Astra adds discriminating boundary probes. |
| Queue zero candidates does not cancel already authorized repairs | UPHELD | Queue is historical/non-authorizing inventory; it cannot grant or remove owner authority. |
| Devtools label proves non-runtime | PARTIAL | Retention is the default, but compiler dependencies and loaded assets require evidence. |
| Proposal limits are already an executed policy | UPHELD | Proposal record explicitly leaves aggregate caps unexecuted. |
| Exact checked-snapshot/GIR/SLIDE/VOK binding is enforced | NOT_VERIFIABLE | Architecture requires it; current enforcement receipt was not supplied. |
| Crash-safe resume and durable acceptance are implemented | NOT_VERIFIABLE | Required contract is specified, but implementation evidence is absent. |
| Profile-1 semantic closure is complete for every candidate | NOT_VERIFIABLE | Focused repairs do not prove mutable/alias/callback/host closure. |

## Pre-translation order adopted

1. Reconcile the recorded pause and current owner authority without manufacturing
   a new approval gate.
2. Establish deployment and symbol roles, dependencies and unresolved scope.
3. Bind an immutable manifest and bounded checkpoint contract; separate current
   evidence from the historical queue.
4. Verify refusal controls across the checked-snapshot/GIR/SLIDE/VOK chain.
5. Establish profile-1 semantic and host-boundary parity while retaining TS
   shadows.
6. Process admitted items through durable ready/checking/repair/accepted stages;
   close each package by affected scope.
7. Admit 64, then 256 only with independent physical evidence and measured
   justification. Consumer switching and TypeScript retirement remain separate.

This review changes the pre-translation checklist and architecture notes only.
It does not start `.fungi` authoring, promote the queue, reopen PROJECT
assurance, switch a consumer, retire TypeScript or grant release authority.
