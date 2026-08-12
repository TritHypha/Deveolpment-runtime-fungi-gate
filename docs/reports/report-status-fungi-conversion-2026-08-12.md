# Report Status Fungi Conversion Report

## Outcome

The reports package's private `selectReportStatus` decision has a package-owned
`.fungi` semantic twin and a physical SLIDE/VOK execution proof. TypeScript and
`summarizeDiagnostics` remain active. This is a bounded reference-only slice,
not source retirement or production authority.

## Closed decision

`ReportStatusCounts` contains declaration-ordered `warnings`, `errors` and
`critical` `Int` fields. `selectReportStatus` returns `"critical"` when the
critical count is positive, otherwise `"error"` when the error count is
positive, otherwise `"warning"` when the warning count is positive, and
otherwise `"ok"`.

The pure source contains none of null, NaN, `else if`, `throw`, `try`, `catch`,
`for`, `while` or `loop`. It grants no effect, capability, contract permission,
Hallmark, border grant or host API.

## Exact custody

| Item | Evidence |
|---|---|
| TypeScript reference | SHA-256 `bca420aa0b0fc9055b53f2dfe33584b4bb4c7ed80a1d4e2851d07b0595a138f5` |
| Fungi source | SHA-256 `0347d792d17c4830e65b2ca7159c111f966f745fadaec22345b17467a9a87921` |
| Differential test | SHA-256 `1da8921ba4a13c5203592af0caaf20cd4be836af7b85185a49df17086c633bc9` |
| Physical SLIDE/VOK test | SHA-256 `b4d15bd13d66e85e94b8b506daced2faaea483d149157aedaabe9e3c8f100124` |
| Design and plan commit | `7b168058` |
| Differential RED commit | `c37b498e` |
| Fungi implementation commit | `dec3392c` |
| Physical proof commit | `9f6e1a9e` |
| Governed proof-corpus registration commit | `8195eadc` |
| Independent SLIDE build point | `6de4d91ba20a7e86c53c8898fcdae2ef4b6cee28` |

## Verification evidence

- Strict Fungi check: zero errors and zero governance warnings.
- Differential: **2/2**, covering all 27 `{-1, 0, 1}^3` combinations through
  typed interpretation and signed/admitted Wasm, with public TypeScript caller
  parity on valid diagnostic counts.
- Reports package: **17/17** across two suites, zero failures and zero skips.
- Physical SLIDE/VOK: **1/1**, zero skips, with independently verified typed
  String receipts for all 27 combinations.
- Exact-object refusal: missing/surplus fields, inherited/accessor/proxy
  objects, non-records, float and NaN fields, and wrong arity refuse.
- Custody refusal: inadequate work, mutated source, receipt fields, every
  safe-value envelope byte and the physical `.slide` artifact refuse.
- Physical registry:
  `slide.registry.executable-gir.v2c-bounded-wide-control-flow.v1`, digest
  `d805dae4b822392e5092126ce4f0fb27e8bfa6aa2de8862ee88e09e23eed43cc`.
- Tooling manifest reconciliation: both exact sets contain **131/131** files,
  no duplicates, no missing physical Fungi-to-SLIDE proof, and the focused
  manifest/tooling/runner suite passes **27/27**.
- Compiler: isolated and exact named-runner evidence both pass
  **6,382/6,382**. The first package-concurrent aggregate retained one compiler
  child refusal; it is not recast as a pass.
- Canonical package owner: the serial, count-publishing run passes **100/100
  packages and 9,608 tests in 442.6s** with exit code 0.
- Public skills: `translating-typescript-to-fungi` and `writing-fungi` were
  independently RED/GREEN audited and validated at skills commit `f92c5ab`.
  Slice close now requires a skill update or an explicit `NO_SKILL_UPDATE`
  record.
- Golden owner: **11/11 checked examples and 11/11 execution vectors**.
- Retirement owner: **1,449 executable-family paths**, **30 same-stem twins**,
  and **133 source Fungi assets**; its staged-index conservation self-test
  passes.
- Graph owners: package **100 packages / 201 outputs**, project **5/5**, KB
  **4/4**, Fungi capability inventory **133 files**, and semantic assurance
  **3/3 with 0 routes / 100 packages / 940 tests**.
- Index and status owners: code index **974**, percent evidence
  **78% zero-trust thesis / 75% build / 31 tracked items**, canonical rendered
  claims **7/7**, and roadmap/subway **5/5**.
- Hygiene: the bounded path-leak audit is clean. Its documented unmodelled and
  binary exclusions remain exclusions, not an absence claim.
- Indexes: the primary codebase graph conserves **51,014 nodes / 51,013
  expected** and **136,201 edges / 136,200 expected** at the exact indexed
  head; its query finds the new report-status proof surface. Myco indexes
  **5,107 files / 77,818 terms** and directly returns the `.fungi` flow.
  Neither index supplies execution or retirement authority.

Full tooling, `graph-all`, normal phase-close and
monolithic memory evaluation remain deliberately excluded because those lanes
are crash-linked; repository-wide closure remains `UNKNOWN`.

## Error-reporting boundary

Galerina and SLIDE share a versioned error/diagnostic contract, not ambient
global reporting authority. Galerina returns a typed failure, diagnostic or
refusal; SLIDE/VOK returns independently verified admission/execution receipt
evidence. A separately permitted boundary adapter may record or display that
value with declared effects. A terminal `_ =>` arm must return a typed unknown
or refusal and must not call a global logger or treat logging success as
execution or admission authority.

## Authority boundary

The TypeScript helper, `summarizeDiagnostics`, all report creation paths and
all consumers remain active. No consumer switch, bootstrap fixpoint,
production, hardware, signing, release, durability or source-retirement
authority follows from this proof.
