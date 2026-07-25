/**
 * RD-0528 step 1 — `Char.fromCode` lowers to real WASM, and REFUSES what the interpreter refuses.
 *
 * Why this exists. The owner ruled that `.fungi` string literals decode `\u` escapes with UTF-16
 * length semantics. Decoding needs Int -> Char, and R&D measured that `Char.fromCode` did not
 * survive WAT assembly at all: "calls function(s) neither defined nor imported: $fromCode" (their
 * 0344) — the emitter had no case for it, so it fell through to the generic host-call path and
 * emitted a call to a function nobody defines. It failed at ASSEMBLY, i.e. fail-closed before
 * signing, but a decode built on it would have passed Stage-A and died in Stage-B.
 *
 * Why it is NOT lowered as identity. A Char IS its code point i32 in this backend (see the
 * `codePoint` identity case in wat-emitter.ts), so the VALUE is the argument unchanged — but
 * stdlib.ts's `Char.fromCode` calls String.fromCodePoint with no range check and therefore THROWS
 * on a negative or > 0x10FFFF code point. An identity lowering would have silently accepted input
 * the reference rejects: a fail-OPEN introduced into the WASM backend while fixing a different
 * divergence. Routing through the `__char_from_code` host function re-uses the reference's own
 * String.fromCodePoint, so the refusal is parity by construction rather than a re-derived rule.
 *
 * The refusal rows are the point; the value rows are the controls that stop them passing vacuously.
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import * as L from "../dist/index.js";

const CONTROL_SRC = `pure flow ctl(n: Int) -> Int
contract { intent { "control: no fromCode" } }
{ return n + 1 }`;

const SUBJECT_SRC = `pure flow mk(n: Int) -> Int
contract { intent { "fromCode then back to a code point" } }
{ let c = Char.fromCode(n)
  return c.codePoint() }`;

/** Compile a source to assembled WASM the same way the P9 parity harness does. */
async function compile(src) {
  const p = L.parseProgram(src, "fromcode.fungi");
  const parseErrs = (p.diagnostics ?? []).filter((d) => d.severity === "error");
  assert.equal(parseErrs.length, 0, `source must parse clean: ${parseErrs.map((e) => e.code).join(",")}`);
  const fx = L.checkEffects(p.flows, p.ast);
  const { gir } = L.emitGIR(p.ast, p.flows, fx);
  const wat = L.renderWAT(L.buildWATModuleFromGIR(gir, undefined, "fromcode", p.ast, /*exportAllPure*/ true));
  const asm = await L.assembleWAT(wat);
  return { wat, asm };
}

/** Instantiate through the #105 admission gate — the production path, not a bare instantiate. */
async function admit(asm) {
  const host = L.createHostRuntime();
  for (const e of L.getInternedStrings()) host.seedString(e.handle, e.value);
  const kp = L.generateRunnerKeypair();
  const attestation = L.signWasm(asm.wasm, kp.privateKeyPem, "dev");
  const { instance } = await L.admitAndInstantiate({
    wasm: asm.wasm, attestation,
    policy: { requireSigned: true, publicKeyPem: kp.publicKeyPem }, host,
  });
  return instance;
}

let control, subject, instance;
before(async () => {
  control = await compile(CONTROL_SRC);
  subject = await compile(SUBJECT_SRC);
  if (subject.asm.valid && subject.asm.diagnostics.length === 0) instance = await admit(subject.asm);
});

describe("RD-0528 step 1 · Char.fromCode assembles to real WASM", () => {
  it("CONTROL: a flow without fromCode assembles (so a green SUBJECT is not vacuous)", () => {
    assert.equal(control.asm.valid, true);
    assert.equal(control.asm.diagnostics.length, 0);
  });

  it("SUBJECT: a flow using Char.fromCode assembles — the $fromCode WAT-invalid is gone", () => {
    assert.equal(subject.asm.valid, true,
      `assembly failed: ${subject.asm.diagnostics.map((d) => d.message ?? d).join(" | ")}`);
    assert.equal(subject.asm.diagnostics.length, 0);
  });

  it("emits the host call, not an undefined function", () => {
    assert.ok(subject.wat.includes("$host___char_from_code"), "the lowering must route to the host import");
    assert.ok(!subject.wat.includes("$fromCode"), "the old fall-through call must not appear");
  });
});

describe("RD-0528 step 1 · fault-parity: WASM refuses what the interpreter refuses", () => {
  it("a valid code point round-trips through fromCode -> codePoint", () => {
    assert.equal(instance.exports.mk(65), 65, "'A'");
    assert.equal(instance.exports.mk(0x10FFFF), 0x10FFFF, "the maximum valid code point");
  });

  it("above the maximum code point FAULTS (identity would have accepted it)", () => {
    assert.throws(() => instance.exports.mk(0x110000), /Invalid code point/);
  });

  it("a negative code point FAULTS", () => {
    assert.throws(() => instance.exports.mk(-1), /Invalid code point/);
  });

  // The two backends express the SAME refusal differently, and the difference is the house
  // convention, not a divergence: the interpreter faults by RETURNING a `runtimeError`-tagged value
  // (the async walker never throws — same predicate the .fungi≡.ts edge-differential gate uses),
  // while WASM faults by trapping out of the host import. Asserting a rejection here failed on the
  // first run and the measurement corrected it; recorded so the next reader doesn't re-derive it.
  it("the interpreter refuses the SAME inputs — this is parity, not a WASM-only rule", async () => {
    const p = L.parseProgram(SUBJECT_SRC, "fromcode.fungi");
    const run = async (n) => {
      const r = await L.executeFlow("mk", new Map([["n", { __tag: "int", value: n }]]), p.ast, p.flows);
      return r?.value ?? r;
    };
    assert.equal((await run(65)).value, 65, "interpreter agrees on the valid value");
    assert.equal((await run(0x10FFFF)).value, 0x10FFFF, "and at the maximum valid code point");
    assert.equal((await run(0x110000)).__tag, "runtimeError", "out of range must fault in the interpreter too");
    assert.equal((await run(-1)).__tag, "runtimeError", "negative must fault in the interpreter too");
  });

  // R&D 0356: the interpreter's refusal is a GOVERNED fault, not an escaping RangeError — something
  // upstream already wraps it. That means this row can name the exact failure instead of settling for
  // "it failed somehow", which is the difference between a lock and a shrug. Both the carried message
  // and the emitted diagnostic CODE are asserted: a future refactor that keeps the tag but loses the
  // reason, or reclassifies the code, reds here.
  it("the interpreter's refusal is GOVERNED and NAMED — message + FUNGI-RUNTIME-003, not a bare tag", async () => {
    const p = L.parseProgram(SUBJECT_SRC, "fromcode.fungi");
    for (const n of [0x110000, -1]) {
      const r = await L.executeFlow("mk", new Map([["n", { __tag: "int", value: n }]]), p.ast, p.flows);
      assert.match(r.value.message, new RegExp(`Invalid code point ${n}`),
        `the fault must carry WHICH code point was refused (n=${n})`);
      const codes = (r.diagnostics ?? []).map((d) => d.code);
      assert.ok(codes.includes("FUNGI-RUNTIME-003"),
        `the governed fault must surface as FUNGI-RUNTIME-003, got ${JSON.stringify(codes)}`);
    }
  });
});
