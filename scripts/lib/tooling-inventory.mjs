import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { basename, join, relative, resolve, sep } from "node:path";

const POLICY_KEYS = Object.freeze([
  "schemaVersion",
  "packageNoTest",
  "toolExceptions",
  "generators",
]);
const PACKAGE_EXCEPTION_KEYS = Object.freeze([
  "reason",
  "owner",
  "reviewWhen",
]);
const TOOL_EXCEPTION_KEYS = Object.freeze([
  "class",
  "reason",
  "owner",
  "reviewWhen",
]);

function readText(path) {
  return readFileSync(path, "utf8");
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function isPlainObject(value) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value);
}

function sortedUnique(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function listFiles(directory, predicate = () => true) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && predicate(entry.name))
    .map((entry) => join(directory, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

function packageSubject(packagePath) {
  const name = basename(packagePath.replace(/[\\/]+$/, ""));
  return name.startsWith("galerina-") ? name : `galerina-${name}`;
}

function discoverPackages(root, errors) {
  const workspacePath = join(root, "galerina.workspace.json");
  let declaredPaths = [];
  if (!existsSync(workspacePath)) {
    errors.push({
      code: "TOOLING-WORKSPACE-MISSING",
      subject: "galerina.workspace.json",
      detail: "Workspace declaration is missing.",
    });
  } else {
    try {
      const workspace = readJson(workspacePath);
      if (!Array.isArray(workspace.packages)
          || workspace.packages.some((item) => typeof item !== "string")) {
        errors.push({
          code: "TOOLING-WORKSPACE-MALFORMED",
          subject: "galerina.workspace.json",
          detail: "packages must be an array of relative path strings.",
        });
      } else {
        declaredPaths = workspace.packages;
      }
    } catch (error) {
      errors.push({
        code: "TOOLING-WORKSPACE-MALFORMED",
        subject: "galerina.workspace.json",
        detail: error.message,
      });
    }
  }

  const declaredCounts = new Map();
  for (const packagePath of declaredPaths) {
    declaredCounts.set(packagePath, (declaredCounts.get(packagePath) ?? 0) + 1);
  }
  for (const [packagePath, count] of declaredCounts) {
    if (count > 1) {
      errors.push({
        code: "TOOLING-WORKSPACE-DUPLICATE",
        subject: packageSubject(packagePath),
        detail: `${packagePath} is declared ${count} times.`,
      });
    }
  }

  const packageDirectory = join(root, "packages-galerina");
  const actualPaths = existsSync(packageDirectory)
    ? readdirSync(packageDirectory, { withFileTypes: true })
      .filter((entry) =>
        entry.isDirectory()
        && existsSync(join(packageDirectory, entry.name, "package.json")))
      .map((entry) => `packages-galerina/${entry.name}`)
    : [];
  const allPaths = sortedUnique([...declaredPaths, ...actualPaths]);

  return allPaths.map((packagePath) => {
    const subject = packageSubject(packagePath);
    const absolutePath = resolve(root, ...packagePath.split("/"));
    const packageJsonPath = join(absolutePath, "package.json");
    const registered = declaredCounts.has(packagePath);
    const exists = existsSync(packageJsonPath);
    let packageJson = null;
    let packageJsonError = null;
    if (exists) {
      try {
        packageJson = readJson(packageJsonPath);
      } catch (error) {
        packageJsonError = error.message;
      }
    }
    const testScript = packageJson?.scripts?.test;
    return {
      subject,
      path: packagePath,
      absolutePath,
      registered,
      exists,
      packageJsonError,
      packageName: typeof packageJson?.name === "string"
        ? packageJson.name
        : null,
      testScript: typeof testScript === "string" && testScript.trim() !== ""
        ? testScript
        : null,
    };
  });
}

function toolCategory(name) {
  if (/^audit-/.test(name)) return "audit";
  if (/^lint-/.test(name)) return "lint";
  if (/^run-/.test(name)) return "runner";
  if (/^gen-/.test(name)) return "generator";
  if (/graph/.test(name)) return "graph";
  if (/(?:^|-)(?:index|registry)/.test(name)) return "index";
  return "util";
}

function discoverTools(root) {
  return listFiles(
    join(root, "scripts"),
    (name) => /\.(?:mjs|cjs)$/.test(name),
  ).map((path) => ({
    name: basename(path),
    path,
    category: toolCategory(basename(path)),
  }));
}

function extractScriptCommands(source) {
  return sortedUnique(
    [...source.matchAll(/scripts[\\/][A-Za-z0-9_.-]+\.(?:mjs|cjs)/g)]
      .map((match) => match[0].replaceAll("\\", "/").slice("scripts/".length)),
  );
}

function discoverPhaseCloseCommands(root) {
  const path = join(root, "scripts", "run-phase-close.mjs");
  return existsSync(path) ? extractScriptCommands(readText(path)) : [];
}

function discoverCiCommands(root) {
  const directory = join(root, ".github", "workflows");
  const commands = [];
  for (const path of listFiles(directory, (name) => /\.ya?ml$/.test(name))) {
    commands.push(...extractScriptCommands(readText(path)));
  }
  return sortedUnique(commands);
}

function discoverRegisteredFixtureEvidence(root) {
  const registryPath = join(root, "scripts", "audit-gate-selftests.mjs");
  if (!existsSync(registryPath)) return [];
  const source = readText(registryPath);
  const evidence = [];
  const entryPattern = /["']([^"']+\.(?:mjs|cjs))["']\s*:\s*\{\s*test:\s*["']([^"']+\.test\.mjs)["']/g;
  for (const match of source.matchAll(entryPattern)) {
    const tool = match[1];
    const testPath = match[2];
    const absoluteTest = resolve(root, ...testPath.split("/"));
    if (existsSync(absoluteTest) && readText(absoluteTest).includes(tool)) {
      evidence.push({ tool, test: testPath });
    }
  }
  return evidence.sort((a, b) => a.tool.localeCompare(b.tool));
}

export function discoverTooling(root) {
  const absoluteRoot = resolve(root);
  const errors = [];
  return {
    root: absoluteRoot,
    packages: discoverPackages(absoluteRoot, errors),
    tools: discoverTools(absoluteRoot),
    directPhaseClose: discoverPhaseCloseCommands(absoluteRoot),
    ciCommands: discoverCiCommands(absoluteRoot),
    externalTests: discoverRegisteredFixtureEvidence(absoluteRoot),
    errors,
  };
}

export function loadToolingPolicy(root) {
  const path = join(resolve(root), "governance", "tooling-policy.json");
  if (!existsSync(path)) {
    const error = new Error(`Tooling policy is missing: ${path}`);
    error.code = "TOOLING-POLICY-MISSING";
    throw error;
  }
  try {
    return readJson(path);
  } catch (cause) {
    const error = new Error(`Tooling policy is not valid JSON: ${cause.message}`);
    error.code = "TOOLING-POLICY-MALFORMED";
    throw error;
  }
}

function recordIsExact(record, keys) {
  if (!isPlainObject(record)) return false;
  const actualKeys = Object.keys(record).sort();
  const expectedKeys = [...keys].sort();
  if (actualKeys.length !== expectedKeys.length
      || actualKeys.some((key, index) => key !== expectedKeys[index])) {
    return false;
  }
  return keys.every((key) =>
    typeof record[key] === "string" && record[key].trim() !== "");
}

function violation(code, subject, detail) {
  return { code, subject, detail };
}

export function validateToolingContract(inventory, policy) {
  const violations = [...(inventory.errors ?? [])];
  if (!isPlainObject(policy)) {
    return [violation(
      "TOOLING-POLICY-MALFORMED",
      "tooling-policy.json",
      "Policy root must be an object.",
    )];
  }

  const policyKeys = Object.keys(policy).sort();
  const expectedPolicyKeys = [...POLICY_KEYS].sort();
  if (policy.schemaVersion !== 1
      || policyKeys.length !== expectedPolicyKeys.length
      || policyKeys.some((key, index) => key !== expectedPolicyKeys[index])
      || !isPlainObject(policy.packageNoTest)
      || !isPlainObject(policy.toolExceptions)
      || !isPlainObject(policy.generators)) {
    violations.push(violation(
      "TOOLING-POLICY-MALFORMED",
      "tooling-policy.json",
      "Policy must use schemaVersion 1 and exact object fields.",
    ));
  }

  const packageExceptions = isPlainObject(policy.packageNoTest)
    ? policy.packageNoTest
    : {};
  const toolExceptions = isPlainObject(policy.toolExceptions)
    ? policy.toolExceptions
    : {};
  const packagesBySubject = new Map(
    inventory.packages.map((item) => [item.subject, item]),
  );

  for (const packageRecord of inventory.packages) {
    if (!packageRecord.registered) {
      violations.push(violation(
        "TOOLING-PACKAGE-UNREGISTERED",
        packageRecord.subject,
        `${packageRecord.path} exists but is absent from galerina.workspace.json.`,
      ));
    }
    if (!packageRecord.exists) {
      violations.push(violation(
        "TOOLING-PACKAGE-MISSING",
        packageRecord.subject,
        `${packageRecord.path}/package.json does not exist.`,
      ));
      continue;
    }
    if (packageRecord.packageJsonError !== null) {
      violations.push(violation(
        "TOOLING-PACKAGE-MALFORMED",
        packageRecord.subject,
        packageRecord.packageJsonError,
      ));
      continue;
    }
    if (packageRecord.testScript === null) {
      const exception = packageExceptions[packageRecord.subject];
      if (!recordIsExact(exception, PACKAGE_EXCEPTION_KEYS)) {
        violations.push(violation(
          "TOOLING-PACKAGE-NO-TEST",
          packageRecord.subject,
          "Registered package has no non-empty test script or valid exception.",
        ));
      }
    }
  }

  for (const [subject, exception] of Object.entries(packageExceptions)) {
    if (!recordIsExact(exception, PACKAGE_EXCEPTION_KEYS)) {
      violations.push(violation(
        "TOOLING-POLICY-MALFORMED",
        subject,
        "No-test exception must contain exact non-empty reason, owner, and reviewWhen fields.",
      ));
      continue;
    }
    const packageRecord = packagesBySubject.get(subject);
    if (!packageRecord
        || !packageRecord.registered
        || !packageRecord.exists
        || packageRecord.testScript !== null) {
      violations.push(violation(
        "TOOLING-POLICY-STALE",
        subject,
        "No-test exception does not dispose an existing registered package without tests.",
      ));
    }
  }

  const coveredTools = new Set([
    ...inventory.directPhaseClose,
    ...inventory.ciCommands,
    ...inventory.externalTests.map((entry) => entry.tool),
  ]);
  const toolsByName = new Map(
    inventory.tools.map((item) => [item.name, item]),
  );

  for (const tool of inventory.tools) {
    if (tool.category !== "audit" && tool.category !== "lint") continue;
    if (coveredTools.has(tool.name)) continue;
    const exception = toolExceptions[tool.name];
    if (!recordIsExact(exception, TOOL_EXCEPTION_KEYS)) {
      violations.push(violation(
        "TOOLING-AUDIT-UNCOVERED",
        tool.name,
        "Audit/lint has no phase-close command, CI command, registered fixture evidence, or valid exception.",
      ));
    }
  }

  for (const [subject, exception] of Object.entries(toolExceptions)) {
    if (!recordIsExact(exception, TOOL_EXCEPTION_KEYS)) {
      violations.push(violation(
        "TOOLING-POLICY-MALFORMED",
        subject,
        "Tool exception must contain exact non-empty class, reason, owner, and reviewWhen fields.",
      ));
      continue;
    }
    const tool = toolsByName.get(subject);
    if (!tool
        || (tool.category !== "audit" && tool.category !== "lint")
        || coveredTools.has(subject)) {
      violations.push(violation(
        "TOOLING-POLICY-STALE",
        subject,
        "Tool exception does not dispose a discovered uncovered audit/lint.",
      ));
    }
  }

  return violations.sort((a, b) =>
    a.code.localeCompare(b.code)
    || a.subject.localeCompare(b.subject)
    || a.detail.localeCompare(b.detail));
}

export function relativeToolingPath(root, path) {
  return relative(resolve(root), resolve(path)).split(sep).join("/");
}
