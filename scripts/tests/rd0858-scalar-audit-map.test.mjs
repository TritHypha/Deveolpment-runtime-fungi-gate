import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const generatorPath = join(root, "scripts", "generate-rd0858-scalar-audit-map.mjs");
const auditMapPath = join(root, "docs", "audit-map.json");

const loadGenerator = () => import(pathToFileURL(generatorPath).href);

describe("RD-0858 scalar audit-map generator", () => {
  it("derives one stable implementation build from the fixed executable closure", async () => {
    const generator = await loadGenerator();
    const first = generator.buildAuditMapCandidate();
    const second = generator.buildAuditMapCandidate();
    assert.deepEqual(second, first);
    assert.match(first.implementationCommit, /^[0-9a-f]{40}$/u);
    assert.match(first.planDigest, /^[0-9a-f]{64}$/u);
  });

  it("binds every audit to the same implementation commit and exact plan digest", async () => {
    const generator = await loadGenerator();
    const candidate = generator.buildAuditMapCandidate();
    const decoded = JSON.parse(candidate.bytes.toString("utf8"));
    const locator = `git://galerina/${candidate.implementationCommit}`;
    assert.equal(decoded.subject.locator, locator);
    assert.equal(decoded.approval.planDigest, candidate.planDigest);
    assert.ok(decoded.audits.length > 0);
    assert.ok(decoded.audits.every((audit) => audit.build === locator));
  });

  it("emits canonical LF JSON without machine-local paths", async () => {
    const generator = await loadGenerator();
    const { bytes } = generator.buildAuditMapCandidate();
    const text = bytes.toString("utf8");
    assert.equal(text.endsWith("\n"), true);
    assert.equal(text.includes("\r"), false);
    assert.doesNotMatch(text, /(?:^|["\s])[A-Za-z]:[\\/]/u);
    assert.deepEqual(Buffer.from(`${JSON.stringify(JSON.parse(text), null, 2)}\n`, "utf8"), bytes);
  });

  it("matches the committed map and passes its bounded self-test", () => {
    for (const mode of ["--check", "--self-test"]) {
      const result = spawnSync(process.execPath, [generatorPath, mode], {
        cwd: root,
        encoding: "utf8",
        timeout: 130_000,
      });
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
      assert.match(result.stdout, /PASS|fixed.point|byte.identical/i);
    }
  });

  it("refuses caller-selected paths, builds, and unknown modes", () => {
    for (const args of [
      ["--output", "other.json"],
      ["--build", "0".repeat(40)],
      ["--check", "other.json"],
      ["--unknown"],
    ]) {
      const result = spawnSync(process.execPath, [generatorPath, ...args], {
        cwd: root,
        encoding: "utf8",
        timeout: 130_000,
      });
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}\n${result.stderr}`, /ARGUMENT|MODE|LOCATOR|refus/i);
    }
  });

  it("keeps the generated view present for Git custody", async () => {
    assert.ok((await readFile(auditMapPath)).byteLength > 0);
  });
});
