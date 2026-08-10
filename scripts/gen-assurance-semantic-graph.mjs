#!/usr/bin/env node
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { deriveSemanticCoverage } from "./lib/assurance-fabric/semantic-coverage.mjs";
import {
  generatedOutputMatches,
  provenanceForCheck,
} from "./lib/provenance.mjs";

const TOOL = "semantic-assurance-graph";
const OUTPUTS = Object.freeze([
  "SEMANTIC-GRAPH.md",
  "provenance.json",
  "semantic-graph.json",
]);

function parseArgs(argv) {
  let root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  let rootSeen = false;
  let check = false;
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root") {
      const selected = argv[index + 1];
      if (rootSeen || selected === undefined || selected.startsWith("--")) {
        throw new Error("semantic-assurance-graph: --root requires exactly one path");
      }
      root = resolve(selected);
      rootSeen = true;
      index += 1;
      continue;
    }
    if (value === "--check" && !check) {
      check = true;
      continue;
    }
    throw new Error(`semantic-assurance-graph: unknown or duplicate argument ${value}`);
  }
  return Object.freeze({ root, check });
}

function renderMarkdown(report) {
  const state = report.verdictTrit === 1 ? "ALLOW" : report.verdictTrit === 0 ? "UNKNOWN" : "DENY";
  return [
    "# VOK Semantic Assurance Graph",
    "",
    `Build point: \`${report.repositoryHead}\``,
    "",
    `K3 evidence state: **${state} (${report.verdictTrit})**`,
    "",
    "This generated graph is an index of conserved evidence identities. It is non-authorizing and does not grant release, conversion, signing, retirement, or production authority.",
    "",
    "## Conserved totals",
    "",
    `- Release/system requirements: ${report.totals.requirements}`,
    `- System contracts: ${report.totals.systemContracts}`,
    `- Canonical parser-proven routes: ${report.totals.routes}`,
    `- Registered packages: ${report.totals.packages}`,
    `- Test evidence nodes: ${report.totals.tests}`,
    `- Live detector mappings: ${report.totals.detectors}`,
    `- Complete executable-family paths: ${report.totals.executableFamily}`,
    `- Legacy unmapped tests: ${report.totals.legacyUnmapped}`,
    "",
    "## Zero-trust boundaries",
    "",
    "- Route identities come only from canonical `.fungi` AST nodes conserved against the route registry.",
    "- Package edges and fan counts conserve all registered package graphs against the project graph.",
    "- Every tracked test file maps to release evidence or an explicit package/repository system contract.",
    "- Every detector names a planted refusal or mutation test.",
    "- `.ts`, `.d.ts`, `.mts`, `.cts`, `.mjs`, `.js`, and `.cjs` are independently counted; zero is explicit.",
    "- Inputs are bounded regular files, hashed before derivation, and re-read before publication.",
    "",
    `Authorizing: **${report.authorizing ? "yes" : "no"}**`,
    "",
  ].join("\n");
}

function expectedOutputs(report, stamp) {
  return new Map([
    ["SEMANTIC-GRAPH.md", renderMarkdown(report)],
    ["provenance.json", `${JSON.stringify(stamp, undefined, 2)}\n`],
    ["semantic-graph.json", `${JSON.stringify(report, undefined, 2)}\n`],
  ]);
}

function publishAtomically(root, outputs) {
  const buildRoot = join(root, "build");
  const destination = join(buildRoot, "assurance-semantic-graph");
  mkdirSync(buildRoot, { recursive: true });
  const temporary = mkdtempSync(join(tmpdir(), "galerina-assurance-semantic-write-"));
  const backup = mkdtempSync(join(tmpdir(), "galerina-assurance-semantic-backup-"));
  const existing = new Set();
  try {
    for (const [name, bytes] of outputs) {
      writeFileSync(join(temporary, name), bytes, { flag: "wx" });
      const destinationPath = join(destination, name);
      if (existsSync(destinationPath)) {
        copyFileSync(destinationPath, join(backup, name));
        existing.add(name);
      }
    }
    const actual = OUTPUTS.filter((name) => existsSync(join(temporary, name))).sort();
    if (JSON.stringify(actual) !== JSON.stringify([...OUTPUTS].sort())) {
      throw new Error("semantic-assurance-graph: staged output set did not conserve");
    }
    mkdirSync(destination, { recursive: true });
    for (const name of OUTPUTS) {
      renameSync(join(temporary, name), join(destination, name));
    }
  } catch (error) {
    for (const name of OUTPUTS) {
      const destinationPath = join(destination, name);
      if (existing.has(name)) {
        copyFileSync(join(backup, name), destinationPath);
      } else {
        rmSync(destinationPath, { force: true });
      }
    }
    throw error;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
    rmSync(backup, { recursive: true, force: true });
  }
}

const options = parseArgs(process.argv.slice(2));
const outputDirectory = join(options.root, "build", "assurance-semantic-graph");
const provenancePath = join(outputDirectory, "provenance.json");
const result = await deriveSemanticCoverage(options.root);
if (result.kind !== "accepted") {
  console.error(`${result.code}: ${result.detail}`);
  process.exit(1);
}
const stamp = provenanceForCheck(TOOL, options.root, provenancePath, options.check);
const expected = expectedOutputs(result.value, stamp);

if (options.check) {
  const stale = [...expected].filter(([name, bytes]) => {
    const path = join(outputDirectory, name);
    return !existsSync(path) || !generatedOutputMatches(path, readFileSync(path, "utf8"), bytes);
  }).map(([name]) => relative(options.root, join(outputDirectory, name)).replace(/\\/gu, "/"));
  if (stale.length > 0) {
    console.error(`semantic-assurance-graph: ${stale.length} missing or stale output(s): ${stale.join(", ")}; no files written`);
    process.exit(1);
  }
  console.log(`semantic-assurance-graph: ${expected.size}/${expected.size} outputs current`);
  process.exit(0);
}

publishAtomically(options.root, expected);
console.log(
  `semantic-assurance-graph: published ${expected.size} outputs; `
  + `${result.value.totals.routes} routes / ${result.value.totals.packages} packages / `
  + `${result.value.totals.tests} tests / K3 ${result.value.verdictTrit}`,
);
