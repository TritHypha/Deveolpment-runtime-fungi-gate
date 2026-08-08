# RD-0753 — Reinventing the lowering: compile vs synthesize, two lanes, and the DSS shrink

> **R&D hub · 2026-08-08.** From the owner's question ladder — *"what if we reinvent the compiler?
> `.fungi → .gate → binary`; `.fungi → .gate → SLIDE → Lyth-Weaver → hardware`… get compute to binary
> ASAP… make `.gate` easy to change to binary in steps… `.fungi` converting to `.gate`… shrink or
> bypass DSS.wasm."* Everything below is grounded in source actually read and measured in
> `Galerina/memory-sandobx/` (sandbox lane; all other trees read-only). Companion to
> [[RD-0751-memory-index-not-warehouse-combination-matrix]].
> **ID:** RD-0753, next-free (RD-0752 taken by another session).

---

## §0 · Honesty tier, up front

This is a **direction with measured support**, not shipped capability. Read every claim at its tier:

| claim | tier |
|---|---|
| `.fungi` decomposes ≈ **66% structure / 29% compute / 11% mixed** | **MEASURED** (lexical estimate, control-calibrated; §3) |
| a passive fabric is constant-time, K3-native, verify-by-inspection | **MEASURED** (KAT + controls; §4) |
| re-admission at a boundary is a hash, not a recompile (~555 MB/s) | **MEASURED** (§4) |
| synthesize + verify-boundary + ternary is the top assurance combination | **MEASURED** (combination matrix; §4) |
| the compile-vs-synthesize split, the two lanes, "carry the receipt" | **REASONED** — largely names structure the estate already has |
| a working `.gate → binary` synthesizer | **NOT BUILT** — the prototype this RD recommends |

**Nothing here replaces the compiler or bypasses admission.** Two corrections the owner drove are
load-bearing and appear as their own sections: **§5 — some `.fungi` still needs SLIDE**, and
**§6 — every binary still passes Lyth-Weaver.**

---

## §1 · The idea: a compiler is trust-once; the estate is becoming a verified lowering chain

A classical compiler is a **trust-once monolith**: source → binary in one process you trust, and
after its optimiser runs you can no longer look at the binary and see the source. The estate is
already the opposite — SLIDE performs *"independent re-derivation / re-admission"*; Lyth-Weaver is
the *Verified Admission Fabric* (*"a manifest never authorizes code"*). Each arrow is a
**re-admission boundary**, not a trust hand-off.

The owner's insight sharpens this into a rule about **two kinds of artifact**:

- **`.fungi` computes** — types, expressions, arithmetic, decisions, exits. It genuinely needs a
  compiler; compute *should* collapse to instructions.
- **`.gate` connects** — parts, ports, wires, **no expressions** (*"it cannot add two numbers"*,
  `FUNGI-TO-GATE-LIKE-FOR-LIKE.md`). It is a **netlist**, already at hardware's abstraction level.

So `.gate` should be **synthesized, not compiled**. A compiler's optimiser fuses cells and destroys
the 1:1 correspondence; a **synthesizer** expands structure to structure and preserves it — which is
what lets you *re-derive the circuit from the binary* and prove the binary **is** the circuit.

---

## §2 · Two lanes

| lane | source | lowering | why |
|---|---|---|---|
| **compute** | `.fungi` | **compile** → GIR → `.slide` (or `.wasm`) | collapse meaning to instructions; trust a *verified* compiler, re-admitted at SLIDE |
| **authority** | `.gate` | **synthesize** → binary / ternary, in legible steps | preserve structure so admission verifies it gate-by-gate |

The `.gate → binary` synthesis, in legible steps, each with a receipt, each re-admittable:

1. `.gate` → **canonical netlist** (byte-identical under permutation)
2. netlist → **technology-independent gate graph** (each part → primitive K3 cells)
3. **bound netlist** (each cell → a concrete target cell, one digest per cell)
4. **placed image** (binary / ternary) whose netlist **re-derives** step 1

Because `.gate` has no expressions, this synthesis is **finite and total** — no Turing-complete
lowering to get lost in. That is what makes it *"easy to understand and change"*: at every step you
read a bounded graph of named parts.

---

## §3 · `.fungi → .gate`: measured decomposability (539 files)

The owner asked what happens if `.fungi` *converts* to `.gate` rather than riding the compiler.
`.gate` cannot compute, so every computation maps *"inside a part"* — the circuit sees a port, the
arithmetic stays `.fungi` behind it. So the question is: **how much of real `.fungi` is structure vs
leaf compute?** Measured with the `FUNGI-TO-GATE` map as a lexical classifier over 539 real files,
13,402 code lines:

| class | lines | share | becomes |
|---|---:|---:|---|
| **STRUCTURE** | 8,030 | **60%** | `.gate` wiring — passive fabric, no runtime |
| **COMPUTE** | 3,852 | **29%** | stays `.fungi` behind a port — **still needs SLIDE (see §5)** |
| **MIXED** | 1,520 | **11%** | a decision *on* a computed value — the entangled boundary |

**Structural fraction ≈ 66%** (splitting mixed 50/50). **218 of 300 code-bearing files read
mostly-structure.**

⚠️ **Tier:** lexical estimate. Control fired — a routing file read **83%** structure, an arithmetic
file **64%** — so the classifier discriminates, but the exact figure is what a real extractor would
settle. Call it **"roughly two-thirds."**

**What it means:** `.fungi → .gate` does **not remove the compiler — it shrinks it to the leaves.**
Two-thirds of a program becomes the authority lane's verifiable structure *automatically, derived
not hand-written*; one-third stays compiled compute behind clearly-marked ports. The developer keeps
writing one language; the toolchain **extracts** the `.gate` skeleton.

**Why it is faster — precisely.** `.fungi` does not compute faster. ~66% of it was **structure
wearing the costume of computation** — a runtime was re-executing routing as if it were work.
Synthesized to a passive fabric, that part becomes fixed geometry the runtime never touches again.
The ~29% real compute costs exactly what it always did. *Faster is the symptom; a smaller executed
surface is the cause.*

---

## §4 · Why the authority lane is worth it — the passive fabric (Galton board)

A passive peg fabric routes by fixed structure — the physical picture the owner supplied. Measured
(`bench-galton-passive-fabric.mjs`, `bench-architecture-combinations.mjs`), KAT-first:

- **Constant-time by construction.** Every input takes the *same* number of peg-hops → **no
  data-dependent timing**, the property RD-0391's secret-distance Lock-1 clause demands. A branchy
  compiler emitted **64 distinct** hop counts over 256 values — a timing side channel.
- **K3-native at 3-way pegs.** A ternary peg routes deny/unknown/allow in **one hop**; a binary peg
  needs **two** and wastes a bin — the dead-state tax, now as peg depth.
- **Verify-by-inspection.** Re-derive the routing table and a **moved peg is caught**. You cannot
  fingerprint a running CPU this way; you can fingerprint a fabric. This is *"re-derive the circuit
  from the binary."*
- **Combination matrix** ranked by assurance (prove output=input · catch a tamper · no dead state):
  **synthesize + verify-boundary + ternary wins**; **compile + trust-once + binary is last** and is
  the only combination that *misses an injected backdoor*.
- **Re-admission is a hash** (`bench-verified-lowering-chain.mjs`): ~**555 MB/s**. A chain of N
  verified lowerings costs N cheap hashes — **trust-once buys almost nothing back.**

★ Correction on the record: an earlier benchmark labelled `compile+trust-once+binary` as *"today's
shape."* **That was an overstatement and is retracted** — the estate is already `verify-boundary`
(SLIDE re-admission, Lyth-Weaver). The worst combination is what you would *drift into* by lowering
to opaque binary *before* admission, which is exactly why it is refused.

---

## §5 · ★ SOME `.fungi` STILL NEEDS SLIDE — this is not optional

The authority lane is not a replacement for SLIDE. **The ~29% leaf compute (and the compute half of
the ~11% mixed) is real arithmetic that `.gate` cannot express, and it lowers through the compute
lane: `.fungi → GIR → .slide bundle`, independently re-admitted by SLIDE exactly as today.**

Stated plainly, because it is the easiest thing to get wrong:

- `.gate` synthesis handles **structure only**. Anything that adds, multiplies, folds, or derives a
  value is a **leaf part** that stays `.fungi` and **must** cross the SLIDE re-admission boundary.
- SLIDE contracts already specify this intake — `36-CHECKED-FUNGI-PURE-ROUTING`,
  `39-CHECKED-FUNGI-PURE-SCALAR`, `48/50-…-RECORD`, etc. lower `.fungi` into the V2C executable GIR
  and the `.slide` envelope. **None of that is removed or bypassed.**
- The `.slide` bundle is the **preferred compute-lane target over `.wasm`** because it is
  independently re-admittable (digest-verified, refuse-never-fallback — the `REFUSED ≠ MISS` posture
  of RD-0751). `.wasm` is the only target that still requires the DSS sandbox (§6).
- The **~11% mixed** — a decision whose branch depends on a computed value — is the genuinely
  entangled boundary. Part of it moves to `.gate` (the decision shape), part stays `.fungi` (the
  value). A real extractor must split these per-site; this RD does **not** claim they all become
  structure.

**In one line:** the change makes ~two-thirds of a program run as verifiable `.gate` fabric; the
remaining third is `.fungi` compute that continues to go through **SLIDE**, unchanged.

### §5a · Why the compute lane cannot be cut — the "100% .gate app" argument, answered

A tempting objection: *if an AI writes an app 100% in `.gate` with no `.fungi`, then `.gate` can do
everything `.fungi` can — so map `.fungi → .gate` and delete the compute lane.* It does not follow,
for a reason that is now **verified in source**, not asserted:

- **`.gate` has no arithmetic, by design** (`FUNGI-TO-GATE-LIKE-FOR-LIKE.md`: *"No equivalent, by
  design. A circuit has no arithmetic. Numbers appear only as…"*). It *cannot add two numbers.*
- **`.gate` v3 is machine-checked ACYCLIC** (`gate-v3-condense.ts` → `verifyGateGraphAcyclic`;
  `SEMANTICS.md` SEM-001). An acyclic, expression-free circuit computes a **fixed, bounded function**
  of its inputs. It is provably **not a general computer** — no loop, no unbounded recursion, no
  arithmetic.

So a "100% `.gate` app" hides a move: **where did the computation go?** Either the app does no real
arithmetic (pure routing — a narrow app that proves nothing about computing), or the arithmetic lives
**inside the parts the circuit names**, and those parts are still `.fungi` leaf compute. The compute
did not vanish; it moved behind a port. **Cutting the compute lane would not remove the compute — it
would only hide where it runs, and lose SLIDE's verification of it.**

**Where the objection is genuinely right — and why we still decline it.** At the raw *logic-gate*
level (AND/OR/XOR), gates are universal: an adder *is* a gate network, a CPU *is* gates. So one
*could* express arithmetic as gates. But that is a **different `.gate`** — a full hardware
description language (Verilog-class) — and adopting it **destroys the three properties `.gate` exists
for**: (1) verify-by-inspection dies — a 32-bit multiplier is thousands of gates, not human-legible;
(2) the bounded/acyclic guarantee that makes it provable is swamped; (3) it is bigger and slower than
the compiled path — silicon already has an ALU, so a compiled `mul` is one instruction versus a
hand-wired multiplier. **`.gate` deliberately trades "can compute anything" for "can be verified by
looking at it." Making it compute arithmetic trades that back — you get Verilog and lose the reason
`.gate` exists.** The compute lane is therefore not a limitation to cut; it is the **right tool** for
the ~29%, and SLIDE is its verification boundary.

---

## §6 · Every binary still passes Lyth-Weaver — and the DSS.wasm rebuild

### 6.1 Admission is not bypassed (the owner's correction)

An earlier diagram drew the `.gate → binary` lane reaching hardware *without* Lyth-Weaver. **That
was wrong.** All binary — compiled *or* synthesized — converges on the admission fabric. The lanes
differ only in **what they hand Lyth-Weaver to admit**:

| lane | what Lyth-Weaver admits | how |
|---|---|---|
| compute (`.fungi`) | an opaque `.slide` bundle | re-derive the bundle, check the digest — *trust the compiler, verify the artifact* |
| authority (`.gate`) | a **re-derivable** binary/ternary image | re-derive the netlist **from the binary**, match gate-by-gate — *verify the binary IS the circuit* |

The synthesis lane does not skip admission; it gives admission a **stronger, cheaper** thing to
check. **No binary reaches hardware un-admitted.**

### 6.2 DSS.wasm — full notes for the rebuild (which is happening anyway)

Per the estate's own notes, the DSS.wasm supervisor (#102–106) is **already being retired
piecewise** — *"the former production sidecar is not restored wholesale; each component is reused or
adapted where it satisfies SLIDE/VOK contracts, and only incompatible parts are rebuilt"*
(`Galerina/docs/TODO.md`). The **DSS `.fungi` decision core is preserved as completed**, and the
wasmtime route (`dss-host`) is *measured inert to the core gates*. This RD's findings bear directly
on that rebuild:

1. **DSS.wasm is a sandbox for executing COMPUTE.** The ~66% structure needs **no sandbox** — it
   synthesizes to a passive fabric admitted by inspection. So the rebuild should scope DSS.wasm to
   the **leaf-compute** surface (~29%), not the whole program.
2. **The DSS decision core is `.fungi` — i.e. structure.** By §3 it is majority-structural, so it is
   the **first candidate to synthesize to a `.gate` fabric and leave wasm behind.** Rebuilding the
   decision core *as wasm* would re-encode structure that no longer needs a runtime.
3. **Prefer `.slide` over `.wasm` for the compute leaves.** A `.slide` bundle is independently
   re-admittable and needs **no DSS sandbox**; `.wasm` is the only target that still does. Every
   compute leaf that can lower to `.slide` shrinks DSS's remaining job.
4. **What DSS.wasm shrinks to:** after (1)–(3), DSS's residual is *only* the compute leaves that
   genuinely require a wasm sandbox (foreign/opaque execution that cannot re-admit as `.slide`). On
   this corpus that is the ~29% upper bound, and less to the extent leaves lower to `.slide`.
5. **Bypass entirely?** Only if the leaf compute is also lowered off wasm — native or ternary
   synthesis. That is **target-dependent and not proven here**; the honest position is *shrink DSS
   to the irreducible compute sandbox, do not assume it disappears.*
6. **Carry-over defects.** Two DSS defects were handed to main — `dss/trap-handler.fungi:48` and
   `:74`. The rebuild should close these with their detectors (a fix and its detector are one unit),
   and the rebuilt DSS must still converge on Lyth-Weaver like every other path (§6.1).

**Net for the rebuild:** *build DSS.wasm for the compute leaves that cannot re-admit as `.slide`,
synthesize the structural decision core to a `.gate` fabric instead of re-encoding it as wasm, and
route everything — fabric, `.slide`, residual `.wasm` — through Lyth-Weaver.*

---

## §7 · Recommendations

| # | action | tier |
|---|---|---|
| 1 | **Prototype the `.gate → binary` synthesizer** on one real circuit, with the re-derivation KAT (prove the binary IS the circuit) before any doctrine | the real next step |
| 2 | Build a real `.fungi → .gate` **extractor** and re-measure §3's 66% on parsed (not lexical) structure | confirms the headline |
| 3 | Scope the **DSS.wasm rebuild** to compute leaves; synthesize the decision core to a fabric; prefer `.slide` (§6.2) | feeds work already planned |
| 4 | Keep **SLIDE on the compute lane** unchanged; it is load-bearing for the ~29% (§5) | do-not-break |
| 5 | Adopt the **BFS locality reorder** (measured 1.86×, RD-0751) where the graph path helps | banked win, separate |

## §8 · Artifacts

`Galerina/memory-sandobx/` (with a copy of this document):
`bench-architecture-combinations.mjs` · `bench-galton-passive-fabric.mjs` ·
`bench-verified-lowering-chain.mjs` · `bench-hw-optimisation.mjs` (the reorder) ·
plus RD-0751's combination-matrix / tier / cpu benches. The `.fungi` decomposability classifier ran
from the session scratchpad (lexical, not committed as a gate).

*Provenance: owner question ladder 2026-08-08 · `FUNGI-TO-GATE-LIKE-FOR-LIKE.md` · SLIDE
`CHECKED-FUNGI-*` contracts 34/35/36/39/48/50/51 · lyth-weaver `ARCHITECTURE-WISHLIST.md` (Verified
Admission Fabric) · RD-0388/0391/0400 (hot-lane triple-lock) · `Galerina/docs/TODO.md` (DSS
retirement) · RD-0751 (measurements). Paths redacted; no keys. Contact hello@trithypha.dev.*
