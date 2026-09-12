/**
 * #185 — direct truth-table oracle for the #160 type-directed WASM host functions.
 *
 * The P9 parity tests assert interpreter == WASM (differential), so a bug present in
 * BOTH backends would pass silently. These tests pin each host function's truth table
 * directly against `createHostRuntime`, independent of the interpreter — a real oracle.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as L from "../dist/index.js";

function host() {
  const rt = L.createHostRuntime();
  return { rt, fn: rt.imports.host };
}

describe("#185 host stdlib oracle: string equality (__str_eq)", () => {
  it("equal VALUES at distinct handles → 1; unequal → 0", () => {
    const { rt, fn } = host();
    const a = rt.internString("abc");
    const b = rt.internString("abc");   // same value, DIFFERENT handle
    const c = rt.internString("xyz");
    assert.notEqual(a, b, "interning does not dedupe — handles differ");
    assert.equal(fn.__str_eq(a, b), 1, "equal values compare equal by value");
    assert.equal(fn.__str_eq(a, c), 0, "unequal values compare unequal");
    assert.equal(fn.__str_eq(a, a), 1, "reflexive");
  });
});

describe("#185 host stdlib oracle: versioned Option ABI (__unwrap_or_v2)", () => {
  it("preserves every i32 payload, including negative values, separately from None", () => {
    const { fn } = host();
    const none = fn.__option_none_v2();
    assert.equal(fn.__option_is_none_v2(none), 1, "None is absent");
    assert.equal(fn.__unwrap_or_v2(none, 99), 99, "None falls back to the default");
    for (const value of [-7, -1, 0, 5, 2_147_483_647, -2_147_483_648]) {
      const some = fn.__option_some_v2(value);
      assert.equal(fn.__option_is_some_v2(some), 1, `Some(${value}) is present`);
      assert.equal(fn.__option_value_v2(some), value, `Some(${value}) keeps its payload`);
      assert.equal(fn.__unwrap_or_v2(some, 99), value, `unwrapOr preserves Some(${value})`);
    }
  });

  it("distinguishes a present negative array element from an out-of-range absence", () => {
    const { fn } = host();
    const arr = fn.__array_create();
    fn.__array_append(arr, -1);
    const present = fn.__array_get_option_v2(arr, 0);
    const absent = fn.__array_get_option_v2(arr, 1);
    assert.equal(fn.__option_is_some_v2(present), 1);
    assert.equal(fn.__unwrap_or_v2(present, 99), -1);
    assert.equal(fn.__option_is_none_v2(absent), 1);
    assert.equal(fn.__unwrap_or_v2(absent, 99), 99);
  });

  it("rejects malformed handles instead of treating them as absence", () => {
    const { fn } = host();
    assert.throws(() => fn.__option_value_v2(-2), /unknown Option handle -2/);
    assert.throws(() => fn.__option_value_v2(0), /unknown Option handle 0/);
    assert.throws(() => fn.__option_is_some_v2(0), /unknown Option handle 0/);
    assert.throws(() => fn.__unwrap_or_v2(Number.NaN, 99), /unknown Option handle NaN/);
    assert.throws(() => fn.__option_value_v2(fn.__option_none_v2()), /cannot read Option payload from None/);
  });

  it("keeps legacy raw helpers stable for already-built modules", () => {
    const { fn } = host();
    assert.equal(fn.__option_some(5), 5);
    assert.equal(fn.__unwrap_or(5, 99), 5);
    assert.equal(fn.__option_none(), -1);
    assert.equal(fn.__unwrap_or(-1, 99), 99);
  });
});

describe("#185 host stdlib oracle: versioned Float64 Option ABI", () => {
  it("preserves finite Float64 payloads, including signed zero, separately from None", () => {
    const { fn } = host();
    const none = fn.__option_none_v2();
    assert.equal(fn.__unwrap_or_f64_v2(none, 3.5), 3.5);
    for (const value of [-0, -3.25, 0, 3.5, Number.MAX_VALUE]) {
      const some = fn.__option_some_f64_v2(value);
      assert.equal(fn.__option_is_some_v2(some), 1, `Some(${value}) is present`);
      assert.ok(Object.is(fn.__option_value_f64_v2(some), value), `Some(${value}) keeps its payload`);
      assert.ok(Object.is(fn.__unwrap_or_f64_v2(some, 9.25), value), `unwrapOr preserves Some(${value})`);
    }
  });

  it("rejects wrong-kind and malformed handles instead of coercing payloads", () => {
    const { fn } = host();
    const i32Some = fn.__option_some_v2(7);
    const f64Some = fn.__option_some_f64_v2(7.25);
    assert.throws(() => fn.__option_value_f64_v2(i32Some), /Float64 Option payload kind/);
    assert.throws(() => fn.__option_value_v2(f64Some), /Float64 Option payload kind/);
    assert.throws(() => fn.__unwrap_or_v2(f64Some, 1), /Float64 Option payload kind/);
    assert.throws(() => fn.__option_value_f64_v2(-2), /unknown Option handle -2/);
    assert.throws(() => fn.__unwrap_or_f64_v2(Number.NaN, 1.5), /unknown Option handle NaN/);
    assert.throws(() => fn.__unwrap_or_f64_v2(-1, Number.NaN), /NonFiniteFloat/);
    assert.throws(() => fn.__unwrap_or_f64_v2(-1, Number.POSITIVE_INFINITY), /NonFiniteFloat/);
  });
});

describe("#185 host stdlib oracle: char→string (__char_to_string)", () => {
  it("code point → interned single-char string; negative → empty", () => {
    const { rt, fn } = host();
    const hA = fn.__char_to_string(65);
    assert.equal(rt.readString(hA), "A");
    const hZ = fn.__char_to_string(122);
    assert.equal(rt.readString(hZ), "z");
    const hNone = fn.__char_to_string(-1);
    assert.equal(rt.readString(hNone), "", "the None sentinel yields the empty string");
  });
});

// RD-0528 step 1 — Char.fromCode. The VALUE is identity (a Char IS its code point i32), so every
// row here that matters is a REFUSAL row: the interpreter's String.fromCodePoint throws on an
// invalid code point, and this host fn must throw too or the WASM backend fail-OPENS on input the
// reference rejects. Value rows are the controls that stop the refusal rows passing vacuously.
describe("#185 host stdlib oracle: Char.fromCode (__char_from_code)", () => {
  it("VALUE is identity for a valid BMP code point (control — the refusals below are not vacuous)", () => {
    const { fn } = host();
    assert.equal(fn.__char_from_code(65), 65, "'A'");
    assert.equal(fn.__char_from_code(0), 0, "U+0000 is a valid code point");
    assert.equal(fn.__char_from_code(0x10FFFF), 0x10FFFF, "the maximum valid code point is accepted");
  });

  it("astral code point survives, and renders as UTF-16 length 2 (the ruled semantics)", () => {
    const { rt, fn } = host();
    const c = fn.__char_from_code(0x1F600);
    assert.equal(c, 0x1F600, "the code point is carried unchanged");
    const s = rt.readString(fn.__char_to_string(c));
    assert.equal(s, "\u{1F600}");
    assert.equal(s.length, 2, "UTF-16 surrogate pair — length 2, matching the .ts reference");
  });

  it("REFUSES above the maximum code point — matching the interpreter's throw", () => {
    const { fn } = host();
    assert.throws(() => fn.__char_from_code(0x110000), RangeError,
      "0x110000 is one past the max; identity would have silently accepted it");
  });

  it("REFUSES a negative code point — matching the interpreter's throw", () => {
    const { fn } = host();
    assert.throws(() => fn.__char_from_code(-1), RangeError);
  });
});

describe("#185 host stdlib oracle: string concat (__str_concat)", () => {
  it("concatenates VALUES into a fresh interned handle", () => {
    const { rt, fn } = host();
    const a = rt.internString("foo");
    const b = rt.internString("bar");
    const h = fn.__str_concat(a, b);
    assert.equal(rt.readString(h), "foobar");
  });
});

describe("#185 host stdlib oracle: Array<String> membership (__array_contains_str)", () => {
  it("by-value membership over interned string handles", () => {
    const { rt, fn } = host();
    const arr = fn.__array_create();
    fn.__array_append(arr, rt.internString("let"));
    fn.__array_append(arr, rt.internString("flow"));
    fn.__array_append(arr, rt.internString("pure"));
    // A needle with the SAME value but a fresh handle must still be found.
    assert.equal(fn.__array_contains_str(arr, rt.internString("flow")), 1, "found by value");
    assert.equal(fn.__array_contains_str(arr, rt.internString("xyz")), 0, "absent");
  });
});

describe("#185 host stdlib oracle: Array length/count (__array_length)", () => {
  it("counts appended elements (#161 Array.count routes here)", () => {
    const { fn } = host();
    const arr = fn.__array_create();
    assert.equal(fn.__array_length(arr), 0);
    fn.__array_append(arr, 10);
    fn.__array_append(arr, 20);
    assert.equal(fn.__array_length(arr), 2);
  });
});

describe("#170 host stdlib oracle: code-point indexing/length (non-BMP)", () => {
  it("__str_count/__str_char_at index by code point, not UTF-16 unit", () => {
    const { rt, fn } = host();
    const h = rt.internString("a\u{1F600}b"); // 'a', 😀 (U+1F600, surrogate pair), 'b'
    assert.equal(fn.__str_count(h), 3, "3 code points, not 4 UTF-16 units");
    assert.equal(fn.__str_length(h), 3, "length agrees with count");
    assert.equal(fn.__str_char_at(h, 0), 0x61, "index 0 → 'a'");
    assert.equal(fn.__str_char_at(h, 1), 0x1F600, "index 1 → 😀 full code point (not a lone surrogate)");
    assert.equal(fn.__str_char_at(h, 2), 0x62, "index 2 → 'b'");
    assert.equal(fn.__str_char_at(h, 3), -1, "out of range → None sentinel");
  });
});

describe("#185 host stdlib oracle: char classifiers (#169)", () => {
  it("isUpper / isLower / isWhitespace / isLetter / isDigit truth tables", () => {
    const { fn } = host();
    assert.equal(fn.__char_is_upper(65), 1, "'A' is upper");
    assert.equal(fn.__char_is_upper(97), 0, "'a' is not upper");
    assert.equal(fn.__char_is_lower(97), 1, "'a' is lower");
    assert.equal(fn.__char_is_lower(65), 0, "'A' is not lower");
    assert.equal(fn.__char_is_whitespace(32), 1, "space is whitespace");
    assert.equal(fn.__char_is_whitespace(65), 0, "'A' is not whitespace");
    assert.equal(fn.__char_is_letter(65), 1, "'A' is a letter");
    assert.equal(fn.__char_is_digit(53), 1, "'5' is a digit");
    assert.equal(fn.__char_is_digit(65), 0, "'A' is not a digit");
    // digit is not a letter and vice versa
    assert.equal(fn.__char_is_letter(53), 0, "'5' is not a letter");
  });
});
