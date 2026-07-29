import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AUDIT = join(ROOT, "scripts", "audit-compiler-stage-twins.mjs");
const MISSING_STAGE = join(
  ROOT,
  "scripts",
  "fixtures",
  "compiler-authority-missing-stage.json",
);

describe("compiler authority ledger negative fixture", () => {
  it("fails closed when a fixture ledger names a missing stage", () => {
    const result = spawnSync(
      process.execPath,
      [AUDIT, "--fixture-ledger", MISSING_STAGE],
      { cwd: ROOT, encoding: "utf8" },
    );
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

    assert.equal(result.status, 1, output);
    assert.match(output, /authoritative stage declared .* NOT found/i);
    assert.match(output, /missing-stage\.fungi/);
  });

  it("refuses a fixture-ledger path outside scripts/fixtures", () => {
    const result = spawnSync(
      process.execPath,
      [AUDIT, "--fixture-ledger", join(ROOT, "package.json")],
      { cwd: ROOT, encoding: "utf8" },
    );
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

    assert.equal(result.status, 2, output);
    assert.match(output, /fixture ledger must stay inside scripts\/fixtures/i);
  });

  it("keeps SLIDE and auxiliary files outside the seven-stage authority denominator", () => {
    const result = spawnSync(process.execPath, [AUDIT], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

    assert.equal(result.status, 0, output);
    assert.match(output, /7\/7 canonical compiler stages check-clean/i);
    assert.match(output, /49\/49 non-authorizing auxiliary \.fungi files check-clean/i);
    assert.match(
      output,
      /0 shadow .* 0 differential .* 7 authoritative/i,
    );
  });
});
