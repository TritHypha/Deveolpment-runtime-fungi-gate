# Galerina security-policy engineering-standards alignment

Date: 2026-08-02

Scope: repository-root `SECURITY.md`, inherited `docs/SECURITY.md`, and the
owner-supplied engineering standard

Decision class: policy review; no runtime or production authority

## Result

Galerina root policy version 2.0 now states the repository-wide binding
contract and the nested documentation policy explicitly inherits it without a
weakening exception. Two executable policy-contract tests protect the minimum
headings and anti-forgery statements.

The review corrected four material drifts:

1. "zero-trust by construction" was an unsupported completion claim and is now
   the honest status "advanced prototype with hardened zero-trust subsystems";
2. `unknown -> deny` collapsed K3 indeterminate into K3 deny; the policy now
   keeps `0` and `-1` distinct while both remain non-authorizing;
3. a fixed test count in the long-lived policy had become stale; exact counts
   now belong only in generated roadmaps and clean-source receipts; and
4. `docs/SECURITY.md` used "within reason" and implied `.env` was trusted
   storage. It now inherits the root policy, treats environment input as
   untrusted and excludes production/offline signing material.

## Standards mapping

| Requirement class | Binding policy mechanism | Status |
|---|---|---|
| Tri-1 and K3 separation | numeric Tri-1 cannot create authority; `0` blocks | aligned |
| Zero trust and fail close | complete admission; explicit `_=>`; no ambient trust | aligned |
| OWASP and injection | typed domains, closed schemas, authz, CSRF, crypto, secret and supply-chain gates | aligned |
| Reproducibility | canonical formats, content identity, pinned tools and exact clean receipts | aligned; external matrix open |
| Hardware kindness | bounded CPU/memory/fan-out/queues and representative thermal/power measurement | aligned; full measurements open |
| Strict coding | typed errors, exhaustive authority alternatives, affine resources and unsafe allowlists | aligned |
| Privacy | classification, minimisation, redaction, retention, deletion/export and audited access | aligned; product-specific compliance remains deployment work |
| Independent checking | implementer, disagreeing method, hostile regression and third-party review | aligned; remote CI absent |
| Longevity | stable contracts, crypto agility, ADRs, runbooks and exit ramps | aligned |

## Incompatibilities and limitations flagged

- The source standards file contains mojibake in punctuation and example
  appendices that claim implementations under `<artifact-root>`.
  Those paths are not Galerina evidence and were explicitly denied authority.
- Its fail-open appendix is descriptive. Galerina forbids fail-open composition
  on authentication, authorization, admission, cryptography, secret, effect and
  durable-publication paths.
- The standard requires CI enforcement and independent rebuild evidence.
  Galerina currently has a strong local cadence but no remote CI; this remains
  a known limitation and release gate.
- This policy alignment proves policy consistency, not complete runtime
  enforcement. Every planned or disconnected control remains non-authorizing.

## Verification

```text
node --test packages-galerina/galerina-core-security/tests/repository-security-policy.test.mjs
2/2 pass
```

The security-policy resolver was also run for the repository root and `docs/`
scope. Root-to-leaf precedence is explicit and no descendant exception was
created.
