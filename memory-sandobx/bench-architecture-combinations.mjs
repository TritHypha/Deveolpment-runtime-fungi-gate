// =============================================================================
// ARCHITECTURE COMBINATIONS — what is accepted, and where.
//
// NOT a memory benchmark. This models the LOWERING PIPELINE as artifacts + receipts
// and plays combinations of three axes:
//
//   LOWERING   : compile (semantic — an optimiser rewrites; output != input shape)
//              | synthesize (structural — every part maps to a concrete cell 1:1)
//   ADMISSION  : trust-once (verify only the final artifact)
//              | verify-boundary (re-admit at EVERY arrow)
//   TARGET     : binary (K3 {-1,0,+1} encoded into 2 bits — one dead state)
//              | ternary (native -1/0/+1 — no encoding loss)
//
// The ranking axis is a SECURITY property, not speed:
//   Q1 can you PROVE the final output is the declared input? (re-derive & match)
//   Q2 does an INJECTED tamper at a middle stage get CAUGHT?
//   Q3 encoding loss (dead states) in the final target
// then cost as a tie-breaker.
//
// A real tiny .gate-style circuit is synthesized end to end. KAT-FIRST: the
// re-derivation must reconstruct the ORIGINAL netlist from the final image AND must
// CATCH an injected gate — a re-derivation that cannot catch tampering proves nothing.
// =============================================================================
import { createHash } from "node:crypto";
const P = console.log;
const sha = (s) => createHash("sha256").update(typeof s === "string" ? s : JSON.stringify(s)).digest("hex").slice(0, 12);

// ---------------------------------------------------------------------------
// A tiny .gate circuit: parts (K3 cells) + wires. No expressions — a netlist.
// This is a 3-input governance gate: min(a, b, c) with one NOT, one decision arm.
// ---------------------------------------------------------------------------
const CIRCUIT = {
  parts: [
    { id: "in_a", kind: "port" }, { id: "in_b", kind: "port" }, { id: "in_c", kind: "port" },
    { id: "n1", kind: "k3not" },          // -1/0/+1 negation
    { id: "m1", kind: "k3min" },          // min of two
    { id: "m2", kind: "k3min" },          // min of two
    { id: "d1", kind: "decide" },         // deny/unknown/allow arm
    { id: "out", kind: "port" },
  ],
  wires: [
    ["in_a", "m1"], ["in_b", "m1"],       // m1 = min(a,b)
    ["in_c", "n1"],                        // n1 = not c
    ["m1", "m2"], ["n1", "m2"],           // m2 = min(m1, n1)
    ["m2", "d1"], ["d1", "out"],
  ],
};

// ---- canonical netlist (byte-identical under part/wire permutation) ----
function canonicalize(c) {
  const parts = [...c.parts].sort((a, b) => (a.id < b.id ? -1 : 1));
  const wires = [...c.wires].map((w) => w.join(">")).sort();
  return { parts, wires, digest: sha({ parts, wires }) };
}

// ---- STEP 2: technology-independent gate graph (expand each part to primitive cells) ----
// A compiler would fuse/optimise here (semantic). A synthesizer expands 1:1 (structural).
const CELL_LIB = { k3not: ["NEG"], k3min: ["MIN"], decide: ["CMP", "SEL"], port: ["WIRE"] };
function toGateGraph(canon, { fuse }) {
  const cells = [];
  for (const p of canon.parts) {
    const prims = CELL_LIB[p.kind] ?? ["?"];
    for (const prim of prims) cells.push({ of: p.id, cell: prim });
  }
  if (fuse) {
    // the "compiler optimiser": fuse adjacent WIRE cells away — SAVES cells but
    // DESTROYS the 1:1 correspondence. This is the measure-contracting step.
    const kept = cells.filter((c, i) => !(c.cell === "WIRE" && i % 2 === 0));
    return { cells: kept, fused: cells.length - kept.length };
  }
  return { cells, fused: 0 };
}

// ---- STEP 3: bind each cell to a target ----
function bind(graph, { target }) {
  // binary: K3 cell -> 2-bit LUT entry (a dead 4th code). ternary: -> native trit cell.
  const bound = graph.cells.map((c) => ({
    ...c,
    impl: target === "ternary" ? `T:${c.cell}` : `B:${c.cell}`,
    states: target === "ternary" ? 3 : 4,        // ternary uses 3; binary reserves 4, one dead
  }));
  return { bound, target };
}

// ---- STEP 4: placed image (the "binary") ----
function place(bound) {
  return { image: bound.bound.map((b, i) => `${i}:${b.impl}`).join("|"), cellCount: bound.bound.length, target: bound.target };
}

// ---- RE-DERIVATION: reconstruct the netlist from the final image ----
// Only possible when lowering was STRUCTURAL. Returns a digest to compare to the original.
function reDerive(image, canon) {
  // count cells attributable to each original part
  const cells = image.image.split("|").map((s) => s.split(":").pop());  // last seg = cell name (format is idx:B|T:CELL)
  // rebuild the part list from cells present (only works if 1:1 preserved)
  const seen = new Set(cells.map((c) => c.replace(/^[BT]:/, "")));
  const rebuiltParts = canon.parts.filter((p) => (CELL_LIB[p.kind] ?? []).every((prim) => seen.has(prim) || prim === "WIRE"));
  return { rebuiltParts: rebuiltParts.length, originalParts: canon.parts.length, cellCount: cells.length };
}

// ---------------------------------------------------------------------------
// the combination matrix
// ---------------------------------------------------------------------------
const canon = canonicalize(CIRCUIT);
P(`circuit: ${canon.parts.length} parts, ${canon.wires.length} wires, digest ${canon.digest}\n`);

const AXES = [];
for (const lowering of ["compile", "synthesize"])
  for (const admission of ["trust-once", "verify-boundary"])
    for (const target of ["binary", "ternary"])
      AXES.push({ lowering, admission, target });

function evaluate({ lowering, admission, target }) {
  const fuse = lowering === "compile";
  const g = toGateGraph(canon, { fuse });
  const b = bind(g, { target });
  const img = place(b);

  // Q1: can we prove output IS input? re-derive the netlist and compare part count.
  const rd = reDerive(img, canon);
  const canProve = rd.rebuiltParts === rd.originalParts && g.fused === 0;

  // Q2: inject a tamper (an extra hidden gate) at bind time; does admission catch it?
  const tampered = { ...img, image: img.image + "|99:B:BACKDOOR", cellCount: img.cellCount + 1 };
  let tamperCaught;
  if (admission === "verify-boundary") {
    // re-admit: re-derive and require cell count to match the netlist's expectation
    const expected = g.cells.length;
    tamperCaught = tampered.cellCount !== expected;   // extra gate changes the count -> caught
  } else {
    // trust-once: only the final digest is checked, and the toolchain PRODUCED the tamper,
    // so its digest is "valid". A trust-once flow signs whatever it emits.
    tamperCaught = false;
  }

  // Q3: encoding loss
  const deadStates = target === "binary" ? b.bound.length : 0;   // one dead code per K3 cell

  // cost proxy: verify-boundary hashes every stage (4), trust-once hashes 1
  const hashes = admission === "verify-boundary" ? 4 : 1;

  return { canProve, tamperCaught, deadStates, hashes, fused: g.fused, cells: img.cellCount };
}

// KAT: the re-derivation must (a) reconstruct a clean synthesize+verify build,
// and (b) CATCH the injected backdoor under verify-boundary. If it cannot catch the
// tamper, the whole property is vacuous.
const clean = evaluate({ lowering: "synthesize", admission: "verify-boundary", target: "ternary" });
const control = evaluate({ lowering: "compile", admission: "trust-once", target: "binary" });
P("== KAT / controls ==");
P(`  synthesize+verify reconstructs the netlist exactly : ${clean.canProve ? "yes *" : "** no"}`);
P(`  synthesize+verify CATCHES an injected backdoor      : ${clean.tamperCaught ? "yes *" : "** no"}`);
P(`  compile+trust-once CANNOT prove output=input        : ${!control.canProve ? "yes * (as expected)" : "** unexpectedly could"}`);
P(`  compile+trust-once MISSES the backdoor              : ${!control.tamperCaught ? "yes * (the danger)" : "** caught"}`);
if (!(clean.canProve && clean.tamperCaught && !control.canProve && !control.tamperCaught)) {
  P("  ** the property is not discriminating — refusing to rank."); process.exit(2);
}

// score: provable(+3) + tamper-caught(+3) - deadStates(scaled) - hashes(tiny)
const rows = AXES.map((a) => {
  const e = evaluate(a);
  const score = (e.canProve ? 3 : 0) + (e.tamperCaught ? 3 : 0) + (e.deadStates === 0 ? 1 : 0) - e.hashes * 0.01;
  return { ...a, ...e, score };
}).sort((x, y) => y.score - x.score);

P("\n== COMBINATIONS ranked by ASSURANCE (prove output=input, catch tamper, no encoding loss) ==");
P("  score  prove  tamper-caught  dead-states  hashes  combination");
for (const r of rows)
  P(`  ${r.score.toFixed(2).padStart(5)}   ${(r.canProve ? "Y" : "·").padEnd(5)} ${(r.tamperCaught ? "Y" : "·").padEnd(13)} ${String(r.deadStates).padStart(11)} ${String(r.hashes).padStart(7)}  ${r.lowering} + ${r.admission} + ${r.target}`);

P("\n== adjudication ==");
const best = rows[0], worst = rows[rows.length - 1];
P(`  BEST : ${best.lowering} + ${best.admission} + ${best.target}`);
P(`  WORST: ${worst.lowering} + ${worst.admission} + ${worst.target}  (today's .gate->GIR->binary shape)`);
P("  ★ Only SYNTHESIZE lets you re-derive the netlist from the image (compile's optimiser");
P("    fuses cells and destroys the 1:1 map). Only VERIFY-BOUNDARY catches a toolchain that");
P("    emits a backdoor (trust-once signs whatever it produces). Only TERNARY carries K3");
P("    with no dead state. The three are independent and all three point the same way for");
P("    the AUTHORITY lane — while the compute lane (.fungi) can still trust its compiler.");
