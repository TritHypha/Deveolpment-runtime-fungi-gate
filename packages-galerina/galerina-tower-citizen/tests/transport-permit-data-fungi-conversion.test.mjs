import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  checkEffects,
  executeFlow,
  parseProgram,
} from "../../galerina-core-compiler/dist/index.js";
import {
  initialTransportContext,
  permitData,
  transportStep,
} from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "transport-fsm.fungi");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const KEYS = Object.freeze({ chain: "slice-27-reference-key" });
const CONFIG = Object.freeze({ timeoutMs: 5_000 });

async function compileCandidate() {
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "transport-fsm.fungi");
  assert.deepEqual(
    (program.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  const effects = checkEffects(program.flows, program.ast);
  assert.deepEqual(
    effects.flatMap((result) => result.diagnostics)
      .filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  assert.ok(
    program.flows.some((flow) => flow.name === "s4PermitData"),
    "transport FSM must own the s4PermitData Fungi projection",
  );
  return { program, source };
}

async function interpret(program, state) {
  const interpreted = await executeFlow(
    "s4PermitData",
    new Map([["state", { __tag: "int", value: state }]]),
    program.ast,
    program.flows,
  );
  return interpreted.value;
}

describe("Tower-Citizen package-owned Fungi transport permit decision", () => {
  it("keeps the exact flow package-owned and free of forbidden control forms", async () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    assert.ok(packageJson.packageGraph.loadedAssets.includes("src/self-hosted/transport-fsm.fungi"));
    const { source } = await compileCandidate();
    const start = source.indexOf("pure flow s4PermitData");
    assert.notEqual(start, -1);
    const flowSource = source.slice(start);
    assert.doesNotMatch(flowSource, /^\s*(?:for|while|loop)\b/mu);
    assert.doesNotMatch(flowSource, /\b(?:null|NaN|throw|try|catch)\b/u);
    assert.doesNotMatch(flowSource, /\belse(?:\s+if)?\b/u);
  });

  it("matches every declared transport state and denies unknown encodings", async () => {
    const { program } = await compileCandidate();
    const established = initialTransportContext(KEYS);
    const recovering = transportStep(
      established,
      Object.freeze({ kind: "fault", nowMs: 1 }),
      CONFIG,
    ).next;
    const closed = transportStep(
      established,
      Object.freeze({ kind: "fatal" }),
      CONFIG,
    ).next;
    const declared = Object.freeze([
      Object.freeze([established, 0]),
      Object.freeze([recovering, 1]),
      Object.freeze([closed, 2]),
    ]);
    for (const [context, encodedState] of declared) {
      const expected = permitData(context);
      assert.deepEqual(
        await interpret(program, encodedState),
        { __tag: "bool", value: expected },
        context.state,
      );
    }
    for (const encodedState of [-2147483648, -1, 3, 2147483647]) {
      assert.deepEqual(
        await interpret(program, encodedState),
        { __tag: "bool", value: false },
        `unknown state ${encodedState}`,
      );
    }
  });
});
