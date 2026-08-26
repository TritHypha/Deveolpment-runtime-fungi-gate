/**
 * Regression guard for String ordered comparisons.
 *
 * The checker admits String < <= > >=, but the Stage-A dispatch table once
 * omitted all four operators. Governed execution therefore returned a soft
 * runtime error that a condition treated as false. The WAT emitter separately
 * compared opaque string handles as signed integers, so its result depended on
 * allocation order rather than string value. Both were silent correctness
 * failures in canonical-order guards.
 *
 * The ruled ordering is deterministic JavaScript/TypeScript UTF-16 code-unit
 * order, matching the canonical object-key policy used elsewhere in Galerina.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as L from "../dist/index.js";
import { BINARY_DISPATCH, dispatchKey } from "../dist/interpreter.js";

const PROGRAM = `
pure flow lt(a: String, b: String) -> Bool
contract { intent { "ordered String less-than" } effects {} }
{ return a < b }

pure flow le(a: String, b: String) -> Bool
contract { intent { "ordered String less-than-or-equal" } effects {} }
{ return a <= b }

pure flow gt(a: String, b: String) -> Bool
contract { intent { "ordered String greater-than" } effects {} }
{ return a > b }

pure flow ge(a: String, b: String) -> Bool
contract { intent { "ordered String greater-than-or-equal" } effects {} }
{ return a >= b }
`;

const OPS = { lt: "<", le: "<=", gt: ">", ge: ">=" };

function expected(fn, a, b) {
  switch (fn) {
    case "lt": return a < b;
    case "le": return a <= b;
    case "gt": return a > b;
    case "ge": return a >= b;
    default: throw new Error(`unknown comparison flow ${fn}`);
  }
}

async function instantiate() {
  const prog = L.parseProgram(PROGRAM, "string-ordering-runtime-parity.fungi");
  const parseErrors = (prog.diagnostics ?? []).filter((d) => d.severity === "error");
  assert.equal(parseErrors.length, 0, `parse errors: ${JSON.stringify(parseErrors)}`);
  const typeErrors = (L.checkTypes(prog.ast).diagnostics ?? []).filter((d) => d.severity === "error");
  assert.equal(typeErrors.length, 0, `type errors: ${JSON.stringify(typeErrors)}`);

  const fx = L.checkEffects(prog.flows, prog.ast);
  const { gir } = L.emitGIR(prog.ast, prog.flows, fx);
  const wat = L.renderWAT(L.buildWATModuleFromGIR(
    gir, undefined, "string-ordering-runtime-parity", prog.ast, true,
  ));
  for (const fn of Object.keys(OPS)) {
    const body = wat.split(/\(func \$/).find((part) => part.startsWith(fn)) ?? "";
    assert.match(body, /host___str_compare/, `${fn} must compare String values through the host oracle`);
  }

  const assembled = await L.assembleWAT(wat);
  assert.equal(assembled.valid, true, `WAT did not assemble: ${JSON.stringify(assembled.diagnostics)}`);
  const host = L.createHostRuntime();
  let nextHandle = 0;
  for (const entry of L.getInternedStrings()) {
    host.seedString(entry.handle, entry.value);
    nextHandle = Math.max(nextHandle, entry.handle + 1);
  }
  const keys = L.generateRunnerKeypair();
  const attestation = L.signWasm(assembled.wasm, keys.privateKeyPem, "dev");
  const { instance } = await L.admitAndInstantiate({
    wasm: assembled.wasm,
    attestation,
    policy: { requireSigned: true, publicKeyPem: keys.publicKeyPem },
    host,
  });
  return { prog, host, instance, nextHandle };
}

function callWasm(ctx, fn, a, b) {
  const ah = ctx.nextHandle++;
  const bh = ctx.nextHandle++;
  ctx.host.seedString(ah, a);
  ctx.host.seedString(bh, b);
  return Boolean(ctx.instance.exports[fn](ah, bh));
}

async function callInterpreter(prog, fn, a, b) {
  const args = new Map([
    ["a", { __tag: "string", value: a }],
    ["b", { __tag: "string", value: b }],
  ]);
  const result = await L.executeFlow(fn, args, prog.ast, prog.flows, undefined, undefined, {
    pureFastPath: true,
  });
  assert.equal(result?.value?.__tag, "bool", `${fn} must return Bool, not a soft runtime error`);
  return result.value.value;
}

describe("String ordered comparison uses one deterministic value ordering in every tier", () => {
  it("the Stage-A dispatch table contains all four String ordering operators", () => {
    for (const op of Object.values(OPS)) {
      assert.equal(
        BINARY_DISPATCH.has(dispatchKey("string", op, "string")),
        true,
        `missing String ${op} String dispatch`,
      );
    }
  });

  it("the host oracle is trichotomic and refuses unknown string handles", () => {
    const host = L.createHostRuntime();
    const a = host.internString("alpha");
    const b = host.internString("beta");
    const same = host.internString("alpha");
    const compare = host.imports.host.__str_compare;
    assert.equal(compare(a, b), -1);
    assert.equal(compare(b, a), 1);
    assert.equal(compare(a, same), 0);
    assert.throws(() => compare(999_999, a), /unknown string handle/);
  });

  it("interpreter and admitted WASM match UTF-16 code-unit ordering", async () => {
    const ctx = await instantiate();
    const pairs = [
      ["alpha", "beta"],
      ["beta", "alpha"],
      ["same", "same"],
      ["", "a"],
      ["Z", "a"],
      ["\u{1F600}", "\uE000"],
      ["a\u{1F600}", "a\uE000"],
    ];
    for (const fn of Object.keys(OPS)) {
      for (const [a, b] of pairs) {
        const oracle = expected(fn, a, b);
        assert.equal(await callInterpreter(ctx.prog, fn, a, b), oracle, `${fn} interpreter ${JSON.stringify([a, b])}`);
        assert.equal(callWasm(ctx, fn, a, b), oracle, `${fn} WASM ${JSON.stringify([a, b])}`);
      }
    }
  });
});
