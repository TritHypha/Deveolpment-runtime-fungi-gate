# SLIDE V2-B capability-request shape gate

**Date:** 2026-07-29

The first V2-B implementation checkpoint validates capability-request
structure only. It intentionally releases no lease, broker handle, host
authority, executable opcode, or successful-operation claim.

Frozen descriptor evidence:

- capability subprofile: 1,213 LF-terminated bytes, SHA-256
  `1e232c3cc4790344ce62296a85a7a29e79d6f0cc6bc598b18f73530de4aedfda`;
- database resource: 324 bytes, SHA-256
  `e1b20a025203eeb42ae72e237054595f61c9a1f915ba9527fa6ccdf4ac9aa232`;
- HTTPS resource: 431 bytes, SHA-256
  `750102fc1c2df495cb09d059ad844f6df2465d31d53db846e003efd14c23acd8`;
- append-only audit resource: 221 bytes, SHA-256
  `335755bd2eec69215465d2934d11015c3cb0f5ec9dad230039f37920bb760aaf`.

`slide-v2b-capability-request.fungi` binds three exact requests:

1. read-only database request;
2. exact HTTPS GET request; and
3. append-only audit request.

Every request binds class, effect, operation, request/response schema,
resource-descriptor digest, request/response/call/time ceilings, and the
audit-before-success requirement. The successful structural result is named
`SHAPE_VALIDATED` and carries `authorityReleased: false`.

Focused evidence is 7/7. Profile, descriptor, effect/class, surplus-call,
resource, and audit-requirement mutations all refuse while
`authorityReleased` remains false.

Next gate: implement lease shape and cryptographic-verifier receipt binding.
A Boolean “signature valid” input is forbidden; the shape gate must consume a
typed verifier receipt bound to the exact lease bytes before any K3 admission
composition is added.

Full compiler evidence is 5,332/5,332 across 1,179 suites. Regenerated project
graph: 7,242 nodes / 7,501 edges, zero integrity violations; KB zero
orphans/broken links; Hardened Border 97/97; explicit memory graph clean;
dev-tool index 97 packages / 124 tools / 40 proofs.
