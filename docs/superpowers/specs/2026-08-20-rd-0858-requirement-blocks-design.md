# RD-0858 requirement blocks design

## Status and authority

The owner approved the hybrid design direction in chat on 2026-08-20. Delivery
units 1–3 are implemented and independently reviewed. Delivery unit 4 remains
on an architecture `HOLD`; this specification does not authorize the pending
process-boundary implementation.

This design implements the adopted decision in private RD-0858 without copying
private R&D prose into the public repository. Its checked inputs are:

- RD-0858 at recovered KB source commit
  `11199e25dd9ba6cc9a995b7e9e0dd79293e061bf`;
- the owner-supplied requirement-block proposal with SHA-256
  `ce6bafeecac358732a09a970b7e18353d44bd6d48e72b90982c0c1d5b7ff6ecf`;
- the Unit 4 Galerina source commit
  `fd90d7ea7bdbf861d550f1ad192b1da276c75705` and exact graph/index head
  `1f7fc227e1c1303da259329a5067a5c22cf6aab7`.

RD-0858 remains `HOLD` for compiler implementation and language admission
until the complete route in this specification passes its controlled-red and
green evidence gates. No new `.fungi` conversion may rely on these constructs
before that admission.

### Current Unit 4 checkpoint — 2026-08-21

- [x] Post-bootstrap Bool/Verdict admission and all governed execution tiers
  pass the focused 37/37 controls and the 335/335 proportional matrix.
- [x] Repository roadmap and graph checks pass 4/4 and 9/9; the external index
  is exact at 64,170 nodes and 164,256 edges.
- [x] Model-diverse review finds no ordinary-input bypass after trusted process
  bootstrap.
- [!] Independent review reproduces four pre-bootstrap attacks against
  `node:util/types` and `node:vm`, including retained-state variants. Each
  restores the visible built-in before execution yet reaches guarded `ALLOW`.
- [!] No further in-process JavaScript reflection patch may claim closure. The
  pending design is a sealed native bootstrap that fixes runtime and worker
  identities, accepts only bounded canonical bytes and emits a bounded refusal
  or result receipt. Implementation requires explicit owner approval.

The TypeScript interpreter remains differential evidence only. Checked
snapshot, canonical GIR, SLIDE re-admission and VOK remain the authorizing
route, and `.fungi` conversion remains stopped.

## Decision

Adopt first-class `requirement` expressions and `require` statements in the
AST and canonical GIR. Define their semantics by the existing ordered K3
lattice and exhaustive `check` control, but retain the first-class nodes until
the checked snapshot has bound their identity and evidence plan.

This hybrid is narrower than a new policy virtual machine and safer than
Bool-only syntax sugar:

- it preserves `UNKNOWN` instead of coercing it to Bool;
- it never infers a failure return from the enclosing flow;
- it reuses the existing Verdict and exhaustive-branch semantics;
- it retains enough structure for effects, taint, redaction, receipts, SLIDE
  re-admission and VOK authority;
- it does not make WAT or the TypeScript interpreter an authority source.

## Goals

- Replace repetitive authorization `if` chains with a flat, auditable,
  fail-closed decision surface.
- Permit Bool and Verdict constraints without implicit cross-domain coercion.
- Continue only on exact `Verdict.Allow` (`+1`).
- Distinguish semantic `DENY`, epistemic `UNKNOWN`, and operational failure.
- Require pure, bounded constraint evaluation.
- Prevent raw taint or an undeclared sanitizer from minting `ALLOW`.
- Preserve ordered constraint evidence through canonical GIR, checked snapshot,
  physical SLIDE execution, independent re-admission and VOK receipt issuance.
- Expose useful internal evidence without leaking values or source text at an
  external boundary.

## Non-goals for version 1

- Local bindings inside a `requirement` block.
- Nested requirement blocks.
- Named or reusable requirement sets.
- Refinement-type syntax.
- Soft, warning-only requirements.
- User-selectable short-circuit policy.
- Inferred failure values for Bool, Result or other return types.
- Automatic authority for functions named `validate`, `sanitize`, `parse` or
  similar.
- Production admission through WAT alone.

## Surface syntax

### Expression form

```fungi
let admission: Verdict = requirement {
    age >= 18
    role_is_admitted(role)
    validate_account(account)
}
```

The expression returns `Verdict`, never Bool. Each constraint must type as
Bool or Verdict.

### Statement form

```fungi
require admission {
    deny: fault RequirementDenied
    ambig: fault RequirementUnknown
}

perform_action()
```

The statement accepts a Bool or Verdict subject. Its `deny` and `ambig` arms
are both mandatory, unique and terminal. Exact `ALLOW` has no arm: it is the
only value that continues to the next statement.

The subject may be an inline requirement expression:

```fungi
require requirement {
    age >= 18
    validate_account(account)
} {
    deny: return Err(RequirementDenied)
    ambig: return Err(RequirementUnknown)
}
```

### Grammar

```text
RequirementExpr       ::= "requirement" "{" RequirementConstraint+ "}"
RequirementConstraint ::= Expr (newline | ";")

RequireStmt           ::= "require" Expr "{" RequireArm RequireArm "}"
RequireArm            ::= ("deny" | "ambig") ":" (Statement | Block)
```

Comments and blank lines do not create constraints. A semicolon is the same
separator as a newline. A block with no constraints is a compile error.

## Semantic algebra

Galerina uses the closed ordered domain:

```text
DENY (-1) < UNKNOWN (0) < ALLOW (+1)
```

Each constraint is converted to this domain exactly:

```text
Bool false  -> DENY
Bool true   -> ALLOW
Verdict -1  -> DENY
Verdict  0  -> UNKNOWN
Verdict +1  -> ALLOW
```

No other value, integer, tag or truthiness rule participates. A forged or
out-of-range runtime trit is an operational failure and cannot select an arm.

A requirement expression evaluates constraints in source order and evaluates
every constraint that returns normally. It then computes the K3 minimum of
the ordered results. It does not short-circuit on `DENY`. Complete evaluation
is required so the internal receipt can distinguish one failure from several
and so block-level timing does not disclose the first failing ordinal through
skipped pure calls. This is not a general constant-time guarantee.

An operational error, trap, timeout, exhausted budget or invalid runtime value
terminates evaluation immediately through the existing fail-closed runtime
envelope. It is not converted into semantic `UNKNOWN` and does not run either
semantic handler.

For `require subject { ... }`:

- exact `ALLOW` continues;
- exact `DENY` executes the `deny` arm;
- exact `UNKNOWN` executes the `ambig` arm;
- non-canonical or operational failure terminates through the runtime envelope;
- a handler that returns normally to the guarded continuation is invalid.

The compiler proves each handler is terminal through `return`, `fault`, or a
block whose reachable paths are all terminal. Handler return expressions must
match the enclosing flow's declared return type. There is no implicit false,
Err value or default fault.

## AST contract

Add four first-class node kinds:

```text
requirementExpr
requirementConstraint
requireStmt
requireArm
```

The shapes are:

```text
requirementExpr.children = ordered requirementConstraint nodes
requirementConstraint.children = [expression]

requireStmt.children = [subject, denyArm, ambigArm]
requireArm.value = "deny" | "ambig"
requireArm.children = [terminal statement or block]
```

Every new node retains its exact source location. Surplus or malformed nodes
must never be retained as authorizing children after a ceiling or grammar
diagnostic.

## Type, effect and governance checks

The type checker enforces:

- every constraint is Bool or Verdict;
- a require subject is Bool or Verdict;
- Bool lifting uses the exact two-row mapping above;
- both handlers exist exactly once;
- both handlers are terminal;
- handler returns match the enclosing flow type;
- empty and nested requirement expressions are rejected.

The effect checker evaluates the complete transitive call graph of every
constraint. Version 1 permits only `EffectFree` expressions and calls to
admitted pure flows. Logging, metrics, I/O, mutation, capability use, ambient
state and unresolved calls are compile errors. A pure declaration is not
trusted by name: its observed transitive effects must also be empty.

The governance verifier rejects any path on which `DENY` or `UNKNOWN` can
reach the guarded continuation, any non-terminal handler, any malformed
constraint list, or any lowering that loses an ordinal or handler identity.

Constant analysis may report a statically true or false constraint. Version 1
must retain the constraint in canonical GIR and the evidence map; it may not
erase or reorder an authority-relevant entry.

## Taint and validator authority

Both the value-state checker and the dedicated taint checker are mandatory
for the checked snapshot. The current checked-snapshot helper must be extended
to include the dedicated taint result before it can admit this syntax.

A tainted value may not participate directly in comparison, member access,
Boolean logic or a normal predicate inside a constraint. There are two valid
routes:

1. transform and admit the value outside the requirement through an existing
   checked value-state boundary, then use the resulting clean value; or
2. pass the tainted value to a declared validator whose admitted contract
   consumes that exact taint class and returns Verdict.

A validator is authority metadata, not a naming convention. Its registry row
must bind at least:

- qualified flow identity and source build point;
- exact input and taint class;
- Verdict output type;
- observed `EffectFree` result;
- checked GIR/SLIDE profile and digest;
- version and expiry or freshness identity.

Missing, ambiguous, stale or mismatched validator authority is a compile or
admission refusal. A sanitizer, parser or clean-value converter is not a
validator unless the registry separately admits it. Raw taint, a sanitizer
Boolean, or an unregistered call can never mint `ALLOW`.

## Bounds

Version 1 has closed ceilings:

- at most 64 constraints per requirement expression;
- no nested requirement expression;
- no local declaration inside a requirement expression;
- the existing parser expression and statement depth ceiling of 256 applies;
- the authoritative checked-snapshot adapter accepts at most 1 MiB of source;
- the checked receipt remains bounded to 64 KiB;
- evaluation shares the enclosing call's existing `maxSteps`, `maxIterations`
  and wall-clock deadline; a requirement cannot reset or enlarge them;
- each validator call is charged to the same shared budget.

The general lexer 10 MiB file ceiling remains a compiler input guard. It does
not widen the stricter 1 MiB detached-authority profile.

Exceeding any ceiling is an error or refusal. Surplus constraints are never
silently truncated into an authorizing block.

## Canonical GIR and identity

The GIR emitter must preserve first-class requirement structure. It may not
emit `void` for a requirement node or collapse the block into an opaque Bool.

The canonical representation contains:

```text
GIRRequirementExpr {
  id
  evaluation = "COMPLETE_K3_MIN_V1"
  orderedConstraints[] {
    id
    ordinal
    inputKind = "Bool" | "Verdict"
    expression
    validatorRefs[]
  }
  bounds
}

GIRRequireStmt {
  id
  subject
  denyHandlerId
  ambigHandlerId
}
```

Requirement IDs are deterministic, domain-separated hashes of the canonical
node kind, enclosing package and flow identity, source-order ordinal,
canonical expression GIR, validator references and handler identities. Source
text, local absolute paths and nondeterministic generated IDs are not hashed
into the public identifier. Reordering, adding, removing, changing or
relabelling a constraint changes the requirement identity.

Canonical GIR keeps source mappings separately. `computeGIRHash` continues to
strip nondeterministic timestamps and generated IDs before sorting keys. The
requirement plan contributes to the producer GIR digest.

## Checked snapshot, SLIDE and VOK route

The authorizing route is:

```text
checked Galerina source
  -> parser / symbol / type / effect / value-state / taint / governance
  -> canonical requirement GIR
  -> detached checked snapshot
  -> physical SLIDE lowering and execution
  -> independent SLIDE re-admission
  -> exact-subject VOK lease and receipt
```

The checked snapshot binds:

- normalized source digest and byte length;
- semantic-token digest;
- producer GIR digest;
- requirement-plan digest;
- ordered instruction/source mappings;
- validator registry digest and freshness identity;
- diagnostic, memory, effect, failure and capability plan digests;
- package, profile, flow and compiler identities.

Lowering evaluates each constraint into a distinct bounded temporary before
performing the K3 minimum. This preserves complete evaluation while reusing
existing scalar K3 operations. The require gate lowers to an exact three-way
decision: ALLOW continues, DENY enters the deny terminal, UNKNOWN enters the
ambig terminal. No sign test, truthiness test or two-way branch is acceptable.

Independent re-admission reconstructs the ordered requirement plan from the
physical package and compares every digest and mapping. VOK may mint only when
the independently observed result is exact `ALLOW`, the exact subject and
profile match, all receipts are fresh, and no refusal or finding exists.

The TypeScript interpreter and WAT emitter may implement matching semantics
for differential and compatibility tests. Neither route grants production
authority, and a green WAT test cannot replace the detached GIR/SLIDE/VOK
evidence chain.

## Evidence and redaction

Internal evidence records, for every evaluated constraint:

- requirement and constraint IDs;
- ordinal and source mapping ID;
- Bool-lift or Verdict input kind;
- canonical result trit;
- admitted validator references;
- evaluation status and bounded-work counters.

It does not record operand values, secrets, raw tainted values or source text.

External responses expose only a stable requirement ID and one stable class:

- `REQUIREMENT_DENIED`;
- `REQUIREMENT_AMBIGUOUS`;
- `REQUIREMENT_OPERATIONAL_FAILURE`.

External responses do not expose the failing ordinal, line, expression text,
validator internals or count of failing constraints. Development diagnostics
may show source line and column at compile time. Governed internal audit access
may resolve the stable IDs to the complete evidence record.

## Diagnostic contract

Implementation introduces one exported diagnostic owner per fault:

| Code | Name | Meaning |
|---|---|---|
| `FUNGI-REQUIREMENT-001` | `EMPTY_REQUIREMENT` | No constraint exists. |
| `FUNGI-REQUIREMENT-002` | `CONSTRAINT_TYPE_MISMATCH` | Constraint is neither Bool nor Verdict. |
| `FUNGI-REQUIREMENT-003` | `CONSTRAINT_EFFECTFUL` | Constraint or transitive callee is not EffectFree. |
| `FUNGI-REQUIREMENT-004` | `TAINT_AUTHORITY_MISSING` | Taint reaches a constraint without admitted validator authority. |
| `FUNGI-REQUIREMENT-005` | `CONSTRAINT_CEILING` | More than 64 constraints were supplied. |
| `FUNGI-REQUIREMENT-006` | `NON_EXHAUSTIVE_REQUIRE` | A deny or ambig handler is missing or duplicated. |
| `FUNGI-REQUIREMENT-007` | `NON_TERMINAL_REQUIRE_HANDLER` | A handler can reach the guarded continuation. |
| `FUNGI-REQUIREMENT-008` | `NESTED_REQUIREMENT` | Version 1 nesting was attempted. |
| `FUNGI-REQUIREMENT-009` | `REQUIRE_SUBJECT_TYPE_MISMATCH` | Require subject is neither Bool nor Verdict. |
| `FUNGI-REQUIREMENT-010` | `VALIDATOR_AUTHORITY_INVALID` | Validator identity, profile or freshness is absent or mismatched. |
| `FUNGI-REQUIREMENT-011` | `REQUIREMENT_LOWERING_UNSUPPORTED` | GIR or physical lowering cannot preserve the requirement plan. |
| `FUNGI-REQUIREMENT-012` | `REQUIREMENT_RECEIPT_MISMATCH` | Independent receipt identity differs from the checked plan. |

Each code must be registered, indexed, documented and tested under the live
diagnostic conventions. No generic parse or internal error may substitute for
one of these faults.

## Testing and adversarial evidence

Every production change follows test-first RED, minimal GREEN and regression
verification. The complete gate includes:

- parser shape, source order, separators, comments and source mappings;
- empty, malformed, nested, duplicate-arm and over-64 refusals;
- Bool lift truth table and every closed K3 vector;
- mixed Bool/Verdict complete evaluation and stable ordered evidence;
- proof that DENY and UNKNOWN cannot reach the guarded continuation;
- terminal return and fault handlers plus non-terminal refusal;
- effectful, unresolved, ambient, mutating and transitively effectful calls;
- direct, nested and aliased taint attempts;
- admitted, missing, stale, wrong-input, wrong-profile and mutated validators;
- runtime forged trits, traps, timeouts and exhausted shared budgets;
- canonical GIR stability, alpha-renamed shadow resistance and mutation
  sensitivity;
- checked snapshot double-compile determinism and dedicated taint inclusion;
- physical SLIDE execution and independent re-admission for all K3 vectors;
- source, GIR, requirement-plan, validator, physical artifact and receipt
  mutation refusals;
- external redaction and governed internal evidence access;
- proof that WAT-only success, parser-only success and interpreter-only success
  cannot clear the admission gate;
- writing and translation skill fixtures that remain `HOLD` before admission
  and accept only the documented syntax after admission.

The gate must demonstrate controlled RED outcomes. A skipped, timed-out,
overflowed, stale, unmapped or receipt-less check is a refusal, never PASS.

## Delivery boundaries

Implementation is divided into independently reviewable evidence units:

1. diagnostic registry, parser and AST shape;
2. type, terminality and complete-evaluation semantics;
3. effect, value-state, taint and validator authority;
4. interpreter differential behavior;
5. canonical GIR and requirement identity;
6. checked snapshot and receipt plan;
7. physical SLIDE lowering and independent re-admission;
8. VOK exact-ALLOW integration and hostile mutations;
9. golden examples, compiler documentation and private Fungi skill updates;
10. full graph/index refresh, independent review and admission adjudication.

Each unit receives its own RED/GREEN cycle, explicit-path local commit and
fresh independent review bound to the exact commit. Security and architecture
units additionally require a custody-permitted model-diverse review. No push,
PR, merge, release, conversion restart or production authority is implied.

## Admission criteria

RD-0858 may move from `HOLD` only when all of the following are true:

- the complete compiler and runtime semantics above are implemented;
- all twelve diagnostic faults are red-capable and registered;
- checked snapshot identity includes taint, validator and requirement plans;
- physical SLIDE execution and independent re-admission preserve all closed K3
  vectors and complete-evaluation evidence;
- VOK mints only for exact fresh `ALLOW` on the exact subject;
- mutation, stale, overflow, timeout and missing-evidence controls refuse;
- external evidence is redacted and internal evidence is bounded;
- compiler, SLIDE, VOK, golden-pack and affected whole-suite checks pass at
  exact indexed heads;
- writing/translating Fungi skills are updated and independently verified;
- independent and model-diverse reviews return PASS on the final build point;
- the owner accepts the final admission evidence and explicitly reopens
  `.fungi` conversion.
