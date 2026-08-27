import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { lstat, mkdir, mkdtemp, readFile, rm, rmdir, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
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
const compilerDistPath = join(root, "packages-ts", "galerina-core-compiler", "dist");

const loadGenerator = () => import(pathToFileURL(generatorPath).href);

describe("RD-0858 scalar-oracle artifact generator", () => {
  it("exposes only the fixed source and artifact locators", async () => {
    const generator = await loadGenerator();
    assert.equal(generator.SCALAR_ORACLE_SOURCE_RELATIVE, "packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/scalar-oracle.fungi");
    assert.equal(generator.SCALAR_ORACLE_ARTIFACT_RELATIVE, "packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/scalar-oracle.checked.json");
  });

  it("pins the canonical checked artifact to LF in every Git checkout", () => {
    const result = spawnSync("git", ["check-attr", "eol", "--", "packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/scalar-oracle.checked.json"], {
      cwd: root,
      encoding: "utf8",
      timeout: 10_000,
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /: eol: lf\s*$/u);
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
    assert.match(source, /compilerExecutableLocatorsFromHead/u);
    assert.match(source, /compilerExecutableGraphDigest/u);
  });

  it("keeps stale ambient dist residue outside the HEAD-derived executable closure", async () => {
    const residueDirectory = join(compilerDistPath, ".rd0858-stale-control");
    const residuePath = join(residueDirectory, "removed-source.js");
    await mkdir(residueDirectory, { recursive: true });
    try {
      await writeFile(residuePath, "throw new Error(\"stale ambient compiler output\");\n", "utf8");
      const result = spawnSync(process.execPath, [generatorPath, "--check"], {
        cwd: root,
        encoding: "utf8",
        timeout: 130_000,
      });
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
      assert.match(result.stdout, /PASS|fixed.point|byte.identical/i);
      assert.equal((await readFile(residuePath, "utf8")).includes("stale ambient"), true);
    } finally {
      await rm(residueDirectory, { recursive: true, force: true });
    }
  });

  it("does not resolve compiler dependencies from persistent dist node_modules", async () => {
    const dependencyRoot = join(
      compilerDistPath,
      "node_modules",
      "@galerina",
      "devtools-graph-algorithms",
    );
    await assert.rejects(lstat(dependencyRoot), { code: "ENOENT" });
    await mkdir(dependencyRoot, { recursive: true });
    try {
      await writeFile(join(dependencyRoot, "package.json"), JSON.stringify({
        name: "@galerina/devtools-graph-algorithms",
        type: "module",
        exports: "./index.js",
      }), "utf8");
      await writeFile(
        join(dependencyRoot, "index.js"),
        "throw new Error(\"RD0858_AMBIENT_DEPENDENCY_EXECUTED\");\n",
        "utf8",
      );
      const result = spawnSync(process.execPath, [generatorPath, "--check"], {
        cwd: root,
        encoding: "utf8",
        timeout: 130_000,
      });
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
      assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /AMBIENT_DEPENDENCY_EXECUTED/u);
      assert.match(await readFile(join(dependencyRoot, "index.js"), "utf8"), /AMBIENT_DEPENDENCY_EXECUTED/u);
    } finally {
      await unlink(join(dependencyRoot, "index.js")).catch(() => {});
      await unlink(join(dependencyRoot, "package.json")).catch(() => {});
      await rmdir(dependencyRoot).catch(() => {});
      await rmdir(dirname(dependencyRoot)).catch(() => {});
      await rmdir(join(compilerDistPath, "node_modules")).catch(() => {});
    }
  });

  it("refuses missing executable locators without disclosing the local path", async () => {
    const generator = await loadGenerator();
    const temporary = await mkdtemp(join(tmpdir(), "rd0858-missing-locator-"));
    try {
      assert.throws(
        () => generator.digestCompilerExecutableClosure(temporary, ["missing.js"]),
        (error) => {
          assert.match(String(error), /COMPILER_BUILD_(?:MISSING|MANIFEST).*refused/u);
          assert.doesNotMatch(String(error), new RegExp(temporary.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
          return true;
        },
      );
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });

  it("refuses a reparse-point executable root", async (context) => {
    if (process.platform !== "win32") {
      context.skip("Windows junction control");
      return;
    }
    const generator = await loadGenerator();
    const temporary = await mkdtemp(join(tmpdir(), "rd0858-root-junction-"));
    const target = join(temporary, "target");
    const junction = join(temporary, "junction");
    try {
      await mkdir(target);
      await writeFile(join(target, "index.js"), "export const value = 1;\n", "utf8");
      await symlink(target, junction, "junction");
      assert.throws(
        () => generator.digestCompilerExecutableClosure(junction, ["index.js"]),
        /COMPILER_BUILD_(?:REPARSE|SYMLINK).*refused/u,
      );
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });

  it("sanitizes ambient module-resolution controls in isolated children", async () => {
    const temporary = await mkdtemp(join(tmpdir(), "rd0858-node-options-"));
    const marker = join(temporary, "loads.txt");
    const preload = join(temporary, "preload.mjs");
    try {
      await writeFile(preload, [
        "import { appendFileSync } from 'node:fs';",
        `appendFileSync(${JSON.stringify(marker)}, String(process.pid) + "\\n");`,
        "",
      ].join("\n"), "utf8");
      const result = spawnSync(process.execPath, [generatorPath, "--check"], {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          NODE_OPTIONS: `--import=${pathToFileURL(preload).href}`,
          NODE_PATH: join(temporary, "ambient-node-path"),
        },
        timeout: 130_000,
      });
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
      const pids = (await readFile(marker, "utf8")).trim().split("\n");
      assert.equal(pids.length, 1, `ambient preload reached isolated children: ${pids.length}`);
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });

  it("causally binds Node and the TypeScript compiler closure", async () => {
    const generator = await loadGenerator();
    const temporary = await mkdtemp(join(tmpdir(), "rd0858-toolchain-causality-"));
    const nodeExecutable = join(temporary, "node.exe");
    const typeScriptRoot = join(temporary, "typescript");
    try {
      await mkdir(join(typeScriptRoot, "bin"), { recursive: true });
      await mkdir(join(typeScriptRoot, "lib"), { recursive: true });
      await writeFile(nodeExecutable, "node-v1\n", "utf8");
      await writeFile(join(typeScriptRoot, "bin", "tsc"), "tsc-v1\n", "utf8");
      await writeFile(join(typeScriptRoot, "lib", "tsc.js"), "compiler-v1\n", "utf8");
      const baseline = generator.digestBuildToolchainClosure(nodeExecutable, typeScriptRoot);
      await writeFile(join(typeScriptRoot, "lib", "tsc.js"), "compiler-hostile\n", "utf8");
      const hostile = generator.digestBuildToolchainClosure(nodeExecutable, typeScriptRoot);
      assert.notEqual(hostile, baseline);
      assert.throws(
        () => generator.requireBuildToolchainClosure(nodeExecutable, typeScriptRoot, baseline),
        /TOOLCHAIN_DRIFT.*refused/u,
      );
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });

  it("causally refuses runtime mutation after admission", async () => {
    const generator = await loadGenerator();
    const temporary = await mkdtemp(join(tmpdir(), "rd0858-runtime-causality-"));
    try {
      await writeFile(join(temporary, "index.js"), "export const value = 1;\n", "utf8");
      const locators = ["index.js"];
      const baseline = generator.digestCompilerExecutableClosure(temporary, locators);
      await writeFile(join(temporary, "index.js"), "export const value = 2;\n", "utf8");
      assert.throws(
        () => generator.requireCompilerExecutableClosure(temporary, locators, baseline),
        /COMPILER_BUILD_DRIFT.*refused/u,
      );
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });

  it("refuses a consumed module byte/hash mismatch", async () => {
    const generator = await loadGenerator();
    const expected = Object.freeze({
      "file:///runtime/entry.js": `sha256:${"1".repeat(64)}`,
    });
    assert.throws(
      () => generator.validateConsumedModuleTrace(
        [{ url: "file:///runtime/entry.js", digest: `sha256:${"2".repeat(64)}` }],
        expected,
      ),
      /COMPILER_MODULE_(?:BYTES|TRACE).*refused/u,
    );
  });

  it("binds the exact non-filesystem loader bytes into its invocation", async () => {
    const generator = await loadGenerator();
    const baseline = generator.buildStrictLoaderInvocation("export const loader = 1;\n");
    const hostile = generator.buildStrictLoaderInvocation("export const loader = 2;\n");
    assert.match(baseline.url, /^data:text\/javascript;base64,/u);
    assert.match(baseline.digest, /^sha256:[0-9a-f]{64}$/u);
    assert.notEqual(hostile.url, baseline.url);
    assert.notEqual(hostile.digest, baseline.digest);
    const encoded = baseline.url.slice(baseline.url.indexOf(",") + 1);
    assert.equal(Buffer.from(encoded, "base64").toString("utf8"), "export const loader = 1;\n");
  });

  it("bounds toolchain traversal and refuses reparses", async (context) => {
    const generator = await loadGenerator();
    const temporary = await mkdtemp(join(tmpdir(), "rd0858-toolchain-bound-"));
    const nodeExecutable = join(temporary, "node.exe");
    const typeScriptRoot = join(temporary, "typescript");
    try {
      await writeFile(nodeExecutable, "node\n", "utf8");
      let deep = join(typeScriptRoot, "bin");
      for (let index = 0; index < 20; index += 1) deep = join(deep, `d${index}`);
      await mkdir(deep, { recursive: true });
      await mkdir(join(typeScriptRoot, "lib"), { recursive: true });
      await writeFile(join(deep, "tsc"), "deep\n", "utf8");
      await writeFile(join(typeScriptRoot, "lib", "tsc.js"), "compiler\n", "utf8");
      assert.throws(
        () => generator.digestBuildToolchainClosure(nodeExecutable, typeScriptRoot),
        /TOOLCHAIN_(?:DEPTH|BOUND).*refused/u,
      );
      if (process.platform === "win32") {
        await rm(join(typeScriptRoot, "bin"), { recursive: true, force: true });
        const target = join(temporary, "target");
        await mkdir(target);
        await writeFile(join(target, "tsc"), "linked\n", "utf8");
        await symlink(target, join(typeScriptRoot, "bin"), "junction");
        assert.throws(
          () => generator.digestBuildToolchainClosure(nodeExecutable, typeScriptRoot),
          /TOOLCHAIN_REPARSE.*refused/u,
        );
      } else {
        context.diagnostic("Windows junction neighbour not applicable");
      }
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });

  it("keeps unowned temporary residue when the ownership token does not match", async () => {
    const generator = await loadGenerator();
    const temporary = await mkdtemp(join(tmpdir(), "rd0858-scalar-build-"));
    const marker = join(temporary, ".rd0858-scalar-owned.json");
    const residue = join(temporary, "owner-residue.txt");
    try {
      await writeFile(marker, JSON.stringify({
        schema: "rd0858.scalar-temp-owner.v1",
        token: "0".repeat(32),
      }), "utf8");
      await writeFile(residue, "preserve\n", "utf8");
      assert.throws(
        () => generator.cleanupOwnedTemporary(temporary, "1".repeat(32)),
        /TEMP_OWNERSHIP.*refused/u,
      );
      assert.equal(await readFile(residue, "utf8"), "preserve\n");
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });

  it("keeps check mode output-free", async () => {
    const before = await readFile(artifactPath);
    const result = spawnSync(process.execPath, [generatorPath, "--check"], {
      cwd: root,
      encoding: "utf8",
      timeout: 130_000,
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.deepEqual(await readFile(artifactPath), before);
  });

  it("keeps non-executable build evidence outside executable identity", async () => {
    const generator = await loadGenerator();
    const temporary = await mkdtemp(join(tmpdir(), "rd0858-executable-closure-"));
    const left = join(temporary, "left");
    const right = join(temporary, "right");
    try {
      await mkdir(left);
      await mkdir(right);
      for (const directory of [left, right]) {
        await writeFile(join(directory, "index.js"), "export const value = 1;\n", "utf8");
        await writeFile(join(directory, "runtime.json"), "{\"profile\":\"scalar-1\"}\n", "utf8");
      }
      await writeFile(join(left, "build-evidence.json"), "{\"inputDigest\":\"lf\"}\n", "utf8");
      await writeFile(join(right, "build-evidence.json"), "{\"inputDigest\":\"crlf\"}\r\n", "utf8");
      const baseline = generator.digestCompilerExecutableClosure(left);
      assert.equal(generator.digestCompilerExecutableClosure(right), baseline);
      await writeFile(join(right, "runtime.json"), "{\"profile\":\"scalar-64\"}\n", "utf8");
      assert.notEqual(generator.digestCompilerExecutableClosure(right), baseline);
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });

  it("keeps generated package graph reports outside compiler package identity", async () => {
    const generator = await loadGenerator();
    const executableDigest = `sha256:${"e".repeat(64)}`;
    const packageJson = {
      mode: "100644",
      blob: "1".repeat(40),
      path: "packages-ts/galerina-core-compiler/package.json",
    };
    const source = {
      mode: "100644",
      blob: "2".repeat(40),
      path: "packages-ts/galerina-core-compiler/src/index.ts",
    };
    const boundary = {
      mode: "100644",
      blob: "3".repeat(40),
      path: "packages-ts/galerina-core-compiler/.graph/BOUNDARY.md",
    };
    const packageGraph = {
      mode: "100644",
      blob: "4".repeat(40),
      path: "packages-ts/galerina-core-compiler/.graph/package-graph.json",
    };
    const boundaryPolicy = {
      mode: "100644",
      blob: "5".repeat(40),
      path: "packages-ts/galerina-core-compiler/.graph/boundary-policy.json",
    };
    const baseline = generator.digestCompilerPackageIdentityEntries(
      [packageJson, source, boundary, packageGraph, boundaryPolicy],
      executableDigest,
    );
    assert.equal(
      generator.digestCompilerPackageIdentityEntries(
        [packageJson, source, { ...boundary, blob: "6".repeat(40) }, packageGraph, boundaryPolicy],
        executableDigest,
      ),
      baseline,
    );
    assert.equal(
      generator.digestCompilerPackageIdentityEntries(
        [packageJson, source, boundary, { ...packageGraph, blob: "7".repeat(40) }, boundaryPolicy],
        executableDigest,
      ),
      baseline,
    );
    assert.notEqual(
      generator.digestCompilerPackageIdentityEntries(
        [packageJson, { ...source, blob: "8".repeat(40) }, boundary, packageGraph, boundaryPolicy],
        executableDigest,
      ),
      baseline,
    );
    assert.notEqual(
      generator.digestCompilerPackageIdentityEntries(
        [packageJson, source, boundary, packageGraph, { ...boundaryPolicy, blob: "9".repeat(40) }],
        executableDigest,
      ),
      baseline,
    );
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
