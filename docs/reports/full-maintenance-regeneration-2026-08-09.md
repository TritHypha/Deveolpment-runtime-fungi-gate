# Full maintenance and regeneration report

Date: 2026-08-09

Scope: Galerina, SLIDE and the Knowledge Base indexes

Authority: local verification evidence only; no production or signing authority released

> Historical checkpoint: this report records the maintenance close before the
> subsequent restore-verdict consumer switch. Current route and counts are in
> [the consumer-switch report](restore-verdict-consumer-switch-2026-08-09.md)
> and [the live TODO](../TODO.md).

## Outcome

The sequential maintenance run completed without process fan-out. The host had
two pre-existing Node processes before the run and still had two after every
major graph, build, test and audit phase. No production source was changed to
obtain a green result.

The first Galerina phase-close correctly refused three stale generated-evidence
surfaces after the canonical test and contract counts moved. Their owning
generators were run, their independent drift checks passed, and both the normal
and exhaustive phase-close lanes then completed without a blocking failure.

## Verified evidence

| Surface | Result |
| --- | --- |
| Galerina repository graphs | **6/6** generated and independently checked |
| Galerina diagnostic index | **974** total entries: 861 source-real and 113 documentation-only |
| Galerina contract registry | **1,465** contracts across 534 `.fungi` files |
| Knowledge Base index | **1,848** documents indexed |
| Galerina package builds | **95/95** package build scripts passed, run one package at a time |
| Process warden | non-authorizing native candidate rebuilt successfully |
| Fusable packages | 2 fresh, 2 skipped, 1 ceremony-signed and locked, 0 failed |
| Galerina tests | **99/99 packages, 9,458 tests, 0 failed**; compiler **6,319** |
| SLIDE tests | **857/857 across 94 suites**, 0 failed or skipped |
| Galerina normal phase-close | **64/64 blocking gates passed** |
| Galerina exhaustive phase-close | all blocking gates passed, including the full package-test lane |
| SLIDE path-leak audit | **14/14** detector controls; 745 repository targets clean |
| SLIDE security closure | `CLOSURE_CHECKED`, evidence K3 `0`, authority not released |
| SLIDE contract catalog | **2 partitions / 92 files**, current |
| SLIDE tool manifest | **89 files**, current |

The Galerina aggregate was intentionally run twice: first to obtain fresh
behavioural evidence, then through its owning `--emit-counts` mode so
`version.json` was updated atomically rather than hand-edited. Both runs passed
99/99 packages and 9,458 tests.

## Refusals and repairs

The first normal phase-close reported only these three failures:

1. `doc:roadmap-drift`
2. `code-index`
3. `audit:percent-fresh`

They were generated-state drift, not product-code defects. The code/diagnostic
indexes, component-health percent evidence, generated status blocks and subway
roadmap were regenerated through their owning tools. Each corresponding check
then passed before the complete phase-close was rerun.

SLIDE's generic contract writer also refused an implicit date. That refusal is
intentional. The three bounded writers were rerun with the explicit evidence
date `2026-08-09`, after which the aggregate contract and tool-manifest checks
passed.

## Safety and scope

- All long-running operations were serialized.
- Galerina package builds used one package child at a time.
- Galerina tests used test concurrency one.
- SLIDE tests used test concurrency one.
- No private signing material was read or used.
- No dependency, denial gate or authority boundary was weakened.
- Nothing was pushed.

## Remaining route

This maintenance run does not close the architectural migration gate. The next
bounded implementation remains the real sentinel-state consumer switch to the
admitted `restoreVerdict` package export. `cold-boot.ts` must retain host
serialization, durable storage and scrub ownership until each responsibility
has its own replacement and evidence. Package conversion and terminal
TypeScript retirement counters remain unchanged.
