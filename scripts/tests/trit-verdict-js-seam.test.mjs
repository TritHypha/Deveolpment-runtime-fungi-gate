import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import assert from "node:assert/strict";

const SCRIPT = resolve("scripts/audit-trit-verdict-js-seam.mjs");
const DETACHED_SCRIPT = resolve("scripts/audit-detached-slide-authority-path.mjs");
const roots = [];

after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), "trit-verdict-js-seam-"));
  roots.push(root);
  for (const [relativePath, source] of Object.entries(files)) {
    const path = join(root, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, source, "utf8");
  }
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync("git", ["config", "user.email", "fixture@example.invalid"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Trit Verdict seam fixture"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["commit", "--quiet", "-m", "fixture"], { cwd: root });
  return root;
}

function run(script, root, entries = ["src/seam.ts"]) {
  const args = [script, "--root", root, "--json"];
  for (const entry of entries) args.push("--entry", entry);
  const child = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8" });
  assert.equal(child.signal, null, child.stderr);
  assert.doesNotThrow(() => JSON.parse(child.stdout), child.stderr || child.stdout);
  return { child, report: JSON.parse(child.stdout) };
}

function expectViolation(source, code) {
  const root = fixture({ "src/seam.ts": source });
  const { child, report } = run(SCRIPT, root);
  assert.equal(child.status, 1, child.stderr || JSON.stringify(report, null, 2));
  assert.equal(report.verdict, "VIOLATION");
  assert.ok(report.violations.some((finding) => finding.code === code), JSON.stringify(report, null, 2));
}

test("an exact captured seam with typed decoders and framed canonical bytes is clean", () => {
  const root = fixture({
    "src/seam.ts": [
      "export function bridge(input, bytes) {",
      "  const captured = captureExactOwnDataRecord(input, ['trit', 'verdict']);",
      "  const trit = decodeExactTritField(captured, 'trit');",
      "  const verdict = decodeExactVerdictField(captured, 'verdict');",
      "  const owned = captureImmutableBytes(bytes);",
      "  return encodeCanonicalFrame('galerina.trit-verdict-js-seam.v1', [trit, verdict, owned]);",
      "}",
      "",
    ].join("\n"),
  });
  const { child, report } = run(SCRIPT, root);

  assert.equal(child.status, 0, child.stderr || JSON.stringify(report, null, 2));
  assert.equal(report.schema, "galerina.trit-verdict-js-seam.v1");
  assert.equal(report.verdict, "CLEAN");
  assert.match(report.toolVersion, /^\d+\.\d+\.\d+$/u);
  assert.match(report.rulesetDigest, /^sha256:[0-9a-f]{64}$/u);
  assert.match(report.repositoryCommit, /^[0-9a-f]{40}$/u);
  assert.deepEqual(report.violations, []);
});

test("raw integer properties cannot mint Trit or Verdict authority", () => {
  expectViolation("export const forged = { verdict: 1, trit: -1 };\n", "RAW_NUMERIC_AUTHORITY");
});

test("NaN and infinities receive a distinct non-finite authority finding", () => {
  expectViolation("export const forged = { verdict: NaN, trit: Infinity };\n", "RAW_NONFINITE_AUTHORITY");
});

test("range and absence-of-error guards that admit NaN or fractions are rejected", () => {
  expectViolation([
    "export function decodeVerdict(value) {",
    "  if (value < -1 || value > 1) return null;",
    "  return value;",
    "}",
    "",
  ].join("\n"), "FAIL_OPEN_TRIT_VERDICT_GUARD");
});

test("strict numeric membership without a negative-zero refusal is rejected", () => {
  expectViolation([
    "export function decodeTrit(value) {",
    "  if (value === -1 || value === 0 || value === 1) return value;",
    "  return null;",
    "}",
    "",
  ].join("\n"), "NEGATIVE_ZERO_AUTHORITY");
});

test("a negative-zero refusal in one function cannot excuse another same-named decoder", () => {
  expectViolation([
    "export function safe(value) {",
    "  if (Object.is(value, -0)) return null;",
    "  if (value === -1 || value === 0 || value === 1) return value;",
    "  return null;",
    "}",
    "export function unsafe(value) {",
    "  if (value === -1 || value === 0 || value === 1) return value;",
    "  return null;",
    "}",
    "",
  ].join("\n"), "NEGATIVE_ZERO_AUTHORITY");
});

test("missing, inherited, accessor and proxy-capable authority fields require exact capture", () => {
  expectViolation([
    "export function readVerdict(input) {",
    "  if ('verdict' in input && input.verdict !== undefined) return input.verdict;",
    "  return 0;",
    "}",
    "",
  ].join("\n"), "ERASED_AUTHORITY_RECORD");
});

test("repeated authority property reads are reported separately", () => {
  expectViolation([
    "export function readTrit(input) {",
    "  if (input.trit === 0) return input.trit;",
    "  return -1;",
    "}",
    "",
  ].join("\n"), "REPEATED_AUTHORITY_FIELD_READ");
});

test("one authority read in each of two functions is not misreported as a split read", () => {
  const root = fixture({
    "src/seam.ts": [
      "export const first = (input) => input.verdict;",
      "export const second = (input) => input.verdict;",
      "",
    ].join("\n"),
  });
  const { child, report } = run(SCRIPT, root);
  assert.equal(child.status, 1, child.stderr || JSON.stringify(report, null, 2));
  assert.ok(report.violations.some((finding) => finding.code === "ERASED_AUTHORITY_RECORD"));
  assert.ok(!report.violations.some((finding) => finding.code === "REPEATED_AUTHORITY_FIELD_READ"));
});

test("caller-mintable success booleans cannot authorize the seam", () => {
  expectViolation("export const admit = (input) => input.verified ? input.value : null;\n", "CALLER_MINTABLE_AUTHORITY_BOOLEAN");
});

test("ambient locale collation cannot order authoritative bytes", () => {
  expectViolation("export const canonical = (keys) => keys.sort((a, b) => a.localeCompare(b));\n", "AMBIENT_CANONICAL_COLLATION");
});

test("delimiter concatenation cannot authorize a digest preimage", () => {
  expectViolation([
    "import { createHash } from 'node:crypto';",
    "export const digest = (fields) => createHash('sha256').update(fields.join('|')).digest('hex');",
    "",
  ].join("\n"), "NON_INJECTIVE_CANONICAL_FRAMING");
});

test("an interpolated template passed directly to a digest remains non-injective authority framing", () => {
  expectViolation([
    "import { createHash } from 'node:crypto';",
    "export const digest = (owner, kind) => createHash('sha256').update(`owner:${owner}|kind:${kind}`).digest('hex');",
    "",
  ].join("\n"), "NON_INJECTIVE_CANONICAL_FRAMING");
});

test("a named preimage assembled from interpolated fields remains non-injective authority framing", () => {
  expectViolation([
    "import { createHash } from 'node:crypto';",
    "export function digest(owner, kind) {",
    "  const preimage = `owner:${owner}|kind:${kind}`;",
    "  return createHash('sha256').update(preimage).digest('hex');",
    "}",
    "",
  ].join("\n"), "NON_INJECTIVE_CANONICAL_FRAMING");
});

test("template-literal types and diagnostic text are not authority framing merely because hashing exists elsewhere", () => {
  const root = fixture({
    "src/seam.ts": [
      "import { createHash } from 'node:crypto';",
      "export type Digest = `sha256:${string}`;",
      "export interface Receipt { readonly buildPoint: `git:${string}`; }",
      "export function digest(bytes) {",
      "  if (!bytes) throw new Error(`missing bytes for ${String(bytes)}`);",
      "  return createHash('sha256').update(bytes).digest('hex');",
      "}",
      "",
    ].join("\n"),
  });
  const { child, report } = run(SCRIPT, root);
  assert.equal(child.status, 0, child.stderr || JSON.stringify(report, null, 2));
  assert.equal(report.verdict, "CLEAN");
});

test("unversioned JSON and duplicate-key object rebuilding cannot define authoritative bytes", () => {
  expectViolation([
    "export function canonical(entries) {",
    "  return JSON.stringify(Object.fromEntries(entries));",
    "}",
    "",
  ].join("\n"), "UNVERSIONED_JSON_AUTHORITY");
});

test("version-admitted JSON with an exact captured round trip is clean", () => {
  const root = fixture({
    "src/seam.ts": [
      "function canonicalJson(value) {",
      "  const admitted = admitVersionedCanonicalJsonRoot(value);",
      "  return JSON.stringify(admitted);",
      "}",
      "export function decode(bytes, text) {",
      "  const parsed = JSON.parse(text);",
      "  const captured = captureExactOwnDataRecord(parsed, ['schema', 'value']);",
      "  assertExactCanonicalJsonBytes(bytes, captured);",
      "  return captured;",
      "}",
      "",
    ].join("\n"),
  });
  const { child, report } = run(SCRIPT, root);
  assert.equal(child.status, 0, child.stderr || JSON.stringify(report, null, 2));
  assert.equal(report.verdict, "CLEAN");
});

test("a JSON admission or round-trip assertion in another function cannot excuse unsafe JSON", () => {
  expectViolation([
    "function safeEncode(value) {",
    "  const admitted = admitVersionedCanonicalJsonRoot(value);",
    "  return JSON.stringify(admitted);",
    "}",
    "function safeDecode(bytes, text) {",
    "  const parsed = parseWithoutJson(text);",
    "  const captured = captureExactOwnDataRecord(parsed, ['schema']);",
    "  assertExactCanonicalJsonBytes(bytes, captured);",
    "  return captured;",
    "}",
    "export function unsafe(value, text) {",
    "  JSON.stringify(value);",
    "  return JSON.parse(text);",
    "}",
    "",
  ].join("\n"), "UNVERSIONED_JSON_AUTHORITY");
});

test("live typed-array inputs cannot enter a digest without an admitted copy or live-view contract", () => {
  expectViolation([
    "import { createHash } from 'node:crypto';",
    "export function digest(bytes: Uint8Array) {",
    "  return createHash('sha256').update(bytes).digest('hex');",
    "}",
    "",
  ].join("\n"), "UNADMITTED_LIVE_TYPED_ARRAY");
});

test("a captured byte parameter in one function cannot excuse an unsafe same-named parameter elsewhere", () => {
  expectViolation([
    "import { createHash } from 'node:crypto';",
    "export function safe(bytes: Uint8Array) {",
    "  const owned = captureImmutableBytes(bytes);",
    "  return createHash('sha256').update(owned).digest('hex');",
    "}",
    "export function unsafe(bytes: Uint8Array) {",
    "  return createHash('sha256').update(bytes).digest('hex');",
    "}",
    "",
  ].join("\n"), "UNADMITTED_LIVE_TYPED_ARRAY");
});

test("hazard names in comments and ordinary strings are inert", () => {
  const root = fixture({
    "src/seam.ts": [
      "// input.verified and value.localeCompare(other) are examples only",
      "export const prose = \"JSON.stringify({ verdict: 1 })\";",
      "export const clean = true;",
      "",
    ].join("\n"),
  });
  const { child, report } = run(SCRIPT, root);
  assert.equal(child.status, 0, child.stderr || JSON.stringify(report, null, 2));
  assert.equal(report.verdict, "CLEAN");
});

test("the seam audit refuses uncommitted or missing entry bytes", () => {
  const root = fixture({ "src/seam.ts": "export const clean = true;\n" });
  writeFileSync(join(root, "src", "seam.ts"), "export const changed = true;\n", "utf8");
  const changed = run(SCRIPT, root);
  assert.equal(changed.child.status, 2);
  assert.ok(changed.report.refusals.some((finding) => finding.code === "ENTRY_NOT_COMMIT_BOUND"));

  const missing = run(SCRIPT, root, ["src/missing.ts"]);
  assert.equal(missing.child.status, 2);
  assert.ok(missing.report.refusals.some((finding) => finding.code === "ENTRY_UNREADABLE"));
});

test("the detached authority audit incorporates the Trit/Verdict seam findings", () => {
  const root = fixture({ "src/seam.ts": "export const forged = { verdict: 1 };\n" });
  const { child, report } = run(DETACHED_SCRIPT, root);
  assert.equal(child.status, 1, child.stderr || JSON.stringify(report, null, 2));
  assert.ok(report.violations.some((finding) => finding.code === "RAW_NUMERIC_AUTHORITY"));
});
