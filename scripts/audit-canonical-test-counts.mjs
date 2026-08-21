#!/usr/bin/env node
// audit-canonical-test-counts.mjs — blocking current-count contract for the
// version.json owner and its closed, exact rendered consumers.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const DOT = "\u00b7";
const TICK = "\u2705";
const CONSUMER_SPECS = Object.freeze([
  Object.freeze({ id: "roadmap-current", path: "docs/ROADMAP.md", capture: "roadmap" }),
  Object.freeze({ id: "readme-full-suite", path: "README.md", capture: "readme-full-suite" }),
  Object.freeze({ id: "readme-tests-table", path: "README.md", capture: "readme-tests-table" }),
  Object.freeze({ id: "todo-assurance-fabric", path: "docs/TODO.md", capture: "todo-assurance-fabric" }),
  Object.freeze({ id: "roadmap-chapter-3", path: "docs/ROADMAP.md", capture: "roadmap-chapter-3" }),
]);
const REQUIRED_CONSUMERS = Object.freeze(new Map([
  ["roadmap-current", Object.freeze({ path: "docs/ROADMAP.md", capture: "roadmap" })],
  ["readme-full-suite", Object.freeze({ path: "README.md", capture: "readme-full-suite" })],
  ["readme-tests-table", Object.freeze({ path: "README.md", capture: "readme-tests-table" })],
  ["todo-assurance-fabric", Object.freeze({ path: "docs/TODO.md", capture: "todo-assurance-fabric" })],
  ["roadmap-chapter-3", Object.freeze({ path: "docs/ROADMAP.md", capture: "roadmap-chapter-3" })],
]));

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
  return Object.freeze({ root, json, selfTest });
}

function read(root, relativePath) {
  try {
    return readFileSync(join(root, ...relativePath.split("/")), "utf8");
  } catch (error) {
    throw new Error(`${relativePath} is unreadable: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validateConsumerRegistry(consumers) {
  if (!Array.isArray(consumers) || consumers.length !== REQUIRED_CONSUMERS.size) {
    throw new Error("count consumer registry must conserve its exact closed cardinality");
  }
  const seen = new Set();
  for (const consumer of consumers) {
    if (
      consumer === null
      || typeof consumer !== "object"
      || Array.isArray(consumer)
      || Object.keys(consumer).sort().join(",") !== "capture,id,path"
      || typeof consumer.id !== "string"
      || typeof consumer.path !== "string"
      || typeof consumer.capture !== "string"
      || seen.has(consumer.id)
    ) {
      throw new Error("count consumer registry has a duplicate, malformed, or surplus capture");
    }
    seen.add(consumer.id);
    const expected = REQUIRED_CONSUMERS.get(consumer.id);
    if (
      expected === undefined
      || consumer.path !== expected.path
      || consumer.capture !== expected.capture
    ) {
      throw new Error(`count consumer registry does not conserve ${consumer.id}`);
    }
  }
  return consumers;
}

function capture(text, expression, consumer, violations, expected) {
  const flags = expression.flags.includes("g") ? expression.flags : `${expression.flags}g`;
  const matches = [...text.matchAll(new RegExp(expression.source, flags))];
  if (matches.length === 0 || typeof matches[0]?.[1] !== "string") {
    violations.push({ consumer, code: "COUNT_CONSUMER_MISSING", detail: "exact current claim is missing" });
    return;
  }
  if (matches.length !== 1) {
    violations.push({
      consumer,
      code: "COUNT_CONSUMER_DUPLICATE",
      detail: `expected exactly one current claim; found ${matches.length}`,
    });
    return;
  }
  const match = matches[0];
  const actual = Number(match[1].replaceAll(",", ""));
  if (!Number.isSafeInteger(actual) || actual !== expected) {
    violations.push({
      consumer,
      code: "COUNT_CONSUMER_DRIFT",
      detail: `claims ${match[1]} tests; version.json owns ${expected}`,
    });
  }
}

function literalOffsets(text, literal) {
  const offsets = [];
  let from = 0;
  while (from <= text.length - literal.length) {
    const offset = text.indexOf(literal, from);
    if (offset < 0) break;
    offsets.push(offset);
    from = offset + literal.length;
  }
  return offsets;
}

function patternOffsets(text, expression) {
  const flags = expression.flags.includes("g") ? expression.flags : `${expression.flags}g`;
  return [...text.matchAll(new RegExp(expression.source, flags))]
    .map((match) => match.index);
}

function roadmapBlock(text, consumer, violations, expected) {
  const begins = patternOffsets(text, /<!-- ROADMAP:BEGIN(?=\s|-->)/u);
  const ends = literalOffsets(text, "<!-- ROADMAP:END -->");
  if (begins.length === 0 || ends.length === 0) {
    violations.push({ consumer, code: "COUNT_CONSUMER_MISSING", detail: "generated roadmap block is missing" });
    return;
  }
  if (begins.length !== 1 || ends.length !== 1 || begins[0] >= ends[0]) {
    violations.push({
      consumer,
      code: "COUNT_CONSUMER_DUPLICATE",
      detail: `expected one ordered roadmap marker pair; found ${begins.length} begin and ${ends.length} end markers`,
    });
    return;
  }
  capture(
    text.slice(begins[0], ends[0]),
    /\*\*v[^\n]*\u00b7\s*\d+\s+packages\s*\u00b7\s*([\d,]+)\s+tests\s*\u00b7/u,
    consumer,
    violations,
    expected,
  );
}

function activeChapter(text, consumer, violations) {
  const headings = patternOffsets(
    text,
    /^## VOK assurance fabric Chapter 3 - 2026-08-10\r?$/mu,
  );
  if (headings.length === 0) {
    violations.push({ consumer, code: "COUNT_CONSUMER_MISSING", detail: "Chapter 3 heading is missing" });
    return null;
  }
  if (headings.length !== 1) {
    violations.push({
      consumer,
      code: "COUNT_CONSUMER_DUPLICATE",
      detail: `expected exactly one Chapter 3 heading; found ${headings.length}`,
    });
    return null;
  }
  return text.slice(headings[0]);
}

function auditConsumer(consumer, text, violations, expected) {
  if (consumer.capture === "roadmap") {
    roadmapBlock(text, consumer.id, violations, expected);
    return;
  }
  if (consumer.capture === "readme-full-suite") {
    capture(text, /full suite\s+\d+\/\d+\s+packages\s+\u00b7\s+([\d,]+)\s+tests\s+\u00b7/u, consumer.id, violations, expected);
    return;
  }
  if (consumer.capture === "readme-tests-table") {
    capture(text, /\|\s*\*\*Tests\*\*\s*\|[^\n]*\d+\/\d+\s*\u00b7\s*([\d,]+)\s*\u00b7\s*0 fail\s*\|/u, consumer.id, violations, expected);
    return;
  }
  if (consumer.capture === "todo-assurance-fabric") {
    capture(text, /complete package lane passes\s+\*\*\d+\/\d+\s+packages and\s+([\d,]+)\s+tests\*\*/u, consumer.id, violations, expected);
    return;
  }
  if (consumer.capture === "roadmap-chapter-3") {
    const chapter = activeChapter(text, consumer.id, violations);
    if (chapter !== null) {
      capture(chapter, /complete package lane is\s+\*\*\d+\/\d+\s+packages and\s+([\d,]+)\s+tests\*\*/u, consumer.id, violations, expected);
    }
    return;
  }
  throw new Error(`count consumer registry has an unimplemented exact capture ${consumer.capture}`);
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
  const consumers = validateConsumerRegistry(CONSUMER_SPECS);
  const texts = new Map(consumers.map((consumer) => [consumer.path, read(root, consumer.path)]));
  const violations = [];
  for (const consumer of consumers) {
    auditConsumer(consumer, texts.get(consumer.path), violations, version.testCount);
  }
  return {
    tool: "canonical-test-count-consistency",
    schemaVersion: 1,
    authorizing: false,
    testCount: version.testCount,
    consumers: consumers.length,
    violations,
  };
}

function writeFixture(root, staleConsumer) {
  const write = (relativePath, content) => {
    const output = join(root, ...relativePath.split("/"));
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, content);
  };
  const claim = (consumer, plain = false) => {
    const value = consumer === staleConsumer ? 9498 : 9499;
    return plain ? String(value) : value.toLocaleString("en-GB");
  };
  const roadmap = (consumer) => `**v1.0.0-beta.2 ${DOT} 100 packages ${DOT} ${claim(consumer, true)} tests ${DOT} ship-readiness 100.0%**`;
  write("version.json", `${JSON.stringify({ testCount: 9499, packageCount: 100 })}\n`);
  write("README.md", [
    `**v1.0.0-beta.2 ${DOT} full suite 100/100 packages ${DOT} ${claim("readme-full-suite")} tests ${DOT} 0 failures.**`,
    `| **Tests** | ${TICK} green | 100/100 ${DOT} ${claim("readme-tests-table")} ${DOT} 0 fail |`,
  ].join("\n"));
  write("docs/ROADMAP.md", [
    "<!-- ROADMAP:BEGIN -->", roadmap("roadmap-current"), "<!-- ROADMAP:END -->",
    "## VOK assurance fabric Chapter 3 - 2026-08-10",
    `The complete package lane is **100/100 packages and ${claim("roadmap-chapter-3")} tests** in 1s.`,
  ].join("\n"));
  write("docs/TODO.md", `The complete package lane passes **100/100 packages and ${claim("todo-assurance-fabric")} tests**.\n`);
}

function selfTest() {
  const root = mkdtempSync(join(tmpdir(), "galerina-count-contract-"));
  try {
    writeFixture(root);
    const clean = audit(root);
    const stale = CONSUMER_SPECS.map((consumer) => {
      writeFixture(root, consumer.id);
      return audit(root);
    });
    const passed = clean.violations.length === 0
      && stale.every((result, index) => (
        result.violations.length === 1
        && result.violations[0]?.consumer === CONSUMER_SPECS[index].id
      ));
    if (!passed) throw new Error("closed count-consumer registry did not block every stale capture");
    process.stdout.write(`[self-test] PASS — ${CONSUMER_SPECS.length}/${CONSUMER_SPECS.length} exact rendered captures block drift\n`);
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
