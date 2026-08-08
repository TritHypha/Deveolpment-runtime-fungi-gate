// =============================================================================
// T1 #1 (binaryCSR/raw + tropical + prepared + seek+verify) REPLICATED PER CACHE TIER.
//
// You cannot pin data to L1/L2/L3 from userland — but you can SIZE the working set
// so it fits each tier, run the identical combination, and watch the memory
// hierarchy appear in the per-edge cost. i9-9900K tiers: L1d 32 KB/core,
// L2 256 KB/core, L3 16 MB shared, then RAM.
//
// Normalisation: ns per EDGE VISIT (the unit of kernel work), because rounds and
// diameter change with N — raw wall times across sizes are not comparable, per-visit
// cost is.
//
// Methodology notes (the estate's own lane discipline, RD-0710/locality-lane):
//   - the CSR walk is SEQUENTIAL (prefetch-friendly): it measures bandwidth-ish cost;
//   - the dist[dst] update is RANDOM (prefetch-defeating): it is where tier misses
//     actually land. So this lane shows the tier wall SOFTENED by prefetch on the
//     stream and EXPOSED on the random writes — stated, not hidden.
//   - each tier's workload loops until >= 250 ms wall so Windows' ~15.6 ms cpuUsage
//     quantum cannot dominate the CPU figure.
//   - seek+verify (50 lookups) is I/O + hash and should be tier-INVARIANT — it is
//     measured per tier as its own control: if it moved with N, the harness leaked.
// =============================================================================
import { createHash } from "node:crypto";
import { writeFileSync, openSync, readSync, closeSync, rmSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const HERE = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const DIR = join(HERE, ".tier-scratch");
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const P = console.log;
const sha256 = (b) => createHash("sha256").update(b).digest("hex");

// constant I/O side (tier-invariant control): same store for every tier
const REC = 20_000, RECSZ = 1_600;
const store = Buffer.alloc(REC * RECSZ);
const idx = new Map(), recDigests = new Map();
for (let r = 0; r < REC; r++) {
  Buffer.from(JSON.stringify({ id: r, payload: "x".repeat(RECSZ - 60) }).padEnd(RECSZ, " ")).copy(store, r * RECSZ);
  idx.set(r, r * RECSZ);
  recDigests.set(r, sha256(store.subarray(r * RECSZ, (r + 1) * RECSZ)));
}
const storePath = join(DIR, "store.bin");
writeFileSync(storePath, store);
const WANT = Array.from({ length: 50 }, (_, i) => (i * 397) % REC);
function locate() {
  const fd = openSync(storePath, "r");
  const rec = Buffer.allocUnsafe(RECSZ);
  let ok = 0;
  for (const w of WANT) { readSync(fd, rec, 0, RECSZ, idx.get(w)); if (sha256(rec) === recDigests.get(w)) ok++; }
  closeSync(fd);
  if (ok !== 50) process.exit(2);
}

// tiers sized so CSR arrays + dist fit the level (bytes computed and printed exactly)
const DEG = 8;
const TIERS = [
  ["L1  (32 KB)", 256],
  ["L2  (256 KB)", 2_500],
  ["L3  (16 MB)", 100_000],
  ["RAM (>L3)", 1_000_000],
];

function buildGraph(N) {
  let seed = 0xC0FFEE;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const M = N * DEG;
  const off = new Int32Array(N + 1), dst = new Int32Array(M), w = new Int32Array(M);
  const src = new Int32Array(M);
  for (let i = 0; i < M; i++) { src[i] = Math.floor(i / DEG); dst[i] = Math.floor(rnd() * N); w[i] = 1 + Math.floor(rnd() * 15); }
  for (let i = 0; i < M; i++) off[src[i] + 1]++;
  for (let v = 0; v < N; v++) off[v + 1] += off[v];
  const cDst = new Int32Array(M), cW = new Int32Array(M);
  const cur = Int32Array.from(off.subarray(0, N));
  for (let i = 0; i < M; i++) { const p = cur[src[i]]++; cDst[p] = dst[i]; cW[p] = w[i]; }
  return { N, M, off, dst: cDst, w: cW };
}

function makeKernel(g) {
  const { N, off, dst, w } = g;
  const dist = new Float64Array(N);
  let visits = 0;
  const tropical = (s) => {
    dist.fill(Infinity); dist[s] = 0;
    let changed = true, rounds = 0;
    while (changed) { changed = false; rounds++;
      for (let v = 0; v < N; v++) { const dv = dist[v]; if (dv === Infinity) continue;
        for (let e = off[v]; e < off[v + 1]; e++) { visits++;
          const nd = dv + w[e]; if (nd < dist[dst[e]]) { dist[dst[e]] = nd; changed = true; } } } }
    return rounds;
  };
  return { tropical, visits: () => visits, reset: () => { visits = 0; }, dist };
}

// KAT once (same fixture as the matrix bench, inline)
{
  const fx = buildGraph(256);
  const k = makeKernel(fx);
  k.tropical(0);
  const finite = k.dist.filter((x) => x !== Infinity).length;
  if (finite < 200) { P("DEAD KERNEL: reachability implausible on the fixture"); process.exit(2); }
}

P("tier          N        CSR+dist bytes   SSSP rounds   ns/edge-visit   eff GB/s   user CPU ms/wl   wall ms/wl   locate ms");
const rows = [];
for (const [name, N] of TIERS) {
  const g = buildGraph(N);
  const bytes = (N + 1) * 4 + g.M * 4 + g.M * 4 + N * 8;
  const k = makeKernel(g);
  const SS = 20;
  // one workload = 20 SSSP + locate; loop workloads until >= 250 ms
  k.tropical(0);                                    // warm
  let reps = 0, rounds = 0, kernelNs = 0n;
  k.reset();
  const c0 = process.cpuUsage();
  const t0 = process.hrtime.bigint();
  do {
    // kernel time measured SEPARATELY: at L1 sizes the workload is so small that
    // locate()'s ~0.8 ms would otherwise dominate the divisor and inflate ns/visit.
    const k0 = process.hrtime.bigint();
    for (let q = 0; q < SS; q++) rounds = k.tropical((q * 379 + 17) % N);
    kernelNs += process.hrtime.bigint() - k0;
    locate();
    reps++;
  } while (Number(process.hrtime.bigint() - t0) / 1e6 < 250);
  const wall = Number(process.hrtime.bigint() - t0) / 1e6;
  const kernelWall = Number(kernelNs) / 1e6;
  const cpu = process.cpuUsage(c0);
  const visits = k.visits();
  const nsPerVisit = (kernelWall * 1e6) / visits;
  // each visit touches ~12 B stream (dst+w+off amortised) + 8 B random dist read (+write on success)
  const gbps = (visits * 20) / (kernelWall / 1000) / 1e9;
  // locate alone, this tier (control: should be ~constant)
  const tl0 = process.hrtime.bigint(); locate(); const tLoc = Number(process.hrtime.bigint() - tl0) / 1e6;
  rows.push([name, N, bytes, rounds, nsPerVisit, tLoc]);
  P(`${name.padEnd(12)} ${String(N).padStart(9)} ${String(bytes).padStart(14)} ${String(rounds).padStart(11)} ${nsPerVisit.toFixed(2).padStart(15)} ${gbps.toFixed(1).padStart(10)} ${(cpu.user / 1000 / reps).toFixed(1).padStart(15)} ${(wall / reps).toFixed(1).padStart(12)} ${tLoc.toFixed(2).padStart(10)}`);
}

P("\n== adjudication ==");
const l1 = rows[0][4], ram = rows[rows.length - 1][4];
P(`  per-edge cost, L1-resident vs RAM-resident: ${l1.toFixed(2)} vs ${ram.toFixed(2)} ns  ->  ${(ram / l1).toFixed(1)}x`);
const locSpread = Math.max(...rows.map((r) => r[5])) / Math.min(...rows.map((r) => r[5]));
P(`  CONTROL - seek+verify across tiers varies ${locSpread.toFixed(2)}x (should be ~1: it is I/O+hash, not graph-size dependent)`);
P("  The sequential CSR stream is prefetch-friendly (softens the wall); the random dist[dst]");
P("  update is where the tier misses land. A pointer-chasing layout would show a far larger");
P("  multiple - this is the traversal lane, not the latency lane (RD-0710 discipline).");
rmSync(DIR, { recursive: true, force: true });
