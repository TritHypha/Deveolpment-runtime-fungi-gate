# Contract 86 VOK authority SLIDE candidate completion

Date: 2026-08-09

Status: **COMPLETE - REFERENCE-ONLY, NON-AUTHORIZING**

## Outcome

The existing governed `vokAuthorityVerdict` source now compiles into a
source-free physical `.slide` package, re-admits through the independent
loader and executes every value in its complete nine-trit domain through one
affine VOK handle per decision.

The source was not flattened or replaced with a host decision table. Its two
pure helper calls remain in the compiler-derived call closure.

## Root cause and fix

The source and GIR were valid, but physical execution previously inherited a
universal 96-step clamp. SLIDE Contract 85 adds one exact successor registry
for the inherited Contract 53 scalar family when conservative transitive call
work is 97..2,048. Producer and executor derive that work independently;
recursion, unknown callees, altered limits and profile evasion refuse.

The new registry causes the package publisher to emit receipt schema v2 with
exact registry ID/digest fields. Galerina's independent build inspector still
accepted only receipt v1, so it correctly refused the first build. The
inspector now:

- distinguishes exact v1 and v2 artifact shapes;
- allows only the closed registry ID/digest map pinned by the SLIDE tool
  closure;
- includes non-empty registry facts in the package-content digest;
- requires at least one successor artifact in a v2 receipt;
- refuses unknown, altered and empty-only registry evidence.

The focused independent builder suite is **6/6**.

## Bound evidence

- Package: `@galerina/core-runtime` version `1.0.0-beta.2`
- Export: `vokAuthorityVerdict`
- Source SHA-256: `133d8444e7f0e37acdc13e3b4fe056c451e663b93eac3df7f8f1371e6d3de10d`
- SLIDE checkpoint: `aa90dd72f04accd399c76b4bc650d097275bd735`
- Tool manifest: 89 files, `sha256:535e1d8652a514675ecc82a0603b9e4f95c860b9c03ac176eddf66f146d69fdb`
- Registry: `slide.registry.executable-gir.v2c-bounded-transitive-call-work.v1`
- Registry digest: `6121be7c1e279d8a28eeeaa31e46889e4fd8450aa9383bb40de80d2484bf855e`
- Physical object: `package-f44f6b634cf20601-a1df29fa1f435ffd.slide` (1,027 bytes)
- Package-set digest: `sha256:1e6b69dfde3bf677340cb515070b28a9d03c4ba59f7069871ff4d659ac3af187`
- Power-loss durability: `0`
- `referenceOnly`: `true`
- `authorityReleased`: `false`

## Exhaustive evidence

| Gate | Result |
|---|---:|
| All values in `{-1,0,+1}^9` | 19,683/19,683 |
| Authorizing vectors | exactly 1 |
| Malformed trit classes | refused |
| Exact publication rebuild | pass |
| One-byte physical mutation | refused |
| Contract 86 focused test | 4/4 |
| Contract 85 restore/consumer revalidation | 4/4 |
| Complete tooling surface | 447 total / 437 pass / 10 intentional skips / 0 fail |
| Complete package aggregate | 99/99 packages / 9,464 tests / 0 fail |
| Normal phase-close | every blocking gate passed |
| Exhaustive phase-close | every blocking gate passed, including all packages |
| Repository graph generation and check | 6/6 + 6/6 |
| Node process census | 2 -> 2 |

Every accepted result equals the numeric K3 minimum, carries a verified typed
receipt, reports `fallbackInvoked=false` and consumes one handle. No malformed
input is converted into unknown or allow.

## Remaining boundary

This closes a bounded physical candidate, not production VOK authority. The
runtime is still reference-only, the platform evidence is not authenticated
for production composition, durability remains zero, no signing ceremony was
performed and no TypeScript/package-retirement counter moves.
