import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const linkedHost = process.env.GALERINA_LINKED_HOST_PATH;
const expectedDigest = process.env.GALERINA_LINKED_HOST_SHA256;

function run(executable, script) {
  return spawnSync(executable, [script], {
    encoding: "utf8",
    env: Object.freeze({ SystemRoot: process.env.SystemRoot ?? "" }),
    windowsHide: true,
  });
}

test("stock Node cannot expose the linked Galerina binding", () => {
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", "console.log(typeof process._galerinaLinkedBinding)"],
    { encoding: "utf8", windowsHide: true },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "undefined");
});

test("exact linked host ignores a pathname decoy and retains one-use receipt identity", {
  skip: linkedHost === undefined || expectedDigest === undefined,
}, async () => {
  const executable = resolve(linkedHost);
  assert.equal(await realpath(executable), executable);
  const stat = await lstat(executable);
  assert.equal(stat.isFile(), true);
  assert.equal(stat.isSymbolicLink(), false);
  assert.equal(stat.nlink, 1);
  const digest = createHash("sha256")
    .update(await readFile(executable))
    .digest("hex");
  assert.equal(digest, expectedDigest);

  const temporary = await mkdtemp(join(tmpdir(), "galerina-linked-host-test-"));
  try {
    const publication = join(temporary, "publication");
    await mkdir(publication);
    await writeFile(join(temporary, "galerina_registry_durability.node"), "decoy");
    const probe = join(temporary, "probe.mjs");
    await writeFile(probe, `
      import { createHash } from "node:crypto";
      import { readFile } from "node:fs/promises";
      import { join } from "node:path";
      process.chdir(${JSON.stringify(temporary)});
      const descriptor = Object.getOwnPropertyDescriptor(process, "_galerinaLinkedBinding");
      const binding = process._galerinaLinkedBinding();
      const bytes = new TextEncoder().encode("linked-host-publication-v1");
      const generationId = createHash("sha256")
        .update(new TextEncoder().encode("galerina.registry.generation.v1\\0"))
        .update(bytes)
        .digest("hex");
      const receipt = binding.publishGeneration(${JSON.stringify(publication)}, generationId, bytes);
      const published = await readFile(join(${JSON.stringify(publication)},
        \`registry-generation-\${generationId}.json\`));
      console.log(JSON.stringify({
        descriptor: {
          configurable: descriptor.configurable,
          enumerable: descriptor.enumerable,
          writable: descriptor.writable,
        },
        bindingFrozen: Object.isFrozen(binding),
        receipt,
        firstBrand: binding.isReceipt(receipt),
        secondBrand: binding.isReceipt(receipt),
        forgedBrand: binding.isReceipt(Object.freeze({ ...receipt })),
        bytesExact: Buffer.from(published).equals(Buffer.from(bytes)),
      }));
    `, { flag: "wx" });
    const result = run(executable, probe);
    assert.equal(result.status, 0, result.stderr);
    const evidence = JSON.parse(result.stdout);
    assert.deepEqual(evidence.descriptor, {
      configurable: false,
      enumerable: false,
      writable: false,
    });
    assert.equal(evidence.bindingFrozen, true);
    assert.equal(evidence.receipt.verdict, 1);
    assert.equal(evidence.receipt.hostKind, "STATIC_LINKED_NODE");
    assert.equal(evidence.receipt.productionAuthorizing, false);
    assert.equal(evidence.firstBrand, true);
    assert.equal(evidence.secondBrand, false);
    assert.equal(evidence.forgedBrand, false);
    assert.equal(evidence.bytesExact, true);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
