// =============================================================================
// bounded-cache.ts — the ONE bounded cache primitive.
//
// WHY A TYPE AND NOT A CONVENTION. Three caches in this package grew without a
// bound, and each was written by someone who knew caches need bounds. A convention
// that must be remembered at every declaration site is a convention that will be
// forgotten at one of them. This constructor DEMANDS its limits, so a cache cannot
// come into existence without someone having answered "what bounds this?".
//
// THE LIMITS ARE MEASURED, NOT INVENTED. An earlier proposal used `max: 256`. A
// full-corpus compile of this estate produces **1,456 distinct execution-graph
// keys**, so 256 would have evicted 83% of its own working set on a single run —
// thrashing, while still being called a cache. Callers pass limits derived from
// `extra-tests/tools/measure-graph-cache-limits.mjs`; this module supplies no
// defaults for entries or weight, because a default here would be exactly the
// unmeasured constant that was rejected.
//
// THREE INDEPENDENT BOUNDS, because any one alone is bypassable:
//   maxEntries   — count. Cannot see that entries differ in size.
//   maxWeight    — total structural weight. Measured p50 is 9 nodes and max 163, an
//                  18x spread: 256 tiny graphs and 256 large ones are the same
//                  count and very different memory.
//   maxItemWeight— admission ceiling. A single outlier must not be able to consume
//                  the budget. Over-ceiling items are NOT cached; the caller
//                  recomputes, which is slower and still fully verified.
//
// ★ EVICTION IS A PERFORMANCE EVENT AND NOTHING ELSE. It must never change output,
// receipts, authority or admission. That is why `get` returning a miss is
// indistinguishable to the caller from a cold start: the caller recomputes and
// proceeds. The moment an eviction could change a verdict, the cache would be part
// of the trust boundary rather than an optimisation beneath it.
// =============================================================================

/** Metrics surface. ★ Deliberately carries NO KEYS — see `stats()`. */
export interface CacheStats {
  readonly entries: number;
  readonly weight: number;
  readonly hits: number;
  readonly misses: number;
  readonly evictions: number;
  /** Items refused admission for exceeding `maxItemWeight`. */
  readonly refusedOversize: number;
  readonly maxEntries: number;
  readonly maxWeight: number;
  readonly maxItemWeight: number;
  readonly enabled: boolean;
}

export interface BoundedCacheOptions<V> {
  /** Hard entry ceiling. No default: an unmeasured default is the rejected constant. */
  readonly maxEntries: number;
  /** Hard total-weight ceiling. */
  readonly maxWeight: number;
  /** Admission ceiling for a single item. */
  readonly maxItemWeight: number;
  /** Structural weight of one value. Must be pure and cheap. */
  readonly weigh: (value: V) => number;
  /**
   * High-assurance hosts may disable caching entirely. A disabled cache still
   * COUNTS (misses, refusals) so the metric surface does not silently go dark —
   * "no cache" and "no instrumentation" must not look the same.
   */
  readonly enabled?: boolean;
}

export class BoundedCache<K, V> {
  // Insertion order IS the LRU order: on a hit the entry is deleted and re-set,
  // which moves it to the end. Deterministic, and no second structure to fall out
  // of sync with the first.
  readonly #map = new Map<K, { value: V; weight: number }>();
  readonly #opts: Required<BoundedCacheOptions<V>>;
  #weight = 0;
  #hits = 0;
  #misses = 0;
  #evictions = 0;
  #refusedOversize = 0;

  constructor(opts: BoundedCacheOptions<V>) {
    // Fail closed on a nonsensical configuration. A cache built with a zero or
    // negative bound would silently never cache, and "the cache is broken" would
    // present as "the cache is cold" forever.
    for (const [name, v] of [
      ["maxEntries", opts.maxEntries],
      ["maxWeight", opts.maxWeight],
      ["maxItemWeight", opts.maxItemWeight],
    ] as const) {
      if (!Number.isFinite(v) || v <= 0) {
        throw new RangeError(`BoundedCache: ${name} must be a positive finite number, got ${String(v)}`);
      }
    }
    if (opts.maxItemWeight > opts.maxWeight) {
      throw new RangeError("BoundedCache: maxItemWeight exceeds maxWeight — a single admitted item could never fit");
    }
    this.#opts = { ...opts, enabled: opts.enabled ?? true };
  }

  get(key: K): V | undefined {
    if (!this.#opts.enabled) { this.#misses++; return undefined; }
    const hit = this.#map.get(key);
    if (hit === undefined) { this.#misses++; return undefined; }
    this.#hits++;
    this.#map.delete(key);      // re-insert to move to the MRU end
    this.#map.set(key, hit);
    return hit.value;
  }

  /**
   * Offer a value. Returns whether it was admitted — callers must treat `false` as
   * ordinary, never as an error: the value is still valid, it simply is not stored.
   */
  set(key: K, value: V): boolean {
    if (!this.#opts.enabled) return false;
    const weight = this.#weighSafely(value);
    if (weight > this.#opts.maxItemWeight) {
      // Oversize: refuse ADMISSION, never refuse the value. The caller keeps it and
      // proceeds; only the reuse is lost.
      this.#refusedOversize++;
      this.#map.delete(key);
      return false;
    }
    const existing = this.#map.get(key);
    if (existing !== undefined) { this.#weight -= existing.weight; this.#map.delete(key); }
    this.#map.set(key, { value, weight });
    this.#weight += weight;
    this.#evictToFit();
    return true;
  }

  /** Weighing is caller code; a throw there must not take the cache with it. */
  #weighSafely(value: V): number {
    let w: number;
    try { w = this.#opts.weigh(value); } catch { return Number.POSITIVE_INFINITY; }
    return Number.isFinite(w) && w >= 0 ? w : Number.POSITIVE_INFINITY;
  }

  /** Deterministic LRU: evict from the oldest end until both bounds are satisfied. */
  #evictToFit(): void {
    while (this.#map.size > this.#opts.maxEntries || this.#weight > this.#opts.maxWeight) {
      const oldest = this.#map.keys().next();
      if (oldest.done === true) return;   // cannot happen with a positive bound; still not a crash
      const entry = this.#map.get(oldest.value);
      this.#map.delete(oldest.value);
      this.#weight -= entry?.weight ?? 0;
      this.#evictions++;
    }
  }

  delete(key: K): boolean {
    const e = this.#map.get(key);
    if (e === undefined) return false;
    this.#weight -= e.weight;
    return this.#map.delete(key);
  }

  clear(): void { this.#map.clear(); this.#weight = 0; }

  /**
   * ★ Counts, weights, hits, misses and evictions — and NEVER a key.
   *
   * The keys here are content hashes of source. Publishing them through a metrics
   * surface would leak information about the source being compiled to anything that
   * can read metrics, which is a wider audience than the compiler's own callers.
   * This is why `stats()` returns scalars and there is no `keys()` on this class.
   */
  stats(): CacheStats {
    return {
      entries: this.#map.size,
      weight: this.#weight,
      hits: this.#hits,
      misses: this.#misses,
      evictions: this.#evictions,
      refusedOversize: this.#refusedOversize,
      maxEntries: this.#opts.maxEntries,
      maxWeight: this.#opts.maxWeight,
      maxItemWeight: this.#opts.maxItemWeight,
      enabled: this.#opts.enabled,
    };
  }
}

/**
 * Read a cache policy from the environment, for a host that must turn caching off.
 *
 * ★ Every branch is enumerated and there is a terminal `_` arm: an unrecognised
 * value is not silently treated as "on". A cache-disable switch that fails open on
 * a typo is the switch not existing.
 */
export function cachePolicyFromEnv(raw: string | undefined): { enabled: boolean; reason: string } {
  const v = (raw ?? "").trim().toLowerCase();
  switch (v) {
    case "":
    case "1":
    case "on":
    case "true":
    case "enabled":
      return { enabled: true, reason: v === "" ? "default (unset)" : `explicitly enabled (${v})` };
    case "0":
    case "off":
    case "false":
    case "disabled":
      return { enabled: false, reason: `explicitly disabled (${v})` };
    default:
      // The terminal arm. Unrecognised => DISABLED, because the safe reading of an
      // unparseable policy is the more conservative one, and a crash is not an arm.
      return { enabled: false, reason: `unrecognised policy ${JSON.stringify(v)} — disabled fail-closed` };
  }
}
