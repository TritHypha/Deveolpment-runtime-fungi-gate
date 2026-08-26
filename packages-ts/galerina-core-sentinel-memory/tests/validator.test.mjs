// validator.test.mjs — MemoryValidator alignment + bounds.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryValidator, ALIGN_BYTES, SecurityTrap } from "../dist/index.js";
import { caught } from "./_helpers.mjs";

test("isAligned: true for multiples of 16, false otherwise", () => {
  assert.equal(MemoryValidator.isAligned(0), true);
  assert.equal(MemoryValidator.isAligned(16), true);
  assert.equal(MemoryValidator.isAligned(32), true);
  assert.equal(MemoryValidator.isAligned(8), false);
  assert.equal(MemoryValidator.isAligned(17), false);
  assert.equal(MemoryValidator.isAligned(-16), false);
  assert.equal(MemoryValidator.isAligned(8, 8), true);
  assert.equal(MemoryValidator.isAligned(Number.NaN), false);
  assert.equal(MemoryValidator.isAligned(Number.POSITIVE_INFINITY), false);
  assert.equal(MemoryValidator.isAligned(16.5), false);
  assert.equal(MemoryValidator.isAligned(16, 0), false);
  assert.equal(MemoryValidator.isAligned(16, Number.NaN), false);
});

test("assertAligned throws LSM-ALIGN-001 on a misaligned ptr", () => {
  assert.doesNotThrow(() => MemoryValidator.assertAligned(48));
  const err = caught(() => MemoryValidator.assertAligned(7));
  assert.ok(err instanceof SecurityTrap);
  assert.equal(err.code, "LSM-ALIGN-001");
  for (const [ptr, align] of [
    [Number.NaN, 16],
    [Number.POSITIVE_INFINITY, 16],
    [16.5, 16],
    [16, 0],
    [16, Number.POSITIVE_INFINITY],
  ]) {
    assert.equal(
      caught(() => MemoryValidator.assertAligned(ptr, align)).code,
      "LSM-ALIGN-001",
    );
  }
});

test("alignUp rounds up to the next multiple", () => {
  assert.equal(MemoryValidator.alignUp(1), 16);
  assert.equal(MemoryValidator.alignUp(16), 16);
  assert.equal(MemoryValidator.alignUp(17), 32);
  assert.equal(MemoryValidator.alignUp(0), 0);
  assert.equal(MemoryValidator.alignUp(5, 8), 8);
  assert.equal(ALIGN_BYTES, 16);
  for (const [n, align] of [
    [-1, 16],
    [Number.NaN, 16],
    [Number.POSITIVE_INFINITY, 16],
    [1.5, 16],
    [1, 0],
    [1, Number.NaN],
    [Number.MAX_SAFE_INTEGER, 16],
  ]) {
    assert.equal(
      caught(() => MemoryValidator.alignUp(n, align)).code,
      "LSM-ALIGN-001",
    );
  }
});

test("assertInBounds throws LSM-BOUNDS-001 past capacity", () => {
  assert.doesNotThrow(() => MemoryValidator.assertInBounds(0, 16, 16));
  assert.doesNotThrow(() => MemoryValidator.assertInBounds(8, 8, 16));
  const err = caught(() => MemoryValidator.assertInBounds(8, 16, 16));
  assert.ok(err instanceof SecurityTrap);
  assert.equal(err.code, "LSM-BOUNDS-001");
  assert.equal(caught(() => MemoryValidator.assertInBounds(-1, 4, 16)).code, "LSM-BOUNDS-001");
  for (const [ptr, len, capacity] of [
    [0, 0, -1],
    [Number.NaN, 0, 16],
    [0, Number.POSITIVE_INFINITY, 16],
    [0, 1, Number.NaN],
    [0.5, 1, 16],
    [0, 1.5, 16],
    [0, 1, 16.5],
    [Number.MAX_SAFE_INTEGER, 1, Number.MAX_SAFE_INTEGER],
    [Number.MAX_SAFE_INTEGER + 1, 0, Number.MAX_SAFE_INTEGER + 1],
  ]) {
    assert.equal(
      caught(() => MemoryValidator.assertInBounds(ptr, len, capacity)).code,
      "LSM-BOUNDS-001",
    );
  }
});
