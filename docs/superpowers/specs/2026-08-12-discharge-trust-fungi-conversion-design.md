# Discharge trust Fungi conversion design

## Outcome

Add an executable package-owned Fungi twin for exported TypeScript
`dischargeTrust`. TypeScript and every consumer remain active.

## Closed interface decision

TypeScript accepts `boolean | undefined` verification evidence. Fungi must not
encode absence, null or host exceptions, so the candidate accepts a typed
`Verdict` instead:

- `Verdict.Allow` means verification proved true;
- `Verdict.Deny` means verification proved false;
- `Verdict.Unknown` means verification was inconclusive.

The current trust input is also `Verdict`. Current Deny is sticky and always
returns Deny. Otherwise the verification Verdict is returned unchanged. This
is exactly the nine-row source table after applying the closed adapter above.

## Alternatives refused

- `Option<Bool>` would introduce a wider physical ABI only to recreate K3.
- `Int` would erase the typed trust boundary.
- null, undefined, exception or sentinel String inputs would violate the
  project state model and create ambiguous hostile-input behavior.

## Verification and authority

Differential evidence must cover all three current trust states crossed with
`true`, `false` and `undefined`, and prove the explicit adapter is bijective.
Physical evidence must compile, publish, re-admit and execute all nine Verdict
pairs through typed VOK receipts, while refusing invalid arguments, inadequate
fuel and source/artifact mutation. This grants no consumer switch, production,
release, runtime-residency or TypeScript retirement authority.
