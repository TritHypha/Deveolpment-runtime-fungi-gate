import { after, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RUNNER = fileURLToPath(new URL("../run-phase-close-special.mjs", import.meta.url));
const roots = [];

after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "galerina-special-"));
  roots.push(root);
  return root;
}

function write(root, relativePath, contents) {
  const path = join(root, ...relativePath.split("/"));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

function run(root, mode) {
  return spawnSync(process.execPath, [RUNNER, "--root", root, "--check", mode], {
    encoding: "utf8",
    timeout: 30_000,
  });
}

test("patterns checks every admitted Fungi fixture and refuses one failure", () => {
  const root = fixture();
  write(root, "tests/patterns/green.fungi", "flow green() -> Int { 1 }\n");
  write(root, "tests/patterns/red.fungi", "flow red() -> Int { 0 }\n");
  write(root, "galerina.mjs", [
    "const path = process.argv.at(-1);",
    "process.exit(path.endsWith('red.fungi') ? 7 : 0);",
  ].join("\n"));

  const result = run(root, "patterns");

  assert.equal(result.status, 1);
  assert.match(result.stderr, /red\.fungi/);
});

test("patterns refuses an absent or empty corpus", () => {
  const absent = run(fixture(), "patterns");
  assert.equal(absent.status, 1);
  assert.match(absent.stderr, /REFUSED/);

  const emptyRoot = fixture();
  write(emptyRoot, "galerina.mjs", "process.exit(0);\n");
  mkdirSync(join(emptyRoot, "tests", "patterns"), { recursive: true });
  const empty = run(emptyRoot, "patterns");
  assert.equal(empty.status, 1);
  assert.match(empty.stderr, /empty/i);
});

test("security and naming preserve the legacy finding and error policy", () => {
  const root = fixture();
  write(root, "examples/auth-service/one.fungi", "flow one() -> Int { 1 }\n");
  write(root, "packages-galerina/galerina-devtools-security/package.json", "{\"type\":\"module\"}\n");
  write(root, "packages-galerina/galerina-devtools-security/dist/index.js", [
    "export async function runSecurityAudit() { return { findings: [{ code: 'KNOWN' }] }; }",
  ].join("\n"));
  write(root, "packages-galerina/galerina-devtools-naming/package.json", "{\"type\":\"module\"}\n");
  write(root, "packages-galerina/galerina-devtools-naming/dist/index.js", [
    "export function runNamingAudit() { return { findings: [{ code: 'KNOWN' }] }; }",
  ].join("\n"));

  const security = run(root, "security");
  const naming = run(root, "naming");

  assert.equal(security.status, 0);
  assert.match(security.stdout, /1 findings/);
  assert.equal(naming.status, 0);
  assert.match(naming.stdout, /1 naming findings/);
});

test("CBOR refuses non-canonical bytes and passes exact re-encoding", () => {
  const root = fixture();
  write(root, "packages-galerina/galerina-core-compiler/package.json", "{\"type\":\"module\"}\n");
  write(root, "packages-galerina/galerina-core-compiler/dist/manifest-generator.js", [
    "export function decodeCBOR(bytes) { return { value: [...bytes] }; }",
    "export function encodeCBOR(value) { return Uint8Array.from(value); }",
  ].join("\n"));
  write(root, "build/exact.lmanifest", Buffer.from([0xa1, 0x01, 0x02]));

  const result = run(root, "cbor");

  assert.equal(result.status, 0);
  assert.match(result.stdout, /1 canonical CBOR candidate/);
});

test("CBOR does not admit a non-CBOR local artifact as canonical evidence", () => {
  const root = fixture();
  write(root, "packages-galerina/galerina-core-compiler/package.json", "{\"type\":\"module\"}\n");
  write(root, "packages-galerina/galerina-core-compiler/dist/manifest-generator.js", [
    "export function decodeCBOR(bytes) { return { value: [...bytes] }; }",
    "export function encodeCBOR(value) { return Uint8Array.from(value); }",
  ].join("\n"));
  write(root, "build/not-cbor.lmanifest", Buffer.from("not cbor", "utf8"));

  const result = run(root, "cbor");

  assert.equal(result.status, 0);
  assert.match(result.stdout, /0 canonical CBOR candidate/);
  assert.match(result.stdout, /1 non-CBOR local artifact/);
});

test("governance diff refuses when HEAD~1 is not an admitted base", () => {
  const result = run(fixture(), "governance-diff");

  assert.equal(result.status, 1);
  assert.match(result.stderr, /BASE-MISSING|REFUSED/);
});

test("unknown and duplicate options refuse", () => {
  const root = fixture();
  const unknown = run(root, "unknown");
  assert.equal(unknown.status, 1);
  const duplicate = spawnSync(process.execPath, [RUNNER, "--root", root, "--root", root, "--check", "patterns"], {
    encoding: "utf8",
  });
  assert.equal(duplicate.status, 1);
});
