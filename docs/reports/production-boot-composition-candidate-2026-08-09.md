# Production boot composition candidate evidence

Date: 2026-08-09

Implementation checkpoints: `06121a57`, hardened closure `47267944`

Private R&D route: RD-0791

## Outcome

The repository now has a sealed composition candidate joining exact
authenticated physical SLIDE `restoreVerdict` execution to a privately admitted
durability profile and the real `ColdBootOrchestrator` consumer. The candidate
is immutable, privately recognized, data-only and exposes no execution or
release capability.

```text
Candidate status: CANDIDATE_INDETERMINATE_NON_AUTHORIZING
K3 verdict: 0
authorityReleased: false
productionAuthorizing: false
No production RestoreVerdictAuthority was created or exported.
No production private key was generated, read or used.
```

Malformed, forged, stale, copied, Proxy-wrapped, duplicate-provenance or
identity-mismatched public inputs terminate as K3 `-1`. This slice has no K3
`+1` path and never retries through TypeScript, Wasm or a weaker verifier.
Absence and invalid-number states are never represented internally by `null`
or `NaN`: boundary inputs terminate through an explicit total refusal exit,
the TypeScript equivalent of Galerina's `_ =>` arm.

## Physical execution binding

The signed manifest, admitted profile, closed policy and candidate bind an
ordered tuple of four distinct transcript-specific provenance digests:

```text
index 0: (snapshotPresent=true,  integrityOk=true)  ->  1
index 1: (snapshotPresent=true,  integrityOk=false) -> -1
index 2: (snapshotPresent=false, integrityOk=true)  -> -1
index 3: (snapshotPresent=false, integrityOk=false) -> -1
```

The integration consumes **11** fresh package/object handle pairs:

- four preflight executions derive the independently verified physical tuple;
- four new executions admit the authenticated profile; and
- three new executions drive valid, missing and tampered real consumer paths.

All queues reach zero. Every receipt is independently checked before numeric
SLIDE type/state IDs `1` and `2` are mapped to semantic app-kernel identities
`Int` and `safe.scalar.int.v1`. Every execution requires
`fallbackInvoked === false`.

The missing-snapshot consumer path is intentionally `(false, false)`, as owned
by `ColdBootOrchestrator`; the tampered path is `(true, false)`.

## Fresh focused evidence

| Surface | Fresh result |
|---|---:|
| Profile and candidate focused suites | 8/8, zero failures/skips |
| App-kernel package | 215/215, zero failures/skips |
| Sentinel-state package | 26/26, zero failures/skips |
| Tower Citizen package | 495/495, zero failures/skips |
| Contract 85 real cross-repository integration | 4/4, zero failures/skips |
| Complete package aggregate inside exhaustive close | 100/100 packages, 9,470/9,470 tests, zero failures, 286.1s |
| Tooling test surface | 455 total, 444 passed, 11 intentional skips, zero failures |
| Normal phase-close | 89/89, zero failures, 612.9s |
| Exhaustive phase-close | 90/90, zero failures, 868.6s |

The cross-repository case uses the pinned SLIDE implementation `39920eb`, its
89-file tool manifest and the committed 617-byte Contract 85 object. It rebuilds
the physical object byte-for-byte and refuses a one-byte mutation.

The closure also proved generator contract 16/16, graph generation/check 6/6,
golden examples/vectors 11/11, private-document leak 0, and diagnostic catalog
974 total / 170 live. The first runs correctly refused stale package-boundary,
root-lock, golden and code-index evidence; each owning generator was rerun in
dependency order before the final green cadence. These are repository facts,
not production authority.

## Independent review

Antigravity CLI 1.1.11, Gemini 3.6 Flash (High), completed a read-only scoped
review in 426.3 seconds with `PASS_WITH_NONBLOCKING_FINDINGS`.

Two findings were adopted:

- tuple digests must be distinct, not merely well-shaped; and
- Proxy-wrapped callback records must refuse before prototype/descriptor
  reflection.

One proposed timestamp defect was rejected after source adjudication. The
owning private durability admission already proves
`indexIssuedAt <= authority.at <= notAfter`; a caller-made profile copy is not
recognized. RD-0791 preserves the private review, counterevidence, threat model
and full R&D wish list. Model review is advisory and not human security sign-off.

## External inputs still missing

The candidate exposes this closed missing-input set:

1. `REAL_OFFLINE_PRODUCTION_BOOT_DELEGATION`
2. `REAL_OPERATIONAL_PUBLIC_BUNDLE`
3. `REAL_CONTENT_BOUND_NATIVE_SLIDE_HOST`
4. `REAL_PLATFORM_DURABILITY_RECEIPTS`
5. `OWNER_RELEASE_AUTHORIZATION`

These require owner custody or external named-platform evidence. Disposable
test signatures and modeled durability records cannot satisfy them. Legal FTO
and licence review, plus eventual human security review, remain adjacent R&D
requirements and cannot be replaced by repository tests or model opinion.

## Explicit non-claims

- No offline production signing ceremony occurred.
- No authentic external crash, reboot or power-loss receipt was supplied.
- No native content-bound production SLIDE host was admitted.
- No package conversion or TypeScript/Node retirement count moved.
- The narrow Wasm oracle remains available; no production fallback was added.
- No release, installation, publication, push or terminal authority follows.
