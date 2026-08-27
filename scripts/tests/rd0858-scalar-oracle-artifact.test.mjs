import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const generatorPath = join(root, "scripts", "generate-rd0858-scalar-oracle-artifact.mjs");
const sourcePath = join(
  root,
  "packages",
  "fungi",
  "products",
  "galerina",
  "rd0858-unit4-scalar-oracle",
  "scalar-oracle.fungi",
);
const artifactPath = join(dirname(sourcePath), "scalar-oracle.checked.json");

const loadGenerator = () => import(pathToFileURL(generatorPath).href);

describe("RD-0858 scalar-oracle artifact generator", () => {
  it("exposes only the fixed source and artifact locators", async () => {
    const generator = await loadGenerator();
    assert.equal(generator.SCALAR_ORACLE_SOURCE_RELATIVE, "packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/scalar-oracle.fungi");
    assert.equal(generator.SCALAR_ORACLE_ARTIFACT_RELATIVE, "packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/scalar-oracle.checked.json");
  });

  it("admits the exact UTF-8/LF/NFC source and refuses canonical neighbours", async () => {
    const generator = await loadGenerator();
    const canonical = await readFile(sourcePath);
    assert.doesNotThrow(() => generator.inspectScalarOracleSource(canonical));
    const text = canonical.toString("utf8");
    for (const neighbour of [
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), canonical]),
      Buffer.from(text.replaceAll("\n", "\r\n"), "utf8"),
      Buffer.from(text.replace("scalarOracle", "scalarOracle\u0301"), "utf8"),
      Buffer.from(text.replace("@version 1", "@version 2"), "utf8"),
      Buffer.from(`${text}\npure flow surplus() -> Bool { return true }\n`, "utf8"),
    ]) {
      assert.throws(() => generator.inspectScalarOracleSource(neighbour), /SOURCE|CANONICAL|refus/i);
    }
  });

  it("generates byte-identical isolated candidates", async () => {
    const generator = await loadGenerator();
    const first = await generator.buildScalarOracleArtifactCandidate();
    const second = await generator.buildScalarOracleArtifactCandidate();
    assert.deepEqual(second.bytes, first.bytes);
    assert.deepEqual(second.identity, first.identity);
  });

  it("binds the exact source and complete toolchain identity", async () => {
    const generator = await loadGenerator();
    const candidate = await generator.buildScalarOracleArtifactCandidate();
    assert.match(candidate.identity.sourceDigest, /^sha256:[0-9a-f]{64}$/);
    assert.match(candidate.identity.compilerPackageGraphDigest, /^sha256:[0-9a-f]{64}$/);
    assert.match(candidate.identity.checkerSetDigest, /^sha256:[0-9a-f]{64}$/);
    assert.match(candidate.identity.generatorSourceDigest, /^sha256:[0-9a-f]{64}$/);
    assert.match(candidate.identity.compilerExecutableGraphDigest, /^sha256:[0-9a-f]{64}$/);
    assert.equal(candidate.artifact.productId, "galerina");
    assert.equal(candidate.artifact.runtimeProfile, "scalar-1");
    assert.equal(candidate.artifact.checkedAst.location, undefined);
  });

  it("builds the compiler from HEAD-bound inputs instead of importing ambient dist", async () => {
    const source = await readFile(generatorPath, "utf8");
    assert.doesNotMatch(source, /import\s+\*\s+as\s+compiler\s+from\s+["'][^"']*\/dist\/index\.js["']/u);
    assert.match(source, /requireHeadMatchesWorktree/u);
    assert.match(source, /buildFreshHeadCompiler/u);
    assert.match(source, /compilerExecutableGraphDigest/u);
  });

  it("refuses stale source/artifact and toolchain/artifact pairs", async () => {
    const generator = await loadGenerator();
    const candidate = await generator.buildScalarOracleArtifactCandidate();
    const source = await readFile(sourcePath);
    const staleSource = Buffer.from(source.toString("utf8").replace('"deny"', '"closed"'), "utf8");
    await assert.rejects(
      generator.verifyScalarOraclePair(staleSource, candidate.bytes, candidate.identity),
      /SOURCE_DIGEST|PAIR|refus/i,
    );
    await assert.rejects(
      generator.verifyScalarOraclePair(source, candidate.bytes, {
        ...candidate.identity,
        checkerSetDigest: `sha256:${"f".repeat(64)}`,
      }),
      /CHECKER|TOOLCHAIN|PAIR|refus/i,
    );
  });

  it("matches the committed artifact in check mode", () => {
    const result = spawnSync(process.execPath, [generatorPath, "--check"], {
      cwd: root,
      encoding: "utf8",
      timeout: 130_000,
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /PASS|fixed.point|byte.identical/i);
  });

  it("refuses caller-selected locators and unknown modes", () => {
    for (const args of [
      ["--source", "other.fungi"],
      ["--output", "other.json"],
      ["--check", "other.fungi"],
      ["--unknown"],
    ]) {
      const result = spawnSync(process.execPath, [generatorPath, ...args], {
        cwd: root,
        encoding: "utf8",
        timeout: 130_000,
      });
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}\n${result.stderr}`, /ARGUMENT|MODE|LOCATOR|refus/i);
    }
  });

  it("keeps the committed paths present for Git custody", async () => {
    assert.ok((await readFile(sourcePath)).byteLength > 0);
    assert.ok((await readFile(artifactPath)).byteLength > 0);
  });
});
