import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { before, describe, it } from "node:test";

import {
  checkEffects,
  checkTypes,
  checkValueStates,
  parseProgram,
  verifyGovernance,
} from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(
  HERE,
  "..",
  "src",
  "self-hosted",
  "slide-vok-authority-types.fungi",
);

const expectedAliases = new Map([
  [
    "SlideVOKAdmittedObject",
    'Authority<"slide.vok.admitted-object.v1">',
  ],
  ["SlideVOKLease", 'Authority<"slide.vok.lease.v1">'],
]);

let parsed;
let source;

const errors = (diagnostics) =>
  diagnostics.filter((diagnostic) => diagnostic.severity === "error");

before(async () => {
  source = await readFile(SOURCE, "utf8");
  parsed = parseProgram(source, SOURCE, { requireVersionHeader: true });
});

describe("SLIDE VOK authority source contract", () => {
  it("passes the production parse, type, value-state, effect, and governance gates", () => {
    assert.deepEqual(errors(parsed.diagnostics), []);
    assert.deepEqual(errors(checkTypes(parsed.ast).diagnostics), []);
    assert.deepEqual(
      errors(checkValueStates(parsed.ast, "production").diagnostics),
      [],
    );

    const effects = checkEffects(parsed.flows, parsed.ast);
    assert.deepEqual(errors(effects), []);
    assert.deepEqual(
      errors(
        verifyGovernance(
          parsed.ast,
          parsed.flows,
          effects,
          "production",
        ).diagnostics,
      ),
      [],
    );
  });

  it("declares the exact admitted-object and lease authority tags", () => {
    const aliases = new Map(
      parsed.ast.children
        .filter((node) => node.kind === "typeDecl")
        .map((node) => [node.value, node.children?.[0]?.value]),
    );

    for (const [name, typeRef] of expectedAliases) {
      assert.equal(aliases.get(name), typeRef, name);
    }
  });

  it("keeps serializable evidence and receipts value-only", () => {
    const authorityAliases = new Set(expectedAliases.keys());
    const records = parsed.ast.children.filter((node) => node.kind === "recordDecl");

    for (const record of records) {
      const authorityFields = (record.children ?? []).filter(
        (field) =>
          field.kind === "paramDecl"
          && authorityAliases.has(String(field.value).split(":").slice(1).join(":").trim()),
      );
      assert.deepEqual(authorityFields, [], `${record.value} contains authority`);
    }
  });

  it("does not publish an authority-released success claim", () => {
    assert.equal(source.includes("authorityReleased: true"), false);
  });
});
