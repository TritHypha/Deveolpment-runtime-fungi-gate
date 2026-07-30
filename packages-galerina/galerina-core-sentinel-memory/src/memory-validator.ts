// memory-validator.ts — stateless alignment + bounds checks.
//
// Every pointer handed out by the Sentinel Memory is 128-bit (16-byte) aligned
// so that views can be created without misalignment faults on the target ISA /
// WASM SIMD lane. These checks are pure functions — no engine state — so they
// can be reused by callers that hold raw offsets.

import { SecurityTrap } from "./errors.js";

/** 128-bit alignment, in bytes. */
export const ALIGN_BYTES = 16;

function isSafeNonNegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function isValidAlignment(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

export class MemoryValidator {
  /** True if `ptr` is a non-negative multiple of `align` (default 16). */
  static isAligned(ptr: number, align: number = ALIGN_BYTES): boolean {
    return (
      isSafeNonNegativeInteger(ptr) &&
      isValidAlignment(align) &&
      ptr % align === 0
    );
  }

  /** Trap unless `ptr` is a non-negative multiple of `align` (default 16). */
  static assertAligned(ptr: number, align: number = ALIGN_BYTES): void {
    if (!MemoryValidator.isAligned(ptr, align)) {
      throw new SecurityTrap(
        "LSM-ALIGN-001",
        `pointer ${ptr} is not ${align}-byte (128-bit) aligned`,
      );
    }
  }

  /** Trap unless [ptr, ptr+len) lies fully inside [0, capacity). */
  static assertInBounds(ptr: number, len: number, capacity: number): void {
    if (
      !isSafeNonNegativeInteger(ptr) ||
      !isSafeNonNegativeInteger(len) ||
      !isSafeNonNegativeInteger(capacity) ||
      ptr > capacity ||
      len > capacity - ptr
    ) {
      throw new SecurityTrap(
        "LSM-BOUNDS-001",
        `access ptr=${ptr} len=${len} is out of bounds for capacity ${capacity}`,
      );
    }
  }

  /** Round `n` up to the next multiple of `align` (default 16). */
  static alignUp(n: number, align: number = ALIGN_BYTES): number {
    if (!isSafeNonNegativeInteger(n) || !isValidAlignment(align)) {
      throw new SecurityTrap(
        "LSM-ALIGN-001",
        `cannot align unsafe integer ${n} to ${align} bytes`,
      );
    }
    const remainder = n % align;
    const delta = remainder === 0 ? 0 : align - remainder;
    if (n > Number.MAX_SAFE_INTEGER - delta) {
      throw new SecurityTrap(
        "LSM-ALIGN-001",
        `aligned result for ${n} at ${align} bytes exceeds the safe integer range`,
      );
    }
    return n + delta;
  }
}
