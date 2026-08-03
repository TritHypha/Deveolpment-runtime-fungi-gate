import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { after, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  buildReceiptBoundSlidePackage,
  digestRuntimeFile,
  slideToolManifestDigest,
} from "../lib/receipt-bound-slide-build.mjs";

const SLIDE_ROOT = process.env.GALERINA_SLIDE_REPO;
const TEMP = [];

after(async () => {
  await Promise.all(TEMP.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("receipt-bound Galerina to independent SLIDE integration", () => {
  it("builds one real checked package through an explicitly pinned sibling tool", {
    skip: typeof SLIDE_ROOT !== "string" || SLIDE_ROOT.length < 1,
  }, async () => {
    const root = await mkdtemp(join(tmpdir(), "galerina-real-slide-"));
    TEMP.push(root);
    await mkdir(join(root, "src"));
    await mkdir(join(root, "out"));
    await copyFile(
      join(SLIDE_ROOT, "fixtures", "galerina-rest-routing-module.fungi"),
      join(root, "src", "routing.fungi"),
    );
    const { portableVeoTargetDigest } = await import(pathToFileURL(
      join(SLIDE_ROOT, "src", "portable-veo.mjs"),
    ).href);
    const manifest = {
      schema: "slide.checked-fungi.source-manifest.v1",
      context: {
        targetDigest: portableVeoTargetDigest(),
        policyDigest: `sha256:${"2".repeat(64)}`,
        verifierDigest: `sha256:${"3".repeat(64)}`,
      },
      packages: [{
        identity: "@galerina/rest",
        version: "1.0.0",
        exports: [{ name: "start", sourceFlowName: "main", source: "src/routing.fungi" }],
        dependencies: [],
        resources: [],
      }],
    };
    const sourceManifestPath = join(root, "package-set.json");
    await writeFile(sourceManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const toolManifestPath = join(
      SLIDE_ROOT,
      "governance",
      "checked-fungi-package-tool-manifest.json",
    );
    const toolManifestBytes = await readFile(toolManifestPath);
    const result = await buildReceiptBoundSlidePackage({
      rootDirectory: root,
      sourceManifestPath,
      outputDirectory: join(root, "out", "real-build"),
      slideToolRoot: SLIDE_ROOT,
      slideToolManifestPath: toolManifestPath,
      expectedSlideToolManifestDigest: slideToolManifestDigest(toolManifestBytes),
      expectedRuntimeDigest: await digestRuntimeFile(process.execPath),
    });
    assert.equal(result.verdict, 1, JSON.stringify(result));
    assert.equal(result.artifactCount, 1);
    assert.deepEqual(result.outputFiles, [
      result.outputFiles[0],
      "package-set.receipt.json",
    ]);
    assert.match(result.outputFiles[0], /^package-[0-9a-f]{16}-[0-9a-f]{16}\.slide$/u);
    assert.equal(result.authorityReleased, false);

    const cliOutput = join(root, "out", "cli-build");
    const cli = spawnSync(process.execPath, [
      fileURLToPath(new URL("../../galerina.mjs", import.meta.url)),
      "build-slide-package",
      "--root", root,
      "--manifest", sourceManifestPath,
      "--out", cliOutput,
      "--slide-tool-root", SLIDE_ROOT,
      "--slide-tool-manifest", toolManifestPath,
      "--slide-tool-digest", slideToolManifestDigest(toolManifestBytes),
      "--runtime-digest", await digestRuntimeFile(process.execPath),
    ], { encoding: "utf8", windowsHide: true, timeout: 180_000 });
    assert.equal(cli.status, 0, cli.stderr);
    assert.equal(cli.stderr, "");
    const cliReceipt = JSON.parse(cli.stdout);
    assert.equal(cliReceipt.verdict, 1, cli.stdout);
    assert.equal(cliReceipt.outputName, "cli-build");
    assert.equal(cliReceipt.authorityReleased, false);
  });
});
