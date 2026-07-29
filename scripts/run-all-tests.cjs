#!/usr/bin/env node
// Complete, build-current package test runner for the Galerina workspace.
// Unknown, missing, empty, signalled, timed-out, or uncountable results refuse.

"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const DEFAULT_ROOT = path.join(__dirname, "..");
const CORE = Object.freeze([
  "galerina-devtools-graph-algorithms",
  "galerina-core-economics",
  "galerina-core-compiler",
  "galerina-core-security",
]);
const RUN_LAST = new Set(["galerina-devtools-graph-project"]);
const TIMEOUT_MS = 600_000;

function parseArguments(argv) {
  const options = {
    root: DEFAULT_ROOT,
    json: false,
    list: false,
    core: false,
    bail: false,
    emitCounts: false,
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

function runNpmTest(directory) {
  const childEnv = { ...process.env };
  // A runner invoked by node:test must start a new top-level test process.
  // Inheriting this marker makes Node treat the package suite as recursive
  // and silently skip every file.
  delete childEnv.NODE_TEST_CONTEXT;
  const common = {
    cwd: directory,
    encoding: "utf8",
    env: childEnv,
    shell: false,
    timeout: TIMEOUT_MS,
    windowsHide: true,
  };
  if (process.platform === "win32") {
    return spawnSync(
      process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe",
      ["/d", "/s", "/c", "npm.cmd", "test"],
      common,
    );
  }
  return spawnSync("npm", ["test"], common);
}

function failureFor(child, counts) {
  if (child.error?.code === "ETIMEDOUT") {
    return ["TEST-TIMEOUT", `Package test exceeded ${TIMEOUT_MS}ms.`];
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

function runPackage(record) {
  const started = Date.now();
  const child = runNpmTest(record.absolutePath);
  const durationMs = Date.now() - started;
  const output = `${child.stdout || ""}\n${child.stderr || ""}`;
  const counts = parseCounts(output);
  const failure = failureFor(child, counts);
  return {
    package: record.subject,
    status: failure === null ? "pass" : "fail",
    exitCode: typeof child.status === "number" ? child.status : 1,
    tests: counts.tests,
    pass: counts.pass,
    fail: counts.fail,
    built: child.error === undefined && child.status !== null,
    durationMs,
    ...(failure === null
      ? {}
      : { failureCode: failure[0], detail: failure[1] }),
    _output: output,
  };
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
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`run-all-tests: ${error.message}\n`);
    process.exit(3);
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

  const results = [];
  for (const record of selection) {
    const result = runPackage(record);
    results.push(result);
    if (options.bail && result.status === "fail") break;
  }
  const visibleResults = results.map(publicResult);
  const passed = results.filter((result) => result.status === "pass").length;
  const failed = results.length - passed;
  const totalTests = results.reduce(
    (sum, result) => sum + (result.status === "pass" ? result.tests : 0),
    0,
  );
  const complete = failed === 0 && results.length === selection.length;
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
    totals: {
      selected: selection.length,
      executed: results.length,
      passed,
      failed,
      tests: totalTests,
    },
    results: visibleResults,
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
