import assert from "node:assert/strict";
import { after, test } from "node:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const BUILD = join(ROOT, "build");
const SOURCE = join(BUILD, "__event_gate.fungi");

function cli(command) {
  return spawnSync(process.execPath, ["galerina.mjs", command, SOURCE], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120000,
  });
}

after(() => {
  rmSync(SOURCE, { force: true });
  for (const ext of [".wasm", ".wat", ".lmanifest", ".lmanifest.json", ".fuse.json", ".governance-impact.json"]) {
    rmSync(join(BUILD, `__event_gate${ext}`), { force: true });
  }
});

test("root check and build fail closed on an undeclared emitted event", () => {
  mkdirSync(BUILD, { recursive: true });
  writeFileSync(SOURCE, `@version 1
event Known
secure flow publish() -> Int
contract { intent { "Publish only declared events." } }
{
  emit Missing
  return 1
}
`);

  const check = cli("check");
  const checkOutput = `${check.stdout ?? ""}${check.stderr ?? ""}`;
  assert.match(checkOutput, /FUNGI-EVENT-001/);
  assert.equal(check.status, 1, `check must refuse an undeclared event\n${checkOutput}`);

  const build = cli("build");
  const buildOutput = `${build.stdout ?? ""}${build.stderr ?? ""}`;
  assert.match(buildOutput, /FUNGI-EVENT-001/);
  assert.match(buildOutput, /FAILED \(fail-closed/);
  assert.equal(build.status, 1, `build must refuse an undeclared event\n${buildOutput}`);
});
