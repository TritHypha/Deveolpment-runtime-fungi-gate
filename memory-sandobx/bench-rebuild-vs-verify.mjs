// =============================================================================
// THE ONE NUMBER N1 IS MISSING: is it cheaper to REBUILD an execution graph, or to
// LOAD one from disk and VERIFY its digest?
//
// If verify << rebuild, the index/warehouse trade wins: keep a tiny index in memory,
// keep the bytes on disk, pay a hash to get them back. If verify ~ rebuild, the disk
// round-trip buys nothing and the retirement ruling should simply stand.
//
// Measured against the REAL compiler in dist/, not a model.
//
// CONTROLS, because a fast number from a no-op proves nothing:
//   C1 the graphs must be DISTINCT     — otherwise a cache would trivially win
//   C2 the loaded value must EQUAL the built one — otherwise "load" measured nothing
//   C3 both paths must do non-zero work — a zero time is a dead harness
//   C4 a tampered byte must be REFUSED — otherwise "verify" is not verifying
// =============================================================================
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const HERE = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const DIST = join(HERE, "..", "packages-ts", "galerina-core-compiler", "dist") + "/";
if (!existsSync(DIST + "index.js")) { console.error("DENY: no dist — build it or point elsewhere."); process.exit(2); }
const M = await import(pathToFileURL(DIST + "index.js").href);
const G = await import(pathToFileURL(DIST + "execution-graph.js").href);
const { parseProgram } = M;
const { buildExecutionGraph } = G;
for (const [n, f] of [["parseProgram", parseProgram], ["buildExecutionGraph", buildExecutionGraph]]) {
  if (typeof f !== "function") { console.error(`DENY: missing ${n}`); process.exit(2); }
}
if (buildExecutionGraph.length !== 5) {
  console.error(`DENY: buildExecutionGraph takes ${buildExecutionGraph.length} args, expected 5.`);
  console.error("      A wrong-arity call still returns an object and would publish a fabricated number.");
  process.exit(2);
}

const P = console.log;
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const SCRATCH = join(HERE, ".bench-scratch");
rmSync(SCRATCH, { recursive: true, force: true });
mkdirSync(SCRATCH, { recursive: true });

const N = 200;
const src = (i) => `@version 1
pure flow probe${i}(x: Int) -> Int
contract { intent { "rebuild-vs-verify bench, variant ${i}" } }
{
  let a = x + ${i}
  let b = a * 2
  let c = b - ${i % 7}
  return c
}`;

// ---- stage 0: parse once per variant (shared cost, excluded from both arms) ----
const parsed = [];
for (let i = 0; i < N; i++) {
  const p = parseProgram(src(i), `bench${i}.fungi`);
  if (p.diagnostics.some((d) => d.severity === "error")) continue;
  const node = (p.ast.children ?? []).find((c) => /FlowDecl$/.test(c.kind));
  if (node) parsed.push({ i, node, flows: p.flows });
}
if (parsed.length < N * 0.9) { console.error(`DENY: only ${parsed.length}/${N} sources parsed — fixture broken.`); process.exit(2); }

// ---- arm A: REBUILD ----
const built = [];
let tRebuild = 0;
for (const { i, node } of parsed) {
  const t0 = process.hrtime.bigint();
  const g = buildExecutionGraph(node, `probe${i}`, undefined, undefined, true);
  const t1 = process.hrtime.bigint();
  tRebuild += Number(t1 - t0);
  built.push({ i, g });
}

// ---- write the warehouse ----
const files = [];
let totalBytes = 0;
for (const { i, g } of built) {
  const bytes = Buffer.from(JSON.stringify(g, (k, v) => (v instanceof Map ? [...v] : v)), "utf8");
  const digest = sha256(bytes);
  const path = join(SCRATCH, `g${i}.json`);
  writeFileSync(path, bytes);
  files.push({ i, path, digest, size: bytes.length });
  totalBytes += bytes.length;
}

// ---- arm B: LOAD + VERIFY ----
let tVerify = 0, verified = 0;
const loaded = [];
for (const f of files) {
  const t0 = process.hrtime.bigint();
  const bytes = readFileSync(f.path);
  const ok = sha256(bytes) === f.digest;
  const value = ok ? JSON.parse(bytes.toString("utf8")) : null;
  const t1 = process.hrtime.bigint();
  tVerify += Number(t1 - t0);
  if (ok) verified++;
  loaded.push(value);
}

// ---- controls ----
const distinctGraphs = new Set(files.map((f) => f.digest)).size;
const c1 = distinctGraphs >= files.length - 1;
const c2 = loaded.every((v, k) => v !== null && JSON.stringify(v) === readFileSync(files[k].path, "utf8"));
const c3 = tRebuild > 0 && tVerify > 0;
// C4 — tamper one byte and require a refusal
const victim = files[0];
const orig = readFileSync(victim.path);
const bad = Buffer.from(orig); bad[bad.length - 3] ^= 0x01;
writeFileSync(victim.path, bad);
const c4 = sha256(readFileSync(victim.path)) !== victim.digest;
writeFileSync(victim.path, orig);

P("== controls ==");
P(`  C1 graphs are distinct              : ${c1 ? "yes *" : "** no — a cache would win trivially"}  (${distinctGraphs}/${files.length} digests)`);
P(`  C2 loaded value equals what was written: ${c2 ? "yes *" : "** no — the load measured nothing"}`);
P(`  C3 both arms did non-zero work      : ${c3 ? "yes *" : "** no — dead harness"}`);
P(`  C4 a tampered byte is refused       : ${c4 ? "yes *" : "** no — 'verify' is not verifying"}`);
if (!(c1 && c2 && c3 && c4)) { P("\n  DEAD/INVALID HARNESS — refusing to report a ratio."); process.exit(2); }

const perRebuild = tRebuild / files.length / 1000;   // microseconds
const perVerify = tVerify / files.length / 1000;
P("\n== the measurement ==");
P(`  graphs                : ${files.length}`);
P(`  bytes on disk         : ${(totalBytes / 1024).toFixed(1)} KiB   median ${files.map((f) => f.size).sort((a, b) => a - b)[Math.floor(files.length / 2)]} B/graph`);
P(`  REBUILD  (buildExecutionGraph) : ${perRebuild.toFixed(1)} us/graph`);
P(`  LOAD+VERIFY (read + sha256 + parse) : ${perVerify.toFixed(1)} us/graph`);
P(`  ★ ratio rebuild : verify = ${(perRebuild / perVerify).toFixed(2)} : 1`);

// ---- where does the load cost actually go? "It loses" is less useful than "it loses because X" ----
let tRead = 0, tHash = 0, tParse = 0;
for (const f of files) {
  let t0 = process.hrtime.bigint();
  const bytes = readFileSync(f.path);
  let t1 = process.hrtime.bigint(); tRead += Number(t1 - t0);
  t0 = process.hrtime.bigint();
  sha256(bytes);
  t1 = process.hrtime.bigint(); tHash += Number(t1 - t0);
  t0 = process.hrtime.bigint();
  JSON.parse(bytes.toString("utf8"));
  t1 = process.hrtime.bigint(); tParse += Number(t1 - t0);
}
const us = (n) => (n / files.length / 1000).toFixed(1);
P("\n== where the load cost goes (warm — these files were just written) ==");
P(`  read(2)      : ${us(tRead).padStart(6)} us/graph`);
P(`  sha256       : ${us(tHash).padStart(6)} us/graph   <- the VERIFY tax the security model requires`);
P(`  JSON.parse   : ${us(tParse).padStart(6)} us/graph`);
P(`  ★ the hash is ${((tHash / (tRead + tHash + tParse)) * 100).toFixed(0)}% of the load; the syscall is ${((tRead / (tRead + tHash + tParse)) * 100).toFixed(0)}%`);

P("\n== index footprint, the point of the concept ==");
// index entry = key + digest(64 hex) + weight + locator
const idxPerEntry = 40 + 64 + 8 + 48;
P(`  warehouse (bytes resident)    : ${(totalBytes / files.length).toFixed(0)} B/entry`);
P(`  index only (digest+weight+locator) : ~${idxPerEntry} B/entry`);
P(`  ★ memory reduction factor     : ${(totalBytes / files.length / idxPerEntry).toFixed(1)}x`);
P(`  at the measured 2048-entry ceiling: warehouse ${((totalBytes / files.length) * 2048 / 1024).toFixed(0)} KiB vs index ${(idxPerEntry * 2048 / 1024).toFixed(0)} KiB`);

P("\n== adjudication ==");
const wins = perVerify < perRebuild;
P("  " + (wins
  ? `VERIFY IS CHEAPER by ${(perRebuild / perVerify).toFixed(1)}x. The trade is real: a tiny index in\n`
  + "  memory, bytes on disk, a hash to get them back — cheaper than recomputing."
  : `REBUILD IS CHEAPER (${(perVerify / perRebuild).toFixed(1)}x). The disk round-trip buys nothing for\n`
  + "  graphs of this size; the concept's memory saving is real but its I/O is not free.\n"
  + "  On this evidence the retirement ruling should stand for the execution-graph cache."));
rmSync(SCRATCH, { recursive: true, force: true });
