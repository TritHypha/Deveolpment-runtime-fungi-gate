# TODO and roadmap housekeeping - 2026-08-09

## Scope and custody

This is the focused evidence record for the 2026-08-09 housekeeping pass. The
repository memory remains a routing index; detailed counts and reconciliation
evidence live here rather than in memory.

The tracked-document inventory contains:

- **32 TODO files**: the canonical `docs/TODO.md` plus 31 package TODO files.
- **16 roadmap files**: current authority views, generated status views,
  package scope roadmaps and dated historical records.
- the independent sibling `SLIDE/TODO.md`, reconciled at the same custody
  point because it owns the S1-S2 conversion hold.

Historical dated roadmaps remain chronological evidence. They were not
rewritten to look current. The active route is the canonical
`docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`; generator-owned views
were regenerated through their owning tools, and long-lived scope roadmaps now
point readers back to that authority.

## Percentage audit

The canonical component-health audit reports:

| Measure | Current result | Meaning |
|---|---:|---|
| Ship-readiness checks | 100% | Repository check completion, not production authority |
| Zero-trust thesis average | 78% | Mixed evidence classes; not one release percentage |
| Build-progress average | 75% | Mixed evidence classes; not one release percentage |
| Fungi-only packages | 2/100 (2.0%) | Package source-language retirement state |
| TODO document state | 1,200 done / 910 open / 2,110 total (56.9%) | Documentation checkboxes only; current after G1-G4 reconciliation |
| Named workstreams | 31 | 16 shipped, 11 building, 1 build-pending, 3 post-v1 |

The 19 quantified thesis/build rows comprise **1 live measurement, 1 release
ladder and 17 asserted checkpoints**. These classes must not be averaged into a
production-authority claim. The history snapshot records no change from the
2026-08-03 ship/zero-trust/build values of **100 / 78 / 75**.

## Tooling correction

The percentage toolchain previously serialized 21 implicit absence sentinels
in `build/component-health/percent-audit.json`. The source and generated JSON
now use explicit closed variants:

- percentage rows carry `kind: "percent"` and a finite percentage;
- status-only rows carry `kind: "status"` and no percentage field;
- history diffs use `delta`, `added` or `removed` variants;
- unsupported tracking states refuse instead of disappearing from the subway;
- the compiler checkpoint is derived from the current compiler version record,
  so the displayed **6,319/6,319** count cannot drift independently.

Focused tests cover the closed row shapes, non-finite refusal, current compiler
count and complete rendering of all 31 named workstreams. The generated subway
was rendered to a bitmap and visually inspected after regeneration.

The final normal phase-close passes **89/89 blocking gates** from the reconciled
state. It includes **444 tooling tests**, generator contracts **16/16**, graph
generation/check **6/6**, Golden Pack **11/11 checked examples plus 11/11
execution vectors**, the independent percent-fresh gate, path/private-document
leak checks, canonical proofs and an accepted no-authority-widening governance
diff. Earlier refusals correctly exposed stale code-index and Golden Pack
dependencies; their owning generators repaired them before this terminal run.

## Current decision route

RD-0792 adjudicates the `.gate` v4 ADR-002 synthesize-only idea as a later
bounded experiment, not a prerequisite for the current conversion. Grok and
Antigravity independently support rework rather than adoption as written. The
current path remains:

```text
Galerina source -> canonical GIR -> physical SLIDE -> independent re-admission/VOK
```

The experiment remains `build-pending`. It may not widen authority, bypass the
security hold or replace the current conversion route without a new measured
gate and owner ruling.

## Open exits

- Galerina security items G1-G4 remain open.
- SLIDE security items S1-S2 remain open.
- Lyth-Weaver and selected TritMesh:QL findings remain open or must be excluded
  from the converted scope.
- The complete security rescans, 100-package aggregate and exhaustive closure
  must pass in one current custody state before mechanical conversion begins.
- Authentic signing, content-bound native hosting, named-platform durability
  evidence, owner release and terminal TypeScript/Node retirement remain
  separate authority gates.
