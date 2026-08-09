import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const cli = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

function risk(records, probability) {
  return spawnSync(
    process.execPath,
    [cli, "risk", "customer_pii", records, probability],
    { encoding: "utf8" },
  );
}

describe("security CLI risk input admission", () => {
  for (const records of ["NaN", "Infinity", "1e3", "12records", "-1", "1.5"]) {
    it(`refuses non-canonical record count '${records}'`, () => {
      const result = risk(records, "0.5");
      assert.equal(result.status, 1);
      assert.match(result.stderr, /invalid record count/i);
      assert.equal(result.stdout, "");
    });
  }

  for (const probability of ["NaN", "Infinity", "1e309", "0.5risk", "-0.1", "1.1"]) {
    it(`refuses invalid breach probability '${probability}'`, () => {
      const result = risk("100", probability);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /invalid breach probability/i);
      assert.equal(result.stdout, "");
    });
  }

  it("accepts canonical finite boundary values", () => {
    assert.equal(risk("0", "0").status, 0);
    assert.equal(risk("100", "1").status, 0);
  });
});
