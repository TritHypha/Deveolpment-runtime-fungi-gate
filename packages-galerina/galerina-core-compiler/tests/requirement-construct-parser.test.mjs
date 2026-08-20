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

const requirementSource = (body) =>
  `@version 1\npure flow decide(age: Int, admitted: Verdict) -> Verdict\n` +
  `contract { effects {} }\n{\n  let result: Verdict = requirement {\n${body}\n  }\n` +
  `  return result\n}`;

function nodesOfKind(ast, kind) {
  const found = [];
  (function walk(node) {
    if (!node || typeof node !== "object") return;
    if (node.kind === kind) found.push(node);
    for (const child of node.children ?? []) walk(child);
  })(ast);
  return found;
}

const errorCodes = (parsed) =>
  (parsed.diagnostics ?? [])
    .filter((diagnostic) => diagnostic.severity === "error")
    .map((diagnostic) => diagnostic.code);

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

  it("exports the bounded parser ceiling and actionable diagnostics", () => {
    assert.equal(L.MAX_REQUIREMENT_CONSTRAINTS, 64);
    assert.ok(
      L.FUNGI_REQUIREMENT_DIAGNOSTICS.every(
        (diagnostic) => typeof diagnostic.suggestedFix === "string" && diagnostic.suggestedFix.length > 0,
      ),
    );
  });
});

describe("RD-0858 requirement expression", () => {
  it("retains newline-separated constraints in source order", () => {
    const parsed = L.parseProgram(requirementSource("    age > 17\n    admitted"), "requirement-order.fungi");
    assert.deepEqual(errorCodes(parsed), []);
    const requirements = nodesOfKind(parsed.ast, "requirementExpr");
    assert.equal(requirements.length, 1);
    assert.deepEqual(
      requirements[0].children.map((constraint) => [constraint.kind, constraint.children?.[0]?.kind, constraint.children?.[0]?.value]),
      [
        ["requirementConstraint", "binaryExpr", ">"],
        ["requirementConstraint", "identifier", "admitted"],
      ],
    );
  });

  it("retains semicolon-separated constraints with the same shape", () => {
    const parsed = L.parseProgram(requirementSource("    age > 17; admitted"), "requirement-semicolon.fungi");
    assert.deepEqual(errorCodes(parsed), []);
    const constraints = nodesOfKind(parsed.ast, "requirementExpr")[0]?.children ?? [];
    assert.deepEqual(constraints.map((constraint) => constraint.children?.[0]?.kind), ["binaryExpr", "identifier"]);
    assert.ok(constraints.every((constraint) => constraint.kind === "requirementConstraint" && constraint.children?.length === 1));
  });

  it("refuses an empty requirement block", () => {
    const parsed = L.parseProgram(requirementSource(""), "requirement-empty.fungi");
    assert.ok(errorCodes(parsed).includes("FUNGI-REQUIREMENT-001"));
    assert.equal(nodesOfKind(parsed.ast, "requirementExpr")[0]?.children?.length ?? 0, 0);
  });

  it("retains only 64 constraints and emits the ceiling once", () => {
    const parsed = L.parseProgram(requirementSource(Array.from({ length: 65 }, () => "    true").join("\n")), "requirement-ceiling.fungi");
    assert.equal(errorCodes(parsed).filter((code) => code === "FUNGI-REQUIREMENT-005").length, 1);
    assert.equal(nodesOfKind(parsed.ast, "requirementExpr")[0]?.children?.length, 64);
  });

  it("refuses nested requirement authority", () => {
    const parsed = L.parseProgram(requirementSource("    true\n    requirement { false }"), "requirement-nested.fungi");
    assert.equal(errorCodes(parsed).filter((code) => code === "FUNGI-REQUIREMENT-008").length, 1);
    assert.equal(nodesOfKind(parsed.ast, "requirementExpr").length, 1);
  });

  for (const binding of ["let", "mut", "readonly"]) {
    it(`refuses ${binding} declarations inside a requirement block`, () => {
      const parsed = L.parseProgram(requirementSource(`    ${binding} local = true\n    admitted`), `requirement-${binding}.fungi`);
      assert.ok(errorCodes(parsed).length > 0);
      const constraints = nodesOfKind(parsed.ast, "requirementExpr")[0]?.children ?? [];
      assert.equal(constraints.length, 1);
      assert.equal(constraints[0]?.children?.[0]?.value, "admitted");
    });
  }

  it("assigns finite source spans to every requirement node", () => {
    const parsed = L.parseProgram(requirementSource("    age > 17\n    admitted"), "requirement-spans.fungi");
    const nodes = [
      ...nodesOfKind(parsed.ast, "requirementExpr"),
      ...nodesOfKind(parsed.ast, "requirementConstraint"),
    ];
    assert.ok(nodes.length > 0);
    for (const node of nodes) {
      assert.ok(Number.isFinite(node.location?.line));
      assert.ok(Number.isFinite(node.location?.column));
      assert.ok(Number.isFinite(node.location?.offset));
      assert.ok(Number.isFinite(node.location?.endOffset));
      assert.ok(node.location.endOffset > node.location.offset);
    }
  });
});
