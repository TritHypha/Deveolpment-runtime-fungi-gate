import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  checkEffects,
  executeFlow,
  loadPackageManifest,
  parseProgram,
} from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "package-scalar-quote-stripping.fungi");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const VALUES = Object.freeze([
  Object.freeze(['  "@pkg/double"  ', "@pkg/double"]),
  Object.freeze(["  '@pkg/single'  ", "@pkg/single"]),
  Object.freeze(["  @pkg/plain  ", "@pkg/plain"]),
  Object.freeze(['  "@pkg/open  ', '"@pkg/open']),
  Object.freeze(['  @pkg/close"  ', '@pkg/close"']),
  Object.freeze(['  "@pkg/mixed\'  ', '"@pkg/mixed\'']),
  Object.freeze(["  '@pkg/mixed\"  ", "'@pkg/mixed\""]),
  Object.freeze(['  ""  ', ""]),
  Object.freeze(["  ''  ", ""]),
  Object.freeze(['  "nested"tail"  ', 'nested"tail']),
  Object.freeze(["constructor", "constructor"]),
  Object.freeze(["__proto__", "__proto__"]),
  Object.freeze(["e\u0301", "e\u0301"]),
  Object.freeze(["\u00e9", "\u00e9"]),
  Object.freeze(["plain\u0000tail", "plain\u0000tail"]),
]);

async function compileCandidate() {
  assert.ok(existsSync(SOURCE), "compiler must own the Fungi scalar quote stripper");
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "package-scalar-quote-stripping.fungi");
  assert.deepEqual(
    (program.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  const effects = checkEffects(program.flows, program.ast);
  assert.deepEqual(
    effects.flatMap((result) => result.diagnostics)
      .filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  return program;
}

async function interpret(program, value) {
  const interpreted = await executeFlow(
    "stripPackageScalarQuotes",
    new Map([["value", { __tag: "string", value }]]),
    program.ast,
    program.flows,
  );
  return interpreted.value;
}

function resolveThroughPublicCaller(directory, raw) {
  writeFileSync(
    join(directory, "package.galerina.yaml"),
    `name: "@test/quote-proof"\nversion: "1.0.0"\nhash: ${raw}\n`,
    "utf8",
  );
  const manifest = loadPackageManifest(directory);
  assert.ok(manifest !== undefined, `manifest must parse ${JSON.stringify(raw)}`);
  return manifest.hash;
}

describe("package-owned Fungi scalar quote stripping", () => {
  it("requires a governed asset with the project control-flow restrictions", () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    assert.ok(
      packageJson.packageGraph.loadedAssets.includes(
        "src/self-hosted/package-scalar-quote-stripping.fungi",
      ),
    );
    assert.ok(existsSync(SOURCE));
    const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.doesNotMatch(source, /^\s*(?:for|while|loop)\b/mu);
    assert.doesNotMatch(source, /\b(?:null|NaN|throw|try|catch)\b/u);
    assert.doesNotMatch(source, /\belse\s+if\b/u);
    assert.doesNotMatch(source, /\belse\b/u);
  });

  it("matches the real package-manifest caller across hostile scalars", async () => {
    const program = await compileCandidate();
    const directory = mkdtempSync(join(tmpdir(), "galerina-package-quotes-"));
    try {
      for (const [raw, expected] of VALUES) {
        assert.equal(resolveThroughPublicCaller(directory, raw), expected, `TypeScript ${JSON.stringify(raw)}`);
        assert.deepEqual(
          await interpret(program, raw),
          { __tag: "string", value: expected },
          `Fungi ${JSON.stringify(raw)}`,
        );
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
