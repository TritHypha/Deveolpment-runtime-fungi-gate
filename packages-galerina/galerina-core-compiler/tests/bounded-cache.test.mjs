// =============================================================================
// BoundedCache — POSITIVE regression tests.
//
// The static audit proves a cache is not obviously unbounded. That is a weaker claim
// than it sounds: it is satisfied by any cache with a `delete` somewhere. These tests
// prove the opposite direction — that the bound is REACHED and ENFORCED — which is
// the property CI must hold, and the one a lexical scan can never establish.
//
// Every test drives the cache past a limit on purpose. A bound that is never
// exercised is a bound nobody has tested.
// =============================================================================
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { BoundedCache, cachePolicyFromEnv } from "../dist/bounded-cache.js";

/** Weight 1 per item unless the value says otherwise — keeps entry/weight separable. */
const mk = (over = {}) => new BoundedCache({
  maxEntries: 4, maxWeight: 100, maxItemWeight: 50,
  weigh: (v) => v?.w ?? 1,
  ...over,
});

describe("BoundedCache — the bound is enforced, not merely present", () => {
  it("rejects a nonsensical configuration rather than silently never caching", () => {
    for (const bad of [{ maxEntries: 0 }, { maxEntries: -1 }, { maxWeight: 0 }, { maxItemWeight: Number.NaN }]) {
      assert.throws(() => mk(bad), RangeError,
        `a cache built with ${JSON.stringify(bad)} would present as permanently cold, not as broken`);
    }
    assert.throws(() => mk({ maxItemWeight: 1000, maxWeight: 100 }), RangeError,
      "an admission ceiling above the total budget admits items that can never fit");
  });

  it("★ ENTRY limit is reached and enforced", () => {
    const c = mk();
    for (let i = 0; i < 10; i++) c.set("k" + i, { w: 1 });
    const s = c.stats();
    assert.equal(s.entries, 4, "entries must be capped at maxEntries");
    assert.equal(s.evictions, 6, "and the excess must be counted, not lost quietly");
  });

  it("★ WEIGHT limit is enforced INDEPENDENTLY of the entry count", () => {
    // 3 entries is under maxEntries=4, but 3x40 = 120 exceeds maxWeight=100.
    const c = mk();
    c.set("a", { w: 40 }); c.set("b", { w: 40 }); c.set("c", { w: 40 });
    const s = c.stats();
    assert.ok(s.weight <= 100, `weight ${s.weight} must not exceed maxWeight`);
    assert.ok(s.entries < 3, "an entry must have been evicted for WEIGHT while under the entry cap");
  });

  it("★ an oversize item is REFUSED ADMISSION, and refusal is not an error", () => {
    const c = mk();
    const admitted = c.set("huge", { w: 51 });          // over maxItemWeight = 50
    assert.equal(admitted, false, "set() reports non-admission");
    assert.equal(c.get("huge"), undefined, "and the item is genuinely not stored");
    assert.equal(c.stats().refusedOversize, 1, "refusals are counted so the behaviour is visible");
    // The caller can still proceed — that is the whole contract.
    assert.equal(c.stats().entries, 0);
  });

  it("eviction is LRU and deterministic: a re-read entry survives", () => {
    const c = mk();
    c.set("a", { w: 1 }); c.set("b", { w: 1 }); c.set("c", { w: 1 }); c.set("d", { w: 1 });
    c.get("a");                                          // 'a' becomes most-recently-used
    c.set("e", { w: 1 });                                // forces one eviction
    assert.notEqual(c.get("a"), undefined, "the re-read entry must survive");
    assert.equal(c.get("b"), undefined, "the least-recently-used entry is the one evicted");
  });

  it("the same input yields the same eviction order on a second run", () => {
    const run = () => {
      const c = mk();
      const order = [];
      for (const k of ["a", "b", "c", "d", "e", "f"]) { c.set(k, { w: 1 }); order.push([...["a","b","c","d","e","f"].filter((x) => c.get(x) !== undefined)]); }
      return JSON.stringify(order);
    };
    assert.equal(run(), run(), "eviction must be deterministic or the cache is an input to behaviour");
  });

  it("★ a DISABLED cache stores nothing but keeps counting", () => {
    const c = mk({ enabled: false });
    assert.equal(c.set("a", { w: 1 }), false);
    assert.equal(c.get("a"), undefined);
    const s = c.stats();
    assert.equal(s.entries, 0);
    assert.equal(s.enabled, false);
    assert.ok(s.misses > 0, "'caching off' and 'instrumentation off' must not look the same");
  });

  it("★ stats() exposes counts and weights and NEVER a key", () => {
    const c = mk();
    c.set("a-secret-content-hash", { w: 1 });
    const s = c.stats();
    const serialized = JSON.stringify(s);
    assert.ok(!serialized.includes("a-secret-content-hash"),
      "cache keys are content hashes of source; a metrics surface must not publish them");
    assert.deepEqual(Object.keys(s).sort(),
      ["enabled", "entries", "evictions", "hits", "maxEntries", "maxItemWeight", "maxWeight", "misses", "refusedOversize", "weight"],
      "the metric surface is closed — a new field must be a deliberate decision, not a leak");
    assert.equal(typeof c.keys, "undefined", "there is no key enumerator to misuse");
  });

  it("a throwing weigh() refuses the item instead of taking the cache down", () => {
    const c = new BoundedCache({ maxEntries: 4, maxWeight: 10, maxItemWeight: 5, weigh: () => { throw new Error("boom"); } });
    assert.equal(c.set("a", {}), false, "an item whose weight cannot be established is not admitted");
    assert.equal(c.stats().refusedOversize, 1);
  });

  it("hits and misses are counted separately and correctly", () => {
    const c = mk();
    c.set("a", { w: 1 });
    c.get("a"); c.get("a"); c.get("zzz");
    const s = c.stats();
    assert.equal(s.hits, 2);
    assert.equal(s.misses, 1);
  });
});

describe("cachePolicyFromEnv — the terminal arm", () => {
  it("recognised on/off values map as expected", () => {
    for (const v of ["1", "on", "true", "enabled", undefined, ""]) assert.equal(cachePolicyFromEnv(v).enabled, true, `'${v}'`);
    for (const v of ["0", "off", "false", "disabled"]) assert.equal(cachePolicyFromEnv(v).enabled, false, `'${v}'`);
  });

  it("★ an UNRECOGNISED value disables fail-closed and says why", () => {
    const r = cachePolicyFromEnv("yes-please");
    assert.equal(r.enabled, false, "an unparseable policy must not be read as 'on'");
    assert.match(r.reason, /unrecognised/i, "and the reason must name the cause, not just the outcome");
  });

  it("case and surrounding whitespace do not change the decision", () => {
    assert.equal(cachePolicyFromEnv("  OFF  ").enabled, false);
    assert.equal(cachePolicyFromEnv("  On  ").enabled, true);
  });
});
