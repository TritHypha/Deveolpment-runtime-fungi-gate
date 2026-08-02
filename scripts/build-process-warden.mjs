#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CRATE = join(ROOT, "scripts", "native", "process-warden");
const TARGET = join(ROOT, "build", "target-cache", "process-warden");
const BINARY = join(TARGET, "release", "galerina-process-warden.exe");
const RECEIPT = join(ROOT, "build", "_process-warden-receipt.json");

function digest(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

if (process.platform !== "win32" || process.arch !== "x64") {
  console.error("PROCESS_WARDEN_PLATFORM_REFUSED");
  process.exit(1);
}

const cargoProbe = spawnSync("where.exe", ["cargo.exe"], {
  encoding: "utf8",
  shell: false,
  windowsHide: true,
  timeout: 10_000,
});
const cargoCandidate = cargoProbe.status === 0
  ? cargoProbe.stdout.trim().split(/\r?\n/, 1)[0]
  : "";
if (!cargoCandidate || !existsSync(cargoCandidate)) {
  console.error("PROCESS_WARDEN_CARGO_REFUSED");
  process.exit(1);
}
// Keep the rustup proxy path as cargo.exe. Resolving its symlink changes argv[0]
// to rustup.exe and loses Cargo proxy dispatch.
const cargo = cargoCandidate;
mkdirSync(TARGET, { recursive: true });
const build = spawnSync(cargo, ["build", "--release", "--locked"], {
  cwd: CRATE,
  env: { ...process.env, CARGO_TARGET_DIR: TARGET },
  encoding: "utf8",
  shell: false,
  windowsHide: true,
  timeout: 120_000,
  maxBuffer: 16 * 1024 * 1024,
});
if (build.error || build.status !== 0 || build.signal !== null) {
  process.stderr.write(`${build.stdout || ""}${build.stderr || ""}`);
  console.error("PROCESS_WARDEN_BUILD_REFUSED");
  process.exit(1);
}
if (!existsSync(BINARY)) {
  console.error("PROCESS_WARDEN_BINARY_MISSING");
  process.exit(1);
}
const source = join(CRATE, "src", "main.rs");
const manifest = join(CRATE, "Cargo.toml");
const lock = join(CRATE, "Cargo.lock");
const receipt = {
  schemaVersion: 1,
  platform: process.platform,
  arch: process.arch,
  sourceSha256: digest(source),
  manifestSha256: digest(manifest),
  lockSha256: digest(lock),
  binarySha256: digest(BINARY),
};
writeFileSync(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: "galerina.process-warden-build.v1",
  verdict: "BUILT_NON_AUTHORIZING",
  binarySha256: receipt.binarySha256,
}));
