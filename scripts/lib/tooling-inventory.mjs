import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { basename, join, relative, resolve, sep } from "node:path";
import { isValidatedAssuranceEntry } from "./assurance-fabric/manifest.mjs";
import { validateAssuranceManifest } from "./assurance-fabric/manifest.mjs";
import { parseStrictJsonBytes } from "./assurance-fabric/strict-json.mjs";

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

function discoverMetaGateEvidence(root, tools, registeredEvidence) {
  const meta = registeredEvidence.find((entry) =>
    entry.tool === "audit-gate-selftests.mjs");
  if (!meta) return [];

  const metaPath = join(root, "scripts", "audit-gate-selftests.mjs");
  const metaTestPath = resolve(root, ...meta.test.split("/"));
  if (!existsSync(metaPath) || !existsSync(metaTestPath)) return [];
  const source = readText(metaPath);
  const testSource = readText(metaTestPath);

  // Credit transitive self-test execution only while the meta-gate itself is
  // fixture-proven AND missing/vacuous proofs are blocking. A source string
  // alone never disposes a tool; losing either fail-closed arm drops every
  // transitive credit and makes the tooling contract red.
  const missingBlocks =
    /status:\s*"NO_SELFTEST",\s*violation:\s*true/.test(source);
  const vacuousBlocks =
    /status:\s*"SELFTEST_VACUOUS",\s*violation:\s*true/.test(source);
  const cadenceAssertsZero =
    testSource.includes("ZERO audit/lint proofs are missing, broken, or vacuous");
  if (!missingBlocks || !vacuousBlocks || !cadenceAssertsZero) return [];

  const alreadyRegistered = new Set(
    registeredEvidence.map((entry) => entry.tool),
  );
  const evidence = [];
  for (const tool of tools) {
    if (tool.category !== "audit" && tool.category !== "lint") continue;
    if (alreadyRegistered.has(tool.name)) continue;
    const toolSource = readText(tool.path);
    const declaresSelfTest =
      toolSource.includes('"--self-test"')
      || toolSource.includes("'--self-test'");
    if (declaresSelfTest) {
      evidence.push({
        tool: tool.name,
        test: meta.test,
        via: "audit-gate-selftests.mjs",
      });
    }
  }
  return evidence.sort((a, b) => a.tool.localeCompare(b.tool));
}

export function discoverTooling(root) {
  const absoluteRoot = resolve(root);
  const errors = [];
  const tools = discoverTools(absoluteRoot);
  const registeredEvidence =
    discoverRegisteredFixtureEvidence(absoluteRoot);
  const metaGateEvidence =
    discoverMetaGateEvidence(absoluteRoot, tools, registeredEvidence);
  return {
    root: absoluteRoot,
    packages: discoverPackages(absoluteRoot, errors),
    tools,
    directPhaseClose: [],
    ciCommands: discoverCiCommands(absoluteRoot),
    externalTests: [...registeredEvidence, ...metaGateEvidence]
      .sort((a, b) => a.tool.localeCompare(b.tool)),
    errors,
  };
}

export function loadAssuranceManifest(root) {
  const absoluteRoot = resolve(root);
  const path = join(absoluteRoot, "governance", "phase-close-commands.json");
  const bytes = readFileSync(path);
  const value = parseStrictJsonBytes(bytes, {
    label: "governance/phase-close-commands.json",
    maxBytes: 67_108_864,
  });
  const admitted = validateAssuranceManifest(value, absoluteRoot);
  if (admitted.kind !== "accepted") {
    const error = new Error(`${admitted.code}: ${admitted.detail}`);
    error.code = admitted.code;
    throw error;
  }
  return admitted.value;
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

  const cadenceRecords = Array.isArray(inventory.cadenceCoverage) ? inventory.cadenceCoverage : [];
  const coveredTools = new Set([
    ...cadenceRecords
      .filter((record) => record.disposition !== "on-demand")
      .map((record) => record.tool),
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

function manifestToolName(entry) {
  if (entry.execution.kind !== "process") return undefined;
  const token = entry.execution.command.find((item) =>
    /^scripts\/[A-Za-z0-9_.-]+\.(?:mjs|cjs)$/u.test(item));
  return token === undefined ? undefined : token.slice("scripts/".length);
}

function ordinal(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function exactException(policy, toolName) {
  const value = isPlainObject(policy?.toolExceptions)
    ? policy.toolExceptions[toolName]
    : undefined;
  return recordIsExact(value, TOOL_EXCEPTION_KEYS);
}

export function deriveCadenceCoverage(inventory, manifest, policy) {
  try {
    if (!inventory || !Array.isArray(inventory.tools)
        || !manifest || !Array.isArray(manifest.entries)
        || !manifest.entries.every(isValidatedAssuranceEntry)) {
      throw new Error("an exact tooling inventory and accepted manifest are required");
    }
    const toolsByName = new Map(inventory.tools.map((tool) => [tool.name, tool]));
    if (toolsByName.size !== inventory.tools.length) throw new Error("tool inventory contains duplicate identities");
    const facts = new Map(inventory.tools.map((tool) => [tool.name, {
      tool: tool.name,
      directEntryIds: new Set(),
      transitiveEntryIds: new Set(),
      via: [],
      cadences: new Set(),
      lifecycle: new Set(),
      legacy: false,
    }]));

    for (const entry of manifest.entries) {
      const directName = manifestToolName(entry);
      if (directName === undefined) continue;
      const direct = facts.get(directName);
      if (!direct) throw new Error(`${entry.id} names missing or non-regular tool scripts/${directName}`);
      direct.directEntryIds.add(entry.id);
      for (const cadence of entry.cadences) direct.cadences.add(cadence);
      direct.lifecycle.add(entry.lifecycle.retirement);
      if (entry.toolClass === "legacy-oracle") direct.legacy = true;
      for (const nestedPath of entry.nestedTools) {
        const nestedName = nestedPath.slice("scripts/".length);
        const nested = facts.get(nestedName);
        if (!nested) throw new Error(`${entry.id} names missing or non-regular nested tool ${nestedPath}`);
        nested.transitiveEntryIds.add(entry.id);
        for (const cadence of entry.cadences) nested.cadences.add(cadence);
        nested.lifecycle.add(entry.lifecycle.retirement);
        nested.via.push([entry.id, directName, nestedName]);
      }
    }

    const external = new Set((inventory.externalTests ?? []).map((item) => item.tool));
    const ci = new Set(inventory.ciCommands ?? []);
    const violations = [];
    const records = [...facts.values()].map((fact) => {
      if (fact.lifecycle.size > 1) throw new Error(`${fact.tool} has conflicting lifecycle custody`);
      const scheduled = fact.directEntryIds.size > 0 || fact.transitiveEntryIds.size > 0 || ci.has(fact.tool);
      let disposition;
      if (fact.legacy) disposition = "legacy-active";
      else if (scheduled) disposition = "scheduled";
      else if (external.has(fact.tool)) disposition = "self-test-transitive";
      else if (exactException(policy, fact.tool)) disposition = "exception";
      else disposition = "on-demand";
      const source = toolsByName.get(fact.tool);
      if ((source.category === "audit" || source.category === "lint")
          && disposition === "on-demand") {
        violations.push(violation(
          "TOOLING-AUDIT-UNCOVERED",
          fact.tool,
          "Audit/lint has no manifest-derived disposition, CI custody, fixture evidence, or exact exception.",
        ));
      }
      const viaKeys = new Set();
      const via = fact.via
        .filter((route) => {
          const key = JSON.stringify(route);
          if (viaKeys.has(key)) return false;
          viaKeys.add(key);
          return true;
        })
        .sort((left, right) => ordinal(JSON.stringify(left), JSON.stringify(right)));
      return Object.freeze({
        tool: fact.tool,
        directEntryIds: Object.freeze([...fact.directEntryIds].sort(ordinal)),
        transitiveEntryIds: Object.freeze([...fact.transitiveEntryIds].sort(ordinal)),
        via: Object.freeze(via.map((route) => Object.freeze(route))),
        cadences: Object.freeze([...fact.cadences].sort(ordinal)),
        lifecycle: fact.lifecycle.size === 1 ? [...fact.lifecycle][0] : "not-applicable",
        disposition,
      });
    }).sort((left, right) => ordinal(left.tool, right.tool));

    const legacyConsumers = manifest.entries
      .filter((entry) => entry.toolClass === "legacy-oracle")
      .map((entry) => Object.freeze({ controlId: entry.id, consumerIds: Object.freeze([entry.id]) }))
      .sort((left, right) => ordinal(left.controlId, right.controlId));
    return Object.freeze({
      kind: "accepted",
      records: Object.freeze(records),
      legacyConsumers: Object.freeze(legacyConsumers),
      violations: Object.freeze(violations.sort((left, right) =>
        ordinal(left.code, right.code) || ordinal(left.subject, right.subject))),
      authorizing: false,
    });
  } catch (error) {
    return Object.freeze({
      kind: "refused",
      code: "TOOLING-CADENCE-COVERAGE-REFUSED",
      detail: error instanceof Error ? error.message : "cadence coverage refused an unclassified input",
      authorizing: false,
    });
  }
}
