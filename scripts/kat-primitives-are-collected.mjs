#!/usr/bin/env node
// =============================================================================
// KAT — are JavaScript primitives garbage collected?
//
// RD-0734 states, plainly:
//
//   "anytime you have something like an object, an array, a class, anything like
//    that, those are going to be garbage collected automatically. But anytime you use
//    a string, a number, a boolean, those will stay in memory essentially FOREVER
//    because they are NOT being garbage collected."
//
// That is a falsifiable claim about the runtime this estate's leak audit measures, so
// it must not be left as an unchecked citation. If true, every string a long-running
// process ever builds is retained, and `audit-memory-leak.mjs` would be measuring a
// floor that only ever rises.
//
// THE EVIDENCE THE SOURCE OFFERS is a heap snapshot in which a scoped string still
// appears after its scope exited. There is a competing explanation the source does not
// consider: a string LITERAL is interned as part of the compiled script and is
// retained by the source text itself, and separately GC had not yet run — the same
// talk later says collection "just happens randomly over some period of time".
//
// So this test uses strings that CANNOT be literals: each is built at runtime from a
// counter, so no interned copy exists to confuse the reading.
//
// PAIRED CONTROL, one variable — whether the strings are RETAINED:
//   dropped  : build N unique strings, keep none      -> collected? heap must stay flat
//   retained : build N unique strings, keep all       -> heap MUST grow
// If the retained arm does not grow, the harness cannot see string memory at all and
// the dropped arm proves nothing.
// =============================================================================

if (typeof global.gc !== "function") {
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync(process.execPath, ["--expose-gc", process.argv[1]], { stdio: "inherit" });
  process.exit(r.status ?? 2);
}

const settle = async () => {
  for (let i = 0; i < 4; i++) { global.gc(); await new Promise((r) => setImmediate(r)); }
  global.gc();
};

const N = 200_000;
const LEN = 200;   // long enough that N of them is unmistakable in the heap

/** Build a unique, NON-LITERAL string. Interning cannot apply. */
const mk = (i) => String(i).padEnd(LEN, "x") + i;

async function measure(label, retain) {
  await settle();
  const before = process.memoryUsage().heapUsed;
  const keep = [];
  for (let i = 0; i < N; i++) {
    const s = mk(i);
    if (retain) keep.push(s);
    else if (s.length === -1) throw new Error("unreachable");   // defeat DCE
  }
  await settle();
  const after = process.memoryUsage().heapUsed;
  if (retain && keep.length !== N) throw new Error("retention failed");
  return { label, deltaMB: (after - before) / 1e6, kept: retain ? keep.length : 0 };
}

console.log("== KAT: are JS primitives garbage collected? ==");
console.log(`   ${N.toLocaleString()} unique runtime-built strings of ~${LEN} chars each\n`);

const retained = await measure("retained (control)", true);
const dropped = await measure("dropped", false);

for (const r of [retained, dropped]) {
  console.log(`   ${r.label.padEnd(20)} heapUsed delta ${r.deltaMB.toFixed(1).padStart(8)} MB`);
}

// Expected size if every string were retained: N * LEN * 2 bytes (UTF-16), lower bound.
const expectedMB = (N * LEN * 2) / 1e6;
console.log(`\n   for scale: ${N.toLocaleString()} x ${LEN} chars x 2 bytes = ~${expectedMB.toFixed(0)} MB if all were held`);

console.log("\n== adjudication ==");
const controlLive = retained.deltaMB > expectedMB * 0.5;
console.log(`   CONTROL — the retained arm grew as expected: ${controlLive}` +
  (controlLive ? `   (${retained.deltaMB.toFixed(0)} MB, i.e. the harness CAN see string memory)`
               : `   ** only ${retained.deltaMB.toFixed(1)} MB — the harness cannot see it; nothing below is adjudicated`));
if (!controlLive) process.exit(2);

const collected = dropped.deltaMB < retained.deltaMB * 0.1;
console.log(`   ★ dropped strings were reclaimed: ${collected}` +
  `   (${dropped.deltaMB.toFixed(1)} MB vs ${retained.deltaMB.toFixed(0)} MB retained` +
  ` — ${(100 * dropped.deltaMB / retained.deltaMB).toFixed(1)}% of the retained cost)`);

console.log("\n   " + (collected
  ? "VERDICT: the source claim is **DISPROVEN**. Unreachable strings ARE garbage collected.\n"
  + "   The heap returns to its starting point after " + N.toLocaleString() + " unique strings are dropped,\n"
  + "   while the identical workload that RETAINS them grows by ~" + retained.deltaMB.toFixed(0) + " MB.\n"
  + "   What the source observed — a scoped string still visible in a snapshot — is explained by\n"
  + "   literal interning plus GC timing, both of which this test removes by construction."
  : "VERDICT: dropped strings were NOT reclaimed — the source claim survives this test and the\n"
  + "   leak audit's assumptions need revisiting."));
process.exit(collected ? 0 : 1);
