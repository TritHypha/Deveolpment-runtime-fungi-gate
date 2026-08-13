# Slice 88 Myco Search Outcome Guard Adjudication

`packages-galerina/galerina-tools-myco/src/query/search.ts#isError` is
`BLOCKED_BY_VENDOR_CUSTODY_AND_DYNAMIC_PROPERTY_PRESENCE_ABI`. The selected
Galerina build point is `ae2efcde2e9f4688ad34e0fe51e8d79dc5a30e8b`; the
vendored source file SHA-256 is
`3ee3336a19467fcf2226c277178311bf888835ae3852a6893d5570d48d9996be`.

## Exact source contract

The exported type guard accepts `SearchOutcome`, the heterogeneous union of a
one-field `SearchError` and a twelve-field `SearchResult`. It returns whether
the observed `error` property is not `undefined`. The live graph proves one
production caller, `cmdSearch`, which routes the result into the Myco command
surface; the symbol has no callees.

Direct JavaScript vectors at Node `v24.18.0` conserve the observable boundary:

| Input shape | Result |
|---|---:|
| own non-empty `error` | `true` |
| own empty-string `error` | `true` |
| own `error: undefined` | `false` |
| nominal result record | `false` |
| inherited `error` | `true` |
| accessor-supplied `error` | `true`, getter executed once |
| proxy-supplied `error` | `true`, proxy observation executed |

This is not a passive exact-record predicate over the complete JavaScript
domain. Property observation can execute user code, so the source is
`SERIAL_HARD_PATH` rather than parallel-pure.

## Custody and physical evidence

The package metadata declares `src/` to be a read-only mirror: changes must be
made in `../subprojects/myco` and re-vendored. Its declared upstream commit is
`a48d2c3b5c508ce35346a4dd7aac0278606d10f6`. Current upstream Myco is pinned at
`db901e1096fb69ea23f6d3f42199dac784ec3bc1`; the same three-line predicate is
present, while the complete upstream source file has SHA-256
`250de1437ff156b49cd6f460b4fa0ba373c77114beba9188f08d40fa2a0440db`.
The mirror and current upstream file bytes therefore differ and cannot be
silently co-authored.

Pinned SLIDE `ed326eaa14f1a899841cbac8da353d400970367e` proves one exact
record parameter/result profile. Its focused external-record ABI lane passes
4/4 and deliberately refuses inherited, accessor, proxy and surplus shapes.
The external-signature gate admits at most one record parameter and has no
heterogeneous record-union/closed-variant ABI for the one-field error payload
and twelve-field success payload. A Boolean or scalar tag bridge would leave
the branch authority in TypeScript.

Fresh owner evidence passes Myco 80/80 and the SLIDE record ABI 4/4. Those
results prove system health and the exact refusal boundary; they do not prove
conversion parity. No `.fungi` candidate was created and the TypeScript source
and consumer remain active.

## Re-entry conditions

1. Redesign the upstream Myco outcome as an explicit closed discriminated
   result with exact payload contracts, then re-vendor the governed commit; or
   explicitly authorize a Galerina-owned overlay outside the mirror.
2. Admit a closed heterogeneous variant ABI through GIR, physical `.slide`
   and independent VOK, including exact tags, payload shapes, surplus-tag
   refusal and hostile object-boundary vectors.
3. Prove the redesigned caller switch and full differential behavior before
   retiring the TypeScript predicate.

The private translation skill now records the reusable mirror-custody and
dynamic property-presence rules at commit
`2902c2ab8d850b6a8e13e97c107c44ab175822ae`. The writing skill requires no
change because no Fungi source was authored and its exact-record refusal rule
already covers the physical side of this boundary.

## Slice-close receipt

Skill disposition: SKILL_UPDATE 2902c2ab8d850b6a8e13e97c107c44ab175822ae
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE
