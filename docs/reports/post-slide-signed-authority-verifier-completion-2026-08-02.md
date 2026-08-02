# Post-SLIDE signed authority verifier completion

Date: 2026-08-02
Status: verifier green; production evidence and offline activation blue

## Outcome

Galerina no longer has an implementation placeholder between a production
`.fungi` or host-boundary receipt and the terminal retirement graph. Schema v3
now verifies exact root-delegated hybrid evidence and returns only the paths
whose complete signed predicates re-derive successfully.

This closes the verifier workstream. It does not admit a source or boundary:
the current production arrays are empty, the offline operational authority is
not activated, and current debt remains 110 unexecuted `.fungi` sources and 36
unowned host boundaries. Package conversion was deliberately excluded.

## Enforced chain

```text
tracked regular source/evidence/envelope bytes
  -> independent SHA-256 identities
  -> canonical in-toto Statement v1 shell
  -> exact Galerina execution or ownership predicate
  -> root-signed repository-role delegation
  -> Ed25519 AND ML-DSA-65
  -> time + revocation + serial floor
  -> exact current repository commit
  -> complete admitted path set, or no set
```

Execution receipts bind frontend, graph, compiler, GIR, SLIDE contract, target,
policy, verifier, object, admission, affine lease, terminal and platform facts.
Host receipts bind capability, least-authority, disposition, replacement,
target, platform, isolation, cleanup and ownership facts.

## Refusal behavior

Unknown/surplus fields, Proxies, accessors, path ambiguity, untracked or
escaping paths, stale commit, duplicate/rollback serials, invalid time,
revocation, changed artifacts, private material, wrong role or either failed
signature component refuse the entire production set. There is no partial
admission and no Node, Wasm, cache, driver or reference-runtime fallback.

## Fresh verification

- post-SLIDE predicate and hybrid-envelope tests: **5/5**;
- terminal retirement adversarial tests: **12/12**;
- beta-v1 release-admission compatibility tests: **8/8**;
- flat package lock and non-ambient resolver tests: **7/7**;
- live root lock: 98 packages, 45 internal edges, exact digest verified.

The live post-SLIDE check remains intentionally non-zero on independently
measured migration/admission debt. That is a correct fail-closed result.

## Remaining exit conditions

1. Complete native/object/platform/terminal evidence for every production
   source and boundary.
2. Conduct the separate offline operational delegation/signing ceremony.
3. Add the signed tracked evidence and canonical envelopes under
   `docs/security/post-slide-authority-receipts/`.
4. Re-run the unchanged live graph and require every signed path to bind the
   exact current repository commit.
5. Continue package conversion only after the independent owner review.

## Crypto-agility result

The current hybrid algorithm now enters through an executable versioned suite
catalog. The central crypto register has a separate `release-evidence` domain,
the current suite is active, and an unimplemented future suite is explicitly
`planned` and non-verifiable. A conformance test requires every executable
release-evidence verifier to exist in that governed domain with the same
status. Unknown suite relabelling refuses.

Future replacement uses overlap rather than destructive substitution: build
and test the new schema/verifier, activate it for signing, reissue current
receipts, then make the old suite verify-only. The old verifier remains only
while retained artifacts need it; `.slide`, predicate and package semantics do
not depend on the algorithm choice.
