# Slices 84-87 Boundary Adjudication

## Decision

The four selected live, non-bootstrap symbols remain TypeScript. Each exact
source crosses a boundary absent from the reconciled SLIDE/VOK profile:

| Slice | Exact symbol | Decision |
|---:|---|---|
| 84 | `galerina-core-config/src/index.ts#isLoPackageGraphAlias` | `BLOCKED_BY_CASE_INSENSITIVE_REGEX_TEXT_ABI` |
| 85 | `galerina-framework-app-kernel/src/production-slide-restore-admission.ts#isAuthenticatedSlideRestoreProfile` | `BLOCKED_BY_AFFINE_AUTHENTICATED_PROFILE_SEAL_ABI` |
| 86 | `galerina-governance-telemetry/src/exposition.ts#isFiniteNum` | `BLOCKED_BY_UNKNOWN_BINARY64_FINITE_GUARD_ABI` |
| 87 | `galerina-framework-api-server/src/index.ts#isTlsSocket` | `BLOCKED_BY_HOST_DUCK_TYPED_METHOD_IDENTITY_ABI` |

No `.fungi` candidate, host-projected Boolean, consumer switch or retirement is
authorized. `isLiteralVerificationSuccess` and `isImplicitReturnType` were
rejected during preflight because package-owned Fungi proofs already exist.
`isSensitiveHeaderName` was rejected before assignment because the queue
derives the Core Security bootstrap floor.

## Pinned evidence

- Galerina selection build point: `4341e12b53f671f1260e236adbc9764f667ab966`.
- Reconciled SLIDE capability reference:
  `docs/reports/slide-capability-reconciliation-slice-63-2026-08-13.md`.
- The generated queue accounts for 1,480/1,480 executable-family paths and
  classifies each selected source file `BLOCKED / DOSSIER_REQUIRED` before this
  symbol-level adjudication.
- Package baselines: Core Config 54/54, App Kernel 231/231, Governance
  Telemetry 21/21, API Server 26/26; zero failures or skips.

## Slice 84 - case-insensitive manifest alias

The source applies one anchored ECMAScript regular expression with the `i`
flag to four package-manifest aliases. Its live caller is
`validateHostPackageManifestBoundary`, where the result protects host package
manifest identity. Exact parity needs the JavaScript String domain, anchored
regular-expression semantics and case-insensitive matching. The reconciled
physical profile has neither an executable regex operation nor Unicode
case-fold parity. Enumerating only canonical spellings would reject values the
source accepts; host normalization would retain authority in TypeScript.

Threadability is `SERIAL_HARD_PATH` because this predicate participates in
manifest boundary admission.

## Slice 85 - authenticated profile seal

The source accepts JavaScript `unknown` and returns true only when the exact
object has been minted into the module-private `authenticatedProfiles` WeakSet.
The package test proves that a frozen profile is accepted while an equal spread
copy is refused. Recomputing fields, serializing a token or passing a host
Boolean destroys the non-copyable provenance property. Current Fungi, SLIDE
and VOK expose no issuer-bound affine seal for this profile.

Threadability is `SERIAL_HARD_PATH`: the decision reads private mutable
authority state and gates production boot composition.

## Slice 86 - finite binary64 guard

The source is a total JavaScript `unknown -> Bool` type guard. It returns true
for every finite binary64 number, including fractions, signed zero and values
outside signed i32; it returns false for non-numbers, NaN and both infinities.
The current physical profile has signed-i32 `Int`, no binary64 `Float`, and no
heterogeneous `unknown` ingress. A numeric-only or i32 boundary would delete
observable false and true cases.

The exact leaf is `PARALLEL_PURE`; this grants no parallel authority to its
telemetry callers or exporter service.

## Slice 87 - TLS socket duck type

The source accepts JavaScript `unknown`, excludes `null`, and then observes the
`getPeerCertificate` property. It returns true for any object whose observed
property is a function; it does not require nominal `TLSSocket` identity.
JavaScript property observation can execute getters or proxy traps. An exact
physical record instead refuses inherited, accessor and proxy shapes before
Fungi runs, while a host precheck leaves the decision outside Fungi. Current
SLIDE/VOK also has no host method/function-identity ABI.

Threadability is `SERIAL_HARD_PATH` because both live callers use the result in
TLS principal and certificate admission.

## Decision/effect ledger

| Slice | Source operation | Direct effect | Required physical boundary | Failure exit |
|---:|---|---|---|---|
| 84 | anchored `/.../i` membership | none | exact JS text plus case-insensitive regex | false for non-match |
| 85 | private WeakSet membership | private authority-state read | issuer-bound affine profile seal | false for non-minted identity |
| 86 | `typeof` plus `Number.isFinite` | none | heterogeneous value plus binary64 classification | false for non-number/non-finite |
| 87 | object/null/property/function observation | host object observation | active JS object and method identity | false unless observed method is a function |

## R&D triggers

1. Executable, versioned ECMAScript-compatible regex/case-fold text profile.
2. VOK-minted, issuer-separated affine seals with copy/replay refusal.
3. Closed heterogeneous value-kind ingress plus exact finite binary64 support.
4. A governed host-object capability boundary that preserves active property
   observation and method identity without host-side authorization.

This adjudication grants no conversion, production, release, signing or push
authority. Repository-wide closure remains separate from these focused
decisions.
