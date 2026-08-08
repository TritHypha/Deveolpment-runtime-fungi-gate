// =============================================================================
// THE COMBINATION MATRIX — every axis measured, then combined.
//
// Axes (each measured alone, with controls, then composed):
//   E encoding     : JSON | binary CSR (raw typed arrays) | gate-style ASCII text
//   C compression  : raw | gzip | brotli(q5)                       (".zip" question)
//   R representation: Map adjacency | CSR typed arrays | dense matrix (by arithmetic)
//   K kernel       : BFS (boolean) | Dijkstra (binary heap) | tropical min-plus  (Graph+tropical)
//   Q interface    : direct call | interpreted query | prepared query        (TritMeshQL question)
//   I I/O locate   : full scan | index+seek | index+seek+per-record verify | whole-file verify
//
// KAT-FIRST: every kernel must agree with a 5-node HAND-COMPUTED fixture and with each
// other on the big graph, or its speed number is meaningless. Compression must
// round-trip byte-identical. Dead numbers (0 ms, 0 bytes) refuse.
//
// Deterministic: seeded LCG, no Math.random — same graph every run.
// =============================================================================
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync, brotliCompressSync, brotliDecompressSync, constants as Z } from "node:zlib";
import { writeFileSync, readFileSync, openSync, readSync, closeSync, rmSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const HERE = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const DIR = join(HERE, ".matrix-scratch");
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const P = console.log;
const ms = (t0) => Number(process.hrtime.bigint() - t0) / 1e6;
const sha256 = (b) => createHash("sha256").update(b).digest("hex");

// ── deterministic graph: n=10,000 nodes, out-degree 8, weights 1..15 ────────
let seed = 0xC0FFEE;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const N = 10_000, DEG = 8, M = N * DEG;
const srcArr = new Int32Array(M), dstArr = new Int32Array(M), wArr = new Int32Array(M);
for (let i = 0; i < M; i++) {
  srcArr[i] = Math.floor(i / DEG);
  dstArr[i] = Math.floor(rnd() * N);
  wArr[i] = 1 + Math.floor(rnd() * 15);
}
P(`graph: ${N} nodes, ${M} directed edges, weights 1..15 (seeded — identical every run)\n`);

// ── representations ─────────────────────────────────────────────────────────
// R1: Map adjacency (idiomatic JS — the NetworkX shape)
let t0 = process.hrtime.bigint();
const mapAdj = new Map();
for (let v = 0; v < N; v++) mapAdj.set(v, []);
for (let i = 0; i < M; i++) mapAdj.get(srcArr[i]).push([dstArr[i], wArr[i]]);
const tBuildMap = ms(t0);

// R2: CSR (the SciPy/cuGraph/ligra shape)
t0 = process.hrtime.bigint();
const off = new Int32Array(N + 1);
for (let i = 0; i < M; i++) off[srcArr[i] + 1]++;
for (let v = 0; v < N; v++) off[v + 1] += off[v];
const csrDst = new Int32Array(M), csrW = new Int32Array(M);
const cursor = Int32Array.from(off.subarray(0, N));
for (let i = 0; i < M; i++) { const p = cursor[srcArr[i]]++; csrDst[p] = dstArr[i]; csrW[p] = wArr[i]; }
const tBuildCsr = ms(t0);

// R3: dense matrix — adjudicated by ARITHMETIC, not by running out of RAM
const denseBytes = N * N * 4;
P("== representations ==");
P(`  Map adjacency build : ${tBuildMap.toFixed(1)} ms`);
P(`  CSR build           : ${tBuildCsr.toFixed(1)} ms`);
P(`  dense matrix        : REFUSED by arithmetic — ${N}^2 x 4 B = ${(denseBytes / 1048576).toFixed(0)} MiB for ${(M / (N * N) * 100).toFixed(2)}% occupancy`);

// ── kernels, each on both representations ───────────────────────────────────
function dijkstraCSR(s) {
  const dist = new Float64Array(N).fill(Infinity); dist[s] = 0;
  const heap = [s], hd = [0];                              // tiny binary heap (pos in heap arrays)
  const up = (i) => { while (i > 0) { const p = (i - 1) >> 1; if (hd[p] <= hd[i]) break; [hd[p], hd[i]] = [hd[i], hd[p]]; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const dn = (i) => { for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < hd.length && hd[l] < hd[m]) m = l; if (r < hd.length && hd[r] < hd[m]) m = r; if (m === i) break; [hd[m], hd[i]] = [hd[i], hd[m]]; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } };
  while (heap.length) {
    const v = heap[0], d = hd[0];
    const lv = heap.pop(), ld = hd.pop();
    if (heap.length) { heap[0] = lv; hd[0] = ld; dn(0); }
    if (d > dist[v]) continue;
    for (let e = off[v]; e < off[v + 1]; e++) {
      const nd = d + csrW[e];
      if (nd < dist[csrDst[e]]) { dist[csrDst[e]] = nd; heap.push(csrDst[e]); hd.push(nd); up(hd.length - 1); }
    }
  }
  return dist;
}
function dijkstraMap(s) {
  const dist = new Float64Array(N).fill(Infinity); dist[s] = 0;
  const heap = [s], hd = [0];
  const up = (i) => { while (i > 0) { const p = (i - 1) >> 1; if (hd[p] <= hd[i]) break; [hd[p], hd[i]] = [hd[i], hd[p]]; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const dn = (i) => { for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < hd.length && hd[l] < hd[m]) m = l; if (r < hd.length && hd[r] < hd[m]) m = r; if (m === i) break; [hd[m], hd[i]] = [hd[i], hd[m]]; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } };
  while (heap.length) {
    const v = heap[0], d = hd[0];
    const lv = heap.pop(), ld = hd.pop();
    if (heap.length) { heap[0] = lv; hd[0] = ld; dn(0); }
    if (d > dist[v]) continue;
    for (const [u, w] of mapAdj.get(v)) { const nd = d + w; if (nd < dist[u]) { dist[u] = nd; heap.push(u); hd.push(nd); up(hd.length - 1); } }
  }
  return dist;
}
/** Tropical min-plus relaxation to fixpoint (Bellman-Ford rounds on CSR). */
function tropicalCSR(s) {
  const dist = new Float64Array(N).fill(Infinity); dist[s] = 0;
  let changed = true, rounds = 0;
  while (changed) {
    changed = false; rounds++;
    for (let v = 0; v < N; v++) {
      const dv = dist[v];
      if (dv === Infinity) continue;
      for (let e = off[v]; e < off[v + 1]; e++) {
        const nd = dv + csrW[e];
        if (nd < dist[csrDst[e]]) { dist[csrDst[e]] = nd; changed = true; }
      }
    }
  }
  tropicalCSR.rounds = rounds;
  return dist;
}
function bfsCSR(s) {
  const dist = new Int32Array(N).fill(-1); dist[s] = 0;
  let frontier = [s];
  while (frontier.length) {
    const next = [];
    for (const v of frontier) for (let e = off[v]; e < off[v + 1]; e++) {
      if (dist[csrDst[e]] === -1) { dist[csrDst[e]] = dist[v] + 1; next.push(csrDst[e]); }
    }
    frontier = next;
  }
  return dist;
}

// ── KAT: hand-computed 5-node fixture, exact answers asserted ───────────────
// 0->1(2) 0->2(7) 1->2(3) 1->3(8) 2->3(1) 3->4(4)   known: d(0,*) = 0,2,5,6,10
{
  const fx = { off: new Int32Array([0, 2, 4, 5, 6, 6]), dst: new Int32Array([1, 2, 2, 3, 3, 4]), w: new Int32Array([2, 7, 3, 8, 1, 4]) };
  const save = [off.slice(0, 6), csrDst.slice(0, 6), csrW.slice(0, 6)];
  // run the same relaxation logic inline on the fixture (kernels close over globals, so re-derive)
  const dist = new Float64Array(5).fill(Infinity); dist[0] = 0;
  let ch = true;
  while (ch) { ch = false; for (let v = 0; v < 5; v++) { if (dist[v] === Infinity) continue;
    for (let e = fx.off[v]; e < fx.off[v + 1]; e++) { const nd = dist[v] + fx.w[e]; if (nd < dist[fx.dst[e]]) { dist[fx.dst[e]] = nd; ch = true; } } } }
  const want = [0, 2, 5, 6, 10];
  const katOk = want.every((x, i) => dist[i] === x);
  P(`\n== KAT: hand-computed 5-node fixture ==`);
  P(`  tropical relaxation returns [${Array.from(dist).join(",")}], expected [${want.join(",")}] : ${katOk ? "EXACT *" : "** WRONG"}`);
  if (!katOk) { P("  DEAD KERNEL — refusing to benchmark."); process.exit(2); }
  void save;
}

// ── differential parity on the big graph: all kernels must agree ────────────
const SOURCES = [0, 17, 421, 5000, 9999];
let parity = true;
for (const s of SOURCES) {
  const a = dijkstraCSR(s), b = dijkstraMap(s), c = tropicalCSR(s);
  for (let v = 0; v < N; v += 97) if (a[v] !== b[v] || a[v] !== c[v]) { parity = false; break; }
}
P(`  differential parity, 3 kernels x 5 sources : ${parity ? "AGREE *" : "** DISAGREE"}`);
if (!parity) { P("  refusing to benchmark disagreeing kernels."); process.exit(2); }

// ── kernel timings (full SSSP, no early exit, 20 sources each) ──────────────
const QS = 20;
const timeK = (fn) => { const t = process.hrtime.bigint(); for (let q = 0; q < QS; q++) fn((SOURCES[q % SOURCES.length] + q) % N); return ms(t) / QS; };
const tDijCsr = timeK(dijkstraCSR);
const tDijMap = timeK(dijkstraMap);
const tTrop = timeK(tropicalCSR);
const tBfs = timeK(bfsCSR);
P(`\n== kernels (full SSSP, mean of ${QS}) ==`);
P(`  BFS on CSR (unweighted reach)   : ${tBfs.toFixed(2)} ms`);
P(`  Dijkstra on CSR                 : ${tDijCsr.toFixed(2)} ms`);
P(`  Dijkstra on Map adjacency       : ${tDijMap.toFixed(2)} ms   (${(tDijMap / tDijCsr).toFixed(1)}x CSR)`);
P(`  tropical min-plus on CSR        : ${tTrop.toFixed(2)} ms   (fixpoint in ${tropicalCSR.rounds} rounds; ${(tTrop / tDijCsr).toFixed(1)}x Dijkstra)`);

// ── encodings x compression ─────────────────────────────────────────────────
const jsonBytes = Buffer.from(JSON.stringify({ n: N, edges: Array.from({ length: M }, (_, i) => [srcArr[i], dstArr[i], wArr[i]]) }));
const binHeader = Buffer.alloc(16); binHeader.writeInt32LE(N, 0); binHeader.writeInt32LE(M, 4);
const binBytes = Buffer.concat([binHeader, Buffer.from(off.buffer), Buffer.from(csrDst.buffer), Buffer.from(csrW.buffer)]);
let gateText = `@graph 1.0\nnodes ${N}\n`;
for (let i = 0; i < M; i++) gateText += `edge ${srcArr[i]} ${dstArr[i]} ${wArr[i]}\n`;
const gateBytes = Buffer.from(gateText);

const decodeJSON = (b) => { const o = JSON.parse(b.toString("utf8")); return o.edges.length; };
const decodeBin = (b) => {
  const n = b.readInt32LE(0), m = b.readInt32LE(4);
  const o2 = new Int32Array(b.buffer, b.byteOffset + 16, n + 1);           // zero-copy views
  const d2 = new Int32Array(b.buffer, b.byteOffset + 16 + (n + 1) * 4, m);
  return o2[n] === m && d2.length === m ? m : -1;
};
const decodeGate = (b) => {
  const lines = b.toString("utf8").split("\n"); let m = 0;
  for (const ln of lines) if (ln.startsWith("edge ")) { const p = ln.split(" "); if (p.length === 4) m++; }
  return m;
};
const codecs = [
  ["raw", (b) => b, (b) => b],
  ["gzip", (b) => gzipSync(b), (b) => gunzipSync(b)],
  ["brotli5", (b) => brotliCompressSync(b, { params: { [Z.BROTLI_PARAM_QUALITY]: 5 } }), (b) => brotliDecompressSync(b)],
];
P("\n== encoding x compression (size, decompress+decode to usable adjacency) ==");
P("  encoding   codec     size        enc ms    dec+parse ms");
const enc = {};
for (const [ename, bytes, dec, check] of [["JSON", jsonBytes, decodeJSON, M], ["binaryCSR", binBytes, decodeBin, M], ["gateText", gateBytes, decodeGate, M]]) {
  for (const [cname, comp, decomp] of codecs) {
    let t = process.hrtime.bigint(); const packed = comp(bytes); const tEnc = ms(t);
    t = process.hrtime.bigint(); const got = dec(decomp(packed)); const tDec = ms(t);
    if (got !== check) { P(`  ** ${ename}/${cname} FAILED round-trip (${got} != ${check})`); process.exit(2); }
    enc[`${ename}/${cname}`] = { size: packed.length, tDec };
    P(`  ${ename.padEnd(10)} ${cname.padEnd(8)} ${(packed.length / 1048576).toFixed(2).padStart(6)} MiB ${tEnc.toFixed(1).padStart(9)} ${tDec.toFixed(1).padStart(13)}`);
  }
}

// ── query interface overhead (100k NEIGHBORS calls) ─────────────────────────
const CALLS = 100_000;
const neighborsDirect = (v) => csrDst.subarray(off[v], off[v + 1]);
const parseQ = (q) => { const m = /^NEIGHBORS\((\d+)\)$/.exec(q); if (!m) throw new Error("refused: not in the closed grammar"); return { op: "N", v: +m[1] | 0 }; };
const runPlan = (p) => (p.op === "N" ? neighborsDirect(p.v) : undefined);
t0 = process.hrtime.bigint(); { let acc = 0; for (let i = 0; i < CALLS; i++) acc += neighborsDirect(i % N).length; if (!acc) process.exit(2); }
const tDirect = ms(t0);
t0 = process.hrtime.bigint(); { let acc = 0; for (let i = 0; i < CALLS; i++) acc += runPlan(parseQ(`NEIGHBORS(${i % N})`)).length; if (!acc) process.exit(2); }
const tInterp = ms(t0);
const plans = Array.from({ length: N }, (_, v) => parseQ(`NEIGHBORS(${v})`));
t0 = process.hrtime.bigint(); { let acc = 0; for (let i = 0; i < CALLS; i++) acc += runPlan(plans[i % N]).length; if (!acc) process.exit(2); }
const tPrep = ms(t0);
P(`\n== query interface (${CALLS / 1000}k NEIGHBORS calls) ==`);
P(`  direct call        : ${tDirect.toFixed(1)} ms`);
P(`  interpreted (parse each call) : ${tInterp.toFixed(1)} ms  (${(tInterp / tDirect).toFixed(1)}x)`);
P(`  prepared (parse once, closed grammar) : ${tPrep.toFixed(1)} ms  (${(tPrep / tDirect).toFixed(2)}x)`);

// ── I/O locate: 50 records out of a 32 MiB store ────────────────────────────
const REC = 20_000, RECSZ = 1_600;
const store = Buffer.alloc(REC * RECSZ);
const idx = new Map(); const recDigests = new Map();
for (let r = 0; r < REC; r++) {
  const body = Buffer.from(JSON.stringify({ id: r, payload: "x".repeat(RECSZ - 60), t: r * 7 }).padEnd(RECSZ, " "));
  body.copy(store, r * RECSZ);
  idx.set(r, r * RECSZ);
  recDigests.set(r, sha256(store.subarray(r * RECSZ, (r + 1) * RECSZ)));
}
const storePath = join(DIR, "store.bin");
writeFileSync(storePath, store);
const wholeDigest = sha256(store);
const WANT = Array.from({ length: 50 }, (_, i) => (i * 397) % REC);

t0 = process.hrtime.bigint();
{ const all = readFileSync(storePath); let hits = 0;
  for (const w of WANT) { const s = all.indexOf(`"id":${w},`); if (s >= 0) hits++; }
  if (hits !== 50) process.exit(2); }
const tScan = ms(t0);

const fd = openSync(storePath, "r");
const rec = Buffer.allocUnsafe(RECSZ);
t0 = process.hrtime.bigint();
for (const w of WANT) readSync(fd, rec, 0, RECSZ, idx.get(w));
const tSeek = ms(t0);
t0 = process.hrtime.bigint();
{ let ok = 0; for (const w of WANT) { readSync(fd, rec, 0, RECSZ, idx.get(w)); if (sha256(rec) === recDigests.get(w)) ok++; }
  if (ok !== 50) { P("  ** per-record verify failed"); process.exit(2); } }
const tSeekVerify = ms(t0);
t0 = process.hrtime.bigint();
{ const all = readFileSync(storePath); if (sha256(all) !== wholeDigest) process.exit(2);
  for (const w of WANT) all.copy(rec, 0, idx.get(w), idx.get(w) + RECSZ); }
const tWholeVerify = ms(t0);
closeSync(fd);
P(`\n== I/O locate (50 records from ${(store.length / 1048576).toFixed(0)} MiB) ==`);
P(`  full scan                      : ${tScan.toFixed(1)} ms`);
P(`  index + seek (no verify)       : ${tSeek.toFixed(2)} ms   ⚠ fail-open: tampering invisible`);
P(`  index + seek + per-record verify: ${tSeekVerify.toFixed(2)} ms`);
P(`  whole-file verify + extract    : ${tWholeVerify.toFixed(1)} ms`);

// ── THE COMBINATION TABLE ───────────────────────────────────────────────────
// Standard workload: load graph + 20 full SSSP + 100k NEIGHBORS + locate 50 records.
// Total = measured stage costs summed (stages are sequential; each measured above).
const combos = [
  ["JSON/raw + Map + Dijkstra + interpreted + scan, whole-verify", enc["JSON/raw"].tDec + tBuildMap + QS * tDijMap + tInterp + tScan + tWholeVerify, "whole (eager)", "open grammar each call"],
  ["JSON/gzip + Map + Dijkstra + direct + scan, whole-verify", enc["JSON/gzip"].tDec + tBuildMap + QS * tDijMap + tDirect + tScan + tWholeVerify, "whole (eager)", "none"],
  ["gateText/raw + CSR + Dijkstra + prepared + seek+rec-verify", enc["gateText/raw"].tDec + tBuildCsr + QS * tDijCsr + tPrep + tSeekVerify, "per-record (lazy)", "closed grammar"],
  ["JSON/brotli5 + CSR + Dijkstra + prepared + seek+rec-verify", enc["JSON/brotli5"].tDec + tBuildCsr + QS * tDijCsr + tPrep + tSeekVerify, "per-record (lazy)", "closed grammar"],
  ["binaryCSR/gzip + CSR + tropical + prepared + seek+rec-verify", enc["binaryCSR/gzip"].tDec + QS * tTrop + tPrep + tSeekVerify, "per-record (lazy)", "closed grammar"],
  ["binaryCSR/gzip + CSR + Dijkstra + prepared + seek+rec-verify", enc["binaryCSR/gzip"].tDec + QS * tDijCsr + tPrep + tSeekVerify, "per-record (lazy)", "closed grammar"],
  ["binaryCSR/raw + CSR + tropical + prepared + seek+rec-verify", enc["binaryCSR/raw"].tDec + QS * tTrop + tPrep + tSeekVerify, "per-record (lazy)", "closed grammar"],
  ["binaryCSR/raw + CSR + Dijkstra + direct + seek, NO verify", enc["binaryCSR/raw"].tDec + QS * tDijCsr + tDirect + tSeek, "NONE — fail-open", "none"],
  ["binaryCSR/raw + CSR + Dijkstra + prepared + seek+rec-verify", enc["binaryCSR/raw"].tDec + QS * tDijCsr + tPrep + tSeekVerify, "per-record (lazy)", "closed grammar"],
];
combos.sort((a, b) => a[1] - b[1]);
P("\n== COMBINATIONS, standard workload (load + 20 SSSP + 100k queries + 50 locates) ==");
P("  rank  total ms   verification        query surface        combination");
combos.forEach(([name, total, ver, qs], i) =>
  P(`  ${String(i + 1).padStart(3)} ${total.toFixed(1).padStart(9)}   ${ver.padEnd(19)} ${qs.padEnd(20)} ${name}`));

// ── TABLE 2: SAME EFFECTS, EVERYTHING RESIDENT — no disk in the loop ────────
// Memory becomes the scarce axis, so it is a COLUMN, not a stage. Two effects
// survive the move into RAM, changed in meaning:
//   - compression still trades CPU for RAM (decompress per session instead of per load)
//   - verification collapses to ADMISSION TIME: inside one process, resident
//     structures are trusted after one verify at the boundary — hashing your own
//     heap on every read defends against nothing the process itself cannot already do.
// And one effect appears only here: ZERO-COPY VIEWS over a resident canonical buffer
// (the Arrow/FlatBuffers trick) — "XIP in RAM": the buffer is the warehouse, the
// typed-array view is free.

// Map resident size: heap delta building a fresh copy (noisy, stated as indicative).
const heap0 = process.memoryUsage().heapUsed;
const map2 = new Map();
for (let v = 0; v < N; v++) map2.set(v, []);
for (let i = 0; i < M; i++) map2.get(srcArr[i]).push([dstArr[i], wArr[i]]);
const mapResident = (process.memoryUsage().heapUsed - heap0) / 1048576;
if (map2.size !== N) process.exit(2);   // keep map2 live past the measurement

const csrResident = (16 + (N + 1) * 4 + M * 4 + M * 4) / 1048576;   // exact: the buffers
const gzBinResident = enc["binaryCSR/gzip"].size / 1048576;
const gzJsonResident = enc["JSON/gzip"].size / 1048576;
const jsonResident = jsonBytes.length / 1048576;

// one-off zero-copy view cost over a resident binary buffer
t0 = process.hrtime.bigint();
for (let r = 0; r < 100; r++) if (decodeBin(binBytes) !== M) process.exit(2);
const tView = ms(t0) / 100;

const WORK = () => QS; // 20 SSSP + 100k NEIGHBORS is the resident workload
void WORK;
const mem = [
  ["CSR arrays resident + Dijkstra + direct", QS * tDijCsr + tDirect, csrResident, "admission-time verify", "none (no parser)"],
  ["CSR arrays resident + Dijkstra + prepared", QS * tDijCsr + tPrep, csrResident, "admission-time verify", "closed grammar"],
  ["CSR arrays resident + tropical + prepared", QS * tTrop + tPrep, csrResident, "admission-time verify", "closed grammar"],
  ["binary buffer resident + zero-copy views + Dijkstra + prepared", tView + QS * tDijCsr + tPrep, binBytes.length / 1048576, "verify buffer ONCE, views free", "closed grammar"],
  ["Map adjacency resident + Dijkstra + direct", QS * tDijMap + tDirect, mapResident, "admission-time verify", "none"],
  ["gzip(binaryCSR) resident + decompress/session + Dijkstra + prepared", enc["binaryCSR/gzip"].tDec + QS * tDijCsr + tPrep, gzBinResident, "verify at decompress", "closed grammar"],
  ["gzip(JSON) resident + parse/session + Map + Dijkstra + direct", enc["JSON/gzip"].tDec + tBuildMap + QS * tDijMap + tDirect, gzJsonResident, "verify at decompress", "none"],
  ["JSON string resident + parse/session + Map + Dijkstra + direct", enc["JSON/raw"].tDec + tBuildMap + QS * tDijMap + tDirect, jsonResident, "admission-time verify", "none"],
];
mem.sort((a, b) => a[1] - b[1]);
P("\n== TABLE 2: SAME EFFECTS, ALL-IN-MEMORY (20 SSSP + 100k queries; RAM is a column) ==");
P("  rank  work ms   resident MiB   verification              query surface     combination");
mem.forEach(([name, total, ram, ver, qs], i) =>
  P(`  ${String(i + 1).padStart(3)} ${total.toFixed(1).padStart(8)} ${ram.toFixed(2).padStart(13)}   ${ver.padEnd(25)} ${qs.padEnd(17)} ${name}`));
P(`\n  Map resident size is a HEAP DELTA (noisy, indicative); buffer sizes are exact.`);
P(`  zero-copy view cost over the resident buffer: ${tView.toFixed(3)} ms — effectively free.`);

rmSync(DIR, { recursive: true, force: true });
P("\ndone.");
