import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import * as L from "../dist/index.js";

const digest = (digit) => `sha256:${digit.repeat(64)}`;
const bytes = (text = "payload") => new TextEncoder().encode(text);

describe("detached artifact reference boundary", () => {
  it("creates and round-trips an exact reference without a body", () => {
    const reference = L.createArtifactReference("galerina", "canonical-gir", bytes());
    assert.deepEqual(L.decodeArtifactReference(L.decodeArtifactReferenceBytes(L.encodeArtifactReference(reference))), reference);
    assert.equal(reference.byteLength, 7);
    assert.match(reference.digest, /^sha256:[0-9a-f]{64}$/u);
    assert.equal(Object.keys(reference).sort().join(","), "byteLength,digest,kind,owner,schema");
  });

  it("refuses malformed, surplus, inherited, accessor and symbol fields", () => {
    const valid = {
      schema: L.ARTIFACT_REFERENCE_SCHEMA,
      owner: "galerina",
      kind: "fungi-source",
      digest: digest("a"),
      byteLength: 1,
    };
    for (const bad of [
      { ...valid, schema: "wrong" },
      { ...valid, owner: "slide" },
      { ...valid, kind: "physical-slide" },
      { ...valid, digest: "sha256:bad" },
      { ...valid, byteLength: 0 },
      { ...valid, extra: true },
    ]) assert.throws(() => L.decodeArtifactReference(bad), /ARTIFACT_REFERENCE_/u);

    const inherited = Object.create({ extra: true });
    Object.assign(inherited, valid);
    assert.throws(() => L.decodeArtifactReference(inherited), /OBJECT/u);

    const accessor = { ...valid };
    Object.defineProperty(accessor, "digest", { get() { throw new Error("trap"); }, enumerable: true });
    assert.throws(() => L.decodeArtifactReference(accessor), /ACCESSOR/u);

    const symbol = { ...valid, [Symbol("unexpected")]: true };
    assert.throws(() => L.decodeArtifactReference(symbol), /SYMBOL/u);
  });

  it("requires transfer ownership, distinct stages and exact digests", () => {
    const artifact = L.createArtifactReference("galerina", "checked-module-snapshot", bytes());
    const transfer = L.createComputeTransfer({
      fromOwner: "galerina",
      toOwner: "slide",
      artifact,
      prerequisiteDigests: [artifact.digest],
      operationId: "snapshot-to-slide",
      runIdentity: digest("1"),
      authorityEpoch: 4,
      authorityContextDigest: digest("2"),
    });
    assert.deepEqual(L.decodeComputeTransferBytes(L.encodeComputeTransfer(transfer)), transfer);
    assert.throws(() => L.decodeComputeTransfer({ ...transfer, toOwner: "galerina" }), /TRANSFER_OWNER/u);
    assert.throws(() => L.decodeComputeTransfer({ ...transfer, artifact: { ...artifact, owner: "slide" } }), /OWNER/u);
    assert.throws(() => L.decodeComputeTransfer({ ...transfer, prerequisiteDigests: [digest("z")] }), /DIGEST/u);
  });

  it("stores copied bytes in an owner-local repository and verifies every read", async () => {
    const root = await mkdtemp(join(tmpdir(), "galerina-artifact-reference-"));
    try {
      const repo = L.createFileOwnedArtifactRepository("galerina", root);
      const input = bytes("immutable");
      const reference = await repo.write("fungi-source", input);
      input[0] = 0;
      const read = await repo.read(reference);
      assert.equal(new TextDecoder().decode(read), "immutable");
      read[0] = 0;
      assert.equal(new TextDecoder().decode(await repo.read(reference)), "immutable");
      await assert.rejects(() => repo.read({ ...reference, owner: "slide" }), /OWNER/u);

      const target = join(root, "fungi-source", reference.digest.slice("sha256:".length));
      await writeFile(target, bytes("tampered"));
      await assert.rejects(() => repo.read(reference), /DIGEST|LENGTH/u);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
