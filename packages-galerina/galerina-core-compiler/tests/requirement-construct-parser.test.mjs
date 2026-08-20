import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as L from "../dist/index.js";

const EXPECTED_REQUIREMENT_CODES = Object.freeze([
  "FUNGI-REQUIREMENT-001",
  "FUNGI-REQUIREMENT-002",
  "FUNGI-REQUIREMENT-003",
  "FUNGI-REQUIREMENT-004",
  "FUNGI-REQUIREMENT-005",
  "FUNGI-REQUIREMENT-006",
  "FUNGI-REQUIREMENT-007",
  "FUNGI-REQUIREMENT-008",
  "FUNGI-REQUIREMENT-009",
  "FUNGI-REQUIREMENT-010",
  "FUNGI-REQUIREMENT-011",
  "FUNGI-REQUIREMENT-012",
]);

describe("RD-0858 requirement parser boundary", () => {
  it("activates only requirement and require as new v1 keywords", () => {
    const tokens = L.lex("requirement require deny ambig", "requirement-keywords.fungi")
      .tokens
      .filter((token) => token.kind !== "eof");

    assert.deepEqual(
      tokens.map(({ kind, value }) => ({ kind, value })),
      [
        { kind: "keyword", value: "requirement" },
        { kind: "keyword", value: "require" },
        { kind: "identifier", value: "deny" },
        { kind: "identifier", value: "ambig" },
      ],
    );
  });

  it("exports the complete fail-closed diagnostic family", () => {
    assert.ok(Array.isArray(L.FUNGI_REQUIREMENT_DIAGNOSTICS));
    assert.equal(L.FUNGI_REQUIREMENT_DIAGNOSTICS.length, 12);
    assert.deepEqual(
      L.FUNGI_REQUIREMENT_DIAGNOSTICS.map((diagnostic) => diagnostic.code),
      EXPECTED_REQUIREMENT_CODES,
    );
    assert.ok(
      L.FUNGI_REQUIREMENT_DIAGNOSTICS.every(
        (diagnostic) => diagnostic.severity === "error" && /^[A-Z][A-Z0-9_]*$/.test(diagnostic.name),
      ),
    );
  });
});
