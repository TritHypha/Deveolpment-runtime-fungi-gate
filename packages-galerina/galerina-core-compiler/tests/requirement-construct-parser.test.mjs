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

const requireStatementSource = (statement) =>
  `@version 1\npure flow decide(admitted: Verdict) -> Verdict\n` +
  `contract { effects {} }\n{\n  ${statement}\n  return admitted\n}`;

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

describe("RD-0858 require statement", () => {
  it("stores the subject followed by canonical deny and ambig arms", () => {
    const source = requireStatementSource(
      "require admitted {\n    deny: fault Denied\n    ambig: fault Unknown\n  }",
    );
    const parsed = L.parseProgram(source, "require-statement.fungi");
    assert.deepEqual(errorCodes(parsed), []);
    const statements = nodesOfKind(parsed.ast, "requireStmt");
    assert.equal(statements.length, 1);
    assert.deepEqual(
      statements[0].children.map((child) => [child.kind, child.value]),
      [
        ["identifier", "admitted"],
        ["requireArm", "deny"],
        ["requireArm", "ambig"],
      ],
    );
  });

  it("retains an inline requirement expression as the require subject", () => {
    const source = requireStatementSource(
      "require requirement { admitted } { deny: fault Denied ambig: fault Unknown }",
    );
    const parsed = L.parseProgram(source, "require-inline-requirement.fungi");
    assert.deepEqual(errorCodes(parsed), []);
    const statement = nodesOfKind(parsed.ast, "requireStmt")[0];
    assert.equal(statement?.children?.[0]?.kind, "requirementExpr");
    assert.equal(nodesOfKind(parsed.ast, "requirementExpr").length, 1);
  });

  it("canonicalizes ambig-before-deny source order to deny then ambig", () => {
    const source = requireStatementSource(
      "require admitted { ambig: fault Unknown deny: fault Denied }",
    );
    const parsed = L.parseProgram(source, "require-arm-order.fungi");
    assert.deepEqual(errorCodes(parsed), []);
    const arms = nodesOfKind(parsed.ast, "requireStmt")[0]?.children?.slice(1) ?? [];
    assert.deepEqual(arms.map((arm) => arm.value), ["deny", "ambig"]);
  });

  for (const missing of ["deny", "ambig"]) {
    it(`emits FUNGI-REQUIREMENT-006 once when ${missing} is missing`, () => {
      const retained = missing === "deny" ? "ambig: fault Unknown" : "deny: fault Denied";
      const parsed = L.parseProgram(
        requireStatementSource(`require admitted { ${retained} }`),
        `require-missing-${missing}.fungi`,
      );
      assert.equal(errorCodes(parsed).filter((code) => code === "FUNGI-REQUIREMENT-006").length, 1);
    });
  }

  it("does not consume the following statement when the handler block opener is missing", () => {
    const parsed = L.parseProgram(
      requireStatementSource("require admitted"),
      "require-missing-open.fungi",
    );
    assert.equal(errorCodes(parsed).filter((code) => code === "FUNGI-PARSE-001").length, 1);
    assert.equal(errorCodes(parsed).filter((code) => code === "FUNGI-REQUIREMENT-006").length, 2);
    const statement = nodesOfKind(parsed.ast, "requireStmt")[0];
    assert.deepEqual(statement?.children?.map((child) => child.kind), ["identifier"]);
    assert.equal(nodesOfKind(parsed.ast, "returnStmt").length, 1);
  });

  for (const duplicate of ["deny", "ambig"]) {
    it(`refuses and omits a duplicate ${duplicate} arm`, () => {
      const other = duplicate === "deny" ? "ambig: fault Unknown" : "deny: fault Denied";
      const parsed = L.parseProgram(
        requireStatementSource(
          `require admitted { ${duplicate}: fault First ${duplicate}: fault Duplicate ${other} }`,
        ),
        `require-duplicate-${duplicate}.fungi`,
      );
      assert.equal(errorCodes(parsed).filter((code) => code === "FUNGI-REQUIREMENT-006").length, 1);
      const statement = nodesOfKind(parsed.ast, "requireStmt")[0];
      assert.deepEqual(statement?.children?.slice(1).map((arm) => arm.value), ["deny", "ambig"]);
      assert.equal(nodesOfKind(statement, "identifier").some((node) => node.value === "Duplicate"), false);
    });
  }

  for (const unknown of ["allow", "if"]) {
    it(`refuses and omits the unknown ${unknown}: label`, () => {
      const parsed = L.parseProgram(
        requireStatementSource(
          `require admitted { ${unknown}: fault Unexpected deny: fault Denied ambig: fault Unknown }`,
        ),
        `require-unknown-${unknown}.fungi`,
      );
      assert.ok(errorCodes(parsed).length > 0);
      assert.deepEqual(
        nodesOfKind(parsed.ast, "requireStmt")[0]?.children?.slice(1).map((arm) => arm.value),
        ["deny", "ambig"],
      );
    });
  }

  it("retains exact arm spans for block and single-statement bodies", () => {
    const source = requireStatementSource(
      "require admitted {\n    deny: { fault Denied }\n    ambig: fault Unknown\n  }",
    );
    const parsed = L.parseProgram(source, "require-arm-spans.fungi");
    assert.deepEqual(errorCodes(parsed), []);
    const arms = nodesOfKind(parsed.ast, "requireStmt")[0]?.children?.slice(1) ?? [];
    assert.equal(source.slice(arms[0].location.offset, arms[0].location.endOffset), "deny: { fault Denied }");
    assert.equal(source.slice(arms[1].location.offset, arms[1].location.endOffset), "ambig: fault Unknown");
  });
});
