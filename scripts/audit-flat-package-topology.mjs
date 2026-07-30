#!/usr/bin/env node
/**
 * Zero-trust flat-package topology audit.
 *
 * Galerina-native package identities must resolve from exactly one canonical
 * direct child of packages-galerina/. The pre-SLIDE mode ratchets the one
 * existing nested native example as explicit migration debt and refuses any
 * growth or stale exception. --post-slide removes that exception and also
 * refuses every node_modules tree.
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_ROOT = join(ROOT, "packages-galerina");
const BASELINE_PATH = join(
  ROOT,
  "scripts",
  "flat-package-topology-baseline.json",
);
const SKIP_RECURSIVE = new Set([
  ".git",
  ".graph",
  "build",
  "coverage",
  "dist",
  "fixtures",
  "test-fixtures",
]);

function slash(path) {
  return path.replaceAll("\\", "/");
}

function canonicalIdentity(name) {
  const normalized = String(name).trim().toLowerCase();
  if (normalized.startsWith("@galerina/")) {
    return `galerina-${normalized.slice("@galerina/".length)}`;
  }
  return normalized;
}

function manifestOwner(path) {
  const segments = slash(path).split("/");
  return segments.slice(0, -1).join("/");
}

function isNestedNative(record) {
  return record.kind === "native" && slash(record.path).split("/").length > 2;
}

export function analyzeTopologyRecords({
  records,
  legacyNestedNativeManifests,
  nodeModulesPaths,
  postSlide,
}) {
  const violations = [];
  const identities = new Map();

  for (const record of records) {
    if (typeof record.name !== "string" || record.name.trim() === "") {
      violations.push(`manifest '${record.path}' has no non-empty package identity`);
      continue;
    }
    const identity = canonicalIdentity(record.name);
    const owner = manifestOwner(record.path);
    const prior = identities.get(identity);
    if (prior !== undefined && prior.owner !== owner) {
      violations.push(
        `duplicate package identity '${identity}' at '${prior.path}' and '${record.path}'`,
      );
    } else if (prior === undefined) {
      identities.set(identity, { owner, path: record.path });
    }
  }

  const nested = records
    .filter(isNestedNative)
    .map((record) => slash(record.path))
    .sort();
  const legacy = [...legacyNestedNativeManifests].map(slash).sort();
  const nestedSet = new Set(nested);
  const legacySet = new Set(legacy);

  for (const path of nested) {
    if (postSlide) {
      violations.push(
        `post-SLIDE flat topology forbids nested native package '${path}'`,
      );
    } else if (!legacySet.has(path)) {
      violations.push(
        `nested native package '${path}' is not a canonical direct child of packages-galerina`,
      );
    }
  }
  for (const path of legacy) {
    if (!nestedSet.has(path)) {
      violations.push(
        `stale legacy nested-package exception '${path}' must be removed`,
      );
    }
  }

  if (postSlide) {
    for (const path of nodeModulesPaths) {
      violations.push(
        `post-SLIDE package topology forbids bootstrap node_modules tree '${slash(path)}'`,
      );
    }
  }

  return {
    violations,
    deferredNested: postSlide ? [] : nested.filter((path) => legacySet.has(path)),
    identityCount: identities.size,
  };
}

function parseManifest(path, kind, packageRoot) {
  const rel = slash(relative(packageRoot, path));
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return {
      path: rel,
      name: parsed?.name,
      kind,
    };
  } catch (error) {
    return {
      path: rel,
      name: "",
      kind,
      parseError: error instanceof Error ? error.message : String(error),
    };
  }
}

function walkForNativeManifests(dir, packageRoot, out, nodeModulesPaths) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") {
        nodeModulesPaths.push(slash(relative(packageRoot, path)));
        continue;
      }
      if (entry.name.startsWith(".") || SKIP_RECURSIVE.has(entry.name)) continue;
      walkForNativeManifests(path, packageRoot, out, nodeModulesPaths);
      continue;
    }
    if (entry.isFile() && entry.name === "package.fungi.json") {
      out.push(parseManifest(path, "native", packageRoot));
    }
  }
}

export function scanWorkspace(packageRoot = PACKAGE_ROOT) {
  if (!existsSync(packageRoot)) {
    return {
      records: [],
      nodeModulesPaths: [],
      scanViolations: [`package root does not exist: '${packageRoot}'`],
    };
  }

  const records = [];
  const nodeModulesPaths = [];
  const scanViolations = [];
  for (const entry of readdirSync(packageRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const hostManifest = join(packageRoot, entry.name, "package.json");
    if (existsSync(hostManifest)) {
      const parsed = parseManifest(hostManifest, "host", packageRoot);
      records.push(parsed);
      if (parsed.parseError !== undefined) {
        scanViolations.push(
          `cannot parse '${parsed.path}': ${parsed.parseError}`,
        );
      }
    }
  }
  walkForNativeManifests(
    packageRoot,
    packageRoot,
    records,
    nodeModulesPaths,
  );
  for (const record of records) {
    if (record.parseError !== undefined && record.kind === "native") {
      scanViolations.push(`cannot parse '${record.path}': ${record.parseError}`);
    }
  }

  return {
    records,
    nodeModulesPaths: nodeModulesPaths.sort(),
    scanViolations,
  };
}

function loadBaseline() {
  const parsed = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  if (
    parsed?.schemaVersion !== 1
    || !Array.isArray(parsed?.legacyNestedNativeManifests)
  ) {
    throw new Error(
      "flat-package topology baseline has an invalid or unknown schema",
    );
  }
  return parsed;
}

async function main() {
  const postSlide = process.argv.includes("--post-slide");
  const selfTest = process.argv.includes("--self-test");
  if (selfTest) {
    const testPath = join(
      ROOT,
      "scripts",
      "tests",
      "audit-flat-package-topology.test.mjs",
    );
    const child = spawnSync(process.execPath, ["--test", testPath], {
      cwd: ROOT,
      encoding: "utf8",
      windowsHide: true,
    });
    process.stdout.write(child.stdout || "");
    process.stderr.write(child.stderr || "");
    if (child.error !== undefined) {
      console.error(`flat-package topology self-test could not start: ${child.error.message}`);
      process.exitCode = 2;
    } else if (child.signal !== null) {
      console.error(`flat-package topology self-test ended by signal ${child.signal}`);
      process.exitCode = 2;
    } else if (child.status !== 0) {
      process.exitCode = typeof child.status === "number" ? child.status : 2;
    } else {
      console.log("flat-package topology self-test: PASS");
    }
    return;
  }

  let baseline;
  try {
    baseline = loadBaseline();
  } catch (error) {
    console.error(
      `FAIL: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 2;
    return;
  }

  const scan = scanWorkspace();
  const result = analyzeTopologyRecords({
    records: scan.records,
    legacyNestedNativeManifests: baseline.legacyNestedNativeManifests,
    nodeModulesPaths: scan.nodeModulesPaths,
    postSlide,
  });
  const violations = [...scan.scanViolations, ...result.violations];

  console.log(
    `flat-package topology: ${result.identityCount} canonical identities; `
      + `${result.deferredNested.length} deferred nested native package(s); `
      + `${scan.nodeModulesPaths.length} pre-SLIDE node_modules tree(s)`,
  );
  for (const path of result.deferredNested) {
    console.log(`  DEFERRED until executable SLIDE integration: ${path}`);
  }
  if (violations.length > 0) {
    for (const violation of violations) console.error(`  FAIL: ${violation}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    postSlide
      ? "flat-package topology: post-SLIDE enforcement GREEN"
      : "flat-package topology: pre-SLIDE ratchet GREEN (deferred debt is not a completion claim)",
  );
}

if (
  process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await main();
}
