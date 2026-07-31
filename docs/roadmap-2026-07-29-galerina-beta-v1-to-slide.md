# Galerina beta v1 to SLIDE roadmap

Date: 2026-07-29  
Branch: `codex/galerina-beta-v1-completion`  
Policy: zero trust, verify rather than assume, fail closed

This is the live high-level roadmap. It records measured gates rather than an
invented completion percentage. The detailed execution checklist remains
`docs/TODO.md`; the implementation plan remains
`docs/superpowers/plans/2026-07-30-galerina-slide-full-fungi-retirement.md`.

## Status legend

- 🟩 verified at the named checkpoint
- 🟨 active or awaiting a fresh phase-close rerun
- 🟥 release-blocking defect or missing implementation
- 🟦 planned after its prerequisite
- ⬜ deliberately deferred

## Current-state map

```mermaid
flowchart LR
    A["🟩 Galerina source policy<br/>.fungi authority<br/>if=Bool, check=K3, match=alternatives"]
    B["🟩 Compiler/curriculum close<br/>232/232, zero known drift"]
    C["🟩 Governed .fungi authority<br/>7/7 compiler · 29/29 decisions"]
    D["🟩 Devtools evidence<br/>tests · audits · mutations · generators"]
    E["🟩 Final fixed point<br/>83/83 strict · 84/84 exhaustive"]
    R["🟩 Automatic rotation control<br/>K3 gates · hybrid proof · restart-safe state"]
    Y["🟩 Immutable registry generation<br/>ID · evidence receipt · checkpoint-bound load"]
    X["🟥 Production rotation activation<br/>platform durability adapters · crash matrix"]
    F["🟥 Beta-v1 release gate<br/>terminal fixed-point rerun"]
    G["🟩 Production registry green<br/>auth + one-entry index hybrid-signed"]
    H["🟦 Independent SLIDE<br/>executable backend"]
    Q["🟨 External candidate staging<br/>flat .fungi peers · non-authorizing"]
    I["🟦 Galerina → SLIDE integration<br/>per-package .fungi execution switch"]
    T["🟦 Package retirement<br/>473 tracked source .ts → 0<br/>484 all tracked .ts → 0<br/>95 node_modules → 0"]
    J["⬜ Terminal benchmark<br/>SLIDE vs Wasm/Rust/Python<br/>+ earliest equivalent archive"]
    P["🟩 Flat artifact resolver<br/>exact paths · bytes · limits"]
    M["🟦 VPEG research<br/>verified fixed graph + typed parameters"]
    Z["🟩 Governed-memory/index floor<br/>8 pillars · read-only beta index"]

    A --> B --> C --> D --> E --> G --> R --> Y --> X --> F --> H --> I --> T --> J
    Z --> E
    G --> P
    H --> M
    E --> Q
    Q --> I
    M --> I

    classDef green fill:#166534,color:#ffffff,stroke:#22c55e,stroke-width:2px;
    classDef amber fill:#854d0e,color:#ffffff,stroke:#facc15,stroke-width:2px;
    classDef red fill:#7f1d1d,color:#ffffff,stroke:#f87171,stroke-width:2px;
    classDef blue fill:#1e3a8a,color:#ffffff,stroke:#60a5fa,stroke-width:2px;
    classDef grey fill:#374151,color:#ffffff,stroke:#9ca3af,stroke-width:2px;
    class A,B,C,D,E,G,R,Y,Z green;
    class X,F red;
    class Q amber;
    class H,I,T,M blue;
    class P green;
    class J grey;
```

## Verified progress

| Area | State | Evidence |
|---|---:|---|
| Protected working branch | 🟩 | Local branch exists; commits are local and have not been pushed |
| Flat registry artifact identity | 🟩 | 10/10 exact-byte/path/topology/symlink/resource-limit tests |
| Delegated package-manifest admission | 🟩 | Registry 35/35; app-kernel 149/149; disposable root→operational→manifest chain, future-review and repeated-argument denials |
| Live registry population | 🟩 | False stubs removed; the provenance candidate remains unsigned; the separate hybrid-signed auth manifest is independently verified and is the sole live entry |
| Production registry signing | 🟩 | Exact one-entry index hybrid-signed by operational key `f31…`, independently verified and mutation-tested; SHA-256 `DCF80AA0717DEBF8BEB837584FDC053E24891C0D1224FB4735900E68FC1AAF06` |
| Default production registry consumption | 🟩 | Canonical read-only loader verifies the live root delegation and both operational signature halves before lookup; production revocation comes from one pinned, signed, immutable snapshot; signed index issuance replaces caller-selected wall time; the active epoch and checkpoint-selected generation ID must match. Tower 492/492, app-kernel 165/165, registry 35/35, auth 59/59 |
| Epoch-aware state integrity | 🟩 | Snapshot v2 MAC-binds epoch/key identity; authenticated ring + custody commitment selects active/retired verification keys and refuses unknown/revoked/substituted authority. Sentinel State 20/20; Tower 483/483 |
| Automatic rotation safety/control core | 🟩 | Trigger proposes only; readiness, Triple-Lock, M-of-N, switch, canary, fallback, drain and private-retire phases advance one at a time. Every production phase requires a freshly authenticated checkpoint; a production-admitted complete candidate generation is required; accepted delegation/index/generation identity advances only after canary. Disposable-key evidence passes; Tower 492/492 and app-kernel 165/165 |
| Immutable registry generation | 🟩 | Domain-separated SHA-256 ID, canonical bounded bytes/times, package-relative artifact paths, null install scripts, exclusive same-directory staging/publication, flush/re-open/hash/signature/correspondence verification, distinct verified-vs-host-evidence runtime brands, authenticated checkpoint schema and production loading by exact ID are implemented. Current signed artifacts reproduce generation `f3b432d31f10217006f88c0c39779ba5ae061e0728301b5021979af1cd63dbca`; Tower 492/492 and app-kernel 165/165 |
| Deterministic activation fault model | 🟩 | Seed-ordered fifteen-boundary simulator, canonical replay receipt, control plus planted-fault matrix, budget/unreachable/ambiguous-input refusal and checker-clean `.fungi` terminal fold are implemented. App-kernel 180/180. Simulation is deliberately non-authorizing and cannot replace platform crash evidence |
| Production custody and artifact activation | 🟥 | The least-authority custody contract, disposable executor, generic fail-closed durability seam, fifteen-boundary simulator and closed native-adapter descriptor/host gate exist. A zero-dependency Windows host probe passes 4/4 and measures only fixed local NTFS/ReFS candidate facts; it is non-authorizing and performs no write, publication or barrier. The production digest list remains empty, so even a structurally complete candidate or callback returning `true` cannot authorize. Release remains blocked on content-bound binary loader/provenance proof, retained-handle adapters for Windows 10/11, Linux-family and macOS, and real crash/power-loss evidence. No owner-key operation is required for that engineering evidence |
| Implicit corpus failures | 🟩 | Zero implicit failures; intentional negatives have explicit ownership |
| `.fungi` source-quality gate | 🟩 | Zero findings at the last full checkpoint |
| Read-only production check | 🟩 | `check FILE --strict-governance` enforces production effect, tier and value-state rules without emitting build/signing artefacts |
| Effect authority | 🟩 | Structured registry covers clocks, model operations, governed services/payments, helper propagation, PII/PHI reads and audit evidence |
| Hardware fallback | 🟩 | Non-CPU targets without explicit fallback fail with `FUNGI-TARGET-001` |
| Sensitive-data lessons | 🟩 | PII, PHI, audit-evidence and protected-response examples now emit their exact fail-closed diagnostics |
| Focused compiler tests | 🟩 | Effect checker 70/70; governance verifier 121/121 at this tranche. Static `Native*` enum members remain pure while actual `Native*` invocations still require `native.call` |
| Curriculum drift | 🟩 | 232/232 admitted examples honor their contract; zero known drift and zero new regression; detector self-test 16/16 |
| Full compiler package | 🟩 | Fresh typecheck/build and 5,752/5,752 tests after the native-member regression fix |
| Compiler specification authority | 🟩 | 7/7 canonical stages authoritative; 49/49 auxiliary `.fungi` files clean but non-authorizing; all seven hashes and 60/60 mutation anchors green |
| Governed decision authority | 🟩 | 29/29 authoritative; zero shadow and zero differential candidates remain; TypeScript stays the running differential shadow for the later retirement gate |
| Governed authority hash integrity | 🟩 | 29/29 ledger entries re-derived, signed, #105-admitted and limited to the closed stdlib import ABI; phase-close blocks drift |
| Governed mutation non-vacuity | 🟩 | Full catalog 60/60 killed, zero survivors, zero dirty targets |
| Hostile Myco index boundary | 🟩 | Closed bounded records, root containment, pre-parse byte ceiling, canonical order and traversal/symlink/duplicate/budget negatives; 69/69 plus typecheck |
| TLS/custom channel composition | 🟩 | Certificate admission is mandatory; custom policy is an additional K3 factor and cannot rescue certificate failure; API server 22/22 |
| Remote installer supply-chain gate | 🟩 | Zero download-to-shell findings; planted defect/control self-test; phase-close wired; audit/lint meta-gate 81/81 |
| SLIDE V2 contract provenance | 🟩 | 15 exact live contract/handoff files moved into repository-owned SLIDE with a closed digest-suite manifest; integrity 5/5 and full SLIDE 35/35 |
| External flat `.fungi` candidate lane | 🟨 | Four direct-peer candidates were inspected in place and all now pass the strict frontend. The topology audit is green, but target-gpu/native/wasm dossiers and executable parity remain incomplete; substrate-math is a reference/floor package. Nothing has been copied or admitted |

## Active Galerina work

The 87-row curriculum baseline has been burned down to zero. The final tranche
closed type/governance qualifier drift, root event-gate omissions, protected
egress without explicit authority, unsafe named-model inputs, and raw-secret
model exposure. The `464` package-policy lesson was moved to the ratcheted
`Proposed-*` set because no package-policy grammar or signed root authority
input exists; it is not represented as an implemented lesson.

The compiler-authority chapter is complete. All seven canonical `.fungi`
stages are authoritative specifications while their TypeScript implementations
remain running differential shadows; no `.ts` retirement has started.

The remaining sequence is:

1. Keep the now-green graph/generator/test/strict/exhaustive fixed point
   reproducible while the final registry artifact changes.
2. **Completed:** root-signed serial-1 delegation, operational hybrid auth
   signature, independent manifest verification, live admission, and exact
   one-entry public-only index build.
3. **Completed:** owner hybrid signature, independent public verification,
   exact payload reconciliation and 7/7 returned-artifact mutation refusals.
4. **Completed control core:** epoch-aware state, root-admitted candidate,
   concrete hybrid transition/index proof, trigger-only scheduling,
   readiness/Triple-Lock/canary/drain/fallback/private-retire orchestration,
   authenticated restart after every phase, and exact accepted-artifact
   anti-rollback state. The offline root remains manual.
5. **Completed generic core:** re-sign every admitted package manifest under
   the candidate, build and verify its candidate index, derive the
   domain-separated generation identity, publish/re-open an immutable
   generation behind a required durability barrier, bind authenticated
   accepted state to its exact identity, and load production only by that ID.
   Persistence now requires a module-branded adapter object; the public
   host-evidence factory cannot mint the separate production brand, and a
   copied digest plus structurally similar callback is refused.
   **Still required:** admitted platform durability adapters and crash/fault
   proof through least-authority custody before any real owner-key rotation is
   authorized.
   After beta, rebuild the reusable lifecycle mechanism in independent SLIDE
   `.fungi`; Tower Citizen remains the Galerina policy adapter and trust
   domains/keys remain separate.
6. Resume independent SLIDE implementation only after the Galerina beta-v1
   release gate is authorizing.
7. Switch packages in dependency order from TypeScript execution to verified
   `.fungi`/SLIDE execution. The fresh current ratchets are 459 implementation
   `.ts` files reported by the self-host readiness inventory, 473 tracked
   package-source `.ts` files and 484 total tracked package `.ts` paths in the
   retirement graph, one nested native package and 95 package-local
   `node_modules` trees. The terminal gates require every debt to reach zero
   without hiding or renaming a member.
   External AIs may prepare flat, quarantined candidates in parallel, one
   direct peer package each. They may not create npm-style nested plugin
   trees, edit Galerina, or claim replacement completion.
8. Run the full governed benchmark and both requested charts only after the
   independent SLIDE backend executes equivalent workloads.

The terminal audit pass has executed every discovered audit/lint tool. Enforced
gates are clean, 60/60 security mutants and 3/3 WAT arithmetic mutants are
killed, the root aggregate is 98/98 packages with 8,705 tests, and the unified
test harness is green across all five lanes. Report-only inventories remain
roadmap evidence rather than being relabelled as green gates: 132 unlowered WAT
nodes, 42 stale negative examples, 0 signing refusal codes without a direct
test mention, and 34 cross-package relative imports. The signing inventory is
now closed at 51/51 directly mentioned refusals with specific negative/control
witnesses.

The fresh unified lane totals are unit 8,705, end-to-end 4/4, conformance
10/10, fidelity 9/9, and Galerina SLIDE-adapter corpus 496/496. The audit
meta-gate covers all 81/81 discovered audit/lint gates with non-vacuous
refusal/control evidence. The tooling contract reports 98 packages and 153
governed tools with zero violations; the generated developer-tool index
separately records 135 developer tools, including 80 audit-class tools.

The governed-memory review now defines eight independent pillars: spatial,
temporal, initialization/type, concurrency, authority, confidential custody,
deterministic resource, and provenance/index safety. The beta memory reader is
read-only and non-authorizing; it refuses injection controls, malformed or
unbounded corpora, graph-health faults, and one identity appearing in both hot
and archive indexes. A plaintext persistent sidecar is not part of the build.
The Wasmtime code formerly under `subprojects/dss-host` is now a single flat,
development-only differential oracle package and cannot acquire runtime,
production, or memory authority.

The terminal verification checkpoint is now green: strict phase-close passes
83/83, exhaustive passes 84/84, graph-all passes 5/5, all fourteen generator
contracts pass, and the exhaustive package lane passes 98/98. A separate
canonical-count run rebuilt the same declared package chains and recorded
8,705 tests with zero failures. The strict
cadence first caught stale code-index and coverage outputs; after explicit
dependency-ordered regeneration, their check modes and the complete cadence
passed. These results authorize their evidence surfaces, not the offline
signing ceremony or beta-v1 release.

## Registry admission checkpoint

The registry mechanism no longer trusts a path supplied by a manifest or a
non-empty signature string. A live entry must resolve one direct
`packages-galerina/` child, declare a sorted bounded file set, re-derive its
exact length-framed digest, and verify both hybrid manifest signatures through
an active root-signed operational delegation.

The former auth and healthcare live stubs are gone. Healthcare has no canonical
package and therefore no registry claim. Auth retains a technically reviewed,
owner-approved unsigned 18-file candidate as provenance. The separately
hybrid-signed manifest independently verifies and is now the sole live entry.

This makes package admission and production registry signing green without
making the beta release green. The root-signed delegation, hybrid auth
manifest, public-only build and exact hybrid-signed index independently verify.
Two verified offline custody copies in separate physical locations were
owner-confirmed on 2026-07-30. The first public-only export refused before key
decoding because the wrong file shape was selected. The complete hybrid
environment was then selected and passed the metadata-only structural gate as
canonical UTF-8 with five unique fields and the expected key ID. Independent
public export produced Ed25519 SHA-256
`D27C56FC2E5C7E6BEA5FE7A24BDC318887F1E8FD69FE458DBD4E1FA6B59167D4` and
ML-DSA-65 SHA-256
`1C97131FB9D8DA2A6081CEEC6D5712251573B4DA22EB0509E7915A2035C427D2`;
both match the repository candidates byte-for-byte. The extra online private
working copy has been removed; both custody copies remain offline. The live
repository now admits both public verifier files as non-authorizing material.
The authority CLI validates their exact identities and closed roles, and
signs and independently verifies reviewed package manifests without exposing
private values. Cold root `21415420b447e219` signed the serial-1 delegation
for operational key `f31…`; both hybrid signature halves, serial
floor, active window, exact roles, revocation state and operational public-key
pins independently verify. The operational auth manifest independently
verified at `2026-07-30T16:30:19.180Z` and has SHA-256
`0A1621374BE4CC7E28BF81FEECC19CFC29E2DD5A680417FA7F7E9E145CD60C1C`.
The public-only one-entry index built at `2026-07-30T16:33:10.307Z` has
SHA-256
`15D531566E9FB71F152E34BD9C4C62D4D6FAE15DB0309CBCFA0834BE2E020383`.
The returned signed index is byte-identical at
`packages-galerina/galerina-registry/registry-index-v2.json`. Its SHA-256 is
`DCF80AA0717DEBF8BEB837584FDC053E24891C0D1224FB4735900E68FC1AAF06`;
both signature components verify, its signed payload exactly matches the
public-only rebuild, and 7/7 tampered copies refuse. The live walkthrough now
records completion and authorizes no further signing action.

## Binding package topology

The future Galerina-native package system is not an npm-shaped dependency
forest.

`packages-galerina/` is the single canonical package registry:

```text
packages-galerina/
├── galerina-core/
├── galerina-core-compiler/
├── galerina-core-security/
├── galerina-ext-tritsocket/
└── ...each other package or plugin exactly once
```

The pre-SLIDE ratchet is executable:
`npm.cmd run audit:package-topology`. Fresh evidence records 98 canonical
identities, 95 package-local `node_modules` bootstrap trees, and one exact
deferred nested native package (`galerina-framework-example-app/packages/greeting`).
Any growth fails. The final `--post-slide` profile already refuses all 96 debt
locations and becomes a required green gate after executable SLIDE integration.
The resolver, lock, provenance and migration contract is detailed in
`docs/architecture/flat-package-topology-and-post-slide-migration.md`.

Rules:

- every package or plugin identity is a direct child of `packages-galerina/`;
- a package may contain its own source, tests and assets, but must not contain
  another independently resolvable package;
- dependencies are manifest references to canonical peer identities, not
  copied child dependency trees;
- one admitted identity resolves to one admitted instance and version for a
  build;
- missing, duplicate, cyclic, shadowed, ambiguous or hash-mismatched
  dependencies fail closed;
- package resolution emits a deterministic dependency graph and provenance
  receipt;
- current `node_modules` and TypeScript bootstrap dependencies are not removed
  until executable SLIDE integration supplies their verified replacement.

## SLIDE VPEG and dual-engine research

Status: 🟦 design candidate; not yet an executable SLIDE feature.

The canonical engineering object is a **Verified Parametric Execution Graph
(`VPEG`)**. “Shape shadow” is explanatory language only; it is not a subsystem,
schema, interface, artifact, or diagram label.

The proposed dual-engine system can precompute verified fixed graph structure
at install, first boot, and admitted update:

1. Canonicalize admitted package, plugin, contract, target, driver and policy
   manifests.
2. Build the dependency and lowering graph and topologically order it.
3. Extract Semantic VPEGs and target-specific Target VPEGs, with every changing
   value or state transition represented by an explicitly typed parameter.
4. Hash each VPEG together with all authority-bearing inputs.
5. Let the Neural Shape Engine propose exact, near, composite, or new
   candidates inside a bounded non-authorizing lane.
6. Let the deterministic Shape Fabric independently re-derive semantics,
   validate proofs and admit or refuse each candidate.
7. At runtime, reuse only admitted VPEG structure and compute all dynamic
   parameters, guards, loop conditions and effects.
8. On any missing, stale, ambiguous or mismatched input, invalidate the VPEG
   and rebuild it through the full verifier.

A VPEG identity must bind at least:

- source/component and dependency hashes;
- SLIDE/compiler/optimizer version and deterministic profile;
- ABI, layout, memory model and target triple;
- admitted hardware and driver manifests;
- effects, K3 authority, governance policy and security rules;
- optimization recipe and proof/receipt schema.

The VPEG store is a performance mechanism, never authority. The Neural Shape
Engine may discover or synthesize proposals, but neural confidence cannot
create semantics, bypass proof, grant capabilities, collapse K3, or decide
whether stale output is safe. Final admission remains deterministic,
fail-closed and independently verifiable.

The composition is new, but its foundations are established: persistent
incremental object caching in LLVM ThinLTO, declared-input action hashes and
content-addressable output storage in Bazel, unique content-derived store
identities in Nix, and e-graph/fixpoint techniques for retaining and extracting
equivalent optimized forms.

## Sequenced holds

- The internal benchmark harness and chart generator are integrity-tested, but
  no new Wasm/Rust/Python/Galerina/SLIDE comparison or chart is published until
  SLIDE has an executable backend and the same workloads can be measured.
- Literal package TypeScript and `node_modules` retirement is now an explicit
  terminal goal, sequenced after executable SLIDE integration and performed
  one admitted package edge at a time.
- `.gate` remains late in the sequence to avoid rework.
- Independent SLIDE implementation starts after Galerina beta v1 is fully
  closed; it is no longer a post-session deferral.

## Owner questions

No new owner-only question blocks the current curriculum/compiler chapter.
Existing future questions remain in `../SLIDE/QUESTIONS-FOR-OWNER.md`,
including offline signing roles. No memory-graph write authority is requested:
the plaintext sidecar design has been rejected.
