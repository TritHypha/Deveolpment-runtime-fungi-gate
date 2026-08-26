#!/usr/bin/env node
// Complete, build-current package test runner for the Galerina workspace.
// Unknown, missing, empty, signalled, timed-out, or uncountable results refuse.

"use strict";

const { createHash } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const {
  acquireSuiteLease,
  admitInheritedSuiteLease,
} = require("./lib/suite-run-lease.cjs");
const {
  npmTestInvocation,
  parsePackageConcurrency,
  parseTestConcurrency,
} = require("./lib/test-runner-policy.cjs");
const { runOwnedProcess } = require("./lib/owned-process-tree.cjs");

const DEFAULT_ROOT = path.join(__dirname, "..");
const CORE = Object.freeze([
  "galerina-devtools-graph-algorithms",
  "galerina-core-economics",
  "galerina-core-compiler",
  "galerina-core-security",
]);
const RUN_FIRST = new Set(["galerina-core-compiler"]);
const RUN_LAST = new Set(["galerina-devtools-graph-project"]);
const TIMEOUT_MS = 600_000;
const MAX_DIAGNOSTIC_LINES = 32;
const MAX_DIAGNOSTIC_LINE_LENGTH = 1024;

function refuseToolchain(detail) {
  return Object.assign(new Error(detail), { code: "TEST-TOOLCHAIN-REFUSED" });
}

function readJsonFile(absolutePath, locator) {
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    throw refuseToolchain(`${locator} is missing or malformed: ${error.message}`);
  }
}

function isContained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== ""
    && !relative.startsWith(`..${path.sep}`)
    && relative !== ".."
    && !path.isAbsolute(relative);
}

function usesBareTypeScriptCompiler(scripts) {
  return Object.values(scripts || {}).some((script) =>
    typeof script === "string"
    && script.split(/&&|\|\||;/u).some((segment) => /^\s*tsc(?:\s|$)/u.test(segment)));
}

function packageNeedsTypeScriptFallback(record) {
  const localCompiler = path.join(
    record.absolutePath,
    "node_modules",
    "typescript",
    "bin",
    "tsc",
  );
  if (fs.existsSync(localCompiler)) return false;
  const manifest = readJsonFile(
    path.join(record.absolutePath, "package.json"),
    `${record.path}/package.json`,
  );
  return usesBareTypeScriptCompiler(manifest.scripts);
}

function lockedTypeScriptVersion(packageDirectory, locator) {
  const lock = readJsonFile(
    path.join(packageDirectory, "package-lock.json"),
    `${locator}/package-lock.json`,
  );
  const version = lock.packages?.["node_modules/typescript"]?.version;
  if (typeof version !== "string" || version.length === 0) {
    throw refuseToolchain(
      `${locator}/package-lock.json does not bind node_modules/typescript.version.`,
    );
  }
  return version;
}

function shellQuote(value) {
  return `'${value.replace(/'/gu, `'"'"'`)}'`;
}

function createTypeScriptShim(compilerPath) {
  const tempRoot = path.resolve(os.tmpdir());
  const prefix = path.join(tempRoot, "galerina-tsc-");
  const shimDirectory = fs.mkdtempSync(prefix);
  if (path.dirname(shimDirectory) !== tempRoot
      || !path.basename(shimDirectory).startsWith("galerina-tsc-")) {
    throw refuseToolchain("The private TypeScript shim directory escaped the admitted temp root.");
  }
  try {
    if (process.platform === "win32") {
      if (/[\r\n%"]/u.test(process.execPath) || /[\r\n%"]/u.test(compilerPath)) {
        throw refuseToolchain("The admitted TypeScript launcher contains unsafe command characters.");
      }
      fs.writeFileSync(
        path.join(shimDirectory, "tsc.cmd"),
        `@echo off\r\n"${process.execPath}" "${compilerPath}" %*\r\n`,
        { encoding: "utf8", mode: 0o700 },
      );
    } else {
      fs.writeFileSync(
        path.join(shimDirectory, "tsc"),
        `#!/bin/sh\nexec ${shellQuote(process.execPath)} ${shellQuote(compilerPath)} "$@"\n`,
        { encoding: "utf8", mode: 0o700 },
      );
    }
  } catch (error) {
    fs.rmSync(shimDirectory, { recursive: true, force: true });
    throw error;
  }
  return {
    directory: shimDirectory,
    release() {
      const resolved = path.resolve(shimDirectory);
      if (path.dirname(resolved) !== tempRoot
          || !path.basename(resolved).startsWith("galerina-tsc-")) {
        throw refuseToolchain("Private TypeScript shim cleanup target is outside its admitted root.");
      }
      fs.rmSync(resolved, { recursive: true, force: true });
    },
  };
}

function prepareTypeScriptFallback(root, selection) {
  const required = selection.filter(packageNeedsTypeScriptFallback);
  if (required.length === 0) return null;

  const absoluteRoot = fs.realpathSync(root);
  const compilerDirectory = path.join(
    absoluteRoot,
    "packages-ts",
    "galerina-core-compiler",
  );
  const installedDirectory = path.join(compilerDirectory, "node_modules", "typescript");
  const compilerPath = path.join(installedDirectory, "bin", "tsc");
  let realInstalledDirectory;
  let realCompilerPath;
  try {
    realInstalledDirectory = fs.realpathSync(installedDirectory);
    realCompilerPath = fs.realpathSync(compilerPath);
  } catch (error) {
    throw refuseToolchain(
      `packages-ts/galerina-core-compiler/node_modules/typescript is unavailable: ${error.message}`,
    );
  }
  if (!isContained(absoluteRoot, realInstalledDirectory)
      || !isContained(realInstalledDirectory, realCompilerPath)
      || !fs.statSync(realCompilerPath).isFile()) {
    throw refuseToolchain("The canonical TypeScript launcher escaped its admitted package root.");
  }

  const installedManifest = readJsonFile(
    path.join(realInstalledDirectory, "package.json"),
    "packages-ts/galerina-core-compiler/node_modules/typescript/package.json",
  );
  const canonicalVersion = lockedTypeScriptVersion(
    compilerDirectory,
    "packages-ts/galerina-core-compiler",
  );
  if (installedManifest.name !== "typescript"
      || installedManifest.version !== canonicalVersion) {
    throw refuseToolchain(
      "The installed canonical TypeScript identity does not match the core-compiler lockfile.",
    );
  }
  for (const record of required) {
    const lockedVersion = lockedTypeScriptVersion(record.absolutePath, record.path);
    if (lockedVersion !== canonicalVersion) {
      throw refuseToolchain(
        `${record.path}/package-lock.json binds TypeScript ${lockedVersion}, not ${canonicalVersion}.`,
      );
    }
  }

  const shim = createTypeScriptShim(realCompilerPath);
  return Object.freeze({
    binDirectory: shim.directory,
    version: canonicalVersion,
    packages: Object.freeze(required.map((record) => record.subject)),
    release: shim.release,
  });
}

function prependPath(environment, directory) {
  const key = Object.keys(environment).find((candidate) => candidate.toLowerCase() === "path")
    || "PATH";
  environment[key] = `${directory}${path.delimiter}${environment[key] || ""}`;
}

function failureEvidence(child, output) {
  const diagnosticLines = output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => /not ok|Error:|fail \d/iu.test(line))
    .slice(0, MAX_DIAGNOSTIC_LINES)
    .map((line) => line.slice(0, MAX_DIAGNOSTIC_LINE_LENGTH));
  return Object.freeze({
    schemaVersion: 1,
    exitCode: typeof child.status === "number" ? child.status : null,
    signal: child.signal ?? null,
    outputBytes: Buffer.byteLength(output, "utf8"),
    outputSha256: createHash("sha256").update(output, "utf8").digest("hex"),
    diagnosticLines,
  });
}

function parseArguments(argv) {
  const options = {
    root: DEFAULT_ROOT,
    json: false,
    list: false,
    core: false,
    bail: false,
    emitCounts: false,
    testConcurrency: parseTestConcurrency(undefined),
    packageConcurrency: parsePackageConcurrency(undefined),
    named: [],
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--root requires a workspace path");
      }
      options.root = path.resolve(value);
      index += 1;
    } else if (argument === "--json") {
      options.json = true;
    } else if (argument === "--list") {
      options.list = true;
    } else if (argument === "--core") {
      options.core = true;
    } else if (argument === "--bail") {
      options.bail = true;
    } else if (argument === "--emit-counts") {
      options.emitCounts = true;
    } else if (argument === "--test-concurrency") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error("--test-concurrency requires an integer from one through four");
      }
      options.testConcurrency = parseTestConcurrency(value);
      index += 1;
    } else if (argument === "--package-concurrency") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error("--package-concurrency requires one or two");
      }
      options.packageConcurrency = parsePackageConcurrency(value);
      index += 1;
    } else if (argument.startsWith("--")) {
      throw new Error(`Unknown option: ${argument}`);
    } else {
      options.named.push(argument);
    }
  }
  if (options.core && options.named.length > 0) {
    throw new Error("--core cannot be combined with named packages");
  }
  return options;
}

function parseCounts(output) {
  function value(label) {
    const match = output.match(
      new RegExp(
        `(?:^|\\n)\\s*[^A-Za-z0-9\\r\\n]*${label}\\s+(\\d+)\\s*(?:\\r?$|\\n)`,
      ),
    );
    return match ? Number(match[1]) : null;
  }
  return {
    tests: value("tests"),
    pass: value("pass"),
    fail: value("fail"),
  };
}

async function runNpmTest(directory, testScript, testConcurrency, toolchainBinDirectory) {
  const childEnv = { ...process.env };
  // A runner invoked by node:test must start a new top-level test process.
  // Inheriting this marker makes Node treat the package suite as recursive
  // and silently skip every file.
  delete childEnv.NODE_TEST_CONTEXT;
  delete childEnv.GALERINA_SUITE_LEASE_NONCE;
  delete childEnv.GALERINA_SUITE_LEASE_ROOT_ID;
  delete childEnv.GALERINA_SUITE_LEASE_OWNER_PID;
  delete childEnv.GALERINA_SUITE_LEASE_MEDIATOR_PID;
  if (toolchainBinDirectory !== null) prependPath(childEnv, toolchainBinDirectory);
  const common = {
    cwd: directory,
    env: childEnv,
    timeoutMs: TIMEOUT_MS,
    maxOutputBytes: 64 * 1024 * 1024,
    windowsHide: true,
  };
  const invocation = npmTestInvocation({
    platform: process.platform,
    commandShell: process.env.ComSpec,
    testScript,
    concurrency: testConcurrency,
  });
  const owned = await runOwnedProcess({
    command: invocation.command,
    args: invocation.args,
    ...common,
  });
  let error;
  if (owned.spawnError !== null) {
    error = Object.assign(new Error(owned.spawnError.message), {
      code: owned.spawnError.code,
    });
  } else if (owned.outputLimitExceeded) {
    error = Object.assign(new Error("Owned process exceeded its bounded output limit."), {
      code: "OWNED-PROCESS-OUTPUT-LIMIT",
    });
  } else if (owned.timedOut) {
    error = Object.assign(
      new Error(owned.cleanupDetail),
      { code: owned.cleanupAcknowledged ? "ETIMEDOUT" : "OWNED-PROCESS-TREE-CLEANUP-REFUSED" },
    );
  } else if (owned.cleanupAttempted && !owned.cleanupAcknowledged) {
    error = Object.assign(new Error(owned.cleanupDetail), {
      code: "OWNED-PROCESS-TREE-CLEANUP-REFUSED",
    });
  }
  return {
    child: {
      status: owned.status,
      signal: owned.signal,
      stdout: owned.stdout,
      stderr: owned.stderr,
      ...(error ? { error } : {}),
      owned,
    },
    boundedNodeTest: invocation.boundedNodeTest,
  };
}

function failureFor(child, counts) {
  if (child.error?.code === "ETIMEDOUT") {
    return ["TEST-TIMEOUT", `Package test exceeded ${TIMEOUT_MS}ms.`];
  }
  if (child.error?.code === "OWNED-PROCESS-TREE-CLEANUP-REFUSED") {
    return ["TEST-TREE-CLEANUP-REFUSED", child.error.message];
  }
  if (child.error) {
    return ["TEST-SPAWN-ERROR", child.error.message];
  }
  if (child.signal) {
    return ["TEST-SIGNALLED", `Package test ended by signal ${child.signal}.`];
  }
  if (child.status === null) {
    return ["TEST-STATUS-UNKNOWN", "Package test returned no numeric exit status."];
  }
  if (child.status !== 0) {
    return ["TEST-CHILD-FAILED", `Package test exited ${child.status}.`];
  }
  if (counts.tests === null || counts.pass === null || counts.fail === null) {
    return [
      "TEST-SUMMARY-UNPARSEABLE",
      "Exit zero did not include tests/pass/fail counters.",
    ];
  }
  if (counts.tests === 0) {
    return ["TEST-SUMMARY-EMPTY", "A zero-test suite is not evidence."];
  }
  if (counts.fail !== 0
      || counts.pass !== counts.tests) {
    return [
      "TEST-SUMMARY-MISMATCH",
      `Expected tests=pass and fail=0; observed ${counts.tests}/${counts.pass}/${counts.fail}.`,
    ];
  }
  return null;
}

async function runPackage(record, testConcurrency, toolchainBinDirectory) {
  const started = Date.now();
  process.stderr.write(
    `[run-all-tests] START ${record.subject} (test-file ceiling ${testConcurrency})\n`,
  );
  const invocation = await runNpmTest(
    record.absolutePath,
    record.testScript,
    testConcurrency,
    toolchainBinDirectory,
  );
  const child = invocation.child;
  const durationMs = Date.now() - started;
  const output = `${child.stdout || ""}\n${child.stderr || ""}`;
  const counts = parseCounts(output);
  const failure = failureFor(child, counts);
  const result = {
    package: record.subject,
    status: failure === null ? "pass" : "fail",
    exitCode: typeof child.status === "number" ? child.status : 1,
    tests: counts.tests,
    pass: counts.pass,
    fail: counts.fail,
    built: child.error === undefined && child.status !== null,
    boundedNodeTest: invocation.boundedNodeTest,
    processControl: {
      ownedTree: child.owned !== null && child.owned.spawnError === null,
      cleanupAttempted: child.owned?.cleanupAttempted === true,
    },
    durationMs,
    ...(failure === null
      ? {}
      : {
        failureCode: failure[0],
        detail: failure[1],
        failureEvidence: failureEvidence(child, output),
      }),
    _output: output,
  };
  process.stderr.write(
    `[run-all-tests] END ${record.subject} (${result.status}, ${(durationMs / 1000).toFixed(1)}s)\n`,
  );
  return result;
}

async function runPackageGroup(records, options) {
  if (records.length === 0) return [];
  const results = new Array(records.length);
  let nextIndex = 0;
  let refusedNewWork = false;
  const workerCount = Math.min(options.packageConcurrency, records.length);

  async function worker() {
    while (true) {
      if (refusedNewWork) return;
      const index = nextIndex;
      nextIndex += 1;
      if (index >= records.length) return;
      const result = await runPackage(
        records[index],
        options.testConcurrency,
        options.toolchainBinDirectory,
      );
      results[index] = result;
      if (options.bail && result.status === "fail") refusedNewWork = true;
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results.filter((result) => result !== undefined);
}

function testScriptEscapesPackage(record) {
  return /(?:^|[\s"'])\.\.[\\/]/.test(record.testScript);
}

function stablePackageRecords(inventory, policy, options) {
  const exceptions = new Set(Object.keys(policy.packageNoTest || {}));
  const runnable = inventory.packages.filter((record) =>
    record.registered
    && record.exists
    && record.packageJsonError === null
    && record.testScript !== null
    && !exceptions.has(record.subject));
  const byName = new Map();
  for (const record of runnable) {
    byName.set(record.subject, record);
    byName.set(path.basename(record.path), record);
  }

  let selected;
  if (options.named.length > 0) {
    selected = options.named.map((name) => {
      const record = byName.get(name);
      if (!record) throw new Error(`Unknown or non-runnable package: ${name}`);
      return record;
    });
  } else if (options.core) {
    selected = CORE.map((name) => {
      const record = byName.get(name);
      if (!record) throw new Error(`Core package is missing or non-runnable: ${name}`);
      return record;
    });
  } else {
    selected = runnable;
  }

  const unique = [...new Map(
    selected.map((record) => [record.subject, record]),
  ).values()];
  return unique.sort((left, right) => {
    const leftLast = RUN_LAST.has(left.subject);
    const rightLast = RUN_LAST.has(right.subject);
    if (leftLast !== rightLast) return leftLast ? 1 : -1;
    return left.subject.localeCompare(right.subject);
  });
}

function packageContractViolations(violations) {
  return violations.filter((item) =>
    item.code.startsWith("TOOLING-PACKAGE")
    || item.code.startsWith("TOOLING-WORKSPACE")
    || item.code === "TOOLING-POLICY-MALFORMED"
    || item.code === "TOOLING-POLICY-MISSING");
}

function writeCanonicalCounts(root, results) {
  const versionPath = path.join(root, "version.json");
  if (!fs.existsSync(versionPath)) return {
    ok: false,
    detail: `version.json is missing: ${versionPath}`,
  };
  let current;
  try {
    current = JSON.parse(fs.readFileSync(versionPath, "utf8"));
  } catch (error) {
    return { ok: false, detail: `version.json is malformed: ${error.message}` };
  }
  const perPackage = {};
  for (const result of [...results].sort((a, b) =>
    a.package.localeCompare(b.package))) {
    perPackage[result.package] = result.tests;
  }
  const total = results.reduce((sum, result) => sum + result.tests, 0);
  const today = new Date().toISOString().slice(0, 10);
  const next = {
    ...current,
    testCount: total,
    packageCount: results.length,
    packageCountNote:
      `Derived from the complete governed package inventory: `
      + `${results.length}/${results.length} test-bearing packages passed `
      + `their declared build-current test chains; see testCountByPackage.`,
    testCountByPackage: perPackage,
    testCountNote:
      `${today} auto-generated by scripts/run-all-tests.cjs --emit-counts: `
      + `${results.length}/${results.length} packages, `
      + `${total.toLocaleString("en-US")} tests, 0 fail`
      + (typeof perPackage["galerina-core-compiler"] === "number"
        ? ` (compiler ${perPackage["galerina-core-compiler"].toLocaleString("en-US")}).`
        : "."),
  };
  fs.writeFileSync(versionPath, `${JSON.stringify(next, null, 2)}\n`);
  return { ok: true, path: versionPath };
}

function publicResult(result) {
  const { _output, ...visible } = result;
  return visible;
}

function humanReport(report, results) {
  process.stdout.write(
    `Galerina root test runner — ${report.scope}: `
    + `${report.totals.selected} package(s)\n\n`,
  );
  for (const result of results) {
    if (result.status === "pass") {
      process.stdout.write(
        `✅ ${result.package}: ${result.tests} tests `
        + `(${(result.durationMs / 1000).toFixed(1)}s)\n`,
      );
    } else {
      process.stdout.write(
        `❌ ${result.package}: ${result.failureCode} — ${result.detail}\n`,
      );
      for (const line of result._output
        .split(/\r?\n/)
        .filter((candidate) => /not ok|Error:|fail \d/i.test(candidate))
        .slice(0, 8)) {
        process.stdout.write(`   ${line.trim()}\n`);
      }
    }
  }
  process.stdout.write(
    `\n${report.totals.passed}/${report.totals.executed} packages passed`
    + ` · ${report.totals.tests} tests total\n`,
  );
}

async function main() {
  const suiteStarted = Date.now();
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`run-all-tests: ${error.message}\n`);
    process.exit(3);
  }

  let suiteLease;
  try {
    const hasInheritedLease =
      Object.hasOwn(process.env, "GALERINA_SUITE_LEASE_NONCE")
      || Object.hasOwn(process.env, "GALERINA_SUITE_LEASE_ROOT_ID");
    suiteLease = hasInheritedLease
      ? admitInheritedSuiteLease({
        root: options.root,
        expectedCommandClass: "phase-close",
      })
      : acquireSuiteLease({ root: options.root, commandClass: "all-tests" });
  } catch (error) {
    const report = {
      tool: "run-all-tests",
      schemaVersion: 1,
      ok: false,
      root: options.root,
      violations: [{
        code: error.code || "SUITE-LEASE-REFUSED",
        detail: error.message,
      }],
      results: [],
    };
    if (options.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    else process.stderr.write(`run-all-tests: ${report.violations[0].code} — ${error.message}\n`);
    process.exit(1);
  }
  if (!suiteLease.inherited) {
    process.once("exit", () => { suiteLease.release(); });
  }

  const inventoryModule = await import(pathToFileURL(
    path.join(__dirname, "lib", "tooling-inventory.mjs"),
  ).href);
  let inventory;
  let policy;
  let contractViolations;
  try {
    inventory = inventoryModule.discoverTooling(options.root);
    policy = inventoryModule.loadToolingPolicy(options.root);
    contractViolations = packageContractViolations(
      inventoryModule.validateToolingContract(inventory, policy),
    );
  } catch (error) {
    const report = {
      tool: "run-all-tests",
      schemaVersion: 1,
      ok: false,
      root: options.root,
      violations: [{
        code: error.code || "TEST-INVENTORY-ERROR",
        detail: error.message,
      }],
      results: [],
    };
    if (options.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    else process.stderr.write(`run-all-tests: ${error.message}\n`);
    process.exit(1);
  }

  if (contractViolations.length > 0) {
    const report = {
      tool: "run-all-tests",
      schemaVersion: 1,
      ok: false,
      root: options.root,
      violations: contractViolations,
      results: [],
    };
    if (options.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    else {
      for (const item of contractViolations) {
        process.stderr.write(`${item.code} ${item.subject}: ${item.detail}\n`);
      }
    }
    process.exit(1);
  }

  let selection;
  try {
    selection = stablePackageRecords(inventory, policy, options);
  } catch (error) {
    process.stderr.write(`run-all-tests: ${error.message}\n`);
    process.exit(3);
  }

  if (options.list) {
    if (options.json) {
      process.stdout.write(`${JSON.stringify({
        tool: "run-all-tests",
        schemaVersion: 1,
        root: options.root,
        controls: {
          testConcurrency: options.testConcurrency,
          packageConcurrency: options.packageConcurrency,
          processIsolation: "process",
        },
        packages: selection.map((record) => record.subject),
      }, null, 2)}\n`);
    } else {
      process.stdout.write(`Test-bearing packages (${selection.length}):\n`);
      for (const record of selection) {
        process.stdout.write(`  ${record.subject}\n`);
      }
    }
    process.exit(0);
  }

  let typeScriptFallback;
  try {
    typeScriptFallback = prepareTypeScriptFallback(options.root, selection);
  } catch (error) {
    const report = {
      tool: "run-all-tests",
      schemaVersion: 1,
      ok: false,
      root: options.root,
      violations: [{
        code: error.code || "TEST-TOOLCHAIN-REFUSED",
        detail: error.message,
      }],
      results: [],
    };
    if (options.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    else process.stderr.write(`${report.violations[0].code}: ${error.message}\n`);
    process.exit(1);
  }

  const runFirstRecords = selection.filter((record) => RUN_FIRST.has(record.subject));
  const serialRecords = selection.filter((record) =>
    !RUN_FIRST.has(record.subject)
    && !RUN_LAST.has(record.subject)
    && testScriptEscapesPackage(record));
  const parallelRecords = selection.filter((record) =>
    !RUN_FIRST.has(record.subject)
    && !RUN_LAST.has(record.subject)
    && !testScriptEscapesPackage(record));
  const runLastRecords = selection.filter((record) => RUN_LAST.has(record.subject));
  const executed = [];
  const isolatedGroups = [runFirstRecords, parallelRecords, serialRecords, runLastRecords];
  let toolchainCleanupViolation = null;
  try {
    for (const group of isolatedGroups) {
      if (options.bail && executed.some((result) => result.status === "fail")) break;
      executed.push(...await runPackageGroup(group, {
        ...options,
        toolchainBinDirectory: typeScriptFallback?.binDirectory ?? null,
        packageConcurrency: group === parallelRecords ? options.packageConcurrency : 1,
      }));
    }
  } finally {
    if (typeScriptFallback !== null) {
      try {
        typeScriptFallback.release();
      } catch (error) {
        toolchainCleanupViolation = {
          code: error.code || "TEST-TOOLCHAIN-REFUSED",
          detail: error.message,
        };
      }
    }
  }
  const resultByPackage = new Map(executed.map((result) => [result.package, result]));
  const results = selection
    .map((record) => resultByPackage.get(record.subject))
    .filter((result) => result !== undefined);
  const visibleResults = results.map(publicResult);
  const passed = results.filter((result) => result.status === "pass").length;
  const failed = results.length - passed;
  const totalTests = results.reduce(
    (sum, result) => sum + (result.status === "pass" ? result.tests : 0),
    0,
  );
  const complete = failed === 0
    && results.length === selection.length
    && toolchainCleanupViolation === null;
  const scope = options.named.length > 0
    ? "named"
    : options.core
      ? "core"
      : "all";
  let countWrite = null;
  if (options.emitCounts) {
    if (scope !== "all" || !complete) {
      countWrite = {
        ok: false,
        detail: "Canonical counts require a complete successful full run.",
      };
    } else {
      countWrite = writeCanonicalCounts(options.root, visibleResults);
    }
  }
  const ok = complete && (countWrite === null || countWrite.ok);
  const report = {
    tool: "run-all-tests",
    schemaVersion: 1,
    ok,
    root: options.root,
    scope,
    durationMs: Date.now() - suiteStarted,
    controls: {
      testConcurrency: options.testConcurrency,
      packageConcurrency: options.packageConcurrency,
      processIsolation: "process",
      ...(typeScriptFallback === null ? {} : {
        typescriptFallback: {
          used: true,
          version: typeScriptFallback.version,
          packages: typeScriptFallback.packages,
        },
      }),
    },
    totals: {
      selected: selection.length,
      executed: results.length,
      passed,
      failed,
      tests: totalTests,
    },
    results: visibleResults,
    ...(toolchainCleanupViolation === null
      ? {}
      : { violations: [toolchainCleanupViolation] }),
    ...(countWrite === null ? {} : { countWrite }),
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    humanReport(report, results);
    if (countWrite && !countWrite.ok) {
      process.stderr.write(`--emit-counts refused: ${countWrite.detail}\n`);
    }
  }
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  process.stderr.write(`run-all-tests: ${error.stack || error.message}\n`);
  process.exit(1);
});
