import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { isAbsolute, join, normalize, relative, resolve, sep } from "node:path";

const POLICY_PATH = "governance/tooling-policy.json";
const PROVENANCE_VALUES = new Set(["required", "embedded", "not-applicable"]);
const TIERS = new Set(["phase-close", "exhaustive"]);
const SKIP_DIRS = new Set([".git", ".myco", "node_modules"]);

function fail(code, detail, extra = {}) {
  return { ok: false, code, detail, unexpectedWrites: [], ...extra };
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalRelative(path, field) {
  if (
    typeof path !== "string" ||
    path.length === 0 ||
    path.includes("\\") ||
    isAbsolute(path) ||
    /^[A-Za-z]:/.test(path)
  ) {
    throw new Error(`${field} must contain canonical relative paths`);
  }
  const canonical = normalize(path).split(sep).join("/");
  if (
    canonical !== path ||
    canonical === "." ||
    canonical === ".." ||
    canonical.startsWith("../")
  ) {
    throw new Error(`${field} path '${path}' is non-canonical or escapes the root`);
  }
  return canonical;
}

function stringArray(value, field, allowEmpty = false) {
  if (
    !Array.isArray(value) ||
    (!allowEmpty && value.length === 0) ||
    !value.every((entry) => typeof entry === "string" && entry.length > 0)
  ) {
    throw new Error(`${field} must be ${allowEmpty ? "an" : "a non-empty"} string array`);
  }
  return [...value];
}

export function loadGeneratorPolicy(root, generator) {
  let policy;
  try {
    policy = JSON.parse(readFileSync(join(root, POLICY_PATH), "utf8"));
  } catch (error) {
    throw new Error(`generator policy is missing or unreadable: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isRecord(policy) || !isRecord(policy.generators)) {
    throw new Error("tooling policy generators must be an object");
  }
  const entry = policy.generators[generator];
  if (!isRecord(entry)) throw new Error(`generator '${generator}' is undeclared`);

  const allowedKeys = [
    "check",
    "generate",
    "inputs",
    "outputs",
    "provenance",
    "tier",
    "tracked",
  ];
  const keys = Object.keys(entry).sort();
  if (JSON.stringify(keys) !== JSON.stringify(allowedKeys)) {
    throw new Error(`generator '${generator}' has unknown or missing policy fields`);
  }
  const script = canonicalRelative(generator, "generator");
  const inputs = stringArray(entry.inputs, `${generator}.inputs`).map((path) =>
    canonicalRelative(path, `${generator}.inputs`));
  const outputs = stringArray(entry.outputs, `${generator}.outputs`).map((path) =>
    canonicalRelative(path, `${generator}.outputs`));
  const generate = stringArray(entry.generate, `${generator}.generate`);
  const check = stringArray(entry.check, `${generator}.check`);
  if (new Set(inputs).size !== inputs.length || new Set(outputs).size !== outputs.length) {
    throw new Error(`generator '${generator}' inputs/outputs must be unique`);
  }
  if (typeof entry.tracked !== "boolean") {
    throw new Error(`${generator}.tracked must be Boolean`);
  }
  if (!PROVENANCE_VALUES.has(entry.provenance)) {
    throw new Error(`${generator}.provenance is invalid`);
  }
  if (!TIERS.has(entry.tier)) throw new Error(`${generator}.tier is invalid`);
  if (!existsSync(join(root, script)) || !statSync(join(root, script)).isFile()) {
    throw new Error(`generator script does not exist: ${script}`);
  }
  for (const input of inputs) {
    if (!existsSync(join(root, input))) {
      throw new Error(`generator input does not exist: ${input}`);
    }
  }
  return {
    script,
    inputs: inputs.sort(),
    outputs: outputs.sort(),
    tracked: entry.tracked,
    generate,
    check,
    provenance: entry.provenance,
    tier: entry.tier,
  };
}

function walkFiles(root, directory = root, result = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      walkFiles(root, absolute, result);
    } else if (entry.isFile()) {
      result.push(relative(root, absolute).split(sep).join("/"));
    }
  }
  return result;
}

function snapshot(root) {
  const files = new Map();
  for (const path of walkFiles(root).sort()) {
    const metadata = statSync(join(root, path), { bigint: true });
    files.set(
      path,
      `${metadata.size}:${metadata.mtimeNs}:${metadata.ctimeNs}`,
    );
  }
  return files;
}

function changedPaths(before, after) {
  const paths = new Set([...before.keys(), ...after.keys()]);
  return [...paths]
    .filter((path) => before.get(path) !== after.get(path))
    .sort();
}

function runCommand(root, tokens) {
  const [command, ...args] = tokens;
  const executable = command === "node" ? process.execPath : command;
  const result = spawnSync(executable, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 600_000,
    env: { ...process.env, NODE_TEST_CONTEXT: undefined },
  });
  return {
    ok: !result.error && result.status === 0 && !result.signal,
    status: result.status,
    signal: result.signal,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  };
}

function semanticBytes(path, bytes) {
  if (!path.endsWith("/provenance.json") && path !== "provenance.json") {
    return bytes;
  }
  try {
    const parsed = JSON.parse(bytes.toString("utf8"));
    if (isRecord(parsed)) delete parsed.builtAt;
    return Buffer.from(JSON.stringify(parsed));
  } catch {
    return bytes;
  }
}

function outputState(root, outputs) {
  const state = new Map();
  for (const path of outputs) {
    if (!existsSync(join(root, path))) continue;
    state.set(path, semanticBytes(path, readFileSync(join(root, path))));
  }
  return state;
}

function equalOutputState(first, second) {
  if (first.size !== second.size) return false;
  for (const [path, bytes] of first) {
    const other = second.get(path);
    if (other === undefined || !bytes.equals(other)) return false;
  }
  return true;
}

function provenanceMissing(root, policy) {
  if (policy.provenance !== "required") return false;
  const sidecars = policy.outputs.filter((path) => path.endsWith("provenance.json"));
  if (sidecars.length === 0) return true;
  return sidecars.some((path) => {
    try {
      return !isRecord(JSON.parse(readFileSync(join(root, path), "utf8")));
    } catch {
      return true;
    }
  });
}

export async function verifyGenerator(rootPath, generator) {
  const root = resolve(rootPath);
  let policy;
  try {
    policy = loadGeneratorPolicy(root, generator);
  } catch (error) {
    return fail(
      "GENERATOR-POLICY-INVALID",
      error instanceof Error ? error.message : String(error),
    );
  }

  const before = snapshot(root);
  const firstRun = runCommand(root, policy.generate);
  if (!firstRun.ok) {
    return fail("GENERATOR-RUN-FAILED", firstRun.output);
  }
  const afterFirst = snapshot(root);
  const writes = changedPaths(before, afterFirst);
  const outputSet = new Set(policy.outputs);
  const unexpectedWrites = writes.filter((path) => !outputSet.has(path));
  if (unexpectedWrites.length > 0) {
    return fail(
      "GENERATOR-UNDECLARED-WRITE",
      `undeclared writes: ${unexpectedWrites.join(", ")}`,
      { unexpectedWrites },
    );
  }
  if (provenanceMissing(root, policy)) {
    return fail(
      "GENERATOR-PROVENANCE-MISSING",
      "tracked generator output lacks required provenance",
    );
  }
  const missingOutputs = policy.outputs.filter((path) => !existsSync(join(root, path)));
  if (missingOutputs.length > 0) {
    return fail(
      "GENERATOR-OUTPUT-MISSING",
      `declared outputs missing: ${missingOutputs.join(", ")}`,
      { missingOutputs },
    );
  }

  const firstOutputs = outputState(root, policy.outputs);
  const secondRun = runCommand(root, policy.generate);
  if (!secondRun.ok) {
    return fail("GENERATOR-RUN-FAILED", secondRun.output);
  }
  const secondOutputs = outputState(root, policy.outputs);
  if (!equalOutputState(firstOutputs, secondOutputs)) {
    return fail(
      "GENERATOR-NONDETERMINISTIC",
      "second generation changed semantic output bytes",
    );
  }

  const beforeCheck = snapshot(root);
  const checkRun = runCommand(root, policy.check);
  if (!checkRun.ok) {
    return fail("GENERATOR-CHECK-FAILED", checkRun.output);
  }
  const checkWrites = changedPaths(beforeCheck, snapshot(root));
  if (checkWrites.length > 0) {
    return fail(
      "GENERATOR-CHECK-MUTATED",
      `check command wrote files: ${checkWrites.join(", ")}`,
      { unexpectedWrites: checkWrites },
    );
  }
  return {
    ok: true,
    code: "GENERATOR-CONTRACT-PASS",
    detail: "declared writes, provenance, idempotence, and check mode verified",
    unexpectedWrites: [],
  };
}
