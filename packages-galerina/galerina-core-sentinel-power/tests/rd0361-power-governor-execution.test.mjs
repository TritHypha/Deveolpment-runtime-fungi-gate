// rd0361-power-governor-execution.test.mjs — RD-0361 (sentinel-power): the power-governor `.fungi` twin
// EXECUTES; its thermal power-state ladder + fail-closed admission folds are proven EQUAL to spec.
//   R0 build → WASM · R1 sign + #105-admit · R3 exhaustive Int-fold differential (label-safe: all verdicts are Int).
// Moves power-governor shadow → differential. R4 authority = #143.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPILER = join(HERE, "..", "..", "galerina-core-compiler", "dist", "index.js");
const SENTINEL_POWER = join(HERE, "..", "dist", "index.js");
const TWIN = join(HERE, "..", "src", "self-hosted", "power-governor.fungi");
const B = [false, true];
const bit = (b) => (b ? 1 : 0);
const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, k) => lo + k);
const POWER_RANK_VECTORS = Object.freeze([
  Object.freeze(["native", 0]),
  Object.freeze(["simd", 1]),
  Object.freeze(["shadow", 2]),
  Object.freeze(["", -1]),
  Object.freeze(["Native", -1]),
  Object.freeze([" shadow", -1]),
  Object.freeze(["shadow\u0000", -1]),
  Object.freeze(["unknown", -1]),
]);

// Refs from the twin's spec.
const refState = (crit, safe, thr) => (crit ? 3 : safe ? 2 : thr ? 1 : 0);
const refKernel = (s) => (s === 0 ? 0 : s === 1 ? 1 : 2);
const refAdjust = (target, permitted) => (target < permitted ? -1 : 1);
const refEnvelope = (tp, tls, slc) => (!tp ? -1 : !tls ? -1 : !slc ? -1 : 1);
const refKill = (s) => (s === 3 ? -1 : 1);

test("RD-0361 sentinel-power · power-governor: R0 build → R1 #105-admit → R3 WASM ≡ power-state + admission spec", async () => {
  assert.ok(existsSync(COMPILER), "core-compiler dist not built — run the full suite first");
  assert.ok(existsSync(SENTINEL_POWER), "sentinel-power dist must exist");
  const L = await import(pathToFileURL(COMPILER).href);
  const { AEROSPACE_ENVELOPE, PowerGovernor } = await import(pathToFileURL(SENTINEL_POWER).href);
  let src = readFileSync(TWIN, "utf8"); if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
  const prog = L.parseProgram(src, "power-governor.fungi");
  assert.equal((prog.diagnostics ?? []).filter((d) => d.severity === "error").length, 0, "twin parses clean (R0)");
  const fx = L.checkEffects(prog.flows, prog.ast);
  const { gir } = L.emitGIR(prog.ast, prog.flows, fx);
  const wat = L.renderWAT(L.buildWATModuleFromGIR(gir, undefined, "power-governor", prog.ast, true));
  const asm = await L.assembleWAT(wat);
  assert.ok(asm.valid && asm.diagnostics.length === 0, `twin WAT assembles (R0): ${JSON.stringify(asm.diagnostics)}`);
  const host = L.createHostRuntime();
  for (const entry of L.getInternedStrings()) host.seedString(entry.handle, entry.value);
  const kp = L.generateRunnerKeypair();
  const att = L.signWasm(asm.wasm, kp.privateKeyPem, "dev");
  const { instance } = await L.admitAndInstantiate({ wasm: asm.wasm, attestation: att, policy: { requireSigned: true, publicKeyPem: kp.publicKeyPem }, host });
  const X = instance.exports;
  for (const f of ["powerRank", "powerStateVerdict", "kernelForState", "adjustmentVerdict", "envelopeValid", "killSwitchVerdict"])
    assert.equal(typeof X[f], "function", `${f} admitted (R1)`);

  for (const [kernel, expected] of POWER_RANK_VECTORS) {
    const interpreted = await L.executeFlow(
      "powerRank",
      new Map([["kernel", { __tag: "string", value: kernel }]]),
      prog.ast,
      prog.flows,
    );
    assert.deepEqual(
      interpreted.value,
      { __tag: "int", value: expected },
      `interpreted powerRank(${JSON.stringify(kernel)})`,
    );
    assert.equal(
      X.powerRank(host.internString(kernel)),
      expected,
      `Wasm powerRank(${JSON.stringify(kernel)})`,
    );
  }

  const canonicalRanks = new Map(POWER_RANK_VECTORS.slice(0, 3));
  for (const { temp, permitted } of [
    { temp: 50, permitted: "native" },
    { temp: 75, permitted: "simd" },
    { temp: 88, permitted: "shadow" },
  ]) {
    const governor = new PowerGovernor(AEROSPACE_ENVELOPE);
    governor.setReading(temp);
    for (const target of ["native", "simd", "shadow", "unknown"]) {
      const targetRank = canonicalRanks.get(target) ?? -1;
      const permittedRank = canonicalRanks.get(permitted);
      assert.notEqual(permittedRank, undefined);
      assert.equal(
        governor.requestAdjustment(target).granted,
        targetRank >= permittedRank,
        `TypeScript requestAdjustment(${target}) at ${temp}C`,
      );
    }
  }

  for (const c of B) for (const s of B) for (const t of B)
    assert.equal(X.powerStateVerdict(bit(c), bit(s), bit(t)), refState(c, s, t), `powerStateVerdict(${c},${s},${t})`);
  for (const s of range(0, 5)) assert.equal(X.kernelForState(s), refKernel(s), `kernelForState(${s})`);
  for (const tr of range(0, 3)) for (const pr of range(0, 3))
    assert.equal(X.adjustmentVerdict(tr, pr), refAdjust(tr, pr), `adjustmentVerdict(${tr},${pr})`);
  for (const a of B) for (const b of B) for (const c of B)
    assert.equal(X.envelopeValid(bit(a), bit(b), bit(c)), refEnvelope(a, b, c), `envelopeValid(${a},${b},${c})`);
  for (const s of range(0, 5)) assert.equal(X.killSwitchVerdict(s), refKill(s), `killSwitchVerdict(${s})`);
  // No-Coercion: an up-tier (target hotter than permitted) can never be granted.
  for (const tr of range(0, 3)) for (const pr of range(0, 3)) if (tr < pr) assert.equal(X.adjustmentVerdict(tr, pr), -1, "up-tier denied");
});
