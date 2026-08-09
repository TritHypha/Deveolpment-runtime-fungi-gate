# Pre-conversion security gate - 2026-08-09

## Ruling

TypeScript-to-`.fungi` conversion is **not authorised** at this checkpoint.
Galerina G1-G4 and SLIDE S2 are locally remediated with negative tests, but
SLIDE S1 remains systemically open. A green package or repository cadence does
not override a remaining forbidden-state boundary.

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

## Galerina findings - locally remediated

1. **G1 - high - closed locally.** Compile, `run()` and `serve()` now use one
   total admission function. Production/deterministic governance failure,
   mode disagreement, unknown modes, absent flow metadata and request-time
   execution refuse before authority; focused route/admission evidence is
   **13/13**.
2. **G2 - medium - closed locally.** The risk CLI accepts only canonical,
   bounded finite integers and decimal probabilities. `NaN`, infinity,
   exponent/partial forms and out-of-range values exit nonzero without a risk
   result; security-devtools passes **51/51**.
3. **G3 - low - closed by claim narrowing.** Every path result is explicitly
   `lexical-only`; API and CLI wording state that links, reparse points,
   mounts and rename races are outside its assurance and it cannot authorize a
   filesystem use.
4. **G4 - low - closed locally.** `KNOWN-ISSUES.md` now leads with bounded
   development/test evidence and explicitly open production, custody,
   retirement and bootstrap gates. A focused regression check pins those
   non-authority claims.

Primary evidence locations are `packages-galerina/galerina-core-compiler/src/runtime.ts`,
`packages-galerina/galerina-core-compiler/src/route-dispatcher.ts`,
`packages-galerina/galerina-devtools-security/src/cli.ts`,
`packages-galerina/galerina-devtools-security/src/risk-calculator.ts`,
`packages-galerina/galerina-devtools-security/src/path-sandbox.ts`, and
`KNOWN-ISSUES.md`.

## SLIDE findings

1. **S1 - open, partial remediation only.** The V2-D execution core contains
   no `null` sentinel, and named exported publication-loader refusal variants
   now carry closed tagged absence state. The loader still has **131** `null`
   matches across **22** functions, while the complete source surface remains
   at least **500 matches across 121 functions**. Internal decoders, foreign
   JSON and the complete admitted/emitted surface still need explicit `_=>`
   variants before conversion.
2. **S2 - closed locally.** The reference manifest carries frozen directory
   anchors, traverses through a retained directory stream, reads through one
   retained file handle and revalidates root/source/parent/file identities
   before and after use. A deterministic rename-and-replace test proves that
   the old anchor refuses the substituted path. This is portable reference
   evidence, not production `openat` authority.

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

### Local remediation evidence

| Check | Result | Gate meaning |
|---|---|---|
| Core compiler package | 6,324/6,324 | G1 and compiler regressions green |
| Security devtools package | 51/51 | G2-G3 and existing security checks green |
| SLIDE complete suite | 869/869 across 96 suites | S2 and partial S1 changes preserve the independent reference suite |
| SLIDE reference-tool manifest | 89 files at `25ac6e7f...ed34b48`; checkpoint `a91a943` | Current partial-remediation identity; not yet promoted into Galerina's pinned publications |
| Loader null inventory | 131 matches across 22 functions | S1 remains open; this is refusal evidence, not progress authority |

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
