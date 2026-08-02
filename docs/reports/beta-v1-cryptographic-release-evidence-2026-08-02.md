# Beta-v1 Cryptographic Release Evidence Report

**Date:** 2026-08-02
**Implementation commit:** `26932b3c`

## Outcome

The beta-v1 release gate no longer trusts the durability and repository
records' former `authenticated: true` fields. Policy schema v2 admits only a
dedicated root-delegated hybrid evidence authority, role-separated signed
statements and independently checked provenance relationships.

## Built

- bounded canonical JSON and domain-separated signature preimages;
- mandatory Ed25519 plus ML-DSA-65 delegation and statement verification;
- minimum delegation serial, validity-window and revocation enforcement;
- exact `durability-evidence.sign` and `repository-evidence.sign` roles;
- closed durability statements bound to five independently re-hashed raw
  artefacts;
- closed repository statements bound to a deterministic tracked-tree digest
  and six exact command records;
- a data-only offline signer for structure inspection, root delegation signing
  and role-matched statement signing;
- policy v2 placeholders that remain K3 `0` until the public ceremony output
  and external evidence exist.

## Verified attacks

The focused suite refuses mutation of either signature half, wrong role or
context, key substitution, stale serial, expiry, revocation, proxy/accessor or
sparse canonical input, missing recovery evidence, reordered/missing/nonzero
repository checks, recomputed policy pins over forged predicates, legacy
Boolean receipts, hard links, local path leakage and raw artefact changes.

The focused release/platform command passed 43/43 tests before the
implementation checkpoint. The operational signer then passed its additional
root-delegation case. Repository-wide fixed-point counts will be recorded after
the documentation and generator pass.

## Honest remaining boundary

Implementation is green; beta-v1 authority activation is not. The remaining
inputs are the later offline root delegation, the dedicated operational public
bundle, hybrid-signed statements, the seven exact current-commit functional
receipts, and admitted controlled reboot/power-loss durability evidence. No
production private key was generated, read or committed in this chapter.
