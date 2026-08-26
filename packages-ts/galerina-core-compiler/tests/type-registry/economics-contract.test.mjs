// =============================================================================
// Economics Contract — parser + diagnostic constant tests
//
// Tests:
//   1. contract { economics { target_cost 0.001 } } parses with 0 errors
//   2. contract { lineage { source crm } } parses with 0 errors
//   3. FUNGI_ECON_001.code === "FUNGI-ECON-001"
//   4. FUNGI_ECON_002.severity === "info"
// =============================================================================

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseProgram,
  FUNGI_ECON_001,
  FUNGI_ECON_002,
} from "../../dist/index.js";

// ---------------------------------------------------------------------------
// Parser tests
// ---------------------------------------------------------------------------

describe("contract.economics — parser", () => {
  it("parses contract { economics { target_cost 0.001 } } with 0 parse errors", () => {
    const source = `
flow processOrder(order: Order) -> Result<OrderId, Error>
contract {
  economics {
    target_cost 0.001
  }
}
{
  return order.id
}
`.trim();
    const result = parseProgram(source, "test.fungi");
    const parseErrors = result.diagnostics.filter((d) => d.severity === "error");
    assert.equal(
      parseErrors.length,
      0,
      `Expected 0 parse errors, got: ${parseErrors.map((d) => d.code + ": " + d.message).join(", ")}`,
    );
  });

  it("parses contract { lineage { source crm } } with 0 parse errors", () => {
    const source = `
flow fetchCustomer(id: CustomerId) -> Customer
contract {
  lineage {
    source crm
  }
}
{
  return id
}
`.trim();
    const result = parseProgram(source, "test.fungi");
    const parseErrors = result.diagnostics.filter((d) => d.severity === "error");
    assert.equal(
      parseErrors.length,
      0,
      `Expected 0 parse errors, got: ${parseErrors.map((d) => d.code + ": " + d.message).join(", ")}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Diagnostic constant shape tests
// ---------------------------------------------------------------------------

describe("FUNGI_ECON_001 constant shape", () => {
  it("code is FUNGI-ECON-001", () => {
    assert.equal(FUNGI_ECON_001.code, "FUNGI-ECON-001");
  });
});

describe("FUNGI_ECON_002 constant shape", () => {
  it("severity is info", () => {
    assert.equal(FUNGI_ECON_002.severity, "info");
  });
});
