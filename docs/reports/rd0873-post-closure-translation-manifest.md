# RD-0873 Post-Closure Translation Manifest

Date: 2026-09-10
Status: **HOLD_NON_AUTHORIZING**
Authorizing: **false**

This is a locator-only record for the first bounded TypeScript-to-Fungi wave.
The wave already has review evidence, but that evidence is non-authorizing: it
does not reopen bulk conversion, switch a consumer, retire TypeScript or admit
production use.

## Owner-signed starting state

The owner has confirmed that RD-0873 Tasks 7-9 and RD-0858 are complete and
signed off. The interrupted benchmark worker was a crash during execution, not
a failed assurance result. The accepted benchmark and corpus assurance remain
closed, including the prior 2,720-file corpus result.

The current local `main` documentation tip is
`d2e52b96100041387cbbc18dbcf00d65a46f48c8`. Subsequent commits include
generated/evidence updates, but the selected TypeScript source and listed Fungi
assets are unchanged in the current diff. The first-wave receipts below remain
historical evidence bound to their recorded exact heads; a receipt is never
upgraded merely because the checkout is now at a later head.

## Selected source and existing bounded wave

The queue's top-level inventory reports `CANDIDATE: 0`, `BLOCKED: 921`, and
`BOOTSTRAP_FLOOR: 667`. Its separate scoped-candidate list contains seven
owner-dossier entries. The selected subject is the first entry in that scoped
list, not a newly discovered queue reopening:

| Field | Value |
| --- | --- |
| Product | `galerina` |
| Package | `packages-ts/galerina-core-config` |
| Source | `packages-ts/galerina-core-config/src/index.ts` |
| Symbol | `isEnvironmentMode` |
| Span | lines 196-198 |
| Signature | `(value: string): value is EnvironmentMode` |
| Shape | complexity 0; pure scalar classifier |
| Queue reason | `COMPLETE_FIVE_SCALAR_CLASSIFIER_DOSSIER` |
| Source/queue digest | `sha256:80b4b0b8b1a8a31cff824d71ef85dba17ffcc69ef2aca1e90ba3f0a1c339864b` |
| Discovery | codebase-memory graph plus the current scoped conversion queue |

The source recognizes exactly `development`, `test`, `staging` and
`production`; every other admitted String returns `false`. It is a pure,
deterministic classifier with no loop, recursion, scheduling, filesystem,
process, network, time, randomness or mutable-state effect. The boundary must
keep the String domain explicit and must refuse wrong-class ingress rather than
coercing it.

The existing bounded wave is recorded by
`build/_rd0873-first-bounded-wave-verification-v2.json` at exact evidence head
`6325a782c4ac396c5fcfb0e986d0811ed7205c25` (tree
`bd3aa09568c766c86a08c4af94e3a2e596e39111`). Its physical lane is 10/10 PASS,
with five verified review-only subjects:

- `isEnvironmentMode` -> `packages-ts/galerina-core-config/src/self-hosted/environment-mode.fungi`
- `isTerminalScope` -> `packages-ts/galerina-core-runtime/src/self-hosted/terminal-scope.fungi`
- `isTaskEffect` -> `packages-ts/galerina-core-tasks/src/self-hosted/task-effect.fungi`
- `isResponseSafeClassification` -> `packages-ts/galerina-data-model/src/self-hosted/response-safe-classification.fungi`
- `isOmniUncertain` -> `packages-ts/galerina-core-logic/src/self-hosted/omni-uncertain.fungi`

Each twin test is present and recorded 2/2 PASS. `isBuiltin` and
`validateTransition` remain held because the current physical profile refuses
their shapes. The wave explicitly records `authoring: false`,
`consumerSwitch: false`, and `typescriptRetained: true`; the assets are review
fixtures/evidence, not permission for a new authoring batch.

## Admission boundary still held

The current readiness capsule and its fresh separate-process review both report
`HOLD_NON_AUTHORIZING`. The reference-only adapter, SLIDE and VOK observations
pass their bounded vectors, and Lyth reports `EVIDENCE_READY`, but
`authorityReleased` remains `false`. The generic Galerina checked-snapshot/GIR
route still refuses the String/checkExpr shape, the exact-subject VOK terminal
receipt is reference-only, and no owner authority release or consumer-switch
 decision is present.

### Concrete route finding

The refusal is structural, not a failed wave result. The generic emitter's
`TYPE_IDS` table currently admits `Int`, `Bool`, `Trit` and `Verdict` only
(`packages-ts/galerina-core-compiler/src/checked-snapshot-gir-emitter.ts:17`).
Its snapshot instruction path accepts parameters and safe-integer constants,
but refuses binary/call facts (lines 130-144). Its branch encoder requires
exactly two targets (lines 190-216). The selected classifier needs a String
parameter, String literal constants and a four-arm `match`; the bounded
RD-0858 scalar entry is a separate reference shape that documents a three-arm
`checkExpr` at
`packages-ts/galerina-core-compiler/src/rd0858-scalar-compiler-entry.ts:45-60`.
Therefore the generic route cannot admit `isEnvironmentMode` until a
String-capable literal-match GIR contract is deliberately designed,
implemented and independently receipted. The check-expression contract must
also remain explicit for the separate RD-0858 reference route.

The same restriction exists in the checked snapshot schema: its `PrimitiveType`
union is only `Int | Bool | Trit | Verdict`, and `SnapshotConstantV1.value` is
limited to numbers and booleans (`packages-ts/galerina-core-compiler/src/checked-module-snapshot.ts:7-13, 67-71`).
Adding String therefore needs an explicit snapshot edition/compatibility
decision and new hostile-input coverage. It cannot be treated as a harmless
emitter-only patch.

## Exclusions

- `packages-ts/galerina-core-compiler/src/self-hosted/retry-strategy.fungi` is
  an existing package-owned conversion and is not a new pilot candidate.
- `isLoPackageGraphAlias` depends on a regular-expression execution surface;
  its exact engine and work bound are not admitted here.
- `isBuiltin` and `validateTransition` are held in the bounded wave because
  their current physical profile refuses the required shapes.
- No current SLIDE, VOK or Lyth build point is asserted by this local record.
  Their reference observations must be refreshed and bound to the exact
  candidate before authority can be released.

## Missing admission inputs

The following remain required before a pilot can move from `HOLD` to authoring:

1. An owner-bound queue decision naming the exact subject, source digest,
   compiler/toolchain, profile and exclusions.
2. A checked snapshot and canonical GIR route that accepts the String/checkExpr
   semantics without coercion.
3. Independent SLIDE re-derivation, exact-subject VOK terminal admission and
   review receipts at that same build point.
4. An explicit owner authority release and consumer decision, with the
   TypeScript shadow retained until a separate retirement gate passes.

Until these inputs exist and are mutually bound, the safe next action is to
preserve this manifest as `HOLD_NON_AUTHORIZING`. No corpus scan,
branch/worktree creation, bulk `.fungi` authoring, consumer switch, TypeScript
retirement or production admission is opened by this record.
