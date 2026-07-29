#!/usr/bin/env node
// audit-stray-docs.mjs — STRAY / STALE Markdown tracker (owner 2026-06-23). Surfaces every *.md that lives
// OUTSIDE docs/ (e.g. README.md scattered across package folders, some out of date) without a manual grep.
// A re-runnable TOKEN-SAVER: READS the tree (+ build/kb-graph output if present), never recomputes the graph.
//
//   node scripts/audit-stray-docs.mjs          -> grouped stray list + mtime + duplicate-basename report + stdout summary
//   node scripts/audit-stray-docs.mjs --json    -> machine-readable JSON
//   node scripts/audit-stray-docs.mjs --root <dir> -> inspect a hermetic fixture
//
// Reports: (a) count + list of stray *.md grouped by top-level dir, with mtime so stale ones stand out;
// (b) DUPLICATE basenames (how many README.md exist + where) — the owner's specific concern;
// (c) if build/kb-graph/kb-graph.json exists, surfaces its orphan + broken-link counts.
// Informational only — exit 0 ALWAYS, handles missing files gracefully.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, basename, resolve } from "node:path";

const argv = process.argv.slice(2);
const rootIndex = argv.indexOf("--root");
if (rootIndex >= 0 && (!argv[rootIndex + 1] || argv[rootIndex + 1].startsWith("--"))) {
  console.error("audit-stray-docs: --root requires a value.");
  process.exit(2);
}
const ROOT = rootIndex >= 0 ? resolve(argv[rootIndex + 1]) : process.cwd();
const asJson = argv.includes("--json");
const summaryOnly = argv.includes("--summary"); // one-line heartbeat for the periodic Stop hook
// Stray = *.md NOT under docs/. Skip the noise dirs (vendored / generated / VCS).
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".git", ".pytest_cache", "docs", ".cache", "coverage", "out", "target", ".next", ".turbo"]);
const STALE_DAYS = 120; // flag anything not touched in this many days
const now = Date.now();

function walk(dir, acc) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name) || e.name.startsWith(".")) continue; // skip noise + dotdirs
      walk(full, acc);
    } else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) {
      let mtime = 0;
      try { mtime = statSync(full).mtimeMs; } catch { /* race / perms — keep mtime 0 */ }
      acc.push({ rel: relative(ROOT, full).replace(/\\/g, "/"), base: e.name, mtime });
    }
  }
  return acc;
}

const stray = walk(ROOT, []);
const ageDays = (m) => (m ? Math.floor((now - m) / 86400000) : null);
const fmtDate = (m) => (m ? new Date(m).toISOString().slice(0, 10) : "????-??-??");
const topDir = (rel) => (rel.includes("/") ? rel.slice(0, rel.indexOf("/")) : "(repo root)");

// (a) group by top-level dir
const byDir = new Map();
for (const f of stray) {
  const t = topDir(f.rel);
  if (!byDir.has(t)) byDir.set(t, []);
  byDir.get(t).push(f);
}
for (const arr of byDir.values()) arr.sort((a, b) => a.mtime - b.mtime); // oldest (stalest) first
const dirsSorted = [...byDir.entries()].sort((a, b) => b[1].length - a[1].length);

// (b) duplicate basenames — owner's specific concern (how many README.md, where)
const byBase = new Map();
for (const f of stray) {
  if (!byBase.has(f.base)) byBase.set(f.base, []);
  byBase.get(f.base).push(f);
}
const dupes = [...byBase.entries()].filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length);

const stale = stray.filter((f) => ageDays(f.mtime) !== null && ageDays(f.mtime) >= STALE_DAYS).sort((a, b) => a.mtime - b.mtime);

// (c) kb-graph orphan + broken-link counts (if the graph was built) — READ, never recompute
let kb = null;
try {
  const g = JSON.parse(readFileSync(join(ROOT, "build/kb-graph/kb-graph.json"), "utf8"));
  const s = g.stats || {};
  kb = {
    totalDocs: s.totalDocs ?? (Array.isArray(g.nodes) ? g.nodes.length : null),
    orphanCount: s.orphanCount ?? (Array.isArray(g.orphans) ? g.orphans.length : null),
    staleLinkCount: s.staleLinkCount ?? (Array.isArray(g.staleLinks) ? g.staleLinks.length : null),
    orphans: Array.isArray(g.orphans) ? g.orphans.slice(0, 8) : [],
    staleLinks: Array.isArray(g.staleLinks) ? g.staleLinks.slice(0, 8) : [],
    builtAt: null,
  };
  try { kb.builtAt = JSON.parse(readFileSync(join(ROOT, "build/kb-graph/provenance.json"), "utf8")).builtAt; } catch { /* no sidecar */ }
} catch { /* kb-graph not built — section omitted */ }

if (asJson) {
  console.log(JSON.stringify({
    generated: "audit-stray-docs",
    authority: "report-only",
    strayCount: stray.length,
    byDir: dirsSorted.map(([dir, arr]) => ({ dir, count: arr.length, files: arr.map((f) => ({ rel: f.rel, mtime: fmtDate(f.mtime), ageDays: ageDays(f.mtime) })) })),
    duplicateBasenames: dupes.map(([base, v]) => ({ base, count: v.length, paths: v.map((f) => f.rel) })),
    staleCount: stale.length, staleThresholdDays: STALE_DAYS,
    stale: stale.map((f) => ({ rel: f.rel, mtime: fmtDate(f.mtime), ageDays: ageDays(f.mtime) })),
    kbGraph: kb,
  }, null, 2));
  process.exit(0);
}

// ── human report ───────────────────────────────────────────────────────────────
const out = [];
out.push(`audit-stray-docs: ${stray.length} *.md outside docs/ · ${dirsSorted.length} top-dirs · ${dupes.length} duplicate basename(s) · ${stale.length} stale (>${STALE_DAYS}d)` + (kb ? ` · kb-graph: ${kb.orphanCount} orphans / ${kb.staleLinkCount} broken links` : ""));
if (summaryOnly) { console.log(out[0]); process.exit(0); }

out.push(`\n## (a) Stray *.md by top-level dir  (oldest first; ⚠ = >${STALE_DAYS}d stale)`);
for (const [dir, arr] of dirsSorted) {
  out.push(`\n  ${dir}/  (${arr.length})`);
  for (const f of arr.slice(0, 20)) {
    const d = ageDays(f.mtime);
    const flag = d !== null && d >= STALE_DAYS ? " ⚠" : "";
    out.push(`    ${fmtDate(f.mtime)}  ${String(d ?? "?").padStart(4)}d  ${f.rel}${flag}`);
  }
  if (arr.length > 20) out.push(`    … and ${arr.length - 20} more`);
}

out.push(`\n## (b) Duplicate basenames (owner concern — scattered READMEs etc.)`);
if (dupes.length === 0) out.push(`  none — every stray .md has a unique filename`);
for (const [base, v] of dupes) {
  out.push(`\n  ${base}  ×${v.length}`);
  for (const f of [...v].sort((a, b) => a.mtime - b.mtime)) out.push(`    ${fmtDate(f.mtime)}  ${f.rel}`);
}

out.push(`\n## (c) KB-graph orphans + broken links`);
if (!kb) {
  out.push(`  build/kb-graph/kb-graph.json not found — run the kb-graph builder to populate this section.`);
} else {
  out.push(`  ${kb.totalDocs} graphed docs · ${kb.orphanCount} orphans (no inbound links) · ${kb.staleLinkCount} broken links` + (kb.builtAt ? `  (built ${kb.builtAt.slice(0, 10)})` : ""));
  if (kb.orphans.length) out.push(`    orphans (first ${kb.orphans.length}): ${kb.orphans.join(", ")}${kb.orphanCount > kb.orphans.length ? ", …" : ""}`);
  if (kb.staleLinks.length) {
    out.push(`    broken links (first ${kb.staleLinks.length}):`);
    for (const s of kb.staleLinks) out.push(`      ${s}`);
  }
}

console.log(out.join("\n"));
process.exit(0);
