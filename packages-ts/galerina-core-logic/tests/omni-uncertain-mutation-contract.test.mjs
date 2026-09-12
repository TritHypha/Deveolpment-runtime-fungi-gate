import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  OMNI_UNCERTAIN_STATES,
  isOmniUncertain,
  omniToDecision,
} from "../dist/omni/index.js";

describe("core-logic canonical Omni uncertainty membership", () => {
  it("does not let legacy exported-set mutation change classification", () => {
    const originalValues = [...OMNI_UNCERTAIN_STATES];

    try {
      OMNI_UNCERTAIN_STATES.clear();
      OMNI_UNCERTAIN_STATES.add("true");

      assert.equal(isOmniUncertain("unknown"), true);
      assert.equal(isOmniUncertain("true"), false);
      assert.equal(isOmniUncertain("false"), false);
    } finally {
      OMNI_UNCERTAIN_STATES.clear();
      for (const value of originalValues) {
        OMNI_UNCERTAIN_STATES.add(value);
      }
    }
  });

  it("does not read an overridden legacy has method", () => {
    const descriptor = Object.getOwnPropertyDescriptor(OMNI_UNCERTAIN_STATES, "has");

    try {
      Object.defineProperty(OMNI_UNCERTAIN_STATES, "has", {
        configurable: true,
        value() {
          throw new Error("legacy membership must not be consulted");
        },
      });

      assert.equal(isOmniUncertain("deferred"), true);
      assert.equal(isOmniUncertain("true"), false);
    } finally {
      if (descriptor) {
        Object.defineProperty(OMNI_UNCERTAIN_STATES, "has", descriptor);
      } else {
        delete OMNI_UNCERTAIN_STATES.has;
      }
    }
  });

  it("does not read a replaced Array.prototype.includes", () => {
    const originalIncludes = Array.prototype.includes;

    try {
      Array.prototype.includes = function replacedIncludes() {
        throw new Error("canonical membership must not use Array.includes");
      };

      assert.equal(isOmniUncertain("inconsistent"), true);
      assert.equal(isOmniUncertain("false"), false);

      const result = omniToDecision({
        state: "unknown",
        confidence: 0.95,
        reasons: [],
        evidence: [],
        advisoryOnly: true,
      });
      assert.equal(result.kind, "review");
      assert.equal(
        result.reason,
        'OmniDecision has uncertain state "unknown". Escalating to review for deterministic resolution.',
      );
    } finally {
      Array.prototype.includes = originalIncludes;
    }
  });
});
