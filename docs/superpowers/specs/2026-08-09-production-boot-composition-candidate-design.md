# Production boot composition candidate design

Date: 2026-08-09

Status: owner-approved direction through the persistent beta-v1 completion
goal; written specification pending owner review before implementation.

## Goal

Build the smallest fail-closed composition candidate that joins the exact
authenticated `restoreVerdict` SLIDE object, independently authenticated
platform and durability evidence, signing and revocation identity, and the
real cold-boot consumer. The result must expose what is structurally complete
and what authentic external evidence is still missing without releasing a
production restore authority.

This slice advances the production composition boundary. It does not perform
an offline signing ceremony, manufacture external platform evidence, activate
a native adapter, publish a release or move any package-retirement counter.

## Existing evidence and seams

- `ColdBootOrchestrator` already requires the literal
  `@galerina/core-sentinel-state` / `restoreVerdict` decision port, calls it
  exactly once and independently rechecks its result.
- Contract 85's committed 617-byte `.slide` publication and the Contract 86
  VOK candidate prove authenticated typed reference execution. Their current
  integration uses a sibling checkout and disposable keys and is explicitly
  non-authorizing.
- `admitRegistryDurabilityProfile` independently checks production-class
  durability evidence, delegation, both signature components, revocation and
  exact platform identity. Its returned profile is registered in a private
  module set, so a shape-compatible caller object is not admitted.
- `verifyBetaV1ReleaseFilesStrict` independently re-hashes the complete
  durability and repository evidence set. It remains a separate release
  closure check rather than becoming a runtime boot input.
- `createGovernedRuntimeExecutor` is a content-hash and attestation seam, but
  it is not by itself the authenticated typed SLIDE publication path and must
  not be relabelled as such.

## Approaches considered

### Selected: sealed upper-layer composition candidate

Add a narrow composition module at the optional app-kernel/host layer. It
consumes independently authenticated opaque evidence capabilities, rechecks every
cross-capability identity join and returns a privately registered immutable
candidate record. The record contains no `restoreVerdict` method and cannot be
passed to `ColdBootOrchestrator` as authority.

A repository integration test uses the same authenticated inputs to exercise the
real orchestrator through the existing reference-only SLIDE execution path.
That adapter remains test evidence and is never exported by the production
composition module.

This preserves the Core-first dependency direction: Core packages expose
narrow ports and the optional upper layer composes them. Core does not import
app-kernel, platform or release-policy code.

### Rejected: extend `ColdBootOrchestrator` with platform and signing inputs

This would make a Core persistence component own optional host policy,
cryptography and release evidence. It would reverse the constellation
dependency direction and entangle serialization with platform admission.

### Rejected: return a reference-only restore authority from the candidate

An exported executable authority could be injected into a real boot path even
when its flags say `productionAuthorizing: false`. A warning Boolean is not a
custody boundary. The candidate therefore exposes data and refusal evidence,
not the decision capability.

### Rejected: defer all composition until external evidence exists

Waiting would conceal identity-join, schema and lifecycle defects until the
offline ceremony and destructive platform runs. The sealed candidate lets
those engineering defects be found without imitating production evidence.

## Architecture

The new module belongs under
`packages-galerina/galerina-framework-app-kernel/src/` because that optional
host layer already owns durability admission. It may depend from the optional
layer toward Core contracts, but no Core package gains an upward dependency.

The module owns a private `WeakSet` of registered candidates and exports:

1. `admitProductionBootCompositionCandidate(policy, inputs)`;
2. `isProductionBootCompositionCandidate(value)`; and
3. closed data interfaces for the policy, authenticated SLIDE execution
   profile and resulting candidate.

The candidate is registered only when its evidence objects came from their
owning admission modules. Closed object shapes and positive-looking fields are
insufficient. The composition module recognizes the authenticated SLIDE and
durability profiles through private capability registries, not caller-supplied
authentication flags.

The module does not export an activation or authority-release function in this
slice. Adding that function requires a later design backed by the real offline
delegation, operational public bundle and complete external evidence.

## Closed policy

The composition policy pins at least:

- schema and release ID;
- full Galerina and SLIDE repository commits;
- package identity and export name;
- `.slide` object SHA-256 and package-set digest;
- compiler profile and exact SLIDE tool-manifest digest;
- typed receipt type, state and provenance identities;
- current epoch and minimum acceptable delegation serial;
- root and operational key IDs;
- admitted operating system, platform, architecture and filesystem;
- durability adapter, binary, build-recipe, toolchain, storage-profile and
  accepted-checkpoint digests; and
- composition validity window.

All records are exact closed records with own data properties. Surplus keys,
accessors, proxies, inherited fields, non-canonical instants, unsafe integers,
short commits, malformed digests and ambiguous Unicode refuse.

No local path, checkout location, environment variable, private material or
mutable callback identity becomes part of the candidate.

## Input capabilities

### Authenticated SLIDE execution profile

The SLIDE profile binds the exact physical object bytes and their SHA-256 to:

- package-set and package-content identities;
- package and export identities;
- compiler profile;
- reference-tool manifest;
- Galerina and SLIDE commits;
- current epoch;
- both hybrid-signature components;
- typed safe-value receipt identity; and
- `fallbackInvoked === false`.

The admission step independently hashes the retained bytes, verifies both
signature components and executes the four closed Boolean vectors through
fresh affine handles:

```text
(true,  true)  ->  1
(true,  false) -> -1
(false, true)  -> -1
(false, false) -> -1
```

Every returned receipt is independently verified against a locally derived
expectation. Malformed, unknown, replayed, exhausted or disagreeing execution
refuses. The admitted profile is immutable and privately registered, but it
does not retain or expose the execution handles.

The current sibling-checkout loader can exercise this admission only in the
cross-repository test. It cannot satisfy production activation because its
path and disposable-key boundary remain reference-only.

### Platform and durability profile

The composition accepts only an object recognized by
`isProductionRegistryDurabilityProfile`. It then rechecks every relevant field
against the closed policy and the SLIDE profile. In particular, repository,
platform, architecture, operating-system, storage, adapter, binary, toolchain,
checkpoint, operational-key and delegation identities must agree exactly.

Process-termination evidence, an unauthenticated Ubuntu decision or a
shape-compatible copy never satisfies this input.

## Data flow

```text
retained SLIDE bytes + hybrid public evidence + typed receipt verifier
    -> authenticate exact object
    -> exercise and independently verify the closed restore truth table
    -> sealed SLIDE execution profile

raw platform/durability evidence + production delegation authority
    -> existing durability admission
    -> sealed durability profile

closed composition policy + both sealed profiles
    -> recheck every cross-profile identity join
    -> immutable sealed production-boot candidate
    -> verdict=0
    -> authorityReleased=false
    -> productionAuthorizing=false
    -> no RestoreVerdictAuthority output
```

The real consumer integration separately constructs the existing
reference-only adapter from fresh affine handles, drives valid, missing and
tampered snapshot paths, and requires the sealed candidate identities to match
the receipt identities observed on every decision. This is executable
composition evidence, not installation authority.

## Outcomes and errors

The public entry point has only two semantic outcomes. This slice has no K3
`+1` path: structurally complete but owner-incomplete evidence remains `0`,
while malformed, forged, stale or mismatched evidence is `-1`:

- an immutable registered candidate with exact status
  `CANDIDATE_INDETERMINATE_NON_AUTHORIZING` and exact `verdict: 0`; or
- a typed refusal with exact `verdict: -1` and one stable production-boot
  composition diagnostic.

The candidate contains:

- the exact joined public identities and digests;
- `authenticatedObjectExecution: true`;
- `authenticatedPlatformDurability: true`;
- `verdict: 0`;
- `consumerCompositionExercised: true` only in the separate evidence report,
  never as a caller-supplied admission field;
- `authorityReleased: false`;
- `productionAuthorizing: false`; and
- a closed list of external evidence or ceremony inputs still required for a
  later authority-release design.

The module catches unexpected dependency failures and maps them to the closed
`verdict: -1` malformed refusal. It never returns a partial candidate, retries
through a weaker verifier or falls back to TypeScript decision logic.

## Tests

Implementation follows RED -> GREEN. Focused tests cover:

- a complete disposable-key candidate while retaining both false authority
  fields, exact K3 `verdict: 0` and exposing no restore method;
- an empty input, every malformed or forged input and every dependency failure
  producing a typed K3 `verdict: -1` refusal, with no composition `+1` path;
- forged plain-object copies of every opaque profile;
- each missing or invalid hybrid-signature component;
- one-byte `.slide` mutation and correct signatures over the wrong object;
- wrong package, export, package-set, compiler profile, tool manifest, epoch,
  Galerina commit or SLIDE commit;
- malformed, replayed, exhausted, unknown or incorrectly typed receipts;
- fallback execution and each wrong truth-table result;
- platform, architecture, operating-system, filesystem, storage, adapter,
  binary, toolchain and checkpoint mismatches;
- expired, revoked, rolled-back or role-widened delegation;
- missing reboot or power-loss evidence;
- forged positive authority fields;
- surplus keys, accessors, proxies, inherited data and non-canonical input;
- absence of any exported activation or authority-release function; and
- the real `ColdBootOrchestrator` valid, missing and tampered paths through the
  authenticated typed reference execution adapter.

Focused app-kernel, sentinel-state, Contract 85 and Contract 86 tests run
before the strict beta release verifier and relevant aggregate, graph,
diagnostic, path-hygiene and phase-close gates. The release verifier remains
independent and cannot turn the candidate into boot authority. Cross-repository
evidence is an explicit skip when the exact sibling SLIDE checkout is
unavailable and cannot support a broad completion claim in that state.

## Documentation and evidence

Implementation produces one dated report that distinguishes:

- repository implementation evidence;
- authenticated reference object execution;
- authenticated platform/durability evidence;
- missing owner-controlled ceremony inputs; and
- terminal production authority, which remains unreleased.

`docs/TODO.md` and the beta-v1-to-SLIDE roadmap may mark the composition
candidate implementation complete, but the production boot authority gate
stays open. Retirement counts do not move.

Detailed research and adjudication remain in RD-numbered private Knowledge
Base files. Memory remains a concise routing graph that points to those files;
the implementation report does not turn the memory index into an evidence
warehouse.

The implementation therefore produces RD-0789 as the linked private gap
adjudication. It separates unit/KAT, cross-repository integration, host-local,
source-model, independent-review, owner-ceremony and external-platform
evidence tiers. A fresh approved independent review is preserved and
sceptically adjudicated when available; its absence remains an explicit R&D
wish-list item and cannot be laundered into verification.

## Completion boundary

This slice is complete when:

1. the sealed candidate admission and private capability registry exist;
2. all hostile identity, evidence and lifecycle cases refuse;
3. the candidate exposes no production authority or executable restore port;
4. the exact real consumer is exercised through authenticated typed
   reference execution and all identities join;
5. focused and repository-required closure gates pass freshly;
6. documentation honestly retains both false authority fields and the open
   external evidence list; and
7. the changes are committed locally, the structural index is refreshed to
   the exact commit and nothing is pushed.

The broader production authority goal is not complete until authentic offline
custody outputs and the complete admitted external platform evidence are
present and a separately approved release design allows an authority to be
constructed.
