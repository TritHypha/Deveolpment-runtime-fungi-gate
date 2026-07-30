#!/usr/bin/env node

import {
  link,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseManifest } from "./lib/registry-package-manifest-yaml.mjs";
import {
  registryGenerationCanonicalJson,
  registryGenerationFileName,
  registryGenerationId,
  verifyRegistryGeneration,
} from "../packages-galerina/galerina-framework-app-kernel/dist/registry-generation.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registryRoot = join(
  root,
  "packages-galerina",
  "galerina-registry",
);
const governanceRoot = join(root, "governance");
const KEY_ID = /^[0-9a-f]{16}$/u;

function decodeCanonicalBase64(value, label) {
  const text = value.trim();
  if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(text) || text.length % 4 !== 0) {
    throw new Error(`REFUSED: ${label} is not canonical base64.`);
  }
  const bytes = Buffer.from(text, "base64");
  if (bytes.toString("base64") !== text) {
    throw new Error(`REFUSED: ${label} is not canonical base64.`);
  }
  return bytes;
}

async function currentGeneration() {
  const indexPath = join(registryRoot, "registry-index-v2.json");
  const manifestPath = join(
    registryRoot,
    "packages",
    "@galerina",
    "auth",
    "package.galerina.yaml",
  );
  const [indexText, manifestText] = await Promise.all([
    readFile(indexPath, "utf8"),
    readFile(manifestPath, "utf8"),
  ]);
  const index = JSON.parse(indexText);
  const manifest = parseManifest(manifestText);
  const keyId = index?.signature?.keyId;
  if (
    !KEY_ID.test(String(keyId))
    || manifest.keyId !== keyId
    || manifest.signerKeyId !== keyId
  ) {
    throw new Error(
      "REFUSED: current manifest and index do not share one admitted signer.",
    );
  }
  const generation = {
    schema: "galerina-registry-generation/v1",
    delegationSerial: 1,
    operationalKeyId: keyId,
    manifests: [manifest],
    index,
  };
  const publicBundle = {
    keyId,
    ed25519PublicKeyPem: await readFile(
      join(governanceRoot, `signing-key-${keyId}.pub.pem`),
      "utf8",
    ),
    mlDsa65PublicKey: decodeCanonicalBase64(
      await readFile(
        join(governanceRoot, `signing-key-${keyId}.mldsa.pub.b64`),
        "utf8",
      ),
      "ML-DSA-65 public key",
    ),
  };
  verifyRegistryGeneration(generation, {
    expectedDelegationSerial: 1,
    publicBundle,
    minIndexIssuedAt: "1970-01-01T00:00:00.000Z",
  });
  return generation;
}

async function buildCurrent() {
  const generation = await currentGeneration();
  const canonical = registryGenerationCanonicalJson(generation);
  const generationId = await registryGenerationId(generation);
  const directory = join(registryRoot, "generations");
  const target = join(directory, registryGenerationFileName(generationId));
  const staging = `${target}.tmp-${process.pid}`;
  await mkdir(directory, { recursive: true });
  try {
    await writeFile(staging, canonical, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    try {
      await link(staging, target);
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const existing = await readFile(target, "utf8");
      if (existing !== canonical) {
        throw new Error(
          "REFUSED: the content-addressed generation path has different bytes.",
        );
      }
    }
  } finally {
    await rm(staging, { force: true });
  }
  process.stdout.write(
    `registry-generation: ${generationId} -> ${target}\n`,
  );
}

async function checkCurrent() {
  const generation = await currentGeneration();
  const canonical = registryGenerationCanonicalJson(generation);
  const generationId = await registryGenerationId(generation);
  const target = join(
    registryRoot,
    "generations",
    registryGenerationFileName(generationId),
  );
  const existing = await readFile(target, "utf8");
  if (existing !== canonical) {
    throw new Error(
      "REFUSED: committed generation differs from current signed artifacts.",
    );
  }
  process.stdout.write(`registry-generation check: OK (${generationId})\n`);
}

const command = process.argv[2];
try {
  if (command === "build-current") {
    await buildCurrent();
  } else if (command === "check-current") {
    await checkCurrent();
  } else {
    throw new Error(
      "Usage: node scripts/registry-generation-cli.mjs build-current|check-current",
    );
  }
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : "REFUSED: registry generation operation failed."}\n`,
  );
  process.exitCode = 1;
}
