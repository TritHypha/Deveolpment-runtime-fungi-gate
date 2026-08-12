# Report Status Fungi Conversion Design

## Objective

Translate the private deterministic `selectReportStatus` decision in
`packages-galerina/galerina-core-reports/src/index.ts` into a package-owned
`.fungi` semantic twin and prove it through the canonical compiler plus
physical SLIDE/VOK. The TypeScript implementation and `summarizeDiagnostics`
consumer remain active.

## Source dossier

- Galerina build point: `484a62752208cb1866d6002cb555f5cb79329a74`.
- TypeScript source SHA-256:
  `bca420aa0b0fc9055b53f2dfe33584b4bb4c7ed80a1d4e2851d07b0595a138f5`.
- Independent SLIDE build point:
  `6de4d91ba20a7e86c53c8898fcdae2ef4b6cee28`.
- Node.js: `v24.18.0`.
- Production caller: `summarizeDiagnostics`.

The source applies a strict priority order: a positive critical count returns
`"critical"`; otherwise a positive error count returns `"error"`; otherwise a
positive warning count returns `"warning"`; all remaining admitted integer
counts return `"ok"`. It has no effects, mutation, exception, absence,
coercion, asynchronous scheduling or partial progress.

## Considered approaches

1. **Nominal record input (selected).** Define `ReportStatusCounts` with fields
   in the same order as the TypeScript input and accept exactly one record.
   This preserves the source boundary and exercises SLIDE's exact-object record
   descriptor and field-projection path.
2. **Three scalar parameters.** Simpler to execute, but changes the input shape
   and weakens the proof of exact-object admission.
3. **Convert all report summarisation now.** This would combine array
   traversal, counting and status selection into one large slice and obscure
   which semantic boundary failed.

## Exact Fungi boundary

Create `src/self-hosted/report-status.fungi` with:

```fungi
@version 1

record ReportStatusCounts {
  warnings: Int
  errors: Int
  critical: Int
}

pure flow selectReportStatus(input: ReportStatusCounts) -> String
contract { intent { "Select the highest report status represented by the admitted counts." } }
{
  if input.critical > 0 { return "critical" }
  if input.errors > 0 { return "error" }
  if input.warnings > 0 { return "warning" }
  return "ok"
}
```

The flow contains no null, NaN, `else if`, `throw`, `try`, `catch`, `for`,
`while` or `loop`. Sequential terminal `if` statements preserve the source's
priority order. The nominal `Int` record is the admitted conversion domain;
floats, NaN-like values, surplus fields, inherited fields, accessors and proxy
objects must be refused at the physical border rather than coerced.

## Decision and effect ledger

| Source decision | Subject | Terminal | Fungi construct | Effects | Exit |
|---|---|---:|---|---|---|
| `input.critical > 0` | `Bool` | yes | `if` | none | `"critical"` |
| `input.errors > 0` | `Bool` | yes | `if` | none | `"error"` |
| `input.warnings > 0` | `Bool` | yes | `if` | none | `"warning"` |
| no positive count | exhausted priority | yes | terminal return | none | `"ok"` |

## Proof shape

1. Add a failing differential test that requires the package-owned Fungi
   source and `selectReportStatus` export before creating it.
2. Cover the full Boolean positivity cube, priority collisions, zero and
   negative counts through the public TypeScript caller, typed Fungi
   interpretation and signed/admitted Wasm.
3. Compile the exact Fungi bytes through independent SLIDE, publish one
   physical `.slide`, re-admit it through VOK, and verify typed String receipts.
4. Refuse wrong arity, non-records, non-Int fields, missing/surplus/inherited/
   accessor/proxy shapes, source mutation and physical artifact mutation.
5. Register the proof and refresh only the bounded owning graphs, indexes,
   counts, roadmap and subway outputs. The crash-linked full tooling,
   `graph-all` wrapper, normal phase-close and monolithic memory evaluation
   remain excluded.

## Authority boundary

This is a reference-only conversion proof. It does not export or replace the
private TypeScript helper, switch `summarizeDiagnostics`, retire source, widen
an effect/capability/contract/Hallmark/border grant, or claim bootstrap,
production, hardware, signing, release or durability authority.

