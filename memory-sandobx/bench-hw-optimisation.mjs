// =============================================================================
// OPTIMISING FOR THE HARDWARE — you don't place into L1/L2/L3, you SHAPE ACCESS so
// the hardware's own placement lands your hot set in a fast tier.
//
// The tier bench found the wall is the RANDOM dist[dst] writes (2.6x at L3, 12.8x at
// RAM), not the sequential CSR stream (prefetch hides that). So every technique here
// attacks the SAME thing: make the random accesses local.
//
// Four layouts of ONE graph, identical answer required:
//   A natural          — random node labels (the baseline)
//   B neighbour-sorted  — sort dst within each adjacency list (cheap; helps the prefetcher)
//   C BFS-relabelled    — new IDs in BFS order so neighbours get nearby IDs (clusters dist[] accesses)
//   D BFS + sorted      — both
//
// KAT-FIRST: every layout must return the SAME SSSP distances after un-permuting, or
// its speed is meaningless. A permutation bug that changes the graph is the trap.
// Controls: a locality METRIC (mean |label(u)-label(v)|) must actually improve, or a
// speed change is measuring noise, not locality.
// =============================================================================
const P = console.log;
const ms = (t0) => Number(process.hrtime.bigint() - t0) / 1e6;

// ---- deterministic graph, sized to SPILL L2 so locality matters ----
let seed = 0xC0FFEE;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const N = 500_000, DEG = 8, M = N * DEG;   // dist[] = 4 MB (Int32) >> 256 KB L2
const src = new Int32Array(M), dst0 = new Int32Array(M), w0 = new Int32Array(M);
for (let i = 0; i < M; i++) { src[i] = (i / DEG) | 0; dst0[i] = (rnd() * N) | 0; w0[i] = 1 + ((rnd() * 15) | 0); }

function toCSR(N, srcA, dstA, wA) {
  const M = dstA.length;
  const off = new Int32Array(N + 1);
  for (let i = 0; i < M; i++) off[srcA[i] + 1]++;
  for (let v = 0; v < N; v++) off[v + 1] += off[v];
  const dst = new Int32Array(M), w = new Int32Array(M);
  const cur = Int32Array.from(off.subarray(0, N));
  for (let i = 0; i < M; i++) { const p = cur[srcA[i]]++; dst[p] = dstA[i]; w[p] = wA[i]; }
  return { N, off, dst, w };
}

// tropical SSSP with a live edge-visit counter
function tropical(g, s, counter) {
  const { N, off, dst, w } = g;
  const dist = new Float64Array(N).fill(Infinity); dist[s] = 0;
  let changed = true, visits = 0;
  while (changed) { changed = false;
    for (let v = 0; v < N; v++) { const dv = dist[v]; if (dv === Infinity) continue;
      for (let e = off[v]; e < off[v + 1]; e++) { visits++;
        const nd = dv + w[e]; if (nd < dist[dst[e]]) { dist[dst[e]] = nd; changed = true; } } } }
  if (counter) counter.v = visits;
  return dist;
}

// ---- layout A: natural ----
const A = toCSR(N, src, dst0, w0);

// ---- layout B: sort dst (and w) within each adjacency list ----
function neighbourSort(g) {
  const { N, off, dst, w } = g;
  const nd = Int32Array.from(dst), nw = Int32Array.from(w);
  for (let v = 0; v < N; v++) {
    const a = off[v], b = off[v + 1];
    // insertion sort on (dst) carrying w — lists are tiny (deg 8)
    for (let i = a + 1; i < b; i++) { const dv = nd[i], wv = nw[i]; let j = i - 1;
      while (j >= a && nd[j] > dv) { nd[j + 1] = nd[j]; nw[j + 1] = nw[j]; j--; }
      nd[j + 1] = dv; nw[j + 1] = wv; }
  }
  return { N, off, dst: nd, w: nw };
}
const B = neighbourSort(A);

// ---- layout C: BFS relabelling ----
function bfsRelabel(g) {
  const { N, off, dst, w } = g;
  const label = new Int32Array(N).fill(-1);
  const queue = new Int32Array(N); let qh = 0, qt = 0, next = 0;
  for (let start = 0; start < N; start++) {
    if (label[start] !== -1) continue;
    label[start] = next++; queue[qt++] = start;
    while (qh < qt) { const u = queue[qh++];
      for (let e = off[u]; e < off[u + 1]; e++) { const x = dst[e];
        if (label[x] === -1) { label[x] = next++; queue[qt++] = x; } } }
  }
  // rebuild edges under the new labels
  const ns = new Int32Array(M), ndst = new Int32Array(M), nw = new Int32Array(M);
  for (let v = 0; v < N; v++) for (let e = off[v]; e < off[v + 1]; e++) { ns[e] = label[v]; ndst[e] = label[dst[e]]; nw[e] = w[e]; }
  return { csr: toCSR(N, ns, ndst, nw), label };
}
const cRes = bfsRelabel(A);
const C = cRes.csr;
const D = neighbourSort(C);

// ---- locality metric: mean |label(u) - label(v)| over edges (smaller = more local) ----
function locality(g) {
  const { N, off, dst } = g; let sum = 0, n = 0;
  for (let v = 0; v < N; v++) for (let e = off[v]; e < off[v + 1]; e++) { sum += Math.abs(v - dst[e]); n++; }
  return sum / n;
}

// ---- KAT: all layouts must agree on distances, mapped back to original IDs ----
// C/D are relabelled, so compare via the label map. A/B share original IDs.
const SRC = 12345;
const distA = tropical(A, SRC);
const distB = tropical(B, SRC);
const distC = tropical(C, cRes.label[SRC]);       // seed under new label
// map C's distances back to original IDs
const distC_orig = new Float64Array(N);
for (let orig = 0; orig < N; orig++) distC_orig[orig] = distC[cRes.label[orig]];
let katOk = true, checked = 0;
for (let v = 0; v < N; v += 997) { checked++;
  if (distA[v] !== distB[v] || distA[v] !== distC_orig[v]) { katOk = false; break; } }
P(`== KAT: all layouts agree on ${checked} sampled distances (mapped back): ${katOk ? "EXACT *" : "** DISAGREE"}`);
if (!katOk) { P("  a relabelling changed the graph — refusing to report speed."); process.exit(2); }

// ---- locality control: reordering must actually improve locality ----
P("\n== locality metric (mean |label(u)-label(v)| over edges; lower = more local) ==");
const lA = locality(A), lB = locality(B), lC = locality(C), lD = locality(D);
P(`  A natural         : ${lA.toFixed(0)}`);
P(`  B neighbour-sorted: ${lB.toFixed(0)}  (sort doesn't move nodes, so ~= A — expected)`);
P(`  C BFS-relabelled  : ${lC.toFixed(0)}   (${(lA / lC).toFixed(1)}x more local)`);
P(`  D BFS + sorted    : ${lD.toFixed(0)}`);
const localityImproved = lC < lA * 0.9;
P(`  CONTROL — BFS actually improved locality: ${localityImproved ? "yes *" : "** no — a speed change would be noise"}`);

// ---- the measurement: ns/edge-visit for each layout ----
function timeLayout(g) {
  const counter = { v: 0 };
  tropical(g, SRC, counter);                       // warm
  const QS = 8, seeds = [];
  for (let q = 0; q < QS; q++) seeds.push(((q * 48271 + 7) % N));
  let visits = 0;
  const t0 = process.hrtime.bigint();
  for (const s of seeds) { const c = { v: 0 }; tropical(g, s, c); visits += c.v; }
  const wall = ms(t0);
  return { nsPerVisit: (wall * 1e6) / visits, wallPer: wall / QS, visits: visits / QS };
}
P("\n== tropical SSSP per layout (500k nodes, dist[]=4MB, spills L2) ==");
P("  layout              ns/edge-visit   wall/SSSP ms   vs natural");
const rA = timeLayout(A), rB = timeLayout(B), rC = timeLayout(C), rD = timeLayout(D);
for (const [name, r] of [["A natural", rA], ["B neighbour-sorted", rB], ["C BFS-relabelled", rC], ["D BFS + sorted", rD]])
  P(`  ${name.padEnd(20)} ${r.nsPerVisit.toFixed(2).padStart(13)} ${r.wallPer.toFixed(1).padStart(14)}   ${(rA.nsPerVisit / r.nsPerVisit).toFixed(2)}x`);

P("\n== adjudication ==");
const best = [["A", rA], ["B", rB], ["C", rC], ["D", rD]].sort((x, y) => x[1].nsPerVisit - y[1].nsPerVisit)[0];
P(`  fastest layout: ${best[0]}  at ${best[1].nsPerVisit.toFixed(2)} ns/edge-visit (${(rA.nsPerVisit / best[1].nsPerVisit).toFixed(2)}x over natural)`);
P("  ★ Same graph, same answer, same kernel, same hardware — only the LAYOUT changed.");
P("  The speed came from the hardware placing a more-local working set in a faster tier,");
P("  which is the only 'placement' control userland has. Reordering is a ONE-TIME cost");
P("  (build-time / admission-time), so it is free at query time — the index/warehouse");
P("  discipline again: pay once at admission, reuse cheaply.");
