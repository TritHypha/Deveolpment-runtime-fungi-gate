# Claude TypeScript sweep and full tooling verification

Date: 2026-08-02

Branch: `codex/galerina-beta-v1-completion`

Policy: verify rather than assume; fail closed; external reports are evidence
inputs, never authority

## Outcome

The first bounded remediation tranche is implemented and locally committed as
`c07c405a`. Seven current defects were reproduced with failing tests, repaired,
and retained as regressions. An eighth supplied claim, runtime execution after
a governance error, was tested on the current tree and did not reproduce: the
runtime already returns a non-OK result with no value.

The complete package aggregate passes **98/98 packages and 8,846/8,846 tests**.
The four phase-close failures observed before regeneration were evidence drift,
not waived failures: graph output, code index, benchmark publication text and
example diagnostics. All four direct gates now pass after correction and
regeneration. Final exhaustive phase-close evidence is recorded below after its
post-documentation run.

## Supplied evidence and trust boundary

The following external research files were read as non-authorizing evidence:

- `triLowLevel-v2/Claude-RD/SESSION-WRAP-UP-2026-08-02.md`
- `triLowLevel-v2/Claude-RD/galerina-ts-sweep/CHUNK-01-REVIEW.md`
- `triLowLevel-v2/Claude-RD/galerina-ts-sweep/CHUNK-02-REVIEW.md`

The supplier reports a full read of 494 tracked package TypeScript files and
633 raw observations. Only 80 of 195 severe observations were adversarially
adjudicated: 49 were confirmed and 31 refuted. Therefore the raw total is not a
Galerina finding count. Another 115 severe and 438 medium/low observations
remain unverified. They must be independently reproduced on the current commit,
including reachability and upstream-gate analysis, before remediation or status
promotion.

## Current defects closed in this tranche

| Boundary | Reproduced defect | Fail-closed correction |
|---|---|---|
| Interpreter equality | Distinct unresolved enum variants could collide with the Verdict dispatch key and compare equal | Enum identity is compared before numeric dispatch |
| Type checking | Record-literal field values behind identifier wrappers were skipped | The record constructor walks each field value without reclassifying unrelated contract wrappers |
| Value-state egress | A secret nested directly in a record literal could evade network-sink inspection | Record field values participate in recursive secret egress analysis |
| Match guards | Runtime errors and other non-void values could select a guarded arm | Traps propagate; every admitted guard must be `Bool`; only `true` selects |
| Plugin grant | Unrelated prose containing `grant` could satisfy the access requirement | Broad substring admission was removed; only structured access/grant forms count |
| Resilience inference | `idempotent: false` was treated as enabled | Only exact `idempotent: true` sets the flag |
| Fuse trust root | A package-local `governance/` key could authenticate that same package | Ed25519 and ML-DSA public keys resolve only from a caller-admitted governance root |

The hybrid verifier was corrected with the classical fuse loader because both
implemented the same implicit package-owned trust fallback. The REST fuse test
now supplies a separate, explicit caller-admitted public-key directory.

## Fresh verification evidence

| Scope | Result |
|---|---:|
| Core compiler package | 5,791/5,791 |
| App-kernel package | 205/205 |
| REST fuse package | 4/4 |
| Complete package aggregate | 98/98 packages; 8,846/8,846 tests |
| Executable documentation examples | 232/232; 0 known drift; 0 new drift |
| Aggregate graph check | 5/5 |
| Code-index check | PASS; 772 codes |
| Benchmark publication integrity | fresh; 0 findings |
| Security child in exhaustive run | 31 files; 0 findings; 0 errors |

The code-registry generator also reports 80 real token shapes absent from the
catalog, including 51 on signing paths. Its own contract labels this
**report-only** pending shape-aware indexing; it was not misrepresented as a
passing enforcement gate or silently discarded.

## Gate diagnosis

- `graph:all` and `code-index` were genuine stale generated evidence. Registry
  generators were run first, then indexes, then `graph-all`; both check modes
  now pass.
- `bench-report-stale` was a publication mismatch between `report.md` and the
  existing `results/latest.json`. The repository UTF-8-safe builder regenerated
  the report and charts. No new benchmark measurement or result substitution
  occurred.
- `example-diagnostics` initially exposed an over-broad checker correction:
  walking every identifier child reclassified contract wrappers as value
  types. The implementation was narrowed to record-field value children. All
  232 admitted examples now pass their exact contracts.
- No structural failure was waived as a false positive. Every failed gate was
  either fixed or remains explicitly open.

## Remaining external-review work

The rest of the Claude sweep is a review queue, not confirmed live debt. Work it
in bounded tranches, highest authority impact first:

1. Reproduce each report on the current commit with one-axis controls.
2. Establish current reachability, upstream blocking and the exact consumer of
   any asserted proof or receipt.
3. Add a failing test before changing implementation.
4. Preserve latent fail-open shapes that are unreachable only because of the
   current call graph; a new consumer must trigger re-review.
5. Never inherit the supplier's severity or raw counts without current evidence.

The independent `triLowLevel-v2` R&D and its scanner-tool security findings are
separate, non-authorizing inputs. They do not change Galerina status merely by
being stored beside this sweep.

## Final exhaustive fixed point

`npm.cmd run phase-close:exhaustive` completed uninterrupted in **847.6
seconds** with **87/87 blocking gates passed**. Its recorded children include:

- core tests in 91.5 seconds;
- generator contract 14/14 and benchmark-integrity tests 60/60;
- security audit over 31 files with zero findings and zero errors;
- graph aggregate 5/5, current code/code-registry/KB indexes and canonical CBOR
  for 44 manifests;
- executable examples 232/232 and tooling 302/302;
- auto-erasure 199 sites, 197 in stages and zero violations;
- gate-key injectivity over one gate and six baselines with zero violations;
- full package aggregate 98/98 and 8,846/8,846 tests;
- governance differential accepted with no authority widening.

No failure was waived, reclassified as structural noise or hidden behind
report-only mode. The process exited `0` and released the runner's normal PASS
verdict.
