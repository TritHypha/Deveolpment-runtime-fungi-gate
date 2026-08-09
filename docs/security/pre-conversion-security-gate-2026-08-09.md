# Pre-conversion security gate - 2026-08-09

## Ruling

TypeScript-to-`.fungi` conversion is **not authorised** at this checkpoint.
Four repository-wide Codex Security scans are sealed, but their findings and
the current exhaustive-suite refusal must be closed before conversion begins.
A green normal cadence or an isolated package pass does not override an open
security finding.

The owner explicitly waived the repeat pass through
`Anthropic-Cybersecurity-Skills`; it was not run and is not represented as
evidence.

## Scan inventory

| Repository | Exact scanned revision | Scan ID | Reportable findings |
|---|---|---|---|
| Galerina | `968d81669b98036a188ef376a1ce3962c8fbab9f` | `bfcf60af-c6a6-4a8b-a353-ba543de8cff0` | 1 high, 1 medium, 2 low |
| SLIDE | `e2d21102d5f40c8392b40eb3f5a1faa555dfdabf` | `82080882-b67d-41e3-bef3-c83402e9e706` | 2 low |
| Lyth-Weaver | `146011312b787d3424d9e89c7ed2f3020f2a5c96` plus preserved worktree state | `8d0cd954-8770-4a00-b49c-a0cf8c545744` | 1 high, 2 medium, 2 low |
| TritMesh:QL | `16cc745cba91040a9fa827a116b192b8ce44c947` | `fda8d0f0-f033-4706-a98f-e06f165e8d3e` | 4 medium, 2 low |

The Lyth-Weaver project owns the detailed durable note in
`lyth-weaver/SECURITY-AUDIT-2026-08-09.md` and the S1-S5 remediation queue in
its `TODO.md`. TritMesh:QL remains a design/R&D repository; its findings are
still conversion blockers for any code or contract adopted into the shipping
Galerina/SLIDE path.

## Galerina blockers

1. **G1 - high - serving bypasses complete admission.** `serve()` omits taint
   and governance verification, discards the requested mode, and reaches
   `executeFlow()` through a fail-open runtime effect deny-list. One shared,
   total admission function must gate compile and serve; unknown mode, effect,
   flow metadata or checker state must reach `_=>`.
2. **G2 - medium - malformed numbers mint STANDARD assurance.** The security
   risk CLI allows `parseInt()`/`parseFloat()` to create `NaN`; ordered
   comparisons then choose the least restrictive tier and exit zero. The
   decoder must admit finite canonical values in range or refuse nonzero, and
   internal/output state must contain neither `NaN` nor infinity.
3. **G3 - low - lexical containment is labelled filesystem confinement.** The
   path-sandbox helper does not bind filesystem-object identity across links
   or substitution. Its claim and implementation must be narrowed or replaced
   by retained identity/handle evidence before it protects an authority path.
4. **G4 - low - stale readiness claims.** `KNOWN-ISSUES.md` presents obsolete
   production-grade language despite open composition, custody, durability,
   conversion and release gates. Tester-facing claims must match current
   evidence.

Primary evidence locations are `packages-galerina/galerina-core-compiler/src/runtime.ts`,
`packages-galerina/galerina-core-compiler/src/route-dispatcher.ts`,
`packages-galerina/galerina-devtools-security/src/cli.ts`,
`packages-galerina/galerina-devtools-security/src/risk-calculator.ts`,
`packages-galerina/galerina-devtools-security/src/path-sandbox.ts`, and
`KNOWN-ISSUES.md`.

## SLIDE blockers

1. **S1 - no-null conversion boundary.** Authority-shaped APIs still encode
   refusal and absence with `null`. Graph-augmented source search found at
   least 500 occurrences across 121 source functions; live verification of
   the authenticated typed receipt path returned `{ verdict: -1, value: null }`.
   Replace internal and exported sentinel state with closed tagged variants
   and explicit `_=>` outcomes before translating or claiming a total typed
   boundary. Representative surfaces are
   `src/checked-fungi-package-publication-loader.mjs` and
   `src/v2d-execution-core.mjs`.
2. **S2 - source traversal loses root identity.**
   `canonicalStableDirectory()` reduces an observed directory to a pathname;
   later inventory and manifest reads reopen descendants by name. Retain and
   revalidate filesystem identity across traversal and final reads, including
   substitution tests. Representative surfaces are
   `src/filesystem-identity.mjs` and `src/reference-tool-manifest.mjs`.

## Lyth-Weaver and TritMesh:QL blockers

Lyth-Weaver S1-S5 cover the unintended vulnerable `gemini` dependency,
cross-domain quarantine denial of service, throwing exported admission APIs,
systemic null sentinels and an effectively unbounded `ReuseStore`. The owner
worktree remains preserved; no audit action removed or re-vendored it.

TritMesh:QL must not be adopted or translated until its documented checker is
an import-safe total API, work is bounded before allocation, schema/spine and
destination authority are authenticated, inherited object keys cannot enter
the closed namespace, and non-finite/null AST state is eliminated. Its current
61/61 conformance battery and eight example verdicts do not override these
findings.

## Fresh Galerina verification

| Check | Result | Gate meaning |
|---|---|---|
| Codebase graph re-index | 48,129 nodes / 126,420 edges at exact HEAD | Current structural index only |
| All repository graphs | 6/6 generate children passed | Generated graph surfaces current |
| Normal phase-close | every blocking gate passed in 577.3s | Normal audit cadence green |
| Complete package aggregate | 99/100 packages; 9,436 tests; Hypha failed one provenance self-test | Complete lane not green |
| Exhaustive phase-close | every named audit passed; `tests:all-packages` failed | Exhaustive gate closed/refused |
| Isolated Hypha proof | 42/42 tests on committed Galerina and committed Hypha | Galerina package is green against committed upstream |

The live Hypha failure is deterministic shared-checkout evidence. The sibling
Hypha working tree contains owner changes to `src/extract.js`, so the reachable
working-file digest differs from the recorded vendored-source digest. In
isolated worktrees, the committed upstream digest exactly matches the recorded
digest and all 42 tests pass. Do not overwrite, stage, re-vendor or infer
failure from the owner's in-progress sibling files. The complete live lane
must be rerun after that custody state is resolved.

## Exit conditions

Conversion may begin only after all of the following are freshly demonstrated:

- G1-G4 and SLIDE S1-S2 are closed with focused negative tests.
- Any Lyth-Weaver or TritMesh:QL material selected for conversion has its
  owning findings closed; unselected reference material remains outside the
  conversion set.
- source and emitted-artifact gates find no forbidden `null`, `NaN` or
  infinity in the admitted conversion surface;
- every foreign input and indeterminate state has a named `_=>` exit;
- the complete 100-package lane and exhaustive phase-close pass in one current
  custody state;
- graphs, code indexes, TODOs and this roadmap are regenerated/reconciled; and
- none of the evidence is relabelled as production signing, durability,
  platform or release authority.
