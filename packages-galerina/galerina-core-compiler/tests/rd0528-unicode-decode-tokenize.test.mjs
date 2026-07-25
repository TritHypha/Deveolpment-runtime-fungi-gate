/**
 * RD-0528 increment-1 — the `.fungi` twin DECODES `\u` escapes, measured through `tokenize`.
 *
 * Owner ruling (2026-07-25): `.fungi` string literals decode `\u`, with UTF-16 length semantics
 * byte-identical to `.ts` (`\u{1F600}` is length 2, not 1). Non-`\u` escapes stay pass-through — that
 * is SYMMETRIC with lexer.ts:601 and therefore not a divergence; making them decode is increment-2,
 * a both-twins change in which the `.ts` reference moves first.
 *
 * Everything here drives `tokenize`, never `hexToInt` or `scanUnicodeEscape` directly: a helper
 * exercised in isolation measures the component, not the product (R&D 0360). That is also why the
 * hex→int helper and its only consumer landed in ONE commit — an unwired helper would have been
 * dead code by our own detector AND unverifiable at the production surface.
 *
 * Row groups, per the §5a scope pinned in R&D 0360:
 *   decode values · hex case + all 16 digits · validity still fail-CLOSED · non-`\u` scope guard · controls.
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as L from "../dist/index.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const BS = String.fromCharCode(92);   // build escapes at runtime — authoring-time decoding ate an earlier probe

let lexer;
before(() => {
  let src = readFileSync(join(__dir, "../src/self-hosted/lexer.fungi"), "utf8");
  if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
  lexer = L.parseProgram(src, "lexer.fungi");
  const errs = (lexer.diagnostics ?? []).filter((d) => d.severity === "error");
  assert.equal(errs.length, 0, `lexer.fungi must parse clean: ${errs.map((e) => e.code).join(",")}`);
});

/** Tokenize a program carrying `literal` and return the string token's VALUE (or REFUSED). */
async function literalValue(literal) {
  const program = `pure flow f() -> String { return "${literal}" }`;
  const r = await L.executeFlow("tokenize", new Map([["source", { __tag: "string", value: program }]]), lexer.ast);
  const v = r.value ?? r;
  if (v.__tag === "err") return { refused: true };
  const items = (v.__tag === "ok" ? v.value : v).items ?? [];
  const vals = items.map((t) => (t.value ?? t).fields?.get("value")?.value);
  const idx = vals.indexOf("return");
  return { refused: false, value: idx >= 0 ? vals[idx + 1] : undefined };
}

describe("RD-0528 increment-1 · \\u decodes through tokenize", () => {
  it("both escape FORMS decode to the same character", async () => {
    assert.equal((await literalValue(`${BS}u0041`)).value, "A", "fixed \\uHHHH");
    assert.equal((await literalValue(`${BS}u{41}`)).value, "A", "brace \\u{H...}");
  });

  it("astral code points are UTF-16 length 2 — the ruled semantics, not code-point length 1", async () => {
    const r = await literalValue(`${BS}u{1F600}`);
    assert.equal(r.value, "\u{1F600}");
    assert.equal(r.value.length, 2, "surrogate pair — matches the .ts reference");
  });

  it("the maximum valid code point decodes", async () => {
    assert.equal((await literalValue(`${BS}u{10FFFF}`)).value, "\u{10FFFF}");
  });
});

describe("RD-0528 increment-1 · hex fold: case-insensitive, all 16 digits exercised", () => {
  it("lower and upper case agree", async () => {
    assert.equal((await literalValue(`${BS}u{a}`)).value, (await literalValue(`${BS}u{A}`)).value);
    assert.equal((await literalValue(`${BS}u{abc}`)).value, (await literalValue(`${BS}u{ABC}`)).value);
    assert.equal((await literalValue(`${BS}u{def}`)).value, (await literalValue(`${BS}u{DEF}`)).value);
  });

  // hexToInt is new arithmetic in an authoritative stage, so every digit earns a row somewhere:
  // 0-9 via 1234/567/890, a-f via abc/def. A wrong weight for any single digit changes the character.
  it("every hex digit 0-f contributes its correct weight", async () => {
    assert.equal((await literalValue(`${BS}u{1234}`)).value, "ሴ", "1 2 3 4");
    assert.equal((await literalValue(`${BS}u{567}`)).value, "է", "5 6 7");
    assert.equal((await literalValue(`${BS}u{890}`)).value, "࢐", "8 9 0");
    assert.equal((await literalValue(`${BS}u{abc}`)).value, "઼", "a b c");
    assert.equal((await literalValue(`${BS}u{def}`)).value, "෯", "d e f");
  });
});

describe("RD-0528 increment-1 · validity is still fail-CLOSED (decode must not loosen the validator)", () => {
  for (const [label, body] of [
    ["above the maximum code point", `${BS}u{110000}`],
    ["six hex digits above the max", `${BS}u{abcdef}`],
    ["non-hex body", `${BS}u{ZZZ}`],
    ["empty body", `${BS}u{}`],
    ["fixed form with only 3 digits", `${BS}u004`],
  ]) {
    it(`REFUSES ${label}`, async () => {
      assert.equal((await literalValue(body)).refused, true,
        "the 0250-verified validator must still fail-close — decoding is downstream of the refusal");
    });
  }
});

describe("RD-0528 increment-1 · SCOPE GUARD: non-\\u escapes must NOT decode yet", () => {
  // These are symmetric with .ts today. If one of them starts decoding here, increment-1 has
  // overreached into increment-2 — which is a both-twins change that the .ts side must lead.
  for (const [label, lit] of [
    ["\\n", `a${BS}nb`], ["\\t", `a${BS}tb`], ["\\\\", `a${BS}${BS}b`], ["\\\"", `a${BS}"b`],
  ]) {
    it(`${label} stays pass-through (backslash retained)`, async () => {
      assert.equal((await literalValue(lit)).value.length, 4, `${label} must still be 4 characters`);
    });
  }

  it("CONTROL: a plain literal with no escape is unchanged", async () => {
    assert.equal((await literalValue("ab")).value, "ab");
  });
});
