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
import { createHash } from "node:crypto";
import {
  lstatSync,
  readFileSync,
  realpathSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";
import {
  analyzeTopologyRecords,
  loadTopologyBaseline,
  scanWorkspace,
} from "./audit-flat-package-topology.mjs";
import { findCorpus, findTrackedAt } from "./lib/find-files.mjs"; // THE shared graph∪git finder (owner rule: no per-tool globs)
import {
  generatedOutputMatches,
  provenance,
} from "./lib/provenance.mjs";

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT_INDEX = process.argv.indexOf("--root");
if (
  ROOT_INDEX >= 0
  && (
    !process.argv[ROOT_INDEX + 1]
    || process.argv[ROOT_INDEX + 1].startsWith("--")
  )
) {
  console.error("ts-retirement: --root requires a value");
  process.exit(2);
}
const ROOT = ROOT_INDEX >= 0 && process.argv[ROOT_INDEX + 1]
  ? resolve(process.argv[ROOT_INDEX + 1])
  : DEFAULT_ROOT;
const OUT = join(ROOT, "build", "ts-retirement");
const CHECK = process.argv.includes("--check");
const JSON_OUT = process.argv.includes("--json");
const TERMINAL_CHECK = process.argv.includes("--terminal-check");
const POST_SLIDE = process.argv.includes("--post-slide");

// The bounded bootstrap-TCB FLOOR (census handover §2): these remain .ts/native
// until an independently admitted SLIDE-native replacement can carry the same
// host/crypto/algorithm contract. They are not "unfinished" beta work, but they
// are not a permanent TypeScript exemption either.
const FLOOR_PACKAGES = new Set(["galerina-substrate-math", "galerina-devtools-graph-algorithms", "galerina-core-security"]);
const COMPILER_AUTHORITY_LEDGER =
  "docs/security/rd0528-compiler-authoritative-stages.json";
const GOVERNED_AUTHORITY_LEDGER =
  "docs/security/rd0361-authoritative-twins.json";
const POST_SLIDE_AUTHORITY_LEDGER =
  "docs/security/post-slide-execution-authority.json";
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

const SOURCE_AUTHORITY_FIELDS = new Set([
  "path", "ownerPackage", "tranche", "authority", "sourceSha256",
  "evidencePath", "evidenceSha256",
]);
const HOST_AUTHORITY_FIELDS = new Set([
  "path", "ownerPackage", "boundary", "authority", "sourceSha256",
  "evidencePath", "evidenceSha256",
]);
const HOST_SOURCE_EXTENSION = /\.(?:[cm]?[jt]s|rs|fungi)$/;
const HOST_BOUNDARY_PATTERN = /(?:\bnode:(?:fs|net|tls|dgram|child_process|os|crypto|worker_threads)\b|\bprocess\.(?:env|argv|cwd|platform|exit)\b|\b(?:dlopen|process\.dlopen|node-gyp)\b|\.node["']|\bnative\.call\b|\bstd::(?:fs|net|process)\b)/;

function isRuntimeHostCandidate(path) {
  if (
    !HOST_SOURCE_EXTENSION.test(path)
    || path.endsWith(".d.ts")
    || /\.[cm]?ts$/.test(path)
  ) return false;
  if (/^test_/.test(basename(path))) return false;
  if (
    /\/(?:tests?|test-fixtures|fixtures|docs?|examples?|benchmarks?|scripts|results|coverage|dist)\//.test(path)
    || /\.(?:test|spec)\.[cm]?[jt]s$/.test(path)
  ) return false;
  const segments = path.split("/");
  return segments.length === 3
    || segments[2] === "src"
    || segments[2] === "host"
    || segments[2] === "runtime";
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function packageOf(path) {
  return path.split("/")[1] ?? "";
}

function trancheOf(pkg) {
  if (pkg === "galerina-core-compiler") return "T0-compiler";
  if (pkg === "galerina-framework-app-kernel" || pkg === "galerina-core-security") {
    return "T1-trust-root";
  }
  if (
    pkg.startsWith("galerina-core-")
    || pkg === "galerina-tower-citizen"
    || pkg === "galerina-tri-pipe"
  ) return "T2-runtime-core";
  return "T3-package-graph";
}

function readRegularFile(root, relativePath, label, violations) {
  const absolute = join(root, relativePath);
  try {
    const stat = lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      violations.push(`${label} is not a regular non-symlink file: ${relativePath}`);
      return null;
    }
    const realRoot = realpathSync(root);
    const realFile = realpathSync(absolute);
    const containment = relative(realRoot, realFile);
    if (
      containment === ".."
      || containment.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)
      || isAbsolute(containment)
    ) {
      violations.push(`${label} escapes the repository root: ${relativePath}`);
      return null;
    }
    return readFileSync(absolute);
  } catch (error) {
    violations.push(`${label} is missing or unreadable: ${relativePath} (${error.message})`);
    return null;
  }
}

function exactFields(entry, expected) {
  const actual = Object.keys(entry).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length
    && actual.every((field, index) => field === wanted[index]);
}

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
    || normalized.includes(":")
    || /[\0-\x1f\x7f]/.test(normalized)
    || segments.some((segment) =>
      segment.length === 0
      || segment === "."
      || segment === ".."
      || /[. ]$/.test(segment))
  ) {
    throw new Error(
      `authority ledger ${label} must be an unambiguous repository-relative path`,
    );
  }
  return normalized;
}

function loadPostSlideAuthority(root, tracked, fungiPaths, hostBridgePaths) {
  const violations = [];
  let ledger;
  try {
    ledger = JSON.parse(
      readFileSync(join(root, POST_SLIDE_AUTHORITY_LEDGER), "utf8"),
    );
  } catch (error) {
    return {
      executedFungi: new Set(),
      ownedHostBridges: new Set(),
      violations: [
        `post-SLIDE authority ledger is missing or malformed: ${error.message}`,
      ],
    };
  }
  if (
    ledger?.schemaVersion !== 1
    || !Array.isArray(ledger.fungiSources)
    || !Array.isArray(ledger.hostBridges)
    || !exactFields(
      ledger,
      new Set(["schemaVersion", "fungiSources", "hostBridges"]),
    )
  ) {
    return {
      executedFungi: new Set(),
      ownedHostBridges: new Set(),
      violations: [
        "post-SLIDE authority ledger has an unknown or malformed schema",
      ],
    };
  }

  const validateEntries = ({
    entries,
    kind,
    allowedPaths,
    expectedFields,
    expectedAuthority,
  }) => {
    const admitted = new Set();
    const seen = new Set();
    for (const [index, entry] of entries.entries()) {
      const label = `${POST_SLIDE_AUTHORITY_LEDGER} ${kind}[${index}]`;
      const violationStart = violations.length;
      if (
        !entry
        || typeof entry !== "object"
        || Array.isArray(entry)
        || !exactFields(entry, expectedFields)
      ) {
        violations.push(`${label} has missing or unknown fields`);
        continue;
      }
      let path;
      let evidencePath;
      try {
        path = authorityRelativePath(entry.path, `${label}.path`);
        evidencePath = authorityRelativePath(
          entry.evidencePath,
          `${label}.evidencePath`,
        );
      } catch (error) {
        violations.push(error.message);
        continue;
      }
      if (seen.has(path)) {
        violations.push(`${label} duplicates ${path}`);
        continue;
      }
      seen.add(path);
      const owner = packageOf(path);
      if (!allowedPaths.has(path)) {
        violations.push(`${label} names stale or out-of-scope source ${path}`);
      }
      if (entry.ownerPackage !== owner || owner.length === 0) {
        violations.push(`${label} has incorrect ownerPackage`);
      }
      if (entry.authority !== expectedAuthority) {
        violations.push(`${label} has non-authorizing authority state`);
      }
      const descriptor = kind === "fungiSources"
        ? entry.tranche
        : entry.boundary;
      if (typeof descriptor !== "string" || descriptor.length === 0) {
        violations.push(`${label} has no bounded descriptor`);
      }
      if (!/^[a-f0-9]{64}$/.test(entry.sourceSha256)) {
        violations.push(`${label} has malformed sourceSha256`);
      }
      if (!/^[a-f0-9]{64}$/.test(entry.evidenceSha256)) {
        violations.push(`${label} has malformed evidenceSha256`);
      }
      if (!tracked.has(path)) {
        violations.push(`${label} source is not tracked: ${path}`);
      }
      if (!tracked.has(evidencePath)) {
        violations.push(`${label} evidence is not tracked: ${evidencePath}`);
      }
      const sourceBytes = readRegularFile(
        root,
        path,
        `${label} source`,
        violations,
      );
      const evidenceBytes = readRegularFile(
        root,
        evidencePath,
        `${label} evidence`,
        violations,
      );
      if (sourceBytes !== null && sha256(sourceBytes) !== entry.sourceSha256) {
        violations.push(`${label} source digest does not match ${path}`);
      }
      if (
        evidenceBytes !== null
        && sha256(evidenceBytes) !== entry.evidenceSha256
      ) {
        violations.push(
          `${label} evidence digest does not match ${evidencePath}`,
        );
      }
      if (violations.length === violationStart) admitted.add(path);
    }
    return admitted;
  };

  return {
    executedFungi: validateEntries({
      entries: ledger.fungiSources,
      kind: "fungiSources",
      allowedPaths: fungiPaths,
      expectedFields: SOURCE_AUTHORITY_FIELDS,
      expectedAuthority: "executed",
    }),
    ownedHostBridges: validateEntries({
      entries: ledger.hostBridges,
      kind: "hostBridges",
      allowedPaths: hostBridgePaths,
      expectedFields: HOST_AUTHORITY_FIELDS,
      expectedAuthority: "owned",
    }),
    violations,
  };
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
  const allTrackedTsPaths = findTrackedAt(
    root,
    "packages-galerina/**/*.ts",
  )
    .filter((path) => path.startsWith("packages-galerina/"))
    .sort();
  const trackedRepositoryFiles = new Set(findTrackedAt(root));
  const allTrackedPackageFiles = [...trackedRepositoryFiles]
    .filter((path) => path.startsWith("packages-galerina/"))
    .sort();
  const allTrackedFungiPaths = [...fungi].sort();
  const allTrackedFungi = new Set(allTrackedFungiPaths);
  const hostScanViolations = [];
  const hostBridgePaths = allTrackedPackageFiles.filter((path) => {
    if (!isRuntimeHostCandidate(path)) return false;
    const bytes = readRegularFile(
      root,
      path,
      "host-boundary scan source",
      hostScanViolations,
    );
    if (bytes === null) return false;
    // After TypeScript retirement, every non-Fungi runtime source is a host
    // boundary regardless of whether a lexical import happens to reveal it.
    // Fungi stays in the source ledger unless it explicitly crosses native.call.
    return !path.endsWith(".fungi")
      || HOST_BOUNDARY_PATTERN.test(bytes.toString("utf8"));
  });
  const hostBridges = new Set(hostBridgePaths);
  const pkgOf = packageOf;
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
  const postSlideAuthority = loadPostSlideAuthority(
    root,
    trackedRepositoryFiles,
    allTrackedFungi,
    hostBridges,
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
  // The earlier R4 ledgers authorize shadow-bake decisions, but the terminal
  // profile deliberately does not inherit that authority. Post-SLIDE source
  // must be re-admitted with its exact source and evidence digests here.
  const executedFungi = postSlideAuthority.executedFungi;
  const unexecutedFungiPaths = allTrackedFungiPaths.filter(
    (path) => !executedFungi.has(path),
  );
  const unownedHostBridgePaths = hostBridgePaths.filter(
    (path) => !postSlideAuthority.ownedHostBridges.has(path),
  );
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
  const retirementLedger = allTrackedTsPaths.map((path) => {
    const pkg = pkgOf(path);
    const replacement = path.endsWith(".ts")
      ? `${path.slice(0, -3)}.fungi`
      : null;
    const hasReplacement = replacement !== null
      && allTrackedFungi.has(replacement);
    const authoritative = hasReplacement && executedFungi.has(replacement);
    return {
      path,
      package: pkg,
      dependencyTranche: trancheOf(pkg),
      fungiReplacement: hasReplacement ? replacement : null,
      executionAuthority: authoritative ? "executed" : "none",
      legacyShadowAuthority: hasReplacement && (
        compilerAuthority.has(replacement)
        || governedAuthority.has(replacement)
      ),
      declaredFloor: FLOOR_PACKAGES.has(pkg)
        ? "bounded-bootstrap-floor"
        : null,
      replacementOwner: pkg,
      evidenceStatus: authoritative
        ? "authority-ledger-present"
        : hasReplacement
          ? "candidate-only-unexecuted"
          : "replacement-absent",
      retirementState: "physical-typescript-present",
    };
  });

  const topologyViolations = [];
  let topology = {
    identityCount: 0,
    deferredNested: [],
    nodeModulesPaths: [],
  };
  try {
    const baseline = loadTopologyBaseline(root);
    const scan = scanWorkspace(join(root, "packages-galerina"));
    const result = analyzeTopologyRecords({
      records: scan.records,
      legacyNestedNativeManifests: baseline.legacyNestedNativeManifests,
      nodeModulesPaths: scan.nodeModulesPaths,
      postSlide: true,
    });
    topology = {
      identityCount: result.identityCount,
      deferredNested: result.deferredNested,
      nodeModulesPaths: scan.nodeModulesPaths,
    };
    topologyViolations.push(...scan.scanViolations, ...result.violations);
  } catch (error) {
    topologyViolations.push(
      `post-SLIDE topology evidence is missing or malformed: ${error.message}`,
    );
  }

  const postSlideViolations = [
    ...hostScanViolations,
    ...postSlideAuthority.violations,
    ...topologyViolations,
  ];
  if (allTrackedTsPaths.length > 0) {
    postSlideViolations.push(
      `post-SLIDE retirement requires zero tracked package TypeScript paths; found ${allTrackedTsPaths.length}`,
    );
  }
  for (const path of unexecutedFungiPaths) {
    postSlideViolations.push(
      `post-SLIDE retirement forbids unexecuted Fungi source '${path}'`,
    );
  }
  for (const path of unownedHostBridgePaths) {
    postSlideViolations.push(
      `post-SLIDE retirement forbids unowned host bridge '${path}'`,
    );
  }
  const postSlideReady = postSlideViolations.length === 0;
  return {
    generated: "ts-retirement-graph",
    terminalReady: allTrackedTsPaths.length === 0,
    postSlideReady,
    postSlideViolations,
    allTrackedTsPaths,
    unexecutedFungiPaths,
    unownedHostBridgePaths,
    retirementLedger,
    topology,
    totals: {
      ts: ts.length,
      allTrackedTs: allTrackedTsPaths.length,
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
      allTrackedFungi: allTrackedFungiPaths.length,
      executedFungi: executedFungi.size,
      unexecutedFungi: unexecutedFungiPaths.length,
      hostBridges: hostBridgePaths.length,
      ownedHostBridges: postSlideAuthority.ownedHostBridges.size,
      unownedHostBridges: unownedHostBridgePaths.length,
      nestedNativePackages: topologyViolations.filter((item) =>
        item.includes("nested native")
      ).length,
      nodeModulesTrees: topology.nodeModulesPaths.length,
    },
    retirementPaths: {
      twinned: "→ #143 R4 authority ledger (checked .fungi authority or retained .ts differential oracle)",
      compilerCore: "→ bootstrap fixpoint (the .fungi stages are compiled BY this .ts — retires last, post-v1)",
      floor: "→ post-beta admitted SLIDE replacement (bounded bootstrap TCB until equivalent crypto/host/algorithm evidence exists)",
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
  ok(!g.retirementPaths.floor.includes("NEVER") && g.retirementPaths.floor.includes("SLIDE"),
    "bounded bootstrap floor has an admitted-SLIDE retirement path rather than a permanent TypeScript exemption");
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
if (JSON_OUT) {
  console.log(JSON.stringify(g, null, 2));
  if (POST_SLIDE && !g.postSlideReady) process.exitCode = 1;
  if (TERMINAL_CHECK && !g.terminalReady) process.exitCode = 1;
  process.exit(process.exitCode ?? 0);
}
if (POST_SLIDE) {
  if (!g.postSlideReady) {
    console.error(
      `ts-retirement: post-SLIDE refusal — ${g.postSlideViolations.length} violation(s)`,
    );
    for (const violation of g.postSlideViolations) {
      console.error(`  ${violation}`);
    }
    process.exit(1);
  }
  console.log(
    "ts-retirement: post-SLIDE gate GREEN (physical, execution, host and topology authority verified)",
  );
  process.exit(0);
}
if (TERMINAL_CHECK) {
  if (!g.terminalReady) {
    console.error(
      `ts-retirement: terminal refusal — ${t.allTrackedTs} tracked package TypeScript path(s) remain`,
    );
    for (const path of g.allTrackedTsPaths) console.error(`  ${path}`);
    process.exit(1);
  }
  console.log("ts-retirement: terminal package TypeScript gate GREEN (0 tracked paths)");
  process.exit(0);
}
const md = [
  `# .ts retirement graph (${t.allTrackedTs} tracked package .ts; ${t.ts} in src)`,
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
  `Terminal physical retirement: ${g.terminalReady ? "GREEN" : `OPEN — ${t.allTrackedTs} tracked package TypeScript paths remain`}.`,
  ``,
  `Post-SLIDE authority: ${g.postSlideReady ? "GREEN" : "OPEN"} — ${t.executedFungi}/${t.allTrackedFungi} production Fungi sources digest-admitted; ${t.ownedHostBridges}/${t.hostBridges} host boundaries owned; ${t.nodeModulesTrees} node_modules trees.`,
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
  + `${t.compilerCore} compiler-core (fixpoint) · ${t.floor} bootstrap floor (retires after admitted SLIDE replacement) · `
  + `${t.program} migration (#38) · ${t.fungiInSrc} .fungi in src`,
);
