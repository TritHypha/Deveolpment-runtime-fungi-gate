#!/usr/bin/env node
// =============================================================================
// memory-graph.mjs — index the auto-memory (MEMORY.md + topic files) as a tag/link GRAPH.
//
// Owner request (2026-06-27): keep MEMORY.md tiny — put detail in topic files, reference only
// subject + tags in the index, and build a dev tool to index this. This is the memory analogue of
// scripts/kb-index.mjs (which indexes the KB prose). It lets a session FIND a memory by tag/subject/
// link instead of loading the whole index, AND audits memory health (dangling links, orphans, dupes)
// so the index can be pruned and kept small.
//
// MODES
//   BUILD:  node scripts/memory-graph.mjs              -> writes <dir>/MEMORY-GRAPH.json + prints a health report
//   QUERY:  node scripts/memory-graph.mjs <terms...>   -> ranked memories (tag/subject/description) + their links
//           node scripts/memory-graph.mjs --tag rd     -> memories carrying #rd
//   --dir <path>  override the memory dir (default: this machine's Claude auto-memory dir; or env MEMORY_DIR)
//
// Pure Node ESM, zero deps. Read-only on the memory tree except the generated MEMORY-GRAPH.json sidecar.
// =============================================================================

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdtempSync } from "node:fs";
import { join, basename } from "node:path";
import { homedir, tmpdir } from "node:os";
import { createHash } from "node:crypto";

// A non-reversible tag for "which memory tree is this report about". Needed because the autodetect can
// pick a tree that is not yours and a health report for the wrong tree reads exactly like a clean bill
// for the right one — but printing the path to disambiguate would leak the username. 8 hex disambiguates
// between the handful of dirs on a box without carrying anything back.
const dirTag = (d) => createHash("sha256").update(String(d)).digest("hex").slice(0, 8);

// Resolve the auto-memory dir ROBUSTLY. A hardcoded C:\Users\<name>\... path breaks on any machine
// reinstall / username change (it did: the old `desig` default 404'd after the box was rebuilt as `phill`).
// Precedence: --dir (parsed below) > MEMORY_DIR env > autodetect the populated memory/ under
// ~/.claude/projects (the folder that actually holds MEMORY.md) > a last-resort guess.
// How many dirs actually carried a MEMORY.md. More than one means the pick below is a GUESS, and a
// health report for the wrong tree reads exactly like a clean bill for yours — so it gets said out loud.
function autodetectCandidateDirs() {
  const projects = join(homedir(), ".claude", "projects");
  let entries;
  try { entries = readdirSync(projects, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const mem = join(projects, e.name, "memory");
    let mds;
    try { mds = readdirSync(mem).filter((f) => f.endsWith(".md")); } catch { continue; }
    if (mds.includes("MEMORY.md")) out.push({ dir: mem, files: mds.length });
  }
  return out;
}

// ★ FAIL CLOSED ON AN AMBIGUOUS BOX (2026-07-25, R&D 0440). This used to pick the MOST POPULATED
// candidate and print a warning. On this machine that picks a tree with 142 files when the asking
// session's tree has 77 — so `node scripts/memory-graph.mjs` with no args produced a confident,
// conservation-checked, dir-id-stamped health report about a memory tree nobody asked about.
//
// The warning was not enough, and the polish made it worse: I added a conservation law and a dir-id
// to this report the same morning, which made the WRONG-tree output read as MORE authoritative, not
// less. A guess dressed in evidence is harder to catch than a bare guess.
//
// "Most populated" was never a reason to believe a dir is YOURS — it is a reason to believe it is
// someone's. With >1 candidate and no explicit choice there is no fact to prefer one, so the honest
// answer is to refuse and name the options by dir-id (never by path — that is the username leak).
// Pure, and separated from the I/O above so the refusal can be driven without touching a real home dir.
export function chooseMemoryDir({ explicitDir, envDir, candidates }) {
  if (explicitDir) return { dir: explicitDir, explicit: true };
  if (envDir) return { dir: envDir, explicit: true };
  if (candidates.length === 1) return { dir: candidates[0].dir, explicit: false };
  if (candidates.length === 0) {
    return { refuse: "autodetect found no memory dir carrying a MEMORY.md" };
  }
  return {
    refuse: `${candidates.length} memory dirs carry a MEMORY.md and nothing says which is yours — `
      + `refusing to guess (a health report for the wrong tree reads exactly like a clean bill for yours). `
      + `Candidates by dir-id: ${candidates.map((c) => `${dirTag(c.dir)}(${c.files} files)`).join(" · ")}. `
      + `Pass --dir <path> or set MEMORY_DIR.`,
  };
}

// No last-resort guess. The old fallback baked in a dash-encoded machine slug — the same username
// leak as an absolute path, and the path-leak guard was blind to the bare `C--Users-<name>` form so it
// read green over this line for the file's whole life (widened 2026-07-25). A guess is also worse than
// an error when it happens to EXIST: it answers silently about the wrong tree.
// ── args ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
let explicitDir = null;
let tagFilter = null;
let check = false;
let selfTest = false;
const terms = [];
const seen = new Set();
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === "--dir" || arg === "--tag") {
    if (seen.has(arg) || i + 1 >= argv.length || argv[i + 1].startsWith("--")) {
      console.error(`memory-graph: ${arg} requires exactly one value`);
      process.exit(2);
    }
    seen.add(arg);
    const value = argv[++i];
    if (arg === "--dir") explicitDir = value;
    if (arg === "--tag") tagFilter = value.replace(/^#/, "").toLowerCase();
  } else if (arg === "--check" && !check) {
    check = true;
  } else if (arg === "--self-test" && !selfTest) {
    selfTest = true;
  } else if (arg.startsWith("--")) {
    console.error(`memory-graph: unknown or duplicate argument ${arg}`);
    process.exit(2);
  } else {
    terms.push(arg);
  }
}
if (check && (selfTest || tagFilter !== null || terms.length > 0)) {
  console.error("memory-graph: --check cannot be combined with query or self-test mode");
  process.exit(2);
}
// ── SELF-TEST ────────────────────────────────────────────────────────────────
// Drives the real CLI end-to-end against a throwaway fixture, because both defects this covers are
// defects of the OUTPUT, not of a helper: one invented an unindexed file, the other printed a machine
// path. Every check is paired with a control — a fix that simply reported nothing would otherwise pass.
if (selfTest) {
  const { execFileSync } = await import("node:child_process");
  const fx = mkdtempSync(join(tmpdir(), "memgraph-selftest-"));
  const w = (n, t) => writeFileSync(join(fx, n), t, "utf8");
  w("MEMORY.md", [
    "# Memory index", "", "## Project",
    "- [Work state](work-state.md) — read first ([archive](work-state-archive.md) for digs). #proj",
    "- [Plain](plain.md) — a normal row.",
    "- [External](has-url.md) — see [docs](https://example.com/x.md) for more.",
    "- [Missing](gone.md) — index row whose file does not exist.", "",
  ].join("\n"));
  for (const f of ["work-state", "work-state-archive", "plain", "has-url", "lonely"]) {
    w(`${f}.md`, `---\nname: ${f}\ndescription: fixture ${f}\nmetadata:\n  type: project\n---\n\nbody\n`);
  }
  // link fixtures: one real link to a real file, one real link to a MISSING file (must be reported),
  // and two written in backticks/a fence as prose ABOUT the syntax (must NOT be reported).
  w("plain.md", `---\nname: plain\ndescription: fixture plain\nmetadata:\n  type: project\n---\n\n`
    + `Links to [[work-state]] and to [[never-written]].\n`
    + `Syntax is \`[[in-a-code-span]]\`.\n\n\`\`\`\n[[in-a-fence]]\n\`\`\`\n`);
  const out = execFileSync(process.execPath, [process.argv[1], "--dir", fx], { encoding: "utf8" });
  const graph = JSON.parse(readFileSync(join(fx, "MEMORY-GRAPH.json"), "utf8"));

  const checks = [
    // THE FIX: a companion link on an index row is indexed, not a phantom orphan.
    ["companion link on an index row counts as INDEXED (was reported unindexed)",
      !graph.health.orphans.includes("work-state-archive")],
    // CONTROL for it: a file in NO index row must still be caught, else the fix is just "report nothing".
    ["CONTROL a genuinely unindexed file is STILL reported",
      graph.health.orphans.join() === "lonely" && out.includes("unindexed (add to")],
    // CONTROL on the widening: an http target must not index anything and must not become a dangling row.
    ["CONTROL an http link on an index row indexes nothing (dangling = the missing local file only)",
      graph.health.danglingIndex.join() === "gone"],
    ["conservation: indexed + unindexed = files, and the line says so",
      out.includes("(Σ 4 indexed + 1 unindexed = 5 files)")],
    // THE OTHER FIX: no absolute machine path on stdout.
    ["console output carries NO absolute memory-dir path", !out.includes(fx)],
    // CONTROL for it: prove that assertion is not vacuous — the path IS present where it is allowed to be.
    ["CONTROL the withheld path is genuinely findable (generatedFrom still records it)",
      graph.generatedFrom === fx],
    ["dir-id tag is printed so two trees are still distinguishable", out.includes(`[dir-id ${dirTag(fx)}]`)],
    // THIRD phantom of the same class: prose ABOUT the link syntax counted as a link.
    ["[[targets]] inside a code span or fence are NOT links",
      !graph.nodes.plain.links.includes("in-a-code-span") && !graph.nodes.plain.links.includes("in-a-fence")],
    // CONTROL: a real link still resolves AND a real dangling one is still reported — else "strip
    // everything" would pass the check above while blinding the health report entirely.
    ["CONTROL real links survive: one resolved, one genuinely dangling and reported",
      graph.nodes.plain.links.includes("work-state")
      && graph.health.danglingLinks.length === 1
      && graph.health.danglingLinks[0].to === "never-written"],
  ];

  // ── ambiguous-box resolution (R&D 0440). Driven through the PURE chooser so the refusal is provable
  // without a real home dir — no monkeypatching, no fixture ~/.claude tree.
  const two = [{ dir: "/a/memory", files: 142 }, { dir: "/b/memory", files: 77 }];
  const amb = chooseMemoryDir({ candidates: two });
  checks.push(
    ["THE FIX: 2 candidates and no explicit choice REFUSES instead of picking the most populated", Boolean(amb.refuse)],
    ["the refusal names candidates by dir-id and leaks NO path",
      amb.refuse.includes(dirTag("/a/memory")) && !amb.refuse.includes("/a/memory")],
    // CONTROL: the refusal must not fire when the caller HAS said which tree — else it blocks every run.
    ["CONTROL an explicit --dir still resolves with 2 candidates present",
      chooseMemoryDir({ explicitDir: "/chosen", candidates: two }).dir === "/chosen"],
    ["CONTROL MEMORY_DIR also counts as explicit",
      chooseMemoryDir({ envDir: "/env", candidates: two }).dir === "/env"],
    // CONTROL: an UNAMBIGUOUS box must still work with no arguments at all.
    ["CONTROL a single candidate resolves with no arguments (the fix is not 'always refuse')",
      chooseMemoryDir({ candidates: [two[1]] }).dir === "/b/memory"],
    ["no candidate at all refuses too (fail-closed, not a silent empty report)",
      Boolean(chooseMemoryDir({ candidates: [] }).refuse)],
  );
  let bad = 0;
  for (const [name, ok] of checks) { if (!ok) bad++; console.log(`  ${ok ? "OK  " : "FAIL"} ${name}`); }
  console.log(`\nmemory-graph self-test: ${checks.length - bad}/${checks.length} passed`);
  process.exit(bad ? 1 : 0);
}

const choice = chooseMemoryDir({
  explicitDir,
  envDir: process.env.MEMORY_DIR,
  candidates: autodetectCandidateDirs(),
});
if (choice.refuse) {
  console.error(`memory-graph: ${choice.refuse}`);
  process.exit(2);
}
const dir = choice.dir;
if (!existsSync(dir)) {
  // Echo the path ONLY when the caller typed it: a bad --dir is a typo they must see, and it is their
  // own input coming back. An AUTODETECTED path is not — printing that puts a machine path (and the
  // username inside it) in a terminal that gets pasted into notes, which is the leak the repo's own
  // path-leak guard exists to stop. Same class as the bare `C--Users-<name>` slug that guard was blind to.
  const where = choice.explicit ? `: ${dir}` : " (autodetected path withheld — pass --dir to see it echoed)";
  console.error(`memory-graph: memory dir does not exist${where}\n  pass --dir <path> or set MEMORY_DIR.`);
  process.exit(2);
}

// ── parse the MEMORY.md index: "- [subject](slug.md) — hook #tag #tag" ───────
// An index ROW may carry MORE THAN ONE link — the house style writes a companion inline, e.g.
//   - [work-state](galerina-work-state.md) — read first ([archive](galerina-work-state-archive-pre-0718.md) for digs).
// Taking only the first link reported the companion as UNINDEXED, and "unindexed" is the tool's
// prompt to add-or-DELETE — a phantom here argues for deleting a file that is indexed fine.
// Every link on the row counts; the FIRST local one owns the row's subject/hook/tags.
// LOCAL only: a target with `/` or `:` is a URL or a path into another tree and cannot mark a topic
// file in THIS dir as indexed — widening that far would make the unindexed check unable to fire.
const LINK_RE = /\[([^\]]*)\]\(([^)\s]+)\)/g;
const isLocalSlug = (t) => /^[^/:\\]+\.md$/i.test(t);

function parseIndex(text) {
  const entries = new Map(); // slug -> {subject, hook, tags[], section}
  let section = "";
  for (const line of text.split(/\r?\n/)) {
    const sec = /^##\s+(.+?)\s*$/.exec(line);
    if (sec) { section = sec[1]; continue; }
    if (!/^- \[/.test(line)) continue; // still an index ROW, not any line that happens to hold a link
    const links = [...line.matchAll(LINK_RE)].filter((m) => isLocalSlug(m[2].trim()));
    if (!links.length) continue;
    const [primary, ...companions] = links;
    // hook/tags come from the row text after the primary link, with link markup flattened to its text
    const rest = line
      .slice(primary.index + primary[0].length)
      .replace(LINK_RE, "$1")
      .replace(/^\s*[—-]\s*/, "")
      .trim();
    const tags = [...rest.matchAll(/#([a-z0-9-]+)/gi)].map((t) => t[1].toLowerCase());
    const hook = rest.replace(/#[a-z0-9-]+/gi, "").replace(/\s+$/, "").trim();
    entries.set(primary[2].trim(), { subject: primary[1].trim(), hook, tags, section });
    for (const c of companions) {
      const slug = c[2].trim();
      if (!entries.has(slug)) entries.set(slug, { subject: c[1].trim(), hook: "", tags: [], section });
    }
  }
  return entries;
}

// ── parse a topic file's frontmatter + [[links]] ──────────────────────────────
function parseTopic(text) {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const meta = { name: null, description: null, type: null };
  if (fm) {
    const name = /(^|\n)name:\s*(.+)/.exec(fm[1]);
    const desc = /(^|\n)description:\s*(.+)/.exec(fm[1]);
    const type = /(^|\n)\s*type:\s*([A-Za-z|]+)/.exec(fm[1]);
    if (name) meta.name = name[2].trim().replace(/^["']|["']$/g, "");
    if (desc) meta.description = desc[2].trim().replace(/^["']|["']$/g, "");
    if (type) meta.type = type[2].trim();
  }
  // Strip code spans and fences FIRST. A memory file that documents the link syntax writes `[[name]]`
  // in backticks; counting those produced dangling-link reports for targets nobody ever meant to exist
  // (`[[x]]`, `[[wikilinks]]`). A note in the memory tree already described that noise and worked around
  // it instead of fixing it here — so the tool kept charging every reader for the same false report.
  const prose = text.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ");
  const links = [...prose.matchAll(/\[\[([a-z0-9-]+)\]\]/gi)].map((l) => l[1].toLowerCase());
  return { meta, links: [...new Set(links)] };
}

// ── scan ──────────────────────────────────────────────────────────────────────
// The index is SPLIT (owner 2026-07-02): MEMORY.md = HOT set (auto-loaded into every session, kept tiny);
// MEMORY-ARCHIVE.md = COLD overflow (NOT auto-loaded, recall by query). Both are authoritative index files —
// a topic file listed in EITHER is "indexed". Neither is itself a topic file.
const INDEX_FILES = ["MEMORY.md", "MEMORY-ARCHIVE.md"];
const sourceFiles = readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
const files = sourceFiles.filter((f) => !INDEX_FILES.includes(f));
const fileSlugs = new Set(files.map((f) => basename(f, ".md")));
const readIndex = (name) =>
  existsSync(join(dir, name)) ? parseIndex(readFileSync(join(dir, name), "utf8")) : new Map();
const hotEntries = readIndex("MEMORY.md");
const coldEntries = readIndex("MEMORY-ARCHIVE.md");
const indexEntries = new Map([...coldEntries, ...hotEntries]); // union; hot wins on any overlap

const nodes = {}; // slug -> node
for (const f of files) {
  const slug = basename(f, ".md");
  const { meta, links } = parseTopic(readFileSync(join(dir, f), "utf8"));
  const idx = indexEntries.get(`${slug}.md`) ?? indexEntries.get(slug);
  nodes[slug] = {
    slug,
    subject: idx?.subject ?? meta.name ?? slug,
    description: meta.description ?? idx?.hook ?? "",
    type: meta.type ?? "unknown",
    section: idx?.section ?? null,
    tags: idx?.tags ?? [],
    links,
    inIndex: Boolean(idx),
  };
}

// links + health
const danglingLinks = []; // file -> missing [[target]]
const tagMap = {}; // tag -> [slug]
const orphans = []; // file not referenced in MEMORY.md
for (const n of Object.values(nodes)) {
  for (const l of n.links) if (!fileSlugs.has(l)) danglingLinks.push({ from: n.slug, to: l });
  for (const t of n.tags) (tagMap[t] ??= []).push(n.slug);
  if (!n.inIndex) orphans.push(n.slug);
}
// dangling INDEX entries (a MEMORY.md line whose target file does not exist)
const danglingIndex = [];
for (const key of indexEntries.keys()) {
  const slug = key.replace(/\.md$/, "");
  if (!fileSlugs.has(slug)) danglingIndex.push(slug);
}
// duplicate descriptions (near-dupe smell)
const byDesc = {};
for (const n of Object.values(nodes)) {
  const k = n.description.slice(0, 40).toLowerCase();
  if (k) (byDesc[k] ??= []).push(n.slug);
}
const dupes = Object.values(byDesc).filter((a) => a.length > 1);

// ── QUERY mode ────────────────────────────────────────────────────────────────
if (terms.length || tagFilter) {
  const q = terms.map((t) => t.toLowerCase());
  const scored = Object.values(nodes)
    .map((n) => {
      let s = 0;
      if (tagFilter && n.tags.includes(tagFilter)) s += 5;
      for (const t of q) {
        if (n.tags.includes(t)) s += 4;
        if (n.subject.toLowerCase().includes(t)) s += 3;
        if (n.slug.includes(t)) s += 2;
        if (n.description.toLowerCase().includes(t)) s += 1;
      }
      return { n, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 15);
  if (!scored.length) { console.log(`No memory matches ${tagFilter ? `#${tagFilter} ` : ""}${q.join(" ")}`); process.exit(0); }
  console.log(`\nMemory matches (${scored.length}):\n`);
  for (const { n, s } of scored) {
    console.log(`  [${s}] ${n.subject}  (${n.slug}.md)  #${n.tags.join(" #") || "—"}`);
    if (n.description) console.log(`        ${n.description.slice(0, 110)}`);
    if (n.links.length) console.log(`        → ${n.links.join(", ")}`);
  }
  console.log("");
  process.exit(0);
}

// ── BUILD / CHECK mode ──────────────────────────────────────────────────────────
const sourceHash = createHash("sha256");
for (const file of sourceFiles) {
  const bytes = readFileSync(join(dir, file));
  sourceHash.update(String(Buffer.byteLength(file)));
  sourceHash.update(":");
  sourceHash.update(file);
  sourceHash.update(":");
  sourceHash.update(String(bytes.length));
  sourceHash.update(":");
  sourceHash.update(bytes);
}
const graph = {
  generatedFrom: dir,
  sourceDigest: sourceHash.digest("hex"),
  counts: { files: files.length, indexed: indexEntries.size, hot: hotEntries.size, cold: coldEntries.size, nodes: Object.keys(nodes).length },
  tags: Object.fromEntries(Object.entries(tagMap).map(([t, a]) => [t, a.length]).sort((a, b) => b[1] - a[1])),
  tagMap,
  nodes,
  health: {
    danglingIndex,     // MEMORY.md lines pointing at a missing file (prune or write the file)
    orphans,           // topic files missing from MEMORY.md (add a line or delete)
    danglingLinks,     // [[links]] whose target file is absent
    duplicateDescriptions: dupes,
  },
};
const graphPath = join(dir, "MEMORY-GRAPH.json");
const expected = `${JSON.stringify(graph, null, 2)}\n`;
if (check) {
  if (!existsSync(graphPath) || readFileSync(graphPath, "utf8") !== expected) {
    console.error("memory-graph: MEMORY-GRAPH.json is missing or stale; no files written");
    process.exit(1);
  }
  console.log(`memory-graph: current [dir-id ${dirTag(dir)}] source ${graph.sourceDigest}`);
  process.exit(0);
}
writeFileSync(graphPath, expected);

const topTags = Object.entries(graph.tags).slice(0, 12).map(([t, c]) => `#${t}(${c})`).join(" ");
console.log(`\nmemory-graph: ${graph.counts.files} files · ${graph.counts.indexed} indexed · ${Object.keys(graph.tags).length} tags`);
// The sidecar path is NOT printed: it is an absolute machine path (username included) and this line
// gets pasted into notes. `generatedFrom` stays inside the JSON — that file sits in the dir it
// describes, so it leaks nothing that reading it does not already tell you.
console.log(`  -> MEMORY-GRAPH.json written in the memory dir  [dir-id ${dirTag(dir)}]`);
console.log(`  TIERS: ${graph.counts.hot} hot (MEMORY.md, auto-loaded) · ${graph.counts.cold} cold (MEMORY-ARCHIVE.md, recall by query)`);
console.log(`  top tags: ${topTags}`);
// "unindexed" = a topic file in NEITHER index (genuinely undiscoverable → add a line or delete). Being COLD
// (in the archive, not in MEMORY.md) is EXPECTED and healthy — that is how the hot set is kept tiny.
// Conservation law, printed: every topic file lands in exactly ONE bucket. A category-only report can
// lose a file silently (this tool did the opposite — it INVENTED one); an accounting line that must sum
// to the file count cannot be satisfied by a miscount in either direction.
console.log(`  HEALTH: ${danglingIndex.length} dangling index, ${orphans.length} unindexed files, ${danglingLinks.length} dangling [[links]], ${dupes.length} dup-description clusters  (Σ ${files.length - orphans.length} indexed + ${orphans.length} unindexed = ${files.length} files)`);
if (danglingIndex.length) console.log(`    dangling index (prune or create the file): ${danglingIndex.slice(0, 20).join(", ")}`);
if (orphans.length) console.log(`    unindexed (add to MEMORY.md or MEMORY-ARCHIVE.md, or delete): ${orphans.slice(0, 20).join(", ")}`);
if (danglingLinks.length) console.log(`    dangling [[links]] (fix or write target): ${danglingLinks.slice(0, 20).map((d) => `${d.from}→${d.to}`).join(", ")}`);
console.log(`  query: node scripts/memory-graph.mjs <terms>   |   --tag <tag>\n`);
