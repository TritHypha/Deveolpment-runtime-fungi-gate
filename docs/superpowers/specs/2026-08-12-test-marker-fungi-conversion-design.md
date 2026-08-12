# Test Marker Fungi Conversion Design

## Objective

Translate only the private `mark` decision in
`packages-galerina/galerina-test/src/cli.ts` into a package-owned `.fungi`
semantic twin and prove its complete Boolean domain through canonical
execution and physical SLIDE/VOK. The TypeScript CLI and `printHuman` consumer
remain active.

## Source dossier

- Galerina selection build point:
  `8281d872`.
- TypeScript source SHA-256:
  `855d7882f41ea7d870a99c7c3f81ba5655c74415a36646e6fc2b0f3a003c1158`.
- Independent SLIDE build point:
  `6de4d91ba20a7e86c53c8898fcdae2ef4b6cee28`.
- Production caller: `printHuman`.

`mark(ok)` is immutable, deterministic leaf compute. It maps `true` to the
check-mark text `✅` and `false` to the cross-mark text `❌`. It has no host
call, state, exception, absence, coercion, scheduling or partial progress.

## Considered approaches

1. **One exact Boolean-to-String symbol (selected).** The complete two-value
   input domain is supported by Galerina and the current SLIDE typed border.
2. **Continue with the JSON safe-integer predicates.** Rejected for this slice
   because current SLIDE maps `Int` to i32 and cannot prove JavaScript's full
   safe-integer domain.
3. **Convert all CLI rendering.** Rejected because argument parsing, process
   I/O, dispatch and exits are separate host/authority boundaries.
4. **Replace the Unicode markers with ASCII.** Rejected because it changes the
   TypeScript observable result instead of translating it.

## Exact Fungi boundary

Create `src/self-hosted/test-marker.fungi`:

```fungi
@version 1

pure flow mark(ok: Bool) -> String
contract { intent { "Render the exact human test marker for a Boolean result." } }
{
  if ok { return "✅" }
  return "❌"
}
```

The TypeScript ternary is a Boolean decision, so `if` is the governing Fungi
construct. The source contains no null, NaN, `else if`, `throw`, `try`,
`catch`, `for`, `while` or `loop`. It grants no effect, capability, contract
permission, Hallmark, border grant, global vault access or host API.

## Decision and effect ledger

| Source decision | Subject | Fungi construct | Effects | Exit |
|---|---|---|---|---|
| `ok === true` | `Bool` | terminal `if` | none | `"✅"` |
| `ok === false` | exhausted `Bool` | terminal return | none | `"❌"` |

## Threadability

Classification: `PARALLEL_PURE`.

The flow reads one owned Boolean and returns one immutable String. This does
not authorize `printHuman`, stdout, process exit, test execution or aggregate
tooling for parallel execution.

## Proof shape

1. Bind an exact symbol-scoped queue decision to this committed design.
2. RED-test the absent package-owned Fungi asset and `mark` flow.
3. Compare the exact private TypeScript source mapping, typed Fungi
   interpretation and signed/admitted Wasm for both Boolean values.
4. Compile the exact bytes through independent SLIDE, publish one physical
   `.slide`, re-admit through VOK and independently verify typed String
   receipts for both markers.
5. Refuse missing/surplus/wrong-type arguments, source mutation, receipt
   mutation, safe-value mutation and physical artifact mutation.
6. Refresh only bounded owners and indexes. Full tooling, `graph-all`, normal
   phase-close and monolithic memory evaluation remain excluded because those
   aggregate lanes are crash-linked.

## Authority boundary

This is a reference-only symbol proof. It does not switch `printHuman`, retire
TypeScript/MJS, authorize CLI I/O or process exit, widen a grant, release
authority, or claim bootstrap, production, hardware, signing, release or
durability evidence.
