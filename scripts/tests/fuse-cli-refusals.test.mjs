import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";

const ROOT = join(import.meta.dirname, "..", "..");
const CLI = join(ROOT, "galerina.mjs");
const DEMO = join(ROOT, "examples", "fuse-demo", "my-custom-api-rest");

function runFuse(cwd, env = {}) {
  return spawnSync(
    process.execPath,
    [CLI, "fuse", DEMO, "--allow-unsigned"],
    {
      cwd,
      encoding: "utf8",
      env: { ...process.env, ...env },
      shell: false,
      timeout: 120_000,
    },
  );
}

function output(result) {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

test("fuse CLI refuses an untrustworthy revocation registry at the real boundary", () => {
  const cwd = mkdtempSync(join(tmpdir(), "galerina-fuse-revocation-"));
  try {
    const control = runFuse(cwd);
    assert.equal(control.status, 0, `the absent-registry control must fuse in dev: ${output(control)}`);

    const governance = join(cwd, "governance");
    mkdirSync(governance, { recursive: true });
    writeFileSync(
      join(governance, "trust-anchor.json"),
      JSON.stringify({
        schemaVersion: 1,
        registrySigningRootKeyId: "missing-test-root",
      }),
    );
    writeFileSync(
      join(governance, "revocations.json"),
      JSON.stringify({ schemaVersion: 1, revoked: [] }),
    );

    const refused = runFuse(cwd);
    assert.equal(refused.status, 1);
    assert.match(output(refused), /FUNGI-FUSE-REVOCATION-UNTRUSTED/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("fuse CLI refuses when its hybrid verifier implementation is unavailable", () => {
  const cwd = mkdtempSync(join(tmpdir(), "galerina-fuse-verifier-"));
  try {
    const control = runFuse(cwd);
    assert.equal(control.status, 0, `the available-verifier control must fuse: ${output(control)}`);

    const loader = join(cwd, "deny-compiler-loader.mjs");
    writeFileSync(
      loader,
      [
        "export async function load(url, context, nextLoad) {",
        "  if (url.includes('/galerina-core-compiler/dist/index.js')) {",
        "    throw new Error('test-injected compiler verifier unavailability');",
        "  }",
        "  return nextLoad(url, context);",
        "}",
        "",
      ].join("\n"),
    );
    const refused = runFuse(cwd, {
      NODE_OPTIONS: `--experimental-loader=${pathToFileURL(loader).href}`,
    });
    assert.equal(refused.status, 1);
    assert.match(output(refused), /FUNGI-FUSE-HYBRID-VERIFIER-UNAVAILABLE/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
