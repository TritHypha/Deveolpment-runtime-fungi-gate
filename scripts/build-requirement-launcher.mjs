#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CRATE = join(ROOT, "scripts", "native", "requirement-launcher");
const OUTPUT = join(ROOT, "build", "rd0858-requirement-launcher");
const TARGET = join(OUTPUT, "target");
const BINARY = join(TARGET, "release", "galerina-requirement-launcher.exe");
const RECEIPT = join(OUTPUT, "build-receipt.json");
const WARDEN_BUILD = join(ROOT, "scripts", "build-process-warden.mjs");
const INPUTS = [
  join(CRATE, "Cargo.toml"),
  join(CRATE, "Cargo.lock"),
  join(CRATE, "src", "protocol.rs"),
  join(CRATE, "src", "main.rs"),
];

function digest(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function regularFile(path, code) {
  if (!existsSync(path) || lstatSync(path).isSymbolicLink() || !statSync(path).isFile()) {
    throw new Error(code);
  }
  const resolved = realpathSync.native(path);
  const root = `${realpathSync.native(ROOT)}\\`;
  if (!resolved.toLowerCase().startsWith(root.toLowerCase())) {
    throw new Error(`${code}_OUTSIDE_ROOT`);
  }
  return resolved;
}

function snapshotInputs() {
  return Object.fromEntries(INPUTS.map((path) => [relative(ROOT, path).replaceAll("\\", "/"), digest(regularFile(path, "REQUIREMENT_LAUNCHER_INPUT_REFUSED"))]));
}

function fail(code, detail = "") {
  if (detail) process.stderr.write(detail);
  console.error(code);
  process.exit(1);
}

function firstWhereResult(executable, code) {
  const probe = spawnSync("where.exe", [executable], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    timeout: 10_000,
    maxBuffer: 64 * 1024,
  });
  const candidate = probe.status === 0
    ? probe.stdout.trim().split(/\r?\n/, 1)[0]
    : "";
  if (!candidate || !existsSync(candidate) || !statSync(candidate).isFile()) {
    fail(code);
  }
  return candidate;
}

if (process.platform !== "win32" || process.arch !== "x64") {
  fail("REQUIREMENT_LAUNCHER_PLATFORM_REFUSED");
}

let before;
try {
  before = snapshotInputs();
} catch (error) {
  fail(error.message || "REQUIREMENT_LAUNCHER_INPUT_REFUSED");
}

const cargoCandidate = firstWhereResult("cargo.exe", "REQUIREMENT_LAUNCHER_CARGO_REFUSED");
// Preserve the rustup proxy path as cargo.exe. Resolving or rejecting its
// reparse point changes proxy dispatch and prevents Cargo from starting.
const cargo = cargoCandidate;
const rustc = firstWhereResult("rustc.exe", "REQUIREMENT_LAUNCHER_RUSTC_REFUSED");
const git = firstWhereResult("git.exe", "REQUIREMENT_LAUNCHER_GIT_REFUSED");

const warden = spawnSync(process.execPath, [WARDEN_BUILD], {
  cwd: ROOT,
  encoding: "utf8",
  shell: false,
  windowsHide: true,
  timeout: 180_000,
  maxBuffer: 16 * 1024 * 1024,
});
if (warden.error || warden.status !== 0 || warden.signal !== null) {
  fail("REQUIREMENT_LAUNCHER_WARDEN_BUILD_REFUSED", `${warden.stdout || ""}${warden.stderr || ""}`);
}

const require = createRequire(import.meta.url);
const { runOwnedProcess } = require("./lib/owned-process-tree.cjs");

async function ownedText(command, args, code) {
  const result = await runOwnedProcess({
    command,
    args,
    cwd: ROOT,
    env: process.env,
    timeoutMs: 30_000,
    cleanupGraceMs: 5_000,
    maxOutputBytes: 1024 * 1024,
    windowsHide: true,
  });
  if (result.spawnError || result.timedOut || result.outputLimitExceeded || result.status !== 0 || result.signal !== null) {
    fail(code, `${result.stdout || ""}${result.stderr || ""}`);
  }
  return result.stdout.trim();
}

const rustcVersion = await ownedText(rustc, ["--version"], "REQUIREMENT_LAUNCHER_RUSTC_VERSION_REFUSED");
const gitHead = await ownedText(git, ["rev-parse", "HEAD"], "REQUIREMENT_LAUNCHER_GIT_HEAD_REFUSED");
if (!/^rustc \S+/.test(rustcVersion) || !/^[0-9a-f]{40}$/.test(gitHead)) {
  fail("REQUIREMENT_LAUNCHER_BUILD_IDENTITY_REFUSED");
}

mkdirSync(TARGET, { recursive: true });
const command = ["cargo", "build", "--release", "--locked"];
const build = await runOwnedProcess({
  command: cargo,
  args: command.slice(1),
  cwd: CRATE,
  env: {
    ...process.env,
    CARGO_INCREMENTAL: "0",
    CARGO_TARGET_DIR: TARGET,
    RUSTC: rustc,
    RUSTC_WRAPPER: "",
    RUSTFLAGS: "--cfg test_contract",
  },
  timeoutMs: 120_000,
  cleanupGraceMs: 5_000,
  maxOutputBytes: 16 * 1024 * 1024,
  windowsHide: true,
});
if (build.spawnError || build.timedOut || build.outputLimitExceeded || build.status !== 0 || build.signal !== null) {
  fail("REQUIREMENT_LAUNCHER_BUILD_REFUSED", `${build.stdout || ""}${build.stderr || ""}`);
}

let after;
try {
  after = snapshotInputs();
} catch (error) {
  fail(error.message || "REQUIREMENT_LAUNCHER_INPUT_REFUSED");
}
if (JSON.stringify(after) !== JSON.stringify(before)) {
  fail("REQUIREMENT_LAUNCHER_INPUT_DRIFT");
}

let binary;
try {
  binary = regularFile(BINARY, "REQUIREMENT_LAUNCHER_BINARY_MISSING");
} catch (error) {
  fail(error.message || "REQUIREMENT_LAUNCHER_BINARY_MISSING");
}
const binarySha256 = digest(binary);
const receipt = Object.freeze({
  schemaVersion: 1,
  verdict: "BUILT_NON_AUTHORIZING",
  platform: process.platform,
  arch: process.arch,
  gitHead,
  rustcVersion,
  command,
  compileCfg: ["test_contract"],
  cargoExecutable: basename(cargo),
  cargoSha256: digest(cargo),
  inputs: before,
  binarySha256,
});
mkdirSync(dirname(RECEIPT), { recursive: true });
writeFileSync(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: "galerina.requirement-launcher-build.v1",
  verdict: receipt.verdict,
  binarySha256,
}));
