import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, isAbsolute, join, normalize, relative, resolve } from "node:path";

const DOCUMENT_ROOTS = Object.freeze(["docs/", "README.md", "AGENTS.md", "SECURITY.md"]);
const DEPENDENCY_FIELDS = Object.freeze([
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
]);

function canonicalChangedPath(value) {
  if (typeof value !== "string" || value === "" || value.includes("\0")) return null;
  const slash = value.replace(/\\/g, "/");
  if (isAbsolute(value) || /^[A-Za-z]:/u.test(slash) || slash.startsWith("/")) return null;
  const normalized = normalize(slash).replace(/\\/g, "/");
  if (normalized === ".." || normalized.startsWith("../") || normalized === ".") return null;
  return normalized;
}

function readJson(path) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${path} must contain a JSON object`);
  }
  return parsed;
}

function buildWorkspace(root) {
  const workspace = readJson(join(root, "galerina.workspace.json"));
  if (!Array.isArray(workspace.packages)
      || workspace.packages.length === 0
      || workspace.packages.some((value) => typeof value !== "string" || value === "")) {
    throw new Error("galerina.workspace.json packages must be a non-empty string array");
  }
  const records = [];
  const byManifestName = new Map();
  const bySubject = new Map();
  for (const packagePathValue of workspace.packages) {
    const packagePath = canonicalChangedPath(packagePathValue);
    if (packagePath === null || !packagePath.startsWith("packages-ts/")) {
      throw new Error(`workspace package path is not canonical: ${packagePathValue}`);
    }
    const packageRoot = resolve(root, packagePath);
    const confined = relative(root, packageRoot);
    if (isAbsolute(confined) || confined.startsWith("..")) {
      throw new Error(`workspace package escapes root: ${packagePath}`);
    }
    const manifest = readJson(join(packageRoot, "package.json"));
    if (typeof manifest.name !== "string" || manifest.name === "") {
      throw new Error(`package name missing: ${packagePath}`);
    }
    const subject = basename(packagePath);
    if (byManifestName.has(manifest.name) || bySubject.has(subject)) {
      throw new Error(`duplicate package identity: ${manifest.name}`);
    }
    const record = {
      path: packagePath,
      manifestName: manifest.name,
      subject,
      hasTest: typeof manifest.scripts?.test === "string" && manifest.scripts.test !== "",
      dependencyNames: DEPENDENCY_FIELDS.flatMap((field) =>
        manifest[field] && typeof manifest[field] === "object" && !Array.isArray(manifest[field])
          ? Object.keys(manifest[field])
          : []),
    };
    records.push(record);
    byManifestName.set(record.manifestName, record);
    bySubject.set(record.subject, record);
  }
  records.sort((left, right) => left.path.localeCompare(right.path));
  const reverse = new Map(records.map((record) => [record.subject, new Set()]));
  for (const record of records) {
    for (const dependencyName of record.dependencyNames) {
      const dependency = byManifestName.get(dependencyName);
      if (dependency) reverse.get(dependency.subject).add(record.subject);
    }
  }
  const compilerPath = canonicalChangedPath(workspace.compilerPackage ?? "packages-ts/galerina-core-compiler");
  if (compilerPath === null) throw new Error("compilerPackage is not canonical");
  return { records, bySubject, reverse, compilerPath };
}

function containingPackage(workspace, changedPath) {
  const matches = workspace.records.filter((record) =>
    changedPath === record.path || changedPath.startsWith(`${record.path}/`));
  if (matches.length !== 1) return null;
  return matches[0];
}

function reverseClosure(workspace, seeds) {
  const closure = new Set(seeds);
  const queue = [...seeds].sort((a, b) => a.localeCompare(b));
  while (queue.length > 0) {
    const subject = queue.shift();
    for (const dependent of [...(workspace.reverse.get(subject) ?? [])].sort((a, b) => a.localeCompare(b))) {
      if (closure.has(dependent)) continue;
      closure.add(dependent);
      queue.push(dependent);
    }
  }
  return [...closure].sort((a, b) => a.localeCompare(b));
}

function isDocumentation(path) {
  return DOCUMENT_ROOTS.some((prefix) => prefix.endsWith("/") ? path.startsWith(prefix) : path === prefix);
}

function sealPlan(plan) {
  const canonical = JSON.stringify(plan);
  return {
    ...plan,
    planDigest: `sha256:${createHash("sha256").update(canonical).digest("hex")}`,
  };
}

export function buildImpactPlan({ root: rootValue, changedPaths: changedValues }) {
  const root = resolve(rootValue);
  const raw = Array.isArray(changedValues) ? changedValues : [];
  const canonical = raw.map(canonicalChangedPath);
  const malformed = raw.filter((_, index) => canonical[index] === null);
  const changedPaths = [...new Set(canonical.filter((value) => value !== null))]
    .sort((a, b) => a.localeCompare(b));
  const base = {
    tool: "galerina-devtools-impact",
    schemaVersion: 1,
    authorizing: false,
    changedPaths,
    seedPackages: [],
    affectedPackages: [],
    reasons: [],
    commands: [],
  };
  if (malformed.length > 0) {
    return sealPlan({ ...base, status: "FULL_REQUIRED", fullRequired: true, reasons: ["changed path is malformed or escapes the repository"] });
  }
  if (changedPaths.length === 0) {
    return sealPlan({ ...base, status: "NO_CHANGES", fullRequired: false });
  }

  let workspace;
  try {
    workspace = buildWorkspace(root);
  } catch (error) {
    return sealPlan({ ...base, status: "FULL_REQUIRED", fullRequired: true, reasons: [`workspace discovery refused: ${error.message}`] });
  }

  const seeds = new Set();
  let docsChanged = false;
  const reasons = [];
  for (const changedPath of changedPaths) {
    if (isDocumentation(changedPath)) {
      docsChanged = true;
      continue;
    }
    if (changedPath === "galerina.workspace.json"
        || changedPath === "governance/tooling-policy.json"
        || changedPath === "galerina.mjs") {
      reasons.push(`shared root changed: ${changedPath}`);
      continue;
    }
    const record = containingPackage(workspace, changedPath);
    if (record === null) {
      reasons.push(`unclassified path: ${changedPath}`);
      continue;
    }
    if (record.path === workspace.compilerPath) {
      reasons.push(`compiler package changed: ${changedPath}`);
      continue;
    }
    if (changedPath === `${record.path}/package.json`) {
      reasons.push(`package manifest changed: ${changedPath}`);
      continue;
    }
    seeds.add(record.subject);
  }
  if (reasons.length > 0) {
    return sealPlan({
      ...base,
      status: "FULL_REQUIRED",
      fullRequired: true,
      seedPackages: [...seeds].sort((a, b) => a.localeCompare(b)),
      reasons: reasons.sort((a, b) => a.localeCompare(b)),
    });
  }

  const seedPackages = [...seeds].sort((a, b) => a.localeCompare(b));
  const affectedPackages = reverseClosure(workspace, seedPackages)
    .filter((subject) => workspace.bySubject.get(subject)?.hasTest);
  const commands = [];
  if (seedPackages.length > 0 && affectedPackages.length === 0) {
    return sealPlan({
      ...base,
      status: "FULL_REQUIRED",
      fullRequired: true,
      seedPackages,
      reasons: ["affected package closure has no executable test authority"],
    });
  }
  if (affectedPackages.length > 0) {
    commands.push({
      id: "packages:affected",
      command: [
        "node", "scripts/run-all-tests.cjs", "--json",
        "--package-concurrency", "2", "--test-concurrency", "2",
        ...affectedPackages,
      ],
    });
  }
  if (docsChanged) {
    commands.push(
      { id: "docs:path-leak", command: ["node", "scripts/audit-path-leak.mjs"] },
      { id: "docs:private-leak", command: ["node", "scripts/audit-private-doc-leak.mjs"] },
      { id: "docs:drift", command: ["node", "scripts/audit-doc-drift.mjs"] },
    );
  }
  return sealPlan({
    ...base,
    status: "AFFECTED_SCOPE",
    fullRequired: false,
    seedPackages,
    affectedPackages,
    commands,
  });
}
