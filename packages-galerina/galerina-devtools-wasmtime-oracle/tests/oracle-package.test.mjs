import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function run(command, args) {
  return spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    shell: false,
    timeout: 300_000,
  });
}

function assertSuccess(result, label) {
  assert.equal(
    result.status,
    0,
    `${label} failed\n${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  );
}

test("fixture provenance and all eight Rust oracle tests execute", () => {
  const fixture = run(process.execPath, ["tools/export-differential-fixture.mjs"]);
  assertSuccess(fixture, "DSS differential fixture generation");
  assert.match(fixture.stdout, /386 points/);

  const corpus = run(process.execPath, ["tools/export-corpus-differential.mjs"]);
  assertSuccess(corpus, "general corpus fixture generation");
  assert.match(corpus.stdout, /31 programs \/ 63 calls/);
  assert.match(corpus.stdout, /49 values/);
  assert.match(corpus.stdout, /14 symmetric traps/);

  assert.equal(existsSync(join(ROOT, "fixtures", "supervisor.wasm")), true);
  assert.equal(
    existsSync(join(ROOT, "fixtures", "corpus", "corpus-differential.json")),
    true,
  );

  const cargo = run("cargo", ["test", "--locked"]);
  assertSuccess(cargo, "cargo test --locked");
  const output = `${cargo.stdout ?? ""}\n${cargo.stderr ?? ""}`;
  const summaries = [...output.matchAll(/test result: ok\. (\d+) passed; (\d+) failed/g)];
  const passed = summaries.reduce((sum, match) => sum + Number(match[1]), 0);
  const failed = summaries.reduce((sum, match) => sum + Number(match[2]), 0);
  assert.equal(passed, 8, `expected exactly eight executed Rust tests\n${output}`);
  assert.equal(failed, 0);
});
