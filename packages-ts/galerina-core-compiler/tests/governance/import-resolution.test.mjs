// =============================================================================
// Module Registry — import "./path.fungi" DAG Merge Tests (task #94)
//
// Tests for file-based import resolution using the module registry.
// The `gatherFileImports` function is available in dist/module-registry.js.
//
// Covers:
//   - FUNGI-IMPORT-001: file not found at the resolved path
//   - FUNGI-IMPORT-003: circular import detected (A imports B imports A)
//   - FUNGI-IMPORT-004: symbol collision warning (local + imported same name)
//   - Valid import resolves symbols from the imported file
// =============================================================================

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  buildImportedTypeContext,
  checkTypes,
  parseProgram,
} from "../../dist/index.js";
import {
  MAX_IMPORT_BYTES,
  gatherFileImports,
  resolveFileImports,
  checkFileSymbolCollisions,
} from "../../dist/module-registry.js";

// ---------------------------------------------------------------------------
// Temp file helpers
// ---------------------------------------------------------------------------

function createTempDir() {
  const dir = join(tmpdir(), `galerina-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeTempFile(dir, name, content) {
  const p = join(dir, name);
  writeFileSync(p, content, "utf8");
  return p;
}

function cleanDir(dir) {
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* ok */ }
}

function checkImportedTypes(mainSrc, mainPath) {
  const parsed = parseProgram(mainSrc, mainPath);
  assert.deepEqual(parsed.diagnostics, [], JSON.stringify(parsed.diagnostics));
  const imports = gatherFileImports(parsed.ast, mainPath);
  const context = buildImportedTypeContext(imports);
  const errors = checkTypes(parsed.ast, context).diagnostics.filter((d) => d.severity === "error");
  return { imports, errors };
}

function assertImportedTypeRefused(mainSrc, mainPath, expectedImportCode) {
  const { imports, errors } = checkImportedTypes(mainSrc, mainPath);
  assert.ok(
    imports.diagnostics.some((d) => d.code === expectedImportCode),
    `Expected ${expectedImportCode}, got ${imports.diagnostics.map((d) => d.code).join(", ")}`,
  );
  assert.ok(
    errors.some((d) => d.code === "FUNGI-TYPE-001" && d.message.includes("HealthyAlias")),
    `Any import diagnostic must deny HealthyAlias authority, got: ${JSON.stringify(errors)}`,
  );
}

// ---------------------------------------------------------------------------
// Valid import resolves symbols
// ---------------------------------------------------------------------------

describe("import './path.fungi': valid import resolves symbols", () => {
  it("admits a type alias from the closed file-import context", () => {
    const dir = createTempDir();
    try {
      writeTempFile(dir, "types.fungi", "type ExternalId = String\n");
      const mainPath = join(dir, "main.fungi");
      const mainSrc = `
import "./types.fungi"
pure flow echo(value: ExternalId) -> ExternalId
contract { effects {} }
{ return value }
`;
      const parsed = parseProgram(mainSrc, mainPath);
      assert.deepEqual(parsed.diagnostics, []);

      const imports = gatherFileImports(parsed.ast, mainPath);
      assert.deepEqual(imports.diagnostics, []);
      const context = buildImportedTypeContext(imports);
      const errors = checkTypes(parsed.ast, context).diagnostics.filter((d) => d.severity === "error");

      assert.deepEqual(errors.map((d) => d.code), [], JSON.stringify(errors));
    } finally {
      cleanDir(dir);
    }
  });

  it("importing a file with a pure flow exposes it as a 'flow' symbol", () => {
    const dir = createTempDir();
    try {
      const libPath = writeTempFile(dir, "lib.fungi", `
pure flow addTwo(n: Int) -> Int
contract { effects {} }
{ return n }
`);

      const mainSrc = `import "./lib.fungi"\n`;
      const { ast } = parseProgram(mainSrc, join(dir, "main.fungi"));
      const result = gatherFileImports(ast, join(dir, "main.fungi"));

      assert.equal(
        result.diagnostics.length,
        0,
        `Expected 0 diagnostics for valid import, got: ${result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("; ")}`,
      );
      assert.ok(result.symbols.length > 0, "Expected at least one imported symbol");
      const sym = result.symbols.find((s) => s.name === "addTwo");
      assert.ok(sym !== undefined, `Expected 'addTwo' in imported symbols, got: ${result.symbols.map((s) => s.name).join(", ")}`);
      assert.equal(sym.kind, "flow", "addTwo must be classified as a 'flow' symbol");
    } finally {
      cleanDir(dir);
    }
  });

  it("importing a file with a guard exposes it as a 'guard' symbol", () => {
    const dir = createTempDir();
    try {
      const libPath = writeTempFile(dir, "guards.fungi", `
guard PayGuard {
  permitted_effects {
    gateway.charge
  }
}
`);

      const mainSrc = `import "./guards.fungi"\n`;
      const { ast } = parseProgram(mainSrc, join(dir, "main.fungi"));
      const result = gatherFileImports(ast, join(dir, "main.fungi"));

      assert.equal(
        result.diagnostics.length,
        0,
        `Expected 0 diagnostics, got: ${result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("; ")}`,
      );
      const sym = result.symbols.find((s) => s.name === "PayGuard");
      assert.ok(sym !== undefined, `Expected 'PayGuard' in symbols, got: ${result.symbols.map((s) => s.name).join(", ")}`);
      assert.equal(sym.kind, "guard", "PayGuard must be classified as a 'guard' symbol");
    } finally {
      cleanDir(dir);
    }
  });

  it("resolved paths list includes the imported file path", () => {
    const dir = createTempDir();
    try {
      const libPath = writeTempFile(dir, "utils.fungi", `
pure flow identity(x: Int) -> Int
contract { effects {} }
{ return x }
`);

      const mainSrc = `import "./utils.fungi"\n`;
      const { ast } = parseProgram(mainSrc, join(dir, "main.fungi"));
      const result = gatherFileImports(ast, join(dir, "main.fungi"));

      assert.ok(
        result.resolvedPaths.length > 0,
        "resolvedPaths must contain at least the imported file",
      );
      assert.ok(
        result.resolvedPaths.some((p) => p.endsWith("utils.fungi")),
        `Expected utils.fungi in resolvedPaths, got: ${result.resolvedPaths.join(", ")}`,
      );
    } finally {
      cleanDir(dir);
    }
  });
});

describe("closed imported type context", () => {
  const healthyAlias = "type HealthyAlias = String\n";
  const mainUsingHealthyAlias = (failingImport) => `
import "./healthy.fungi"
${failingImport}
pure flow echo(value: HealthyAlias) -> HealthyAlias
contract { effects {} }
{ return value }
`;

  it("exactly deduplicates the same imported declaration", () => {
    const dir = createTempDir();
    try {
      writeTempFile(dir, "healthy.fungi", healthyAlias);
      const mainPath = join(dir, "main.fungi");
      const mainSrc = `
import "./healthy.fungi"
import "./healthy.fungi"
pure flow echo(value: HealthyAlias) -> HealthyAlias
contract { effects {} }
{ return value }
`;

      const { imports, errors } = checkImportedTypes(mainSrc, mainPath);
      assert.equal(imports.diagnostics.length, 0, JSON.stringify(imports.diagnostics));
      assert.deepEqual(errors.map((d) => d.code), [], JSON.stringify(errors));
    } finally {
      cleanDir(dir);
    }
  });

  it("does not deduplicate two different declarations that claim the same source locator", () => {
    const dir = createTempDir();
    try {
      writeTempFile(dir, "healthy.fungi", healthyAlias);
      const mainPath = join(dir, "main.fungi");
      const mainSrc = mainUsingHealthyAlias("");
      const parsed = parseProgram(mainSrc, mainPath);
      const imports = gatherFileImports(parsed.ast, mainPath);
      const original = imports.symbols.find((symbol) => symbol.name === "HealthyAlias");
      assert.ok(original !== undefined);
      const conflictingObservation = {
        ...original,
        node: {
          ...original.node,
          children: [{
            ...(original.node.children?.[0] ?? { kind: "typeRef" }),
            value: "Int",
          }],
        },
      };
      const context = buildImportedTypeContext({
        ...imports,
        symbols: [original, conflictingObservation],
      });
      const errors = checkTypes(parsed.ast, context).diagnostics.filter((d) => d.severity === "error");

      assert.ok(
        errors.some((d) => d.code === "FUNGI-TYPE-001" && d.message.includes("HealthyAlias")),
        `Different AST declarations at one locator are ambiguous, not exact duplicates: ${JSON.stringify(errors)}`,
      );
    } finally {
      cleanDir(dir);
    }
  });

  it("excludes an ambiguous duplicate imported type name", () => {
    const dir = createTempDir();
    try {
      writeTempFile(dir, "one.fungi", "type Shared = String\n");
      writeTempFile(dir, "two.fungi", "record Shared { value: Int }\n");
      const mainPath = join(dir, "main.fungi");
      const mainSrc = `
import "./one.fungi"
import "./two.fungi"
pure flow echo(value: Shared) -> Shared
contract { effects {} }
{ return value }
`;

      const { imports, errors } = checkImportedTypes(mainSrc, mainPath);
      assert.equal(imports.diagnostics.length, 0, JSON.stringify(imports.diagnostics));
      assert.ok(
        errors.some((d) => d.code === "FUNGI-TYPE-001" && d.message.includes("Shared")),
        `Ambiguous Shared must not enter type authority: ${JSON.stringify(errors)}`,
      );
    } finally {
      cleanDir(dir);
    }
  });

  it("keeps a local record authoritative over an imported record of the same name", () => {
    const dir = createTempDir();
    try {
      writeTempFile(dir, "remote.fungi", "record Entry { remote: String }\n");
      const mainPath = join(dir, "main.fungi");
      const mainSrc = `
import "./remote.fungi"
record Entry { local: Int }
pure flow make() -> Entry
contract { effects {} }
{ return Entry { local: 1 } }
`;

      const { imports, errors } = checkImportedTypes(mainSrc, mainPath);
      assert.equal(imports.diagnostics.length, 0, JSON.stringify(imports.diagnostics));
      assert.deepEqual(errors.map((d) => d.code), [], JSON.stringify(errors));
    } finally {
      cleanDir(dir);
    }
  });

  it("removes an imported record schema when a local alias takes the same name", () => {
    const dir = createTempDir();
    try {
      writeTempFile(dir, "remote.fungi", "record Entry { remote: String }\n");
      const mainPath = join(dir, "main.fungi");
      const mainSrc = `
import "./remote.fungi"
type Entry = String
pure flow wantBool(value: Bool) -> Bool
contract { effects {} }
{ return value }
pure flow inspect(entry: Entry) -> Bool
contract { effects {} }
{ return wantBool(entry.remote) }
`;

      const { imports, errors } = checkImportedTypes(mainSrc, mainPath);
      assert.equal(imports.diagnostics.length, 0, JSON.stringify(imports.diagnostics));
      assert.deepEqual(errors.map((d) => d.code), [], JSON.stringify(errors));
    } finally {
      cleanDir(dir);
    }
  });

  it("denies the whole context for a diagnostic of any severity", () => {
    const dir = createTempDir();
    try {
      writeTempFile(dir, "healthy.fungi", healthyAlias);
      const mainPath = join(dir, "main.fungi");
      const mainSrc = mainUsingHealthyAlias("");
      const parsed = parseProgram(mainSrc, mainPath);
      const imports = gatherFileImports(parsed.ast, mainPath);
      assert.deepEqual(imports.diagnostics, []);
      const context = buildImportedTypeContext({
        ...imports,
        diagnostics: [{
          code: "FUNGI-IMPORT-TEST",
          severity: "warning",
          message: "test-only diagnostic",
          file: mainPath,
          importedFrom: "./healthy.fungi",
        }],
      });
      const errors = checkTypes(parsed.ast, context).diagnostics.filter((d) => d.severity === "error");
      assert.ok(
        errors.some((d) => d.code === "FUNGI-TYPE-001" && d.message.includes("HealthyAlias")),
        `Even a warning must deny imported authority: ${JSON.stringify(errors)}`,
      );
    } finally {
      cleanDir(dir);
    }
  });

  it("keeps the historical checkTypes string-array API compatible", () => {
    const parsed = parseProgram(`
pure flow echo(value: LegacyExternal) -> LegacyExternal
contract { effects {} }
{ return value }
`, "legacy-imported-types.fungi");
    assert.deepEqual(parsed.diagnostics, []);
    const errors = checkTypes(parsed.ast, ["LegacyExternal"]).diagnostics.filter((d) => d.severity === "error");
    assert.deepEqual(errors.map((d) => d.code), [], JSON.stringify(errors));
  });

  it("grants no imported type authority when another import is missing", () => {
    const dir = createTempDir();
    try {
      writeTempFile(dir, "healthy.fungi", healthyAlias);
      const mainPath = join(dir, "main.fungi");
      assertImportedTypeRefused(
        mainUsingHealthyAlias('import "./missing.fungi"'),
        mainPath,
        "FUNGI-IMPORT-001",
      );
    } finally {
      cleanDir(dir);
    }
  });

  it("grants no imported type authority when another import is malformed", () => {
    const dir = createTempDir();
    try {
      writeTempFile(dir, "healthy.fungi", healthyAlias);
      writeTempFile(dir, "malformed.fungi", "record Broken { value:\n");
      const mainPath = join(dir, "main.fungi");
      assertImportedTypeRefused(
        mainUsingHealthyAlias('import "./malformed.fungi"'),
        mainPath,
        "FUNGI-IMPORT-002",
      );
    } finally {
      cleanDir(dir);
    }
  });

  it("grants no imported type authority when another import is oversized", () => {
    const dir = createTempDir();
    try {
      writeTempFile(dir, "healthy.fungi", healthyAlias);
      writeTempFile(dir, "oversized.fungi", " ".repeat(MAX_IMPORT_BYTES + 1));
      const mainPath = join(dir, "main.fungi");
      assertImportedTypeRefused(
        mainUsingHealthyAlias('import "./oversized.fungi"'),
        mainPath,
        "FUNGI-IMPORT-006",
      );
    } finally {
      cleanDir(dir);
    }
  });

  it("grants no imported type authority when another import escapes the source root", () => {
    const dir = createTempDir();
    try {
      writeTempFile(dir, "healthy.fungi", healthyAlias);
      const mainPath = join(dir, "main.fungi");
      assertImportedTypeRefused(
        mainUsingHealthyAlias('import "../escaped.fungi"'),
        mainPath,
        "FUNGI-IMPORT-005",
      );
    } finally {
      cleanDir(dir);
    }
  });

  it("grants no imported type authority when another import is cyclic", () => {
    const dir = createTempDir();
    try {
      writeTempFile(dir, "healthy.fungi", healthyAlias);
      writeTempFile(dir, "a.fungi", 'import "./b.fungi"\ntype A = String\n');
      writeTempFile(dir, "b.fungi", 'import "./a.fungi"\ntype B = String\n');
      const mainPath = join(dir, "main.fungi");
      assertImportedTypeRefused(
        mainUsingHealthyAlias('import "./a.fungi"'),
        mainPath,
        "FUNGI-IMPORT-003",
      );
    } finally {
      cleanDir(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// FUNGI-IMPORT-001: file not found
// ---------------------------------------------------------------------------

describe("FUNGI-IMPORT-001: import of non-existent file", () => {
  it("import './nonexistent.fungi' produces FUNGI-IMPORT-001 diagnostic", () => {
    const dir = createTempDir();
    try {
      const mainSrc = `import "./nonexistent.fungi"\n`;
      const { ast } = parseProgram(mainSrc, join(dir, "main.fungi"));
      const result = gatherFileImports(ast, join(dir, "main.fungi"));

      const imp001 = result.diagnostics.filter((d) => d.code === "FUNGI-IMPORT-001");
      assert.ok(
        imp001.length >= 1,
        `Expected FUNGI-IMPORT-001 for missing file, got: ${result.diagnostics.map((d) => d.code).join(", ")}`,
      );
      assert.equal(
        imp001[0].severity,
        "error",
        "FUNGI-IMPORT-001 must be an error",
      );
      assert.ok(
        imp001[0].message.includes("nonexistent.fungi") || imp001[0].importedFrom?.includes("nonexistent"),
        `FUNGI-IMPORT-001 message must mention the missing file, got: ${imp001[0].message}`,
      );
    } finally {
      cleanDir(dir);
    }
  });

  it("import with valid package name (not relative) does not trigger FUNGI-IMPORT-001", () => {
    // Package imports like `import Email from "@galerina/core-types"` are handled
    // by resolveImports, not gatherFileImports. Non-relative imports return no results.
    const dir = createTempDir();
    try {
      const mainSrc = `import Email from "@galerina/core-types"\n`;
      const { ast } = parseProgram(mainSrc, join(dir, "main.fungi"));
      const result = gatherFileImports(ast, join(dir, "main.fungi"));

      const imp001 = result.diagnostics.filter((d) => d.code === "FUNGI-IMPORT-001");
      assert.equal(
        imp001.length,
        0,
        `Non-relative package import must not trigger FUNGI-IMPORT-001`,
      );
    } finally {
      cleanDir(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// FUNGI-IMPORT-003: circular import
// ---------------------------------------------------------------------------

describe("FUNGI-IMPORT-003: circular import detected", () => {
  it("file A imports file B which imports file A — FUNGI-IMPORT-003", () => {
    const dir = createTempDir();
    try {
      // Write file B first (it imports A)
      writeTempFile(dir, "b.fungi", `import "./a.fungi"\n\npure flow fromB() -> Int\ncontract { effects {} }\n{ return 1 }\n`);
      // Write file A (it imports B)
      writeTempFile(dir, "a.fungi", `import "./b.fungi"\n\npure flow fromA() -> Int\ncontract { effects {} }\n{ return 2 }\n`);

      // Parse the main entry point (a.fungi imports b.fungi imports a.fungi → cycle)
      const mainSrc = `import "./a.fungi"\n`;
      const { ast } = parseProgram(mainSrc, join(dir, "main.fungi"));
      const result = gatherFileImports(ast, join(dir, "main.fungi"));

      const imp003 = result.diagnostics.filter((d) => d.code === "FUNGI-IMPORT-003");
      assert.ok(
        imp003.length >= 1,
        `Expected FUNGI-IMPORT-003 for circular import, got: ${result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("; ")}`,
      );
      assert.equal(
        imp003[0].severity,
        "error",
        "FUNGI-IMPORT-003 must be an error",
      );
    } finally {
      cleanDir(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// FUNGI-IMPORT-004: symbol collision warning
// ---------------------------------------------------------------------------

describe("FUNGI-IMPORT-004: symbol collision between imports", () => {
  it("two imported files with the same flow name — FUNGI-IMPORT-004 warning", () => {
    // FUNGI-IMPORT-004 is emitted by checkFileSymbolCollisions, not gatherFileImports.
    // gatherFileImports returns all symbols; the collision check is a separate step.
    const dir = createTempDir();
    try {
      writeTempFile(dir, "lib1.fungi", `pure flow helper() -> Int\ncontract { effects {} }\n{ return 1 }\n`);
      writeTempFile(dir, "lib2.fungi", `pure flow helper() -> Int\ncontract { effects {} }\n{ return 2 }\n`);

      const mainSrc = `import "./lib1.fungi"\nimport "./lib2.fungi"\n`;
      const { ast } = parseProgram(mainSrc, join(dir, "main.fungi"));
      const importResult = gatherFileImports(ast, join(dir, "main.fungi"));

      // Run the symbol collision check with an empty local-name set
      const collisions = checkFileSymbolCollisions(
        importResult.symbols,
        new Set(),
        join(dir, "main.fungi"),
      );

      const imp004 = collisions.filter((d) => d.code === "FUNGI-IMPORT-004");
      assert.ok(
        imp004.length >= 1,
        `Expected FUNGI-IMPORT-004 for symbol collision on 'helper', got: ${collisions.map((d) => `${d.code}: ${d.message}`).join("; ")}`,
      );
      assert.equal(
        imp004[0].severity,
        "warning",
        "FUNGI-IMPORT-004 must be a warning (not a hard error)",
      );
    } finally {
      cleanDir(dir);
    }
  });

  it("two imports with distinct symbol names — no FUNGI-IMPORT-004", () => {
    const dir = createTempDir();
    try {
      writeTempFile(dir, "libA.fungi", `pure flow alpha() -> Int\ncontract { effects {} }\n{ return 1 }\n`);
      writeTempFile(dir, "libB.fungi", `pure flow beta() -> Int\ncontract { effects {} }\n{ return 2 }\n`);

      const mainSrc = `import "./libA.fungi"\nimport "./libB.fungi"\n`;
      const { ast } = parseProgram(mainSrc, join(dir, "main.fungi"));
      const importResult = gatherFileImports(ast, join(dir, "main.fungi"));

      const collisions = checkFileSymbolCollisions(
        importResult.symbols,
        new Set(),
        join(dir, "main.fungi"),
      );

      const imp004 = collisions.filter((d) => d.code === "FUNGI-IMPORT-004");
      assert.equal(
        imp004.length,
        0,
        `Expected no FUNGI-IMPORT-004 for distinct symbol names, got: ${imp004.map((d) => d.message).join("; ")}`,
      );
    } finally {
      cleanDir(dir);
    }
  });
});
