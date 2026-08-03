#!/usr/bin/env node
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildReceiptBoundSlidePackage } from "./lib/receipt-bound-slide-build.mjs";

const FLAGS = Object.freeze([
  "--root",
  "--manifest",
  "--out",
  "--slide-tool-root",
  "--slide-tool-manifest",
  "--slide-tool-digest",
  "--runtime-digest",
]);

function refusal() {
  return Object.freeze({
    verdict: -1,
    status: "REFUSED",
    failureId: "GALERINA-SLIDE-CLI-001",
    referenceOnly: true,
    authorityReleased: false,
  });
}

export async function runReceiptBoundSlidePackageCli(argv, options = {}) {
  if (!Array.isArray(argv) || argv.length !== FLAGS.length * 2) return refusal();
  const values = [];
  for (let index = 0; index < FLAGS.length; index += 1) {
    const flag = argv[index * 2];
    const value = argv[(index * 2) + 1];
    if (flag !== FLAGS[index] || typeof value !== "string" || value.length < 1) return refusal();
    values.push(value);
  }
  const build = options.build ?? buildReceiptBoundSlidePackage;
  if (typeof build !== "function") return refusal();
  return build({
    rootDirectory: values[0],
    sourceManifestPath: values[1],
    outputDirectory: values[2],
    slideToolRoot: values[3],
    slideToolManifestPath: values[4],
    expectedSlideToolManifestDigest: values[5],
    expectedRuntimeDigest: values[6],
  });
}

export function emitReceiptBoundSlidePackageResult(result) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (result?.verdict !== 1) process.exitCode = 1;
}

const invoked = process.argv[1] === undefined ? "" : resolve(process.argv[1]);
if (invoked === resolve(fileURLToPath(import.meta.url))) {
  emitReceiptBoundSlidePackageResult(await runReceiptBoundSlidePackageCli(process.argv.slice(2)));
}
