#!/usr/bin/env node
/**
 * Reproduce the R0 build, deterministic hash, signed #105 admission, and
 * no-ambient-import evidence for the 20 RD-0361 twins that were differential
 * at the start of the 2026-07-29 beta-v1 closure.
 *
 * This tool is read-only. It builds and admits in memory and never edits the
 * authority ledger. An empty or unknown tranche is a usage error.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const COMPILER = join(
  ROOT,
  "packages-galerina",
  "galerina-core-compiler",
  "dist",
  "index.js",
);
const WAT_EMITTER_SOURCE = join(
  ROOT,
  "packages-galerina",
  "galerina-core-compiler",
  "src",
  "wat-emitter.ts",
);
const AUTHORITY_LEDGER = join(
  ROOT,
  "docs",
  "security",
  "rd0361-authoritative-twins.json",
);
const JSON_OUT = process.argv.includes("--json");
const LIST_ONLY = process.argv.includes("--list");
const VERIFY_LEDGER = process.argv.includes("--verify-ledger");

function loadDeclaredStdlibImports() {
  const source = readFileSync(WAT_EMITTER_SOURCE, "utf8");
  const start = source.indexOf("const HOST_RUNTIME_IMPORTS: WATImport[] = [");
  const end = start < 0 ? -1 : source.indexOf("\n  ];", start);
  if (start < 0 || end < 0) {
    throw new Error(
      "cannot derive the compiler's HOST_RUNTIME_IMPORTS stdlib boundary",
    );
  }
  const block = source.slice(start, end);
  const allowed = new Set();
  const declaration =
    /\{\s*module:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*effect:\s*"(stdlib\.[^"]+)"/g;
  for (const match of block.matchAll(declaration)) {
    allowed.add(`${match[1]}\0${match[2]}`);
  }
  if (allowed.size === 0) {
    throw new Error("derived stdlib import boundary is empty");
  }
  return allowed;
}

function isDeclaredStdlibImport(entry, allowed) {
  return allowed.has(`${entry.module}\0${entry.name}`);
}

function hashMatchesLedger(actual, expected) {
  return (
    typeof actual === "string" &&
    typeof expected === "string" &&
    /^[a-f0-9]{64}$/.test(actual) &&
    /^[a-f0-9]{64}$/.test(expected) &&
    actual === expected
  );
}

if (process.argv.includes("--self-test")) {
  const allowed = loadDeclaredStdlibImports();
  const checks = [
    [
      "source-declared stdlib helper is allowed",
      isDeclaredStdlibImport(
        { module: "host", name: "__str_eq", kind: "function" },
        allowed,
      ),
    ],
    [
      "network authority is rejected",
      !isDeclaredStdlibImport(
        { module: "host", name: "net_fetch", kind: "function" },
        allowed,
      ),
    ],
    [
      "unknown double-underscore helper is rejected",
      !isDeclaredStdlibImport(
        { module: "host", name: "__ambient_mystery", kind: "function" },
        allowed,
      ),
    ],
    [
      "ledger hash mismatch is rejected",
      !hashMatchesLedger("a".repeat(64), "b".repeat(64)),
    ],
  ];
  for (const [name, passed] of checks) {
    console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
  }
  process.exit(checks.every(([, passed]) => passed) ? 0 : 1);
}

const CANDIDATES = [
  ["app-kernel", "galerina-framework-app-kernel", "fuse-admission", "fuse-admission"],
  ["app-kernel", "galerina-framework-app-kernel", "kernel", "kernel"],
  ["app-kernel", "galerina-framework-app-kernel", "package-admission", "package-admission"],
  ["app-kernel", "galerina-framework-app-kernel", "registry-index", "registry-index"],
  ["app-kernel", "galerina-framework-app-kernel", "route-defaults", "route-defaults"],
  ["app-kernel", "galerina-framework-app-kernel", "secret-gate", "secret-gate"],
  ["tower-citizen", "galerina-tower-citizen", "governance-decisions", "governance-decisions"],
  ["tower-citizen", "galerina-tower-citizen", "inference-governance", "infer-gov"],
  ["tower-citizen", "galerina-tower-citizen", "pq-admission-policy", "pq-admit"],
  ["tower-citizen", "galerina-tower-citizen", "transport-fsm", "transport-fsm"],
  ["core-runtime", "galerina-core-runtime", "passive-plan-replay-admission", "plan-admit"],
  ["sentinel-io", "galerina-core-sentinel-io", "hardened-border", "hardened-border"],
  ["sentinel-io", "galerina-core-sentinel-io", "manifest-validator", "manifest-validator"],
  ["core-network", "galerina-core-network", "admission-feedback", "admission-feedback"],
  ["core-network", "galerina-core-network", "b8-admission", "b8-admission"],
  ["core-network", "galerina-core-network", "cert-gate", "cert-gate"],
  ["core-network", "galerina-core-network", "cors-policy", "cors-policy"],
  ["core-network", "galerina-core-network", "defensive-controls", "defensive-controls"],
  ["core-network", "galerina-core-network", "egress-guard", "egress-guard"],
  ["core-network", "galerina-core-network", "inbound-guard", "inbound-guard"],
].map(([tranche, pkg, stem, module]) => ({
  tranche,
  pkg,
  stem,
  module,
  path: `packages-galerina/${pkg}/src/self-hosted/${stem}.fungi`,
}));

const EXISTING_AUTHORITY = [
  ["T1", "galerina-core-sentinel-time", "synchronization-gate", "sync-gate"],
  ["T1", "galerina-core-sentinel-power", "power-governor", "power-governor"],
  ["T1", "galerina-core-sentinel-state", "cold-boot", "cold-boot"],
  ["T1", "galerina-core-sentinel-egress", "audit-egress", "audit-egress"],
  ["T2", "galerina-core-sentinel-memory", "memory-validator", "memory-validator"],
  ["T2", "galerina-core-sentinel-memory", "pool-allocation-guard", "pool-allocation-guard"],
  ["T2", "galerina-core-sentinel-memory", "pool-policy", "pool-policy"],
  ["T2", "galerina-core-sentinel-memory", "segmentation-guard", "segmentation-guard"],
  ["T2", "galerina-core-sentinel-memory", "trit-buffer-guard", "trit-buffer-guard"],
].map(([tranche, pkg, stem, module]) => ({
  tranche,
  pkg,
  stem,
  module,
  path: `packages-galerina/${pkg}/src/self-hosted/${stem}.fungi`,
}));
const ALL_TWINS = [...EXISTING_AUTHORITY, ...CANDIDATES];

const trancheArgIndex = process.argv.indexOf("--tranche");
if (trancheArgIndex >= 0 && process.argv[trancheArgIndex + 1] === undefined) {
  console.error("gather-r4-twin-hashes: --tranche requires a name");
  process.exit(2);
}
const requestedTranche =
  trancheArgIndex >= 0 ? process.argv[trancheArgIndex + 1] : undefined;
const knownTranches = [...new Set(CANDIDATES.map((row) => row.tranche))];
if (VERIFY_LEDGER && requestedTranche !== undefined) {
  console.error(
    "gather-r4-twin-hashes: --verify-ledger cannot be combined with --tranche",
  );
  process.exit(2);
}
if (
  requestedTranche !== undefined &&
  !knownTranches.includes(requestedTranche)
) {
  console.error(
    `gather-r4-twin-hashes: unknown tranche "${requestedTranche}" ` +
      `(expected one of ${knownTranches.join(", ")})`,
  );
  process.exit(2);
}

let selected;
if (VERIFY_LEDGER) {
  let ledger;
  try {
    ledger = JSON.parse(readFileSync(AUTHORITY_LEDGER, "utf8"));
  } catch (error) {
    console.error(
      `gather-r4-twin-hashes: authority ledger is unreadable (${error.message})`,
    );
    process.exit(1);
  }
  if (!ledger || !Array.isArray(ledger.twins) || ledger.twins.length === 0) {
    console.error("gather-r4-twin-hashes: authority ledger has no twins");
    process.exit(1);
  }
  const seen = new Set();
  selected = ledger.twins.map((entry) => {
    const path = `${entry.dir}/${entry.file}`;
    if (seen.has(path)) {
      console.error(`gather-r4-twin-hashes: duplicate ledger entry ${path}`);
      process.exit(1);
    }
    seen.add(path);
    const definition = ALL_TWINS.find((row) => row.path === path);
    if (definition === undefined) {
      console.error(
        `gather-r4-twin-hashes: ledger entry has no build definition ${path}`,
      );
      process.exit(1);
    }
    if (
      typeof entry.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(entry.sha256)
    ) {
      console.error(
        `gather-r4-twin-hashes: ledger entry has invalid sha256 ${path}`,
      );
      process.exit(1);
    }
    return { ...definition, ledgerSha256: entry.sha256 };
  });
} else {
  selected =
    requestedTranche === undefined
      ? CANDIDATES
      : CANDIDATES.filter((row) => row.tranche === requestedTranche);
}
if (selected.length === 0) {
  console.error("gather-r4-twin-hashes: selected tranche is empty");
  process.exit(2);
}

const counts = Object.fromEntries(
  knownTranches.map((name) => [
    name,
    CANDIDATES.filter((row) => row.tranche === name).length,
  ]),
);

if (LIST_ONLY) {
  const report = { tool: "gather-r4-twin-hashes", total: selected.length, counts, rows: selected };
  if (JSON_OUT) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    for (const row of selected) {
      console.log(`${row.tranche.padEnd(14)} ${row.path} module=${row.module}`);
    }
    console.log(`total: ${selected.length}`);
  }
  process.exit(0);
}

if (!existsSync(COMPILER)) {
  console.error(
    "gather-r4-twin-hashes: compiler dist is missing; rebuild " +
      "packages-galerina/galerina-core-compiler first",
  );
  process.exit(1);
}

const L = await import(pathToFileURL(COMPILER).href);
const declaredStdlibImports = loadDeclaredStdlibImports();
const rows = [];

for (const candidate of selected) {
  const absolutePath = join(ROOT, ...candidate.path.split("/"));
  if (!existsSync(absolutePath)) {
    rows.push({
      ...candidate,
      clean: false,
      error: "candidate source is missing",
    });
    continue;
  }

  let source = readFileSync(absolutePath, "utf8");
  if (source.charCodeAt(0) === 0xfeff) source = source.slice(1);

  try {
    const program = L.parseProgram(source, `${candidate.stem}.fungi`);
    const r0Errors = (program.diagnostics ?? []).filter(
      (diagnostic) => diagnostic.severity === "error",
    ).length;
    const effects = L.checkEffects(program.flows, program.ast);
    const { gir } = L.emitGIR(program.ast, program.flows, effects);
    const wat = L.renderWAT(
      L.buildWATModuleFromGIR(
        gir,
        undefined,
        candidate.module,
        program.ast,
        true,
      ),
    );
    const assembly = await L.assembleWAT(wat);

    let bytes = null;
    let sha256 = null;
    let imports = [];
    let ambientImports = [];
    let admitted = false;
    let ledgerHashMatches = null;
    let error = null;

    if (!assembly.valid || assembly.diagnostics.length > 0) {
      error =
        "unfaithful assembly: " +
        assembly.diagnostics.map((diagnostic) => diagnostic.message).join("; ");
    } else {
      bytes = assembly.wasm.length;
      sha256 = L.wasmHash(assembly.wasm);
      ledgerHashMatches =
        candidate.ledgerSha256 === undefined
          ? null
          : hashMatchesLedger(sha256, candidate.ledgerSha256);
      const module = new WebAssembly.Module(assembly.wasm);
      imports = WebAssembly.Module.imports(module).map((entry) => ({
        module: entry.module,
        name: entry.name,
        kind: entry.kind,
      }));
      ambientImports = imports.filter(
        (entry) => !isDeclaredStdlibImport(entry, declaredStdlibImports),
      );
      if (ambientImports.length > 0) {
        error = `ambient WebAssembly imports present (${ambientImports.length})`;
      } else if (ledgerHashMatches === false) {
        error =
          `ledger hash mismatch (expected ${candidate.ledgerSha256}, ` +
          `derived ${sha256})`;
      } else {
        const keypair = L.generateRunnerKeypair();
        const attestation = L.signWasm(
          assembly.wasm,
          keypair.privateKeyPem,
          "dev",
        );
        await L.admitAndInstantiate({
          wasm: assembly.wasm,
          attestation,
          policy: {
            requireSigned: true,
            publicKeyPem: keypair.publicKeyPem,
          },
          host: L.createHostRuntime(),
        });
        admitted = true;
      }
    }

    const clean =
      r0Errors === 0 &&
      assemblyFaithful &&
      ambientImports.length === 0 &&
      ledgerHashMatches !== false &&
      admitted;
    rows.push({
      ...candidate,
      r0Errors,
      bytes,
      sha256,
      assemblyFaithful,
      imports,
      ambientImports,
      ledgerHashMatches,
      admitted,
      clean,
      error,
    });
  } catch (caught) {
    rows.push({
      ...candidate,
      clean: false,
      error: caught instanceof Error ? caught.message : String(caught),
    });
  }
}

const allClean = rows.length === selected.length && rows.every((row) => row.clean);
const report = {
  tool: "gather-r4-twin-hashes",
  tranche: requestedTranche ?? "all",
  verifyLedger: VERIFY_LEDGER,
  total: rows.length,
  allClean,
  rows,
};

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(
    `RD-0361 ${report.tranche} evidence: deterministic hash, signed #105 admission, closed stdlib imports only`,
  );
  for (const row of rows) {
    console.log(
      `  ${row.clean ? "OK  " : "FAIL"} ${row.stem.padEnd(31)} ` +
        `bytes=${String(row.bytes ?? "-").padStart(5)} ` +
        `stdlib-imports=${row.imports?.length ?? "-"} ` +
        `ambient-imports=${row.ambientImports?.length ?? "-"} ` +
        `admitted=${row.admitted === true ? "yes" : "NO"}`,
    );
    console.log(`      sha256=${row.sha256 ?? "-"}${row.error ? ` error=${row.error}` : ""}`);
  }
  console.log(
    `${allClean ? "PASS" : "FAIL"}: ${rows.filter((row) => row.clean).length}/${rows.length} clean`,
  );
}

process.exitCode = allClean ? 0 : 1;
