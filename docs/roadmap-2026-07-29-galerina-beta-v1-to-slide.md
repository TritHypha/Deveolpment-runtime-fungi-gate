# Galerina beta v1 to SLIDE roadmap

Date: 2026-08-02
Branch: `codex/galerina-beta-v1-completion`
Last verified fixed point: strict **84/84**, exhaustive **85/85**, unified
package lane **98/98** with **8,814** tests, graph **5/5**

Policy: zero trust, verify rather than assume, fail closed

Roadmap refresh: the full publication-fidelity benchmark has now run at
Galerina `54c15058...` after rebuilding the core chain and native lanes. The
unfiltered process completed 29 workloads, all 17 comparable workloads passed
unit alignment, the checksum/truth audit passed and the regression guard found
no attributable regression. The normal chart compares the latest distinct
snapshot; a second chart is pinned to the earliest retained archive and
accounts for all 29 current rows (23 shared, 1 added and 5
present-but-unmeasured). The detached SLIDE VADE child remains audit-clean but
non-comparative and non-authorizing. This closes the current Galerina benchmark
chapter; it does not close the deferred terminal SLIDE/Wasm/Rust/Python
comparison.

Roadmap refresh: the native `.fungi` VOK authority chapter now includes the
source type/use-state boundary and an unlinked unsafe-free table inside the
existing `galerina-core-runtime` package. The `.fungi` and native nine-gate
folds agree for all 19,683 vectors. Native evidence is 21 hostile/unit tests,
12 compile-fail contracts and core-runtime 49/49; exact handle fields,
generation, context, bounded nonce history, revocation and value-only receipts
fail closed. Three 99-sample Windows benchmark runs measure the full affine
cycle at 5.89-6.77x the simpler checked-tree median and 11.91-12.30x the owned-
value median; host power-state sensitivity prevents an absolute speed claim.
OS CSPRNG, opaque VM transfer, hostile-memory isolation, physical erasure, W^X
execution and independent platforms remain open. The lane therefore stays
amber and releases no production authority or component removal.

Roadmap refresh: bounded Shape Lab E03, E04 and E05 are now green as completed
experiments, not green as production features. A reproducibility defect was
found and fixed: the official E04/E05 launchers could overwrite 99-sample
evidence with their old seven-sample defaults. Code-pinned publication
profiles and regression tests now require 99 samples. Fresh clean-source E03
has 4,200 exact checks; E04 has 29,700 exact score and 59,400 exact artifact
checks; E05 has 99 paired samples, 34,650 artifact and 29,700 component checks.
E03 and every E04 proposal remain slower than B0. E05 B1 remains
statistically indeterminate against BA, so no VPEG-specific speed or
production claim is made. Authentication, native `.fungi`, independent
verification and cross-platform repetition remain separate later gates.
Fresh closure is SLIDE 336/336 across 19 suites, the 16-file contract, 20
schemas, 8 result JSON files, 7 SVGs and four unauthenticated K3 `0` evidence
verifiers.

Roadmap refresh: SLIDE root `SECURITY.md` policy version 1.1 is now binding
repository-wide. It adds the owner-confirmed private reporting route,
authority/complete-admission definitions, K3 fail-close requirements,
hostile-memory and injection boundaries, live-control/mutation assurance,
evidence withdrawal and narrow exclusions that cannot hide semantic forgery.
Two executable policy-contract tests pass. Remote CI enforcement and every
named production limitation remain open; policy text grants no runtime or
release authority.

Roadmap refresh: the production rotation wrapper now consumes a module-owned,
one-use forward-probe receipt bound to the exact reopened generation; callers
cannot supply a truth Boolean. Copies, proxies, wrong-generation receipts and
reuse refuse, the paired `.fungi` K3 fold is strict-clean, and app-kernel is
204/204. A closed linked-host build recipe pins Node 24.18.0, its pristine
preimages, the Galerina patch/binding, Cargo lock, Rust target/profile/compiler,
NASM 3.02 and build switches; focused build/source/toolchain evidence is 9/9.
Portable NASM is present. The owner-installed Visual Studio 18.8 Clang 22
toolchain passes the non-authorizing preflight. The exact source now produces
one linked release executable after a preimage-bound HdrHistogram type patch
and explicit `ntdll.lib`/`userenv.lib` linkage. Stock Node lacks the accessor;
the custom host passes 2/2 exact-binary, immutable-accessor, hostile-decoy,
publication and one-use receipt checks. Its measured digest is evidence, not
a production trust anchor; app-kernel integration and signed-host admission
remain open. A real Windows 10 functional receipt passed 6/6 at clean commit
`f1e0871d...`, but later documentation commits make it a checkpoint rather than
the final release receipt. Beta admission therefore correctly remains K3 `0` /
`INCOMPLETE_EXTERNAL_EVIDENCE`. The post-regeneration fixed point is strict
84/84, exhaustive 85/85, graph 5/5, generator contracts 14/14, tooling 278,
and security 31 files with zero findings or errors.

Roadmap refresh: the owner selected Option 2, the small SLIDE Verified Object
Kernel (`VOK`). KB RD-0657, SLIDE contract V2-H and a zero-dependency reference
now separate evidence, proposals, admitted objects, affine leases and receipts.
The hostile VOK corpus is 9/9; complete SLIDE is 332/332 and contract integrity
is 5/5 over 16 files. This is non-authorizing bootstrap evidence, not native
`.fungi` VOK, production VEO execution or component-removal permission.

Roadmap refresh: RD-0656 now selects the final `.fungi` Verified Execution
Object loader contract after primary-source comparison. The runtime will own
and execute the admitted bytes directly; Node remains a beta bridge rather
than the architecture copied into SLIDE. RD-0655 records the implemented DCTP reference and its
first twelve-lane measurement. Canonical tile plans, two-buffer ownership,
cleanup, stable stage refusal and independent D1 are executable. The first
performance point is negative: 302,025 amortized ns/op for DCTP no-prefetch
versus 38,458 for complete-input BA. Node does not concurrently overlap staging
and execution, and no physical cache/counter/thermal evidence exists. Retain
the mechanism for native research; do not integrate it as a Galerina fast path.

Roadmap refresh: independent SLIDE V2-G now performs Verified Ahead-of-Demand
Execution for one bounded V2-D profile. The nine-lane component benchmark is
implemented, independently re-verified and admitted by a separate governed
Galerina adapter; it is not the terminal cross-runtime comparison. Fresh
closure evidence is 304/304 full SLIDE across 19 suites, 15
contract files, 496/496 across exactly 28 tracked Galerina adapter files and
304/304 from Galerina's independent 42-file SLIDE invocation. Galerina now also
has a terminally verified, syntax-neutral Structured Await reducer for bounded
plans; this does not yet supply the isolated host executor or stream scheduler.
RD-0652 also closes the latest transcript intake: it keeps E11's negative
measurement, withdraws generic L2-cycle figures from named-host calculations
and makes complete-path deterministic tiling the next NSE-Micro/VPEG research
direction. No cache-residency or production authority follows.

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
flowchart TB
    AR["SLIDE Verified Object Kernel<br/>RD-0657 · 9/9 hostile · reference-only"]
    AT["🟨 Native VOK authority floor<br/>K3 parity 19,683/19,683 · unlinked · W^X open"]
    AI["🟩 RD-0634-0642 adjudication<br/>B1 null · N3 cost · E11 measured"]
    A["🟩 Galerina source policy<br/>.fungi authority<br/>if=Bool, check=K3, match=alternatives"]
    B["🟩 Compiler/curriculum close<br/>232/232, zero known drift"]
    C["🟩 Governed .fungi authority<br/>7/7 compiler · 29/29 decisions"]
    D["🟩 Devtools evidence<br/>tests · audits · mutations · generators"]
    E["🟩 Final fixed point<br/>84/84 strict · 85/85 exhaustive"]
    R["🟩 Automatic rotation control<br/>K3 gates · hybrid proof · restart-safe state"]
    Y["🟩 Immutable registry generation<br/>ID · evidence receipt · checkpoint-bound load"]
    SI["🟩 Static-link profile proof<br/>release binary · independent re-hash · decoy invariant"]
    LI["🟨 Linux adapter round two<br/>implementation complete · current Ubuntu run pending"]
    NP["🟩 Native durability profiles<br/>Windows 10/11 · Linux · macOS APFS"]
    RP["🟩 Recovery experiment protocol<br/>debug-only · 6/6 · no power API"]
    O["🟩 Bounded SLIDE platform observer<br/>17/17 focused · 336/336 complete · UNVERIFIED"]
    X["🟨 Production rotation activation<br/>linked candidate built · app-kernel admission pending"]
    F["🟨 Beta-v1 release admission<br/>verifier complete · external receipts pending"]
    G["🟩 Production registry green<br/>auth + one-entry index hybrid-signed"]
    H["🟦 Independent SLIDE<br/>general executable backend"]
    S["🟩 Bounded SLIDE prepared executor<br/>immutable plan · fresh per-call state"]
    SC["🟩 V2-D logical flow cleanup<br/>finally-close · 15 bindings · 12 semantic bytes"]
    ST["🟩 V2-D schedule translation proof<br/>changed order · exact permutation · no fallback"]
    WF["🟩 V2-F direct Wasm compatibility<br/>GIR→binary · zero imports · branded execution"]
    CB["🟩 V2-G VADE component benchmark<br/>nine lanes · refusal cost · exact outputs"]
    GV["🟩 Galerina VADE admission<br/>exact bytes · independent maths · non-comparative"]
    SA["🟩 Structured Await reducer<br/>bounded plan · cancel acknowledgement · 44/44"]
    L["🟩 Bounded clean/prepared benchmark<br/>exact checksum · 21.03x on measured host"]
    Q["🟨 External candidate staging<br/>flat .fungi peers · non-authorizing"]
    K["🟩 Benchmark publication guard<br/>subject + catalog fail-close"]
    FB["🟩 Full Galerina benchmark<br/>29 workloads · 17/17 aligned<br/>truth audit clean · two charts"]
    I["🟦 Galerina → SLIDE integration<br/>per-package .fungi execution switch"]
    TG["🟨 Terminal retirement authority gate<br/>16/16 adversarial · exact red debt"]
    T["🟦 Package retirement<br/>491 tracked package .ts → 0<br/>95 node_modules → 0"]
    J["⬜ Terminal benchmark<br/>SLIDE vs Wasm/Rust/Python<br/>+ earliest equivalent archive"]
    P["🟩 Flat artifact resolver<br/>exact paths · bytes · limits"]
    M["🟩 Shape Lab E00<br/>F01-F20 · S0-S8 · VPEG/N1 quarantine"]
    U["🟩 Shape Lab E01<br/>bounded durable atlas · 22/22 · measured"]
    V["🟩 Shape Lab E02<br/>bounded structural retrieval · 136/136 · measured"]
    W["🟩 Shape Lab E03 complete<br/>typed boundary · value-free plan · negative speed"]
    AA["🟩 Shape Lab E04 complete<br/>99 samples · density pass · speed fail"]
    AB["🟩 Shape Lab E05 complete<br/>99 paired · B1 vs BA indeterminate"]
    AC["🟨 Claude-08 + SEC-06 closure<br/>336/336 · self-hash K3=0"]
    SP["🟩 SLIDE security policy v1.1<br/>repository-wide · 2/2 contract tests"]
    AD["🟩 RD-0623/0624 deep audit<br/>B1 maths · Tri-1 split · patent screen"]
    AG["🟩 RD-0625-0631 baseline matrix<br/>7 lanes · maths · Tri-1 · ZT"]
    AH["🟨 NSE-Micro E11 measured<br/>3,780 checks · no speed/residency win"]
    DCTP["🟩 DCTP reference measured<br/>1,188 outputs · 108 refusals<br/>correctness pass · performance point negative"]
    AE["🟦 SLIDE evidence + anchor activation<br/>offline authority · platform adapters"]
    AF["🟦 Patent counsel FTO gate<br/>before public production release"]
    Z["🟩 Governed-memory/index floor<br/>8 pillars · read-only beta index"]

    A --> B --> C --> D --> E --> G --> R --> Y --> SI --> NP --> LI --> RP --> X --> F --> H --> I --> TG --> T --> J
    Z --> E --> SA
    G --> P
    L --> M --> U --> V --> W --> AA --> AB --> AC --> SP --> AD --> AG
    AB --> AH
    AG --> AI --> AH --> DCTP
    AI --> DCTP --> AE --> I
    AI --> AF --> I
    E --> K --> FB --> Q
    FB --> J
    E --> S --> SC --> ST --> WF --> CB --> GV --> H
    ST --> H
    S --> L --> H
    E --> O --> H
    Q --> I
    M --> I
    AI --> AR --> AT --> H

    classDef green fill:#166534,color:#ffffff,stroke:#22c55e,stroke-width:2px;
    classDef amber fill:#854d0e,color:#ffffff,stroke:#facc15,stroke-width:2px;
    classDef red fill:#7f1d1d,color:#ffffff,stroke:#f87171,stroke-width:2px;
    classDef blue fill:#1e3a8a,color:#ffffff,stroke:#60a5fa,stroke-width:2px;
    classDef grey fill:#374151,color:#ffffff,stroke:#9ca3af,stroke-width:2px;
    class A,B,C,D,E,G,R,Y,Z,K,FB,S,SC,ST,WF,CB,GV,L,M,U,V,W,AA,AB,SP,AD,AG,AI,SI,O,SA,NP,RP green;
    class X red;
    class Q,AC,AH,TG,LI,F,AT amber;
    class H,I,T,AE,AF blue;
    class P green;
    class J grey;
    class AR green;
```

The diagram is dependency-ordered, not a claim that all research waits for the
release path. Galerina's repository-local functional fixed point is green. The
beta release verifier is implemented and therefore yellow while its seven exact
current-commit platform receipts and authenticated durability composition are
absent. Native Windows/Linux/macOS candidates and the safe recovery protocol
are implemented, but an unexecuted host is never coloured green as evidence.
Production rotation is now amber: the statically linked in-process candidate
exists and passes its local exact-binary and hostile-decoy boundary tests. The
rejected pathname-loaded addon/caller-callback paths are not restored. It
cannot become green until app-kernel integration, signed-host admission and
the complete external durability/platform evidence are present.

## Verified progress

| Area | State | Evidence |
|---|---:|---|
| SLIDE architecture reduction R&D | adopted with bounded evidence | RD-0643 through RD-0650 define the DFE/Shape-Fabric/VPEG split. Owner-adopted RD-0657 selects the small VOK rather than shared helpers or a monolithic Fabric runtime. The VOK reference passes 9/9 hostile tests and remains non-authorizing; native `.fungi` authority and every deletion gate stay open |
| SLIDE repository security policy | 🟩 binding policy | Root `SECURITY.md` version 1.1 resolves repository-wide and defines private disclosure, authority/complete admission, K3 fail-close, hostile-memory/injection boundaries, proposal non-authority, live-control and mutation assurance, evidence withdrawal, narrow non-findings and explicit engineering-standards alignment. Its two contract tests pass. Remote CI, authenticated evidence and production implementation remain separate gates |
| SLIDE Verified Object Kernel | 🟩 bounded reference | Contract V2-H and `src/verified-object-kernel.mjs` implement closed typed canonical evidence, proposal non-authority, exact eight-gate K3 admission, process-local reference handles, one-use leases and terminal receipts. Complete SLIDE is 336/336 and contract integrity covers 16 files. All results state `authorityReleased: false`; no VEO execution, production authority or component removal follows |
| Native `.fungi` VOK authority boundary | 🟨 source and unlinked native floor implemented | `Authority<Tag>` retains bounded exact source use state. The unsafe-free native table passes 21 hostile/unit tests, 12 compile-fail contracts, exact 19,683-vector native/`.fungi` parity and dependency/supply-chain scans. A three-run 99-sample Windows benchmark records the complete affine cycle without a speed claim. OS CSPRNG, opaque VM transfer, hostile-memory isolation, physical erasure, W^X execution and independent platform evidence remain open, so this is amber and non-authorizing |
| SLIDE reference-platform contract | active | Exact non-authorizing profiles plus a bounded Node-bootstrap observer/report CLI cover Windows x86-64, Ubuntu/Debian/Fedora/Mint x86-64/Arm64 and macOS x86-64/Arm64. It reads no environment, shell, network, package manager, driver or cached fallback; hostile missing/surplus/accessor/Proxy inputs refuse. Current Windows 10 evidence passes 17/17 focused and complete SLIDE is 336/336, but remains unauthenticated and `UNVERIFIED`; native and all other platform runs remain open |
| V2-D logical flow cleanup | 🟩 bounded reference | Private per-invocation region closes in `finally`; success and registered failure clear 15 logical bindings and 12 admitted semantic bytes. Pre-admission refusal is `NOT_OPENED`; hostile nested accessors/proxies are not invoked. This is not physical/native erasure or production authority |
| V2-D topological schedule validation | 🟩 bounded proof | A changed 15-instruction order is admitted only after exact permutation and SSA/guard dominance proof, then matches every current runtime/lifecycle row. Copied, forged and hostile schedules refuse without source-order fallback. General rewrites, effects, native and artifact proof remain open |
| V2-F direct Wasm compatibility adapter | 🟩 bounded executable evidence | Independent SLIDE commit `bb81c75` closes a direct GIR-to-binary route for the frozen V2-D checked-index profile: exact sections 1/3/5/7/10, zero imports, one internal memory page, one `(i32)->i64` export, all 15 admitted opcodes and a guard-dominated dynamically addressed array load. A separate parser verifies canonical structure and code identity before Node WebAssembly compilation. Execution is bound to the exact process-local artifact with a private `WeakMap`; copied, parsed, forged, proxied and cross-module artifacts refuse. V2-F is 13/13 focused; SLIDE is 295/295 across 17 suites; the frozen independent corpus remains 41/41 and Galerina's exact 28-file adapter corpus remains 496/496. Node/V8 is bootstrap compatibility only: no WAT, AST, Galerina callback, native certificate, production authority, component-removal permission or fallback is claimed |
| V2-G Verified Ahead-of-Demand Execution | 🟩 bounded measured evidence | SLIDE commits `dacc8af`, `bec6bd2` and `b5aab13` bind one exact prepared V2-D plan, verified schedule and direct import-free V2-F instance to a process-local capsule. Demand re-admits one signed-i32 value and has no clean, WAT, Galerina or alternate-backend fallback. Copied, forged, proxied, serialized and cross-module capsules refuse. Full SLIDE passes 304/304 across 19 suites; Galerina's exact adapter harness remains 496/496 and independently invokes SLIDE 304/304 |
| V2-G component benchmark | 🟩 bounded measured evidence | Clean commit `b5aab13`, Windows 10 x64, i9-9900K, Node v24.18.0, seed 1511506913, 128 operations, two warmups and nine counterbalanced samples. Median per operation: preparation 802,357.03 ns, clean V2-D demand 206,293.75 ns, verified demand 1,564.84 ns, assurance cost over warm V2-F 1,166.41 ns; measured break-even four demands. Evidence is capped at 1 MiB, stable-handle read, canonical UTF-8/JSON and independently recomputed. It is non-authorizing process-local evidence, not the deferred SLIDE/Wasm/Rust/Python comparison |
| Governed Galerina VADE benchmark adapter | 🟩 bounded admission | Galerina commit `6ef42f04` owns the exact receipt and a closed contract pinning SLIDE `b5aab13`, SHA-256, workload, platform/bootstrap labels, lane set and non-claims. A fixed-handle 1 MiB canonical reader refuses unstable, linked, ambiguous or alternate bytes. Galerina independently re-derives all nine lane summaries and economics. The CLI/audit reconstruct bounded results, and the full runner exposes only a separate non-comparative child outside `results/latest.json`. This grants no production, package-retirement or cross-runtime-comparison authority |
| Data-pipeline blocking saturation | 🟩 contract verified | `block` now requires an explicit positive safe-integer `blockTimeoutMs`; `fail` and `shed_oldest` refuse that dead field. The TypeScript union and runtime validator agree; focused package evidence is 22/22, the workspace is 98/98 with 8,755 tests, and exhaustive phase-close passes every blocking gate. This closes configuration admission only; scheduler enforcement and cancellation remain separate executable gates |
| Structured Await deterministic reducer | 🟩 bounded contract terminally verified | RD-0651 selects a bounded syntax-neutral reducer instead of treating an in-process abort signal as termination authority. Closed plan admission, immutable branded state, all/first-success/first-result policies, deadline precedence, `maxInFlight`, cancellation acknowledgement, winner identity and hostile state/event refusal pass strict typecheck/build and 44/44 package tests. The fixed point is 98/98 packages and 8,770 tests; strict is 84/84, exhaustive 85/85, security 31 files with zero findings/errors, graph 5/5, generator contracts 14/14 and tooling 245. Isolated hard termination, authenticated receipts, stream backpressure, frontend lowering and platform evidence remain separate open gates |
| Protected working branch | 🟩 | Protected branches are active; this session keeps its new commits local and does not push |
| Flat registry artifact identity | 🟩 | 10/10 exact-byte/path/topology/symlink/resource-limit tests |
| Delegated package-manifest admission | 🟩 | Registry 35/35; app-kernel 149/149; disposable root→operational→manifest chain, future-review and repeated-argument denials |
| Live registry population | 🟩 | False stubs removed; the provenance candidate remains unsigned; the separate hybrid-signed auth manifest is independently verified and is the sole live entry |
| Production registry signing | 🟩 | Exact one-entry index hybrid-signed by operational key `f31…`, independently verified and mutation-tested; SHA-256 `DCF80AA0717DEBF8BEB837584FDC053E24891C0D1224FB4735900E68FC1AAF06` |
| Default production registry consumption | 🟩 | Canonical read-only loader verifies the live root delegation and both operational signature halves before lookup; production revocation comes from one pinned, signed, immutable snapshot; signed index issuance replaces caller-selected wall time; the active epoch and checkpoint-selected generation ID must match. Tower 492/492, app-kernel 165/165, registry 35/35, auth 59/59 |
| Epoch-aware state integrity | 🟩 | Snapshot v2 MAC-binds epoch/key identity; authenticated ring + custody commitment selects active/retired verification keys and refuses unknown/revoked/substituted authority. Sentinel State 20/20; Tower 483/483 |
| Automatic rotation safety/control core | 🟩 | Trigger proposes only; readiness, Triple-Lock, M-of-N, switch, canary, fallback, drain and private-retire phases advance one at a time. Every production phase requires a freshly authenticated checkpoint; a production-admitted complete candidate generation is required; accepted delegation/index/generation identity advances only after canary. Disposable-key evidence passes; Tower 492/492 and app-kernel 165/165 |
| Immutable registry generation | 🟩 | Domain-separated SHA-256 ID, canonical bounded bytes/times, package-relative artifact paths, null install scripts, exclusive same-directory staging/publication, flush/re-open/hash/signature/correspondence verification, distinct verified-vs-host-evidence runtime brands, authenticated checkpoint schema and production loading by exact ID are implemented. Current signed artifacts reproduce generation `f3b432d31f10217006f88c0c39779ba5ae061e0728301b5021979af1cd63dbca`; Tower 492/492 and app-kernel 165/165 |
| Deterministic activation fault model | 🟩 | Seed-ordered fifteen-boundary simulator, canonical replay receipt, control plus planted-fault matrix, budget/unreachable/ambiguous-input refusal and checker-clean `.fungi` terminal fold are implemented. App-kernel 180/180. Simulation is deliberately non-authorizing and cannot replace platform crash evidence |
| Production custody and artifact activation | 🟨 | The least-authority custody contract, hybrid-root production profile, pre-transition rotation binding, native Windows/Linux/macOS candidates and controlled recovery protocol are implemented. Windows 10 passes 7/7 native/profile plus seven process-termination boundaries; app-kernel is 204/204. The production wrapper consumes an exact one-use persisted-object-bound forward-probe receipt rather than a caller-selected Boolean. The zero-dependency Rust C ABI re-derives the generation ID and the exact linked Windows candidate now builds and passes 2/2 host integration checks. External platform and sacrificial-host rows remain absent; app-kernel native-receipt integration and signed-host admission remain open. The production digest list stays empty, so no executable currently grants authority |
| Native executable identity | 🟨 | Primary documentation confirms standard addon loaders are path-based, so RD-0601 selects a statically linked beta bridge and RD-0656 selects a Galerina-owned Verified Execution Object as its final successor. The recipe pins Node 24.18.0, all relevant pristine preimages, Galerina sources/patches, Cargo lock, Rust 1.96.1, NASM 3.02 and build switches. Visual Studio 18.8, Clang 22.1.3 and NASM 3.02 pass preflight. A preimage-bound Clang compatibility patch and exact Windows system-library set produce a release `node.exe`; stock Node lacks its accessor, the custom executable ignores a hostile `.node` decoy, publishes exact bytes and retains a one-use unforgeable receipt. Candidate SHA-256 `5ef40608…60c1` is build evidence only. No signed executable or production authority is inferred |
| Linux adapter preparation | 🟨 | Repository implementation is complete: 10/10 pure facts, a retained-directory GNU Linux x86-64/AArch64 adapter, nine stable injected-refusal classes, hostile namespace-change checks, exact no-replace publication and seven process-termination boundaries. Other ABIs fail closed. Native default/all-feature/release and app-kernel 204/204 are green on Windows. The returned Ubuntu `2ceaf479...` evidence predates this live adapter and cannot be relabelled. The handover now transfers exact unpushed Galerina and SLIDE histories as verified Git bundles and requires five current outputs: four durability/report artifacts plus one functional Ubuntu receipt. Controlled reboot and power loss remain separate sacrificial-host rows |
| Beta-v1 platform admission | 🟨 | The v2 functional receipt, exact seven-OS policy, immutable digest-pinned evidence reader and final release verifier are implemented. A real Windows 10 build 19045 run at clean executable fixed point `f1e0871d...` passes 6/6 and remains K3 `0`, non-authorizing; receipt SHA-256 is `3B4EE284...3551`, and this later documentation commit makes it a checkpoint rather than final admission evidence. Windows 11, current Ubuntu, Debian, Fedora, Mint and macOS receipts plus an authenticated production durability receipt and repository fixed-point composition are absent, so the verifier correctly returns `INCOMPLETE_EXTERNAL_EVIDENCE` rather than green |
| RD-0601 through RD-0608 foundation research | 🟩 | Eight primary-source records, checked maths, ten-dimension zero-trust scores and a seven-column decision table are committed in the Knowledge Base. Detached GIR, linked execution, secure index, durable generations, digest agility and offline driver admission are adopt-with-controls directions. VPEG and Neural Shape Engine began as experiment-only; the executable lab evidence below retains VPEG and keeps NSE quarantined |
| RD-0623 B1/B0 and Tri-1 deep audit | 🟩 | Independent raw-sample arithmetic reproduces both n=99 paired comparisons and the five-trit maths. Source inspection shows B0 pays for one candidate semantic build before the same two common verifier builds; B1 replaces only that candidate build with exact reuse. Fixed lane order remains a possible confound. The comparison proves bounded reuse pressure, not VPEG advantage over BA and not a packed Tri-1 speed result |
| RD-0624 neuromorphic patent proximity | 🟩 | Preliminary claim-element engineering screen finds low current proximity between input-dependent fixed-topology proposal-only N2/deterministic VPEG and the asserted dynamic spiking neuron/synapse array claims. Learned neural-subgraph extraction/implantation, dynamic neural topology, spiking delays/refractory state and actuator loops are stop-and-review triggers. This is not legal clearance; formal FTO remains a public-production gate |
| RD-0625 through RD-0631 baseline matrix | 🟩 | Every final lane now has a separate numbered record with ordinary maths, Tri-1/K3 applicability, zero-trust review, use decision and paper gate. B0 and BA remain controls; owner selected B1 VPEG for continued R&D; B2/N1/N2/N3 stay retained laboratories rather than current fast paths. Packed Tri-1 density is recorded only for N1/N2/N3 and is not presented as speed, energy or cache-residency evidence |
| NSE-Micro E11 profile | 🟨 | The complete 14-lane Node reference is implemented and measured: clean source `4109202`, 42 cold/warm/polluted rows and 3,780 exact checks. Warm B0 is 155,660 ns/op, tree 615,520 and int8 737,950; no proposal arm wins. N3/B0 records 135 stops, 135 completions and D1 skipped 0. RD-0652 withdraws generic L2-cycle evidence and requires the next experiment to tile the complete admitted path: code, weights, graph/features, activations, scratch, capsule, runtime, verifier overlap and alignment. Effective cache, counters, migration, thermals and physical residency stay `INDETERMINATE`; no production or L1/L2-resident claim |
| B1/B2/N3 paper-review handovers | 🟩 | Six prompts exist: a repository-aware local-Claude and self-contained online-AI version for each lane. They require independent maths, separate Tri-1/K3 analysis, zero-trust score, primary-source research, null controls, alternatives and an honest paper-tier verdict |
| SEC-06 evidence-verdict correction | 🟨 | Self-hash-only benchmark evidence now returns K3 `0` (`INDETERMINATE`) rather than `+1`; internal generation/rendering uses a complete separate internal-consistency record. Digest-consistent forged commit/platform labels cannot obtain an authority-positive verdict. Full SLIDE is 228/228; the local review is recorded, while the app-backed standard scan still awaits its bounded Start-scan setup action |
| SLIDE evidence and atlas owner authorities | 🟦 | Owner approved a separate authenticated SLIDE research-evidence authority and external production atlas-anchor custody. No private evidence key is generated on this host; no Galerina key reuse is inferred. Engineering must still implement the offline ceremony, embedding-authority-owned anchor contract and Windows/Linux/macOS durability/rollback/crash evidence before either claim activates |
| Implicit corpus failures | 🟩 | Zero implicit failures; intentional negatives have explicit ownership |
| `.fungi` source-quality gate | 🟩 | Zero findings at the last full checkpoint |
| Terminal package-retirement authority gate | 🟨 | Implemented and deliberately red: 16/16 focused adversarial tests; 491 tracked package `.ts` paths, 104 production `.fungi` sources requiring exact source/evidence digest admission, 31 detected production host boundaries requiring ownership, 95 `node_modules` trees and one nested native package. R4 shadow-bake authority cannot silently authorize this terminal profile |
| Fungi staging/compiler repair chapter | 🟩 | Dossier audit 10/10; four staged files strict-clean; `for x in xs` lexical resolver scope proved; compiler 5,755/5,755; direct no-shell test boundary 47/47. Candidates remain quarantined pending executable parity and governed admission |
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
| Benchmark publication integrity | 🟩 | The audit self-test is 15/15; comparator-only output without its admitted Galerina subject is HIGH; active/latest duplicates, omissions, surplus entries, non-publication leakage and unregistered source directories refuse. GPU probes use direct argv without a shell. The focused framework subject reaches 10/10 handlers with an explicit admitted K3 identity verdict |
| Full Galerina publication benchmark | 🟩 | Galerina `54c15058...`, Windows 10 x64, Node 24.18.0, Python 3.14.6, Rust 1.96.1 and g++ 16.1.0. The unfiltered 29-workload run exited 0; 17/17 comparable units align, six cross-language checksum controls pass, the truth audit is clean and the regression guard finds no attributable regression. The current/latest-distinct chart and earliest/current chart are regenerated. The detached SLIDE child remains non-comparative and non-authorizing; the terminal independent SLIDE comparison is still deferred |
| Bounded independent SLIDE prepared executor | 🟩 | Exact V2-D bytes are fully admitted once into a deeply immutable process-local plan; every call recreates SSA/memory/guard/variant/accounting state. 791/791 byte mutations plus copied, proxied, forged and cross-module plans refuse. Independent SLIDE was 47/47 before measurement |
| Bounded Shape Fabric benchmark | 🟩 | Clean SLIDE `573670b` and Galerina `745ff5be`; Windows 10.0.19045 x64, i9-9900K, Node v24.18.0; 2 warmups, 9 samples, 2,048 ops/sample; every checksum exact. Median clean 8,090.17 ops/s, prepared 170,103.91 ops/s, 21.03x. This is fixed V2-D reference evidence, not the terminal cross-runtime result |
| Shape Lab E00 hostile corpus | 🟩 | SLIDE `80d79cd`: bounded raw-byte S0 intake, exact S1-S8 validation and literal F01-F20 coverage are complete. Hostile graph, policy, target, parameter, proposal, atlas and result mutations fail closed or reach their specifically admitted non-authorizing state. Focused evidence is 47/47; the complete independent SLIDE suite is 102/102. Nine schemas parse offline. This closes only the bounded E00 lab contract, not the general backend |
| Shape Lab E01 durable atlas | 🟩 | SLIDE `5ad5e98`; measured implementation `8c869e0af5121bb21de6cbf95ebb8ffcf763b1dd`. The bounded pre-created single-link log has exact length/digest frames, AES-256-GCM payloads, mandatory Ed25519 + ML-DSA-65 generation/commit signatures, append+flush publication, full contiguous-chain recovery, caller-owned minimum anchors, historical key/byte immutability and current graph/target/policy/proof/epoch replay. Every pre-commit byte prefix serves no successor. Focused 22/22, complete SLIDE 116/116 and ten schemas parse. Across 525 exact-byte checks, medians were B0 193,028 ns/op, process-local B1 92,376 ns/op and durable restart 1,526,072 ns/op. E01 was 7.91x the tiny rebuild cost, so this is verified R&D recovery evidence, not a speedup or production storage claim |
| Shape Lab E02 structural retrieval | 🟩 | SLIDE source `2df87f1feed26bb5b4568eac4dd4a7f827d1024b`. Topology bucketing, semantic colour refinement and a non-recursive exact labelled-graph bijection preserve operation, type, effect, capability, failure, attribute, role and edge semantics. The index is capped and immutable; exhaustion is typed `INDETERMINATE`; B2 recompiles the current graph and never serves prior artifact bytes. Complete SLIDE 136/136 and eleven schemas parse. Across 5,600 exact artifact checks, B2 produced 700 MATCH, 350 MISS and 350 INDETERMINATE outcomes. Median B2 was 1,039,045 ns/op versus B0 164,718 ns/op: 6.308x cost, so E02 is retained as verified negative-performance evidence and a deterministic control, not a speedup or production admission claim |
| Shape Lab E03 typed-boundary experiment | 🟩 | Complete bounded experiment at clean source `5e7895b...`: deterministic fixed/dynamic/indeterminate analysis, immutable value-free plans, ephemeral i32/Boolean/K3 bindings and same-implementation current-B0 byte recomputation. Seven samples × 100 operations produce 4,200 exact checks. B3 is 6.666x B0 and the renamed family is 92.344x B0, so the speed hypothesis fails and no finite break-even exists. Evidence is `sha256:4ed453f0c23e1f6e24fc1f615b7043c4e6b965f5b2696812393b10472c1ecaed`. Green means the experiment is closed; it grants no production authority |
| Shape Lab E04 packed and learned controls | 🟩 | Complete bounded experiment at clean source `a77d761...`. Code-pinned publication dimensions require 99 samples × 100 operations and produced 29,700 exact score plus 59,400 exact artifact checks. Medians are B0 146,040 ns/op, int8 6,305, prepacked Tri-1 25,700, cold Tri-1 204,097, N0 rule 351,860, N1 int8 367,217, N1 Tri-1 386,457, prototype 357,813, energy 365,124 and cascade 408,792. Density passes; every complete proposal loses. Evidence is `sha256:7b3113b5d76ab5619a38836ddbb93848b10bc3cc05767abdfb5941e20dfb5ef0`. Green means the experiment is closed, not adopted |
| Shape Lab E05 final matched experiment | 🟩 | Complete bounded experiment at clean source `51dd881...`. Code-pinned dimensions require 99 paired samples × 50 operations and produced 34,650 exact artifact plus 29,700 component checks. Medians are B0 479,692 ns/op, BA 454,554, B1 451,774, B2 1,876,484, N1 906,862, N2 743,706 and N3 1,847,004. B1 versus BA is indeterminate (HL −1,766.5; 95% interval −5,610 to 1,392; p=0.314879891037622408); B1 versus B0 is only a candidate under the documented extra-build/fixed-order limitation. Evidence is `sha256:70580b60cf39ed91abb4c172ef0d7af4f22b589e021f171563add81da61e7e72`; comparison `sha256:6ddb6a1226f9447188743619832bbdef516003225aa5b12ec3c3aa61973a3601`. Green means the experiment and report are closed; no VPEG-specific or production speed claim follows |
| Shape Lab adversarial-review closure | 🟨 | Claude-08, SEC-05 and SEC-06 were adjudicated into bounded diagnostics/XML, strict typed-array admission, exact prototype/data-descriptor checks, current semantic re-derivation, universal cycle enforcement, honest receipts, hybrid-evidence schema, atlas identity/key mutation coverage, exact paired statistics and the authority-verdict correction. Current source verification is 336/336 tests and 16/16 V2 contract files. Files may be internally consistent, but self-hash-only evidence returns K3 `0`; no evidence authority has signed it, so the lane stays amber |
| External flat `.fungi` candidate lane | 🟨 | Four direct-peer candidates pass the per-file strict frontend. The staging audit now requires complete dossiers and has 10/10 controls. GPU/native/Wasm status, vectors and plans exist; their report builders now preserve diagnostics and fail closed on impossible array misses or unknown enum states. All still lack executable parity and governed admission. Substrate Math is reference-only. Nothing has been copied or admitted |
| RD-0634 through RD-0638 AI-research5 adjudication | 🟩 | Current B1 is mechanism-equivalent to BA and remains an exact-atlas/null control; typed-hole VPEG needs a BA-miss/VPEG-hit fixture. Current N3 is additive assurance work and not a fast path. Patent separation remains technical rather than legal clearance; independent translation validation is the next D1 direction. E11 retains all proposed controls and uses corrected E04 timings |
| RD-0639 through RD-0641 learned-compiler/TVM prior art | 🟩 | Primary LLVM/Apache TVM sources confirm learned heuristics, ranking-plus-measurement and fixed-width store features are established. Adopt only as bounded Shape Lab comparators: frozen proposal identity, secret-reduced features, explicit budgets, deterministic D1 re-admission and total-path cost. No external tuner, prediction or hardware timing receives semantic authority |
| RD-0642 measured E11 adjudication | 🟩 | Re-derived representation/working-set maths, hostile-boundary evidence and the ten-dimension score are recorded. Weighted zero-trust architecture score is 8.65/10, but measured benefit is 2/10; decision remains experiment-only and worth a defensive/negative paper after cross-platform statistics |
| RD-0652 transcript verification | 🟩 | Transcripts 00114-00120 are archived and independently reconciled. Cache blocking/tiling is retained as the next bounded experiment; claimed generic cache latency, unsupported deterministic-AI metrics and specification-to-code proof substitution are refused. The current PutnamBench Lean denominator is 672, but 668/672 is 99.405%, not 98%; Mythos existence is first-party verified while capability remains separately gated. Research-corpus provenance hardening is designed but not yet implemented |
| RD-0653 native R&D and Windows tools | 🟩 | AI-11 through AI-17 are archived with exact identities; derived reports are not counted independently and one zero-byte matrix is explicitly refused. MSVC, Windows SDK/WPT/WinDbg/Application Verifier, Ninja and Sysinternals are available; hyperfine 1.20.0 is locally built. The cache first pass remains K3 `0` without harness/raw evidence. B1's 10.74% median residual remains statistically indeterminate against BA, and the cited Tri-1 normalized memory-times-time result is corrected to 1.004635339 for one JavaScript lane |
| RD-0654 native source/raw adjudication and DCTP design | 🟩 | Local KB commit `4073a35` archives the bundle as AI-18 and records the adjudication; its 29/29 original manifest records pass, and supplied executables were neither executed nor committed. Cache L1/L2 knees are one-session screening evidence while L3 remains unresolved. The graph result is renamed contiguous topological CSR because no tile scheduler ran and map/footprint confounders remain. Local SLIDE commit `7d68547` specifies the approved experiment; RD-0655 supersedes its implementation gate |
| RD-0655 DCTP implementation and first benchmark | 🟩 correctness / 🟨 performance | SLIDE commits through `ab98c5b` implement canonical exact tile plans, two-buffer scheduling/cleanup, secret-independent traces, no silent fallback, independent D1 and twelve measured lanes. Clean implementation `e0b824e` produced 1,188 exact outputs and 108 exact refusals. DCTP no-prefetch was 302,025 amortized ns/op versus BA 38,458, so the point direction is not better and the performance gate remains indeterminate. Node does not implement native concurrent overlap; physical cache, counter, energy, thermal, frequency and migration facts remain unavailable. No Galerina integration or removal authority follows |
| RD-0656 `.fungi` Verified Execution Object | 🟩 architecture / 🟥 implementation | Primary-source review covers CAS/action identity, OCI descriptors, frozen lockfiles, capability runtimes, Wasmtime's trusted-precompile warning, seL4/capDL, TUF, SLSA, fs-verity, W^X and OWASP injection controls. The selected final loader accepts only a runtime-minted opaque object over owned exact bytes and complete input/capability/policy identity; it never reopens a pathname. Eight mandatory K3 gates admit only the all-`+1` vector (`1/3^8 = 1/6,561`). Node remains an explicitly temporary beta bridge. VEO code, independent validation and platform evidence remain unbuilt, so no release authority follows |
| Knowledge Base close | 🟩 | Local KB commits through `65dd551` include RD-0655 and the prior redacted, hash-bound AI-18 research archive; its tree has no unmerged or interrupted operation and is clean. No push occurred |
| Live status authority | 🟩 | `governance/status-ledger.json` replaces the June free-text `version.json.openTasks` snapshot for live navigation. The schema admits at most eight unique bounded gates and only existing canonical repository `docs/*.md` evidence. Fixed-buffer double reads plus descriptor pre/mid/post checks enforce 16,384 bytes before allocation/decode/parse; missing, malformed, traversal-bearing, literal-duplicate or escaped-duplicate authority is refused without historical fallback. It is informational and cannot authorize release or production activation. Status-focused tests are 7/7, the containing dev-tools fixture is 45/45, and the post-change phase-close passes every blocking child including security 31-file/zero-finding, graph 5/5, generators 14/14 and the complete tooling child |

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
   reproducible while the final registry artifact changes. Current fresh
   evidence is strict 84/84, exhaustive 85/85, graph 5/5 and package 98/98
   with 8,814 unit tests.
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
   **Completed non-authorizing proof:** the RD-0601 statically linked profile
   binds the exact adapter source, authoritative `.fungi` contract, ABI and
   release build without an external `.node` loader. Its executable is
   independently re-hashed and a hostile loader decoy cannot alter the result.
   **Still required:** signed-host and admitted platform durability adapters
   and Windows 10/11, Debian/Ubuntu, Fedora/Mint and macOS crash/reboot/
   power-loss evidence through least-authority custody before any real
   owner-key rotation is authorized.
   After beta, rebuild the reusable lifecycle mechanism in independent SLIDE
   `.fungi`; Tower Citizen remains the Galerina policy adapter and trust
   domains/keys remain separate.
6. **Bounded non-production execution now includes V2-G VADE:** independent SLIDE
   has an immutable prepared V2-D executor, logical `finally` cleanup, a real
   changed-order dependency proof and a direct import-free Wasm binary
   compatibility adapter. The adapter independently verifies its closed module
   shape before compiling only internally owned bytes, brands the exact
   process-local instance and fails closed without WAT, AST, Galerina callback
   or alternate-backend fallback. V2-G now performs those fixed steps before
   demand, re-admits the exact capsule and one signed-i32 value, and measures
   all nine preparation/demand/refusal lanes. Exact evidence is complete SLIDE
   304/304, Galerina adapter 496/496 and the independent 42-file SLIDE lane
   304/304. Node/V8 is still bootstrap compatibility; native/final-artifact
   authority remains open. The same research lane also includes the exact clean/prepared
   benchmark, completed E00 F01-F20/S0-S8 evidence and a completed bounded E01
   durable-atlas experiment. E01's encrypted
   hybrid-signed append log, crash-prefix matrix, minimum-anchor recovery and
   restart re-admission are green only inside Shape Lab. Multi-process writer
   exclusion, portable filesystem adapters, production key/anchor custody,
   rotation/revocation, storage exhaustion and physical-media evidence remain
   unimplemented. Galerina production native activation remains red; no
   loader, rotation or package authority was bypassed.
7. **Completed integration chapter:** the governed Galerina VADE benchmark
   adapter pins the exact SLIDE commit, workload, schema and receipt digest,
   independently recomputes the measured receipt, and exposes it only as a
   non-comparative devtools child. The independent V2-G benchmark remains a
   pre-native baseline and does not authorize production execution, component
   removal or the terminal cross-runtime comparison.
8. Switch packages in dependency order from TypeScript execution to verified
   `.fungi`/SLIDE execution. The fresh retirement-graph ratchets are 477
   implementation `.ts` files and 491 tracked package `.ts` paths: 26
   twinned, 97 compiler bootstrap, 16 bounded bootstrap-floor and 338 governed
   migration-program paths, plus one nested native package and 95 package-local
   `node_modules` trees. The terminal gates require every debt to reach zero
   without hiding or renaming a member.
   External AIs may prepare flat, quarantined candidates in parallel, one
   direct peer package each. They may not create npm-style nested plugin
   trees, edit Galerina, or claim replacement completion.
9. Run the full governed benchmark and both requested charts only after the
   independent SLIDE backend executes equivalent workloads.

The compact `node scripts/status.mjs` view is now generated from the bounded
`governance/status-ledger.json` navigation authority. Its four live gates are
platform durability, executable SLIDE, parity-proven flat `.fungi` package
retirement, and the cross-platform matrix. The CLI exits non-zero when that
ledger is missing, malformed, larger than 16,384 bytes, contains literal or
escaped duplicate field names, changes across its bounded double read, or
points outside existing repository docs; it never revives the
historical June `version.json.openTasks` prose.

The phase-close display no longer treats an arbitrary child sentence containing
`total` as a test count. Only `tests:core` may consume the aggregate `TOTAL`
row; ordinary Node test children use their terminal `pass`/`fail` summary. A
fixture with `total debt: 999` and `pass 3` now reports `3 tests pass`, and the
runner regression suite is 7/7.

The terminal audit pass has executed every discovered audit/lint tool. Enforced
gates are clean, 60/60 security mutants and 3/3 WAT arithmetic mutants are
killed, the root aggregate is 98/98 packages with 8,735 tests, and the unified
test harness is green across all five lanes. Report-only inventories remain
roadmap evidence rather than being relabelled as green gates: 132 unlowered WAT
nodes, 42 stale negative examples, 0 signing refusal codes without a direct
test mention, and 34 cross-package relative imports. The signing inventory is
now closed at 51/51 directly mentioned refusals with specific negative/control
witnesses.

The fresh unified lane totals are unit 8,735, end-to-end 4/4, conformance
10/10, fidelity 9/9, and Galerina SLIDE-adapter corpus 496/496. The audit
meta-gate covers all 81/81 discovered audit/lint gates with non-vacuous
refusal/control evidence. The tooling contract reports 98 packages and 154
governed tools with zero violations; the generated developer-tool index
separately records 136 developer tools, including 80 audit-class tools.

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
84/84, exhaustive passes 85/85, graph-all passes 5/5, all fourteen generator
contracts pass, and the exhaustive package lane passes 98/98. A separate
canonical-count run rebuilt the same declared package chains and recorded
8,755 tests with zero failures. The strict cadence first caught stale
code-index line-address evidence; after explicit dependency-ordered
regeneration retained the exact 753-code set, its check mode and the complete
cadence passed. Focused automatic key-rotation evidence is 62/62. These
results authorize their evidence surfaces, not the offline
signing ceremony or beta-v1 release.

The later `8a2bdcf6` fixed point was freshly rechecked after the static-profile
and Linux pure-correlation work. Every blocking phase-close child passed,
including graph-all 5/5, fourteen generator contracts, workspace pointers for
all 98 packages, the complete `.fungi` corpus/example lanes, WAT/Wasm checks,
canonical proofs, a neutral governance diff and the security audit over 31
files with zero findings or errors. This supersedes the earlier fixed-point
commit for that local evidence. The current uncommitted round-two chapter adds
Linux candidate source and Windows-hosted pure/refusal evidence only; its
Linux-only compile/run, crash/reboot/power-loss and production-admission claims
remain absent.

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
`npm.cmd run audit:package-topology`. Fresh evidence records 99 canonical
identities, 95 package-local `node_modules` bootstrap trees, and one exact
deferred nested native package (`galerina-framework-example-app/packages/greeting`).
Any growth fails. The final `--post-slide` profile already refuses all 96 debt
locations and becomes a required green gate after executable SLIDE integration.
The composite `ts-retirement-graph --post-slide` gate additionally requires
zero tracked package TypeScript, terminal execution admission for every
production `.fungi` source, and digest-bound ownership for every detected
production host boundary. Its current 16/16 adversarial suite proves that
renaming debt, unexecuted source, nested identities, dependency trees, unowned
host bridges and substituted evidence all refuse. The resolver, lock,
provenance and migration contract is detailed in
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

## SLIDE architecture reduction checkpoint - 2026-08-01

RD-0643 through RD-0650 have re-evaluated the whole proposed SLIDE/Galerina
boundary against the expanded engineering standard. The candidate architecture
formalises the **Deterministic Fabric Engine (`DFE`)** as the closed action-DAG,
topological-scheduling, exact-product, invalidation and crash-publication
coordinator. Shape Fabric is narrowed to deterministic reconstruction,
proof/admission collaboration; VPEG is a typed immutable artifact rather than
another engine; the Fragment Atlas remains a hostile process-local library.

The adoption sequence is deliberately evidence-ordered: detached GIR and its
independent admission, then DFE/B0, exact BA and crash-safe publication, then
flow-region memory and typed security/privacy seams, then native adapters, and
only then typed-hole VPEG. B2, NSE, NSE-Micro and N3 remain preserved research
arms. Current evidence does not admit any of them as a production fast path.

The architecture proposes retiring direct AST-to-WAT production, Node/npm
runtime authority, external index/memory sidecars, automatic driver download
inside compiler/runtime, raw/manual ordinary memory and cached/learned policy
authority. Those paths are not removed until executable replacements and
parity evidence close. Tower Citizen and Tri-Pipe remain Galerina integration
adapters; Tri-Fuse remains a proof-backed compiler pass.

The detailed cut/merge/introduce table, fourteen-criterion review, vertical
architecture diagram, sequencing and zero-trust score are in
`../../ZTF-Knowledge-Bases/RD-0650-slide-architecture-synthesis-cut-merge-introduce-and-adoption-table.md`.
Repository-aware prompt 19 and repository-blind prompt 20 independently
challenge the design with primary-source research, ordinary/Tri-1 maths,
security attacks, alternatives and falsification. The new boundary remains
blue/planned pending owner adjudication; it does not change the verified
Galerina fixed point.

## SLIDE VPEG and dual-engine research

Status: 🟩 bounded E00-E05 experiments are complete. For E03-E05, green means
their implementation, hostile checks, declared sample profile, statistics and
reports are closed; it does not mean their mechanisms are production-admitted.
Exact VPEG is a candidate faster than rebuild in the fresh E05 run, but remains
statistically indeterminate against the ordinary action-cache control. None is
a production SLIDE backend or admitted Galerina feature.

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
6. Let the deterministic Shape Fabric re-derive semantics from the admitted
   graph, validate proofs and admit or refuse each candidate. Current Shape
   Lab B0 comparison shares implementation code and is not an independent
   oracle; a separate verifier is required before such a claim.
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

The first executable comparison includes these deterministic lanes before a
neural result can count:

1. full deterministic rebuild;
2. an ordinary exact whole-action cache;
3. exact VPEG fragment reuse with complete validation; and
4. deterministic structural retrieval plus full reconstruction.

The ordinary action cache is the null hypothesis. Without it, the experiment
can only prove that reuse beats rebuilding.

The 2026-07-31 Shape Lab now executes full rebuild (`B0`), ordinary action
cache (`BA`), exact VPEG (`B1`), bounded structural retrieval (`B2`) and
NSE-Reflex proposal (`N1`) lanes. E00 adds
bounded raw-byte intake, F01-F20 hostile/control evidence, exact S0-S8 stage
coverage, target/driver derivation, typed parameters, child-DAG closure,
proposal quarantine and complete matched-result validation. Every graph
fixture replays byte-identically through the public decoder and independent
sample counting agrees with the result records. Focused E00 evidence is 47/47.

E01 is complete for its bounded non-production adapter. It uses a pre-created
append-only log because this Windows host cannot flush directory metadata
through Node. Length/digest-framed generations survive every tested tail
truncation without granting partial authority. Atlas payloads are AES-256-GCM
encrypted; generation and commit records require both Ed25519 and ML-DSA-65.
Separate flushes, full-chain recovery, caller-owned minimum anchors,
historical key/byte binding and current-context replay all fail closed. Tests
use ephemeral keys and read no owner material. Focused evidence is 22/22,
complete independent SLIDE is 116/116 and all ten schemas parse offline.

E02 is complete for a bounded process-local structural index. Exact graph
validation precedes topology bucketing, semantic colour refinement and a
non-recursive labelled-bijection checker. Complete semantics and context are
bound; caps close candidate, exact-check, refinement-work and accounted-memory
budgets. B2 returns only `MATCH`, `MISS` or typed `INDETERMINATE`, recompiles
the current graph and compares it with a same-implementation current B0. It
never serves old artifact bytes. Across 5,600 exact checks, median B2 cost was
6.308x B0, so its speed hypothesis failed. The implementation remains as the
mandatory control
for E03/E04 rather than being deleted or promoted.

E03 proves a bounded fixed/dynamic/indeterminate partition, immutable
value-free plan, ephemeral typed bindings and current B0 artifact equality. A
renamed family shares one canonical shape-plan identity after fresh exact B2
mapping and current descriptor/partition verification. The current run records
exact B3 at 6.666x B0 and renamed-family B3 at 92.344x; neither has finite
break-even. This is retained negative evidence. E03 is complete as a bounded
experiment and grants no integration or package-retirement authority.

E04 proves canonical five-trit storage and exact logical equality with its
int8 control, then keeps rule, prototype, energy and cascade outputs behind a
common current-B0 verifier. The code-pinned 99-sample run retains the density
result and records 89,100 exact checks, while every complete proposal lane
loses to B0. The bounded experiment is complete; it grants no package, loader
or execution authority.

E05 now closes the final matched experiment. N2 responds to admitted graph
features rather than returning one constant recipe, proposals bind canonical
preimages and every lane ends at current-B0 byte comparison. Ninety-nine
paired samples show exact VPEG B1 as a candidate faster than B0 in this run,
but its difference from the ordinary action cache BA is indeterminate. That
null-control result prevents a VPEG speed-advantage claim. N1, N2 and N3 are
slower; their retained code is scientific negative evidence, not authority.
The result and paired-statistics sidecar are self-hashed internal-consistency
evidence only, not authenticated provenance. The bounded E05 experiment and
its dedicated completion report are closed; authenticated publication and
production adoption remain later gates.

RD-0623 puts `B1_EXACT_VPEG_VS_B0_CURRENT` back into active R&D. B0 performs
one candidate semantic build plus the two common verifier builds, while B1
performs exact reuse plus those same two builds. The measured 5.82% candidate
latency reduction is therefore evidence that one reuse avoids work, not that
fragment VPEG beats the ordinary action cache. The next run must use a
pre-registered counterbalanced schedule across fresh processes and bind that
schedule into the newly approved authenticated SLIDE evidence envelope.

RD-0624 separately screens the University of Tennessee NIDA/DANNA patent
family. Current deterministic VPEG and input-dependent fixed-topology,
proposal-only N2 are technically
distant from the inspected dynamic spiking neuron/synapse array claim
clusters. Formal freedom-to-operate review remains mandatory before public
production distribution, and learned neural-subgraph extraction/implantation,
dynamic neural topology, spiking delay/refractory semantics or actuator loops
trigger a fresh stop-and-review gate.

The provenance-bound matched E01 run performed 525 exact-byte checks. Median
costs were B0 rebuild 193,028 ns/op, process-local B1 92,376 ns/op and durable
restart 1,526,072 ns/op. Full durable restart was 7.91x the tiny rebuild and
16.52x process-local reuse. The result retains E01 as a security and larger-
workload experiment but makes no speedup, backend or production-durability
claim. The report and chart are
`../SLIDE/research/shape-lab/E01-DURABLE-ATLAS-COMPLETION-REPORT.md` and
`../SLIDE/research/shape-lab/results/e01-durable-latest.svg`.

The first 2,000-iteration synthetic run remains valid historical evidence:
`BA` and `B1` reduced lab overhead versus `B0`, while `N1` was slower after
proposal and verification. VPEG therefore proceeds; NSE remains
`EXPERIMENT-ONLY` and gains no authority. The 8-byte number is model parameters
only, not total cache residency. Evidence is under
`../SLIDE/research/shape-lab/`; the standalone engineering diagrams are
`../SLIDE/docs/n1-neural-shape-engine-engineering.svg` and
`../SLIDE/docs/b1-vpeg-atlas-engineering.svg`.

The composition is new, but its foundations are established: persistent
incremental object caching in LLVM ThinLTO, declared-input action hashes and
content-addressable output storage in Bazel, unique content-derived store
identities in Nix, and e-graph/fixpoint techniques for retaining and extracting
equivalent optimized forms.

## Sequenced holds

- A bounded SLIDE clean/prepared chart is now published as explicitly
  non-authorizing development evidence for one exact V2-D workload. No new
  Wasm/Rust/Python/Galerina/SLIDE comparison is published until general SLIDE
  execution and the same cross-runtime workloads can be measured. The
  stale-report/catalog gate is green; the full publication audit deliberately
  remains red for two historical subject-absence rows until the complete
  equivalent-work run replaces `latest.json`.
- Literal package TypeScript and `node_modules` retirement is now an explicit
  terminal goal, sequenced after executable SLIDE integration and performed
  one admitted package edge at a time.
- `.gate` remains late in the sequence to avoid rework.
- Independent non-production SLIDE implementation is active. Galerina's
  production activation gate stays red until its separate loader/durability
  evidence closes.

## Owner questions

No owner-only question blocks this chapter. Offline signing is complete and no
signing command is authorized. The loader direction, detached-GIR seam,
VPEG/action-cache controls, Neural Shape Engine sandbox, secure index,
durability, digest agility, and driver-manifest direction are engineering
decisions recorded in RD-0601 through RD-0608. New questions go in
`../SLIDE/QUESTIONS-FOR-OWNER.md` only when evidence cannot resolve a genuine
owner decision.
