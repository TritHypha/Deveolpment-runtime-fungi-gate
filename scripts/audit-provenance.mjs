#!/usr/bin/env node
// audit-provenance.mjs — TASK-BLD-003 (#219 standard "artifact provenance + freshness"; folds #216).
//
// Every generated artifact must (a) carry a valid provenance sidecar and
// (b) exactly match a fresh, non-mutating run of its generator. This gate flags:
//   MISSING   — the artifact was never generated (run its tool)
//   UNSTAMPED — provenance is absent, malformed, source-unbound, or names the wrong tool
//   STALE     — the declared generator's semantic check refuses the published outputs
// Filesystem mtimes are deliberately not authority: checkout, restore, and touch
// operations can make unchanged source newer than a valid artifact.
//
// --soft = report-only (exit 0). Prints `VIOLATIONS: N` for the lint-conventions umbrella. Run from repo root.
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validGeneratedProvenance } from "./lib/provenance.mjs";

const ROOT = process.cwd();
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const soft = process.argv.includes("--soft");
const asJson = process.argv.includes("--json");

// Registered generated artifacts → the exact generator check that derives them.
const ARTIFACTS = [
  {
    name: "code-index",
    file: "build/code-index/code-index.json",
    prov: "build/code-index/provenance.json",
    tool: "code-index",
    generator: "code-index.mjs",
    args: ["--check"],
  },
  {
    name: "code-registry",
    file: "build/code-registry/registry.json",
    prov: "build/code-registry/provenance.json",
    tool: "gen-code-registry",
    generator: "gen-code-registry.mjs",
    args: ["--check"],
  },
  // kb-index / kb-graph were REMOVED from provenance tracking 2026-07-17: they were untracked + gitignored
  // (they index the PRIVATE sibling KB and leaked -PRIVATE + gap-map doc TITLES into public Galerina — R&D
  // leak finding). A staleness check on a now-gitignored artifact is meaningless; the index is regenerated on
  // demand by kb-index.mjs. Freshness of the private KB is the KB repo's concern, not the public tree's.
];

const findings = [];
for (const a of ARTIFACTS) {
  const abs = join(ROOT, a.file);
  if (!existsSync(abs)) { findings.push({ name: a.name, issue: "MISSING", detail: `${a.file} not generated (run its tool / phase-close)` }); continue; }
  // Provenance sidecar (#216): complete schema, correct producer, and a real
  // source snapshot. `null` is valid for generator fixtures but not sufficient
  // for an auditable repository publication.
  let prov;
  try { prov = JSON.parse(readFileSync(join(ROOT, a.prov), "utf8")); } catch { /* absent */ }
  if (
    !validGeneratedProvenance(prov)
    || prov.tool !== a.tool
    || prov.gitCommit === null
  ) {
    findings.push({
      name: a.name,
      issue: "UNSTAMPED",
      detail: `${a.prov} is missing, malformed, source-unbound, or names the wrong generator`,
    });
  }

  const checked = spawnSync(
    process.execPath,
    [join(SCRIPT_DIR, a.generator), ...a.args],
    {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 600_000,
      env: { ...process.env, NODE_TEST_CONTEXT: undefined },
    },
  );
  if (checked.error || checked.signal || checked.status !== 0) {
    const reason = checked.error
      ? checked.error.message
      : checked.signal
        ? `terminated by ${checked.signal}`
        : `exited ${checked.status}`;
    findings.push({
      name: a.name,
      issue: "STALE",
      detail: `${a.generator} ${a.args.join(" ")} ${reason} — regenerate and re-check`,
    });
  }
}

if (asJson) {
  console.log(JSON.stringify({ tool: "provenance", artifacts: ARTIFACTS.map((a) => a.name), findings }, null, 2));
} else {
  const out = ["# BLD-003 artifact provenance + freshness\n"];
  for (const a of ARTIFACTS) {
    const f = findings.filter((x) => x.name === a.name);
    out.push(`${f.length ? "✗" : "✓"} ${a.name} — ${f.length ? f.map((x) => x.issue).join(", ") : "fresh + stamped"}`);
    for (const x of f) out.push(`    ${x.issue}: ${x.detail}`);
  }
  out.push(`\nVIOLATIONS: ${findings.length}`);
  out.push(findings.length === 0 ? "ARTIFACTS FRESH + STAMPED ✓" : "ARTIFACT PROVENANCE/FRESHNESS GAPS — regenerate or stamp.");
  console.log(out.join("\n"));
}
process.exit(soft ? 0 : Math.min(findings.length, 250));
