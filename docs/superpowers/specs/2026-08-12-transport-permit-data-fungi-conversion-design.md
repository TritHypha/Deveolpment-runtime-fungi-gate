# Transport permit-data Fungi conversion design

## Decision

Add one package-owned pure Fungi projection for Tower-Citizen's exported
`permitData` decision. Reuse the closed transport-state encoding already owned
by `src/self-hosted/transport-fsm.fungi`: `0 = Established`, `1 = Recovering`,
and `2 = Closed`.

The new flow returns true only for encoded state `0`. Every other Int returns
false through an explicit terminal exit. It does not inspect keys, timestamps,
events, or verdicts because the live TypeScript decision reads only
`ctx.state`.

## Why this is the next slice

- It completes an existing package-owned FSM twin rather than creating a new
  language or package boundary.
- It is a leaf decision with no effects and no dependency on ambient state.
- Existing SLIDE scalar equality is sufficient; no registry or limit widens.
- It proves the important transport invariant that only Established permits
  data, while leaving state transition authority and every consumer unchanged.

`effectsToFlags` is deferred. It combines authoritative effect-name mapping,
array iteration, unknown-name posture, and bitwise OR; converting it as one
slice would join independent authorities and currently lacks an exact SLIDE
bitwise-OR profile.

## Exact Fungi shape

```fungi
pure flow s4PermitData(state: Int) -> Bool
contract { intent { "Permit transport data only in the Established state." } }
{
  if state == 0 {
    return true
  }
  return false
}
```

The source has no null, NaN, `else`, `else if`, exception syntax, `for`,
`while`, or `loop`. Invalid host values do not enter the typed Fungi flow;
physical SLIDE intake must refuse them. Unknown integer encodings deny.

## Evidence contract

1. A package test compares the live TypeScript decision with the Fungi flow
   for Established, Recovering, and Closed.
2. The same test proves all admitted but unknown integer encodings return
   false and checks the source's forbidden-form constraints.
3. A physical integration test compiles only `s4PermitData` from the exact
   multi-flow asset, publishes one `.slide`, independently re-admits it, and
   verifies typed Bool receipts through VOK.
4. Wrong arity/type, NaN, infinity, fractions, out-of-range Int, inadequate
   work, source mutation, receipt mutation, every envelope-byte mutation, and
   physical artifact mutation refuse.

## Authority boundary

This is reference-only. `permitData`, `step`, state construction, key erasure,
timeouts, K3 folding, and every consumer remain TypeScript-executed. The proof
does not authorize a consumer switch, key use, transport admission, source
retirement, production, signing, release, or durability.

