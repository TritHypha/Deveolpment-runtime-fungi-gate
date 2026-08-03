import assert from "node:assert/strict";
import test from "node:test";

import { buildPhaseCloseTimingProfile } from "../lib/phase-close-profile.mjs";

test("phase-close timing profile assigns stable tokens in slowest-first order", () => {
  const profile = buildPhaseCloseTimingProfile([
    { name: "fast", durationMs: 100 },
    { name: "slow", durationMs: 900 },
    { name: "middle", durationMs: 500 },
  ], 2);

  assert.equal(profile.accountedDurationMs, 1500);
  assert.deepEqual(profile.slowest, [
    { token: "P01", name: "slow", durationMs: 900, sharePct: 60 },
    { token: "P02", name: "middle", durationMs: 500, sharePct: 33.3 },
  ]);
});

test("phase-close timing profile refuses malformed input and ignores zero work", () => {
  assert.throws(() => buildPhaseCloseTimingProfile(null), /results must be an array/u);
  assert.throws(() => buildPhaseCloseTimingProfile([], 0), /limit/u);
  assert.deepEqual(
    buildPhaseCloseTimingProfile([
      { name: "zero", durationMs: 0 },
      { name: "invalid", durationMs: -1 },
    ]),
    { accountedDurationMs: 0, slowest: [] },
  );
});
