// ts-retirement-generator.test.mjs — proves root-isolated tracked-corpus
// discovery, deterministic retirement output, and non-mutating drift refusal.
// Version: 1.0.0 · Task 7 generator governance.
// Related: scripts/ts-retirement-graph.mjs; scripts/lib/find-files.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const SCRIPT = resolve("scripts/ts-retirement-graph.mjs");

/**
 * Write one fixture file, creating its parent directories.
 *
 * @param {string} root fixture root
 * @param {string} relativePath fixture-relative path
 * @param {string} content exact content
 */
function write(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

/**
 * Run one shell-free command in the fixture.
 */
function command(root, executable, args) {
  return spawnSync(executable, args, { cwd: root, encoding: "utf8" });
}

/**
 * Create three tracked TypeScript sources plus every other executable-family
 * extension, two exact same-package Fungi twins, and one compiler plus one
 * governed authority-ledger entry.
 */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "ts-retirement-generator-"));
  write(
    root,
    "packages-galerina/galerina-framework-app-kernel/src/secret-gate.ts",
    "export const gate = true;\n",
  );
  write(
    root,
    "packages-galerina/galerina-framework-app-kernel/src/self-hosted/secret-gate.fungi",
    "pure flow gate() -> Bool { return true }\n",
  );
  write(
    root,
    "packages-galerina/galerina-core-compiler/src/compiler.ts",
    "export const compiler = true;\n",
  );
  write(
    root,
    "packages-galerina/galerina-core-compiler/src/parser.ts",
    "export const parse = true;\n",
  );
  write(
    root,
    "packages-galerina/galerina-core-compiler/src/self-hosted/parser.fungi",
    "pure flow parse() -> Bool { return true }\n",
  );
  write(root, "packages-galerina/galerina-core-compiler/types/api.d.ts", "export type Api = string;\n");
  write(root, "packages-galerina/galerina-core-compiler/src/module.mts", "export const moduleValue = 1;\n");
  write(root, "packages-galerina/galerina-core-compiler/src/common.cts", "export const commonValue = 1;\n");
  write(root, "packages-galerina/galerina-core-compiler/src/runtime.mjs", "export const runtimeValue = 1;\n");
  write(root, "packages-galerina/galerina-core-compiler/src/legacy.js", "export const legacyValue = 1;\n");
  write(root, "packages-galerina/galerina-core-compiler/src/legacy-common.cjs", "exports.value = 1;\n");
  write(root, "docs/executable-family-example.md", "A literal example named pretend.mjs is documentation only.\n");
  write(
    root,
    "docs/security/rd0528-compiler-authoritative-stages.json",
    JSON.stringify({
      twins: [{
        dir: "packages-galerina/galerina-core-compiler/src/self-hosted",
        file: "parser.fungi",
      }],
    }),
  );
  write(
    root,
    "docs/security/rd0361-authoritative-twins.json",
    JSON.stringify({
      twins: [{
        dir: "packages-galerina/galerina-framework-app-kernel/src/self-hosted",
        file: "secret-gate.fungi",
      }],
    }),
  );
  assert.equal(command(root, "git", ["init"]).status, 0);
  assert.equal(
    command(root, "git", ["add", "--", "packages-galerina", "docs"]).status,
    0,
  );
  write(
    root,
    "packages-galerina/galerina-core-compiler/src/untracked.mjs",
    "export const untracked = true;\n",
  );
  return root;
}

/**
 * Run the real retirement generator against the fixture.
 *
 * @param {string} root fixture root
 * @param {readonly string[]} args generator arguments
 */
function run(root, args = []) {
  return spawnSync(process.execPath, [SCRIPT, "--root", root, ...args], {
    encoding: "utf8",
    env: { ...process.env, SOURCE_DATE_EPOCH: "1700000000" },
  });
}

test("ts-retirement --check refuses drift and uses only the selected root", () => {
  const root = fixture();
  const jsonPath = join(root, "build", "ts-retirement", "ts-retirement.json");
  const markdown = join(root, "build", "ts-retirement", "TS-RETIREMENT.md");
  try {
    const missing = run(root, ["--check"]);
    assert.notEqual(missing.status, 0);
    assert.equal(existsSync(jsonPath), false);

    const generated = run(root);
    assert.equal(generated.status, 0, generated.stderr);
    const graph = JSON.parse(readFileSync(jsonPath, "utf8"));
    assert.equal(graph.totals.ts, 3);
    assert.equal(graph.totals.allTrackedTs, 4);
    assert.equal(graph.totals.allTrackedExecutable, 9);
    assert.equal(graph.totals.tsSource, 3);
    assert.equal(graph.totals.declarationTs, 1);
    assert.equal(graph.totals.mts, 1);
    assert.equal(graph.totals.cts, 1);
    assert.equal(graph.totals.mjs, 1);
    assert.equal(graph.totals.js, 1);
    assert.equal(graph.totals.cjs, 1);
    assert.deepEqual(Object.keys(graph.executableFamily), [
      "ts",
      "declarationTs",
      "mts",
      "cts",
      "mjs",
      "js",
      "cjs",
    ]);
    assert.deepEqual(graph.executableFamily.ts, [
      "packages-galerina/galerina-core-compiler/src/compiler.ts",
      "packages-galerina/galerina-core-compiler/src/parser.ts",
      "packages-galerina/galerina-framework-app-kernel/src/secret-gate.ts",
    ]);
    assert.deepEqual(graph.executableFamily.declarationTs, [
      "packages-galerina/galerina-core-compiler/types/api.d.ts",
    ]);
    assert.deepEqual(graph.executableFamily.mts, [
      "packages-galerina/galerina-core-compiler/src/module.mts",
    ]);
    assert.deepEqual(graph.executableFamily.cts, [
      "packages-galerina/galerina-core-compiler/src/common.cts",
    ]);
    assert.deepEqual(graph.executableFamily.mjs, [
      "packages-galerina/galerina-core-compiler/src/runtime.mjs",
    ]);
    assert.deepEqual(graph.executableFamily.js, [
      "packages-galerina/galerina-core-compiler/src/legacy.js",
    ]);
    assert.deepEqual(graph.executableFamily.cjs, [
      "packages-galerina/galerina-core-compiler/src/legacy-common.cjs",
    ]);
    assert.deepEqual(graph.allTrackedExecutablePaths, [
      ...graph.executableFamily.ts,
      ...graph.executableFamily.declarationTs,
      ...graph.executableFamily.mts,
      ...graph.executableFamily.cts,
      ...graph.executableFamily.mjs,
      ...graph.executableFamily.js,
      ...graph.executableFamily.cjs,
    ].sort());
    assert.match(
      graph.postSlideViolations.join("\n"),
      /tracked package executable-family paths; found 9/,
    );
    assert.equal(graph.totals.twinned, 2);
    assert.equal(graph.totals.compilerCore, 1);
    assert.equal(graph.totals.compilerAuthoritativeFlips, 1);
    assert.equal(graph.totals.governedAuthoritativeFlips, 1);
    assert.equal(graph.totals.authoritativeFlips, 2);
    assert.equal(graph.totals.compilerStageTotal, 1);
    assert.equal(graph.totals.compilerDifferential, 0);
    assert.equal(graph.totals.governedTwinTotal, 1);
    assert.equal(graph.totals.governedDifferential, 0);
    assert.equal(run(root, ["--check"]).status, 0);

    writeFileSync(markdown, "tampered\n");
    const drifted = run(root, ["--check"]);
    assert.notEqual(drifted.status, 0);
    assert.equal(readFileSync(markdown, "utf8"), "tampered\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const INVALID_AUTHORITIES = [
  {
    name: "missing source",
    prepare(root) {
      write(
        root,
        "docs/security/rd0361-authoritative-twins.json",
        JSON.stringify({
          twins: [{
            dir: "packages-galerina/galerina-framework-app-kernel/src/self-hosted",
            file: "missing.fungi",
          }],
        }),
      );
    },
  },
  {
    name: "duplicate source",
    prepare(root) {
      const entry = {
        dir: "packages-galerina/galerina-framework-app-kernel/src/self-hosted",
        file: "secret-gate.fungi",
      };
      write(
        root,
        "docs/security/rd0361-authoritative-twins.json",
        JSON.stringify({ twins: [entry, entry] }),
      );
    },
  },
  {
    name: "source outside governed twin directories",
    prepare(root) {
      write(
        root,
        "packages-galerina/galerina-example/src/self-hosted/orphan.fungi",
        "pure flow orphan() -> Bool { return false }\n",
      );
      write(
        root,
        "docs/security/rd0361-authoritative-twins.json",
        JSON.stringify({
          twins: [{
            dir: "packages-galerina/galerina-example/src/self-hosted",
            file: "orphan.fungi",
          }],
        }),
      );
    },
  },
  {
    name: "ambiguous parent path",
    prepare(root) {
      write(
        root,
        "docs/security/rd0361-authoritative-twins.json",
        JSON.stringify({
          twins: [{
            dir: "packages-galerina/galerina-framework-app-kernel/src/self-hosted/..",
            file: "secret-gate.fungi",
          }],
        }),
      );
    },
  },
  {
    name: "cross-ledger duplicate",
    prepare(root) {
      write(
        root,
        "docs/security/rd0528-compiler-authoritative-stages.json",
        JSON.stringify({
          twins: [{
            dir: "packages-galerina/galerina-framework-app-kernel/src/self-hosted",
            file: "secret-gate.fungi",
          }],
        }),
      );
    },
  },
];

for (const invalid of INVALID_AUTHORITIES) {
  test(`ts-retirement refuses authority ledger ${invalid.name}`, () => {
    const root = fixture();
    try {
      invalid.prepare(root);
      assert.equal(
        command(root, "git", ["add", "--", "packages-galerina", "docs"]).status,
        0,
      );
      const result = run(root);
      assert.notEqual(result.status, 0);
      assert.match(
        `${result.stdout}\n${result.stderr}`,
        /authority|ledger|missing|duplicate|twinned|path|canonical/i,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
