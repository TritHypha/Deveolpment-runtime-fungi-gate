# RD-0858 Unit 4 Task 2 independent causal-control review - PASS

Date: 2026-08-23

## Audit identity

- Exact target: `e093d484062a1aaa63cc3986007bd34adc7f0acf`
- Test-only implementation commit: `dd7a17c0f667ecb73acdb938be028d69fcb0795e`
- Baseline: `f1aa341f4516fa2c7dc04e41777bd8b522cd2edb`
- Reviewer: fresh independent Codex reviewer; no audited-repository changes.
- Verdict: **PASS** with zero findings.
- Authority: causal RED evidence only; this receipt does not grant production,
  `.fungi`, GIR, SLIDE or VOK authority.

## Independent evidence

- The exact test contains six fresh-child controls: two stable discriminators
  pass and exactly four process-root security assertions fail.
- Every attack reaches `audit: "ok"` and guarded `value: "allow"` after the
  shared Node property is visibly restored.
- The detector attacks perform exactly two descriptor reads; the descriptor
  attacks perform exactly two forged reads.
- Each child poisons the CommonJS backing object before a cache-busted
  interpreter import, restores it before execution and then uses public
  `parseProgram`, `checkTypes` and `executeFlow` through one complete inline
  `require` flow.
- Child execution is bounded by a 30-second timeout and a 1 MiB output limit.
- The baseline interpreter suite remains green at 37/37.
- The reviewed range contains 14 paths: one test and generated graph/roadmap
  artifacts, with zero production and zero `.fungi` paths.

## Graph evidence

The exact project `Galerina-rd0858-task2-red-e093d48` resolves the new attack
symbols and reports 64,733 nodes and 166,004 edges. Repository graph checks pass
9/9 at exact target `e093d484`.

## Disposition

Task 2 is complete. The four failures are intentionally retained as permanent
evidence that the old same-process route is unsafe. They may turn green only
through the later clean-worker route after Task 6's admitted-artifact gate.
