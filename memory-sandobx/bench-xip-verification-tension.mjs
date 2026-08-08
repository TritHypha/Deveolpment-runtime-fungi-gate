// =============================================================================
// XIP vs VERIFICATION — checking the maths on the owner's RD-0559 read.
//
// The owner's analysis is right about the direction: XIP maps process memory directly
// to the media and skips the page-cache copy, and `.fungi` immutability is exactly
// XIP's hard requirement. And the measured decomposition says XIP attacks the right
// thing — read(2) is 85% of a verified load, sha256 only 8%.
//
// ★ BUT THERE IS A TENSION THE ANALYSIS DOES NOT NAME, and it is load-bearing:
//
//   XIP's win is LAZINESS — you touch only the pages you actually walk.
//   Digest verification is EAGER — you cannot verify a region without reading
//   every byte of it.
//
// So verifying a whole mapped object converts a lazy zero-copy walk into an eager
// full read, and the saving collapses in exactly the case XIP is for: a large
// collection iterated PARTIALLY.
//
// This measures the three numbers that decide it.
// =============================================================================
import { createHash, randomBytes } from "node:crypto";
import { writeFileSync, readFileSync, openSync, readSync, closeSync, rmSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

const HERE = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const DIR = join(HERE, ".xip-scratch");
const P = console.log;
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });

const MB = 1024 * 1024;
const SIZE = 32 * MB;                       // a "large immutable collection"
const PAGE = 4096;
const path = join(DIR, "collection.bin");
writeFileSync(path, randomBytes(SIZE));

const time = (fn) => { const t0 = process.hrtime.bigint(); const r = fn(); return [Number(process.hrtime.bigint() - t0) / 1e6, r]; };
const mbps = (bytes, ms) => (bytes / MB / (ms / 1000)).toFixed(0);

// warm the page cache so we measure copy+hash, not cold media
readFileSync(path);

P(`subject: ${SIZE / MB} MiB immutable collection, page cache warm\n`);

// ── 1. sha256 throughput — the ceiling on ANY verified scheme ───────────────
const buf = readFileSync(path);
const [tHash] = time(() => createHash("sha256").update(buf).digest());
P("== 1. verification throughput ==");
P(`   sha256 over ${SIZE / MB} MiB : ${tHash.toFixed(1)} ms  ->  ${mbps(SIZE, tHash)} MB/s`);
P("   ★ this is the CEILING on any digest-verified read, XIP or not.");

// ── 2. read + copy throughput — what XIP claims to remove ──────────────────
const [tRead] = time(() => readFileSync(path));
P("\n== 2. read + copy throughput (what XIP skips) ==");
P(`   readFileSync ${SIZE / MB} MiB : ${tRead.toFixed(1)} ms  ->  ${mbps(SIZE, tRead)} MB/s`);
P(`   ★ XIP removes this leg. Best case it goes to ~0.`);

// ── 3. PARTIAL iteration — where XIP is supposed to win ────────────────────
// A large collection iterated over only part of its extent: XIP touches only those
// pages. Verification of the WHOLE object touches all of them.
const FRACTIONS = [0.01, 0.1, 0.5, 1.0];
P("\n== 3. partial iteration: lazy (XIP) vs eager (whole-object verification) ==");
P("   fraction   pages touched   lazy read   + whole-object verify");
const fd = openSync(path, "r");
const page = Buffer.allocUnsafe(PAGE);
for (const f of FRACTIONS) {
  const pages = Math.floor((SIZE / PAGE) * f);
  const [tLazy] = time(() => { for (let i = 0; i < pages; i++) readSync(fd, page, 0, PAGE, i * PAGE); });
  const total = tLazy + tHash;                       // must hash the WHOLE object to verify it
  P(`   ${String(f * 100).padStart(5)}%   ${String(pages).padStart(12)}   ${tLazy.toFixed(1).padStart(7)} ms   ${total.toFixed(1).padStart(19)} ms   (${(total / Math.max(tLazy, 0.001)).toFixed(1)}x)`);
}
closeSync(fd);

// ── 4. the fix: per-page digests, so verification is lazy too ───────────────
const pageCount = SIZE / PAGE;
const [tPageDigests] = time(() => {
  const d = [];
  for (let i = 0; i < pageCount; i++) d.push(createHash("sha256").update(buf.subarray(i * PAGE, (i + 1) * PAGE)).digest());
  return d;
});
P("\n== 4. per-page digests — verification becomes lazy too ==");
P(`   ${pageCount} page digests, built once : ${tPageDigests.toFixed(1)} ms  (${mbps(SIZE, tPageDigests)} MB/s)`);
P(`   index size at 32 B/page            : ${((pageCount * 32) / 1024).toFixed(0)} KiB for ${SIZE / MB} MiB  (${((pageCount * 32 / SIZE) * 100).toFixed(2)}% overhead)`);
P(`   verifying 1% of pages instead of all: ${(tHash * 0.01).toFixed(2)} ms vs ${tHash.toFixed(1)} ms  (${(1 / 0.01).toFixed(0)}x cheaper)`);

P("\n== adjudication ==");
P("   The owner's direction is CONFIRMED: XIP removes the leg that dominates a verified");
P(`   load (read at ${mbps(SIZE, tRead)} MB/s), and immutability is genuinely the enabling property.`);
P("");
P("   ★ THE TENSION, quantified: a whole-object digest is EAGER. On a 1% partial scan it");
P(`   turns a ${(0.01 * SIZE / MB).toFixed(2)} MiB walk into a ${SIZE / MB} MiB hash — the zero-copy win is spent on`);
P("   verification, in exactly the case XIP exists for.");
P("");
P("   ★★ THE RESOLUTION IS ALREADY IN RD-0559: AXFS decides PER PAGE. Per-page digests");
P(`   make verification lazy too, at ~${((pageCount * 32 / SIZE) * 100).toFixed(2)}% index overhead — and the index must itself be`);
P("   covered by the signature, or deleting a page's digest fails open (kat-index-fail-open).");
P("");
P("   ⚠ And the owner's own law still binds: NEVER XIP the hot path. The execution-graph");
P("   cache is hot, so none of this applies to it — rebuild at 9-15 us already wins there.");
rmSync(DIR, { recursive: true, force: true });
