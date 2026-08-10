import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { slideToolManifestDigest } from "../lib/receipt-bound-slide-build.mjs";
import { verifySlideReferenceEvidence } from "../lib/assurance-fabric/slide-reference-evidence.mjs";

const CLI = resolve("scripts/verify-slide-reference-evidence.mjs");

function write(root, relativePath, bytes) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  return path;
}

function initRepository(root) {
  execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "fixture@example.invalid"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Fixture"], { cwd: root });
}

function commit(root, message) {
  execFileSync("git", ["add", "--", "."], { cwd: root });
  execFileSync("git", ["commit", "-m", message], { cwd: root, stdio: "ignore" });
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
}

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function fixture({ lieAboutFile = false } = {}) {
  const base = mkdtempSync(join(tmpdir(), "slide-reference-evidence-"));
  const root = join(base, "Galerina");
  const slide = join(base, "SLIDE");
  mkdirSync(root);
  mkdirSync(slide);
  initRepository(root);
  initRepository(slide);
  write(root, ".gitkeep", "galerina\n");
  commit(root, "galerina fixture");
  const toolBytes = Buffer.from("export const tool = 1;\n");
  write(slide, "src/tool.mjs", toolBytes);
  const manifest = {
    schema: "slide.reference-tool-manifest.v1",
    toolId: "slide.checked-fungi-package-compiler.v1",
    profileId: "slide.checked-fungi.source-manifest.v1",
    entrypoint: "src/tool.mjs",
    files: [{
      path: "src/tool.mjs",
      byteLength: toolBytes.length,
      sha256: lieAboutFile ? `sha256:${"a".repeat(64)}` : sha256(toolBytes),
    }],
    referenceOnly: true,
    authorityReleased: false,
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, undefined, 2)}\n`);
  write(slide, "governance/checked-fungi-package-tool-manifest.json", manifestBytes);
  const commitId = commit(slide, "slide fixture");
  const digest = slideToolManifestDigest(manifestBytes);
  write(root, "docs/security/slide-reference-tool-pin.json", `${JSON.stringify({
    schema: "galerina.slide.reference-tool-pin.v1",
    repositoryCommit: commitId,
    toolManifestDigest: digest,
    toolFileCount: 1,
  }, undefined, 2)}\n`);
  return { base, root, slide, commitId, digest };
}

describe("pinned SLIDE reference evidence", () => {
  it("binds the exact immutable Git object without releasing authority", () => {
    const value = fixture();
    try {
      const result = verifySlideReferenceEvidence(value.root, value.slide);
      assert.equal(result.kind, "accepted", JSON.stringify(result));
      assert.equal(result.value.report.repositoryCommit, value.commitId);
      assert.equal(result.value.report.toolManifestDigest, value.digest);
      assert.equal(result.value.report.toolFileCount, 1);
      assert.equal(result.value.report.referenceOnly, true);
      assert.equal(result.value.report.authorityReleased, false);
      assert.equal(result.value.provenance.externalInputDigest, value.digest.slice("sha256:".length));
      assert.equal(result.value.provenance.externalDocumentCount, 1);
    } finally {
      rmSync(value.base, { recursive: true, force: true });
    }
  });

  it("refuses a mismatched pin and an unknown commit", () => {
    const value = fixture();
    try {
      const pinPath = join(value.root, "docs/security/slide-reference-tool-pin.json");
      const pin = JSON.parse(readFileSync(pinPath, "utf8"));
      pin.toolManifestDigest = `sha256:${"b".repeat(64)}`;
      writeFileSync(pinPath, `${JSON.stringify(pin, undefined, 2)}\n`);
      assert.equal(verifySlideReferenceEvidence(value.root, value.slide).kind, "refused");

      pin.toolManifestDigest = value.digest;
      pin.repositoryCommit = "c".repeat(40);
      writeFileSync(pinPath, `${JSON.stringify(pin, undefined, 2)}\n`);
      assert.equal(verifySlideReferenceEvidence(value.root, value.slide).kind, "refused");
    } finally {
      rmSync(value.base, { recursive: true, force: true });
    }
  });

  it("refuses a pinned manifest that lies about one listed file", () => {
    const value = fixture({ lieAboutFile: true });
    try {
      const result = verifySlideReferenceEvidence(value.root, value.slide);
      assert.equal(result.kind, "refused", JSON.stringify(result));
      assert.equal(result.code, "SLIDE-REFERENCE-FILE");
    } finally {
      rmSync(value.base, { recursive: true, force: true });
    }
  });

  it("writes and non-mutatingly checks the exact report pair", () => {
    const value = fixture();
    try {
      const args = ["--root", value.root, "--slide-root", value.slide];
      const written = spawnSync(process.execPath, [CLI, ...args, "--write"], { encoding: "utf8" });
      assert.equal(written.status, 0, written.stderr);
      const report = join(value.root, "build/slide-reference/reference.json");
      const provenance = join(value.root, "build/slide-reference/provenance.json");
      assert.equal(readFileSync(report, "utf8").includes(value.commitId), true);
      assert.equal(readFileSync(provenance, "utf8").includes(value.digest.slice(7)), true);
      assert.equal(spawnSync(process.execPath, [CLI, ...args, "--check"]).status, 0);

      writeFileSync(report, "tampered\n");
      assert.notEqual(spawnSync(process.execPath, [CLI, ...args, "--check"]).status, 0);
      assert.equal(readFileSync(report, "utf8"), "tampered\n");
    } finally {
      rmSync(value.base, { recursive: true, force: true });
    }
  });
});
