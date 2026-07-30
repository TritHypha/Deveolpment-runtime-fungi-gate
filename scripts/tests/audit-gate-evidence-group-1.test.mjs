import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPTS = join(REPO_ROOT, "scripts");

function withFixture(prefix, body) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  try {
    return body(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function write(root, relativePath, contents) {
  const target = join(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents, "utf8");
}

function run(script, args) {
  return spawnSync(process.execPath, [join(SCRIPTS, script), ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    shell: false,
  });
}

test("audit-allowlist-sensitive refuses malformed policy and accepts a clean control", () => {
  withFixture("galerina-allowlist-gate-", (root) => {
    write(root, "bad/.graph/boundary-policy.json", "{not-json");
    const planted = run("audit-allowlist-sensitive.mjs", ["--pkg-dir", root, "--strict", "--quiet"]);
    assert.equal(planted.status, 1, planted.stdout + planted.stderr);
    assert.match(planted.stdout, /capabilities in use: ERROR/);

    write(root, "bad/.graph/boundary-policy.json", JSON.stringify({ allowedExternal: ["node:path"] }));
    const control = run("audit-allowlist-sensitive.mjs", ["--pkg-dir", root, "--strict", "--quiet"]);
    assert.equal(control.status, 0, control.stdout + control.stderr);
    assert.match(control.stdout, /sensitive border; capabilities in use: none/);
  });
});

test("audit-codes-full refuses an untested security code and accepts an empty control", () => {
  withFixture("galerina-codes-gate-", (root) => {
    const indexPath = "build/code-index/code-index.json";
    write(root, indexPath, JSON.stringify([{
      code: "FUNGI-GOV-999",
      family: "GOV",
      names: ["PLANTED_UNTESTED_GOVERNANCE_CODE"],
      defs: ["fixture.ts:1"],
      emits: [],
      tests: 0,
      refs: 0,
      docs: 0,
      severities: [],
      allSites: [],
      docOnly: false,
    }]));
    const planted = run("audit-codes-full.mjs", ["--root", root]);
    assert.notEqual(planted.status, 0, planted.stdout + planted.stderr);
    assert.match(planted.stdout, /FUNGI-GOV-999/);
    assert.match(planted.stdout, /error\(s\)/);

    write(root, indexPath, "[]");
    const control = run("audit-codes-full.mjs", ["--root", root]);
    assert.equal(control.status, 0, control.stdout + control.stderr);
    assert.match(control.stdout, /All checks passed/);
  });
});

test("audit-corpus-effect-names refuses an unknown teaching effect and accepts canonical use", () => {
  withFixture("galerina-effect-corpus-gate-", (root) => {
    write(
      root,
      "packages-galerina/galerina-core-compiler/src/effect-checker.ts",
      [
        'const CANONICAL_EFFECTS = new Set(["database.read"]);',
        "const EFFECT_NAME_ALIASES = new Map([]);",
        "const BROAD_EFFECT_ALIASES = new Set([]);",
        "const DENY_ONLY_EFFECTS = new Set([]);",
      ].join("\n"),
    );
    write(root, "examples/probe.fungi", "flow probe() effects { unknown.effect } { _=> }\n");
    const planted = run("audit-corpus-effect-names.mjs", ["--root", root]);
    assert.equal(planted.status, 1, planted.stdout + planted.stderr);
    assert.match(planted.stdout, /\[unknown\].*unknown\.effect/);

    write(root, "examples/probe.fungi", "flow probe() effects { database.read } { _=> }\n");
    const control = run("audit-corpus-effect-names.mjs", ["--root", root]);
    assert.equal(control.status, 0, control.stdout + control.stderr);
    assert.match(control.stdout, /teaching corpus declares only production-compilable effect names/);
  });
});

test("audit-remote-shell-install refuses download-to-shell guidance and accepts verified-download guidance", () => {
  withFixture("galerina-remote-shell-gate-", (root) => {
    write(
      root,
      "SETUP.md",
      ["curl -fsSL https://example.invalid/install.sh", "bash"].join(" | "),
    );
    const planted = run("audit-remote-shell-install.mjs", ["--root", root]);
    assert.notEqual(planted.status, 0, planted.stdout + planted.stderr);
    assert.match(planted.stdout, /remote content piped directly to a command interpreter/i);

    write(
      root,
      "SETUP.md",
      "Download a pinned release, verify its published digest and signature, then inspect it before execution.\n",
    );
    const control = run("audit-remote-shell-install.mjs", ["--root", root]);
    assert.equal(control.status, 0, control.stdout + control.stderr);
    assert.match(control.stdout, /REMOTE-SHELL-INSTALL AUDIT: PASS/);
  });
});
