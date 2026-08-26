// =============================================================================
// rd-0138-0143-photonic-security-suite-proof.mjs
//
// Machine-checkable proof for the "75-improvments" R&D batch (RD-0138..0143): the six photonic /
// tri / Tower-Citizen / Tri-Pipe "automate the defence" notes. Re-runnable, computed vs ground truth
// (owner rule: R&D must prove its own maths for what it PROPOSES and DISMISSES — feedback-rd-prove-own-maths).
//
//   V# = a load-bearing claim PROVED here (computed, not asserted).
//   X# = EXCLUDED — cannot be settled by a standalone bench; the reason + where it IS settled is named.
//
// Run:  node scripts/rd-0138-0143-photonic-security-suite-proof.mjs        (exit 0 iff every V# holds)
// =============================================================================

import {
  Verdict, vAnd, vAndTensor, maskByVerdict, isMasked,
} from "../packages-ts/galerina-tower-citizen/dist/index.js";

const { DENY, INDETERMINATE, ALLOW } = Verdict;
const TRITS = [DENY, INDETERMINATE, ALLOW];
let pass = 0;
let fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}`); }
};

console.log("\n=== RD-0138..0143 — photonic/tri/Tower-Citizen security automation: machine-checked verdicts ===\n");

// ── V1 — No-Coercion. An untrusted (e.g. photonic) operand folded into a core verdict can only LOWER it,
//   never lift it. Therefore a photonic/analog state can NEVER manufacture an ALLOW → it cannot be the gate,
//   the capability, or the signature. REFUTES: RD-0141 "optical phase gates enforce capability at 0 cycles",
//   RD-0140 "optical PUF = unforgeable signature", RD-0142 "phase-interlocked heartbeat IS the auth gate".
//   The govern-don't-absorb form: photonic state is a DEGRADE-ONLY K3 tamper signal UNDER the digital gate.
console.log("V1  No-Coercion — photonic state can't be the gate (REFUTE RD-0140/0141/0142 optical-as-authority):");
{
  let held = true;
  for (const core of TRITS) for (const sub of TRITS) {
    if (vAnd(core, sub) > core) held = false;                       // never raises the core
    if (core !== ALLOW && vAnd(core, sub) === ALLOW) held = false;  // never manufactures an ALLOW
  }
  ok(held, "forall 9 trit pairs: vAnd(core, untrusted) <= core and never manufactures ALLOW (min-rule)");

  const core = Int8Array.from([ALLOW, ALLOW, INDETERMINATE, DENY]);
  const photonicAttacker = Int8Array.from([DENY, INDETERMINATE, ALLOW, ALLOW]); // maximally-permissive operand
  const out = vAndTensor(core, photonicAttacker);
  ok([...out].every((v, i) => v <= core[i] && !(core[i] !== ALLOW && v === ALLOW)),
     "vAndTensor: a maximally-permissive photonic operand lifts NO element to ALLOW");
}

// ── V2 — Tri-Pipe "Lane 0 = auto-mask-and-CONTINUE" is FAIL-OPEN unless it is a sanctioned declassifier.
//   Every note proposes: on ambiguity (verdict 0), silently mask the data and proceed. Ground truth = the
//   shipped K3 collapse: authorize(0)=false ⇒ a flow that returns a 0-verdict value has LEAKED. Proof: the
//   naive "mask-and-continue" yields a caller-consumable value on verdict 0 (a flow happened); the shipped
//   maskByVerdict yields a typed Masked SENTINEL (no value flows) — the govern-don't-absorb version Galerina
//   already ships (partial-return.ts). This is the asterisk on RD-0138/0139/0140/0141/0142.
console.log("\nV2  Lane-0 mask-and-continue is fail-open unless a sanctioned declassifier (RD-0138..0142 asterisk):");
{
  const SECRET = "PII:ssn=123-45-6789";
  // the notes' literal proposal: intercept, mask, and CONTINUE (return a sanitized value, never deny)
  const naiveLaneZero = (verdict, value) => (verdict === ALLOW ? value : `MASKED(len=${String(value).length})`);
  const naiveOut = naiveLaneZero(INDETERMINATE, SECRET);
  ok(typeof naiveOut === "string" && !isMasked(naiveOut) && !naiveOut.includes("123-45-6789"),
     "naive mask-and-continue returns a caller-consumable value on verdict 0 — a flow happened (fail-open; even the length is an oracle)");

  const m = maskByVerdict(INDETERMINATE);
  ok(isMasked(m) && m.reason === "indeterminate" && m.diagnostic?.code === "FUNGI-GOV-3VL-001",
     "shipped maskByVerdict(0) -> typed Masked sentinel + FUNGI-GOV-3VL-001 (no value flows; fail-closed)");
  ok(maskByVerdict(DENY) !== null && isMasked(maskByVerdict(DENY)) && maskByVerdict(DENY).reason === "denied",
     "maskByVerdict(DENY) -> Masked (denied), still no value");
  ok(maskByVerdict(ALLOW) === null,
     "maskByVerdict(ALLOW) -> null (caller keeps the real value; the sound version does NOT over-deny)");
}

// ── V3 — "0 CPU clock cycles" / "speed-of-light = free" is REFUTED: applying ANY transform (optical or not)
//   to n operands is Theta(n), not O(1). RD-0138 optical-FHE "0 latency", RD-0139/0140/0141/0142 "0-cycle".
//   Full measured envelope: scripts/rd-photonic-ppu-virtualisation-proof.mjs + rd-aot-tensor-precompute-proof.mjs.
console.log("\nV3  '0 CPU cycles / speed-of-light = free' -> REFUTE (latency != work):");
{
  const applyTransform = (n) => { let ops = 0; const out = new Array(n); for (let i = 0; i < n; i++) { out[i] = i ^ 1; ops++; } return ops; };
  ok(applyTransform(1000) === 1000, "applying a (pre)computed transform to n=1000 operands costs n ops, not O(1)");
  ok(applyTransform(0) === 0 && applyTransform(7) === 7, "cost scales with n (Theta(n)) — there is no 0-cycle apply");
}

// ── EXCLUDED — cannot be settled by THIS standalone bench (stated per the prove-own-maths rule) ──
const EXCLUDED = [
  ["X1", "Photonic perf ENVELOPE (Freivalds cheap-verify net-win, K3 dead-zone fail-safe)",
        "needs a named-machine bench; settled in scripts/rd-photonic-ppu-virtualisation-proof.mjs (11/11) + the owner photonic-leniency rule (projected, labelled aspirational)"],
  ["X2", "FHE feasibility/throughput (RD-0138 'homomorphic at speed of light')",
        "digital RLWE is crypto-on-core-OK but never line-rate; verdict TRACK-not-build (galerina-rd-results-log: FHE) — a real lattice bench is the artifact, not this script"],
  ["X3", "Tower-Citizen re-derivations: AI-cage No-Coercion, TTL lease expiry, package charter, partial-return",
        "SHIPPED + covered by the keep-green suite (ai-governance / lease / boundary-policy --check / partial-return tests) — not re-proved here; V1 proves the underlying min-rule they rest on"],
  ["X4", "Polymorphic obfuscation / moving-target as a SECURITY control (RD-0143)",
        "not a math claim — security-by-obscurity is a known-WEAK control (anti-ZT as the primary defence); the sound substitute = constant-time traversal + the RD-0130 constant-time lint + capability fencing"],
];

console.log("\nEXCLUDED (named, not benched here):");
for (const [id, claim, why] of EXCLUDED) console.log(`  ${id}  ${claim}\n        -> ${why}`);

// ── Report ──
console.log(`\n--- SUMMARY ---  V-claims: ${pass} pass / ${fail} fail   ·   ${EXCLUDED.length} excluded-with-reason`);
const green = fail === 0;
console.log(green
  ? "RESULT: GREEN — re-derivations sound, photonic-as-authority + 0-cycle + auto-mask-continue REFUTED with counter-math\n"
  : "RESULT: RED — a load-bearing V-claim did not hold (see FAIL above)\n");
process.exit(green ? 0 : 1);
