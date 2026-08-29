import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import test, { after } from "node:test";
import assert from "node:assert/strict";

import { runCorpusAggregate, runCorpusShard } from "../audit-fungi-corpus-check.mjs";
import { deriveCorpusShards } from "../lib/fungi-corpus-shards.mjs";

const roots = [];
const fixtureCompilerPackages = new Map();
const DIGEST_RE = /^sha256:[0-9a-f]{64}$/u;
const CODE_RE = /^FUNGI-[A-Z][A-Z0-9]*-\d+[A-Za-z]?$/u;
const DEFAULT_LIMITS = Object.freeze({
  maxFiles: 16,
  maxBytes: 1024 * 1024,
  timeoutMs: 2_000,
  maxOutputBytes: 16 * 1024,
});

after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function sha256Bytes(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function canonicalDigest(value) {
  return sha256Bytes(Buffer.from(JSON.stringify(value), "utf8"));
}

function write(root, rel, value) {
  const target = join(root, ...rel.split("/"));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, value);
}

function git(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

const CHECKER = String.raw`#!/usr/bin/env node
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const rel = process.argv[3] ?? "";
const name = basename(rel);
const clean = "0 errors, 0 governance warnings";
if (process.env.FUNGI_CORPUS_POISON === "present") {
  console.log("FUNGI-POISON-001: caller environment leaked");
  process.exit(1);
}
if (name.includes("swap-source-parent")) {
  const source = join(process.cwd(), ...rel.split("/"));
  const parent = dirname(source);
  try {
    renameSync(parent, parent + "-admitted");
    mkdirSync(parent);
    writeFileSync(source, "@version 1\npure flow substituted() -> Int { return 0 }\n");
    process.stdout.write(clean);
    process.exit(0);
  } catch {
    console.log("FUNGI-TEST-777: source parent retained");
    process.exit(1);
  }
}
if (name.includes("swap-compiler-parent")) {
  const parent = join(process.cwd(), "packages-ts", "galerina-core-compiler", "dist");
  try {
    renameSync(parent, parent + "-admitted");
    mkdirSync(parent);
    writeFileSync(join(parent, "compiler.cjs"), "module.exports = 'substituted';\n");
    process.stdout.write(clean);
    process.exit(0);
  } catch {
    console.log("FUNGI-TEST-777: compiler parent retained");
    process.exit(1);
  }
}
if (name.includes("consume-stdout")) {
  process.stdout.write("S".repeat(400) + clean);
  process.exit(0);
}
if (name.includes("consume-stderr")) {
  process.stderr.write("E".repeat(400));
  process.stdout.write(clean);
  process.exit(0);
}
if (name.includes("late-stdout-limit")) {
  process.stdout.write("S".repeat(128));
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  writeFileSync(join(process.cwd(), ".late-stream-sentinel"), "started\n");
  process.stdout.write(clean);
  process.exit(0);
}
if (name.includes("late-stderr-limit")) {
  process.stderr.write("E".repeat(128));
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  writeFileSync(join(process.cwd(), ".late-stream-sentinel"), "started\n");
  process.stdout.write(clean);
  process.exit(0);
}
if (name.includes("raw-byte-budget")) {
  process.stdout.write(Buffer.concat([Buffer.from([0x80]), Buffer.from(clean)]));
  process.exit(0);
}
if (name.includes("platform-sentinel")) {
  writeFileSync(join(process.cwd(), ".platform-child-sentinel"), "started\n");
  process.stdout.write(clean);
  process.exit(0);
}
if (name.includes("abort-wait")) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
if (name.includes("timeout")) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1_000);
if (name.includes("stdout-overflow")) {
  process.stdout.write("S".repeat(4_096));
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
}
if (name.includes("stderr-overflow")) {
  process.stderr.write("E".repeat(4_096));
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
}
if (name.includes("numeric-abort")) process.abort();
if (name.includes("plain-high-exit")) process.exit(128);
if (name.includes("high-exit")) {
  console.log("FUNGI-TEST-128: bounded diagnostic");
  process.exit(128);
}
if (name.includes("missing-result")) process.exit(0);
if (name.includes("change-compiler")) {
  writeFileSync(join(process.cwd(), "packages-ts", "galerina-core-compiler", "dist", "compiler.cjs"), "module.exports = 'changed';\n");
}
if (name.includes("change-head")) {
  const ref = readFileSync(join(process.cwd(), ".git", "HEAD"), "utf8").trim().slice(5);
  const next = readFileSync(join(process.cwd(), ".fixture-next-head"), "utf8").trim();
  writeFileSync(join(process.cwd(), ".git", ...ref.split("/")), next + "\n");
}
if (name.includes("expected")) {
  if (!process.argv.includes("--strict-types")) {
    console.log("✅ " + rel + ": 0 errors, 0 governance warnings (1 flow(s), 1 top-level declaration(s))");
    process.exit(0);
  }
  console.log("❌ FUNGI-TEST-001: SECRET_DIAGNOSTIC_BODY");
  process.exit(1);
}
if (name.includes("finding")) {
  console.log("❌ FUNGI-TEST-999: SECRET_DIAGNOSTIC_BODY");
  process.exit(1);
}
console.log("✅ " + rel + ": 0 errors, 0 governance warnings (1 flow(s), 1 top-level declaration(s))");
`;

function fixture(fileMap, sidecars = {}, setup = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "galerina-corpus-v2-")));
  roots.push(root);
  fixtureCompilerPackages.set(root, ["galerina-core-compiler", ...(setup.runtimePackages ?? [])]);
  write(root, "galerina.mjs", setup.checker ?? CHECKER);
  write(root, "packages-ts/galerina-core-compiler/package.json", setup.compilerManifest ?? `${JSON.stringify({
    name: "@galerina/core-compiler",
    type: "module",
    main: "./dist/index.js",
    dependencies: {},
  }, null, 2)}\n`);
  for (const [path, source] of Object.entries(setup.compilerDist ?? {
    "compiler.cjs": "module.exports = 'fixture';\n",
    "index.js": "export const fixture = true;\n",
    "rules.js": "export const rules = 2;\n",
  })) write(root, `packages-ts/galerina-core-compiler/dist/${path}`, source);
  for (const [path, source] of Object.entries(setup.extraFiles ?? {})) write(root, path, source);
  for (const [path, source] of Object.entries(fileMap)) write(root, path, source);
  for (const [path, source] of Object.entries(sidecars)) write(root, path, source);
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.name", "Corpus Fixture"]);
  git(root, ["config", "user.email", "corpus@example.invalid"]);
  git(root, ["config", "core.autocrlf", "false"]);
  git(root, ["add", "--", "galerina.mjs", "packages-ts", ...Object.keys(fileMap), ...Object.keys(sidecars)]);
  git(root, ["commit", "--quiet", "-m", "fixture"]);
  const firstHead = git(root, ["rev-parse", "HEAD"]);
  git(root, ["commit", "--quiet", "--allow-empty", "-m", "future head"]);
  const nextHead = git(root, ["rev-parse", "HEAD"]);
  git(root, ["reset", "--quiet", "--hard", firstHead]);
  write(root, ".fixture-next-head", `${nextHead}\n`);
  for (const link of setup.junctions ?? []) {
    const target = join(root, ...link.target.split("/"));
    const path = join(root, ...link.path.split("/"));
    mkdirSync(dirname(path), { recursive: true });
    symlinkSync(target, path, "junction");
  }
  return root;
}

function compilerFiles(root) {
  const result = ["galerina.mjs"];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && !entry.isSymbolicLink() && /\.(?:c?js)$/u.test(entry.name)) {
        result.push(relative(root, absolute).split(sep).join("/"));
      }
    }
  };
  for (const packageDirectory of fixtureCompilerPackages.get(root) ?? ["galerina-core-compiler"]) {
    result.push(`packages-ts/${packageDirectory}/package.json`);
    visit(join(root, "packages-ts", packageDirectory, "dist"));
  }
  return result.sort();
}

function compilerDigest(root) {
  return canonicalDigest({
    schema: "galerina.fungi-corpus-compiler-input.v2",
    files: compilerFiles(root).map((path) => ({
      path,
      digest: sha256Bytes(readFileSync(join(root, ...path.split("/")))),
    })),
  });
}

function parseCodes(text) {
  const values = String(text).split(/[\s,]+/u).map((value) => value.trim()).filter(Boolean);
  if (values.length === 1 && values[0].toLowerCase() === "none") return { codes: [], malformed: false };
  const malformed = values.length === 0
    || values.some((value) => !CODE_RE.test(value))
    || new Set(values).size !== values.length;
  return { codes: malformed ? [] : values.sort(), malformed };
}

function expectation(root, path) {
  const source = readFileSync(join(root, ...path.split("/")), "utf8");
  const headers = [...source.matchAll(/^\/\/\/\s*expected_diagnostics:\s*(.+)$/gimu)];
  const sidecarPath = `${path}.expected.diagnostics.txt`;
  const hasSidecar = existsSync(join(root, ...sidecarPath.split("/")));
  let input;
  if (headers.length > 1 || (headers.length === 1 && hasSidecar)) {
    input = { schema: "galerina.fungi-corpus-expectation.v2", owner: "INVALID", codes: [], error: "AMBIGUOUS_OWNER" };
  } else if (headers.length === 1) {
    const parsed = parseCodes(headers[0][1]);
    input = parsed.malformed
      ? { schema: "galerina.fungi-corpus-expectation.v2", owner: "INVALID", codes: [], error: "MALFORMED_CODES" }
      : { schema: "galerina.fungi-corpus-expectation.v2", owner: "INLINE", codes: parsed.codes, error: "NONE" };
  } else if (hasSidecar) {
    const parsed = parseCodes(readFileSync(join(root, ...sidecarPath.split("/")), "utf8"));
    input = parsed.malformed
      ? { schema: "galerina.fungi-corpus-expectation.v2", owner: "INVALID", codes: [], error: "MALFORMED_CODES" }
      : { schema: "galerina.fungi-corpus-expectation.v2", owner: "SIDECAR", codes: parsed.codes, error: "NONE" };
  } else {
    input = { schema: "galerina.fungi-corpus-expectation.v2", owner: "NONE", codes: [], error: "NONE" };
  }
  return {
    digest: canonicalDigest(input),
    mode: (input.owner === "INLINE" || input.owner === "SIDECAR") && input.codes.length > 0 ? "strict" : "plain",
  };
}

function requestFor(root, paths, shardCount = 1) {
  const files = [...paths].sort().map((path) => {
    const expected = expectation(root, path);
    return {
      path,
      digest: sha256Bytes(readFileSync(join(root, ...path.split("/")))),
      expectationDigest: expected.digest,
      mode: expected.mode,
    };
  });
  return {
    schema: "galerina.fungi-corpus-request.v2",
    profile: "WORKSET",
    productId: "galerina",
    repositoryHead: git(root, ["rev-parse", "HEAD"]),
    repositoryTree: git(root, ["rev-parse", "HEAD^{tree}"]),
    compilerDigest: compilerDigest(root),
    fileSetDigest: canonicalDigest({ schema: "galerina.fungi-corpus-file-set.v2", files }),
    shardCount,
    files,
  };
}

async function withEnvironment(values, action) {
  const previous = new Map(Object.keys(values).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values)) process.env[key] = value;
    return await action();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function shardFor(request, limits = DEFAULT_LIMITS, index = 0) {
  const result = deriveCorpusShards(request, limits);
  assert.equal(result.kind, "accepted");
  return result.value[index];
}

test("runCorpusShard binds source and semantic expectation bytes without cache or body disclosure", async () => {
  const files = {
    "corpus/a-clean.fungi": "@version 1\npure flow a() -> Int { return 1 }\n",
    "corpus/b-expected.fungi": "@version 1\n/// expected_diagnostics: FUNGI-TEST-001\npure flow b() -> Int { return 1 }\n",
  };
  const root = fixture(files);
  const request = requestFor(root, Object.keys(files));
  const result = await runCorpusShard(request, shardFor(request), { repositoryRoot: root });
  assert.equal(result.kind, "accepted");
  assert.equal(result.value.status, "PASS");
  assert.equal(result.value.termination, "COMPLETE");
  assert.deepEqual(result.value.completed.map(({ path }) => path), Object.keys(files));
  assert.equal(result.value.unprocessed.length, 0);
  assert.ok(result.value.completed.every(({ resultDigest }) => DIGEST_RE.test(resultDigest)));
  assert.equal(Object.isFrozen(result.value.completed[0]), true);
  assert.doesNotMatch(JSON.stringify(result.value), /SECRET_DIAGNOSTIC_BODY|pure flow/u);
  assert.equal(existsSync(join(root, "build", "fungi-corpus-check", "cache.json")), false);
});

test("protected execution retains source and compiler parents against substitution", { skip: process.platform !== "win32" || process.arch !== "x64" }, async (t) => {
  for (const name of ["swap-source-parent", "swap-compiler-parent"]) {
    await t.test(name, async () => {
      const path = `corpus/${name}.fungi`;
      const source = "@version 1\n/// expected_diagnostics: FUNGI-TEST-777\npure flow protected() -> Int { return 1 }\n";
      const root = fixture({ [path]: source });
      const request = requestFor(root, [path]);
      const result = await runCorpusShard(request, shardFor(request), { repositoryRoot: root });
      assert.equal(result.kind, "accepted");
      assert.equal(result.value.status, "PASS");
      assert.equal(result.value.termination, "COMPLETE");
      assert.equal(readFileSync(join(root, ...path.split("/")), "utf8"), source);
      assert.equal(readFileSync(join(root, "packages-ts", "galerina-core-compiler", "dist", "compiler.cjs"), "utf8"), "module.exports = 'fixture';\n");
    });
  }
});

test("compiler runtime dependency bytes cannot mint PASS under unchanged corpus identities", { skip: process.platform !== "win32" || process.arch !== "x64" }, async () => {
  const path = "corpus/runtime-closure.fungi";
  const dependencyPath = "packages-ts/galerina-devtools-graph-algorithms/dist/index.js";
  const dependencyManifest = `${JSON.stringify({
    name: "@galerina/devtools-graph-algorithms",
    type: "module",
    main: "./dist/index.js",
  }, null, 2)}\n`;
  const root = fixture(
    { [path]: "@version 1\npure flow runtimeClosure() -> Int { return 1 }\n" },
    {},
    {
      checker: "#!/usr/bin/env node\nawait import('./packages-ts/galerina-core-compiler/dist/index.js');\n",
      compilerManifest: `${JSON.stringify({
        name: "@galerina/core-compiler",
        type: "module",
        main: "./dist/index.js",
        dependencies: {
          "@galerina/devtools-graph-algorithms": "file:../galerina-devtools-graph-algorithms",
        },
      }, null, 2)}\n`,
      compilerDist: {
        "index.js": "import '@galerina/devtools-graph-algorithms';\n",
      },
      extraFiles: {
        "packages-ts/galerina-devtools-graph-algorithms/package.json": dependencyManifest,
        [dependencyPath]: "console.log('FUNGI-TEST-999: bounded fixture diagnostic');\nprocess.exit(1);\n",
      },
      runtimePackages: ["galerina-devtools-graph-algorithms"],
      junctions: [{
        path: "packages-ts/galerina-core-compiler/node_modules/@galerina/devtools-graph-algorithms",
        target: "packages-ts/galerina-devtools-graph-algorithms",
      }],
    },
  );
  const request = requestFor(root, [path]);
  const shard = shardFor(request);
  const requestDigest = canonicalDigest(request);
  const sourceDigest = request.files[0].digest;
  const shardDigest = shard.shardDigest;

  const finding = await runCorpusShard(request, shard, { repositoryRoot: root });
  assert.equal(finding.kind, "accepted");
  assert.equal(finding.value.status, "FINDING", JSON.stringify(finding));
  assert.equal(finding.value.termination, "COMPLETE", JSON.stringify(finding));

  write(root, dependencyPath, "console.log('0 errors, 0 governance warnings');\nprocess.exit(0);\n");
  const changed = await runCorpusShard(request, shard, { repositoryRoot: root });
  assert.equal(canonicalDigest(request), requestDigest);
  assert.equal(request.files[0].digest, sourceDigest);
  assert.equal(shard.shardDigest, shardDigest);
  assert.equal(changed.kind, "accepted");
  assert.equal(changed.value.status, "REFUSED");
  assert.equal(changed.value.termination, "COMPILER_CHANGED");
});

test("compiler runtime resolver ignores a substituted npm junction and executes admitted package bytes", { skip: process.platform !== "win32" || process.arch !== "x64" }, async () => {
  const path = "corpus/runtime-junction.fungi";
  const packageName = "galerina-devtools-graph-algorithms";
  const dependencyPath = `packages-ts/${packageName}/dist/index.js`;
  const packageManifest = `${JSON.stringify({
    name: "@galerina/devtools-graph-algorithms",
    type: "module",
    main: "./dist/index.js",
  }, null, 2)}\n`;
  const junction = `packages-ts/galerina-core-compiler/node_modules/@galerina/devtools-graph-algorithms`;
  const root = fixture(
    { [path]: "@version 1\npure flow runtimeJunction() -> Int { return 1 }\n" },
    {},
    {
      checker: "#!/usr/bin/env node\nawait import('./packages-ts/galerina-core-compiler/dist/index.js');\n",
      compilerManifest: `${JSON.stringify({
        name: "@galerina/core-compiler",
        type: "module",
        main: "./dist/index.js",
        dependencies: {
          "@galerina/devtools-graph-algorithms": "file:../galerina-devtools-graph-algorithms",
        },
      }, null, 2)}\n`,
      compilerDist: { "index.js": "import '@galerina/devtools-graph-algorithms';\n" },
      extraFiles: {
        [`packages-ts/${packageName}/package.json`]: packageManifest,
        [dependencyPath]: "console.log('FUNGI-TEST-999: admitted dependency diagnostic');\nprocess.exit(1);\n",
        "decoy-package/package.json": packageManifest,
        "decoy-package/dist/index.js": "console.log('0 errors, 0 governance warnings');\nprocess.exit(0);\n",
      },
      runtimePackages: [packageName],
      junctions: [{ path: junction, target: `packages-ts/${packageName}` }],
    },
  );
  const request = requestFor(root, [path]);
  const junctionAbsolute = join(root, ...junction.split("/"));
  rmSync(junctionAbsolute, { recursive: true, force: true });
  symlinkSync(join(root, "decoy-package"), junctionAbsolute, "junction");

  const result = await runCorpusShard(request, shardFor(request), { repositoryRoot: root });
  assert.equal(result.kind, "accepted");
  assert.equal(result.value.status, "FINDING");
  assert.equal(result.value.termination, "COMPLETE");
  assert.match(readFileSync(join(root, ...dependencyPath.split("/")), "utf8"), /admitted dependency/u);
});

test("compiler runtime closure includes transitive local package bytes", { skip: process.platform !== "win32" || process.arch !== "x64" }, async () => {
  const path = "corpus/runtime-transitive.fungi";
  const network = "galerina-core-network";
  const graph = "galerina-devtools-graph-algorithms";
  const graphPath = `packages-ts/${graph}/dist/index.js`;
  const root = fixture(
    { [path]: "@version 1\npure flow runtimeTransitive() -> Int { return 1 }\n" },
    {},
    {
      checker: "#!/usr/bin/env node\nawait import('./packages-ts/galerina-core-compiler/dist/index.js');\n",
      compilerManifest: `${JSON.stringify({
        name: "@galerina/core-compiler",
        type: "module",
        main: "./dist/index.js",
        dependencies: { "@galerina/core-network": "file:../galerina-core-network" },
      }, null, 2)}\n`,
      compilerDist: { "index.js": "import '@galerina/core-network';\n" },
      extraFiles: {
        [`packages-ts/${network}/package.json`]: `${JSON.stringify({
          name: "@galerina/core-network",
          type: "module",
          main: "./dist/index.js",
          dependencies: {
            "@galerina/devtools-graph-algorithms": "file:../galerina-devtools-graph-algorithms",
          },
        }, null, 2)}\n`,
        [`packages-ts/${network}/dist/index.js`]: "import '@galerina/devtools-graph-algorithms';\n",
        [`packages-ts/${graph}/package.json`]: `${JSON.stringify({
          name: "@galerina/devtools-graph-algorithms",
          type: "module",
          main: "./dist/index.js",
        }, null, 2)}\n`,
        [graphPath]: "console.log('FUNGI-TEST-999: transitive dependency diagnostic');\nprocess.exit(1);\n",
      },
      runtimePackages: [network, graph],
      junctions: [
        {
          path: "packages-ts/galerina-core-compiler/node_modules/@galerina/core-network",
          target: `packages-ts/${network}`,
        },
        {
          path: `packages-ts/${network}/node_modules/@galerina/devtools-graph-algorithms`,
          target: `packages-ts/${graph}`,
        },
      ],
    },
  );
  const request = requestFor(root, [path]);
  const shard = shardFor(request);
  const finding = await runCorpusShard(request, shard, { repositoryRoot: root });
  assert.equal(finding.value.status, "FINDING");
  write(root, graphPath, "console.log('0 errors, 0 governance warnings');\nprocess.exit(0);\n");
  const changed = await runCorpusShard(request, shard, { repositoryRoot: root });
  assert.equal(changed.value.status, "REFUSED");
  assert.equal(changed.value.termination, "COMPILER_CHANGED");
});

test("compiler runtime closure refuses ambiguous, missing, non-file, escaping, duplicate and case-alias authority", { skip: process.platform !== "win32" || process.arch !== "x64" }, async (t) => {
  const invalidManifest = (overrides) => `${JSON.stringify({
    name: "@galerina/core-compiler",
    type: "module",
    main: "./dist/index.js",
    dependencies: {},
    ...overrides,
  }, null, 2)}\n`;
  const cases = [
    ["ambiguous entry", (root) => {
      write(root, "packages-ts/galerina-core-compiler/dist/other.js", "export const other = true;\n");
      write(root, "packages-ts/galerina-core-compiler/package.json", invalidManifest({ exports: "./dist/other.js" }));
    }],
    ["missing package", (root) => write(root, "packages-ts/galerina-core-compiler/package.json", invalidManifest({
      dependencies: { "@galerina/missing": "file:../galerina-missing" },
    }))],
    ["non-file entry", (root) => {
      const entry = join(root, "packages-ts", "galerina-core-compiler", "dist", "index.js");
      rmSync(entry, { force: true });
      mkdirSync(entry);
    }],
    ["escaping entry", (root) => write(root, "packages-ts/galerina-core-compiler/package.json", invalidManifest({
      main: "../../outside.js",
    }))],
    ["duplicate dependency", (root) => write(root, "packages-ts/galerina-core-compiler/package.json", invalidManifest({
      dependencies: { "@galerina/core-network": "file:../galerina-core-network" },
      optionalDependencies: { "@galerina/core-network": "file:../galerina-core-network" },
    }))],
    ["case alias", (root) => write(root, "packages-ts/galerina-core-compiler/package.json", invalidManifest({
      dependencies: { "@galerina/Core-Network": "file:../galerina-Core-Network" },
    }))],
  ];

  for (const [name, mutate] of cases) {
    await t.test(name, async () => {
      const path = "corpus/platform-sentinel.fungi";
      const setup = name === "ambiguous entry"
        ? { compilerDist: { "index.js": "export const fixture = true;\n", "other.js": "export const other = true;\n" } }
        : {};
      const root = fixture({ [path]: "@version 1\npure flow invalidClosure() -> Int { return 1 }\n" }, {}, setup);
      const request = requestFor(root, [path]);
      mutate(root);
      const result = await runCorpusShard(request, shardFor(request), { repositoryRoot: root });
      assert.deepEqual(result, { kind: "refused", code: "CORPUS_COMPILER_IDENTITY_REFUSED" });
      assert.equal(existsSync(join(root, ".platform-child-sentinel")), false);
    });
  }
});

test("cumulative stdout and stderr limits terminate before a later child can use the other stream budget", { skip: process.platform !== "win32" || process.arch !== "x64" }, async (t) => {
  for (const stream of ["stdout", "stderr"]) {
    await t.test(stream, async () => {
      const files = {
        [`corpus/a-consume-${stream}.fungi`]: "@version 1\npure flow first() -> Int { return 1 }\n",
        [`corpus/b-late-${stream}-limit.fungi`]: "@version 1\npure flow second() -> Int { return 1 }\n",
      };
      const root = fixture(files);
      const request = requestFor(root, Object.keys(files));
      const limits = { ...DEFAULT_LIMITS, maxOutputBytes: 512 };
      const result = await runCorpusShard(request, shardFor(request, limits), { repositoryRoot: root });
      assert.equal(result.kind, "accepted");
      assert.equal(result.value.status, "REFUSED");
      assert.equal(result.value.termination, "OUTPUT_OVERFLOW");
      assert.equal(existsSync(join(root, ".late-stream-sentinel")), false);
    });
  }
});

test("aggregate output accounting uses owner-reported raw bytes before UTF-8 decoding", { skip: process.platform !== "win32" || process.arch !== "x64" }, async () => {
  const path = "corpus/raw-byte-budget.fungi";
  const root = fixture({ [path]: "@version 1\npure flow raw() -> Int { return 1 }\n" });
  const request = requestFor(root, [path]);
  const maxOutputBytes = Buffer.byteLength("0 errors, 0 governance warnings", "utf8") + 1;
  const limits = { ...DEFAULT_LIMITS, maxOutputBytes };
  const result = await runCorpusShard(request, shardFor(request, limits), { repositoryRoot: root });
  assert.equal(result.kind, "accepted");
  assert.equal(result.value.status, "PASS");
  assert.equal(result.value.termination, "COMPLETE");
});

test("runCorpusAggregate produces disjoint deterministic receipts for concurrency one and two", async () => {
  const files = Object.fromEntries(["a", "b", "c", "d"].map((name) => [
    `corpus/${name}.fungi`,
    `@version 1\npure flow ${name}() -> Int { return 1 }\n`,
  ]));
  const root = fixture(files);
  const request = requestFor(root, Object.keys(files), 2);
  const sequential = await runCorpusAggregate(request, DEFAULT_LIMITS, {
    repositoryRoot: root,
    concurrency: 1,
    priorReceipts: [],
  });
  const parallel = await runCorpusAggregate(request, DEFAULT_LIMITS, {
    repositoryRoot: root,
    concurrency: 2,
    priorReceipts: [],
  });
  assert.equal(sequential.kind, "accepted");
  assert.deepEqual(parallel, sequential);
  assert.equal(sequential.value.aggregate.status, "PASS");
  const completed = sequential.value.receipts.flatMap((receipt) => receipt.completed.map(({ path }) => path));
  assert.deepEqual(completed, Object.keys(files));
  assert.equal(new Set(completed).size, completed.length);
});

test("resume rejects a same-size same-mtime source mutation instead of trusting prior content evidence", async () => {
  const files = { "corpus/a.fungi": "@version 1\npure flow a() -> Int { return 1 }\n" };
  const root = fixture(files);
  const request = requestFor(root, Object.keys(files));
  const first = await runCorpusAggregate(request, DEFAULT_LIMITS, {
    repositoryRoot: root,
    concurrency: 1,
    priorReceipts: [],
  });
  assert.equal(first.value.aggregate.status, "PASS");
  const target = join(root, "corpus", "a.fungi");
  const before = statSync(target);
  const original = readFileSync(target, "utf8");
  writeFileSync(target, original.replace("return 1", "return 2"));
  utimesSync(target, before.atime, before.mtime);
  assert.equal(statSync(target).size, before.size);
  const resumed = await runCorpusAggregate(request, DEFAULT_LIMITS, {
    repositoryRoot: root,
    concurrency: 1,
    priorReceipts: first.value.receipts,
  });
  assert.equal(resumed.kind, "accepted");
  assert.equal(resumed.value.aggregate.status, "HOLD");
  assert.ok(resumed.value.receipts.some((receipt) => receipt.termination === "REPOSITORY_CHANGED"));
  assert.notEqual(resumed.value.aggregate.resultDigest, first.value.aggregate.resultDigest);
});

test("a shard deadline emits a terminal timeout receipt with completed prefix and unprocessed suffix", async () => {
  const files = {
    "corpus/a-clean.fungi": "@version 1\npure flow a() -> Int { return 1 }\n",
    "corpus/z-timeout.fungi": "@version 1\npure flow z() -> Int { return 1 }\n",
  };
  const root = fixture(files);
  const request = requestFor(root, Object.keys(files));
  const limits = { ...DEFAULT_LIMITS, timeoutMs: 400 };
  const result = await runCorpusShard(request, shardFor(request, limits), { repositoryRoot: root });
  assert.equal(result.value.status, "REFUSED");
  assert.equal(result.value.termination, "TIMEOUT");
  assert.deepEqual(result.value.completed.map(({ path }) => path), ["corpus/a-clean.fungi"]);
  assert.deepEqual(result.value.unprocessed.map(({ path }) => path), ["corpus/z-timeout.fungi"]);
});

test("cooperative cancellation waits for the owned child then refuses the ordered suffix", async () => {
  const files = {
    "corpus/a-abort-wait.fungi": "@version 1\npure flow a() -> Int { return 1 }\n",
    "corpus/z-clean.fungi": "@version 1\npure flow z() -> Int { return 1 }\n",
  };
  const root = fixture(files);
  const request = requestFor(root, Object.keys(files));
  const controller = new AbortController();
  const abort = setTimeout(() => controller.abort(), 50);
  const result = await runCorpusShard(request, shardFor(request), { repositoryRoot: root }, controller.signal);
  clearTimeout(abort);
  assert.equal(result.value.termination, "CANCELLED");
  assert.deepEqual(result.value.completed.map(({ path }) => path), ["corpus/a-abort-wait.fungi"]);
  assert.deepEqual(result.value.unprocessed.map(({ path }) => path), ["corpus/z-clean.fungi"]);
});

test("a non-negative high exit remains classifiable when an exact diagnostic is present", async () => {
  const files = { "corpus/high-exit.fungi": "@version 1\npure flow high() -> Int { return 1 }\n" };
  const root = fixture(files);
  const request = requestFor(root, Object.keys(files));
  const result = await runCorpusShard(request, shardFor(request), { repositoryRoot: root });
  assert.equal(result.kind, "accepted");
  assert.equal(result.value.status, "FINDING");
  assert.equal(result.value.termination, "COMPLETE");
  assert.equal(result.value.completed.length, 1);
});

test("plain numeric exit 128 without a diagnostic is missing result, not crash", async () => {
  const path = "corpus/plain-high-exit.fungi";
  const root = fixture({ [path]: "@version 1\npure flow high() -> Int { return 1 }\n" });
  const request = requestFor(root, [path]);
  const result = await runCorpusShard(request, shardFor(request), { repositoryRoot: root });
  assert.equal(result.kind, "accepted");
  assert.equal(result.value.status, "REFUSED");
  assert.equal(result.value.termination, "MISSING_RESULT");
});

test("numeric abnormal exits, missing results and stream overflows follow the closed algebra", async (t) => {
  for (const [name, termination, maxOutputBytes] of [
    ["numeric-abort", "MISSING_RESULT", 16 * 1024],
    ["missing-result", "MISSING_RESULT", 16 * 1024],
    ["stdout-overflow", "OUTPUT_OVERFLOW", 128],
    ["stderr-overflow", "OUTPUT_OVERFLOW", 128],
  ]) {
    await t.test(name, async () => {
      const path = `corpus/a-${name}.fungi`;
      const root = fixture({ [path]: "@version 1\npure flow a() -> Int { return 1 }\n" });
      const request = requestFor(root, [path]);
      const limits = { ...DEFAULT_LIMITS, maxOutputBytes };
      const result = await runCorpusShard(request, shardFor(request, limits), { repositoryRoot: root });
      assert.equal(result.kind, "accepted");
      assert.equal(result.value.status, "REFUSED");
      assert.equal(result.value.termination, termination);
      assert.deepEqual(result.value.completed, []);
      assert.deepEqual(result.value.unprocessed.map(({ path: rel }) => rel), [path]);
    });
  }
});

test("byte overflow, changed compiler and changed HEAD emit their exact terminal identities", async (t) => {
  await t.test("byte overflow", async () => {
    const path = "corpus/a-large.fungi";
    const root = fixture({ [path]: `@version 1\n${"x".repeat(512)}\n` });
    const request = requestFor(root, [path]);
    const limits = { ...DEFAULT_LIMITS, maxBytes: 64 };
    const result = await runCorpusShard(request, shardFor(request, limits), { repositoryRoot: root });
    assert.equal(result.value.termination, "BYTE_OVERFLOW");
  });
  for (const [name, termination] of [
    ["change-compiler", "COMPILER_CHANGED"],
    ["change-head", "REPOSITORY_CHANGED"],
  ]) {
    await t.test(name, async () => {
      const path = name === "change-compiler"
        ? "corpus/a-compiler-identity.fungi"
        : `corpus/a-${name}.fungi`;
      const root = fixture({ [path]: "@version 1\npure flow a() -> Int { return 1 }\n" });
      const request = requestFor(root, [path]);
      if (name === "change-compiler") {
        writeFileSync(
          join(root, "packages-ts", "galerina-core-compiler", "dist", "compiler.cjs"),
          "module.exports = 'changed-before-authority';\n",
        );
      }
      const result = await runCorpusShard(request, shardFor(request), { repositoryRoot: root });
      assert.equal(result.value.status, "REFUSED");
      assert.equal(result.value.termination, termination);
    });
  }
});

test("foreign prior evidence returns HOLD before granting checker authority", async () => {
  const path = "corpus/a-change-head.fungi";
  const root = fixture({ [path]: "@version 1\npure flow a() -> Int { return 1 }\n" });
  const request = requestFor(root, [path]);
  const before = git(root, ["rev-parse", "HEAD"]);
  const foreign = {
    schema: "galerina.fungi-corpus-shard-receipt.v2",
    shardId: "shard-99-of-99",
    shardDigest: canonicalDigest({ foreign: true }),
    requestDigest: canonicalDigest(request),
    startIndex: 0,
    endIndexExclusive: 1,
    status: "PASS",
    termination: "COMPLETE",
    completed: [],
    unprocessed: [],
    resultDigest: canonicalDigest({ foreign: "receipt" }),
  };
  const result = await runCorpusAggregate(request, DEFAULT_LIMITS, {
    repositoryRoot: root,
    concurrency: 1,
    priorReceipts: [foreign],
  });
  assert.equal(result.kind, "accepted");
  assert.equal(result.value.aggregate.status, "HOLD");
  assert.ok(result.value.aggregate.holdReasons.includes("FOREIGN_SHARD"));
  assert.equal(git(root, ["rev-parse", "HEAD"]), before);
});

test("execution refuses hostile arguments and does not inherit caller environment", async () => {
  const path = "corpus/a.fungi";
  const root = fixture({ [path]: "@version 1\npure flow a() -> Int { return 1 }\n" });
  const request = requestFor(root, [path]);
  const shard = shardFor(request);
  const accessor = {};
  Object.defineProperty(accessor, "repositoryRoot", { enumerable: true, get() { throw new Error("must not run"); } });
  assert.equal((await runCorpusShard(request, shard, accessor)).kind, "refused");
  let signalTrapCalls = 0;
  const hostileSignal = new Proxy({}, {
    getPrototypeOf() {
      signalTrapCalls += 1;
      throw new Error("must not run");
    },
  });
  assert.equal((await runCorpusShard(request, shard, { repositoryRoot: root }, hostileSignal)).kind, "refused");
  assert.equal(signalTrapCalls, 0);
  const previous = process.env.FUNGI_CORPUS_POISON;
  process.env.FUNGI_CORPUS_POISON = "present";
  try {
    const result = await runCorpusShard(request, shard, { repositoryRoot: root });
    assert.equal(result.value.status, "PASS");
  } finally {
    if (previous === undefined) delete process.env.FUNGI_CORPUS_POISON;
    else process.env.FUNGI_CORPUS_POISON = previous;
  }
});

test("hostile AbortSignal shapes refuse before Git authority without invoking caller traps", async () => {
  const path = "corpus/a.fungi";
  const root = fixture({ [path]: "@version 1\npure flow a() -> Int { return 1 }\n" });
  const request = requestFor(root, [path]);
  const shard = shardFor(request);
  let trapCalls = 0;

  const proxy = new Proxy(new AbortController().signal, {
    getPrototypeOf() {
      trapCalls += 1;
      throw new Error("must not run");
    },
  });
  const forged = Object.create(AbortSignal.prototype);
  const inheritedPrototype = Object.create(AbortSignal.prototype);
  Object.defineProperty(inheritedPrototype, "aborted", {
    get() {
      trapCalls += 1;
      throw new Error("must not run");
    },
  });
  const inherited = Object.create(inheritedPrototype);
  const ownAccessor = new AbortController().signal;
  Object.defineProperty(ownAccessor, "aborted", {
    get() {
      trapCalls += 1;
      throw new Error("must not run");
    },
  });

  await withEnvironment({ GIT_DIR: join(root, "must-not-be-observed.git") }, async () => {
    for (const signal of [proxy, forged, inherited, ownAccessor]) {
      const result = await runCorpusShard(request, shard, { repositoryRoot: root }, signal);
      assert.deepEqual(result, { kind: "refused", code: "CORPUS_SHARD_SIGNAL_INVALID" });
    }
  });
  assert.equal(trapCalls, 0);
});

test("Corpus Audit v2 scrubs ambient Git repository, object, config and interaction redirects", async () => {
  const path = "corpus/a.fungi";
  const root = fixture({ [path]: "@version 1\npure flow a() -> Int { return 1 }\n" });
  const request = requestFor(root, [path]);
  const shard = shardFor(request);
  const sentinel = join(root, ".git-interaction-sentinel");
  const missing = join(root, "hostile-git-input");
  const result = await withEnvironment({
    gIt_DiR: join(root, "foreign.git"),
    GIT_WORK_TREE: join(root, "foreign-worktree"),
    GIT_INDEX_FILE: join(root, "foreign.index"),
    GIT_OBJECT_DIRECTORY: join(root, "foreign-objects"),
    GIT_ALTERNATE_OBJECT_DIRECTORIES: join(root, "foreign-alternates"),
    GIT_COMMON_DIR: join(root, "foreign-common"),
    GIT_ASKPASS: sentinel,
    GIT_CONFIG: missing,
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "core.hooksPath",
    GIT_CONFIG_VALUE_0: sentinel,
    GIT_CONFIG_GLOBAL: missing,
    GIT_CONFIG_NOSYSTEM: "0",
    GIT_CONFIG_SYSTEM: missing,
    GIT_SSH: sentinel,
    GIT_SSH_COMMAND: sentinel,
  }, () => runCorpusShard(request, shard, { repositoryRoot: root }));
  assert.equal(result.kind, "accepted");
  assert.equal(result.value.status, "PASS");
  assert.equal(result.value.termination, "COMPLETE");
  assert.equal(existsSync(sentinel), false);
});

test("Corpus Audit v2 refuses an unsupported platform before checker authority", async () => {
  const path = "corpus/platform-sentinel.fungi";
  const root = fixture({ [path]: "@version 1\npure flow platform() -> Int { return 1 }\n" });
  const request = requestFor(root, [path]);
  const descriptor = Object.getOwnPropertyDescriptor(process, "platform");
  assert.ok(descriptor?.configurable);
  Object.defineProperty(process, "platform", { ...descriptor, value: "linux" });
  try {
    const result = await runCorpusShard(request, shardFor(request), { repositoryRoot: root });
    assert.deepEqual(result, { kind: "refused", code: "CORPUS_SHARD_PLATFORM_REFUSED" });
    const aggregate = await runCorpusAggregate(request, DEFAULT_LIMITS, {
      repositoryRoot: root,
      concurrency: 1,
      priorReceipts: [],
    });
    assert.deepEqual(aggregate, { kind: "refused", code: "CORPUS_RUN_PLATFORM_REFUSED" });
    assert.equal(existsSync(join(root, ".platform-child-sentinel")), false);
  } finally {
    Object.defineProperty(process, "platform", descriptor);
  }
});
