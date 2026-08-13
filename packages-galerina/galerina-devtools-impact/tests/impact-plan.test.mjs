import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { buildImpactPlan } from "../src/impact-plan.mjs";
import { DOCUMENTATION_PATH_CASES } from "./documentation-path-cases.mjs";

async function write(root, relativePath, contents) {
  const absolute = join(root, ...relativePath.split("/"));
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, contents);
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "galerina-impact-"));
  const packages = ["galerina-a", "galerina-b", "galerina-c"];
  await write(root, "galerina.workspace.json", JSON.stringify({
    packages: packages.map((name) => `packages-galerina/${name}`),
    compilerPackage: "packages-galerina/galerina-a",
  }));
  await write(root, "packages-galerina/galerina-a/package.json", JSON.stringify({
    name: "@galerina/a",
    scripts: { test: "node --test tests/*.test.mjs" },
  }));
  await write(root, "packages-galerina/galerina-b/package.json", JSON.stringify({
    name: "@galerina/b",
    dependencies: { "@galerina/a": "workspace:*" },
    scripts: { test: "node --test tests/*.test.mjs" },
  }));
  await write(root, "packages-galerina/galerina-c/package.json", JSON.stringify({
    name: "@galerina/c",
    dependencies: { "@galerina/b": "workspace:*" },
    scripts: { test: "node --test tests/*.test.mjs" },
  }));
  return root;
}

test("package change expands the exact reverse dependency closure", async () => {
  const root = await fixture();
  const plan = buildImpactPlan({
    root,
    changedPaths: ["packages-galerina/galerina-b/src/b.mjs"],
  });

  assert.equal(plan.authorizing, false);
  assert.equal(plan.status, "AFFECTED_SCOPE");
  assert.equal(plan.fullRequired, false);
  assert.deepEqual(plan.seedPackages, ["galerina-b"]);
  assert.deepEqual(plan.affectedPackages, ["galerina-b", "galerina-c"]);
  assert.deepEqual(plan.commands, [{
    id: "packages:affected",
    command: [
      "node", "scripts/run-all-tests.cjs", "--json",
      "--package-concurrency", "2", "--test-concurrency", "2",
      "galerina-b", "galerina-c",
    ],
  }]);
});

test("documentation changes select only the bounded documentation gates", async () => {
  const root = await fixture();
  const plan = buildImpactPlan({ root, changedPaths: ["docs/TODO.md"] });

  assert.equal(plan.status, "AFFECTED_SCOPE");
  assert.deepEqual(plan.affectedPackages, []);
  assert.deepEqual(plan.commands.map((item) => item.id), [
    "docs:path-leak",
    "docs:private-leak",
    "docs:drift",
  ]);
});

test("documentation path classification preserves every fixed root and prefix boundary", async () => {
  const root = await fixture();
  const documentationCommands = Object.freeze([
    "docs:path-leak",
    "docs:private-leak",
    "docs:drift",
  ]);

  for (const { path, expected } of DOCUMENTATION_PATH_CASES) {
    const plan = buildImpactPlan({ root, changedPaths: [path] });
    const selected = documentationCommands.every((id) =>
      plan.commands.some((command) => command.id === id));
    assert.equal(selected, expected, path);
    if (expected) {
      assert.equal(plan.status, "AFFECTED_SCOPE", path);
      assert.deepEqual(plan.affectedPackages, [], path);
      assert.deepEqual(plan.commands.map((command) => command.id), documentationCommands, path);
    }
  }
});

test("compiler and package-manifest changes require a full scan", async () => {
  const root = await fixture();
  const compiler = buildImpactPlan({
    root,
    changedPaths: ["packages-galerina/galerina-a/src/compiler.mjs"],
  });
  assert.equal(compiler.status, "FULL_REQUIRED");
  assert.equal(compiler.fullRequired, true);
  assert.match(compiler.reasons.join(" "), /compiler/i);

  const manifest = buildImpactPlan({
    root,
    changedPaths: ["packages-galerina/galerina-b/package.json"],
  });
  assert.equal(manifest.status, "FULL_REQUIRED");
  assert.match(manifest.reasons.join(" "), /manifest/i);
});

test("unknown root paths and malformed paths fail closed to full", async () => {
  const root = await fixture();
  for (const changedPath of ["scripts/unknown-tool.mjs", "../escape.mjs", "packages-galerina/not-declared/x.mjs"]) {
    const plan = buildImpactPlan({ root, changedPaths: [changedPath] });
    assert.equal(plan.status, "FULL_REQUIRED", changedPath);
    assert.equal(plan.commands.length, 0);
  }
});

test("empty changed set is a deterministic non-authorizing no-op", async () => {
  const root = await fixture();
  const plan = buildImpactPlan({ root, changedPaths: [] });
  assert.equal(plan.status, "NO_CHANGES");
  assert.equal(plan.authorizing, false);
  assert.deepEqual(plan.commands, []);
});
