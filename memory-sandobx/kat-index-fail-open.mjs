// =============================================================================
// KAT — the fail-open trap N1 names, demonstrated and then closed.
//
// zt-signed-index's caveat: "cover the index INSIDE the signature or it fails open."
// If every ENTRY is digest-checked but the ENTRY SET is not, an attacker deletes
// entries and every survivor still verifies. The cache degrades to a miss — and a
// miss is indistinguishable from an ordinary eviction, so nobody investigates.
//
// PAIRED ARMS, one variable: whether the index digest covers set membership.
//   naive  : per-entry digests only        -> deletion must go UNDETECTED
//   covered: indexDigest() over membership -> deletion must be DETECTED
//
// A KAT needs both arms to move. If the naive arm also detects, the fixture is wrong,
// not the finding.
// =============================================================================
import { IndexedCache, REFUSED, MISS } from "./index-cache.mjs";
import { rmSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const HERE = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const DIR = join(HERE, ".kat-scratch");
const P = console.log;
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });

const cache = new IndexedCache({ dir: DIR, maxEntries: 100 });
for (let i = 0; i < 10; i++) cache.set(`flow:${i}`, { id: i, nodes: [`n${i}a`, `n${i}b`], pure: true });

const digestBefore = cache.indexDigest();
P("== setup ==");
P(`  entries: ${cache.stats().entries}   index digest: ${digestBefore.slice(0, 16)}…`);
P(`  every entry loads and verifies: ${[...Array(10).keys()].every((i) => { const v = cache.get(`flow:${i}`); return v !== MISS && v !== REFUSED; }) ? "yes" : "** no"}`);

// ── ARM 1: the attack — delete one entry's bytes from disk ──────────────────
P("\n== arm 1: an attacker deletes one entry's bytes ==");
cache.dropBytes("flow:4");
const survivorsOk = [0, 1, 2, 3, 5, 6, 7, 8, 9].every((i) => {
  const v = cache.get(`flow:${i}`);
  return v !== MISS && v !== REFUSED;
});
const victim = cache.get("flow:4");
P(`  survivors still verify individually : ${survivorsOk ? "yes" : "no"}`);
P(`  the deleted entry reads as          : ${victim === MISS ? "MISS" : victim === REFUSED ? "REFUSED" : "a value"}`);
P(`  ★ per-entry checking noticed nothing: ${survivorsOk && victim === MISS ? "correct — this is the fail-open" : "**"}`);
P("     A MISS is what an ordinary eviction looks like. Nobody investigates an eviction.");

// ── ARM 2: the fix — the index digest covers membership ─────────────────────
P("\n== arm 2: does the index digest detect it? ==");
// The bytes are gone but the entry is still indexed, so membership is unchanged.
// The real attack removes the ENTRY. Simulate both.
const digestAfterByteDeletion = cache.indexDigest();
P(`  after deleting only the BYTES  : index digest ${digestAfterByteDeletion === digestBefore ? "UNCHANGED" : "changed"}`);
P("     (correct — the index still KNOWS this key; only the warehouse lost it)");

// now delete the ENTRY itself, which is the membership attack
const cache2 = new IndexedCache({ dir: join(DIR, "b"), maxEntries: 100 });
for (let i = 0; i < 10; i++) cache2.set(`flow:${i}`, { id: i, nodes: [`n${i}a`], pure: true });
const d0 = cache2.indexDigest();
// reach in the only way an attacker could: rebuild the index minus one entry
const cache3 = new IndexedCache({ dir: join(DIR, "c"), maxEntries: 100 });
for (let i = 0; i < 10; i++) { if (i === 4) continue; cache3.set(`flow:${i}`, { id: i, nodes: [`n${i}a`], pure: true }); }
const d1 = cache3.indexDigest();
P(`  after deleting the ENTRY       : index digest ${d1 === d0 ? "** UNCHANGED — FAIL-OPEN" : "CHANGED — detected *"}`);

// ── CONTROL: the digest must be stable when nothing changed ─────────────────
const cache4 = new IndexedCache({ dir: join(DIR, "d"), maxEntries: 100 });
for (let i = 0; i < 10; i++) cache4.set(`flow:${i}`, { id: i, nodes: [`n${i}a`], pure: true });
const stable = cache4.indexDigest() === d0;
P("\n== controls ==");
P(`  C1 identical contents give an identical index digest : ${stable ? "yes *" : "** no — the digest is noisy and any 'detection' is meaningless"}`);
P(`  C2 the naive arm genuinely fails to notice           : ${survivorsOk && victim === MISS ? "yes *" : "** no — fixture wrong"}`);
let c3 = false;
{
  const { readdirSync } = await import("node:fs");
  const f = join(DIR, "f");
  const c = new IndexedCache({ dir: f, maxEntries: 10 });
  c.set("k", { a: 1 });
  const p = join(f, readdirSync(f)[0]);
  const b = Buffer.from(readFileSync(p));
  b[b.length - 3] ^= 0x01;                      // one bit, in the stored bytes
  writeFileSync(p, b);
  const r = c.get("k");
  c3 = r === REFUSED;
  P(`  C3 tampered BYTES refuse, and are not downgraded to a miss : ${
    r === REFUSED ? "REFUSED *" : r === MISS ? "** MISS — tampering was downgraded to a miss" : "** returned a value"}`);
}

P("\n== adjudication ==");
const proven = survivorsOk && victim === MISS && d1 !== d0 && stable && c3;
P("  " + (proven
  ? "PROVEN. Per-entry digests alone FAIL OPEN: deleting an entry leaves every survivor\n"
  + "  verifying and the loss reads as an ordinary miss. An index digest covering entry-set\n"
  + "  MEMBERSHIP detects it. Any index/warehouse split must sign the index, not just the entries.\n\n"
  + "  ★ And the two failures must stay distinguishable: tampered bytes REFUSE, absent bytes MISS.\n"
  + "  Collapsing them hands an attacker a silent downgrade."
  : "NOT PROVEN — see the arms above."));
rmSync(DIR, { recursive: true, force: true });
process.exit(proven ? 0 : 1);
