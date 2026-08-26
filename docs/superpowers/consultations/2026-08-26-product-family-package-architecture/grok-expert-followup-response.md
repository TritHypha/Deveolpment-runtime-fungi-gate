Worked for 45s
Follow-up review (deltas only)

Prior claims challenged. (1) Isolation requires extra top-level packages-fungi / packages-gate roots. (2) Retaining packages-galerina is safe if foundations precede any move. (3) Registry + seam + bound identity alone are a sufficient pre-Fungi stop.

CONFIRMED. Candidate is documentation-only; no package move, selector, cache-key change, or new production .fungi slice has occurred. Galerina is the only admitted product. Four axes remain independent by plan. Authoritative route unchanged; Gate remains lab.

Weakest claim. Typed children under a single packages root, plus a closed registry that does not yet exist in runtime, prevent presence-as-admission and workspace-glob leakage. Control that must stay red-capable. Missing product_id, unknown product, or non-admitted compatibility state refuses compile, cache reuse, VOK, and receipt; directory presence never admits.

Evidence that would reverse the close: committed registry and analysis-time dependency/visibility checks and cache/receipt fields binding {product, profile, mode, width, namespace} and a red test that a packages/** glob cannot place gate or trametes on the Galerina path.

Q1. Typed roots and product boundaries

H1 — workspace glob / generated index leak. PLAUSIBLE.

Invariant: Unadmitted products and lab Gate cannot enter Galerina policy, cache, GIR, SLIDE, VOK, or receipts. Directory presence ≠ admission.
Smallest case: Workspace or generated index is packages/** (or packages/{fungi,gate,products}/**). Empty or docs-only packages/products/trametes or packages/gate is copied onto the Galerina compile classpath or into a content-hash cache. Galerina policy or a Galerina-shaped artifact is reused under Trametes/research later, or the reverse.
Fail-closed: Analysis-time visibility refuse (no edge from gate or non-galerina product into Galerina admission). Cache lookup with mismatched artifact_namespace / product_id is a hard error, not a hit.
Local evidence: Workspace globs, generated indexes, tsconfig/project references, and any packages/ include list on tree 98ef87a5…; proof they cannot enumerate unadmitted children.

Extra top-level roots are not required for isolation if those checks exist. They are organizational. PLAUSIBLE that packages/{fungi,gate,products/<id>} is enough after registry, dependency direction, and product-bound artifact identity are executable—not while they remain plan text.

H2 — dual physical TS root during retain-packages-galerina. PLAUSIBLE.

Invariant: One authorizing TypeScript family root until the mechanical move; locators and cache identity must not diverge.
Smallest case: Plan examples and a future alias publish both packages-galerina/... and packages-ts/... (or early packages/products/galerina) while cache keys are still content-only. Build is green from the old root; artifacts are recorded under the new tuple.
Fail-closed: Dual-root import or mixed locator set refuses in Galerina admitted state. Aliases are re-exports only after bound cache keys exist.
Local evidence: Every path string in the candidate plan/docs; whether packages-galerina is still the sole physical TS root; whether any new packages/ tree is already referenced as authoritative.

Staged prerequisites do not close H2 if empty native children or aliases appear before bound identity. Retaining packages-galerina is safe only while it remains the only resolvable TS root.

What would change this. Executable visibility + namespaced keys on the product tip; a red glob test; plan locators that never treat packages/ presence as the Galerina root before the move.

Q2. Ordering and irreversible migration

Stated order is mostly right. CONFIRMED foundations before git mv. PLAUSIBLE two ordering defects.

H1 — CLI identity is too late relative to artifact minting. PLAUSIBLE.

Invariant: No artifact, cache entry, or receipt without explicit product identity.
Must move earlier: Explicit command-line / build identity must be specified as a refusal rule in the same gate as product-bound cache identity—not a later convenience. Otherwise benches and docs commands mint objects with ambient Galerina-from-path.
Over-gated: A separate “native-root readiness” phase that creates empty packages/fungi and packages/gate has no measured value and feeds Q1 presence. Readiness should be locator text + refuse-if-present-and-unadmitted, not tree creation.
Smallest partial migration / false-green: Registry JSON and policy-seam docs land; compileFile still calls governance directly (CONFIRMED prior fact, NOT_VERIFIABLE that the candidate changed it). CI checks that the chapter exists. Path move later reuses old content-hash cache → stale identity, green build.
Fail-closed: Verification that calls the seam with unknown/missing product must fail on the product tip, not on the docs branch alone.
Local evidence: Whether candidate tests invoke compile/admission at all; cache key schema in the plan versus any still-content-only key.

H2 — fast-forward before remote freshness. PLAUSIBLE.

Invariant: Fail closed on unknown freshness.
Counterexample: Local custody reports a non-authorizing FF while remote has diverged; FF integrates docs that authorize locators the tip no longer matches.
Fail-closed: Integration refused until remote-freshness evidence exists.
Local evidence: Remote SHA vs 1d2827cd… parent; custody record of freshness check.

What would change this. Candidate (or next docs rev) makes missing --product unrepresentable, forbids empty native-tree creation before the hard pause, and records remote freshness.

Q3. Authority and profile separation

H1 — shared core implies Galerina-class authority. PLAUSIBLE.

Invariant: Trametes cannot inherit Galerina governance, receipts, or cache namespace through shared code.
Exact coupling config: product omitted; profile=high_integrity; mode=build-production; width=1; entry via packages-galerina (or shared core governance). Historical “production + high_integrity + width 1” is treated as Galerina. A later Trametes package imports the same verifier and receives a receipt that lacks a distinct product_id / governance_class.
Width/mode implicit product: build-wasm-hybrid or width=256 exists only under a Galerina-shaped tree; the mode or width selects the product without --product.
Fail-closed / closing field: Receipt and cache key require product_id and governance_class. Omitted product refuses. Shared libraries may supply trit/GIR types only; they must not issue VOK or terminal receipts.
Local evidence: Receipt schema in the plan; whether any command is legal without --product; import graph of governance versus shared types (NOT_VERIFIABLE in tree).

H2 — hierarchy makes future widths look executable. PLAUSIBLE.

Invariant: Only width 1 executes; 64/256/32/research widths are not executable by presence.
Counterexample: packages/fungi/products/galerina/width-256/ exists for measurement notes; a launcher enumerates children and treats 256 as an admitted target.
Fail-closed: admitted_widths is registry-only, currently {1}. Unknown or non-admitted width refuses. Width 32 remains admission-time compatibility, not runtime rescue.
Local evidence: Launcher admitted-width set; any directory walk used for target discovery.

What would change this. A single fixture showing omitted product, trametes, width=64, and packages/gate each fail on the same seam with no default.

Q4. Pre-Fungi stop boundary

Registry + neutral seam + product-bound identities are necessary and not sufficient. PLAUSIBLE.

The TypeScript physical move is not required before the first new production conversion if packages-galerina remains the only resolvable TS root and native locators are not created early. Explicit command-line product identity is required first. Conversion without a required product binds the slice to path folklore (packages-galerina ≈ Galerina).

Most discriminating test. One command matrix, all must stay red except the single admitted cell:

product	path tuple	expected
omitted	packages/fungi/products/galerina	refuse
galerina	packages-galerina/... as native Fungi root	refuse (wrong root)
galerina	packages/gate/...	refuse
trametes	packages/fungi/products/trametes	refuse (unadmitted)
galerina	packages/fungi/products/galerina + width 1	still refuse until this chapter is independently authorized

Beyond this design text, adjudication needs: product-tip (not docs-only) seam tests; cache/receipt field list; workspace non-glob evidence; remote freshness; no .fungi file created by this candidate.

What would change this. Those tests exist on the active Galerina tip and the plan’s hard pause names this matrix as the stop gate.

Current defects vs later gaps. Defects now: dual-root/locator hazard, presence/glob leak, missing-product still representable, freshness unknown, seam/keys NOT_VERIFIABLE. Later: mechanical packages-ts move, native tree population, Trametes admission, widths ≠ 1.

Non-authorizing recommendation: REVISE_BEFORE_INDEPENDENT_REVIEW
