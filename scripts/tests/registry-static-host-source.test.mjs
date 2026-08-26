import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

import {
  verifyRegistryStaticHostSource,
} from "../verify-registry-static-host-source.mjs";

const ROOT = resolve(import.meta.dirname, "..", "..");
const HOST = join(
  ROOT,
  "packages-ts",
  "galerina-framework-app-kernel",
  "native",
  "registry-activation-host",
);

test("closed host source is pinned and remains non-authorizing", async () => {
  const result = await verifyRegistryStaticHostSource({
    hostDirectory: HOST,
  });
  assert.deepEqual(result, {
    schema: "galerina.registry.static-host-source-verification.v1",
    verdict: "CANDIDATE",
    nodeVersion: "24.18.0",
    nodeSourceSha256:
      "c8348067b41d8739ec69fd4da615cd8995ad6a76eb53e84a7fa7291c8a477eb7",
    bindingName: "galerina_registry_durability",
    rustAbiVersion: 1,
    windowsSystemLibraries: ["ntdll.lib", "userenv.lib"],
    externalAdapterLoaderPresent: false,
    childProcessPresent: false,
    productionAuthorizing: false,
  });
  assert.equal(process._galerinaLinkedBinding, undefined);
});

test("manifest drift and prohibited loader text refuse", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "galerina-static-host-source-"));
  try {
    for (const name of [
      "host-source-manifest.json",
      "galerina_registry_binding.cc",
      "node-v24.18.0-galerina-host.patch",
      "node-v24.18.0-clang22-histogram.patch",
    ]) {
      await writeFile(
        join(temporary, name),
        await readFile(join(HOST, name)),
        { flag: "wx" },
      );
    }

    const manifestPath = join(temporary, "host-source-manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.nodeVersion = "24.18.1";
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    await assert.rejects(
      verifyRegistryStaticHostSource({ hostDirectory: temporary }),
      /STATIC_HOST_MANIFEST_REFUSED/,
    );

    await writeFile(
      manifestPath,
      await readFile(join(HOST, "host-source-manifest.json")),
    );
    const prohibitedBinding = "process.dlopen('host.node')\n";
    await writeFile(
      join(temporary, "galerina_registry_binding.cc"),
      prohibitedBinding,
    );
    const prohibitedManifest = JSON.parse(
      await readFile(manifestPath, "utf8"),
    );
    prohibitedManifest.bindingSourceSha256 = createHash("sha256")
      .update(prohibitedBinding)
      .digest("hex");
    await writeFile(
      manifestPath,
      `${JSON.stringify(prohibitedManifest, null, 2)}\n`,
    );
    await assert.rejects(
      verifyRegistryStaticHostSource({ hostDirectory: temporary }),
      /STATIC_HOST_PROHIBITED_LOADER_TEXT/,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
