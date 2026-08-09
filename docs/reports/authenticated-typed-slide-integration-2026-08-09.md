# Authenticated typed SLIDE integration report

Date: 2026-08-09

Status: reference implementation verified; production authority unreleased.

## Outcome

Galerina now pins SLIDE Contract 86 implementation `39920eb`, the 89-file
reference tool manifest at `817e9d17...1d8484`, and the 95-file closed contract
catalog. The checked-Fungi publication loader composes exact hybrid-authenticated
`.slide` object bytes with the existing typed physical executor and independent
safe-value receipt verification.

The real sentinel `restoreVerdict` consumer uses this authenticated typed path
in its cross-repository evidence. There is no unauthenticated retry or fallback.
The VOK authority candidate keeps its exhaustive semantic proof separate from
one authenticated authorizing-candidate proof so 19,683 vectors do not repeat
the same cryptographic verification without adding semantic coverage.

## Cryptographic test boundary

The tests generate disposable Ed25519 and ML-DSA-65 keys in process. They prove
the algorithm composition, exact object identity, epoch, package/export,
compiler-profile and tool-manifest binding. They are not production keys, do
not imitate offline custody and grant no signing or release authority.

## Fresh evidence

| Evidence | Result |
|---|---:|
| SLIDE focused authenticated typed loader | 3/3 |
| SLIDE complete sequential suite | 866/866 across 96 suites |
| SLIDE contracts | 95 files / 2 partitions |
| SLIDE tool manifest | 89 files / `817e9d17...1d8484` |
| SLIDE path hygiene | 14/14 / 753 targets |
| SLIDE security closure | verdict `+1`, evidence K3 `0` |
| Galerina Contract 85 restore/consumer | 4/4 |
| Galerina Contract 86 VOK candidate | 5/5 |
| Contract 86 exhaustive semantics | 19,683/19,683; one authorizing |
| Galerina code catalog fixed point | 974/974; zero registry holes |
| Galerina registered package aggregate | 100/100; 9,470/9,470 |
| Galerina normal phase-close | 89/89 in 567.6s |
| Galerina exhaustive phase-close | 90/90 in 838.5s |

The first full Galerina phase-close wrapper timed out after ten minutes and was
correctly treated as non-authorizing. Process inspection showed one owned R6
test tree, not uncontrolled Node fan-out; its warden and lease cleaned up. The
authoritative rerun completed all gates except `code-index`, whose raw refusal
was generated line-location drift after the two integration tests moved. The
owning index, registry and coverage generators were rerun and their checks now
pass. The final registered fixed point then passed graph generation/check
**6/6**, normal phase-close **89/89** and exhaustive phase-close **90/90**.

## Remaining authority gates

1. authenticate current platform and native-adapter evidence independently;
2. bind that platform evidence, the authenticated `.slide` object and the
   production boot composition in one fail-closed admission;
3. bind production signing, revocation, rotation and durability receipts;
4. keep package conversion and TypeScript/Node retirement as separate exact
   debt ledgers; and
5. release no terminal authority until every required receipt verifies.

Authenticated object execution is necessary but is not authenticated platform
execution. The latter remains the next production boundary.
