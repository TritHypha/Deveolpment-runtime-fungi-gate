import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseProgram, resolveSymbols } from "../dist/index.js";

function parseAndResolve(source) {
  const parsed = parseProgram(source, "test.fungi");
  return resolveSymbols(parsed.ast);
}

function hasDiag(result, code) {
  return result.diagnostics.some((d) => d.code === code);
}

describe("Symbol resolver — FUNGI-NAME-001 undeclared name", () => {
  it("emits FUNGI-NAME-001 when identifier in expression is not declared", () => {
    const result = parseAndResolve(`
flow test() -> Int {
  return missingValue
}
`);
    assert.ok(hasDiag(result, "FUNGI-NAME-001"), "Expected FUNGI-NAME-001 for missingValue");
  });

  it("does not emit FUNGI-NAME-001 for None, Some, Ok, Err", () => {
    const result = parseAndResolve(`
flow test() -> String {
  let a = None
  let b = Some
  let c = Ok
  let d = Err
  return "ok"
}
`);
    assert.ok(!hasDiag(result, "FUNGI-NAME-001"), "Option/Result constructors are built-in values");
  });

  it("does not emit FUNGI-NAME-001 for standard prelude names", () => {
    const result = parseAndResolve(`
flow test(raw: String) -> String {
  let email = validate.email(raw)?
  let audit = redact(email)
  let money = Money.gbp("1.00")
  return audit
}
`);
    assert.ok(!hasDiag(result, "FUNGI-NAME-001"), "Prelude names should be predeclared");
  });

  it("does not emit FUNGI-NAME-001 for flow-scoped parameter names", () => {
    const result = parseAndResolve(`
flow test(value: String) -> String {
  return value
}
`);
    assert.ok(!hasDiag(result, "FUNGI-NAME-001"), "Flow parameter should be in scope");
  });

  it("does not treat capitalization as call authority", () => {
    const result = parseAndResolve(`
flow test() -> Int {
  return MissingCallable(1)
}
`);
    assert.ok(hasDiag(result, "FUNGI-NAME-001"), "Undeclared PascalCase call must refuse");
  });

  it("does not treat a record declaration as positional-call authority", () => {
    const result = parseAndResolve(`
record Receipt { value: Int }
flow test() -> Receipt {
  return Receipt(1)
}
`);
    assert.ok(hasDiag(result, "FUNGI-NAME-001"), "Records construct with `Receipt { value: 1 }`, not `Receipt(1)`");
  });

  it("allows an exactly declared PascalCase flow call", () => {
    const result = parseAndResolve(`
flow Compute(value: Int) -> Int { return value }
flow test() -> Int { return Compute(1) }
`);
    assert.ok(!hasDiag(result, "FUNGI-NAME-001"), "Declared flow is callable regardless of case");
  });

  it("allows an exactly supplied imported callable name", () => {
    const parsed = parseProgram(`flow test() -> Int { return ImportedFlow(1) }`, "imported-call.fungi");
    const result = resolveSymbols(parsed.ast, ["ImportedFlow"]);
    assert.ok(!hasDiag(result, "FUNGI-NAME-001"), "Importer-provided callable authority should be exact");
  });

  it("keeps built-in constructors and receiver calls admitted", () => {
    const result = parseAndResolve(`
flow test(value: Int) -> Result<Int, String> {
  let text = value.toString()
  return Ok(value)
}
`);
    assert.ok(!hasDiag(result, "FUNGI-NAME-001"), "Exact built-ins and method receivers remain callable");
  });
});

describe("Symbol resolver — FUNGI-NAME-002 duplicate name", () => {
  it("emits FUNGI-NAME-002 when same name declared twice in same scope", () => {
    const result = parseAndResolve(`
flow test() -> Int {
  let total: Int = 1
  let total: Int = 2
  return total
}
`);
    assert.ok(hasDiag(result, "FUNGI-NAME-002"), "Expected FUNGI-NAME-002 for duplicate total");
  });

  it("does not emit FUNGI-NAME-002 for shadowing in inner scope", () => {
    const result = parseAndResolve(`
flow test() -> Int {
  let total: Int = 1
  if true {
    let total: Int = 2
  }
  return total
}
`);
    assert.ok(!hasDiag(result, "FUNGI-NAME-002"), "Inner shadowing is not same-scope duplicate");
  });

  it("does not emit FUNGI-NAME-002 for same field name in different records", () => {
    const result = parseAndResolve(`
record A { id: String }
record B { id: Int }

flow test() -> String {
  return "ok"
}
`);
    assert.ok(!hasDiag(result, "FUNGI-NAME-002"), "Record field 'id' in separate records should not trigger NAME-002");
  });
});

describe("Symbol resolver — FUNGI-NAME-003 cross-module shadow", () => {
  it("emits FUNGI-NAME-003 when a let binding in flow body shadows a built-in domain type", () => {
    const result = parseAndResolve(`
flow test(raw: String) -> String {
  let Email = raw
  return Email
}
`);
    assert.ok(hasDiag(result, "FUNGI-NAME-003"), "Expected FUNGI-NAME-003 for let Email shadowing built-in Email type");
  });

  it("emits FUNGI-NAME-003 when a mut binding shadows a built-in domain type", () => {
    const result = parseAndResolve(`
flow test(raw: String) -> String {
  mut UserId = raw
  return UserId
}
`);
    assert.ok(hasDiag(result, "FUNGI-NAME-003"), "Expected FUNGI-NAME-003 for mut UserId shadowing built-in UserId type");
  });

  it("does not emit FUNGI-NAME-003 for parameter shadowing a built-in domain type", () => {
    const result = parseAndResolve(`
flow test(Email: String) -> String {
  return Email
}
`);
    assert.ok(!hasDiag(result, "FUNGI-NAME-003"), "Parameter shadowing of built-in domain type should not fire NAME-003");
  });

  it("does not emit FUNGI-NAME-003 for non-domain-type bindings", () => {
    const result = parseAndResolve(`
flow test() -> String {
  let myValue = "hello"
  return myValue
}
`);
    assert.ok(!hasDiag(result, "FUNGI-NAME-003"), "Ordinary binding name should not trigger NAME-003");
  });

  it("cross-module shadow warning has correct source location", () => {
    const result = parseAndResolve(`
flow test(raw: String) -> String {
  let Email = raw
  return Email
}
`);
    const diag = result.diagnostics.find((d) => d.code === "FUNGI-NAME-003");
    assert.ok(diag !== undefined, "Expected FUNGI-NAME-003 diagnostic");
    assert.ok(diag.location !== undefined, "Diagnostic should have a source location");
    assert.ok(typeof diag.location.line === "number", "Location should have a line number");
    assert.ok(typeof diag.location.column === "number", "Location should have a column number");
  });
});

describe("Symbol resolver — SymbolTable", () => {
  it("populates flow names in symbolTable", () => {
    const result = parseAndResolve(`
flow hello() -> String {
  return "hello"
}

flow world(x: Int) -> Int {
  return x
}
`);
    assert.ok(result.symbolTable !== undefined, "symbolTable should be present");
    assert.ok(result.symbolTable.flows.has("hello"), "symbolTable.flows should contain 'hello'");
    assert.ok(result.symbolTable.flows.has("world"), "symbolTable.flows should contain 'world'");
  });

  it("populates type names in symbolTable", () => {
    const result = parseAndResolve(`
type MyAlias = String
record Person { name: String }
enum Color { Red, Green, Blue }

flow test() -> String {
  return "ok"
}
`);
    assert.ok(result.symbolTable !== undefined, "symbolTable should be present");
    assert.ok(result.symbolTable.types.has("MyAlias"), "symbolTable.types should contain 'MyAlias'");
    assert.ok(result.symbolTable.types.has("Person"), "symbolTable.types should contain 'Person'");
    assert.ok(result.symbolTable.types.has("Color"), "symbolTable.types should contain 'Color'");
    assert.equal(result.symbolTable.types.get("MyAlias")?.kind, "type", "MyAlias should have kind 'type'");
    assert.equal(result.symbolTable.types.get("Person")?.kind, "record", "Person should have kind 'record'");
    assert.equal(result.symbolTable.types.get("Color")?.kind, "enum", "Color should have kind 'enum'");
  });

  it("symbolTable flows have source locations", () => {
    const result = parseAndResolve(`
flow myFlow() -> Int {
  return 1
}
`);
    assert.ok(result.symbolTable !== undefined, "symbolTable should be present");
    const loc = result.symbolTable.flows.get("myFlow");
    assert.ok(loc !== undefined, "myFlow should have a location");
    assert.ok(typeof loc.line === "number", "Location should have line");
  });
});
