# Post-SLIDE signed authority receipts design

## Outcome

Replace the intentionally closed `fungiSources` and `hostBridges` lanes with a
real verifier for hybrid-signed, exact-subject production evidence. Reuse the
existing beta-v1 release-evidence root delegation, operational public bundle,
revocation snapshot and Ed25519 plus ML-DSA-65 envelope. Do not create another
online private key, trust a claimed Boolean or make source hashes self-authorize.

Implementation completion and authority activation are separate roadmap
states. The verifier can be green while both production lanes remain empty.

## Standards basis

- in-toto Statement v1 provides the exact `subject` and versioned
  `predicateType` shell:
  <https://github.com/in-toto/attestation/blob/main/spec/v1/statement.md>;
- SLSA verification requires checking the signature/root, exact artifact
  subject, predicate type, verifier identity, intended resource and passing
  result rather than signature-only acceptance:
  <https://slsa.dev/spec/v1.2/verification_summary>;
- TUF separates an offline root from delegated online roles and requires
  rollback/freeze/revocation handling:
  <https://theupdateframework.github.io/specification/draft/>; and
- Sigstore documents offline verification bundles but also illustrates the
  unsafe option of disabling claim checks. Galerina never disables claims:
  <https://docs.sigstore.dev/cosign/verifying/verify/>.

These are design references, not claims of SLSA, TUF or Sigstore conformance.

## One reused authority

The existing beta-v1 evidence delegation has exactly two roles. Post-SLIDE
receipts use the existing `repository-evidence.sign` role because they attest
to exact repository execution/ownership state. They do not reuse the package
registry operational key.

The verifier must re-derive:

1. pinned root and operational public-key digests;
2. the hybrid root signature over the delegation;
3. delegation serial, validity and both key revocations;
4. both operational signature components over the exact statement;
5. exact in-toto subject and predicate type;
6. current repository commit and tracked file identities;
7. every source, frontend, graph, object, platform and receipt digest named by
   the closed predicate; and
8. uniqueness, freshness and non-replay within the ledger.

Missing evidence is K3 `0`; malformed, contradictory, forged, stale or revoked
evidence is K3 `-1`; only the complete verified chain yields K3 `+1` for the
specific path. A `+1` entry is not transferable to another path or package.

## Fungi execution predicate

One exact statement binds:

- owner package, canonical `.fungi` path and source digest;
- checked frontend receipt and decision-graph digests;
- compiler, GIR, SLIDE contract, target, policy and verifier identities;
- final object and VOK admission identities;
- affine lease-consumption and typed terminal receipt identities;
- platform evidence and repository fixed-point identity; and
- issuance, expiry and monotonically increasing receipt serial.

The subject is the final execution-evidence bundle digest, not the source hash
alone. The terminal graph reopens every named tracked artifact and recomputes
its digest.

## Host-boundary ownership predicate

One exact statement binds:

- owner package, canonical retained boundary path and source digest;
- a closed boundary kind;
- exact capability and least-authority policy identities;
- retain/replace disposition and replacement identity where applicable;
- target/platform evidence;
- isolation, failure/cleanup and typed ownership-receipt identities; and
- the same repository, time, serial and hybrid authority facts.

Development tooling is not silently exempt. A retained Node, JavaScript or
native compatibility boundary must have the same exact signed ownership
evidence or remain unowned.

## Activation and rotation

No private material is required to implement or test the verifier. Activation
occurs only after the existing offline root delegates a public operational
release-evidence key and signed receipts return online. Rotation replaces the
delegation/public bundle, advances the minimum serial and uses the existing
signed revocation snapshot. Old receipts remain rejected after expiry,
revocation, target-commit change or minimum-serial advance.

## Explicit non-goals

- no weakening of the terminal zero-debt rule;
- no package conversion in this chapter;
- no signature-only or self-hash authority;
- no registry-key reuse;
- no path-loaded verifier or caller-supplied verification callback in the
  production CLI; and
- no green production lane before real signed evidence exists.
