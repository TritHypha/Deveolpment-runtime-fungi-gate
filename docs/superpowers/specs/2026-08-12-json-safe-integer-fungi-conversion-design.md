# JSON Safe-Integer Fungi Conversion Design

## Objective

Translate only the private `isPositiveSafeInteger` and
`isNonNegativeSafeInteger` decisions in
`packages-galerina/galerina-data-json/src/index.ts` into package-owned
`.fungi` semantic twins, then prove the exact admitted integer domain through
canonical execution and physical SLIDE/VOK. The TypeScript implementation and
all JSON consumers remain active.

Before admitting the slice, correct the conversion queue so symbol evidence
cannot accidentally authorize the rest of a TypeScript or MJS file.

## Source dossier

- Galerina build point:
  `287d14f012665b39af532e85981e8c8e9db75d52`.
- TypeScript source SHA-256:
  `11a177d4b21f1cc82d483e90e453b611d08a1f378384b116d25e2b8b5aa5d1be`.
- Independent SLIDE build point:
  `6de4d91ba20a7e86c53c8898fcdae2ef4b6cee28`.
- Node.js: `v24.18.0`.
- Production consumers: `validateJsonMemoryPolicy` and
  `createJsonArchiveReport`.

Both source decisions are deterministic and immutable. They accept a
JavaScript `number`, require `Number.isSafeInteger`, then require either
`value > 0` or `value >= 0`. They have no effects, exceptions, mutation,
absence, asynchronous scheduling or partial progress.

## Authority defect found during selection

The conserved queue currently attaches one classification to an entire
executable-family path. Conversion slices, however, can prove a private
symbol inside a much larger file. Marking the JSON file `CANDIDATE` would
wrongly imply that all JSON validators and report construction in the file
were admitted.

Upgrade the decision schema to distinguish `WHOLE_FILE` from `SYMBOLS`:

- a `WHOLE_FILE` decision has an empty `symbols` list and may apply any
  non-floor classification;
- a `SYMBOLS` decision is permitted only for `CANDIDATE`, has a non-empty,
  sorted, duplicate-free list of exact identifier names, and never changes
  the file-level conserved classification;
- a file with scoped candidates remains file-level `BLOCKED` with reason
  `SCOPED_CANDIDATES_ONLY`;
- generated output separately reports exact scoped candidates and their
  evidence digest;
- any missing, surplus, malformed, duplicate, untracked or bootstrap-floor
  decision refuses.

The 1,449-file denominator therefore remains conserved while the queue can
truthfully admit only the two named decisions.

## Considered approaches

1. **Symbol-scoped admission plus two predicates (selected).** This is the
   narrowest honest authority unit and closes a reusable queue flaw before it
   can widen later slices.
2. **Mark the whole JSON file as a candidate.** Rejected because the file also
   contains sets, arrays, iteration, optional values, diagnostic aggregation
   and report construction that this slice does not prove.
3. **Convert the complete JSON package now.** Rejected because it combines
   many different semantic and host boundaries and would make failures hard
   to localise.
4. **Keep the queue unchanged and document the narrower intent in prose.**
   Rejected because prose cannot override a machine-readable whole-file
   authorization object.

## Exact Fungi boundary

Create `src/self-hosted/safe-integer.fungi` with two pure flows:

```fungi
@version 1

pure flow isPositiveSafeInteger(value: Int) -> Bool
contract { intent { "Accept only positive integers within the JavaScript safe-integer ceiling." } }
{
  if value <= 0 { return false }
  if value > 9007199254740991 { return false }
  return true
}

pure flow isNonNegativeSafeInteger(value: Int) -> Bool
contract { intent { "Accept only non-negative integers within the JavaScript safe-integer ceiling." } }
{
  if value < 0 { return false }
  if value > 9007199254740991 { return false }
  return true
}
```

The admitted Fungi domain is `Int`. JavaScript floats, `NaN`, infinities and
non-number values are not coerced into that domain; the physical typed border
must refuse them. Within the admitted integer domain, the upper safe-integer
ceiling is checked explicitly so wide SLIDE integers cannot gain authority
that TypeScript would deny.

The source contains no null, NaN value, `else if`, `throw`, `try`, `catch`,
`for`, `while` or `loop`. It adds no effect, capability, contract permission,
Hallmark, border grant, global vault access or host API.

## Decision and effect ledger

| Source decision | Subject | Fungi construct | Effects | Exit |
|---|---|---|---|---|
| `Number.isSafeInteger(value)` | JavaScript number domain | typed `Int` border plus explicit upper bound | none | false/refusal |
| `value > 0` | `Bool` | sequential terminal `if` | none | true/false |
| `value >= 0` | `Bool` | sequential terminal `if` | none | true/false |
| value above `2^53 - 1` | `Bool` | sequential terminal `if` | none | false |

## Threadability

Classification: `PARALLEL_PURE`.

The two flows are immutable deterministic leaf compute over one owned scalar.
They hold no shared state and release no authority. Their public callers are
not thereby authorized for parallel execution; JSON parsing, active compute,
diagnostic mutation, report construction and publication retain their own
independent classifications.

## Proof shape

1. RED-test the schema-v2 queue so a symbol decision cannot change the
   file-level denominator or authorize sibling symbols.
2. Commit this design, bind its SHA-256 into an exact scoped queue decision,
   and prove exactly two scoped candidates for the JSON path.
3. RED-test the absent package-owned Fungi source and required flows.
4. Compare the private TypeScript decisions, their public callers, typed Fungi
   interpretation and signed/admitted Wasm at zero, both sides of zero,
   `2^53 - 1`, and the first refused wide integer.
5. Compile the exact Fungi bytes through independent SLIDE, publish one
   physical `.slide`, re-admit it through VOK, and verify typed Bool receipts.
6. Refuse floats, NaN-like values, infinities, non-integers, wrong arity,
   source mutation, receipt mutation and physical artifact mutation.
7. Register the proof and refresh only bounded owning tests, graphs, counts,
   roadmap outputs and indexes. Full tooling, `graph-all`, normal phase-close
   and monolithic memory evaluation remain excluded because those aggregate
   lanes are crash-linked.

## Authority boundary

This is a reference-only symbol conversion proof. It does not authorize the
rest of `index.ts`, switch a consumer, retire TypeScript/MJS, widen a grant,
parallelise JSON active compute, release authority, or claim bootstrap,
production, hardware, signing, release or durability evidence.

## Adjudication after live SLIDE inspection

Status: `BLOCKED` before implementation.

The current SLIDE checked-Fungi typed boundary maps Galerina `Int` to `i32`
and does not admit `Int64`. The TypeScript predicates accept safe integers up
to `2^53 - 1`, so an i32-only physical proof cannot establish the design's
required full-domain parity. No `.fungi` source or conversion test was added.
Resume only after a separately reviewed typed `Int64` SLIDE/VOK boundary can
admit, execute and independently verify the required edge values.
