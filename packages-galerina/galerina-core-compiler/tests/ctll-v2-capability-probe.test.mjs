import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as L from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, "ctll-v2", "ctll-k3-checked-add-probe.fungi");

async function loadProbe() {
  const source = await readFile(FIXTURE, "utf8");
  const program = L.parseProgram(source, FIXTURE, { requireVersionHeader: true });
  const parseErrors = (program.diagnostics ?? []).filter((d) => d.severity === "error");
  assert.deepEqual(parseErrors, [], `fixture parse failed: ${JSON.stringify(parseErrors)}`);

  const typeErrors = L.checkTypes(program.ast).diagnostics.filter((d) => d.severity === "error");
  assert.deepEqual(typeErrors, [], `fixture type check failed: ${JSON.stringify(typeErrors)}`);
  return program;
}

function args(left, right, admission) {
  return new Map([
    ["left", { __tag: "int", value: left }],
    ["right", { __tag: "int", value: right }],
    ["admission", { __tag: "verdict", value: admission }],
  ]);
}

test("CTLL G1 probe: walker preserves typed K3 exits and checked addition", async () => {
  const program = await loadProbe();

  const denied = await L.executeFlow("ctllK3CheckedAddProbe", args(3, 4, -1), program.ast);
  assert.equal(denied.audit.result, "ok");
  assert.equal(denied.value.__tag, "err");
  assert.equal(denied.value.error.value, "CTLL_PROBE_DENIED");

  const unresolved = await L.executeFlow("ctllK3CheckedAddProbe", args(3, 4, 0), program.ast);
  assert.equal(unresolved.audit.result, "ok");
  assert.equal(unresolved.value.__tag, "err");
  assert.equal(unresolved.value.error.value, "CTLL_PROBE_INDETERMINATE");

  const allowed = await L.executeFlow("ctllK3CheckedAddProbe", args(3, 4, 1), program.ast);
  assert.equal(allowed.audit.result, "ok");
  assert.equal(allowed.value.__tag, "ok");
  assert.equal(allowed.value.value.value, 7);

  const overflow = await L.executeFlow(
    "ctllK3CheckedAddProbe",
    args(2_147_483_647, 1, 1),
    program.ast,
  );
  assert.equal(overflow.audit.result, "error");
  assert.match(overflow.value.message, /IntegerOverflow/);
});

test("CTLL G1 probe: current WAT preserves K3, Result, checked add, and malformed-trit refusal", async () => {
  const program = await loadProbe();
  const effects = L.checkEffects(program.flows, program.ast);
  const { gir } = L.emitGIR(program.ast, program.flows, effects);
  const wat = L.renderWAT(
    L.buildWATModuleFromGIR(gir, new Map(), "wasm-standalone", program.ast, true),
  );
  const assembled = await L.assembleWAT(wat);
  assert.ok(assembled.valid, `WAT did not validate: ${JSON.stringify(assembled.diagnostics)}`);

  const resultTags = [];
  const module = await WebAssembly.instantiate(assembled.wasm, {
    host: {
      __result_ok(value) {
        resultTags.push(["ok", value]);
        return 10_000 + value;
      },
      __result_err(value) {
        resultTags.push(["err", value]);
        return -10_000 - value;
      },
    },
  });
  const run = module.instance.exports.ctllK3CheckedAddProbe;
  assert.equal(typeof run, "function");

  assert.ok(run(3, 4, -1) < -10_000);
  assert.ok(run(3, 4, 0) < -10_000);
  assert.equal(run(3, 4, 1), 10_007);
  assert.deepEqual(resultTags.map(([tag]) => tag), ["err", "err", "ok"]);
  assert.throws(() => run(3, 4, 2), WebAssembly.RuntimeError);
  assert.throws(() => run(2_147_483_647, 1, 1), WebAssembly.RuntimeError);
});

test("CTLL G1 negative probe: emitted GIR cannot reproduce the body without the AST", async () => {
  const program = await loadProbe();
  const effects = L.checkEffects(program.flows, program.ast);
  const { gir } = L.emitGIR(program.ast, program.flows, effects);

  // Deliberately invoke the JS surface without the TypeScript-required AST.
  // This records the present boundary; CTLL must replace it with a hard refusal
  // or complete executable GIR, never rely on this legacy identity fallback.
  const detachedWat = L.renderWAT(
    L.buildWATModuleFromGIR(gir, new Map(), "wasm-standalone", undefined, true),
  );
  assert.doesNotMatch(detachedWat, /fungi_checked_add_i32/);
  assert.match(detachedWat, /local\.get \$p0/);
});
