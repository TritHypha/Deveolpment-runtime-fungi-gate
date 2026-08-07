// =============================================================================
// B6 regression — the two banned governed-flow decoders route through the ONE
// shared decoder (flow-name.ts). Owner Q1 conditions 3/4 applied to the
// emitter/registry lane (gir-emitter.ts findGovernedFlowNode,
// module-registry.ts extractSymbols).
//
// Layer 1 — STRUCTURAL (always runs): the banned `split(":").pop()` decode is
//   gone from both src files, the shared-decoder import is present, and the
//   malformed-value diagnostic (FUNGI-IMPORT-007) exists in the registry.
//   This is the immediate detector for the defect class.
// Layer 2 — BEHAVIOURAL (dist-gated): drives the PUBLIC emitGIR with a
//   colon-qualified governed flow; the truncating decoder dropped its params
//   (stub), the shared decoder resolves them. Gated on dist containing the fix
//   (dist/gir-emitter.js mentions isFlowDeclNamed) so this file is green today
//   and the behavioural arm AUTO-ARMS when main next rebuilds dist. Until then
//   the skip reports itself loudly.
//
// Scope, honestly: module-registry's extractSymbols is module-private and the
// .fungi lexer does not produce colon-qualified identifiers from source text,
// so its behavioural path is covered by (a) decodeFlowDecl's own unit KATs
// (governed-flow-name-parity.test.mjs) — the single shared code path — and
// (b) Layer-1 structure here. The emitter path gets full behavioural coverage.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = (f) => readFileSync(join(here, "..", "src", f), "utf8");
const distPath = (f) => join(here, "..", "dist", f);

// ---------- Layer 1: structural ----------

test("gir-emitter: banned pop() decode gone; shared decoder wired", () => {
  const t = src("gir-emitter.ts");
  assert.ok(!/split\(":"\)\.pop\(\)/.test(t), "banned split(\":\").pop() must not reappear in gir-emitter.ts");
  assert.ok(/import \{ isFlowDeclNamed \} from "\.\/flow-name\.js";/.test(t), "gir-emitter must import the shared decoder");
  assert.ok(/node\.kind === "governedFlowDecl" && isFlowDeclNamed\(node, name\)/.test(t), "findGovernedFlowNode must match via isFlowDeclNamed");
  assert.ok(!/never contain ':'/.test(t), "the false names-never-contain-colon invariant comment must be gone");
});

test("module-registry: banned pop() decode gone; decoder + malformed diagnostic wired", () => {
  const t = src("module-registry.ts");
  assert.ok(!/split\(":"\)\.pop\(\)/.test(t), "banned split(\":\").pop() must not reappear in module-registry.ts");
  assert.ok(/import \{ decodeFlowDecl \} from "\.\/flow-name\.js";/.test(t), "module-registry must import the shared decoder");
  assert.ok(/FUNGI-IMPORT-007/.test(t), "malformed governed value must surface as FUNGI-IMPORT-007, not a silent skip");
  assert.ok(/diagnostics: symbolDiagnostics/.test(t), "symbol-level diagnostics must ride the resolved module entry");
});

// ---------- Layer 2: behavioural via public emitGIR (dist-gated) ----------

const distFresh = /isFlowDeclNamed/.test(readFileSync(distPath("gir-emitter.js"), "utf8"));

test("emitGIR resolves params for a COLON-QUALIFIED governed flow (the truncation vector)", { skip: distFresh ? false : "dist predates the fix (no isFlowDeclNamed in dist/gir-emitter.js) — REBUILD PENDING; this arm auto-runs after the next dist build" }, async () => {
  const { emitGIR } = await import("../dist/gir-emitter.js");
  const loc = { line: 1, column: 1, file: "kat.fungi" };
  const govNode = {
    kind: "governedFlowDecl",
    value: "governed:floor_3:ns:sub",
    location: loc,
    children: [
      { kind: "paramDecl", value: "a: Int", location: loc, children: [] },
      { kind: "paramDecl", value: "b: Int", location: loc, children: [] },
    ],
  };
  const ast = { kind: "program", value: undefined, location: loc, children: [govNode] };
  const flows = [{ name: "ns:sub", qualifier: "guarded", params: ["a: Int", "b: Int"], returnType: "Int", declaredEffects: [], location: loc }];
  const result = emitGIR(ast, flows, []);
  const flow = result.gir.flows.find((f) => f.name === "ns:sub");
  assert.ok(flow, "emitGIR must emit the governed flow");
  assert.deepEqual(flow.paramTypes, ["Int", "Int"], "colon-qualified governed flow params must resolve (truncating decoder dropped them)");
});

test("CONTROL: a bare-named governed flow resolves params under BOTH decoders", { skip: distFresh ? false : "dist predates the fix — REBUILD PENDING (control arm)" }, async () => {
  const { emitGIR } = await import("../dist/gir-emitter.js");
  const loc = { line: 1, column: 1, file: "kat.fungi" };
  const govNode = {
    kind: "governedFlowDecl",
    value: "governed:floor_3:simple",
    location: loc,
    children: [{ kind: "paramDecl", value: "x: Int", location: loc, children: [] }],
  };
  const ast = { kind: "program", value: undefined, location: loc, children: [govNode] };
  const flows = [{ name: "simple", qualifier: "guarded", params: ["x: Int"], returnType: "Int", declaredEffects: [], location: loc }];
  const result = emitGIR(ast, flows, []);
  const flow = result.gir.flows.find((f) => f.name === "simple");
  assert.ok(flow, "emitGIR must emit the governed flow");
  assert.deepEqual(flow.paramTypes, ["Int"], "bare-named governed flow is the discriminating control (old decoder also matched it)");
});
