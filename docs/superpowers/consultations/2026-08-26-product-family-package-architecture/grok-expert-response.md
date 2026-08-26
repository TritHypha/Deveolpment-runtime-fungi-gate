Worked for 47s
Architecture review — Galerina product family (read-only)

Scope. Review of supplied claims around commit c3360c143db4659ae18560322dc6b7a3cf3e122a. Repository objects are NOT VERIFIABLE here. Labels: CONFIRMED (established in §5), PLAUSIBLE (inference), NOT VERIFIABLE (implementation).

Weakest claim. That packages-ts + generic packages plus lower Trametes governance is a sufficient, non-contaminating family without a product-neutral policy seam, namespaced artifact identity, or measured cost split. Control that cannot fail. Unknown product, profile, width, family, or compatibility state refuses; scalar-1 remains the only admitted execution width; no product authorizes itself. Evidence that would reverse the close: a checked graph proving compile/admission already go through a product-neutral seam, cache/GIR/VOK keys already bind {product, profile, width, mode, governance_class}, and a locator plan that does not still point at packages-galerina.

1. Taxonomy

CONFIRMED. Current tree lives under packages-galerina; proposal is packages-ts now and packages later for native Fungi. PLAUSIBLE. Product-named current root will collide when Trametes or a research profile is registered. PLAUSIBLE. Bare packages/ collapses Fungi toolchain, Gate toolchain, shared zero-trust contracts, and product packages into one ownership bucket.

LLVM keeps sibling subproject roots (llvm/, clang/, mlir/), not product-branded roots; product variation is a build/config axis. Maven identity is groupId:artifactId:version plus optional classifier, not a single directory name.⁠Factory +1

Scheme	Ambiguity	Rename pressure
Keep packages-galerina until native	Product baked into family root	High when Trametes/research appear
packages-ts + packages	Native root unowned	Medium–high (Gate vs Fungi vs shared)
packages-fungi + packages-gate only	Shared zero-trust and TS bootstrap homeless	High
Closed grammar below	Family ≠ product ≠ layer	Low if enforced

Closed naming grammar (now).

text
Copy
<family>/<layer>/<capability>
family ∈ {ts, fungi, gate, shared}
layer  ∈ {core, product, toolchain, lab}
capability ∈ kebab-case, no product synonym as family

Publication coordinates (Maven-like): family.layer:capability@version[+product classifier]. Product is never the family root. packages-galerina as a family name is rejected.

Counterexample. packages/gate-synth and packages/gir-emitter share packages/. A later synthesizer import looks first-class because it shares the native root, and reviewers cannot tell Fungi-oracle custody from lab Gate custody.

2. Extensibility — smallest registry

CONFIRMED. No admitted Galerina-versus-Trametes selector exists; strict / high_integrity / deterministic are safety-resource profiles, not products. PLAUSIBLE. Pair-wise if galerina else trametes will break on a third product.

Manifest (single closed file, not a marketplace).

Field	Rule
schema_version	Semver; unknown field or older reader → refuse
product_id	^[a-z][a-z0-9-]{1,31}$, closed set at this schema
family	ts | fungi | gate | shared
governance_class	zero-trust | admitted-closed-network | research-nonprod
admitted_profiles	subset of safety profiles; empty → refuse run
admitted_widths	physical trit widths; today {1} only
admitted_build_modes	e.g. build-production, build-wasm-hybrid
artifact_namespace	mandatory prefix for cache, GIR, SLIDE, VOK
compatibility_state	admitted | lab | retired
authorizing_owner	identity outside the product; product must not fill this

Identity binding: {product_id, schema_version, artifact_namespace} is the only legal selector. Unknown product_id / profile / width / mode / family / state → fail closed. No default product. Adding quantum-research is an append of a research-nonprod + lab row, not a repository-wide rename.

Counterexample. Hard-coded product ∈ {galerina, trametes} plus default-Galerina: a mistyped --product=galerina-research silently compiles as Galerina and mints a zero-trust receipt.

3. Authority isolation

CONFIRMED. compileFile and runtime admission call governance directly, not through a product-neutral policy seam. Authoritative route is checked Fungi snapshot → detached canonical GIR → SLIDE → independent re-admission → VOK lease + terminal receipt. PLAUSIBLE. Shared content-hash caches will alias weaker work as Galerina-grade.

Strongest path. Trametes (or lab) emits byte-identical GIR under a content-only key; Galerina hits that cache; independent re-admission sees a familiar hash and issues a Galerina-class VOK/receipt. Sibling path: same Node process loads both products and a Trametes package patches the governance verifier in memory.

SELinux type enforcement is default-deny: no type may access another without an explicit allow. Android vendor types are prefixed and cannot reference platform-private types. Bazel refuses illegal deps at analysis, not at “best effort” link. SUSE documented rollback breakage when policy store and snapshot trees diverge.⁠Docs.redhat +3

Smallest hostile fixture. Cache object gir/<sha256(gir-bytes)> with no {product_id, governance_class, profile, width, mode, namespace} in the key, plus a Trametes package on Galerina’s compile classpath.

Required refusal. Cross-namespace cache hit is a hard error. Receipts bind product_id + governance_class. Trametes packages are not visible to Galerina governance or VOK issuance (Bazel-style private/package groups). Shared process spaces are forbidden across governance classes. No package may write another product’s artifact_namespace.

4. CLI and build identity

CONFIRMED. Modes include build-production and build-wasm-hybrid; no product selector. PLAUSIBLE. Inferring product from profile or mode causes accidental downgrade.

Mechanism	Ambiguity	Repro	Accidental downgrade	Signed identity
Separate verbs (galerina / trametes)	Low if binaries distinct	High	Low	Strong if each binary signed
Explicit closed --product=	Low if required	High	Low	Strong if baked into artifact ID
Separate binaries only	Medium (shared libs)	High	Low	Strongest for launch
Build-time manifest only	High (which file was present?)	Weak	High	Weak

Recommendation. Required --product= from the closed registry and product-specific signed entrypoints. Product, profile, mode, width stay four flags. Cargo package-id specs show why identity must be fully qualified when graphs can alias.⁠Doc.rust-lang

Governance-off challenge. A --governance=off flag collapses product and safety profile into one switch, lets Galerina-named artifacts skip zero-trust work, and is a self-authorizing downgrade. Refuse the flag. Trametes is a registered admitted-closed-network product, not Galerina with checks removed.

Counterexample. build --profile=deterministic with no product: CI uses last env default trametes, publishes artifacts still labeled Galerina.

5. Migration

CONFIRMED. Pre-Fungi plan still points at packages-galerina; readiness chapter is docs-only and authorizes no move. PLAUSIBLE. Mass import rewrite is the highest-regret step.

Safest route (no edits authorized here).

Keep packages-galerina as the only physical TS root until the registry, policy seam, and namespaced cache keys exist.
Introduce logical packages-ts via workspace path mapping / compatibility aliases only (Cargo-style workspace membership, no rewrite).⁠Doc.rust-lang
Dual-publish names: @galerina/* stay; @ts/* aliases re-export. Generated indexes only, no new semantics.
First scalar Fungi oracle may be planned against packages-fungi/ locators after the plan file is amended; no Fungi file until aliases + seam + cache keys are specified as gates.
Physical git mv packages-galerina → packages-ts only after import-graph zero-references to the old path in the authoritative branch (docs branch does not count).
Retire physical packages-galerina after one published alias release and a rollback drill. Keep a stub package that fails closed if imported from a Galerina production profile.

Counterexample. Move first, leave plan locators on packages-galerina: the first Fungi file is created from a stale authorizing path and cannot be rolled back without splitting history.

6. Fungi and Gate custody

CONFIRMED. Fungi-to-Gate synthesis is a later non-authorizing lab lane and must not replace GIR, SLIDE, or VOK. PLAUSIBLE. Sharing a native root will make the synthesizer look authoritative.

TS Gate compiler scaffolding may live under packages-ts/lab/gate-* with compatibility_state=lab.
Native Gate definitions do not belong under generic packages/ beside Fungi oracles. Use packages-gate/ or an artifact registry (detached objects, not source that compileFile can see).
Native Fungi oracles: packages-fungi/ only, after locator amendment.
Synthesizer outputs: different artifact_namespace, cannot mint VOK or terminal receipts, cannot be selected as admitted.

Counterexample. packages/gate-synth writes gir/<hash> that SLIDE accepts because the path sits next to packages/fungi-oracle; receipts look like the authoritative route.

7. Performance

CONFIRMED. Passive benchmark runs governance once outside the timed loop; Trametes speed is not established. NOT VERIFIABLE. Any current hot-path costs.

Matrix (product × profile × width × mode × input class × cache state).

Measure	Include	Exclude
Governance cost	verifier + policy seam + re-admission	emit/SLIDE/execute
Product-profile dispatch	registry lookup + namespace bind	governance body
Compilation	GIR emit + SLIDE derive	first-time governance if cached and key-correct
Steady-state exec	VOK-leased run only	compile

Protocol: same detached GIR bytes; governance in-loop and out-of-loop as paired cells; no silent width substitution (64 remains a negative control; 32/256 not in the current exec path).

Refute separate Trametes product if: governance+dispatch delta < noise; compile+exec dominate; extra Trametes admission erases savings; or only out-of-loop governance was timed.

Counterexample. Publish “Trametes 40% faster” from the existing out-of-loop bench; production Galerina still pays per-file governance and the product split has no measured value.

8. Assurance

Before any rename

Closed product-profile registry with fail-closed unknowns.
Policy seam: compileFile / admission must not call Galerina governance directly.
Artifact keys = {namespace, product, governance_class, profile, width, mode, content}.
Package-boundary graph: no edge from trametes or lab into Galerina VOK/receipt issuance (Bazel visibility analogue).
Negative controls: unknown product; quantum-research; width 64; missing --product; packages/gate-synth as if admitted.
Scalar-1-only execution gate unchanged.
Alias rollback drill.

Before any Fungi file

Pre-Fungi plan locators amended off packages-galerina.
Gate lane marked non-authoritative in the registry.
Width 32/256 still non-executing except 32 as admission-time fallback (no runtime rescue).

Quantum-research is a hostile neighbour: research-nonprod + lab + distinct namespace; never admitted; never a production profile synonym.

Counterexample. Rename lands while compileFile still calls governance directly: Trametes and Galerina share one authorizing function, so isolation is nominal.

Recommended tree
text
Copy
product-registry.json
packages-ts/
  shared/                 # trit semantics, GIR types; no product auth
  core/                   # emitter + policy seam
  products/galerina/
  products/trametes/
  lab/                    # non-admitted TS experiments only
packages-fungi/           # empty until Fungi gates pass
packages-gate/            # empty lab definitions / not on compile path
artifacts/                # detached GIR, SLIDE, receipts

Rejected alternative. packages-galerina + generic packages/. Reasons: product in the family name; native dump mixes Fungi, Gate, and shared; forces another rename for research products; cache/ownership ambiguity.

Phased migration table
Phase	Physical tree	Allowed	Stop condition
P0	packages-galerina	Docs + registry design	Seam + keys specified
P1	same + logical packages-ts aliases	No Fungi files	Graph check + negative controls green
P2	dual-publish names	Scalar Galerina slice only	Plan locators amended
P3	git mv to packages-ts	First Fungi locator only	Zero old-path imports on product tip
P4	stub old root	Native Fungi under packages-fungi	Rollback drill passed
Later	packages-gate lab	Synthesizer never admitted	Registry row is lab
Fix before Fungi vs defer

Fix before Fungi (and before rename): registry fields; policy seam; namespaced artifact identity; four-axis CLI; locator amendment; boundary graph; scalar-1 + unknown-product negatives; no governance-off.

Defer: physical directory move; native Gate bodies; width 64/256 exec; Trametes performance claims; quantum-research implementation; publication marketplace.

Non-authorizing recommendation: REVISE_BEFORE_PLANNING

The four axes, fail-closed unknown state, and “Gate is not the backend” rules are sound, but the proposed roots, missing product selector, direct governance calls, and unspecified cache identity do not yet preserve zero-trust isolation. This review authorizes no package move, merge, or Fungi file.

30 sources
