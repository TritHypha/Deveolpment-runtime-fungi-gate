import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { publishReferenceOutputTree, ReferencePublicationError } from "./reference-renderers.js";
import type { GalerinaReferenceManifest } from "./reference-types.js";

function argument(args: readonly string[], name: string): string {
  const index = args.indexOf(name);
  const value = index === -1 ? undefined : args[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`missing ${name}`);
  return value;
}

export async function runReferenceCli(args: readonly string[]): Promise<number> {
  const mode = args[0];
  if (mode !== "write" && mode !== "check") throw new Error("usage: reference-cli <write|check> --manifest <reference.json> --out <directory>");
  const manifestPath = argument(args, "--manifest");
  const outDir = argument(args, "--out");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as GalerinaReferenceManifest;
  try {
    await publishReferenceOutputTree({ manifest, outDir, mode });
    process.stdout.write(`${JSON.stringify({ status: "ALLOW", mode, manifestSha256: manifest.manifestSha256 })}\n`);
    return 0;
  } catch (error) {
    if (error instanceof ReferencePublicationError && (error.code === "OUTPUT_COLLISION" || error.code === "STALE_OUTPUT")) {
      process.stderr.write(`${JSON.stringify({ status: "REFUSED", code: error.code, message: error.message })}\n`);
      return 1;
    }
    throw error;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runReferenceCli(process.argv.slice(2)).then((code) => { process.exitCode = code; }).catch((error: unknown) => {
    process.stderr.write(`${JSON.stringify({ status: "ERROR", message: error instanceof Error ? error.message : String(error) })}\n`);
    process.exitCode = 2;
  });
}
