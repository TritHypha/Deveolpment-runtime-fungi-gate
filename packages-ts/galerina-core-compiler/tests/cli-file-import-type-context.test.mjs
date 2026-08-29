import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { compileFile } from "../dist/cli.js";
import { MAX_IMPORT_BYTES } from "../dist/module-registry.js";

const COMPILER_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const INTERNAL_CLI = join(COMPILER_ROOT, "dist", "cli.js");
const PER_BUILD_MS = 120_000;

function withProject(run) {
  const dir = mkdtempSync(join(tmpdir(), "galerina-cli-file-import-types-"));
  try {
    return run({
      dir,
      write(name, source) {
        const file = join(dir, name);
        writeFileSync(file, source, "utf8");
        return file;
      },
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function errors(result) {
  return result.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
}

function diagnosticsFor(result, code) {
  return result.diagnostics.filter((diagnostic) => diagnostic.code === code);
}

function buildStandaloneWasm(dir) {
  const result = spawnSync(
    process.execPath,
    [INTERNAL_CLI, "build", "--target=wasm-standalone", dir],
    {
      cwd: COMPILER_ROOT,
      encoding: "utf8",
      timeout: PER_BUILD_MS,
      shell: false,
    },
  );
  assert.equal(result.error, undefined, `standalone build failed to run: ${String(result.error)}`);
  assert.notEqual(result.status, null, "standalone build timed out");
  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

function standaloneArtifacts(dir) {
  const outputDir = join(dir, "build", "wasm");
  return {
    wat: existsSync(join(outputDir, "output.wat")),
    wasm: existsSync(join(outputDir, "output.wasm")),
  };
}

describe("compileFile: bare-file imported type context", () => {
  it("accepts an imported alias in both check and build modes", () => withProject(({ write }) => {
    write("types.fungi", "@version 1\ntype ExternalId = String\n");
    const main = write("main.fungi", `@version 1
import "./types.fungi"
pure flow echo(value: ExternalId) -> ExternalId
contract { effects {} }
{ return value }
`);

    for (const mode of ["check", "build"]) {
      const result = compileFile(main, mode);
      assert.deepEqual(errors(result), [], `${mode}: ${JSON.stringify(result.diagnostics)}`);
      assert.equal(diagnosticsFor(result, "FUNGI-IMPORT-000").length, 1);
      assert.equal(diagnosticsFor(result, "FUNGI-TYPE-001").length, 0);
      if (mode === "build") assert.equal(typeof result.manifestJson, "string");
    }
  }));

  it("accepts an exact imported record schema in both check and build modes", () => withProject(({ write }) => {
    write("records.fungi", "@version 1\nrecord ImportedEntry { effect: String actor: String }\n");
    const main = write("main.fungi", `@version 1
import "./records.fungi"
pure flow make() -> ImportedEntry
contract { effects {} }
{ return ImportedEntry { effect: "audit.write", actor: "runtime" } }
`);

    for (const mode of ["check", "build"]) {
      const result = compileFile(main, mode);
      assert.deepEqual(errors(result), [], `${mode}: ${JSON.stringify(result.diagnostics)}`);
      assert.equal(diagnosticsFor(result, "FUNGI-IMPORT-000").length, 1);
      assert.equal(diagnosticsFor(result, "FUNGI-TYPE-001").length, 0);
      if (mode === "build") assert.equal(typeof result.manifestJson, "string");
    }
  }));

  it("preserves FUNGI-TYPE-008 for an imported return-record field mismatch", () => withProject(({ write }) => {
    write("records.fungi", "@version 1\nrecord ImportedEntry { effect: String actor: String }\n");
    const main = write("main.fungi", `@version 1
import "./records.fungi"
pure flow make() -> ImportedEntry
contract { effects {} }
{ return ImportedEntry { effect: true, actor: "runtime" } }
`);

    const result = compileFile(main, "check");
    const mismatch = diagnosticsFor(result, "FUNGI-TYPE-008");
    assert.equal(mismatch.length, 1, JSON.stringify(result.diagnostics));
    assert.match(mismatch[0].message, /effect: declared 'String', got 'Bool'/);
    assert.equal(diagnosticsFor(result, "FUNGI-TYPE-001").length, 0);
  }));

  it("preserves FUNGI-TYPE-002 for an imported let-record field mismatch", () => withProject(({ write }) => {
    write("records.fungi", "@version 1\nrecord ImportedEntry { effect: String actor: String }\n");
    const main = write("main.fungi", `@version 1
import "./records.fungi"
pure flow make() -> Int
contract { effects {} }
{
  let entry: ImportedEntry = { effect: "audit.write" }
  return 1
}
`);

    const result = compileFile(main, "check");
    const mismatch = diagnosticsFor(result, "FUNGI-TYPE-002");
    assert.equal(mismatch.length, 1, JSON.stringify(result.diagnostics));
    assert.match(mismatch[0].message, /missing field\(s\): actor/);
    assert.equal(diagnosticsFor(result, "FUNGI-TYPE-001").length, 0);
  }));
});

describe("compileFile: any bare-file import diagnostic denies type authority", () => {
  const cases = [
    {
      name: "missing sibling",
      importLine: 'import "./missing.fungi"',
      expectedCode: "FUNGI-IMPORT-001",
      setup() {},
    },
    {
      name: "malformed sibling",
      importLine: 'import "./malformed.fungi"',
      expectedCode: "FUNGI-IMPORT-002",
      setup(write) {
        write("malformed.fungi", "@version 1\nrecord Broken { value:\n");
      },
    },
    {
      name: "oversized sibling",
      importLine: 'import "./oversized.fungi"',
      expectedCode: "FUNGI-IMPORT-006",
      setup(write) {
        write("oversized.fungi", " ".repeat(MAX_IMPORT_BYTES + 1));
      },
    },
    {
      name: "escaping sibling",
      importLine: 'import "../escaped.fungi"',
      expectedCode: "FUNGI-IMPORT-005",
      setup() {},
    },
    {
      name: "cyclic sibling",
      importLine: 'import "./a.fungi"',
      expectedCode: "FUNGI-IMPORT-003",
      setup(write) {
        write("a.fungi", '@version 1\nimport "./b.fungi"\ntype A = String\n');
        write("b.fungi", '@version 1\nimport "./a.fungi"\ntype B = String\n');
      },
    },
  ];

  for (const testCase of cases) {
    it(`${testCase.name}: preserves the import diagnostic and refuses HealthyAlias`, () => withProject(({ write }) => {
      write("healthy.fungi", "@version 1\ntype HealthyAlias = String\n");
      testCase.setup(write);
      const main = write("main.fungi", `@version 1
import "./healthy.fungi"
${testCase.importLine}
pure flow echo(value: HealthyAlias) -> HealthyAlias
contract { effects {} }
{ return value }
`);

      const result = compileFile(main, "check");
      assert.equal(
        diagnosticsFor(result, testCase.expectedCode).length,
        1,
        JSON.stringify(result.diagnostics),
      );
      assert.ok(
        diagnosticsFor(result, "FUNGI-TYPE-001").some((diagnostic) => diagnostic.message.includes("HealthyAlias")),
        `HealthyAlias must receive no authority after ${testCase.expectedCode}: ${JSON.stringify(result.diagnostics)}`,
      );
    }));
  }
});

describe("build --target=wasm-standalone: bare-file imported type context", () => {
  it("accepts an imported alias without a false second-pass FUNGI-TYPE-001", () => withProject(({ dir, write }) => {
    write("types.fungi", "@version 1\ntype ExternalId = String\n");
    write("main.fungi", `@version 1
import "./types.fungi"
pure flow echo(value: ExternalId) -> ExternalId
contract { intent { "Return the admitted external identifier." } }
{ return value }
`);

    const result = buildStandaloneWasm(dir);
    assert.equal(result.status, 0, result.output);
    assert.doesNotMatch(result.output, /FUNGI-TYPE-001/, result.output);
    assert.match(result.output, /PASS: Check passed/, result.output);
    assert.deepEqual(standaloneArtifacts(dir), { wat: true, wasm: true }, result.output);
  }));

  it("accepts an imported record schema without a false second-pass FUNGI-TYPE-001", () => withProject(({ dir, write }) => {
    write("records.fungi", "@version 1\nrecord ImportedEntry { actor: String }\n");
    write("main.fungi", `@version 1
import "./records.fungi"
pure flow actor(entry: ImportedEntry) -> String
contract { intent { "Read the actor from an admitted imported record." } }
{ return entry.actor }
`);

    const result = buildStandaloneWasm(dir);
    assert.equal(result.status, 0, result.output);
    assert.doesNotMatch(result.output, /FUNGI-TYPE-001/, result.output);
    assert.match(result.output, /PASS: Check passed/, result.output);
    assert.deepEqual(standaloneArtifacts(dir), { wat: true, wasm: true }, result.output);
  }));

  it("refuses a denied import graph without writing a partial standalone artifact", () => withProject(({ dir, write }) => {
    write("healthy.fungi", "@version 1\ntype HealthyAlias = String\n");
    write("main.fungi", `@version 1
import "./healthy.fungi"
import "./missing.fungi"
pure flow echo(value: HealthyAlias) -> HealthyAlias
contract { intent { "Return the admitted identifier only when the import graph is closed." } }
{ return value }
`);

    const result = buildStandaloneWasm(dir);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /FUNGI-IMPORT-001/, result.output);
    assert.match(result.output, /Build failed/, result.output);
    assert.doesNotMatch(result.output, /PASS: Check passed/, result.output);
    assert.deepEqual(standaloneArtifacts(dir), { wat: false, wasm: false }, result.output);
  }));
});
