import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normaliseFloor } from "../dist/capability-types.js";

const VALUES = Object.freeze([
  Object.freeze(["execution", "floor_1"]),
  Object.freeze(["containment", "floor_2"]),
  Object.freeze(["proof", "floor_3"]),
  Object.freeze(["proof_zone", "floor_3"]),
  Object.freeze(["attestation", "floor_4"]),
  Object.freeze(["floor_1", "floor_1"]),
  Object.freeze(["floor_4", "floor_4"]),
  Object.freeze(["constructor", "constructor"]),
  Object.freeze(["toString", "toString"]),
  Object.freeze(["valueOf", "valueOf"]),
  Object.freeze(["hasOwnProperty", "hasOwnProperty"]),
  Object.freeze(["__proto__", "__proto__"]),
  Object.freeze(["Execution", "Execution"]),
  Object.freeze([" execution ", " execution "]),
  Object.freeze(["execution\u0000", "execution\u0000"]),
  Object.freeze(["e\u0301", "e\u0301"]),
  Object.freeze(["\u00e9", "\u00e9"]),
  Object.freeze(["", ""]),
]);

describe("canonical governance floor normalization", () => {
  it("normalizes only the five owned aliases and preserves hostile Strings", () => {
    for (const [name, expected] of VALUES) {
      const actual = normaliseFloor(name);
      assert.equal(typeof actual, "string", JSON.stringify(name));
      assert.equal(actual, expected, JSON.stringify(name));
    }
  });
});
