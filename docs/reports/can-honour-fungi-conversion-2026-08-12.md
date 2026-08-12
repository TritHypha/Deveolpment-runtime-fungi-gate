# Can honour TypeScript-to-Fungi conversion - 2026-08-12

## Result

The security-authorizing Boolean inside exported TypeScript `canHonour` now
has a package-owned pure Fungi twin:

```fungi
pure flow canHonourFungi(
  ceiling: String,
  canRegisterPin: Bool,
  canNoDramSpill: Bool,
  canNoSwap: Bool,
  canNoDisk: Bool
) -> Bool
```

Each restricted ceiling reads only its corresponding capability Bool.
`unrestricted` returns true. Every other String returns false.

This is a non-retiring physical conversion slice. TypeScript still resolves
the host, constructs the typed `FUNGI-HARDEN-005` rejection, and serves every
consumer.

## Security correction

The first GREEN attempt exposed a live fail-open TypeScript edge. The prior
`Record<ResidencyTier, boolean>` lookup inherited `Object.prototype`, so a
runtime-hostile ceiling named `"__proto__"` produced a truthy object and
returned `{ ok: true }`.

The TypeScript adapter now uses an exact `Map` lookup and requires
`need.get(ceiling) === true`. Unknown, prototype-shaped, malformed, case,
whitespace, Unicode, and embedded-NUL ceilings therefore deny. The Fungi
terminal wildcard already denied them; it was not weakened to preserve the
bug.

## Verification

- strict Fungi check: zero errors and zero governance warnings, with two flows
  and three top-level declarations;
- focused residency and differential lane: **20/20**, including the complete
  host/ceiling matrix and permanent `"__proto__"` regression;
- physical `.fungi` to checked package to `.slide` publication, independent
  re-admission, execution, and typed VOK Bool receipt verification: **2/2**
  combined physical tests, zero skips, with **56** new canonical/hostile
  executions;
- the physical path pins registry
  `slide.registry.executable-gir.v2c-bounded-wide-control-flow.v1` and digest
  `d805dae4b822392e5092126ce4f0fb27e8bfa6aa2de8862ee88e09e23eed43cc`;
- hostile physical cases: wrong type/arity, invalid Unicode, insufficient
  steps, source mutation, receipt-field mutation, every safe-value-envelope
  byte mutation, and `.slide` mutation all refuse;
- compiler package: **6,377/6,377**;
- Golden Pack: **11/11** checked and **11/11** execution vectors;
- canonical aggregate owner: **100/100 packages, 9,597 tests, zero failures in
  275.7 seconds**;
- retirement owner: **1,442** executable-family paths and **128** source Fungi
  assets; its authority debt is unchanged because this slice adds a flow to an
  already counted Fungi asset rather than retiring TypeScript.

## Authority boundary

No null, NaN, `else if`, `else`, throw, try/catch, `for`, `while`, or `loop`
was introduced in the Fungi candidate. Supplied capability facts are not live
platform attestation. The physical receipt keeps `authorityReleased: false`.

This evidence grants no consumer-switch, bootstrap-fixpoint, production,
runtime-residency, signing, release, or TypeScript-retirement authority.
Repository-wide closure remains **UNKNOWN** because the crash-linked full
tooling, normal phase-close, and monolithic memory evaluation lanes remain
deliberately excluded.
