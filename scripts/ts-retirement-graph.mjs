#!/usr/bin/env node
// ts-retirement-graph.mjs — graph 7/7: the LIVE `.ts` retirement meter (owner-directed 2026-07-16:
// "build a dev tool as part of the % to track .ts using graph").
//
// WHY: "why does *.ts still exist?" must be answerable with a NUMBER per retirement path, not prose.
// Every tracked `.ts` under packages-galerina/*/src retires through exactly one of three events:
//   1. #143 R4 flip     — it has a `.fungi` TWIN beside it (same package, same stem); an authority
//                          ledger records whether TypeScript remains the differential oracle or the
//                          checked `.fungi` twin is authoritative. Physical `.ts` retirement waits
//                          for executable SLIDE integration and is tracked separately.
//   2. bootstrap fixpoint — it IS the compiler (galerina-core-compiler): the .fungi stages are compiled
//                          BY this .ts, so it retires last (post-v1, self-hosting Stages 3-6).
//   3. the #38 migration — everything else: the 49-package codemod program (owner-gated re-sign).
// This tool derives those buckets from the tree and writes build/ts-retirement/ so component-health's
// % audit reads the numbers LIVE (tool = source; no hand-typed count to drift — the version.json rule).
//
// FIND: myco (the graph finder) ∪ `git ls-files` (the tracked-corpus source of truth), with finder-drift
// reporting — the audit-fungi-corpus-check pattern, verified there (dotted queries under-match; token
// query + extension filter is the reliable shape).
//
//   node scripts/ts-retirement-graph.mjs              # regenerate build/ts-retirement/ + summary line
//   node scripts/ts-retirement-graph.mjs --self-test  # finder coverage + a known twin pair + sum check
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, relative, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { findCorpus, findTrackedAt } from "./lib/find-files.mjs"; // THE shared graph∪git finder (owner rule: no per-tool globs)
import {
  generatedOutputMatches,
  provenance,
} from "./lib/provenance.mjs";

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT_INDEX = process.argv.indexOf("--root");
const ROOT = ROOT_INDEX >= 0 && process.argv[ROOT_INDEX + 1]
  ? resolve(process.argv[ROOT_INDEX + 1])
  : DEFAULT_ROOT;
const OUT = join(ROOT, "build", "ts-retirement");
const CHECK = process.argv.includes("--check");

// The bounded-TCB FLOOR (census handover §2): these stay .ts/native forever by ruling — crypto
// primitives, host seams, pure-algorithm devtools. A floor .ts is not "unfinished"; it is the TCB.
const FLOOR_PACKAGES = new Set(["galerina-substrate-math", "galerina-devtools-graph-algorithms", "galerina-core-security"]);
const COMPILER_AUTHORITY_LEDGER =
  "docs/security/rd0528-compiler-authoritative-stages.json";
const GOVERNED_AUTHORITY_LEDGER =
  "docs/security/rd0361-authoritative-twins.json";
const COMPILER_STAGE_FILES = new Set([
  "effect-checker.fungi",
  "gir-emitter.fungi",
  "governance-verifier.fungi",
  "lexer.fungi",
  "parser.fungi",
  "runtime.fungi",
  "type-checker.fungi",
]);
const GOVERNED_TWIN_DIRS = [
  "packages-galerina/galerina-framework-app-kernel/src/self-hosted",
  "packages-galerina/galerina-tower-citizen/src/self-hosted",
  "packages-galerina/galerina-core-runtime/src/self-hosted",
  "packages-galerina/galerina-core-sentinel-memory/src/self-hosted",
  "packages-galerina/galerina-core-sentinel-io/src/self-hosted",
  "packages-galerina/galerina-core-network/src/self-hosted",
  "packages-galerina/galerina-core-sentinel-time/src/self-hosted",
  "packages-galerina/galerina-core-sentinel-power/src/self-hosted",
  "packages-galerina/galerina-core-sentinel-egress/src/self-hosted",
  "packages-galerina/galerina-core-sentinel-state/src/self-hosted",
];

/**
 * Normalize one repository-relative ledger path and reject path ambiguity.
 *
 * @param {unknown} value
 * @param {string} label
 */
function authorityRelativePath(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`authority ledger ${label} must be a non-empty string`);
  }
  const normalized = value.replace(/\\/g, "/");
  const segments = normalized.split("/");
  if (
    normalized.startsWith("/")
    || /^[A-Za-z]:/.test(normalized)
    || segments.some((segment) =>
      segment.length === 0 || segment === "." || segment === "..")
  ) {
    throw new Error(
      `authority ledger ${label} must be an unambiguous repository-relative path`,
    );
  }
  return normalized;
}

/**
 * Read one authority ledger and prove every entry owns one tracked Fungi twin.
 *
 * @param {string} root
 * @param {string} ledgerPath
 * @param {ReadonlySet<string>} fungiFiles
 */
function authoritativeTwins(root, ledgerPath, fungiFiles) {
  let ledger;
  try {
    ledger = JSON.parse(readFileSync(join(root, ledgerPath), "utf8"));
  } catch (error) {
    throw new Error(
      `authority ledger ${ledgerPath} is missing or malformed: ${error.message}`,
    );
  }
  if (!ledger || !Array.isArray(ledger.twins)) {
    throw new Error(`authority ledger ${ledgerPath} must contain twins[]`);
  }
  const seen = new Set();
  for (const [index, entry] of ledger.twins.entries()) {
    if (!entry || typeof entry !== "object") {
      throw new Error(`authority ledger ${ledgerPath} twins[${index}] is malformed`);
    }
    const dir = authorityRelativePath(
      entry.dir,
      `${ledgerPath} twins[${index}].dir`,
    );
    const file = authorityRelativePath(
      entry.file,
      `${ledgerPath} twins[${index}].file`,
    );
    if (file.includes("/")) {
      throw new Error(
        `authority ledger ${ledgerPath} twins[${index}].file must be a filename`,
      );
    }
    const fungiPath = `${dir}/${file}`;
    if (seen.has(fungiPath)) {
      throw new Error(`authority ledger ${ledgerPath} duplicates ${fungiPath}`);
    }
    seen.add(fungiPath);
    if (!fungiFiles.has(fungiPath)) {
      throw new Error(
        `authority ledger ${ledgerPath} names missing Fungi source ${fungiPath}`,
      );
    }
  }
  return seen;
}

export function buildRetirementGraph(root = ROOT) {
  const scope = /^packages-galerina\/[^/]+\/src\//;
  const { files: ts, finder, finderDrift } = findCorpus(
    ".ts",
    ["packages-galerina/*/src/**/*.ts"],
    scope,
    { root },
  );
  const fungi = findTrackedAt(
    root,
    "packages-galerina/*/src/**/*.fungi",
  ).filter((p) => scope.test(p));
  const pkgOf = (p) => p.split("/")[1];
  const stem = (p) => basename(p).replace(/\.(ts|fungi)$/, "");
  // twin key = package + stem: secret-gate.fungi twins secret-gate.ts IN THE SAME PACKAGE.
  const twinKeys = new Set(fungi.map((f) => `${pkgOf(f)}::${stem(f)}`));
  const fungiFiles = new Set(fungi);
  const compilerAuthority = authoritativeTwins(
    root,
    COMPILER_AUTHORITY_LEDGER,
    fungiFiles,
  );
  const governedAuthority = authoritativeTwins(
    root,
    GOVERNED_AUTHORITY_LEDGER,
    fungiFiles,
  );
  for (const fungiPath of compilerAuthority) {
    if (governedAuthority.has(fungiPath)) {
      throw new Error(
        `authority ledgers assign the same Fungi source twice: ${fungiPath}`,
      );
    }
    if (
      !fungiPath.startsWith(
        "packages-galerina/galerina-core-compiler/src/self-hosted/",
      )
      || !COMPILER_STAGE_FILES.has(basename(fungiPath))
    ) {
      throw new Error(
        `compiler authority ledger names a non-canonical stage: ${fungiPath}`,
      );
    }
  }
  for (const fungiPath of governedAuthority) {
    if (!GOVERNED_TWIN_DIRS.some((dir) => fungiPath.startsWith(`${dir}/`))) {
      throw new Error(
        `governed authority ledger names a source outside governed twin dirs: ${fungiPath}`,
      );
    }
  }
  const compilerAuthoritativeFlips = compilerAuthority.size;
  const governedAuthoritativeFlips = governedAuthority.size;
  const authoritativeFlips =
    compilerAuthoritativeFlips + governedAuthoritativeFlips;
  const compilerStageTotal = fungi.filter((path) =>
    path.startsWith(
      "packages-galerina/galerina-core-compiler/src/self-hosted/",
    ) && COMPILER_STAGE_FILES.has(basename(path))
  ).length;
  const governedTwinTotal = fungi.filter((path) =>
    GOVERNED_TWIN_DIRS.some((dir) => path.startsWith(`${dir}/`))
  ).length;
  if (compilerAuthoritativeFlips > compilerStageTotal) {
    throw new Error(
      "compiler authority ledger exceeds the discovered canonical stage set",
    );
  }
  if (governedAuthoritativeFlips > governedTwinTotal) {
    throw new Error(
      "governed authority ledger exceeds the discovered governed twin set",
    );
  }

  const perPackage = {}; const twinnedPairs = [];
  let twinned = 0, compilerCore = 0, floor = 0, program = 0;
  for (const f of ts) {
    const pkg = pkgOf(f);
    const pp = (perPackage[pkg] ??= { ts: 0, twinned: 0, fungi: 0 });
    pp.ts++;
    if (twinKeys.has(`${pkg}::${stem(f)}`)) { twinned++; pp.twinned++; twinnedPairs.push(f); }
    else if (pkg === "galerina-core-compiler") compilerCore++;
    else if (FLOOR_PACKAGES.has(pkg)) floor++;
    else program++;
  }
  for (const f of fungi) (perPackage[pkgOf(f)] ??= { ts: 0, twinned: 0, fungi: 0 }).fungi++;
  return {
    generated: "ts-retirement-graph",
    totals: {
      ts: ts.length,
      twinned,
      compilerCore,
      floor,
      program,
      fungiInSrc: fungi.length,
      packages: Object.keys(perPackage).length,
      finderDrift,
      compilerAuthoritativeFlips,
      governedAuthoritativeFlips,
      authoritativeFlips,
      compilerStageTotal,
      compilerDifferential: compilerStageTotal - compilerAuthoritativeFlips,
      governedTwinTotal,
      governedDifferential: governedTwinTotal - governedAuthoritativeFlips,
    },
    retirementPaths: {
      twinned: "→ #143 R4 authority ledger (checked .fungi authority or retained .ts differential oracle)",
      compilerCore: "→ bootstrap fixpoint (the .fungi stages are compiled BY this .ts — retires last, post-v1)",
      floor: "→ NEVER (bounded-TCB floor by ruling: crypto primitives, host seams, pure-algorithm devtools)",
      program: "→ the #38 migration codemod program (owner-gated re-sign ceremony)",
    },
    perPackage, twinnedPairs,
  };
}

if (process.argv.includes("--self-test")) {
  const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) process.exitCode = 1; };
  const g = buildRetirementGraph();
  ok(g.totals.ts > 300, `corpus found: ${g.totals.ts} tracked .ts in package src trees`);
  ok(g.totals.finderDrift <= 0 || g.totals.finderDrift === -1, g.totals.finderDrift === -1
    ? "myco unavailable — git index alone (degraded but complete for tracked)"
    : `graph finder covers the tracked corpus (drift=${g.totals.finderDrift})`);
  ok(g.twinnedPairs.includes("packages-galerina/galerina-framework-app-kernel/src/secret-gate.ts"), "known twin pair detected: secret-gate.ts ↔ secret-gate.fungi");
  ok(g.totals.twinned + g.totals.compilerCore + g.totals.floor + g.totals.program === g.totals.ts, "buckets partition the corpus exactly (twinned + compiler-core + floor + program == total)");
  ok(
    g.totals.authoritativeFlips
      === g.totals.compilerAuthoritativeFlips
        + g.totals.governedAuthoritativeFlips
      && g.totals.compilerAuthoritativeFlips + g.totals.compilerDifferential
        === g.totals.compilerStageTotal
      && g.totals.governedAuthoritativeFlips + g.totals.governedDifferential
        === g.totals.governedTwinTotal,
    "authority ledgers partition the compiler and governed inventories",
  );
  console.log(process.exitCode ? "  ts-retirement self-test FAILED" : "  ts-retirement self-test: finder + twin-match + partition verified ✅");
  process.exit(process.exitCode ?? 0);
}

const g = buildRetirementGraph();
const t = g.totals;
const md = [
  `# .ts retirement graph (${t.ts} tracked .ts in package src)`,
  ``,
  `Regenerate: \`node scripts/ts-retirement-graph.mjs\` (graph-all 7/7). The % audit reads these numbers LIVE.`,
  ``,
  `| Retirement path | Count | Deletes via |`,
  `|---|--:|---|`,
  `| Twinned (.fungi beside it) | ${t.twinned} | ${g.retirementPaths.twinned} |`,
  `| Compiler core | ${t.compilerCore} | ${g.retirementPaths.compilerCore} |`,
  `| Bounded-TCB floor | ${t.floor} | ${g.retirementPaths.floor} |`,
  `| Migration program | ${t.program} | ${g.retirementPaths.program} |`,
  ``,
  `Authority ledgers: ${t.compilerAuthoritativeFlips} compiler + ${t.governedAuthoritativeFlips} governed = ${t.authoritativeFlips} authoritative twins.`,
  ``,
  `\`.fungi\` in src trees: ${t.fungiInSrc} across ${t.packages} packages · finder drift: ${t.finderDrift === -1 ? "n/a (myco unavailable)" : t.finderDrift}`,
  ``,
  `## Twinned .ts (the #143 flip queue)`,
  ...g.twinnedPairs.map((p) => `- ${p}`),
  ``,
].join("\n");
const generatedOutputs = new Map([
  [join(OUT, "ts-retirement.json"), JSON.stringify(g, null, 2)],
  [join(OUT, "TS-RETIREMENT.md"), md],
  [
    join(OUT, "provenance.json"),
    JSON.stringify(provenance("ts-retirement-graph", ROOT), null, 2) + "\n",
  ],
]);
if (CHECK) {
  for (const [path, expected] of generatedOutputs) {
    let actual;
    try { actual = readFileSync(path, "utf8"); } catch {
      console.error(`ts-retirement: missing generated output ${relative(ROOT, path).replace(/\\/g, "/")}`);
      process.exitCode = 1;
      continue;
    }
    if (!generatedOutputMatches(path, actual, expected)) {
      console.error(`ts-retirement: generated output drift ${relative(ROOT, path).replace(/\\/g, "/")}`);
      process.exitCode = 1;
    }
  }
} else {
  mkdirSync(OUT, { recursive: true });
  for (const [path, content] of generatedOutputs) writeFileSync(path, content);
}
console.log(
  `ts-retirement: ${t.ts} .ts · ${t.twinned} same-stem twins (→#143 inventory) · `
  + `authority ${t.authoritativeFlips}/${t.compilerStageTotal + t.governedTwinTotal} `
  + `(${t.compilerAuthoritativeFlips}/${t.compilerStageTotal} compiler + `
  + `${t.governedAuthoritativeFlips}/${t.governedTwinTotal} governed) · `
  + `${t.compilerCore} compiler-core (fixpoint) · ${t.floor} floor (stays) · `
  + `${t.program} migration (#38) · ${t.fungiInSrc} .fungi in src`,
);
