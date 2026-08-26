/**
 * Phase 40 â€” Stage B Self-Hosting Bootstrap
 *
 * Proves that the Stage B .fungi files are not just parse-clean but actually
 * EXECUTABLE through the governed interpreter. This is the foundation for
 * Phase 41 (Stage B compiles Stage A â†’ Runtime 50%).
 *
 * Executing Stage B code through the Galerina runtime IS the runtime being
 * partly written in Galerina â€” these are the first self-governing compiler flows.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { parseProgram, executeFlow } from "../dist/index.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const SELF_HOSTED = join(__dir, "..", "src", "self-hosted");

function loadSrc(filename) {
  return readFileSync(join(SELF_HOSTED, filename), "utf8");
}

// â”€â”€ compiler.capabilities.fungi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("Phase 40: compiler.capabilities.fungi executes", () => {
  const prog = parseProgram(loadSrc("compiler.capabilities.fungi"), "compiler.capabilities.fungi");

  it("parses with zero errors", () => {
    const errs = (prog.diagnostics ?? []).filter(d => d.severity === "error");
    assert.equal(errs.length, 0, errs.map(e => e.message).join(", "));
  });

  it("compilerAllowedCapabilities() returns 7", async () => {
    const r = await executeFlow("compilerAllowedCapabilities", new Map(), prog.ast, prog.flows);
    assert.deepEqual(r.value, { __tag: "int", value: 7 });
  });

  it("compilerDeniedCapabilities() returns 7", async () => {
    const r = await executeFlow("compilerDeniedCapabilities", new Map(), prog.ast, prog.flows);
    assert.deepEqual(r.value, { __tag: "int", value: 7 });
  });

  it("isCapabilityAllowed(network.read) â†’ false", async () => {
    const r = await executeFlow("isCapabilityAllowed", new Map([["name",{__tag:"string",value:"network.read"}]]), prog.ast, prog.flows);
    assert.deepEqual(r.value, { __tag: "bool", value: false });
  });

  it("isCapabilityAllowed(storage.read) â†’ true", async () => {
    const r = await executeFlow("isCapabilityAllowed", new Map([["name",{__tag:"string",value:"storage.read"}]]), prog.ast, prog.flows);
    assert.deepEqual(r.value, { __tag: "bool", value: true });
  });

  it("sourceHasFlow detects flow keyword", async () => {
    const src = { __tag: "string", value: "pure flow add(a: Int) -> Int contract { effects {} } { return a }" };
    const r = await executeFlow("sourceHasFlow", new Map([["source", src]]), prog.ast, prog.flows);
    assert.deepEqual(r.value, { __tag: "bool", value: true });
  });

  it("sourceHasFlow returns false when no flow keyword", async () => {
    const src = { __tag: "string", value: "this is not galerina source" };
    const r = await executeFlow("sourceHasFlow", new Map([["source", src]]), prog.ast, prog.flows);
    assert.deepEqual(r.value, { __tag: "bool", value: false });
  });

  // sourceHasContract / sourceHasEffects / countTokens (2026-07-25) — the three flows the
  // dead-flow detector flagged in this file. They are NOT dead code: every flow here is a leaf
  // query with no in-.fungi caller by design (compilerAllowedCapabilities, isCapabilityAllowed,
  // capabilityClass and sourceHasFlow are all in the same shape), so in THIS file the liveness
  // contract IS test coverage — and these three simply never got any. Wiring them closes the
  // CG-9.1 gap without deleting a declared capability-query surface.

  it("sourceHasContract detects a contract block", async () => {
    const src = { __tag: "string", value: "contract { intent { \"x\" } }" };
    const r = await executeFlow("sourceHasContract", new Map([["source", src]]), prog.ast, prog.flows);
    assert.deepEqual(r.value, { __tag: "bool", value: true });
  });

  it("sourceHasContract returns false with no contract block", async () => {
    const src = { __tag: "string", value: "no such block here" };
    const r = await executeFlow("sourceHasContract", new Map([["source", src]]), prog.ast, prog.flows);
    assert.deepEqual(r.value, { __tag: "bool", value: false });
  });

  it("sourceHasEffects detects an effects block", async () => {
    const src = { __tag: "string", value: "contract { effects { storage.read } }" };
    const r = await executeFlow("sourceHasEffects", new Map([["source", src]]), prog.ast, prog.flows);
    assert.deepEqual(r.value, { __tag: "bool", value: true });
  });

  it("sourceHasEffects returns false when only an intent block is present", async () => {
    const src = { __tag: "string", value: "contract { intent { \"x\" } }" };
    const r = await executeFlow("sourceHasEffects", new Map([["source", src]]), prog.ast, prog.flows);
    assert.deepEqual(r.value, { __tag: "bool", value: false });
  });

  it("countTokens counts whitespace-separated words plus lines", async () => {
    // "pure flow add" -> split(" ").length 3 + split("\n").length 1 = 4.
    const src = { __tag: "string", value: "pure flow add" };
    const r = await executeFlow("countTokens", new Map([["source", src]]), prog.ast, prog.flows);
    assert.deepEqual(r.value, { __tag: "int", value: 4 });
  });

  it("countTokens on the empty string returns 2 (one empty word + one empty line)", async () => {
    const src = { __tag: "string", value: "" };
    const r = await executeFlow("countTokens", new Map([["source", src]]), prog.ast, prog.flows);
    assert.deepEqual(r.value, { __tag: "int", value: 2 });
  });

  it("CHARACTERIZATION: countTokens' line term is INERT on real newlines", async () => {
    // MEASURED, not blessed. A real line break adds nothing to the count: "a b c\nd" scores 4,
    // the same as the single-line "pure flow add", where a working line term would give 5.
    // Cause is upstream of this flow — a .fungi string literal is escape-PASS-THROUGH for
    // everything except \u (lexer.ts:601 keeps the backslash: `value += bslash + advance()`),
    // so the "\n" written in countTokens' body is the two characters backslash+n and never
    // matches a real line break. Pinned here so that if the escape semantics are ever changed,
    // this reds and forces countTokens to be revisited rather than silently changing meaning.
    const src = { __tag: "string", value: "a b c\nd" };
    const r = await executeFlow("countTokens", new Map([["source", src]]), prog.ast, prog.flows);
    assert.deepEqual(r.value, { __tag: "int", value: 4 });
  });

  it("capabilityClass(storage.write) returns 2 (write class)", async () => {
    const r = await executeFlow("capabilityClass", new Map([["name",{__tag:"string",value:"storage.write"}]]), prog.ast, prog.flows);
    assert.deepEqual(r.value, { __tag: "int", value: 2 });
  });

  it("capabilityClass(network.read) returns 0 (denied)", async () => {
    const r = await executeFlow("capabilityClass", new Map([["name",{__tag:"string",value:"network.read"}]]), prog.ast, prog.flows);
    assert.deepEqual(r.value, { __tag: "int", value: 0 });
  });

  it("capabilityClass(compiler.graph.read) returns 1 (read-only)", async () => {
    const r = await executeFlow("capabilityClass", new Map([["name",{__tag:"string",value:"compiler.graph.read"}]]), prog.ast, prog.flows);
    assert.deepEqual(r.value, { __tag: "int", value: 1 });
  });
});

// â”€â”€ lexer.fungi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("Phase 40: lexer.fungi executes (Stage B tokenizer)", () => {
  const prog = parseProgram(loadSrc("lexer.fungi"), "lexer.fungi");

  it("parses with zero errors", () => {
    const errs = (prog.diagnostics ?? []).filter(d => d.severity === "error");
    assert.equal(errs.length, 0, errs.map(e => e.message).join(", "));
  });

  it("makeKeywordTable() returns 53 keywords (v2.2 + check)", async () => {
    const r = await executeFlow("makeKeywordTable", new Map(), prog.ast, prog.flows);
    assert.equal(r.value.__tag, "list");
    assert.equal(r.value.items?.length, 53, `expected 53 keywords (v2.2 + check), got ${r.value.items?.length}`);
  });

  it("makeKeywordTable() includes 'flow'", async () => {
    const r = await executeFlow("makeKeywordTable", new Map(), prog.ast, prog.flows);
    const words = (r.value.items ?? []).map(i => i.value);
    assert.ok(words.includes("flow"), "keyword 'flow' must be in table");
    assert.ok(words.includes("contract"), "keyword 'contract' must be in table");
    assert.ok(words.includes("effects"), "keyword 'effects' must be in table");
    assert.ok(words.includes("check"), "keyword 'check' must be in table");
  });

  it("scanWord extracts identifier from source string", async () => {
    const r = await executeFlow("scanWord", new Map([
      ["source",   { __tag: "string", value: "hello world" }],
      ["startPos", { __tag: "int", value: 0 }],
      ["srcLen",   { __tag: "int", value: 11 }],
    ]), prog.ast, prog.flows);
    assert.equal(r.value.__tag, "list", "should return a list [word, endPos]");
    const items = r.value.items ?? [];
    assert.equal(items[0]?.value, "hello", "first element should be the word");
    assert.equal(items[1]?.value, "5", "second element should be endPos as string");
  });

  it("scanWord from middle of string", async () => {
    const r = await executeFlow("scanWord", new Map([
      ["source",   { __tag: "string", value: "hello world" }],
      ["startPos", { __tag: "int", value: 6 }],
      ["srcLen",   { __tag: "int", value: 11 }],
    ]), prog.ast, prog.flows);
    const items = r.value.items ?? [];
    assert.equal(items[0]?.value, "world");
    assert.equal(items[1]?.value, "11");
  });

  it("scanWord on empty string returns empty word", async () => {
    const r = await executeFlow("scanWord", new Map([
      ["source",   { __tag: "string", value: "" }],
      ["startPos", { __tag: "int", value: 0 }],
      ["srcLen",   { __tag: "int", value: 0 }],
    ]), prog.ast, prog.flows);
    const items = r.value.items ?? [];
    assert.equal(items[0]?.value, "");
  });
});

// â”€â”€ All 4 Stage B files parse cleanly â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("Phase 40: all Stage B files parse with zero errors", () => {
  for (const filename of ["compiler.capabilities.fungi", "lexer.fungi", "parser.fungi", "type-checker.fungi"]) {
    it(`${filename} â€” zero parse errors`, () => {
      const p = parseProgram(loadSrc(filename), filename);
      const errs = (p.diagnostics ?? []).filter(d => d.severity === "error");
      assert.equal(errs.length, 0, `${filename}: ${errs.map(e=>e.message).join(", ")}`);
    });
  }
});
