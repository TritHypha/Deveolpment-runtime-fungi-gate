# Galerina Roadmap — 2026-07-25 (cycle 2)

> **Historical cycle snapshot.** The generated subway block below remains
> current, but the narrative before it records the July cycle and is not an
> active task queue. In particular, the former production DSS/Wasmtime sidecar
> is retired; use
> [the current roadmap](roadmap-2026-07-29-galerina-beta-v1-to-slide.md) and
> [the runtime reconciliation](reports/roadmap-legacy-runtime-reconciliation-2026-08-04.md).

**State anchor:** `main` @ `6816162f`, synchronised with `origin` (owner pushed this cycle — `origin/main..HEAD`
is empty). Beta: nothing here is "shipped", "frozen" or "released".

> Supersedes `roadmap-2026-07-25.md`, which was written against `ef3a746e` and is now stale in three
> places: the ledger (4→5), the push state (ahead→synced), and the gate battery (it recorded 5/5 green;
> **two gates are RED**, and this document names why).
>
> Every number below was produced by a tool run in this cycle. Where a number is asserted rather than
> measured, it is labelled `[asserted]` — that label is a declared debt, not decoration.

---

## 1 · Gate battery — this cycle

| Gate | Result |
|------|--------|
| `graph-all` | ✅ **6/6** — project 6,984n / 7,252e · integrity 0 violations · KB 20 orphans / 0 broken · Hardened Border **97 pass / 0 drift** · memory 0 dangling index, 0 unindexed, 7 dangling `[[links]]` · dev-tools 97 pkgs / 122 tools / 40 proofs |
| `code-index` → `gen-code-registry` | ✅ ran in the documented order · 721 codes = 607 src-real + 114 doc-only · 150 families |
| `audit-artifact-drift` | 🔴 **RED — 1 violation**, cause named in §2 |
| `audit-example-diagnostics` | 🔴 **RED — 6 regressions**, causes named in §3 |
| Tests | ⚠️ **not re-run this cycle** — the 7,876 figure in `component-health` derives from `version.json`, which is known to drift from the live suite. Not restated here as a result. |

Registry composition (derived, `registry.json.counts`): `ref` 192 · `inline` 169 · `phantom` 114 ·
`live` 133 · `referenced` 100 · `dead` 13.

---

## 2 · RED gate 1 — `audit-artifact-drift`

**Finding:** `counts.phantom = 114` against a frozen shrink-only baseline of `111`.
**All three newcomers were traced to source. None is an instrument defect.**

| Phantom | Site | Verdict |
|---|---|---|
| the unminted **VAL-family slot 012** | `docs/TODO.md:95` | **Mine.** A board entry naming a code from the VAL-001 rename I built and reverted. The code edits were reverted; the reference was not. A premature reference to a target that does not exist. |
| `FUNGI-MUTATION-001` | `docs/contract-registry/CONTRACT_REGISTRY.md:548`, `rd0528-compiler-stages-evidence-pack.md:76` | **Real.** Named in a `verifyMutationPolicy` intent line; verified at source to have no emit site. The self-hosted parser has **no production** for the construct — parser-blocked, per `self-hosted-i3-functional-corpus.test.mjs:510`. |
| `FUNGI-STEP-001` | `docs/contract-registry/CONTRACT_REGISTRY.md:550` | **Real.** Same class — documented in an intent line, parser-blocked, never emitted. |

🔴 **Retraction.** I had this gate parked with the cause *"the code-registry scanner ingests its own
output from `build/code-registry/**`"*. That is **not** the cause of this red. Self-ingestion is a real
and separate concern (board #165); it is not what fired here. The story was wrong and is withdrawn.

**Zero-trust resolution — strengthen the check, do not move the number.**

The weakness the trace exposed is structural: `FUNGI-DRIFT-002` ratchets on a **bare count**, while the
adjacent A3 dead-set check ratchets on a **named set** and states its reason for doing so — *"a promote +
enter swap cannot mask it"*. A count has exactly that hole: one phantom leaving as another enters is
invisible. So:

1. Convert the phantom ratchet from a count to a **named set**, matching A3. Strictly stronger — it
   closes the swap-masking hole and forces every entrant to be named with a reason.
2. Delete the premature slot-012 reference from the board; describe the rename by its subject.

   ⚠️ Writing this section re-created the defect: naming the phantom in its minted form put it straight
   back into the registry (114 again, from three sites — two of them in *this document*). That is the
   blindness class in its purest form — **the instrument cannot tell a code being *used* from a code
   being *discussed***, so an incident report about a phantom manufactures one. Interim discipline:
   cite an unminted code by family + slot (`VAL-family slot 012`), never in the `FUNGI-…` form. The
   durable fix belongs with the named-set work: give the scanner a way to distinguish a **citation**
   from a **registration** — designed carefully, because that mechanism is one careless step from
   being an escape hatch.
3. Enter `MUTATION-001` / `STEP-001` into the named set as **grammar-blocked**, cross-referenced to the
   governance-verifier work — visible and attributed, not absorbed into a larger number.

The baseline number is **not** raised. Item 3 records two true facts; it does not excuse them.

---

## 3 · RED gate 2 — `audit-example-diagnostics`

Six regressions outside the 89-entry burn-down baseline. They are **two different problems** that a
single count had merged.

### Class A — examples teaching a grammar the compiler correctly refuses (4)

`parser.ts:5764` implements **RD-0531 step 1**: the vault scope word is mandatory, and only `vault secure`
has a grammar. `global` and `session` are *deliberately* refused with `FUNGI-VAULT-008`, on a stated
fail-closed rationale: *"a scope the compiler cannot enforce must not silently accept a program."*

| Example | Teaches | Status |
|---|---|---|
| `024-vault-global-basic` | `vault global` | unimplemented scope |
| `025-vault-global-secret-invalid` | `vault global` | unimplemented scope |
| `473-scoped-vault-request` | `vault request` | **not even one of the three declared scopes** |
| `474-vault-session-session-pattern` | `vault session` | unimplemented scope |

The compiler is right and the curriculum is wrong. These four teach syntax that does not exist, which is
the premature-reference rule applied to documentation. **They must not be made green by rewriting
`expected_diagnostics` to match the refusal** — that would teach a refusal as though it were the lesson.
Resolution: move them to the gate's existing `Proposed-*` pre-curriculum class (logged, not gated) until
RD-0531 lands the grammar, at which point they re-enter the gate on their own merits.

### Class B — examples that are genuinely defective (2)

`228` and `229` use `vault secure` correctly. Their diagnostics are real:

```
FUNGI-TIER-001     guarded flow "incrementLogin" uses secure-tier effect audit.write
                   but is declared "guarded" — secure-only obligations are SKIPPED
FUNGI-VALUESTATE-008  Untrusted boundary input 'userId' reaches governed sink
                   'AuditLog.write' without an explicit gate
```

⚠️ This is the finding of the cycle. A **Level-5 governance teaching example was demonstrating an
ungated taint path into an audit sink**, and declaring `expected_diagnostics: none` while doing it. Both
files also still carry retired `GlobalVault` branding in their headers. These get fixed as examples —
tier corrected, taint gated — not reclassified.

---

## 4 · Self-hosting (RD-0528) — the primary track

**Ledger: 5 of 7 stages authoritative.** All 7 at R3 byte-parity (138/138 `wat-p9-*-parity`);
interpreter parity 100%; `audit-stage-execution` trap baseline 0.

**6th flip — governance-verifier — technical precondition met, evidence gate open.** Outstanding:
- my evidence-pack subset addendum (mine);
- the GOV-005 taxonomy reconcile (**owner authorised this cycle** — now actionable);
- **#167 ruled by the owner: option (b)** — the governance twin's rules are legitimately its own subjects
  and each gets a code named for its own subject. The twin is not a mis-numbered copy of the `.ts`
  checks. This unblocks the rename, but §5 gates the order it lands in.

**Ledger read at source this cycle** (`audit-compiler-stage-twins`, 8/8 check-clean):

| authority | stages |
|---|---|
| **authoritative (5)** | `lexer` · `type-checker` · `effect-checker` · `gir-emitter` · `runtime` |
| **differential (2)** — execute through #105 | `parser` · `governance-verifier` |
| shadow (1) | `compiler.capabilities` |

⚠️ Correction to an earlier draft of this document, which listed "lexer + parser flips" as remaining:
**`lexer` is already authoritative.** Only `parser` and `governance-verifier` are still differential.

**Post-v1:** parser flip (needs #163 per-stage intern isolation) · bootstrap fixpoint (blocked on
duplicate export names across concatenated stages) · Tier-2 `.ts` retirement.

---

## 5 · Sequenced next

Ordering is a dependency chain, not a preference.

1. **#169 — extend `audit-twin-emit-parity` to the governance twin.** It currently covers the type twin
   (23 codes) and effect twin (9) only; the governance twin is **absent**, so it can emit a code the
   `.ts` never emits and nothing says a word. This is the mechanism behind GOV-004's two twin-only rules
   and VAL-001's stray use — not bad luck, no gate on that surface. **Blocks 2 and 3:** minting codes
   under ruling (b) without it lands twin-only codes with no gate to record them as differentials.
2. **#167 (b) implementation** — name each twin rule for its own subject, shipped with the differential
   rows the gate from step 1 makes mechanical.
3. **#170** — rebuild the VAL-001 rename properly scoped: twin emit + intent line · 4 consumer sites with
   `VAL-001`-for-`safety_critical` kept as the discriminating control · KB registration marked TWIN-ONLY.
4. **GOV-005 taxonomy reconcile** (owner-authorised) → gov-verifier 6th flip under doc-08 §5a.
5. ✅ **#168** — all 20 originally unproven signing refusals now have their own
   negative/control witness; the recon map reports 51/51 directly mentioned
   signing-path codes and zero gaps.
6. **#171 — DIAG shape, settled asymmetric.** `.ts` full construction (registry becomes an import, not a
   parse — kills emit-form and code-shape blindness together); twins literal `name:` + exact-match gate.
   Explicit deliverable: **C1c graduates advisory → gating**.
7. Version-count regen tool, to close the `version.json` ↔ live-suite drift so the one `[live]` % is honest.

Unblocked in parallel: Package Standard + publish ladder (#66) · R4 T2–T5 tranches (#131).

---

## 6 · Readiness snapshot

`component-health.mjs`, this cycle. Ship-readiness **97.9%** (95/97 packages; the 2 non-green are the
documented #32 exemptions).

**Zero-Trust thesis — avg 78%, all `[asserted]`:** Compiler 100 · Packages 98 · I/O-kernel 72 · Memory 62 ·
TLSTP 56. The remainder across the last three is the **#143 execution flip** (owner), not missing wiring —
the injectable border-safe execution path is built.

**Build progress — avg 75%:** Spec/KB · Lexer-Parser-Verifier · DRCM 1–7 · CBOR · Stage-B interpreter
parity all 100 `[asserted]` · Tests 100 `[live]` (see the §1 caveat) · Type/Effect checker 100 `[derived]` ·
WAT emitter 89 · Runtime interpreter 87 · App-framework 72 · PQ & Hardware 40 · Passive plans 35 ·
AI Tower 30 · Photonic 3.

Rows carrying a **word** rather than a number, because no countable ladder exists: Stage-B WASM execution
(R3 across all 7 stages) · B8 governed transport (in progress).

**Honesty note.** Only **Tests** is live and only **type/effect-checker** is derived. Every other
percentage is asserted debt, ratcheted by `audit-percent-evidence.mjs`. A row with no checkable ladder
carries a word, not a number — and the two red gates above stay red until they are fixed, not until they
are rebaselined.

---

## 7 · The subway map

<!-- SUBWAY:BEGIN (generated by scripts/gen-roadmap-subway.mjs — do not edit; run `node scripts/gen-roadmap-subway.mjs --write`) -->
**v1.0.0-beta.2 · 100 packages · 9612 tests · ship-readiness 100.0% · Zero-Trust thesis avg 78% · build avg 75%**

**Assurance DAG: UNKNOWN** · root `87031b60f5fd59192cde974a732a96f5cf9345232174d42b7d9a74ea9dc2a3a2` · non-authorizing.

![Galerina roadmap — subway map](build/component-health/roadmap-subway.svg)

**Self-hosting line (RD-0528).** 7 of 7 compiler stages are AUTHORITATIVE — the `.fungi` stage is the decider of record and the co-located `.ts` is retained as a running differential shadow. All 7 are byte-pinned in the stage-hash baseline.

| stage | lexer | parser | type-checker | effect-checker | gir-emitter | governance-verifier | runtime |
|---|---|---|---|---|---|---|---|
| authority | ● | ● | ● | ● | ● | ● | ● |

**Kernel cutover line (RD-0361).** 29 sentinel twins are authoritative in the ledger. The differential remainder is not counted here — no ledger records a denominator, and inventing one would be a hand-typed number.

| Zero-Trust boundary | % | evidence |
|---|--:|---|
| Compiler | 100% | **asserted** |
| I/O — OS kernel | 72% | **asserted** |
| Packages | 98% | **asserted** |
| Memory | 62% | **asserted** |
| TLSTP — zero-middleware | 56% | **asserted** |

| Build-progress layer | % | evidence |
|---|--:|---|
| Specification / KB | 100% | **asserted** |
| Lexer / Parser / Verifier / Contract / Value-state | 100% | **asserted** |
| DRCM Phases 1-7 (Stage-A simulation) | 100% | **asserted** |
| CBOR Manifests (RFC 8949) | 100% | **asserted** |
| Tests — full suite | 100% | measured |
| Stage-B self-hosting — interpreter parity | 100% | **asserted** |
| Type checker / Effect checker | 94% | measured |
| WAT emitter | 89% | **asserted** |
| Runtime interpreter | 87% | **asserted** |
| Application-framework layer | 72% | **asserted** |
| Post-Quantum & Hardware Security | 40% | **asserted** |
| Passive Execution Plans & Target Bridges | 35% | **asserted** |
| AI Inference Tower (BitNet/Groq/NVFP4) | 30% | **asserted** |
| Photonic / Ternary Computing | 3% | **asserted** |

**No percentage claimed:** Independent SLIDE general executable backend · B8 governed HTTP transport (TLSTP) · Lyth/Weaver Verified Admission Fabric.

**Tracking registry (31):** shipped 16 · building 11 · post-v1 3 — every named workstream, from the same percent-audit source; the map's registry section lists each one.

> **Read the map honestly: 2 of 19 percentages are measured** (a live reading or a countable ladder); the remaining 17 are asserted — a considered judgement, but hand-typed. Burning that ratio down is itself tracked work, which is why the map draws the difference instead of hiding it.

<sub>generated from the closed assurance dependency DAG + component-health + the RD-0528/RD-0361 authority ledgers; exact producer identities are in focused provenance sidecars · regenerate: `node scripts/gen-roadmap-subway.mjs --write`</sub>
<!-- SUBWAY:END -->
