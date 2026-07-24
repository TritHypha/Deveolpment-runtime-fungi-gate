# The `.ts` → `.fungi` self-hosting standard (RD-0528)

**Scope: PUBLIC.** This is the Galerina-side, developer-facing copy of the `.ts`→`.fungi` self-hosting
standard. The authoritative source is maintained by R&D in the ZTF Knowledge Base (`three-valued-stance`,
doc 08); this copy is curated against the live tree and cites that source per the dual-home convention.
The **source of record for the live state** is the ledger
[`rd0528-compiler-authoritative-stages.json`](rd0528-compiler-authoritative-stages.json) — this document
*explains* the model; the ledger and its gate *enforce* it. If this prose ever disagrees with the tools
in §6, **the tools win.**

---

## 1 · Why this document exists

Galerina's compiler is written in TypeScript (`.ts`). It is being **incrementally self-hosted**: each
compiler stage gains a twin written in Galerina's own language (`.fungi`), proven equivalent to the `.ts`.
This raises a fair question — *if a stage has been "flipped" to `.fungi`, why is the `.ts` still edited
when behaviour changes?* This standard answers it, and sets the rule for **where a change goes** and **what
each step requires**.

## 2 · The two artifacts

| Artifact | Location | Role | Executes? |
|---|---|---|---|
| **`.ts` implementation** | `packages-galerina/galerina-core-compiler/src/*.ts` → built to `dist/` | The **decider of record** for every stage | **Yes** — `galerina check`/`build`/`run` import `packages-galerina/galerina-core-compiler/dist/index.js` |
| **`.fungi` twin** | `packages-galerina/galerina-core-compiler/src/self-hosted/*.fungi` | A self-hosted implementation, proven **R3 byte-parity** with its `.ts` (the WASM the twin emits ≡ the `.ts`-produced WASM) | **Not as the production backend** — it executes only in the differential/evidence harness (built + #105-admitted), never in `galerina check`/`build`/`run` |

The seven compiler stages: **lexer · parser · gir-emitter · runtime · type-checker · effect-checker ·
governance-verifier.**

## 3 · The two tiers of self-hosting (the crux)

A stage moves toward self-hosting in **two distinct steps**. Conflating them is the source of the confusion.

| Tier | What it means | Ledger effect | What is deleted | Preconditions |
|---|---|---|---|---|
| **Tier 1 — Authority flip** | The stage's `.fungi` becomes the authoritative **spec of record**; the `.ts` is **retained as a running differential shadow** that the parity gate keeps holding `===`. | A `twins` entry is added | **Nothing** — the `.ts` still executes; a flip retires **0 lines of code** | R3 byte-parity + mutation-kill non-vacuity + hash-pin + #105 admission + I-3 functional oracle; one owner condition-form nod per stage (I-4) |
| **Tier 2 — Full retirement** | The `.ts` is deleted; the `.fungi` both specifies **and** runs | (stage stays authoritative) | The stage's **`.ts` file** | **Deferred today.** Requires I-2 bootstrap-seed (a trusted stage-0 `.fungi`→WASM compiler, so `.fungi` compiles `.fungi` with no `.ts`) + I-3 oracle-before-deletion + a shadow-bake window. **The self-hosted backend does not exist yet, so no `.ts` is deleted.** |

**Current state:** the set of Tier-1-flipped stages is whatever the ledger
[`rd0528-compiler-authoritative-stages.json`](rd0528-compiler-authoritative-stages.json) `twins` array
lists — that JSON is the single source of truth and this prose deliberately carries **no count** so it
cannot rot behind it. All seven stages remain Tier-2 (their `.ts` still executes; no `.ts` is deleted).

## 4 · THE STANDARD — where a change goes

1. **Behaviour changes are made in `.ts`.** Because the `.ts`→`dist` is the compiler that actually runs
   (no self-hosted backend executes yet), any change to what the compiler *does* — a new diagnostic, a
   rule, a fix — is made in the `.ts`. This holds for **every** stage, flipped or not. Editing only the
   `.fungi` twin would change the spec but not the running compiler.
2. **A flip does not move execution.** A Tier-1 flip declares the `.fungi` the *spec of record*; it does
   **not** switch the running backend to `.fungi`. So a flipped stage keeps receiving `.ts` edits for
   behaviour, exactly as before the flip. The flip changes the **authority label**, not the build target.
3. **Keep the twin in parity where it covers the change.** If a change touches logic the twin models,
   update the twin and re-prove R3 parity (the parity test is the check). If it touches logic the twin
   does not model, the twin is unaffected and the stage-hash does not move (no re-baseline needed).

## 5 · Subset twins, and the retirement precondition

A `.fungi` twin may model only **part** of its stage's surface (a *subset twin*). Logic outside that
subset — for example, some governance diagnostics — lives only in the `.ts` until the twin grows to cover
it. This is expected at this phase and is not a defect: the `.ts` is the decider of record and enforces
the full surface.

The standard that follows:

- **New rules land in `.ts`** (the only place they run today).
- Additions outside the twin's modelled subset **do not move the stage-hash** and need no re-baseline.
- **Retirement precondition (the safety rule):** a stage's `.ts` may be deleted (Tier 2) **only after its
  `.fungi` twin covers the full enforced surface** of that stage — every diagnostic and rule the `.ts`
  enforces — verified by the parity gate. Deleting `.ts` while the twin is a subset would silently drop
  the uncovered enforcement. **A Tier-1 "authoritative" flip is therefore scoped to the parity-tested
  surface**; growing the twin to full coverage is a per-stage prerequisite of Tier 2.

## 5a · Editing an AUTHORITATIVE twin — the change ceremony

Once a stage is Tier-1 flipped, its `.fungi` is the owner-nodded spec of record — so **editing it is never
routine maintenance**, even when the edit is desirable (e.g. growing a subset twin toward full coverage).
The hash-pin exists to detect change to this artifact; if the author of a change also re-pins the baseline
under the old nod, the pin protects nothing and "authoritative" degrades to "latest edit wins."

**The answer is automatic:** everything in this project is zero-trust built, so no per-change interactive
ask is raised. The standing doctrine decides — an authoritative-twin edit is **allowed only through the
ceremony below, denied otherwise** — and the maintainer's control is *structural*, not conversational:
push custody means no twin change reaches the remote except through the owner's own push, which **is** the
countersign.

The ceremony, per change:

1. **Declared scope** — the proposer states, in the coordination record, exactly what changes ("mirror
   TYPE-033, nothing else"), so the verifier has something to check the diff against.
2. **Proposer ≠ verifier** — one party lands the source **plus a non-vacuity fixture** (the twin must
   *actually* emit on a triggering input and stay silent on a control — a dead string the parity regex
   cannot distinguish is a fabricated green); a *different* party independently verifies the diff is
   exactly the declared scope and re-proves parity.
3. **Re-pin only after verification** — the baseline `--update-baseline` is accepted once the independent
   re-prove passes, **not before**. The stage-hash gate is expected to be RED between the landing and the
   re-pin; that red is the ceremony working, not drift.
4. **Owner pushes last** — push custody is the standing countersign; no authoritative-twin change reaches
   the remote without the owner.

**Escalate only when the ceremony itself cannot be satisfied** — the scope can't be verified, no
independent verifier is available, or the change would *alter enforcement semantics* rather than grow
coverage/preserve parity (a semantics change is a design decision and rides the normal design flow, not
this ceremony).

## 5b · Scope — dev tools may stay `.ts`/`.mjs`

Self-hosting pressure applies to the **compiler stages**, not the tooling around them. It is acceptable
for the moment for dev tools — `scripts/` audits, gates, evidence producers, test harnesses — to remain
`.ts`/`.mjs`. The seven stages are the track; do not spend effort twinning the tooling.

## 6 · THE TOOLS — the silver plate (use these; never work from memory)

If memory or a summary disagrees with these tools, **the tools win.** The gate wiring is measured: the
standing enforcement runs inside `scripts/run-phase-close.mjs`, so it executes at every phase-close, not by
hand. Run these from the Galerina repo root:

| You want to know… | Run this | Notes |
|---|---|---|
| *What is flipped right now?* | read `docs/security/rd0528-compiler-authoritative-stages.json` | The ledger. Empty `twins` = nothing flipped. Never answer this from memory |
| *Are the authoritative stages still sound?* | `node scripts/audit-compiler-stage-twins.mjs` | The standing fail-closed gate (has `--self-test`). Wired into `run-phase-close.mjs` |
| *Each stage's evidence hash (item d)?* | `node scripts/gather-compiler-stage-hashes.mjs --json` | Builds all 7 stages → signed (ephemeral dev key) → #105-admitted; deterministic sha256 per stage (build-order-independent since #163) |
| *Is the hash still at its reviewed baseline?* | `node scripts/audit-compiler-stage-hashes.mjs` | Gates the baseline JSON; REDs visibly on drift — review, then `--update-baseline` (per §5a for authoritative stages) |
| *Is the evidence non-vacuous?* | `node scripts/audit-mutation.mjs` | Mutation-kill catalog (`RD0528_COMPILER`) — proves the parity evidence can actually fail |
| *Does the twin still byte-match its `.ts`?* | the `wat-p9-*-parity` tests | 11 files in `packages-galerina/galerina-core-compiler/tests/` — part of the core-compiler suite |
| *Is the twin functionally correct?* | `self-hosted-i3-functional-corpus.test.mjs` | The I-3 oracle: MUST-pass / MUST-fail corpus — functional correctness, not just byte-identity |
| *Twin behaviour in depth?* | the `self-hosted-*.test.mjs` family | 15 files, same tests dir |
| *Is a new governance code fail-closed?* | `security-type-codes-invariant.test.mjs` + `cli-security-type-gate.test.mjs` | The invariant gate REDs any type-checker FUNGI-K3/GOV-3VL code missing from `SECURITY_TYPE_CODES`; the CLI gate proves check exit 1 + build refusal through the real `galerina.mjs` |
| *Is a diagnostic code registered?* | `diagnostic-namespace.test.mjs` | Shrink-only allowlist vs the diagnostics registry; drives `diagnostic-pending-registration.txt` to empty |
| *Am I about to coin a taken code number?* | enumerate the emitting source first, then `diagnostic-namespace.test.mjs` | Never mint a `FUNGI-<FAMILY>-NNN` from memory or a summary — read the checker `.ts` that emits the literal; the registry lags. (The K3-002/003 collision is why.) |

**The rule, simple as that: stale memory is not an error state — it is the expected state. These tools are
the current truth; read them, run them, believe them.**

## 6b · Evidence and enforcement (source of record)

| Element | Where | Enforces |
|---|---|---|
| Authority ledger | `docs/security/rd0528-compiler-authoritative-stages.json` | A stage listed here is authoritative; an empty `twins` array means nothing is flipped |
| Standing gate | `scripts/audit-compiler-stage-twins.mjs` | Reads the ledger, fail-closed: every authoritative stage must stay `galerina check`-clean **and** still differential. Regression to shadow, or a failed check, is RED |
| R3 byte-parity | `wat-p9-*-parity` tests | The twin's WASM ≡ the `.ts`-produced WASM (with a non-vacuity control) |
| Mutation-kill | `scripts/audit-mutation.mjs` | The evidence is non-vacuous (a mutation is caught) |
| Hash-pin + #105 | `scripts/gather-compiler-stage-hashes.mjs` + `scripts/audit-compiler-stage-hashes.mjs` | Each stage's signed WASM is deterministic and admission-gated, and pinned to a reviewed baseline |
| I-3 functional oracle | `self-hosted-i3-functional-corpus.test.mjs` | The twin is functionally correct (MUST-pass / MUST-fail corpus), not merely byte-identical |
| Owner nod (I-4) | per stage | Each flip is authorised by an explicit owner condition-form nod over the stage's evidence pack |

**Separation:** this is the **compiler** self-hosting track (RD-0528). It is separate from the kernel
sentinel ledger (`docs/security/rd0361-authoritative-twins.json`) — flipping a kernel sentinel retires
zero lines of the `.ts` compiler.

## 7 · In one line

Until a self-hosted backend exists, the `.ts` is the compiler and the `.fungi` twins are its proof of
self-description: change behaviour in `.ts`, keep the twins in parity, flip *authority* per owner nod, and
never delete a `.ts` until its twin covers everything that `.ts` enforces.
