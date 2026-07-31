#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nativeRoot = join(
  repoRoot,
  "packages-galerina",
  "galerina-framework-app-kernel",
  "native",
  "registry-durability",
);
const adapterSource = join(nativeRoot, "src", "lib.rs");
const fungiContract = join(
  repoRoot,
  "packages-galerina",
  "galerina-framework-app-kernel",
  "src",
  "self-hosted",
  "registry-durability-admission.fungi",
);
const executableName = process.platform === "win32"
  ? "registry-durability-static-profile.exe"
  : "registry-durability-static-profile";
const executable = join(nativeRoot, "target", "release", executableName);

function stop(message) {
  process.stderr.write(`REFUSED: ${message}\n`);
  process.exit(1);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function readBoundedDirectFile(path, maximumBytes, label) {
  const before = lstatSync(path, { bigint: true });
  if (!before.isFile() || before.isSymbolicLink()) {
    stop(`${label} is not one direct regular file`);
  }
  if (before.size <= 0n || before.size > BigInt(maximumBytes)) {
    stop(`${label} is empty or exceeds its byte ceiling`);
  }
  const bytes = readFileSync(path);
  const after = lstatSync(path, { bigint: true });
  if (
    BigInt(bytes.length) !== before.size
    || before.dev !== after.dev
    || before.ino !== after.ino
    || before.size !== after.size
    || before.mtimeNs !== after.mtimeNs
  ) {
    stop(`${label} changed while it was being materialized`);
  }
  return bytes;
}

function isContained(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

function executeProfile(cwd) {
  const stdout = execFileSync(executable, [], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const lines = stdout.trim().split(/\r?\n/u);
  if (lines.length !== 1) stop("static profile emitted a non-canonical line count");
  try {
    return JSON.parse(lines[0]);
  } catch {
    stop("static profile did not emit one JSON object");
  }
}

if (!process.argv.includes("--no-build")) {
  execFileSync(
    "cargo",
    [
      "build",
      "--locked",
      "--release",
      "--features",
      "static-profile-proof",
      "--bin",
      "registry-durability-static-profile",
    ],
    { cwd: nativeRoot, stdio: "inherit", windowsHide: true },
  );
}

const executableReal = realpathSync(executable);
const releaseRootReal = realpathSync(join(nativeRoot, "target", "release"));
if (!isContained(releaseRootReal, executableReal)) {
  stop("static profile executable escaped the release directory");
}
const executableStats = lstatSync(executable);
if (!executableStats.isFile() || executableStats.isSymbolicLink()) {
  stop("static profile executable is not one direct regular file");
}
const repoRootReal = realpathSync(repoRoot);
for (const [path, label] of [
  [adapterSource, "adapter source"],
  [fungiContract, "Fungi contract"],
]) {
  if (!isContained(repoRootReal, realpathSync(path))) {
    stop(`${label} escaped the repository`);
  }
}

const adapterSourceBytes = readBoundedDirectFile(adapterSource, 4 * 1024 * 1024, "adapter source");
const fungiContractBytes = readBoundedDirectFile(fungiContract, 1024 * 1024, "Fungi contract");
const executableBytes = readBoundedDirectFile(executableReal, 64 * 1024 * 1024, "static profile executable");

const clean = executeProfile(nativeRoot);
const scratch = mkdtempSync(join(tmpdir(), "galerina-static-profile-"));
let polluted;
try {
  writeFileSync(join(scratch, "registry-durability.node"), "hostile-loader-decoy", {
    flag: "wx",
  });
  polluted = executeProfile(scratch);
} finally {
  const scratchReal = realpathSync(scratch);
  const tempReal = realpathSync(tmpdir());
  if (!isContained(tempReal, scratchReal) || scratchReal === tempReal) {
    stop("scratch cleanup containment could not be proved");
  }
  rmSync(scratchReal, { recursive: true, force: false });
}

if (JSON.stringify(clean) !== JSON.stringify(polluted)) {
  stop("external adapter decoy changed the statically linked profile");
}

const expectedKeys = [
  "abi",
  "adapterIsStaticallyLinked",
  "adapterSourceSha256",
  "buildProfile",
  "externalAdapterLoaderPresent",
  "faultInjectionPresent",
  "fungiContractSha256",
  "productionAuthorizing",
  "reason",
  "schema",
  "verdict",
];
if (JSON.stringify(Object.keys(clean).sort()) !== JSON.stringify(expectedKeys)) {
  stop("static profile output has missing or surplus fields");
}

const expected = {
  schema: "galerina-registry-durability-static-link-profile/v1",
  verdict: "CANDIDATE",
  reason: "NONE",
  abi: "galerina.registry.durability.abi.v1",
  adapterSourceSha256: sha256(adapterSourceBytes),
  fungiContractSha256: sha256(fungiContractBytes),
  buildProfile: "release",
  adapterIsStaticallyLinked: true,
  externalAdapterLoaderPresent: false,
  faultInjectionPresent: false,
  productionAuthorizing: false,
};
for (const [key, value] of Object.entries(expected)) {
  if (clean[key] !== value) stop(`static profile field '${key}' did not match`);
}

const receipt = {
  schema: "galerina-registry-durability-static-link-proof/v1",
  verdict: "CANDIDATE",
  productionAuthorizing: false,
  platform: process.platform,
  architecture: process.arch,
  executableSha256: sha256(executableBytes),
  adapterSourceSha256: clean.adapterSourceSha256,
  fungiContractSha256: clean.fungiContractSha256,
  abi: clean.abi,
  buildProfile: clean.buildProfile,
  pollutedWorkingDirectoryInvariant: true,
};
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
