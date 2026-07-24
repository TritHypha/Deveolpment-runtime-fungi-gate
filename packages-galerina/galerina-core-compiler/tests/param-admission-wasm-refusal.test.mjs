// Flagship (0119 item 2) — RAW-WASM admission-bypass guard (bridge 0155/0157).
// A parameter `where` admission is a Verdict-ALLOW-only ENTRY gate enforced by the interpreter and NOT
// lowered to WAT. R&D measured that the raw `--invoke` / `galerina build`+wasmtime surfaces run a
// DENIED/UNKNOWN admission to completion (they sit outside the interpreter, so the 4 fast-tier exclusions
// don't cover them). buildWATModuleFromGIR — the single WASM-emission chokepoint — now REFUSES to lower an
// admission-bearing flow, making the bypass unrepresentable for every raw-WASM caller.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseProgram, resolveSymbols, checkTypes, checkEffects, emitGIR,
  buildWATModuleFromGIR, astHasParamAdmission, STDLIB_CAPABILITY_MAP,
} from "../dist/index.js";

const WHERE_SRC = `@version 1\npure flow gated(p: Int where all{}) -> Int { return p }`;
const PLAIN_SRC = `@version 1\npure flow plain(p: Int) -> Int { return p }`;

function lowerAttempt(src) {
  const parsed = parseProgram(src, "t.fungi");
  resolveSymbols(parsed.ast);
  checkTypes(parsed.ast);
  const eff = checkEffects(parsed.flows, parsed.ast);
  const gir = emitGIR(parsed.ast, parsed.flows, eff);
  return () => buildWATModuleFromGIR(gir.gir, STDLIB_CAPABILITY_MAP, "wasm-standalone", parsed.ast);
}

describe("Flagship — raw-WASM admission-bypass guard", () => {
  it("astHasParamAdmission: true for a where-flow, false for a plain flow", () => {
    assert.equal(astHasParamAdmission(parseProgram(WHERE_SRC, "t.fungi").ast), true);
    assert.equal(astHasParamAdmission(parseProgram(PLAIN_SRC, "t.fungi").ast), false);
  });

  it("buildWATModuleFromGIR REFUSES to lower an admission-bearing flow (fail-closed — no runnable module)", () => {
    assert.throws(lowerAttempt(WHERE_SRC), /parameter admission|BYPASS|0155/i);
  });

  it("a plain flow still lowers (control — the guard is narrow, not a blanket refusal)", () => {
    assert.doesNotThrow(lowerAttempt(PLAIN_SRC));
  });
});
