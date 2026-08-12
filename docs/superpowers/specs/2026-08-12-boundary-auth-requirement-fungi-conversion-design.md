# Boundary Authentication Requirement Fungi Conversion Design

## Adjudication status

`BLOCKED_BY_BOOTSTRAP_FLOOR`

The design is semantically expressible and the independent physical profile
can preserve its String-to-Bool boundary. It is nevertheless **not an
authorized conversion slice**. The owning source file is declared
`bounded-bootstrap-floor` in the retirement ledger, and the conversion queue
correctly refuses a symbol override for any floor file. No `.fungi` asset,
consumer switch, retirement evidence or physical candidate was produced.

This document is retained as a negative authority record. Its syntax and
proof shape may inform a future floor-replacement design only after a separate
governance decision changes the bootstrap dependency, never as evidence that
the present file is queue-admissible.

## Objective

Translate only the private `requiresAuth` decision in
`packages-galerina/galerina-devtools-graph-algorithms/src/graphs/boundary-graph.ts`
into a package-owned `.fungi` semantic twin. Prove the complete six-value
`BoundaryKind` domain through canonical execution and physical SLIDE/VOK. The
TypeScript boundary-graph builder and its consumer remain active.

## Source dossier

- Galerina selection build point:
  `bbd482527e3e039c58e68d2b001aa77842589f9e`.
- TypeScript source SHA-256:
  `edb85548909634948c230e4bca2012b79177867667a66cec86c76f49449b49a8`.
- Independent SLIDE build point:
  `6de4d91ba20a7e86c53c8898fcdae2ef4b6cee28`.
- Production caller: `buildBoundaryGraph`.

The decision accepts the closed TypeScript union `BoundaryKind`:
`api | webhook | internal | package | secure | public`. It returns true only
for `api`, `webhook`, and `secure`. It has no host call, mutation, exception,
coercion, scheduling, partial progress or ambient authority.

## Considered approaches

1. **Exhaustive String selector (semantically preferred, not authorized).** Preserve each source literal as
   itself and use an exhaustive `match` with a terminal wildcard. This avoids
   a translation-only numeric ABI and the current physical SLIDE profile
   independently supports String match parsing, validation, evaluation and
   lowering.
2. **Three explicit Boolean `if` statements.** Expressible, but it obscures the
   closed selector algebra and makes future union drift easier to miss.
3. **Translate `isTrit(unknown)` through an `Int` boundary.** Rejected because
   non-integer JavaScript inputs return false in TypeScript but a narrower
   physical `Int` boundary refuses them. Refusal is not Boolean false.
4. **Convert the complete boundary graph.** Rejected because graph mutation,
   iteration, effect intersection and crossing policy are separate decisions
   with different execution and authority requirements.

## Exact Fungi boundary

Create `src/self-hosted/boundary-auth-requirement.fungi`:

```fungi
@version 1

pure flow requiresAuth(callerKind: String) -> Bool
contract { intent { "Require authentication for external or secure callers." } }
{
  match callerKind {
    "api" => return true
    "webhook" => return true
    "secure" => return true
    _ => return false
  }
}
```

`match` preserves the closed selector decision and terminal `_ =>` closes
`internal`, `package`, `public`, and every surplus admitted String. The flow
contains no null, NaN, `else if`, `throw`, `try`, `catch`, `for`, `while` or
`loop`. It grants no effect, capability, contract permission, Hallmark, border
grant, global vault access or host API.

## Decision and effect ledger

| Source value | Fungi arm | Direct/transitive effects | Exit |
|---|---|---|---|
| `api` | exact String arm | none | `true` |
| `webhook` | exact String arm | none | `true` |
| `secure` | exact String arm | none | `true` |
| `internal` | terminal wildcard | none | `false` |
| `package` | terminal wildcard | none | `false` |
| `public` | terminal wildcard | none | `false` |
| surplus admitted String | terminal wildcard | none | `false` |

## Threadability

Classification: `PARALLEL_PURE`.

The flow reads one owned immutable String and returns one Boolean. This does
not authorize the boundary graph builder, graph mutation, shared active
compute, authentication, admission, publication or aggregate tooling for
parallel execution.

## Proof shape

1. A symbol-scoped queue decision was attempted and correctly refused because
   the source file is a declared bootstrap floor.
2. RED-test the absent package-owned Fungi asset and exact flow.
3. Compare the live TypeScript caller surface, typed Fungi interpretation and
   signed Galerina Wasm for all six union members plus hostile surplus Strings.
4. Compile the exact bytes through independent SLIDE, publish one physical
   `.slide`, re-admit through VOK and independently verify typed Boolean
   receipts.
5. Refuse missing, surplus and wrong-type arguments; invalid UTF-16; source,
   receipt, safe-value and physical artifact mutations; and exhausted work.
6. If the floor is governed away in future, refresh only bounded owners and
   indexes. Full tooling, `graph-all`, normal
   phase-close and monolithic memory evaluation remain excluded because those
   aggregate lanes are crash-linked.

## Authority boundary

This is a refused design record, not a symbol proof. It does not switch `buildBoundaryGraph`,
retire TypeScript/MJS, perform authentication, admit a crossing, mutate a graph,
widen a grant, release authority, or claim bootstrap, production, hardware,
signing, release or durability evidence.
