import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { run } from "../dist/index.js";

describe("Claude review authority regressions", () => {
  it("distinct enum variants do not compare equal", async () => {
    const result = await run(`
enum Role { Admin Guest }
pure flow decide() -> Int {
  let role = Role.Guest
  if role == Role.Admin { return 1 }
  return 0
}
`, "enum-equality.fungi", "decide");

    assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
    assert.equal(result.value?.__tag, "int");
    assert.equal(result.value?.value, 0);
  });

  it("a record-literal field is traversed by the type checker", async () => {
    const result = await run(`
pure flow inspect() -> Int {
  let payload = { forbidden: null }
  return 0
}
`, "record-field-type-check.fungi", "inspect", new Map(), { mode: "check-only" });

    assert.equal(result.ok, false);
    assert.ok(
      result.diagnostics.some((diagnostic) => diagnostic.code === "FUNGI-TYPE-025"),
      `expected FUNGI-TYPE-025, got ${result.diagnostics.map((d) => d.code).join(", ")}`,
    );
  });

  it("a runtime error in a match guard cannot select the guarded arm", async () => {
    const result = await run(`
pure flow decide() -> Int {
  match 0 {
    when 1 / 0 > 0 => { return 1 }
    _ => { return 0 }
  }
}
`, "match-guard-error.fungi", "decide");

    assert.notEqual(result.value?.value, 1, "a trapped guard must never authorize its arm");
    assert.equal(result.ok, false, "a trapped guard must fail closed");
  });

  it("governance errors prevent execution and make the runtime result non-ok", async () => {
    const result = await run(`
secure flow sealReceipt(request: Request) -> Result<Response, ApiError>
contract {
  effects { crypto.sign audit.write }
  substrate { lane: photonic  tolerance: 5e-3  redundancy: 3 }
}
{ return Ok(Response.ok({})) }
`, "governance-error-runtime.fungi", "sealReceipt");

    assert.ok(
      result.governanceDiagnostics.some((diagnostic) => diagnostic.code === "FUNGI-SUBSTRATE-001"),
      "fixture must exercise an error-severity governance refusal",
    );
    assert.equal(result.ok, false);
    assert.equal(result.value, undefined, "a governance-refused flow must not execute");
  });
});
