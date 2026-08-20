import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import test from "node:test";

import { auditDetachedAuthorityPath } from "../audit-detached-slide-authority-path.mjs";

const ROOT = resolve(import.meta.dirname, "..", "..");
const FIXTURES = "scripts/tests/fixtures/detached-authority";
const GRAPH_PROJECT = "Galerina-detached-authority-detectors";
const REPOSITORY_HEAD = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: ROOT,
  encoding: "utf8",
}).trim();

process.env.GALERINA_DETACHED_AUTHORITY_GRAPH_PROJECT = GRAPH_PROJECT;

function auditFixture(name, overrides = {}) {
  return auditDetachedAuthorityPath({
    repoRoot: ROOT,
    entryFiles: [`${FIXTURES}/${name}/entry.ts`],
    expectedHead: REPOSITORY_HEAD,
    ...overrides,
  });
}

function assertRepositoryRelativeLocator(locator) {
  assert.equal(typeof locator, "string");
  assert.equal(isAbsolute(locator), false);
  assert.equal(locator.includes(":"), false);

  const resolved = resolve(ROOT, locator);
  const canonical = relative(ROOT, resolved).replaceAll("\\", "/");
  assert.notEqual(canonical, "");
  assert.equal(canonical === ".." || canonical.startsWith("../"), false);
  assert.equal(locator, canonical);
}

function assertDeepFrozen(value) {
  if (value === null || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  for (const member of Object.values(value)) assertDeepFrozen(member);
}

function assertNoFixtureSourceBody(value, source) {
  if (typeof value === "string") {
    const jsonEscapedSource = JSON.stringify(source).slice(1, -1);
    assert.equal(value.includes(source), false);
    assert.equal(value.includes(jsonEscapedSource), false);
    return;
  }

  if (Array.isArray(value)) {
    for (const member of value) assertNoFixtureSourceBody(member, source);
    return;
  }

  if (value !== null && typeof value === "object") {
    for (const member of Object.values(value)) assertNoFixtureSourceBody(member, source);
  }
}

function assertDetachedAuthorityAuditV1(result, fixture) {
  assert.deepEqual(Object.keys(result).sort(), [
    "entryFiles",
    "failureId",
    "graphBuildPoint",
    "graphFreshness",
    "inspectedEdges",
    "inspectedFiles",
    "repositoryHead",
    "rulesetDigest",
    "schema",
    "status",
    "toolVersion",
    "violations",
  ]);
  assert.equal(result.schema, "DetachedAuthorityAuditV1");
  assert.match(result.toolVersion, /^[0-9]+\.[0-9]+\.[0-9]+$/u);
  assert.match(result.rulesetDigest, /^[a-f0-9]{64}$/u);
  assert.equal(result.repositoryHead, REPOSITORY_HEAD);
  assert.equal(result.graphBuildPoint, REPOSITORY_HEAD);
  assert.equal(result.graphFreshness, "FRESH");
  assert.deepEqual([...result.entryFiles].sort(), result.entryFiles);

  for (const entryFile of result.entryFiles) assertRepositoryRelativeLocator(entryFile);
  for (const file of result.inspectedFiles) {
    assert.deepEqual(Object.keys(file).sort(), ["digest", "locator"]);
    assertRepositoryRelativeLocator(file.locator);
    assert.match(file.digest, /^[a-f0-9]{64}$/u);
  }
  for (const edge of result.inspectedEdges) {
    assert.deepEqual(Object.keys(edge).sort(), ["from", "id", "to"]);
    assertRepositoryRelativeLocator(edge.from);
    assertRepositoryRelativeLocator(edge.to);
    assert.equal(typeof edge.id, "string");
  }
  for (const violation of result.violations) {
    assert.deepEqual(Object.keys(violation).sort(), ["edgeId", "file", "id"]);
    assertRepositoryRelativeLocator(violation.file);
    assert.equal(typeof violation.edgeId, "string");
    assert.equal(typeof violation.id, "string");
  }

  const fixtureSource = readFileSync(resolve(ROOT, `${FIXTURES}/${fixture}/entry.ts`), "utf8");
  assertNoFixtureSourceBody(result, fixtureSource);
  assertDeepFrozen(result);
}

async function withTemporaryFixture(files, callback) {
  const base = resolve(ROOT, FIXTURES, ".task-2-");
  const temporaryRoot = mkdtempSync(base);
  try {
    for (const [name, source] of Object.entries(files)) {
      writeFileSync(resolve(temporaryRoot, name), source, "utf8");
    }
    const locator = relative(ROOT, temporaryRoot).replaceAll("\\", "/");
    return await callback(locator);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function runCli(entry, extraArguments = []) {
  return spawnSync(process.execPath, [
    resolve(ROOT, "scripts/audit-detached-slide-authority-path.mjs"),
    "--repo-root", ROOT,
    "--entry", entry,
    "--expected-head", REPOSITORY_HEAD,
    ...extraArguments,
  ], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    timeout: 75_000,
    windowsHide: true,
  });
}

test("green closure accepts snapshot bytes and typed GIR/refusal only", async () => {
  const result = await auditFixture("green");

  assert.equal(result.status, "PASS", JSON.stringify(result));
  assert.equal(result.failureId, null);
  assert.equal(result.toolVersion, "1.0.1");
  assert.deepEqual(result.violations, []);
  assertDetachedAuthorityAuditV1(result, "green");
});

for (const { fixture, identifier, expectedViolations, status } of [
  { fixture: "red-ast", identifier: "AST_REENTRY", expectedViolations: 5, status: "FAIL" },
  { fixture: "red-typescript", identifier: "TYPESCRIPT_REENTRY", expectedViolations: 4, status: "FAIL" },
  { fixture: "red-wasm", identifier: "LEGACY_EXECUTION_REENTRY", expectedViolations: 5, status: "FAIL" },
  { fixture: "red-component", identifier: "COMPONENT_AUTHORITY_BLEED", expectedViolations: 4, status: "FAIL" },
  { fixture: "red-unresolved", identifier: "UNRESOLVED_CLOSURE", expectedViolations: 3, status: "REFUSED" },
]) {
  test(`${identifier} fixture returns its exact failure identifier`, async () => {
    const result = await auditFixture(fixture);

    assert.equal(result.status, status, JSON.stringify(result));
    assert.equal(result.failureId, identifier);
    assert.deepEqual(
      result.violations.map((violation) => violation.id),
      Array.from({ length: expectedViolations }, () => identifier),
    );
    assertDetachedAuthorityAuditV1(result, fixture);
  });
}

test("static imports, re-exports and literal dynamic imports close transitively", async () => {
  await withTemporaryFixture({
    "entry.ts": "import { a } from './a.ts'; export { b } from './b.ts'; export const c = import('./c.ts'); export const total = a;\n",
    "a.ts": "export const a = 1;\n",
    "b.ts": "export const b = 2;\n",
    "c.ts": "export const c = 3;\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.ts`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "PASS", JSON.stringify(result));
    assert.equal(result.inspectedFiles.length, 4);
    assert.equal(result.inspectedEdges.length, 3);
  });
});

test("renamed imports and namespace calls cannot hide forbidden symbols", async () => {
  await withTemporaryFixture({
    "entry.ts": "import { emitGIR as lower } from './helper.ts'; import * as legacy from './helper.ts'; export const first = lower({}, {}); export const second = legacy.emitGIR({}, {});\n",
    "helper.ts": "export function emitGIR() { return new Uint8Array(); }\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.ts`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "FAIL", JSON.stringify(result));
    assert.equal(result.failureId, "AST_REENTRY");
    assert.deepEqual(result.violations.map((violation) => violation.id), ["AST_REENTRY", "AST_REENTRY"]);
  });
});

test("a forbidden default export cannot hide behind a default import name", async () => {
  await withTemporaryFixture({
    "entry.ts": "import lower from './helper.ts'; export const result = lower({}, {});\n",
    "helper.ts": "export default function emitGIR() { return new Uint8Array(); }\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.ts`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "FAIL", JSON.stringify(result));
    assert.equal(result.failureId, "AST_REENTRY");
    assert.deepEqual(result.violations.map((finding) => finding.id), ["AST_REENTRY"]);
  });
});

test("a forbidden default export cannot hide behind a re-export barrel", async () => {
  await withTemporaryFixture({
    "entry.ts": "import lower from './barrel.ts'; export const result = lower({}, {});\n",
    "barrel.ts": "export { default } from './helper.ts';\n",
    "helper.ts": "export default function emitGIR() { return new Uint8Array(); }\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.ts`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "FAIL", JSON.stringify(result));
    assert.equal(result.failureId, "AST_REENTRY");
    assert.equal(result.inspectedFiles.length, 3);
  });
});

test("a forbidden imported binding cannot hide behind an assignment alias", async () => {
  await withTemporaryFixture({
    "entry.ts": "import { emitGIR as imported } from './helper.ts'; const lower = imported; export const result = lower({}, {});\n",
    "helper.ts": "export function emitGIR() { return new Uint8Array(); }\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.ts`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "FAIL", JSON.stringify(result));
    assert.equal(result.failureId, "AST_REENTRY");
    assert.deepEqual(result.violations.map((finding) => finding.id), ["AST_REENTRY"]);
  });
});

test("a later assignment propagates forbidden authority to its lexical binding", async () => {
  await withTemporaryFixture({
    "entry.ts": "import { emitGIR as imported } from './helper.ts'; let lower; lower = imported; export const result = lower({}, {});\n",
    "helper.ts": "export function emitGIR() { return new Uint8Array(); }\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.ts`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "FAIL", JSON.stringify(result));
    assert.equal(result.failureId, "AST_REENTRY");
  });
});

test("a local shadow does not inherit an outer imported authority binding", async () => {
  await withTemporaryFixture({
    "entry.ts": "import { emitGIR as lower } from './helper.ts'; function localOnly() { const lower = () => 1; return lower(); } export const result = localOnly();\n",
    "helper.ts": "export function emitGIR() { return new Uint8Array(); }\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.ts`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "PASS", JSON.stringify(result));
  });
});

test("a later benign reassignment clears authority before a subsequent call", async () => {
  await withTemporaryFixture({
    "entry.ts": "import { emitGIR as imported } from './helper.ts'; let lower = imported; lower = () => 1; export const result = lower();\n",
    "helper.ts": "export function emitGIR() { return new Uint8Array(); }\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.ts`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "PASS", JSON.stringify(result));
  });
});

test("conditional-expression branch side effects cannot erase a forbidden assignment", async () => {
  await withTemporaryFixture({
    "entry.ts": "import { emitGIR as imported } from './helper.ts'; const benign = () => 1; let lower = benign; const cond = process.argv.length > 1; cond ? (lower = imported) : (lower = benign); export const result = lower({}, {});\n",
    "helper.ts": "export function emitGIR() { return new Uint8Array(); }\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.ts`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "FAIL", JSON.stringify(result));
    assert.equal(result.failureId, "AST_REENTRY");
  });
});

test("switch and try joins retain authority from every reachable assignment branch", async () => {
  for (const source of [
    "import { emitGIR as imported } from './helper.ts'; const benign = () => 1; let lower = benign; switch (process.argv.length) { case 0: lower = imported; break; default: lower = benign; } export const result = lower({}, {});\n",
    "import { emitGIR as imported } from './helper.ts'; const benign = () => 1; let lower = benign; try { lower = imported; } catch { lower = benign; } export const result = lower({}, {});\n",
  ]) {
    await withTemporaryFixture({
      "entry.ts": source,
      "helper.ts": "export function emitGIR() { return new Uint8Array(); }\n",
    }, async (locator) => {
      const result = await auditDetachedAuthorityPath({
        repoRoot: ROOT,
        entryFiles: [`${locator}/entry.ts`],
        expectedHead: REPOSITORY_HEAD,
      });

      assert.equal(result.status, "FAIL", JSON.stringify(result));
      assert.equal(result.failureId, "AST_REENTRY");
    });
  }
});

test("benign switch and try joins do not manufacture authority", async () => {
  for (const source of [
    "const first = () => 1; const second = () => 2; let lower = first; switch (process.argv.length) { case 0: lower = first; break; default: lower = second; } export const result = lower();\n",
    "const first = () => 1; const second = () => 2; let lower = first; try { lower = second; } catch { lower = first; } export const result = lower();\n",
  ]) {
    await withTemporaryFixture({ "entry.ts": source }, async (locator) => {
      const result = await auditDetachedAuthorityPath({
        repoRoot: ROOT,
        entryFiles: [`${locator}/entry.ts`],
        expectedHead: REPOSITORY_HEAD,
      });

      assert.equal(result.status, "PASS", JSON.stringify(result));
    });
  }
});

test("a forbidden namespace member cannot hide behind destructuring", async () => {
  await withTemporaryFixture({
    "entry.ts": "import * as legacy from './helper.ts'; const { emitGIR: lower } = legacy; export const result = lower({}, {});\n",
    "helper.ts": "export function emitGIR() { return new Uint8Array(); }\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.ts`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "FAIL", JSON.stringify(result));
    assert.equal(result.failureId, "AST_REENTRY");
    assert.deepEqual(result.violations.map((finding) => finding.id), ["AST_REENTRY"]);
  });
});

test("a constant-computed namespace member retains its forbidden surface", async () => {
  await withTemporaryFixture({
    "entry.ts": "import * as legacy from './helper.ts'; export const result = legacy['emit' + 'GIR']({}, {});\n",
    "helper.ts": "export function emitGIR() { return new Uint8Array(); }\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.ts`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "FAIL", JSON.stringify(result));
    assert.equal(result.failureId, "AST_REENTRY");
  });
});

test("an unresolvable computed member on a tainted namespace refuses", async () => {
  await withTemporaryFixture({
    "entry.ts": "import * as legacy from './helper.ts'; const member = process.argv[2]; export const result = legacy[member]({}, {});\n",
    "helper.ts": "export function emitGIR() { return new Uint8Array(); }\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.ts`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "REFUSED", JSON.stringify(result));
    assert.equal(result.failureId, "UNRESOLVED_CLOSURE");
  });
});

test("literal CommonJS require enters closure and preserves forbidden surfaces", async () => {
  await withTemporaryFixture({
    "entry.cjs": "const legacy = require('./helper.cjs'); module.exports = legacy.emitGIR({}, {});\n",
    "helper.cjs": "exports.emitGIR = function emitGIR() { return new Uint8Array(); };\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.cjs`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "FAIL", JSON.stringify(result));
    assert.equal(result.failureId, "AST_REENTRY");
    assert.equal(result.inspectedFiles.length, 2);
  });
});

test("an inline CommonJS require cannot hide a forbidden property surface", async () => {
  await withTemporaryFixture({
    "entry.cjs": "module.exports = require('./helper.cjs').emitGIR({}, {});\n",
    "helper.cjs": "exports.emitGIR = function emitGIR() { return new Uint8Array(); };\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.cjs`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "FAIL", JSON.stringify(result));
    assert.equal(result.failureId, "AST_REENTRY");
    assert.equal(result.inspectedFiles.length, 2);
  });
});

test("module.require enters closure for namespace and inline forbidden surfaces", async () => {
  await withTemporaryFixture({
    "entry.cjs": "const legacy = module.require('./helper.cjs'); const first = legacy.emitGIR({}, {}); const second = module.require('./helper.cjs').emitGIR({}, {}); module.exports = [first, second];\n",
    "helper.cjs": "exports.emitGIR = function emitGIR() { return new Uint8Array(); };\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.cjs`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "FAIL", JSON.stringify(result));
    assert.equal(result.failureId, "AST_REENTRY");
    assert.equal(result.inspectedFiles.length, 2);
    assert.deepEqual(result.violations.map((finding) => finding.id), ["AST_REENTRY", "AST_REENTRY"]);
  });
});

test("chained module aliases and renamed destructuring retain loader closure", async () => {
  await withTemporaryFixture({
    "entry.cjs": "const first = module; const second = first; const { require: load } = second; module.exports = load('./helper.cjs');\n",
    "helper.cjs": "module.exports = require('typescript');\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.cjs`],
      expectedHead: REPOSITORY_HEAD,
    });
    const entry = `${locator}/entry.cjs`;
    const helper = `${locator}/helper.cjs`;

    assert.equal(result.status, "FAIL", JSON.stringify(result));
    assert.equal(result.failureId, "TYPESCRIPT_REENTRY");
    assert.equal(result.inspectedFiles.some((file) => file.locator === helper), true);
    assert.equal(result.inspectedEdges.filter((edge) => edge.from === entry && edge.to === helper).length, 1);
    assert.equal(result.violations.some((finding) => finding.id === "TYPESCRIPT_REENTRY" && finding.file === helper), true);
  });
});

test("deterministic computed module properties retain exact loader closure", async () => {
  await withTemporaryFixture({
    "entry.cjs": "const literal = module['require']('./helper.cjs'); const concatenated = module['re' + 'quire']('./helper.cjs'); const member = 'require'; const bound = module[member]('./helper.cjs'); const mod = module; const { [member]: load } = mod; const destructured = load('./helper.cjs'); module.exports = [literal, concatenated, bound, destructured];\n",
    "helper.cjs": "module.exports = require('typescript');\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.cjs`],
      expectedHead: REPOSITORY_HEAD,
    });
    const entry = `${locator}/entry.cjs`;
    const helper = `${locator}/helper.cjs`;

    assert.equal(result.status, "FAIL", JSON.stringify(result));
    assert.equal(result.failureId, "TYPESCRIPT_REENTRY");
    assert.equal(result.inspectedFiles.some((file) => file.locator === helper), true);
    assert.equal(result.inspectedEdges.filter((edge) => edge.from === entry && edge.to === helper).length, 4);
    assert.equal(result.violations.some((finding) => finding.id === "TYPESCRIPT_REENTRY" && finding.file === helper), true);
  });
});

test("an unresolved computed property on the intrinsic module object refuses", async () => {
  await withTemporaryFixture({
    "entry.cjs": "const member = process.argv[0]; module.exports = module[member]('./helper.cjs');\n",
    "helper.cjs": "module.exports = 1;\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.cjs`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "REFUSED", JSON.stringify(result));
    assert.equal(result.failureId, "UNRESOLVED_CLOSURE");
  });
});

test("computed and destructured properties on a shadowed module stay benign", async () => {
  await withTemporaryFixture({
    "entry.cjs": "const module = { require() { return { safe() { return 1; } }; } }; const member = 'require'; const { require: load } = module; const first = load('./missing.cjs').safe(); const second = module[member]('./missing.cjs').safe(); module.value = [first, second];\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.cjs`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "PASS", JSON.stringify(result));
    assert.equal(result.inspectedEdges.length, 0);
  });
});

for (const { name, source } of [
  {
    name: "an object binding default retains intrinsic loader closure",
    source: "const { load = require } = {}; module.exports = load('./helper.cjs');\n",
  },
  {
    name: "a nested object binding default retains intrinsic loader closure",
    source: "const { nested: { load = require } = {} } = {}; module.exports = load('./helper.cjs');\n",
  },
  {
    name: "an array binding default retains intrinsic loader closure",
    source: "const [load = require] = []; module.exports = load('./helper.cjs');\n",
  },
  {
    name: "a function parameter binding default retains intrinsic loader closure",
    source: "function invoke({ load = require } = {}) { return load('./helper.cjs'); } module.exports = invoke({});\n",
  },
  {
    name: "a destructuring assignment default retains intrinsic loader closure",
    source: "let load; ({ load = require } = {}); module.exports = load('./helper.cjs');\n",
  },
]) {
  test(name, async () => {
    await withTemporaryFixture({
      "entry.cjs": source,
      "helper.cjs": "module.exports = require('typescript');\n",
    }, async (locator) => {
      const result = await auditDetachedAuthorityPath({
        repoRoot: ROOT,
        entryFiles: [`${locator}/entry.cjs`],
        expectedHead: REPOSITORY_HEAD,
      });
      const entry = `${locator}/entry.cjs`;
      const helper = `${locator}/helper.cjs`;

      assert.equal(result.status, "FAIL", JSON.stringify(result));
      assert.equal(result.failureId, "TYPESCRIPT_REENTRY");
      assert.equal(result.inspectedFiles.some((file) => file.locator === helper), true);
      assert.equal(result.inspectedEdges.filter((edge) => edge.from === entry && edge.to === helper).length, 1);
      assert.equal(result.violations.some((finding) => finding.id === "TYPESCRIPT_REENTRY" && finding.file === helper), true);
    });
  });
}

test("authority-sensitive nested rest binding ambiguity refuses", async () => {
  await withTemporaryFixture({
    "entry.cjs": "const { nested: { ...rest } = module } = {}; module.exports = rest.require('./helper.cjs');\n",
    "helper.cjs": "module.exports = 1;\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.cjs`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "REFUSED", JSON.stringify(result));
    assert.equal(result.failureId, "UNRESOLVED_CLOSURE");
  });
});

test("locally shadowed require and module binding defaults stay benign", async () => {
  await withTemporaryFixture({
    "entry.cjs": "function require() { return { safe() { return 1; } }; } const module = { safe: 1 }; const { load = require, mod = module } = {}; module.value = [load().safe(), mod.safe];\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.cjs`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "PASS", JSON.stringify(result));
    assert.equal(result.inspectedEdges.length, 0);
  });
});

test("module.require nonliteral and package loads fail closed", async () => {
  await withTemporaryFixture({
    "nonliteral.cjs": "const target = './helper.cjs'; module.exports = module.require(target);\n",
    "package.cjs": "module.exports = module.require('left-pad');\n",
    "helper.cjs": "module.exports = 1;\n",
  }, async (locator) => {
    for (const entry of ["nonliteral.cjs", "package.cjs"]) {
      const result = await auditDetachedAuthorityPath({
        repoRoot: ROOT,
        entryFiles: [`${locator}/${entry}`],
        expectedHead: REPOSITORY_HEAD,
      });

      assert.equal(result.status, "REFUSED", JSON.stringify(result));
      assert.equal(result.failureId, "UNRESOLVED_CLOSURE");
    }
  });
});

test("a lexically shadowed module.require is not intrinsic", async () => {
  await withTemporaryFixture({
    "entry.cjs": "const module = { require() { return { safe() { return 1; } }; } }; const result = module.require('./missing.cjs').safe();\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.cjs`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "PASS", JSON.stringify(result));
    assert.equal(result.inspectedEdges.length, 0);
  });
});

test("an intrinsic loader escaping into a local function parameter refuses", async () => {
  await withTemporaryFixture({
    "require.cjs": "function delayed(load) { return load('./helper.cjs'); } module.exports = delayed(require);\n",
    "module-require.cjs": "function delayed(load) { return load('./helper.cjs'); } module.exports = delayed(module.require);\n",
    "helper.cjs": "module.exports = 1;\n",
  }, async (locator) => {
    for (const entry of ["require.cjs", "module-require.cjs"]) {
      const result = await auditDetachedAuthorityPath({
        repoRoot: ROOT,
        entryFiles: [`${locator}/${entry}`],
        expectedHead: REPOSITORY_HEAD,
      });

      assert.equal(result.status, "REFUSED", JSON.stringify(result));
      assert.equal(result.failureId, "UNRESOLVED_CLOSURE");
    }
  });
});

test("an aliased CommonJS loader retains closure and member authority", async () => {
  await withTemporaryFixture({
    "entry.cjs": "const load = require; const legacy = load('./helper.cjs'); module.exports = legacy.emitGIR({}, {});\n",
    "helper.cjs": "exports.emitGIR = function emitGIR() { return new Uint8Array(); };\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.cjs`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "FAIL", JSON.stringify(result));
    assert.equal(result.failureId, "AST_REENTRY");
    assert.equal(result.inspectedFiles.length, 2);
  });
});

test("aliased CommonJS inline and destructured members retain authority", async () => {
  await withTemporaryFixture({
    "entry.cjs": "const load = require; const first = load('./helper.cjs').emitGIR({}, {}); const { emitGIR: lower } = load('./helper.cjs'); module.exports = [first, lower({}, {})];\n",
    "helper.cjs": "exports.emitGIR = function emitGIR() { return new Uint8Array(); };\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.cjs`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "FAIL", JSON.stringify(result));
    assert.equal(result.failureId, "AST_REENTRY");
    assert.equal(result.inspectedFiles.length, 2);
  });
});

test("a locally shadowed require is not treated as the intrinsic loader", async () => {
  await withTemporaryFixture({
    "entry.cjs": "function require() { return { safe() { return 1; } }; } module.exports = require('./missing.cjs').safe();\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.cjs`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "PASS", JSON.stringify(result));
    assert.equal(result.inspectedEdges.length, 0);
  });
});

test("aliased CommonJS nonliteral and package loads fail closed", async () => {
  await withTemporaryFixture({
    "nonliteral.cjs": "const load = require; const target = './helper.cjs'; module.exports = load(target);\n",
    "package.cjs": "const load = require; module.exports = load('left-pad');\n",
    "helper.cjs": "module.exports = 1;\n",
  }, async (locator) => {
    for (const entry of ["nonliteral.cjs", "package.cjs"]) {
      const result = await auditDetachedAuthorityPath({
        repoRoot: ROOT,
        entryFiles: [`${locator}/${entry}`],
        expectedHead: REPOSITORY_HEAD,
      });

      assert.equal(result.status, "REFUSED", JSON.stringify(result));
      assert.equal(result.failureId, "UNRESOLVED_CLOSURE");
    }
  });
});

test("TypeScript import-equals require enters closure and preserves forbidden surfaces", async () => {
  await withTemporaryFixture({
    "entry.ts": "import legacy = require('./helper.ts'); export const result = legacy.emitGIR({}, {});\n",
    "helper.ts": "export function emitGIR() { return new Uint8Array(); }\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.ts`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "FAIL", JSON.stringify(result));
    assert.equal(result.failureId, "AST_REENTRY");
    assert.equal(result.inspectedFiles.length, 2);
  });
});

test("non-literal and unapproved package require forms fail closed", async () => {
  await withTemporaryFixture({
    "nonliteral.cjs": "const target = './helper.cjs'; module.exports = require(target);\n",
    "package.cjs": "module.exports = require('left-pad');\n",
    "helper.cjs": "module.exports = 1;\n",
  }, async (locator) => {
    for (const entry of ["nonliteral.cjs", "package.cjs"]) {
      const result = await auditDetachedAuthorityPath({
        repoRoot: ROOT,
        entryFiles: [`${locator}/${entry}`],
        expectedHead: REPOSITORY_HEAD,
      });

      assert.equal(result.status, "REFUSED", JSON.stringify(result));
      assert.equal(result.failureId, "UNRESOLVED_CLOSURE");
    }
  });
});

test("CommonJS require cannot hide a forbidden dependency", async () => {
  await withTemporaryFixture({
    "entry.cjs": "module.exports = require('typescript');\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.cjs`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "FAIL", JSON.stringify(result));
    assert.equal(result.failureId, "TYPESCRIPT_REENTRY");
  });
});

test("forbidden module rules do not match benign substring collisions", async () => {
  await withTemporaryFixture({
    "entry.ts": "import { forecast } from './forecast.ts'; export const value = forecast;\n",
    "forecast.ts": "export const forecast = 1;\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.ts`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "PASS", JSON.stringify(result));
  });
});

test("case-variant entry duplicates refuse before traversal", async () => {
  const lower = `${FIXTURES}/green/entry.ts`;
  const result = await auditDetachedAuthorityPath({
    repoRoot: ROOT,
    entryFiles: [lower, lower.toUpperCase()],
    expectedHead: REPOSITORY_HEAD,
  });

  assert.equal(result.status, "REFUSED", JSON.stringify(result));
  assert.equal(result.failureId, "DETACHED_AUTHORITY_CASE_COLLISION");
});

test("file and edge ceilings refuse rather than returning partial PASS", async () => {
  const fileLimited = await auditDetachedAuthorityPath({
    repoRoot: ROOT,
    entryFiles: [
      `${FIXTURES}/green/entry.ts`,
      `${FIXTURES}/red-wasm/entry.ts`,
    ],
    expectedHead: REPOSITORY_HEAD,
    maximumFiles: 1,
  });
  const edgeLimited = await auditFixture("red-typescript", { maximumEdges: 1 });

  assert.equal(fileLimited.status, "REFUSED", JSON.stringify(fileLimited));
  assert.equal(fileLimited.failureId, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
  assert.equal(edgeLimited.status, "REFUSED", JSON.stringify(edgeLimited));
  assert.equal(edgeLimited.failureId, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
});

test("the per-file byte ceiling refuses before parsing oversized source", async () => {
  await withTemporaryFixture({
    "entry.ts": `export const oversized = '${"x".repeat((4 * 1024 * 1024) + 1)}';\n`,
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.ts`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "REFUSED", JSON.stringify(result));
    assert.equal(result.failureId, "UNRESOLVED_CLOSURE");
    assert.deepEqual(result.inspectedFiles, []);
  });
});

test("ruleset digest is stable across entry order", async () => {
  const entries = [
    `${FIXTURES}/green/entry.ts`,
    `${FIXTURES}/red-wasm/entry.ts`,
  ];
  const forward = await auditDetachedAuthorityPath({
    repoRoot: ROOT,
    entryFiles: entries,
    expectedHead: REPOSITORY_HEAD,
  });
  const reverse = await auditDetachedAuthorityPath({
    repoRoot: ROOT,
    entryFiles: [...entries].reverse(),
    expectedHead: REPOSITORY_HEAD,
  });

  assert.equal(forward.rulesetDigest, reverse.rulesetDigest);
});

test("ambient graph-project selection cannot redirect programmatic authority", async () => {
  const prior = process.env.GALERINA_DETACHED_AUTHORITY_GRAPH_PROJECT;
  process.env.GALERINA_DETACHED_AUTHORITY_GRAPH_PROJECT = "attacker-selected-project";
  try {
    const result = await auditFixture("green");
    assert.equal(result.status, "PASS", JSON.stringify(result));
  } finally {
    if (prior === undefined) delete process.env.GALERINA_DETACHED_AUTHORITY_GRAPH_PROJECT;
    else process.env.GALERINA_DETACHED_AUTHORITY_GRAPH_PROJECT = prior;
  }
});

test("a PATH-spoofed executable cannot redirect graph inspection", { skip: process.platform !== "win32" }, async () => {
  const temporaryRoot = mkdtempSync(resolve(ROOT, FIXTURES, ".task-2-provider-"));
  const priorPath = process.env.PATH;
  try {
    copyFileSync(process.execPath, resolve(temporaryRoot, "codebase-memory-mcp.exe"));
    process.env.PATH = `${temporaryRoot};${priorPath ?? ""}`;
    const result = await auditFixture("green");
    assert.equal(result.status, "PASS", JSON.stringify(result));
  } finally {
    process.env.PATH = priorPath;
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("a USERPROFILE spoof cannot redirect the native graph provider home", { skip: process.platform !== "win32" }, async () => {
  const temporaryRoot = mkdtempSync(resolve(ROOT, FIXTURES, ".task-2-userprofile-"));
  const priorProfile = process.env.USERPROFILE;
  try {
    process.env.USERPROFILE = temporaryRoot;
    const result = await auditFixture("green");
    assert.equal(result.status, "PASS", JSON.stringify(result));
  } finally {
    if (priorProfile === undefined) delete process.env.USERPROFILE;
    else process.env.USERPROFILE = priorProfile;
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("hostile provider-affecting ambient variables cannot redirect graph authority", async () => {
  const temporaryRoot = mkdtempSync(resolve(ROOT, FIXTURES, ".task-2-hostile-env-"));
  const hostile = {
    CODEBASE_MEMORY_DB: resolve(temporaryRoot, "hostile.db"),
    CODEBASE_MEMORY_HOME: temporaryRoot,
    CODEBASE_MEMORY_PROJECT: "attacker-selected-project",
    HOME: temporaryRoot,
    NODE_OPTIONS: "--require=definitely-missing-detached-authority-hook",
    NODE_PATH: temporaryRoot,
    PATH: temporaryRoot,
    PYTHONHOME: temporaryRoot,
    PYTHONPATH: temporaryRoot,
  };
  const prior = new Map(Object.keys(hostile).map((name) => [name, process.env[name]]));
  try {
    Object.assign(process.env, hostile);
    const result = await auditFixture("green");
    assert.equal(result.status, "PASS", JSON.stringify(result));
    assert.equal(result.graphBuildPoint, REPOSITORY_HEAD);
  } finally {
    for (const [name, value] of prior) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("CLI rejects caller-selected graph authority", () => {
  const spoofed = runCli(`${FIXTURES}/green/entry.ts`, ["--graph-project", GRAPH_PROJECT]);

  assert.equal(spoofed.status, 2, spoofed.stderr || spoofed.stdout);
  assert.equal(JSON.parse(spoofed.stdout).failureId, "DETACHED_AUTHORITY_REQUEST_INVALID");
});

test("CLI preserves exit algebra 0 for PASS, 1 for findings and 2 for refusal", () => {
  const pass = runCli(`${FIXTURES}/green/entry.ts`);
  const finding = runCli(`${FIXTURES}/red-wasm/entry.ts`);
  const refusal = runCli(`${FIXTURES}/red-unresolved/entry.ts`);

  assert.equal(pass.status, 0, pass.stderr || pass.stdout);
  assert.equal(JSON.parse(pass.stdout).status, "PASS");
  assert.equal(finding.status, 1, finding.stderr || finding.stdout);
  assert.equal(JSON.parse(finding.stdout).failureId, "LEGACY_EXECUTION_REENTRY");
  assert.equal(refusal.status, 2, refusal.stderr || refusal.stdout);
  assert.equal(JSON.parse(refusal.stdout).failureId, "UNRESOLVED_CLOSURE");
});
