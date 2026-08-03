import { types as utilTypes } from "node:util";

function admittedResult(result) {
  return result !== null
    && typeof result === "object"
    && !Array.isArray(result)
    && !utilTypes.isProxy(result)
    && typeof result.name === "string"
    && result.name.length > 0
    && Number.isSafeInteger(result.durationMs)
    && result.durationMs > 0;
}

export function buildPhaseCloseTimingProfile(results, limit = 8) {
  if (!Array.isArray(results)) throw new TypeError("results must be an array");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new RangeError("profile limit must be an integer from 1 through 100");
  }
  const admitted = results.filter(admittedResult);
  const accountedDurationMs = admitted.reduce((total, result) => total + result.durationMs, 0);
  if (!Number.isSafeInteger(accountedDurationMs)) {
    throw new RangeError("profile duration exceeds the safe integer range");
  }
  const slowest = admitted
    .map((result, sourceOrder) => ({ ...result, sourceOrder }))
    .sort((left, right) => right.durationMs - left.durationMs || left.sourceOrder - right.sourceOrder)
    .slice(0, limit)
    .map((result, index) => Object.freeze({
      token: `P${String(index + 1).padStart(2, "0")}`,
      name: result.name,
      durationMs: result.durationMs,
      sharePct: accountedDurationMs === 0
        ? 0
        : Math.round((result.durationMs / accountedDurationMs) * 1_000) / 10,
    }));
  return Object.freeze({
    accountedDurationMs,
    slowest: Object.freeze(slowest),
  });
}
