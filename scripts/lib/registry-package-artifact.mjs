import { createHash } from "node:crypto";
import {
  closeSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import { constants as fsConstants } from "node:fs";
import {
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { posix } from "node:path";

export const REGISTRY_ARTIFACT_PROFILE = "galerina-flat-package-tree/v1";

export const REGISTRY_ARTIFACT_LIMITS = Object.freeze({
  maxFiles: 4_096,
  maxFileBytes: 16 * 1024 * 1024,
  maxTotalBytes: 64 * 1024 * 1024,
  maxPathBytes: 512,
});

const ARTIFACT_HASH_DOMAIN = Buffer.from(
  "galerina.package.artifact.tree.v1\0",
  "utf8",
);

export class RegistryPackageArtifactError extends Error {
  constructor(message) {
    super(message);
    this.name = "RegistryPackageArtifactError";
  }
}

function refuse(message) {
  throw new RegistryPackageArtifactError(message);
}

function isWithin(parent, child) {
  const delta = relative(parent, child);
  return delta !== "" && delta !== ".." && !delta.startsWith(`..${sep}`)
    && !isAbsolute(delta);
}

function requireDirectory(path, label) {
  let stats;
  try {
    stats = lstatSync(path);
  } catch (error) {
    refuse(`${label} is unavailable: ${error?.code ?? "unknown error"}`);
  }
  if (stats.isSymbolicLink()) {
    refuse(`${label} must not be a symlink or reparse point`);
  }
  if (!stats.isDirectory()) {
    refuse(`${label} must be a directory`);
  }
}

function parseDirectPackageIdentity(packageRoot, packageDirectory) {
  const packageJsonPath = join(packageRoot, "package.json");
  let packageJsonStats;
  try {
    packageJsonStats = lstatSync(packageJsonPath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    refuse(
      `direct package ${packageDirectory} package.json is unavailable: `
      + `${error?.code ?? "unknown error"}`,
    );
  }
  if (packageJsonStats.isSymbolicLink() || !packageJsonStats.isFile()) {
    refuse(
      `direct package ${packageDirectory} package.json must be a regular `
      + "non-symlink file",
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  } catch {
    refuse(`direct package ${packageDirectory} has invalid package.json`);
  }
  if (
    parsed === null
    || Array.isArray(parsed)
    || typeof parsed !== "object"
    || typeof parsed.name !== "string"
    || parsed.name.length === 0
  ) {
    refuse(`direct package ${packageDirectory} has no literal package name`);
  }
  return parsed.name;
}

export function resolveFlatWorkspacePackage(
  workspacePackagesDir,
  packageName,
) {
  if (
    typeof workspacePackagesDir !== "string"
    || workspacePackagesDir.length === 0
  ) {
    refuse("workspace packages directory must be a non-empty string");
  }
  if (typeof packageName !== "string" || packageName.length === 0) {
    refuse("package name must be a non-empty string");
  }

  const workspaceRoot = resolve(workspacePackagesDir);
  requireDirectory(workspaceRoot, "workspace packages directory");
  const realWorkspaceRoot = realpathSync(workspaceRoot);
  const matches = [];
  const directEntries = readdirSync(workspaceRoot, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name, "en"));

  for (const entry of directEntries) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) {
      continue;
    }
    const packageRoot = join(workspaceRoot, entry.name);
    requireDirectory(packageRoot, `direct package ${entry.name}`);
    const realPackageRoot = realpathSync(packageRoot);
    if (
      dirname(realPackageRoot) !== realWorkspaceRoot
      || !isWithin(realWorkspaceRoot, realPackageRoot)
    ) {
      refuse(`direct package ${entry.name} escapes the flat workspace`);
    }
    const identity = parseDirectPackageIdentity(
      realPackageRoot,
      entry.name,
    );
    if (identity === packageName) {
      matches.push({
        packageRoot: realPackageRoot,
        packageDirectory: entry.name,
      });
    }
  }

  if (matches.length === 0) {
    refuse(`no direct package identity matches ${packageName}`);
  }
  if (matches.length !== 1) {
    refuse(`duplicate direct package identity ${packageName}`);
  }
  return matches[0];
}

function validateArtifactPath(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    refuse("artifact path must be a non-empty string");
  }
  if (relativePath.includes("\0")) {
    refuse("artifact path contains a NUL byte");
  }
  if (relativePath.includes("\\")) {
    refuse("artifact path must use forward slashes");
  }
  if (
    relativePath.startsWith("/")
    || relativePath.startsWith("//")
    || /^[A-Za-z]:\//u.test(relativePath)
    || posix.isAbsolute(relativePath)
  ) {
    refuse("artifact path must be package-root relative");
  }
  const pathBytes = Buffer.from(relativePath, "utf8");
  if (pathBytes.toString("utf8") !== relativePath) {
    refuse("artifact path must be valid UTF-8 text");
  }
  if (pathBytes.length > REGISTRY_ARTIFACT_LIMITS.maxPathBytes) {
    refuse(
      `artifact path exceeds ${REGISTRY_ARTIFACT_LIMITS.maxPathBytes} `
      + "UTF-8 bytes",
    );
  }
  const segments = relativePath.split("/");
  if (
    segments.some(
      (segment) => segment.length === 0 || segment === "." || segment === "..",
    )
    || posix.normalize(relativePath) !== relativePath
  ) {
    refuse("artifact path is not canonical or traverses the package root");
  }
  return pathBytes;
}

function lengthFrame(value) {
  const frame = Buffer.alloc(8);
  frame.writeBigUInt64BE(BigInt(value));
  return frame;
}

function sameStableFile(before, opened, after) {
  return before.isFile()
    && opened.isFile()
    && after.isFile()
    && !before.isSymbolicLink()
    && before.dev === opened.dev
    && before.ino === opened.ino
    && opened.dev === after.dev
    && opened.ino === after.ino
    && before.size === opened.size
    && opened.size === after.size
    && opened.mtimeMs === after.mtimeMs
    && opened.ctimeMs === after.ctimeMs;
}

function readStableArtifactFile(path, initialStats) {
  let descriptor;
  try {
    descriptor = openSync(
      path,
      fsConstants.O_RDONLY
        | (process.platform === "win32" ? 0 : fsConstants.O_NOFOLLOW),
    );
    const openedStats = fstatSync(descriptor);
    const bytes = readFileSync(descriptor);
    const afterStats = fstatSync(descriptor);
    if (!sameStableFile(initialStats, openedStats, afterStats)) {
      refuse("artifact file changed during deterministic hashing");
    }
    if (bytes.length !== openedStats.size) {
      refuse("artifact file byte count changed during deterministic hashing");
    }
    return bytes;
  } catch (error) {
    if (error instanceof RegistryPackageArtifactError) {
      throw error;
    }
    refuse(`artifact file could not be read safely: ${error?.code ?? "error"}`);
  } finally {
    if (descriptor !== undefined) {
      closeSync(descriptor);
    }
  }
}

export function hashFlatPackageArtifact({
  workspacePackagesDir,
  packageName,
  artifactProfile,
  artifactFiles,
}) {
  if (artifactProfile !== REGISTRY_ARTIFACT_PROFILE) {
    refuse(`unsupported artifact profile: ${String(artifactProfile)}`);
  }
  if (!Array.isArray(artifactFiles) || artifactFiles.length === 0) {
    refuse("artifactFiles must be a non-empty array");
  }
  if (artifactFiles.length > REGISTRY_ARTIFACT_LIMITS.maxFiles) {
    refuse(
      `artifactFiles exceeds ${REGISTRY_ARTIFACT_LIMITS.maxFiles} entries`,
    );
  }

  const validatedPaths = artifactFiles.map((relativePath) => ({
    relativePath,
    pathBytes: validateArtifactPath(relativePath),
  }));
  for (let index = 1; index < validatedPaths.length; index += 1) {
    const comparison = Buffer.compare(
      validatedPaths[index - 1].pathBytes,
      validatedPaths[index].pathBytes,
    );
    if (comparison === 0) {
      refuse(`duplicate artifact path: ${validatedPaths[index].relativePath}`);
    }
    if (comparison > 0) {
      refuse("artifactFiles must be in canonical lexical order");
    }
  }

  const { packageRoot, packageDirectory } = resolveFlatWorkspacePackage(
    workspacePackagesDir,
    packageName,
  );
  const realPackageRoot = realpathSync(packageRoot);
  const digest = createHash("sha256");
  digest.update(ARTIFACT_HASH_DOMAIN);
  let totalBytes = 0;
  const resolvedFiles = new Set();

  for (const { relativePath, pathBytes } of validatedPaths) {
    const artifactPath = resolve(
      realPackageRoot,
      ...relativePath.split("/"),
    );
    if (!isWithin(realPackageRoot, artifactPath)) {
      refuse(`artifact path escapes the package root: ${relativePath}`);
    }

    let artifactStats;
    try {
      artifactStats = lstatSync(artifactPath);
    } catch (error) {
      if (error?.code === "ENOENT") {
        refuse(`artifact file is missing: ${relativePath}`);
      }
      refuse(
        `artifact file is unavailable: ${relativePath}: `
        + `${error?.code ?? "unknown error"}`,
      );
    }
    if (artifactStats.isSymbolicLink()) {
      refuse(
        `artifact path must not be a symlink or reparse point: ${relativePath}`,
      );
    }
    if (!artifactStats.isFile()) {
      refuse(`artifact path is not a regular file: ${relativePath}`);
    }
    if (artifactStats.size > REGISTRY_ARTIFACT_LIMITS.maxFileBytes) {
      refuse(
        `artifact file exceeds ${REGISTRY_ARTIFACT_LIMITS.maxFileBytes} `
        + `bytes: ${relativePath}`,
      );
    }

    const realArtifactPath = realpathSync(artifactPath);
    if (!isWithin(realPackageRoot, realArtifactPath)) {
      refuse(`artifact file resolves outside the package root: ${relativePath}`);
    }
    const collisionKey = process.platform === "win32"
      ? realArtifactPath.toLowerCase()
      : realArtifactPath;
    if (resolvedFiles.has(collisionKey)) {
      refuse(`artifact paths resolve to the same file: ${relativePath}`);
    }
    resolvedFiles.add(collisionKey);

    totalBytes += artifactStats.size;
    if (totalBytes > REGISTRY_ARTIFACT_LIMITS.maxTotalBytes) {
      refuse(
        `artifact exceeds ${REGISTRY_ARTIFACT_LIMITS.maxTotalBytes} total bytes`,
      );
    }
    const fileBytes = readStableArtifactFile(artifactPath, artifactStats);
    digest.update(lengthFrame(pathBytes.length));
    digest.update(pathBytes);
    digest.update(lengthFrame(fileBytes.length));
    digest.update(fileBytes);
  }

  return {
    packageRoot: realPackageRoot,
    packageDirectory,
    fileCount: validatedPaths.length,
    totalBytes,
    hash: `sha256:${digest.digest("hex")}`,
  };
}
