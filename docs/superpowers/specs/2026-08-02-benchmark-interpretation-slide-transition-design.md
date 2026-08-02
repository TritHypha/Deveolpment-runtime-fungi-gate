# Benchmark interpretation and SLIDE transition design

Date: 2026-08-02
Status: approved through the owner's full-auto delegation

## Outcome

Every generated `benchmark-report-latest.md` workload row will explain:

1. what the score measures;
2. whether higher or lower is better;
3. whether a winner may honestly be declared;
4. who won among the admitted measured lanes;
5. where production Galerina placed; and
6. what the green tick means.

For this report, **production Galerina** means the generated Wasm production
lane. `galerinaGoverned` remains a separately named Stage-A diagnostic
interpreter and is never substituted for the shipping lane.

The next executable-backend benchmark will compare Galerina/SLIDE against a
frozen historical Galerina/Wasm result. It will not rerun the old path and
quietly call the new measurement historical evidence.

## Selected architecture

A pure benchmark-interpretation module will derive report semantics from a
workload row. `report.mjs` will use that model for both Markdown and JSON so
human and chart consumers cannot derive conflicting answers.

The generated cross-language table gains three concise fields:

- `Better`: `higher`, `lower`, `internal only`, or `not certified`;
- `Winner`: the admitted measured winner, or the exact reason no winner is
  declared;
- `Galerina`: production Galerina's ordinal place and field size, or an
  explicit absence/non-comparability reason.

The table is followed by a short legend:

- `✅` means the workload is admitted as work-equivalent and unit-aligned for
  cross-runtime ranking;
- it does not mean Galerina won;
- no tick means the row may still contain measurements, but they are not
  admitted for a cross-runtime winner claim.

## Direction and ranking rules

Throughput classes (`cpu-throughput`, `gpu`, and admitted same-unit I/O) use
**higher is better**. Only finite non-negative measurements participate.

Memory workloads use **lower heap bytes per operation is better**. A negative
heap delta is collection noise and cannot win. Throughput cells may remain
visible as secondary shape evidence, but they do not determine the memory
winner.

Governance is **internal only**. It does not declare a cross-runtime winner or
a production Galerina rank because native lanes intentionally perform
different work.

Uncertified or legacy rows declare **no winner** and **no Galerina place** even
when numbers exist. This prevents a visually plausible but invalid ranking.

Exact numerical ties share a place. Missing lanes do not count in the field
size. The winner and Galerina place are derived, never handwritten.

## Historical transition contract

The current full result is captured once as the named Galerina/Wasm transition
baseline. A tracked, non-secret contract identifies:

- the exact archive directory;
- baseline product label `Galerina/Wasm` and lane key `wasm`;
- candidate product label `Galerina/SLIDE` and lane key `slide`;
- required workload identity and unit equality;
- the rule that only aligned, finite, same-direction observations compare.

`report.mjs` emits a third transition section only when a real `slide` lane is
present. Before then it emits a prepared/deferred statement naming the frozen
baseline. When SLIDE appears:

- shared admitted rows compare archived `wasm` with current `slide`;
- missing, surplus, unit-mismatched, uncertified or non-finite rows are listed
  explicitly and receive no ratio;
- the old result is read from the archive and is never reconstructed from a
  new Wasm run;
- a comparison never releases SLIDE production authority.

## Failure behavior

The report command refuses a malformed transition contract, duplicate keys,
an absent archive, malformed JSON, duplicate workload IDs, or an unexpected
lane value. It does not silently choose another archive or another runtime.

If no current `slide` lane exists, generation succeeds with an explicit
deferred transition status. If a `slide` lane exists but the transition
baseline cannot be admitted, generation fails closed.

## Verification

Focused tests must first demonstrate the missing behavior, then cover:

- higher-is-better winner and production Galerina placement;
- lower-is-better memory winner and negative-delta exclusion;
- no winner/rank for governance and uncertified rows;
- tie and missing-production-lane behavior;
- the exact green-tick legend;
- deferred transition before a SLIDE lane exists;
- exact archived Wasm versus current SLIDE pairing;
- refusal of unit/workload/contract ambiguity and non-finite data;
- generated Markdown and JSON agreement.

The benchmark package tests, report freshness audit, truth audit, graph checks
and generated-artifact checks must pass before the change is committed.

## Scope boundary

This change improves interpretation and prepares a future comparison. It does
not create a SLIDE executable backend, promote existing non-comparative VADE
evidence, alter benchmark measurements, or claim that SLIDE is faster.
