import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import ts from "typescript";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE_PATH = join(PACKAGE_ROOT, "src", "index.ts");

async function parsedSource() {
  const source = await readFile(SOURCE_PATH, "utf8");
  return ts.createSourceFile(SOURCE_PATH, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function declaredNames(node) {
  const names = [];
  const visit = (current) => {
    if (
      (ts.isFunctionDeclaration(current) || ts.isClassDeclaration(current))
      && current.name !== undefined
    ) names.push(current.name.text);
    ts.forEachChild(current, visit);
  };
  visit(node);
  return names;
}

function interfaceFields(node, interfaceName) {
  let fields = null;
  const visit = (current) => {
    if (ts.isInterfaceDeclaration(current) && current.name.text === interfaceName) {
      fields = current.members
        .map((member) => member.name)
        .filter((name) => name !== undefined)
        .map((name) => name.getText(node));
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return fields;
}

describe("PAT-NEU-01 neuromorphic research boundary", () => {
  it("remains private, post-v1, and explicitly non-executable", async () => {
    const metadata = JSON.parse(await readFile(join(PACKAGE_ROOT, "package.json"), "utf8"));
    const readme = await readFile(join(PACKAGE_ROOT, "README.md"), "utf8");
    const workspaceReadme = await readFile(join(PACKAGE_ROOT, "..", "README.md"), "utf8");

    assert.equal(metadata.private, true);
    assert.match(readme, /PAT-NEU-01/u);
    assert.match(readme, /non-executable/u);
    assert.match(readme, /post-v1/u);
    assert.match(workspaceReadme, /galerina-ai-neuromorphic\/.*post-v1/u);
  });

  it("exposes counts and validated records, not an addressable neural circuit array", async () => {
    const source = await parsedSource();
    assert.deepEqual(interfaceFields(source, "SpikingModel"), [
      "name", "inputs", "outputs", "neurons", "synapses",
    ]);
    assert.deepEqual(interfaceFields(source, "Spike"), ["neuron", "timeMs", "amplitude"]);
  });

  it("has no delay, refractory, dynamic topology, implantation, evolution, or actuator API", async () => {
    const source = await parsedSource();
    const forbiddenApi = /(?:delay|refractor|topolog|implant|evol|actuat|reconfigur|predict.*fail|control.*process)/iu;
    const forbidden = declaredNames(source).filter((name) => forbiddenApi.test(name));

    assert.deepEqual(forbidden, []);
    for (const interfaceName of ["Spike", "SpikeTrain", "SpikingModel", "NeuromorphicPlan"]) {
      const fields = interfaceFields(source, interfaceName);
      assert.ok(fields !== null, `${interfaceName} must remain explicit`);
      assert.deepEqual(fields.filter((name) => forbiddenApi.test(name)), []);
    }
  });

  it("has no execute, run, implant, actuate, or reconfigure entrypoint", async () => {
    const source = await parsedSource();
    const authorityApi = /^(?:execute|run|implant|actuate|reconfigure|evolve)/u;
    assert.deepEqual(declaredNames(source).filter((name) => authorityApi.test(name)), []);
  });
});
