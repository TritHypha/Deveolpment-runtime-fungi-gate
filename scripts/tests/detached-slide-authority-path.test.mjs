import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { after, test } from "node:test";
import assert from "node:assert/strict";

const SCRIPT = resolve("scripts/audit-detached-slide-authority-path.mjs");
const roots = [];

after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), "detached-slide-authority-"));
  roots.push(root);
  for (const [relativePath, source] of Object.entries(files)) {
    const path = join(root, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, source, "utf8");
  }
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync("git", ["config", "user.email", "fixture@example.invalid"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Detached authority fixture"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["commit", "--quiet", "-m", "fixture"], { cwd: root });
  return root;
}

function run(root, entries) {
  const args = [SCRIPT, "--root", root, "--json"];
  for (const entry of entries) args.push("--entry", entry);
  const child = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(child.signal, null, child.stderr);
  assert.doesNotThrow(() => JSON.parse(child.stdout), child.stderr || child.stdout);
  return { child, report: JSON.parse(child.stdout) };
}

function runApi(root, options) {
  const moduleUrl = pathToFileURL(SCRIPT).href;
  const program = [
    `import { auditDetachedAuthorityPath } from ${JSON.stringify(moduleUrl)};`,
    `const result = await auditDetachedAuthorityPath(${JSON.stringify({
      repoRoot: root,
      entryFiles: options.entryFiles,
      expectedHead: options.expectedHead,
      maximumFiles: options.maximumFiles,
      maximumEdges: options.maximumEdges,
    })});`,
    "process.stdout.write(`${JSON.stringify(result)}\\n`);",
  ].join("\n");
  const child = spawnSync(process.execPath, ["--input-type=module", "--eval", program], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(child.signal, null, child.stderr);
  assert.doesNotThrow(() => JSON.parse(child.stdout), child.stderr || child.stdout);
  return { child, report: JSON.parse(child.stdout) };
}

test("a snapshot-only detached GIR module is clean and emits complete provenance", () => {
  const root = fixture({
    "src/detached.ts": [
      "export function emitDetachedGir(snapshot) {",
      "  if (!Object.isFrozen(snapshot)) return { kind: 'REFUSED', reason: 'snapshot-not-frozen' };",
      "  return { kind: 'GIR_REFERENCE', digest: snapshot.checkedModuleDigest };",
      "}",
      "",
    ].join("\n"),
  });
  const { child, report } = run(root, ["src/detached.ts"]);

  assert.equal(child.status, 0, child.stderr);
  assert.equal(report.schema, "galerina.detached-slide-authority-path.v1");
  assert.equal(report.status, "CLEAN");
  assert.match(report.toolVersion, /^\d+\.\d+\.\d+$/u);
  assert.match(report.rulesetDigest, /^sha256:[0-9a-f]{64}$/u);
  assert.match(report.repositoryHead, /^[0-9a-f]{40}$/u);
  assert.equal(report.graphBuildPoint, null);
  assert.equal(report.graphFreshness, "UNKNOWN");
  assert.deepEqual(report.inspectedFiles.map((file) => file.path), ["src/detached.ts"]);
  assert.deepEqual(report.violations, []);
});

test("the detached snapshot emitter is not confused with the legacy AST GIR emitter", () => {
  const root = fixture({
    "src/checked-snapshot-gir-emitter.ts": "export const emitCanonicalGIRFromSnapshot = (bytes) => bytes;\n",
    "src/detached.ts": [
      "import { emitCanonicalGIRFromSnapshot } from './checked-snapshot-gir-emitter.js';",
      "export const x = (bytes) => emitCanonicalGIRFromSnapshot(bytes);",
      "",
    ].join("\n"),
  });
  const { child, report } = run(root, ["src/detached.ts"]);

  assert.equal(child.status, 0, JSON.stringify(report, null, 2));
  assert.equal(report.status, "CLEAN");
});

test("walks the complete local import closure before reporting clean", () => {
  const root = fixture({
    "src/detached.ts": "import { execute } from './helper.js';\nexport const run = execute;\n",
    "src/helper.ts": "export const execute = (bytes) => WebAssembly.instantiate(bytes);\n",
  });
  const { child, report } = run(root, ["src/detached.ts"]);

  assert.equal(child.status, 1, child.stderr || JSON.stringify(report, null, 2));
  assert.equal(report.status, "VIOLATION");
  assert.deepEqual(
    report.inspectedFiles.map((file) => file.path),
    ["src/detached.ts", "src/helper.ts"],
  );
  assert.ok(report.violations.some((edge) => edge.code === "WAT_WASM_EXECUTION"));
});

test("refuses a local import that cannot be resolved exactly", () => {
  const root = fixture({
    "src/detached.ts": "import { execute } from './missing.js';\nexport const run = execute;\n",
  });
  const { child, report } = run(root, ["src/detached.ts"]);

  assert.equal(child.status, 2, child.stderr || JSON.stringify(report, null, 2));
  assert.equal(report.status, "REFUSED");
  assert.ok(report.refusals.some((finding) => finding.code === "UNRESOLVED_CLOSURE"));
});

test("refuses Node built-ins outside the exact inert package allow-list", () => {
  const root = fixture({
    "src/detached.ts": "import { readFileSync } from 'node:fs';\nexport const read = readFileSync;\n",
  });
  const { child, report } = run(root, ["src/detached.ts"]);

  assert.equal(child.status, 2, child.stderr || JSON.stringify(report, null, 2));
  assert.equal(report.status, "REFUSED");
  assert.ok(report.inspectedEdges.some((edge) => edge.specifier === "node:fs" && edge.to === null));
  assert.ok(report.refusals.some((finding) => finding.code === "PACKAGE_IMPORT_NOT_INERT_ALLOWLIST"));
});

test("rejects Tri-Fuse authority bleed", () => {
  const root = fixture({
    "src/detached.ts": "import { proposeFusion } from '@galerina/tri-fuse';\nexport const run = proposeFusion;\n",
  });
  const { child, report } = run(root, ["src/detached.ts"]);

  assert.equal(child.status, 1, child.stderr || JSON.stringify(report, null, 2));
  assert.ok(report.violations.some((edge) => edge.code === "TRI_FUSE_RUNTIME"));
});

test("the exported audit refuses when the file ceiling truncates the closure", () => {
  const root = fixture({
    "src/detached.ts": "import { helper } from './helper.js';\nexport const run = helper;\n",
    "src/helper.ts": "export const helper = (bytes) => bytes;\n",
  });
  const expectedHead = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const { child, report } = runApi(root, {
    entryFiles: ["src/detached.ts"],
    expectedHead,
    maximumFiles: 1,
    maximumEdges: 8,
  });

  assert.equal(child.status, 0, child.stderr);
  assert.equal(report.status, "REFUSED");
  assert.equal(report.failureId, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
  assert.equal(report.repositoryHead, expectedHead);
  assert.equal(report.graphFreshness, "UNKNOWN");
});

const forbidden = [
  {
    name: "AST-to-GIR authority",
    code: "EMIT_GIR_AST_PATH",
    source: "import { emitGIR } from './gir-emitter.js';\nexport const x = (ast) => emitGIR(ast, {});\n",
  },
  {
    name: "TypeScript compiler API",
    code: "TYPESCRIPT_COMPILER_API",
    source: "import ts from 'typescript';\nexport const x = (text) => ts.createSourceFile('x.ts', text, ts.ScriptTarget.Latest);\n",
  },
  {
    name: "WAT or Wasm execution",
    code: "WAT_WASM_EXECUTION",
    source: "export const x = (bytes) => WebAssembly.instantiate(bytes);\n",
  },
  {
    name: "Tower runtime",
    code: "TOWER_RUNTIME",
    source: "import { TowerRuntime } from '@galerina/tower-citizen';\nexport const x = TowerRuntime;\n",
  },
  {
    name: "Tri-Pipe runtime",
    code: "TRI_PIPE_RUNTIME",
    source: "import { createTriPipeEngine } from '@galerina/tri-pipe';\nexport const x = createTriPipeEngine;\n",
  },
  {
    name: "Hypha index",
    code: "HYPHA_INDEX_RUNTIME",
    source: "import { scanCapabilities } from '@galerina/devtools-hypha';\nexport const x = scanCapabilities;\n",
  },
];

for (const vector of forbidden) {
  test(`rejects the planted ${vector.name} edge`, () => {
    const root = fixture({ "src/detached.ts": vector.source });
    const { child, report } = run(root, ["src/detached.ts"]);

    assert.equal(child.status, 1, child.stderr);
    assert.equal(report.status, "VIOLATION");
    assert.ok(
      report.violations.some((edge) => edge.code === vector.code),
      JSON.stringify(report, null, 2),
    );
  });
}

test("computed dynamic imports refuse as unknown analysis", () => {
  const root = fixture({
    "src/detached.ts": "export async function x(name) { return import(name); }\n",
  });
  const { child, report } = run(root, ["src/detached.ts"]);

  assert.equal(child.status, 2, child.stderr);
  assert.equal(report.status, "REFUSED");
  assert.ok(report.refusals.some((finding) => finding.code === "NON_LITERAL_DYNAMIC_IMPORT"));
});

test("literal dynamic imports remain analyzable", () => {
  const root = fixture({
    "src/detached.ts": "export async function x() { return import('./safe-helper.js'); }\n",
    "src/safe-helper.ts": "export const safe = true;\n",
  });
  const { child, report } = run(root, ["src/detached.ts"]);

  assert.equal(child.status, 0, JSON.stringify(report, null, 2));
  assert.equal(report.status, "CLEAN");
});

test("forbidden-looking text inside comments and ordinary strings is inert", () => {
  const root = fixture({
    "src/detached.ts": [
      "// import ts from 'typescript';",
      "export const example = \"import { TowerRuntime } from '@galerina/tower-citizen'\";",
      "export const ok = true;",
      "",
    ].join("\n"),
  });
  const { child, report } = run(root, ["src/detached.ts"]);

  assert.equal(child.status, 0, JSON.stringify(report, null, 2));
  assert.equal(report.status, "CLEAN");
});

test("template text is inert but executable interpolation remains visible", () => {
  const inertRoot = fixture({
    "src/detached.ts": [
      "export type Digest = `sha256:${string}`;",
      "export const prose = `WebAssembly.instantiate and import(name) are text`;",
      "export const ok = true;",
      "",
    ].join("\n"),
  });
  const inert = run(inertRoot, ["src/detached.ts"]);
  assert.equal(inert.child.status, 0, JSON.stringify(inert.report, null, 2));

  const dynamicRoot = fixture({
    "src/detached.ts": "export const load = (name) => `${import(name)}`;\n",
  });
  const dynamic = run(dynamicRoot, ["src/detached.ts"]);
  assert.equal(dynamic.child.status, 2, JSON.stringify(dynamic.report, null, 2));
  assert.ok(dynamic.report.refusals.some((finding) => finding.code === "NON_LITERAL_DYNAMIC_IMPORT"));

  const wasmRoot = fixture({
    "src/detached.ts": "export const run = (bytes) => `${WebAssembly.instantiate(bytes)}`;\n",
  });
  const wasm = run(wasmRoot, ["src/detached.ts"]);
  assert.equal(wasm.child.status, 1, JSON.stringify(wasm.report, null, 2));
  assert.ok(wasm.report.violations.some((finding) => finding.code === "WAT_WASM_EXECUTION"));
});

test("every requested entry must exist and stay inside the selected repository", () => {
  const root = fixture({ "src/detached.ts": "export const ok = true;\n" });

  const missing = run(root, ["src/missing.ts"]);
  assert.equal(missing.child.status, 2);
  assert.ok(missing.report.refusals.some((finding) => finding.code === "ENTRY_UNREADABLE"));

  const escape = run(root, ["../outside.ts"]);
  assert.equal(escape.child.status, 2);
  assert.ok(escape.report.refusals.some((finding) => finding.code === "ENTRY_OUTSIDE_ROOT"));
});

test("the inspected bytes must be bound to the reported repository commit", () => {
  const root = fixture({ "src/detached.ts": "export const value = 1;\n" });
  writeFileSync(join(root, "src", "detached.ts"), "export const value = 2;\n", "utf8");

  const changed = run(root, ["src/detached.ts"]);
  assert.equal(changed.child.status, 2);
  assert.ok(changed.report.refusals.some((finding) => finding.code === "ENTRY_NOT_COMMIT_BOUND"));

  writeFileSync(join(root, "src", "untracked.ts"), "export const value = 3;\n", "utf8");
  const untracked = run(root, ["src/untracked.ts"]);
  assert.equal(untracked.child.status, 2);
  assert.ok(untracked.report.refusals.some((finding) => finding.code === "ENTRY_NOT_COMMIT_BOUND"));
});
