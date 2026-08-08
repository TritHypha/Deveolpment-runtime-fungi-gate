// =============================================================================
// KAT — eviction is now measure-PRESERVING, and the tombstone index is itself bounded.
//
// Imports the TypeScript SOURCE directly (Node type-stripping) so the change can be
// tested without rebuilding dist/ in a checkout shared with another session.
//
// PAIRED ARMS, one variable: whether maxTombstones is supplied.
//   off (absent)  -> eviction destroys the fact: knew() must go FALSE
//   on  (4096)    -> eviction keeps the fact:    knew() must stay TRUE
// If the "off" arm also remembers, the option is not doing anything and a green here
// would be measuring nothing.
// =============================================================================
import { BoundedCache } from "../packages-galerina/galerina-core-compiler/src/bounded-cache.ts";

const P = console.log;
const mk = (opts) => new BoundedCache({ maxEntries: 4, maxWeight: 10_000, maxItemWeight: 100, weigh: () => 1, ...opts });

// ── arm A: tombstones OFF (the behaviour before this change) ────────────────
const off = mk({});
for (let i = 0; i < 20; i++) off.set("k" + i, { i });
const offStats = off.stats();
const offKnewEvicted = off.knew("k0");
P("== arm A: maxTombstones absent (off) ==");
P(`   entries ${offStats.entries}  evictions ${offStats.evictions}  tombstones ${offStats.tombstones}`);
P(`   knew("k0") after eviction : ${offKnewEvicted}   <- the fact is GONE (measure-contracting)`);

// ── arm B: tombstones ON ────────────────────────────────────────────────────
const on = mk({ maxTombstones: 100 });
for (let i = 0; i < 20; i++) on.set("k" + i, { i });
const onStats = on.stats();
P("\n== arm B: maxTombstones = 100 ==");
P(`   entries ${onStats.entries}  evictions ${onStats.evictions}  tombstones ${onStats.tombstones}  forgottenEntirely ${onStats.forgottenEntirely}`);
P(`   knew("k0")  : ${on.knew("k0")}   <- still KNOWN`);
P(`   get("k0")   : ${on.get("k0") === undefined ? "undefined" : "a value"}   <- no longer HELD`);
P(`   tombstone("k0"): ${JSON.stringify(on.tombstone("k0"))}`);

// ── the tombstone map must ITSELF be bounded ────────────────────────────────
const tiny = mk({ maxTombstones: 5 });
for (let i = 0; i < 100; i++) tiny.set("k" + i, { i });
const t = tiny.stats();
P("\n== the tombstone index is bounded (else it is the same defect one level up) ==");
P(`   96 evictions into a 5-tombstone ceiling -> tombstones ${t.tombstones}, forgottenEntirely ${t.forgottenEntirely}`);

// ── re-admission clears the tombstone (no double counting) ──────────────────
const re = mk({ maxTombstones: 100 });
for (let i = 0; i < 20; i++) re.set("k" + i, { i });
const beforeRe = re.stats().tombstones;
const hadTombstone = re.tombstone("k0") !== undefined;
re.set("k0", { i: 0 });                        // k0 becomes resident again
const afterRe = re.stats();
const stillTombstoned = re.tombstone("k0") !== undefined;
P("\n== re-admission drops the tombstone ==");
P(`   k0 tombstoned before: ${hadTombstone}   after re-admission: ${stillTombstoned}   resident: ${re.get("k0") !== undefined}`);
// ⚠ The COUNT does not fall, and that is correct: the same set() evicts another entry
// and tombstones it. Asserting on the count was my error; the identity is the claim.
P(`   count ${beforeRe} -> ${afterRe.tombstones} (unchanged — the same set() evicted and tombstoned another key)`);

// ── delete() leaves no tombstone; eviction does ─────────────────────────────
const del = mk({ maxTombstones: 100 });
del.set("a", { x: 1 });
del.delete("a");
P("\n== delete() is the caller's choice, not the cache's — no tombstone ==");
P(`   knew("a") after delete : ${del.knew("a")}`);

// ── controls ────────────────────────────────────────────────────────────────
const checks = [
  ["A1 tombstones OFF really forgets (the arms differ)", offKnewEvicted === false && offStats.tombstones === 0],
  ["A2 tombstones ON retains the fact", on.knew("k0") === true],
  ["A3 ...but NOT the value", on.get("k0") === undefined],
  ["A4 the tombstone carries weight and an ordering", (on.tombstone("k0")?.weight ?? -1) >= 0 && (on.tombstone("k0")?.evictedAt ?? -1) > 0],
  ["B1 the tombstone map is bounded", t.tombstones <= 5],
  ["B2 over-run is COUNTED, not silent", t.forgottenEntirely > 0],
  ["C1 re-admission drops THAT KEY's tombstone (no double counting)", hadTombstone && !stillTombstoned],
  ["C2 delete() leaves no tombstone", del.knew("a") === false],
  ["D1 stats() still carries no keys", !JSON.stringify(on.stats()).includes("k0")],
];
P("\n== controls ==");
let bad = 0;
for (const [label, ok] of checks) { P(`  ${ok ? " *" : "**"} ${label}: ${ok}`); if (!ok) bad++; }

P("\n== adjudication ==");
P("  " + (bad === 0
  ? "PROVEN. Eviction is measure-preserving when the option is supplied and contracting\n"
  + "  when it is not — so the option is doing the work, not the harness. The tombstone\n"
  + "  index is itself bounded, and its own over-run is counted rather than silent."
  : `NOT PROVEN — ${bad} control(s) failed.`));
process.exit(bad === 0 ? 0 : 1);
