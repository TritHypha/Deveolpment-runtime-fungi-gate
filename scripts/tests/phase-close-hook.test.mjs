import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { acquireSuiteLease } = require("../lib/suite-run-lease.cjs");
const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const HOOK = join(TEST_DIR, "..", "phase-close-hook.mjs");
const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "galerina-phase-hook-"));
  roots.push(root);
  mkdirSync(join(root, "scripts"), { recursive: true });
  const trap = [
    "import { writeFileSync } from 'node:fs';",
    "writeFileSync(new URL('../FULL-SUITE-RAN', import.meta.url), 'bad');",
  ].join("\n");
  writeFileSync(join(root, "scripts", "run-phase-close.mjs"), trap, "utf8");
  writeFileSync(join(root, "scripts", "run-all-tests.cjs"), trap, "utf8");
  return root;
}

function run(root) {
  return spawnSync(process.execPath, [HOOK, "--root", root], {
    encoding: "utf8",
    timeout: 5_000,
  });
}

test("the Stop heartbeat reports idle without executing either root runner", () => {
  const root = fixture();

  const result = run(root);

  assert.equal(result.status, 0, result.stderr);
  const message = JSON.parse(result.stdout);
  assert.match(message.systemMessage, /phase-close.*explicit-only.*IDLE/i);
  assert.equal(message.suppressOutput, true);
  assert.equal(existsSync(join(root, "FULL-SUITE-RAN")), false);
});

test("the Stop heartbeat reports an existing suite lease without joining it", () => {
  const root = fixture();
  const lease = acquireSuiteLease({ root, commandClass: "all-tests" });

  const result = run(root);

  assert.equal(result.status, 0, result.stderr);
  const message = JSON.parse(result.stdout);
  assert.match(message.systemMessage, /phase-close.*explicit-only.*HELD/i);
  assert.equal(existsSync(join(root, "FULL-SUITE-RAN")), false);
  assert.equal(lease.release(), true);
});
