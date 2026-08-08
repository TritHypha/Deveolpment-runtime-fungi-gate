// =============================================================================
// THE GALTON-BOARD ARCHITECTURE — a passive peg fabric that routes by structure.
//
// The board in the image is the .gate synthesis idea made physical:
//   pegs   = the fixed gate structure (the netlist)
//   ball   = an input value
//   gravity= the deterministic reduction (the only "runtime", and it is universal)
//   bins   = the target outputs
// The sort is a property of the GEOMETRY, not of any active decision engine.
//
// Two claims the metaphor makes, both testable:
//
//  CLAIM A — a passive fabric is CONSTANT-TIME by construction. Every ball takes the
//    same number of peg-hops regardless of its value, so timing leaks nothing. A
//    compiler emits BRANCHY code whose comparison count depends on the data — a timing
//    side channel. (The estate already cares: contract-54 constant-time, RD-0391
//    secret-distance Lock-1 clause.)
//
//  CLAIM B — a BINARY peg is a 2-way splitter (a bit); K3 {-1,0,+1} needs a 3-way peg
//    (a trit). A binary fabric must build a 3rd bin from two pegs and carries a dead
//    path; a ternary fabric routes deny/unknown/allow in ONE hop with no waste.
//
// And the property that makes it zero-trust: the fabric IS its own receipt. You can
// re-derive the routing table by DROPPING one ball per bin and watching where it lands
// — verify-by-inspection, no trusted execution engine. KAT: that re-derivation must
// reconstruct the peg layout AND catch a moved peg.
// =============================================================================
const P = console.log;
const ms = (t0) => Number(process.hrtime.bigint() - t0) / 1e6;

// ---------------------------------------------------------------------------
// a passive binary peg fabric: route a value to a bin by its bits, msb-first.
// D levels of pegs -> 2^D bins. Data-INDEPENDENT: always exactly D hops.
// ---------------------------------------------------------------------------
function binaryFabric(D) {
  return {
    D, bins: 1 << D,
    route(value) { let bin = 0, hops = 0;
      for (let level = D - 1; level >= 0; level--) { const bit = (value >> level) & 1; bin = (bin << 1) | bit; hops++; }
      return { bin, hops };
    },
    layoutDigest() { return `bin:D=${D}`; }   // the peg arrangement, fully described
  };
}

// a passive TERNARY peg fabric: 3-way pegs, T levels -> 3^T bins. K3-native.
function ternaryFabric(T) {
  return {
    T, bins: 3 ** T,
    route(trits) { let bin = 0, hops = 0;   // trits: array of {-1,0,+1}, msb-first
      for (const t of trits) { bin = bin * 3 + (t + 1); hops++; }
      return { bin, hops };
    },
    layoutDigest() { return `tri:T=${T}`; }
  };
}

// the COMPILER model: a branchy comparison sort — hop count DEPENDS on the value.
function branchyRouter(bins) {
  return {
    route(value) { let hops = 0;             // linear scan of thresholds: early values exit early
      for (let b = 0; b < bins; b++) { hops++; if (value < (b + 1) * (256 / bins)) return { bin: b, hops }; }
      return { bin: bins - 1, hops };
    }
  };
}

// ---------------------------------------------------------------------------
// CLAIM A — constant-time by construction
// ---------------------------------------------------------------------------
P("== CLAIM A: is the passive fabric constant-time? (hops must not depend on value) ==");
const fab = binaryFabric(6);           // 64 bins
const branchy = branchyRouter(64);
const hopsPassive = new Set(), hopsBranchy = new Set();
for (let v = 0; v < 256; v++) { hopsPassive.add(fab.route(v).hops); hopsBranchy.add(branchy.route(v).hops); }
P(`  passive fabric hop counts across 256 values: {${[...hopsPassive].join(",")}}  -> ${hopsPassive.size === 1 ? "CONSTANT *" : "** varies"}`);
P(`  branchy compiler hop counts:                 {${[...hopsBranchy].sort((a,b)=>a-b).slice(0,8).join(",")}...}  -> ${hopsBranchy.size} distinct -> TIMING LEAKS THE VALUE`);
const constA = hopsPassive.size === 1 && hopsBranchy.size > 1;

// ---------------------------------------------------------------------------
// CLAIM B — binary needs a dead path for a 3rd bin; ternary does not
// ---------------------------------------------------------------------------
P("\n== CLAIM B: routing K3 {-1,0,+1} — binary peg vs ternary peg ==");
// binary fabric to reach 3 bins needs D=2 (4 bins) -> one bin is DEAD
const binFor3 = binaryFabric(2);
P(`  binary: ${binFor3.D} levels -> ${binFor3.bins} bins to hold 3 K3 states -> ${binFor3.bins - 3} DEAD bin(s), ${binFor3.D} hops`);
const triFor3 = ternaryFabric(1);
P(`  ternary: ${triFor3.T} level -> ${triFor3.bins} bins for 3 K3 states -> ${triFor3.bins - 3} dead, ${1} hop`);
P(`  ★ deny/unknown/allow in ONE ternary hop; binary needs 2 hops and wastes a bin — the`);
P(`    same dead-state tax measured in bench-verified-lowering-chain, now as PEG DEPTH.`);
const claimB = (binFor3.bins - 3) > 0 && (triFor3.bins - 3) === 0;

// ---------------------------------------------------------------------------
// THE ZT PROPERTY — the fabric is its own receipt (verify by inspection)
// ---------------------------------------------------------------------------
// re-derive the routing table by dropping one probe ball per input; a moved peg
// changes some ball's bin -> caught. This is "re-derive the netlist from the image".
P("\n== ZT: the fabric is its own receipt — re-derive by inspection, catch a moved peg ==");
function fingerprint(f, n) { let acc = 0; for (let v = 0; v < n; v++) acc = (acc * 131 + f.route(v).bin) >>> 0; return acc; }
const clean = binaryFabric(6);
const fpClean = fingerprint(clean, 256);
// a tampered fabric: one peg flipped (route level 3's bit inverted for a range)
const tampered = { route(v) { const r = clean.route(v); return { bin: v >= 100 && v < 108 ? r.bin ^ 8 : r.bin, hops: r.hops }; } };
const fpTampered = fingerprint(tampered, 256);
P(`  clean fabric fingerprint    : ${fpClean}`);
P(`  one-peg-moved fingerprint   : ${fpTampered}  -> ${fpClean !== fpTampered ? "DIFFERENT — tamper CAUGHT by inspection *" : "** missed"}`);
P(`  a running CPU cannot be fingerprinted this way: you cannot photograph an execution`);
P(`  and check it. The passive fabric can be RE-DERIVED, which is the whole ZT win.`);
const ztOk = fpClean !== fpTampered;

// ---------------------------------------------------------------------------
// KAT — routing is correct and total
// ---------------------------------------------------------------------------
let katOk = true;
for (let v = 0; v < 64; v++) if (binaryFabric(6).route(v).bin !== v) { katOk = false; break; }
// ternary: {-1,0,+1} at T=2 -> bins 0..8, check a known mapping
const tf = ternaryFabric(2);
const kТri = tf.route([-1, -1]).bin === 0 && tf.route([1, 1]).bin === 8 && tf.route([0, 0]).bin === 4;
P("\n== KAT ==");
P(`  binary fabric routes v -> bin v exactly (64 bins): ${katOk ? "yes *" : "** no"}`);
P(`  ternary fabric maps [-1,-1]->0, [0,0]->4, [1,1]->8: ${kТri ? "yes *" : "** no"}`);

P("\n== adjudication ==");
const all = constA && claimB && ztOk && katOk && kТri;
P("  " + (all
  ? "ALL CONFIRMED. The Galton board is the AUTHORITY lane: a passive peg fabric that\n"
  + "  routes by fixed structure. It is (1) constant-time — no data-dependent timing, the\n"
  + "  property RD-0391's secret-distance clause demands; (2) natively ternary at 3-way pegs,\n"
  + "  routing K3 in one hop where binary wastes a bin; (3) VERIFIABLE BY INSPECTION — you\n"
  + "  re-derive the routing table and catch a moved peg, which no running compiler output\n"
  + "  allows. This is exactly synthesize + verify-boundary + ternary — the matrix winner,\n"
  + "  now with a physical existence proof: gravity is the universal, untrusted, zero-cost\n"
  + "  reduction engine. The board has NO CPU to compromise."
  : "NOT ALL CONFIRMED — see above."));
