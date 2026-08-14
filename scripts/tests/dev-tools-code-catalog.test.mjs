// Focused fixture tests for code-index, gen-code-registry, and audit-coverage.
// This file owns its generator setup so a refused registry generation cannot
// abort unrelated dev-tool evidence before the test runner can report it.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = mkdtempSync(join(tmpdir(), "fungi-code-catalog-"));
after(() => {
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch {
    // Best-effort fixture cleanup.
  }
});

const src = join(tmp, "packages-galerina", "fx", "src");
mkdirSync(src, { recursive: true });
writeFileSync(join(src, "diag.ts"), [
  'export const FUNGI_FX_001 = { code: "FUNGI-FX-001", name: "FxDefinedNeverUsed", severity: "error" };',
  'export const ERR_FX_THING = "ERR_FX_THING";',
  'export const ERR_FX_THROWN = "ERR_FX_THROWN";',
  "export function emitInline(d){",
  "  d.push({",
  '    code: "FUNGI-FX-002",',
  '    name: "FxInline",',
  '    severity: "warning",',
  "  });",
  "}",
  'export function emitViaConst(){ return { ok: false, code: ERR_FX_THING, reason: "x" }; }',
  "export function emitThrow(){",
  "  throw new FxError(",
  "    ERR_FX_THROWN,",
  '    "boom",',
  "  );",
  "}",
  "// a comment mentioning FUNGI-FX-099 must be a ref, not an emit/def",
  'export const FUNGI_FX_005 = { code: "FUNGI-FX-005", name: "FxFive", severity: "error" };',
  'export const FUNGI_FX_005B = { code: "FUNGI-FX-005B", name: "FxFiveB", severity: "error" };',
  'export interface FxShape { readonly code: "FUNGI-FX-050"; }',
  "export function useFive(d){ d.push({ ...FUNGI_FX_005 }); d.push({ ...FUNGI_FX_005B }); }",
  'export function emitDescriptive(d){ d.push({ code: "FUNGI-FX-REFUSED", name: "FxRefused", severity: "error" }); }',
  'export function throwDescriptive(){ throw new Error("FUNGI-FX-THROW-REFUSED: boom"); }',
  "// FUNGI-FX-PREFIX is documentation, not a complete admitted identity",
].join("\n") + "\n");
writeFileSync(
  join(tmp, "AGENTS.md"),
  "live <!-- registry:counts.live -->0 of <!-- registry:counts.total -->0\n",
);
mkdirSync(join(tmp, "docs"), { recursive: true });
writeFileSync(
  join(tmp, "docs", "example.md"),
  '`fuseError("FUNGI-DOC-EXAMPLE", "illustrative only")`\n',
);

const git = (...args) => spawnSync(
  "git",
  args,
  { cwd: tmp, encoding: "utf8", shell: false },
);
assert.equal(git("init", "--quiet").status, 0);
assert.equal(
  git("add", "--", "AGENTS.md", "docs/example.md", "packages-galerina/fx/src/diag.ts").status,
  0,
);

const run = (script, args = [], env = process.env) => spawnSync(
  process.execPath,
  [join(SCRIPTS, script), ...args],
  { cwd: tmp, encoding: "utf8", env, shell: false },
);
const indexRun = run("code-index.mjs");
const registryRun = run("gen-code-registry.mjs");

test("code-catalog fixture setup publishes both generated artifacts", () => {
  assert.equal(indexRun.status, 0, indexRun.stdout + indexRun.stderr);
  assert.equal(registryRun.status, 0, registryRun.stdout + registryRun.stderr);
});

const indexPath = join(tmp, "build", "code-index", "code-index.json");
const registryPath = join(tmp, "build", "code-registry", "registry.json");
const idx = indexRun.status === 0
  ? JSON.parse(readFileSync(indexPath, "utf8"))
  : [];
const reg = registryRun.status === 0
  ? JSON.parse(readFileSync(registryPath, "utf8"))
  : { entries: [] };
const byCode = Object.fromEntries(idx.map((code) => [code.code, code]));
const status = Object.fromEntries(reg.entries.map((entry) => [entry.code, entry.status]));
const emits = (code) => (byCode[code]?.emits || []).length;
const defs = (code) => (byCode[code]?.defs || []).length;

test("code-index keeps trailing-letter suffixes distinct", () => {
  assert.ok(byCode["FUNGI-FX-005"]);
  assert.ok(byCode["FUNGI-FX-005B"]);
});

test("code-index resolves const-identifier and multiline-throw emits", () => {
  assert.ok(emits("ERR_FX_THING") > 0);
  assert.ok(emits("ERR_FX_THROWN") > 0);
  assert.ok(emits("FUNGI-FX-002") > 0);
});

test("code-index does not classify comment or type-position mentions as emits", () => {
  assert.ok(byCode["FUNGI-FX-099"]);
  assert.equal(emits("FUNGI-FX-099"), 0);
  assert.equal(defs("FUNGI-FX-099"), 0);
  assert.equal(emits("FUNGI-FX-050"), 0);
  assert.equal(defs("FUNGI-FX-050"), 0);
});

test("code-index admits descriptive identities only from runtime diagnostic sinks", () => {
  assert.ok(byCode["FUNGI-FX-REFUSED"]);
  assert.ok(byCode["FUNGI-FX-THROW-REFUSED"]);
  assert.ok(emits("FUNGI-FX-REFUSED") > 0);
  assert.ok(emits("FUNGI-FX-THROW-REFUSED") > 0);
  assert.equal(byCode["FUNGI-FX-PREFIX"], undefined);
  assert.equal(byCode["FUNGI-DOC-EXAMPLE"], undefined);
});

test("gen-code-registry distinguishes dead definitions from live emits", () => {
  assert.equal(status["FUNGI-FX-001"], "dead");
  assert.notEqual(status["ERR_FX_THING"], "dead");
  assert.notEqual(status["ERR_FX_THROWN"], "dead");
});

const covKb = join(tmp, "kb-fixture");
mkdirSync(covKb, { recursive: true });
writeFileSync(
  join(covKb, "galerina-governance-rules.md"),
  "# Governance rules\n(no curated FUNGI codes yet)\n",
);
const runCoverage = (kbDir, args = ["codes", "--json"]) => run(
  "audit-coverage.mjs",
  args,
  { ...process.env, GALERINA_KB_DIR: kbDir, SOURCE_DATE_EPOCH: "0" },
);

test("audit-coverage reports zero phantoms against a present empty registry", () => {
  const result = runCoverage(covKb);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(JSON.parse(result.stdout).holes, 0);
});

test("audit-coverage fails closed when the governance registry is absent", () => {
  const result = runCoverage(join(tmp, "no-such-kb"));
  assert.equal(result.status, 2, result.stdout + result.stderr);
  assert.match(result.stderr, /registry unreadable|Failing closed/i);
});

test("audit-coverage resolves the governance registry after the KB reference migration", () => {
  const migratedKb = join(tmp, "migrated-kb");
  mkdirSync(join(migratedKb, "reference", "galerina"), { recursive: true });
  writeFileSync(
    join(migratedKb, "reference", "galerina", "galerina-governance-rules.md"),
    "# Governance rules\n(no curated FUNGI codes yet)\n",
  );
  const result = runCoverage(migratedKb);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(JSON.parse(result.stdout).holes, 0);
});

test("audit-coverage check refuses drift without rewriting governed output", () => {
  const output = join(tmp, "build", "coverage", "coverage-codes.md");
  const provenance = join(tmp, "build", "coverage", "provenance.json");
  const generated = runCoverage(covKb, ["codes"]);
  assert.equal(generated.status, 0, generated.stdout + generated.stderr);
  assert.equal(existsSync(provenance), true);

  writeFileSync(output, "drift\n");
  const before = readFileSync(output, "utf8");
  const refused = runCoverage(covKb, ["codes", "--check"]);
  assert.notEqual(refused.status, 0, refused.stdout + refused.stderr);
  assert.equal(readFileSync(output, "utf8"), before);

  const restored = runCoverage(covKb, ["codes"]);
  assert.equal(restored.status, 0, restored.stdout + restored.stderr);
  const checked = runCoverage(covKb, ["codes", "--check"]);
  assert.equal(checked.status, 0, checked.stdout + checked.stderr);
});
