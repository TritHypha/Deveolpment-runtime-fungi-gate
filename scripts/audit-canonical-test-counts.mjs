#!/usr/bin/env node
// audit-canonical-test-counts.mjs — blocking current-count contract for the
// version.json owner and the exact rendered consumers it supplies.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

function parseArgs(argv) {
  let root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  let json = false;
  let selfTest = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--root requires exactly one path");
      root = resolve(value);
      index += 1;
      continue;
    }
    if (arg === "--json" && !json) {
      json = true;
      continue;
    }
    if (arg === "--self-test" && !selfTest) {
      selfTest = true;
      continue;
    }
    throw new Error(`unknown or duplicate argument ${arg}`);
  }
  return { root, json, selfTest };
}

function read(root, relativePath) {
  try {
    return readFileSync(join(root, ...relativePath.split("/")), "utf8");
  } catch (error) {
    throw new Error(`${relativePath} is unreadable: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function capture(text, expression, consumer, violations, expected) {
  const match = expression.exec(text);
  if (match === null || typeof match[1] !== "string") {
    violations.push({ consumer, code: "COUNT_CONSUMER_MISSING", detail: "exact current claim is missing" });
    return;
  }
  const actual = Number(match[1].replaceAll(",", ""));
  if (!Number.isSafeInteger(actual) || actual !== expected) {
    violations.push({
      consumer,
      code: "COUNT_CONSUMER_DRIFT",
      detail: `claims ${match[1]} tests; version.json owns ${expected}`,
    });
  }
}

function subwayBlock(text, consumer, violations, expected) {
  const begin = text.indexOf("<!-- SUBWAY:BEGIN");
  const end = begin < 0 ? -1 : text.indexOf("<!-- SUBWAY:END -->", begin);
  if (begin < 0 || end < 0) {
    violations.push({ consumer, code: "COUNT_CONSUMER_MISSING", detail: "generated subway block is missing" });
    return;
  }
  capture(
    text.slice(begin, end),
    /\*\*v[^\n]*·\s*\d+\s+packages\s*·\s*([\d,]+)\s+tests\s*·/u,
    consumer,
    violations,
    expected,
  );
}

function activeChapter(text) {
  const heading = "## VOK assurance fabric Chapter 3 - 2026-08-10";
  const start = text.indexOf(heading);
  return start < 0 ? "" : text.slice(start);
}

function audit(root) {
  const versionText = read(root, "version.json");
  let version;
  try {
    version = JSON.parse(versionText);
  } catch (error) {
    throw new Error(`version.json is malformed: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (version === null || typeof version !== "object" || Array.isArray(version)
      || !Number.isSafeInteger(version.testCount) || version.testCount < 1) {
    throw new Error("version.json must own one positive safe-integer testCount");
  }
  const expected = version.testCount;
  const violations = [];
  const readme = read(root, "README.md");
  const cycleRoadmap = read(root, "docs/roadmap-2026-07-25-cycle2.md");
  const activeRoadmap = read(root, "docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md");
  const todo = read(root, "docs/TODO.md");

  subwayBlock(readme, "readme-subway", violations, expected);
  subwayBlock(cycleRoadmap, "cycle-roadmap-subway", violations, expected);
  subwayBlock(activeRoadmap, "active-roadmap-subway", violations, expected);
  capture(readme, /full suite\s+\d+\/\d+\s+packages\s+·\s+([\d,]+)\s+tests\s+·/u,
    "readme-full-suite", violations, expected);
  capture(readme, /\|\s*\*\*Tests\*\*\s*\|[^\n]*\d+\/\d+\s*·\s*([\d,]+)\s*·\s*0 fail\s*\|/u,
    "readme-tests-table", violations, expected);
  capture(todo, /complete package lane passes\s+\*\*\d+\/\d+\s+packages and\s+([\d,]+)\s+tests\*\*/u,
    "todo-assurance-fabric", violations, expected);
  capture(activeChapter(activeRoadmap), /complete package lane is\s+\*\*\d+\/\d+\s+packages and\s+([\d,]+)\s+tests\*\*/u,
    "active-roadmap-chapter-3", violations, expected);

  return {
    tool: "canonical-test-count-consistency",
    schemaVersion: 1,
    authorizing: false,
    testCount: expected,
    consumers: 7,
    violations,
  };
}

function selfTest() {
  const root = mkdtempSync(join(tmpdir(), "galerina-count-contract-"));
  const write = (relativePath, content) => {
    const output = join(root, ...relativePath.split("/"));
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, content);
  };
  const subway = "**v1.0.0-beta.2 · 100 packages · 9499 tests · ship-readiness 100.0%**";
  try {
    write("version.json", `${JSON.stringify({ testCount: 9499, packageCount: 100 })}\n`);
    write("README.md", [
      "<!-- SUBWAY:BEGIN -->", subway, "<!-- SUBWAY:END -->",
      "**v1.0.0-beta.2 · full suite 100/100 packages · 9,499 tests · 0 failures.**",
      "| **Tests** | ✅ green | 100/100 · 9,499 · 0 fail |",
    ].join("\n"));
    write("docs/roadmap-2026-07-25-cycle2.md", `<!-- SUBWAY:BEGIN -->\n${subway}\n<!-- SUBWAY:END -->\n`);
    write("docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md", [
      "<!-- SUBWAY:BEGIN -->", subway, "<!-- SUBWAY:END -->",
      "## VOK assurance fabric Chapter 3 - 2026-08-10",
      "The complete package lane is **100/100 packages and 9,499 tests** in 1s.",
    ].join("\n"));
    write("docs/TODO.md", "The complete package lane passes **100/100 packages and 9,499 tests**.\n");
    const clean = audit(root);
    write("docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md", [
      "<!-- SUBWAY:BEGIN -->", subway, "<!-- SUBWAY:END -->",
      "## VOK assurance fabric Chapter 3 - 2026-08-10",
      "The complete package lane is **100/100 packages and 9,498 tests** in 1s.",
    ].join("\n"));
    const stale = audit(root);
    const passed = clean.violations.length === 0
      && stale.violations.length === 1
      && stale.violations[0]?.consumer === "active-roadmap-chapter-3";
    if (!passed) throw new Error("clean or stale count-contract control did not produce its exact expected result");
    process.stdout.write("[self-test] PASS — clean consumers clear and one stale active-roadmap claim blocks\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
  if (options.selfTest) {
    selfTest();
    process.exit(0);
  }
  const result = audit(options.root);
  if (options.json) process.stdout.write(`${JSON.stringify(result)}\n`);
  else {
    process.stdout.write(
      `canonical-test-count-consistency: ${result.consumers - result.violations.length}/${result.consumers} consumers match ${result.testCount} tests\n`,
    );
    for (const violation of result.violations) {
      process.stdout.write(`  ${violation.consumer}: ${violation.code} ${violation.detail}\n`);
    }
  }
  process.exit(result.violations.length === 0 ? 0 : 1);
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify({
      tool: "canonical-test-count-consistency",
      schemaVersion: 1,
      authorizing: false,
      violations: [{ consumer: "owner", code: "COUNT_OWNER_REFUSED", detail }],
    })}\n`);
  } else {
    process.stderr.write(`canonical-test-count-consistency: REFUSED ${detail}\n`);
  }
  process.exit(1);
}
