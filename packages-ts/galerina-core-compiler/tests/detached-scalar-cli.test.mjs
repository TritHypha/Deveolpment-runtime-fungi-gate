import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import * as L from "../dist/index.js";

const root = new URL(".", import.meta.url);
const fixture = fileURLToPath(new URL("./fixtures/detached-scalar/branching-i32.fungi", root));
const digest = (digit) => `sha256:${digit.repeat(64)}`;

describe("build-detached-scalar child protocol", () => {
  it("emits one reference-only handoff and keeps bodies and paths out", async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), "galerina-detached-cli-"));
    try {
      const request = {
        schema: "galerina.detached-scalar-request.v1",
        sourcePath: fixture,
        repositoryRoot,
        sourceFile: "branching-i32.fungi",
        compilerCommitDigest: digest("f"),
        authorityEpoch: 7,
        authorityContextDigest: digest("e"),
      };
      const cli = fileURLToPath(new URL("../dist/detached-scalar-cli.js", import.meta.url));
      const child = spawnSync(process.execPath, [cli], { input: `${JSON.stringify(request)}\n`, encoding: "utf8", timeout: 30_000 });
      assert.equal(child.status, 0, child.stderr);
      assert.equal(child.stderr, "");
      const lines = child.stdout.trim().split("\n");
      assert.equal(lines.length, 1);
      const handoff = JSON.parse(lines[0]);
      assert.equal(handoff.schema, "galerina.detached-scalar-handoff.v1");
      assert.equal(handoff.authorityReleased, false);
      assert.equal(handoff.sourceReference.owner, "galerina");
      assert.equal(handoff.snapshotReference.kind, "checked-module-snapshot");
      assert.equal(handoff.girReference.kind, "canonical-gir");
      assert.equal(handoff.transfer.toOwner, "slide");
      assert.equal(L.decodeComputeTransfer(handoff.transfer).artifact.digest, handoff.girReference.digest);
      assert.doesNotMatch(child.stdout, /AstNode|checked-module-snapshot-v1|branching-i32\.fungi|repositoryRoot|sourcePath/u);
    } finally {
      await rm(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("refuses missing input instead of emitting a green response", async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), "galerina-detached-cli-refuse-"));
    try {
      const request = { schema: "galerina.detached-scalar-request.v1", sourcePath: "missing.fungi", repositoryRoot, sourceFile: "missing.fungi", compilerCommitDigest: digest("f"), authorityEpoch: 7, authorityContextDigest: digest("e") };
      const cli = fileURLToPath(new URL("../dist/detached-scalar-cli.js", import.meta.url));
      const child = spawnSync(process.execPath, [cli], { input: `${JSON.stringify(request)}\n`, encoding: "utf8", timeout: 30_000 });
      assert.notEqual(child.status, 0);
      assert.match(child.stderr, /detached-scalar-refusal|INTERNAL/u);
      assert.equal(child.stdout, "");
    } finally {
      await rm(repositoryRoot, { recursive: true, force: true });
    }
  });
});
