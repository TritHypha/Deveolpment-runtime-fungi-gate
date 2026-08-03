# Round 5 Fungi package conversion independent review

Date: 2026-08-03

Verdict: **rejected for integration; useful as a partial inventory only**.

Round 5 remains an external, quarantined and non-authorizing exercise. Its
three candidate files must not replace TypeScript, enter the production Fungi
ledger or be treated as executable SLIDE evidence.

## Fresh source and checker evidence

- The report accounts for 66 assigned TypeScript paths.
- None of those 66 source paths changed between the worker's source commit
  `99340b07...` and this review's Galerina commit `0604ca6b...`.
- The three candidate files pass the current strict frontend: eight flows,
  zero checker errors and zero governance warnings.
- Strict frontend acceptance proves syntax/type/governance acceptance only. It
  does not prove semantic parity, execution, effects, ABI compatibility,
  SLIDE lowering, production admission or retirement.
- The focused shipped-source and established-twin tests pass 20/20 with one
  Node process before and after.

## Material findings

### R5-01 - staged secret gate is both superseded and behaviorally invalid

Severity within the candidate: high. Production exposure: none while the
candidate remains quarantined.

Galerina already contains a checker-verified, buildable and differentially
executed `secret-gate.fungi` decision twin. Round 5 nevertheless classified a
new weaker version as `CANDIDATE` rather than
`SUPERSEDED_BY_EXISTING_FUNGI`.

The staged contract states that exactly `1` means present and every other value
must refuse, but its source tests only `p < 1`. If its `Some` arm executes, a
surplus value such as `2` can admit. A fresh current-interpreter probe also
returned refusal for all `-1`, `0`, `1` and `2` inputs, so the candidate does
not execute its valid path through that runtime. Either observation prevents
parity admission.

### R5-02 - logical-clock candidate represents only a partial arithmetic fold

The candidate models validation, increment and addition, but does not provide
the complete public state surface: `now`, `reset`, re-anchored `startTick`,
state-transition ownership and the complete named diagnostic carrier are not
represented or differentially executed. It may be retained as exploratory
arithmetic source, not a package replacement.

### R5-03 - bridge candidate crosses its declared source boundary

The file declares `bridge.ts` as its source but also translates `oracleAgrees`
from `oracle.ts`, which was not the assigned row. The latter deliberately
omits JavaScript's signed-32-bit coercion and therefore is not equivalent for
out-of-range numeric inputs. Neither flow has differential execution evidence.

### R5-04 - the five claimed tractable rows are not a safe conversion queue

- `galerina-core-sentinel-power/src/errors.ts` is a diagnostic carrier rather
  than a complete independently executable behavior.
- `galerina-substrate-math/src/index.ts` uses floating-point probability
  arithmetic, validation, exponentiation and bounded summation; it is not
  merely a class/throw conversion.
- `galerina-core-sentinel-state/src/atomic-writer.ts` crosses filesystem, path,
  JSON, atomic-publication, durability and error boundaries.
- `galerina-tri-regex/src/index.ts` orchestrates parser, compiler, budget and
  matcher-object surfaces; a no-regex token count does not make it trivial.
- `galerina-hardware-tier/src/tier-loader.ts` carries registry values and a
  function-valued resolver, which the handover itself labels unestablished.

Each must be reclassified from actual semantics and effects before any further
translation attempt.

### R5-05 - required completion evidence is absent

The approved Round 5 design requires a source dossier, control/effect ledger,
parity/refusal vectors, test plan and exact final evidence for every assigned
file. The handover explicitly says none of those per-file evidence directories
exists, including for the candidates. The design's completion condition is
therefore unmet even though `NOT ASSESSED` is absent from the summary table.

## Admission decision

1. Admit no Round 5 candidate.
2. Retain the 66-row report as a non-authorizing inventory with this rejection
   attached.
3. Verify current language/runtime capabilities before accepting its blocker
   labels; checker tests already indicate that some allegedly absent surfaces
   may have evolved.
4. Future conversion batches must execute negative, positive and mutation
   vectors. A strict checker exit alone cannot produce `CANDIDATE` status.
5. Preserve the existing secret-gate twin and its differential test as the
   authoritative current conversion evidence for that decision surface.
