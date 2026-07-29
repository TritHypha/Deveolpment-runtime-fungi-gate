# RD-0361 T3 app-kernel authority evidence pack

Date: 2026-07-29  
State: tier-1 authority flipped; TypeScript retained as a live differential
shadow  
Authorization: owner's standing “unlock all green light” instruction plus the
current autonomous ownership directive, constrained by all evidence below

## Scope and non-claims

This tranche promotes six pure app-kernel decision twins to authoritative
`.fungi` specifications. It does not delete TypeScript, claim a self-hosted
backend, perform the offline signing ceremony, or begin the post-SLIDE
retirement. A failed differential, mutation, hash, admission, or import check
voids the promotion.

| Twin | Decision surface |
|---|---|
| `fuse-admission.fungi` | descriptor, hash, sidecar, revocation, signature policy, registry and capability fusion |
| `kernel.fungi` | authentication gate with explicit channel-verdict authority |
| `package-admission.fungi` | capability expansion, install script, registry, hash, signature and revocation checks |
| `registry-index.fungi` | signed-index signature, exact lookup and risk-policy admission |
| `route-defaults.fungi` | posture-aware route ceilings and relaxation detection |
| `secret-gate.fungi` | provider presence and required-secret availability |

## Reproduced evidence

### Check and execution differential

`node scripts/audit-kernel-fungi-twins.mjs` first reported all six candidates
check-clean and differential. The five owning execution files then passed
**6/6 tests**:

- `rd0361-fuse-admission-execution.test.mjs`
- `rd0361-kernel-auth-gate-execution.test.mjs`
- `rd0361-packages-execution-cutover.test.mjs` (registry index and package
  admission)
- `rd0361-route-defaults-execution.test.mjs`
- `rd0361-secret-gate-execution.test.mjs`

These tests build the candidate, require faithful WAT assembly, sign and admit
through #105, invoke the real WASM export, and compare its verdict with the
running TypeScript decision surface. Their negative grids include tampered
hashes, capability expansion, non-authorizing channel verdicts, route-policy
relaxation, missing secrets, invalid registry matches and the composed
deny-by-default paths.

### Mutation non-vacuity

All six targeted fail-open mutants were independently planted and killed,
**6/6, zero survivors**:

| Twin | Mutant |
|---|---|
| secret gate | `rd0361-ak-secretgate-present` |
| route defaults | `rd0361-ak-routedefaults-authrelax` |
| fuse admission | `rd0361-ak-fuseadmission-hashtamper` |
| kernel | `rd0361-ak-kernel-authgate` |
| registry index | `rd0361-ak-registryindex-lookup-hash` |
| package admission | `rd0361-ak-packageadmission-capexpand` |

The global liveness check remains **59/59 anchors matching exactly once**.

### Deterministic hash, admission and ambient-authority boundary

`node scripts/gather-r4-twin-hashes.mjs --tranche app-kernel --json` produced
**6/6 clean**. Every candidate was R0-clean, faithfully assembled, hashed,
signed with an ephemeral in-memory development key and #105-admitted.

The tool derives a closed deterministic stdlib-helper allowlist from the
compiler's `HOST_RUNTIME_IMPORTS` declaration. String/array handle helpers are
not ambient authority. Any undeclared import—including a merely
double-underscore-prefixed name—or any filesystem, network, clock, randomness,
environment or process authority fails the tranche. App-kernel result:
**zero ambient imports**.

| Twin | bytes | SHA-256 | deterministic stdlib imports |
|---|---:|---|---|
| `fuse-admission` | 597 | `3290d0913fa7694c4b6f907ac2644d6d2e1b26a730d6969d604c81bf528b49fb` | string equality |
| `kernel` | 150 | `0048ffbe26b75afd3da86b248979223d84cef28a00b664905156b938ba2c318c` | string equality |
| `package-admission` | 562 | `a725b0ae366e64beebf188f7793f28cb5814d0199c4f2dc0393ac2b274a7b113` | string equality |
| `registry-index` | 479 | `99796c089eb1a88961ed6ca2766b3d7ec91ab6fa083b378027267ec4280a61e0` | string equality |
| `route-defaults` | 408 | `b7a27319ea50bfd09525ab151a33851fd2717137a6e2c101b4ed4fdcd8780bff` | string equality |
| `secret-gate` | 278 | `ce662c325ef9ba682688a4b18097f5020fe54235ce522773f20e13d0cfda3c36` | array get/length and string equality |

`node scripts/gather-r4-twin-hashes.mjs --verify-ledger` re-derives every
currently authoritative twin and refuses hash drift, failed admission,
malformed/duplicate ledger entries, unknown build definitions, or ambient
imports.

## Result

The six app-kernel twins meet the R4 evidence bar and are recorded in
`rd0361-authoritative-twins.json` as T3. Their TypeScript twins remain
executing shadows. The current edit has not been pushed and this pack does not
claim independent review by another AI.
