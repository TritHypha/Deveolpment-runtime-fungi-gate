import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

function lengthPrefixed(hash, value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  const length = Buffer.allocUnsafe(8);
  length.writeBigUInt64BE(BigInt(bytes.length));
  hash.update(length);
  hash.update(bytes);
}

function compilerFiles(root) {
  const files = [join(root, "galerina.mjs")];
  const dist = join(root, "packages-ts", "galerina-core-compiler", "dist");
  function walk(directory) {
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true })
        .sort((left, right) => left.name.localeCompare(right.name));
    } catch {
      return;
    }
    for (const entry of entries) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".cjs"))) {
        files.push(absolute);
      }
    }
  }
  walk(dist);
  return files;
}

export function compilerContentFingerprint(root) {
  const hash = createHash("sha256");
  hash.update("galerina.compiler-content-fingerprint.v1\0");
  for (const absolute of compilerFiles(root)) {
    const identity = relative(root, absolute).replace(/\\/g, "/");
    lengthPrefixed(hash, identity);
    if (!existsSync(absolute)) {
      lengthPrefixed(hash, "MISSING");
      continue;
    }
    lengthPrefixed(hash, readFileSync(absolute));
  }
  return hash.digest("hex").slice(0, 16);
}
