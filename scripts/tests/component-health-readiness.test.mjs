// component-health-readiness.test.mjs — proves singular/plural test surfaces
// are measured from the live governed workspace instead of a directory-name guess.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const SCRIPT = resolve("scripts/component-health.mjs");

test("component health counts the benchmark package's governed test/ surface", () => {
  const selfTest = spawnSync(process.execPath, [SCRIPT, "--self-test"], {
    encoding: "utf8",
  });
  assert.equal(selfTest.status, 0, selfTest.stderr || selfTest.stdout);
  assert.match(
    selfTest.stdout,
    /no positive recorded test count is refused/,
  );

  const result = spawnSync(process.execPath, [SCRIPT, "--json"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  const benchmark = report.rows.find(
    (row) => row.dir === "galerina-devtools-benchmarks",
  );
  assert.ok(benchmark, "benchmark package must be in the reconciled workspace");
  assert.equal(benchmark.testScript, true);
  assert.equal(benchmark.hasTestsDir, true);
  assert.equal(benchmark.testFiles, 3);
  assert.deepEqual(benchmark.gaps, []);

  const tracking = report.percentAudit.sections.find(
    (section) => section.key === "tracking-registry",
  );
  assert.ok(tracking);
  const governed = tracking.rows.find(
    (row) => row.item === "Execution-cutover (RD-0361)",
  );
  assert.ok(governed);
  assert.match(governed.detail, /20 differential/);
  assert.match(governed.detail, /9 authoritative/);
  const compiler = tracking.rows.find(
    (row) => row.item === "Compiler authority (RD-0528)",
  );
  assert.ok(compiler);
  assert.match(compiler.detail, /2 differential/);
  assert.match(compiler.detail, /5 authoritative/);
});
