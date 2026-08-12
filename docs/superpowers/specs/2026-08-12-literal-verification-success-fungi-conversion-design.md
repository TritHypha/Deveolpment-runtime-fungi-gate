# Literal Verification Success Fungi Conversion Design

## Objective

Translate only the private `isLiteralVerificationSuccess` decision in
`packages-galerina/galerina-framework-app-kernel/src/registry-index.ts` into a
package-owned `.fungi` semantic twin. Prove its complete three-state source
domain through canonical execution and physical SLIDE/VOK. The TypeScript
registry verifier and both production callers remain active.

## Source dossier

- Galerina selection build point:
  `fe85973ffeea6b7c6bad9e84bd3595f5bd1ffc17`.
- TypeScript source SHA-256:
  `b21ea6a79b53dba243e5b8d550a4476faf736751b53e98fe0ee47348e1f46adb`.
- Independent SLIDE build point:
  `6de4d91ba20a7e86c53c8898fcdae2ef4b6cee28`.
- Production callers: `verifyRegistryIndex` and `verifyComponent`.

The decision accepts the TypeScript union `boolean | "no-key"`. It returns
true only when the value is the literal Boolean `true`; `false` and
`"no-key"` both remain closed. It has no host call, mutation, exception,
coercion, scheduling, partial progress or ambient authority.

## Considered approaches

1. **Closed three-state physical tags (selected).** Map `true` to `+1`,
   `false` to `0`, and `"no-key"` to `-1`. This is an explicit ABI encoding,
   not a coercion. A terminal wildcard denies every surplus physical `i32`.
2. **A Fungi `String` parameter.** Rejected because it would turn the two
   Boolean source values into text and widen the representation unnecessarily.
3. **Convert the complete registry verifier.** Rejected because signature
   verification, key selection, signed bytes, freshness and typed errors are
   separate authority and host boundaries.
4. **Use the localhost candidate.** Rejected for this slice because current
   physical SLIDE conserves ECMAScript `trim` but has no lowercase operation;
   `trim().toLowerCase()` therefore cannot yet be proved end to end.

## Exact Fungi boundary

Create `src/self-hosted/literal-verification-success.fungi`:

```fungi
@version 1

pure flow isLiteralVerificationSuccess(resultTag: Int) -> Bool
contract { intent { "Admit only the literal successful verification tag." } }
{
  match resultTag {
    1 => return true
    _ => return false
  }
}
```

`match` is required because the source subject is a three-state union rather
than a Boolean. The terminal `_ =>` is the fail-closed exit for `false`,
`"no-key"`, and any surplus physical integer. The flow contains no null, NaN,
`else if`, `throw`, `try`, `catch`, `for`, `while` or `loop`. It grants no
effect, capability, contract permission, Hallmark, border grant, global vault
access or host API.

## Decision and effect ledger

| Source value | Physical tag | Fungi construct | Effects | Exit |
|---|---:|---|---|---|
| `true` | `1` | exact `match` arm | none | `true` |
| `false` | `0` | terminal wildcard | none | `false` |
| `"no-key"` | `-1` | terminal wildcard | none | `false` |
| surplus physical `i32` | any other | terminal wildcard | none | `false` |

## Threadability

Classification: `PARALLEL_PURE`.

The flow reads one owned scalar tag and returns one immutable Boolean. This
does not authorize signature verification, key access, registry publication,
either caller, aggregate tooling or shared active compute for parallel
execution.

## Proof shape

1. Bind an exact symbol-scoped queue decision to this committed design.
2. RED-test the absent package-owned Fungi asset and exact flow.
3. Compare the bound TypeScript source, typed Fungi interpretation and signed
   Galerina Wasm for all three source values plus surplus integer denial.
4. Compile the exact bytes through independent SLIDE, publish one physical
   `.slide`, re-admit through VOK and independently verify typed Boolean
   receipts.
5. Refuse missing, surplus and wrong-type arguments; source, receipt,
   safe-value and physical artifact mutations.
6. Refresh only bounded owners and indexes. Full tooling, `graph-all`, normal
   phase-close and monolithic memory evaluation remain excluded because those
   aggregate lanes are crash-linked.

## Authority boundary

This is a reference-only symbol proof. It does not switch either registry
consumer, retire TypeScript/MJS, verify a signature, select a key, admit a
registry, widen a grant, release authority, or claim bootstrap, production,
hardware, signing, release or durability evidence.
