import { after, test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const SCRIPT = join(process.cwd(), "scripts", "audit-canonical-test-counts.mjs");
const roots = [];
const DOT = "\u00b7";
const TICK = "\u2705";
const CONSUMER_IDS = Object.freeze([
  "roadmap-current",
  "readme-full-suite",
  "readme-tests-table",
  "todo-assurance-fabric",
  "roadmap-chapter-3",
]);

after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function write(root, path, content) {
  const output = join(root, ...path.split("/"));
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, content);
}

function fixture(staleConsumer) {
  const root = mkdtempSync(join(tmpdir(), "galerina-count-contract-"));
  roots.push(root);
  const claim = (consumer, plain = false) => {
    const value = consumer === staleConsumer ? 9498 : 9499;
    return plain ? String(value) : value.toLocaleString("en-GB");
  };
  const roadmap = (consumer) => `**v1.0.0-beta.2 ${DOT} 100 packages ${DOT} ${claim(consumer, true)} tests ${DOT} ship-readiness 100.0%**`;
  write(root, "version.json", `${JSON.stringify({ testCount: 9499, packageCount: 100 })}\n`);
  write(root, "README.md", [
    `**v1.0.0-beta.2 ${DOT} full suite 100/100 packages ${DOT} ${claim("readme-full-suite")} tests ${DOT} 0 failures.**`,
    `| **Tests** | ${TICK} green | 100/100 ${DOT} ${claim("readme-tests-table")} ${DOT} 0 fail |`,
  ].join("\n"));
  write(root, "docs/ROADMAP.md", [
    "<!-- ROADMAP:BEGIN -->",
    roadmap("roadmap-current"),
    "<!-- ROADMAP:END -->",
    "## VOK assurance fabric Chapter 3 - 2026-08-10",
    `The complete package lane is **100/100 packages and ${claim("roadmap-chapter-3")} tests** in 1s.`,
  ].join("\n"));
  write(root, "docs/TODO.md", `Fresh evidence: the complete package lane passes **100/100 packages and ${claim("todo-assurance-fabric")} tests**.\n`);
  return root;
}

function run(root) {
  return spawnSync(process.execPath, [SCRIPT, "--root", root, "--json"], { encoding: "utf8" });
}

function mutate(root, path, transform) {
  const target = join(root, ...path.split("/"));
  writeFileSync(target, transform(readFileSync(target, "utf8")));
}

test("canonical test-count owner accepts every exact current rendered consumer", () => {
  const result = run(fixture());
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.consumers, CONSUMER_IDS.length);
  assert.equal(report.violations.length, 0);
});

test("canonical test-count owner blocks drift in every registered rendered capture", () => {
  for (const consumer of CONSUMER_IDS) {
    const result = run(fixture(consumer));
    assert.notEqual(result.status, 0, consumer);
    const report = JSON.parse(result.stdout);
    assert.equal(report.tool, "canonical-test-count-consistency");
    assert.equal(report.consumers, CONSUMER_IDS.length);
    assert.deepEqual(report.violations.map((entry) => entry.consumer), [consumer], consumer);
  }
});

test("canonical test-count owner self-test proves every registered capture", () => {
  const result = spawnSync(process.execPath, [SCRIPT, "--self-test"], { encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /self-test.*PASS/i);
    assert.match(result.stdout, /5\/5/i);
});

test("canonical test-count owner rejects duplicate claims, marker pairs and chapter headings", () => {
  const hostile = [
    {
      name: "contradictory full-suite claims",
      consumer: "readme-full-suite",
      apply(root) {
        mutate(root, "README.md", (text) => `${text}\n**v1.0.0-beta.2 ${DOT} full suite 100/100 packages ${DOT} 9,498 tests ${DOT} 0 failures.**\n`);
      },
    },
    {
      name: "duplicate current test-table claims",
      consumer: "readme-tests-table",
      apply(root) {
        mutate(root, "README.md", (text) => `${text}\n| **Tests** | ${TICK} green | 100/100 ${DOT} 9,499 ${DOT} 0 fail |\n`);
      },
    },
    {
      name: "duplicate roadmap marker pairs",
      consumer: "roadmap-current",
      apply(root) {
        mutate(root, "docs/ROADMAP.md", (text) => (
          `${text}\n<!-- ROADMAP:BEGIN -->\n**v1.0.0-beta.2 ${DOT} 100 packages ${DOT} 9499 tests ${DOT} ship-readiness 100.0%**\n<!-- ROADMAP:END -->\n`
        ));
      },
    },
    {
      name: "duplicate Chapter 3 headings",
      consumer: "roadmap-chapter-3",
      apply(root) {
        mutate(root, "docs/ROADMAP.md", (text) => (
          `${text}\n## VOK assurance fabric Chapter 3 - 2026-08-10\nThe complete package lane is **100/100 packages and 9,498 tests** in 1s.\n`
        ));
      },
    },
    {
      name: "contradictory claims inside the Chapter 3 section",
      consumer: "roadmap-chapter-3",
      apply(root) {
        mutate(root, "docs/ROADMAP.md", (text) => (
          `${text}\nThe complete package lane is **100/100 packages and 9,498 tests** in 2s.\n`
        ));
      },
    },
  ];

  for (const attack of hostile) {
    const root = fixture();
    attack.apply(root);
    const result = run(root);
    assert.notEqual(result.status, 0, attack.name);
    const report = JSON.parse(result.stdout);
    assert.ok(
      report.violations.some((entry) => entry.consumer === attack.consumer),
      `${attack.name}: ${result.stdout}`,
    );
  }
});
