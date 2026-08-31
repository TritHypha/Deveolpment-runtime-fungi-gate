import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  access,
  chmod,
  mkdir,
  mkdtemp,
  open,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { arch, platform, tmpdir } from "node:os";
import { delimiter, dirname, isAbsolute, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  SOURCE_ORIGIN_LIMITS,
  canonicalJsonText,
  sha256Canonical,
} from "../lib/logic-aig-source-origin/contract.mjs";
import { captureFrozenSource } from "../lib/logic-aig-source-origin/git-source.mjs";

const GOVERNANCE = new URL("../../governance/", import.meta.url);
const POLICY_NAMES = Object.freeze([
  "logic-aig-source-origin-generated-consumers.json",
  "logic-aig-source-origin-parser-policy.json",
  "logic-aig-source-origin-repository-identity.json",
  "logic-aig-source-origin-resolution-policy.json",
  "logic-aig-source-origin-source-policy.json",
]);

const SOURCE_BODIES = Object.freeze({
  "src/a.cjs": "module.exports = 1;\n",
  "src/b.cts": "export const b = 2;\n",
  "src/c.d.ts": "export declare const c: number;\n",
  "src/d.fungi": "flow d() -> Int { return 4 }\n",
  "src/e.gate": "gate e {}\n",
  "src/f.js": "export const f = 6;\n",
  "src/g.jsx": "export const g = <g />;\n",
  "src/h.mjs": "export const h = 8;\n",
  "src/i.mts": "export const i = 9;\n",
  "src/j.ts": "export const j = 10;\n",
  "src/k.tsx": "export const k = <K />;\n",
  "src/space and [brackets].ts": "export const spaced = true;\n",
  "src/é.ts": "export const nfc = true;\n",
});

const RESOLUTION_BODIES = Object.freeze({
  "galerina.workspace.json": "{}\n",
  "npm-shrinkwrap.json": "{}\n",
  "package-lock.json": "{}\n",
  "package.json": "{}\n",
  "pnpm-lock.yaml": "lockfileVersion: 9\n",
  "pnpm-workspace.yaml": "packages: []\n",
  "yarn.lock": "# fixture\n",
  "config/jsconfig.fixture.json": "{}\n",
  "config/tsconfig.build.json": "{}\n",
});

const EXPECTED_OWNER_BODIES = Object.freeze({
  "src/j.ts.expected.diagnostics.txt": "TS-123\n",
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function without(value, key) {
  return Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));
}

async function resolveGitExecutable() {
  const names = platform() === "win32" ? ["git.exe", "git.cmd", "git"] : ["git"];
  for (const directory of (process.env.PATH ?? "").split(delimiter).filter(Boolean)) {
    for (const name of names) {
      const candidate = join(directory.replace(/^"|"$/g, ""), name);
      try {
        await access(candidate, fsConstants.X_OK);
        const resolved = await realpath(candidate);
        if (isAbsolute(resolved)) return resolved;
      } catch {
        // Continue bounded PATH discovery for the test fixture only.
      }
    }
  }
  throw new Error("fixture Git executable not found");
}

function git(gitExecutable, repositoryRoot, args, { input, env = {} } = {}) {
  const completeArgs = repositoryRoot === null ? args : ["-C", repositoryRoot, ...args];
  const result = spawnSync(gitExecutable, completeArgs, {
    encoding: input === undefined ? "utf8" : undefined,
    input,
    env: { ...process.env, ...env },
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.status !== 0) {
    const stderr = Buffer.isBuffer(result.stderr) ? result.stderr.toString("utf8") : result.stderr;
    throw new Error(`fixture Git failed (${completeArgs.join(" ")}): ${stderr}`);
  }
  if (Buffer.isBuffer(result.stdout)) return result.stdout;
  return result.stdout.trim();
}

async function writeTracked(root, relativePath, body) {
  const target = join(root, ...relativePath.split("/"));
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, body);
}

async function fixturePin(gitExecutable) {
  const gitBytes = await readFile(gitExecutable);
  const nodeBytes = await readFile(process.execPath);
  const gitVersion = git(gitExecutable, null, ["--version"]);
  const emptyClosureBody = {
    schema: "galerina.logic-aig-module-closure.v1",
    executableModuleRows: [],
    dataRows: [],
    builtinModules: [],
    counts: { executableModules: 0, dataRows: 0, builtinModules: 0 },
    authorizing: false,
  };
  const fixtureIdentity = (name) => ({
    name,
    version: "fixture-only",
    packageLocator: `fixture/${name}/package.json`,
    packageRawSha256: sha256(Buffer.from(`${name}-package`, "utf8")),
    packageByteLength: Buffer.byteLength(`${name}-package`),
    entryLocator: `fixture/${name}/index.mjs`,
    entryRawSha256: sha256(Buffer.from(`${name}-entry`, "utf8")),
    entryByteLength: Buffer.byteLength(`${name}-entry`),
  });
  const recordBody = {
    recordId: `fixture-only-${platform()}-${arch()}`,
    platform: platform(),
    arch: arch(),
    nodeIdentity: {
      version: process.version,
      executableRawSha256: sha256(nodeBytes),
      executableByteLength: nodeBytes.length,
    },
    gitIdentity: {
      version: gitVersion,
      executableRawSha256: sha256(gitBytes),
      executableByteLength: gitBytes.length,
    },
    typescript: fixtureIdentity("typescript"),
    galerinaParser: fixtureIdentity("galerina-parser"),
    builtinModules: [],
    executableModuleRows: [],
    dataRows: [],
    moduleClosureDigest: sha256Canonical(emptyClosureBody.schema, emptyClosureBody),
  };
  const record = {
    ...recordBody,
    recordDigest: sha256Canonical("galerina.logic-aig-toolchain-pin-record.v1", recordBody),
  };
  const body = {
    schema: "galerina.logic-aig-toolchain-pins.v1",
    records: [record],
    authorizing: false,
  };
  return { ...body, pinsDigest: sha256Canonical(body.schema, body) };
}

async function createFixture(t, { objectFormat = "sha1", withPin = true } = {}) {
  const root = await mkdtemp(join(tmpdir(), "galerina-source-origin-git-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const gitExecutable = await resolveGitExecutable();
  git(gitExecutable, null, ["init", `--object-format=${objectFormat}`, root]);
  git(gitExecutable, root, ["config", "user.email", "fixture@example.invalid"]);
  git(gitExecutable, root, ["config", "user.name", "Source Origin Fixture"]);

  for (const [path, body] of Object.entries(SOURCE_BODIES)) await writeTracked(root, path, body);
  for (const [path, body] of Object.entries(RESOLUTION_BODIES)) await writeTracked(root, path, body);
  for (const [path, body] of Object.entries(EXPECTED_OWNER_BODIES)) await writeTracked(root, path, body);
  await writeTracked(root, "README.md", "not source\n");
  await writeTracked(root, "src/not-source.txt", "not source\n");

  for (const name of POLICY_NAMES) {
    await writeTracked(root, `governance/${name}`, await readFile(new URL(name, GOVERNANCE)));
  }
  const parserPolicy = JSON.parse(await readFile(new URL("logic-aig-source-origin-parser-policy.json", GOVERNANCE), "utf8"));
  const expectedOutcomesBody = {
    schema: "galerina.logic-aig-expected-parse-outcomes.v1",
    parserPolicyDigest: parserPolicy.policyDigest,
    rows: [{
      path: "src/j.ts",
      domain: "HOST",
      parserId: "typescript-compiler-api",
      disposition: "EXPECTED_REFUSAL",
      diagnosticCodes: ["TS-123"],
      ownerKind: "SIDECAR_EXPECTATION",
      ownerLocator: "src/j.ts.expected.diagnostics.txt",
      ownerKey: "complete-file",
    }],
    authorizing: false,
  };
  await writeTracked(root, "governance/logic-aig-source-origin-expected-parse-outcomes.json", canonicalJsonText({
    ...expectedOutcomesBody,
    expectedOutcomesDigest: sha256Canonical(expectedOutcomesBody.schema, expectedOutcomesBody),
  }));
  const pinBody = withPin
    ? await fixturePin(gitExecutable)
    : {
        schema: "galerina.logic-aig-toolchain-pins.v1",
        records: [],
        authorizing: false,
      };
  if (!withPin) pinBody.pinsDigest = sha256Canonical(pinBody.schema, pinBody);
  await writeTracked(
    root,
    "governance/logic-aig-source-origin-toolchain-pins.json",
    canonicalJsonText(pinBody),
  );

  const executablePath = join(root, "src", "h.mjs");
  try { await chmod(executablePath, 0o755); } catch { /* index mode below is authoritative */ }
  git(gitExecutable, root, ["add", "-A"]);
  git(gitExecutable, root, ["update-index", "--chmod=+x", "src/h.mjs"]);
  git(gitExecutable, root, ["commit", "-m", "fixture"]);

  return {
    root,
    gitExecutable,
    head: git(gitExecutable, root, ["rev-parse", "HEAD"]),
    tree: git(gitExecutable, root, ["rev-parse", "HEAD^{tree}"]),
    objectFormat,
  };
}

async function installSelfMutatingGitForwarder(fixture) {
  const wrapper = join(fixture.root, "git-forwarder");
  const trigger = join(fixture.root, "mutate-git-forwarder");
  const quote = (value) => `'${value.replaceAll("'", `'"'"'`)}'`;
  await writeFile(wrapper, `#!/bin/sh\n${quote(fixture.gitExecutable)} "$@"\nstatus=$?\nif [ -f ${quote(trigger)} ]; then\n  printf '\\n# executable drift\\n' >> "$0"\n  rm -f ${quote(trigger)}\nfi\nexit $status\n`);
  await chmod(wrapper, 0o755);
  const pin = await fixturePin(wrapper);
  await writeTracked(fixture.root, "governance/logic-aig-source-origin-toolchain-pins.json", canonicalJsonText(pin));
  git(fixture.gitExecutable, fixture.root, ["add", "governance/logic-aig-source-origin-toolchain-pins.json"]);
  git(fixture.gitExecutable, fixture.root, ["commit", "-m", "pin fixture Git forwarder"]);
  fixture.head = git(fixture.gitExecutable, fixture.root, ["rev-parse", "HEAD"]);
  fixture.tree = git(fixture.gitExecutable, fixture.root, ["rev-parse", "HEAD^{tree}"]);
  fixture.gitExecutable = wrapper;
  await writeFile(trigger, "mutate on next invocation\n");
}

function captureOptions(fixture, limits = SOURCE_ORIGIN_LIMITS) {
  return {
    repositoryRoot: fixture.root,
    expectedHead: fixture.head,
    gitExecutableLocator: fixture.gitExecutable,
    limits,
  };
}

function expectSourceOriginError(operation, kind) {
  return assert.rejects(operation, (error) => {
    assert.match(error?.code ?? "", /^SOURCE_ORIGIN_[A-Z0-9_]+$/);
    if (kind === "HOLD") assert.match(error.code, /HOLD.*TOOLCHAIN|TOOLCHAIN.*HOLD/);
    else assert.doesNotMatch(error.code, /HOLD/);
    return true;
  });
}

function assertClosedObject(value, keys) {
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort());
}

function assertManifestDigest(manifest, field) {
  assert.equal(
    manifest[field],
    sha256Canonical(manifest.schema, without(manifest, field)),
  );
}

function mapBytesForRow(blobMap, row) {
  assert(blobMap instanceof Map);
  const bytes = blobMap.get(row.path) ?? blobMap.get(row.blobOid);
  assert(Buffer.isBuffer(bytes), `missing held bytes for ${row.path}`);
  assert.equal(bytes.length, row.byteLength);
  assert.equal(sha256(bytes), row.rawSha256);
  return bytes;
}

function setRawRootTree(fixture, entries) {
  const treeBytes = Buffer.concat(entries.map(({ mode, name, oid }) => Buffer.concat([
    Buffer.from(`${mode} ${name}\0`, "utf8"),
    Buffer.from(oid, "hex"),
  ])));
  const tree = git(fixture.gitExecutable, fixture.root, ["hash-object", "--stdin", "-t", "tree", "--literally", "-w"], { input: treeBytes }).toString("utf8").trim();
  const commitBytes = Buffer.from(
    `tree ${tree}\nauthor Source Origin Fixture <fixture@example.invalid> 1 +0000\ncommitter Source Origin Fixture <fixture@example.invalid> 1 +0000\n\nraw hostile tree\n`,
    "utf8",
  );
  const commit = git(fixture.gitExecutable, fixture.root, ["hash-object", "--stdin", "-t", "commit", "--literally", "-w"], { input: commitBytes }).toString("utf8").trim();
  git(fixture.gitExecutable, fixture.root, ["update-ref", "HEAD", commit]);
  fixture.head = commit;
  fixture.tree = tree;
}

test("captures every admitted suffix from one SHA-1 commit with zero exclusions", async (t) => {
  const fixture = await createFixture(t);
  const result = await captureFrozenSource(captureOptions(fixture));

  assertClosedObject(result, ["observation", "sourceManifest", "sourceBlobs", "resolutionInputs", "resolutionBlobs"]);
  assert.equal(result.sourceManifest.objectFormat, "sha1");
  assert.equal(result.sourceManifest.expectedHead, fixture.head);
  assert.equal(result.sourceManifest.expectedTree, fixture.tree);
  assert.deepEqual(result.sourceManifest.rows.map((row) => row.path), Object.keys(SOURCE_BODIES).sort());
  assert.equal(result.sourceManifest.counts.exclusions, 0);
  assert.equal(result.sourceManifest.counts.paths, Object.keys(SOURCE_BODIES).length);
  assert.equal(result.sourceManifest.authorizing, false);
  for (const row of result.sourceManifest.rows) mapBytesForRow(result.sourceBlobs, row);
});

test("records only regular 100644 and 100755 tree modes and preserves NUL-safe path text", async (t) => {
  const fixture = await createFixture(t);
  const newlinePath = "newline\npath.ts";
  const newlineOid = git(fixture.gitExecutable, fixture.root, ["hash-object", "-w", "--stdin"], { input: Buffer.from("export const newline = true;\n") }).toString("utf8").trim();
  git(fixture.gitExecutable, fixture.root, ["update-index", "-z", "--index-info"], {
    input: Buffer.concat([Buffer.from(`100644 ${newlineOid}\t`, "ascii"), Buffer.from(newlinePath, "utf8"), Buffer.from([0])]),
  });
  fixture.tree = git(fixture.gitExecutable, fixture.root, ["write-tree"]);
  fixture.head = git(fixture.gitExecutable, fixture.root, ["commit-tree", fixture.tree, "-m", "nul-safe-path"]);
  git(fixture.gitExecutable, fixture.root, ["update-ref", "HEAD", fixture.head]);
  const rawTree = git(fixture.gitExecutable, fixture.root, ["ls-tree", "-r", "--full-tree", "-z", fixture.tree], { input: Buffer.alloc(0) });
  const newlineStoredByGit = rawTree.includes(Buffer.from(`\t${newlinePath}\0`, "utf8"));
  const { sourceManifest } = await captureFrozenSource(captureOptions(fixture));
  const modes = new Map(sourceManifest.rows.map((row) => [row.path, row.mode]));
  assert.equal(modes.get("src/h.mjs"), "100755");
  assert.equal(modes.get("src/a.cjs"), "100644");
  assert.equal(modes.get("src/space and [brackets].ts"), "100644");
  assert.equal(modes.get("src/é.ts"), "100644");
  if (newlineStoredByGit) assert.equal(modes.get(newlinePath), "100644");
  else {
    assert.equal(platform(), "win32", "non-Windows Git unexpectedly omitted a newline path from the raw tree");
    t.diagnostic("Git for Windows refused to store the newline path; raw-tree capture remains required where supported");
  }
  assert.equal(sourceManifest.counts.mode100755, 1);
  assert.equal(sourceManifest.counts.mode100644, Object.keys(SOURCE_BODIES).length - 1 + Number(newlineStoredByGit));
});

test("captures a SHA-256 repository when the installed Git supports that object format", async (t) => {
  let fixture;
  try {
    fixture = await createFixture(t, { objectFormat: "sha256" });
  } catch (error) {
    t.skip(`installed Git does not support SHA-256 fixture repositories: ${error.message}`);
    return;
  }
  const result = await captureFrozenSource(captureOptions(fixture));
  assert.equal(result.observation.objectFormat, "sha256");
  assert.match(result.observation.before.head, /^[0-9a-f]{64}$/);
  assert.match(result.observation.before.tree, /^[0-9a-f]{64}$/);
  for (const row of [...result.sourceManifest.rows, ...result.resolutionInputs.rows]) {
    assert.match(row.blobOid, /^[0-9a-f]{64}$/);
    assert.equal(row.objectFormat, "sha256");
  }
});

test("selects only exact resolution basenames and jsconfig or tsconfig patterns", async (t) => {
  const fixture = await createFixture(t);
  const { resolutionInputs, resolutionBlobs } = await captureFrozenSource(captureOptions(fixture));
  assert.deepEqual(resolutionInputs.rows.map((row) => row.path), [...Object.keys(RESOLUTION_BODIES), ...Object.keys(EXPECTED_OWNER_BODIES)].sort());
  assert.equal(resolutionInputs.authorizing, false);
  for (const row of resolutionInputs.rows) mapBytesForRow(resolutionBlobs, row);
  assertManifestDigest(resolutionInputs, "resolutionInputsDigest");
});

test("binds closed observation and manifest schemas to canonical semantic digests", async (t) => {
  const fixture = await createFixture(t);
  const { observation, sourceManifest, resolutionInputs } = await captureFrozenSource(captureOptions(fixture));
  assertClosedObject(observation, ["before", "after", "objectFormat", "indexDigest", "executionBoundary"]);
  for (const edge of [observation.before, observation.after]) {
    assertClosedObject(edge, ["head", "tree", "indexDigest", "gitVersion", "gitExecutableRawSha256", "gitExecutableByteLength"]);
    assert.equal(edge.head, fixture.head);
    assert.equal(edge.tree, fixture.tree);
  }
  assert.equal(observation.before.indexDigest, observation.after.indexDigest);
  assert.equal(observation.indexDigest, observation.before.indexDigest);
  assert.equal(observation.executionBoundary, "COOPERATIVE_LOCAL_SAME_USER");
  assertClosedObject(sourceManifest, ["schema", "repositoryId", "expectedHead", "expectedTree", "objectFormat", "policyDigest", "exclusionDigest", "rows", "counts", "authorizing", "manifestDigest"]);
  assertClosedObject(resolutionInputs, ["schema", "repositoryId", "expectedHead", "expectedTree", "policyDigest", "rows", "authorizing", "resolutionInputsDigest"]);
  assertManifestDigest(sourceManifest, "manifestDigest");
  assertManifestDigest(resolutionInputs, "resolutionInputsDigest");
});

test("ignores mutable working-tree substitution and returns only frozen Git-object bytes", async (t) => {
  const fixture = await createFixture(t);
  await writeTracked(fixture.root, "src/j.ts", "export const substituted = false;\n");
  await writeTracked(fixture.root, "src/untracked.ts", "export const untracked = true;\n");

  const result = await captureFrozenSource(captureOptions(fixture));
  const row = result.sourceManifest.rows.find((entry) => entry.path === "src/j.ts");
  assert(row);
  assert.equal(mapBytesForRow(result.sourceBlobs, row).toString("utf8"), SOURCE_BODIES["src/j.ts"]);
  assert.equal(result.sourceManifest.rows.some((entry) => entry.path === "src/untracked.ts"), false);
});

test("refuses frozen source-object corruption without returning a partial manifest", async (t) => {
  const fixture = await createFixture(t);
  const oid = git(fixture.gitExecutable, fixture.root, ["rev-parse", "HEAD:src/j.ts"]);
  const gitDir = git(fixture.gitExecutable, fixture.root, ["rev-parse", "--absolute-git-dir"]);
  const objectPath = join(gitDir, "objects", oid.slice(0, 2), oid.slice(2));
  const bytes = await readFile(objectPath);
  bytes[bytes.length - 1] ^= 1;
  await chmod(objectPath, 0o600);
  await writeFile(objectPath, bytes);
  await expectSourceOriginError(captureFrozenSource(captureOptions(fixture)), "REFUSED");
});

test("refuses an expected commit that is not the observed HEAD or whose tree drifts", async (t) => {
  const fixture = await createFixture(t);
  await writeTracked(fixture.root, "README.md", "second commit\n");
  git(fixture.gitExecutable, fixture.root, ["add", "README.md"]);
  git(fixture.gitExecutable, fixture.root, ["commit", "-m", "second"]);
  await expectSourceOriginError(captureFrozenSource(captureOptions(fixture)), "REFUSED");

  const treeAsHead = { ...captureOptions(fixture), expectedHead: fixture.tree };
  await expectSourceOriginError(captureFrozenSource(treeAsHead), "REFUSED");
});

test("refuses a staged index whose complete path, mode or blob set differs from the frozen tree", async (t) => {
  const fixture = await createFixture(t);
  await writeTracked(fixture.root, "src/j.ts", "export const staged = false;\n");
  git(fixture.gitExecutable, fixture.root, ["add", "src/j.ts"]);
  await expectSourceOriginError(captureFrozenSource(captureOptions(fixture)), "REFUSED");
});

test("refuses unmerged index stages instead of selecting one conflict side", async (t) => {
  const fixture = await createFixture(t);
  const oids = [];
  for (const body of ["base\n", "ours\n", "theirs\n"]) {
    oids.push(git(fixture.gitExecutable, fixture.root, ["hash-object", "-w", "--stdin"], { input: Buffer.from(body) }).toString("utf8").trim());
  }
  git(fixture.gitExecutable, fixture.root, ["update-index", "--force-remove", "src/j.ts"]);
  const indexInfo = oids.map((oid, index) => `100644 ${oid} ${index + 1}\tsrc/j.ts\n`).join("");
  git(fixture.gitExecutable, fixture.root, ["update-index", "--index-info"], { input: Buffer.from(indexInfo) });
  await expectSourceOriginError(captureFrozenSource(captureOptions(fixture)), "REFUSED");
});

for (const [name, flag] of [["assume-unchanged", "--assume-unchanged"], ["skip-worktree", "--skip-worktree"]]) {
  test(`refuses the ${name} index flag even when stage zero still matches the frozen tree`, async (t) => {
    const fixture = await createFixture(t);
    git(fixture.gitExecutable, fixture.root, ["update-index", flag, "src/j.ts"]);
    await expectSourceOriginError(captureFrozenSource(captureOptions(fixture)), "REFUSED");
  });
}

test("refuses portable sparse-index state when supported by the installed Git", async (t) => {
  const fixture = await createFixture(t);
  const attempt = spawnSync(fixture.gitExecutable, ["-C", fixture.root, "sparse-checkout", "init", "--cone", "--sparse-index"], { encoding: "utf8", windowsHide: true });
  if (attempt.status !== 0) {
    t.skip("installed Git cannot construct the sparse-index fixture");
    return;
  }
  await expectSourceOriginError(captureFrozenSource(captureOptions(fixture)), "REFUSED");
});

for (const mode of ["120000", "160000"]) {
  test(`refuses tree mode ${mode} instead of treating it as a source blob`, async (t) => {
    const fixture = await createFixture(t);
    const oid = mode === "160000"
      ? fixture.head
      : git(fixture.gitExecutable, fixture.root, ["hash-object", "-w", "--stdin"], { input: Buffer.from("src/j.ts") }).toString("utf8").trim();
    git(fixture.gitExecutable, fixture.root, ["update-index", "--add", "--cacheinfo", `${mode},${oid},src/indirect.ts`]);
    const tree = git(fixture.gitExecutable, fixture.root, ["write-tree"]);
    const commit = git(fixture.gitExecutable, fixture.root, ["commit-tree", tree, "-m", `mode-${mode}`]);
    git(fixture.gitExecutable, fixture.root, ["update-ref", "HEAD", commit]);
    fixture.head = commit;
    fixture.tree = tree;
    await expectSourceOriginError(captureFrozenSource(captureOptions(fixture)), "REFUSED");
  });
}

test("refuses case-shadowed and non-NFC Git paths independent of checkout filesystem behavior", async (t) => {
  for (const paths of [["Case.ts", "case.ts"], ["é.ts", "e\u0301.ts"]]) {
    const fixture = await createFixture(t);
    const oid = git(fixture.gitExecutable, fixture.root, ["hash-object", "-w", "--stdin"], { input: Buffer.from("export {};\n") }).toString("utf8").trim();
    for (const path of paths) git(fixture.gitExecutable, fixture.root, ["update-index", "--add", "--cacheinfo", `100644,${oid},${path}`]);
    const tree = git(fixture.gitExecutable, fixture.root, ["write-tree"]);
    const commit = git(fixture.gitExecutable, fixture.root, ["commit-tree", tree, "-m", "hostile-paths"]);
    git(fixture.gitExecutable, fixture.root, ["update-ref", "HEAD", commit]);
    fixture.head = commit;
    fixture.tree = tree;
    await expectSourceOriginError(captureFrozenSource(captureOptions(fixture)), "REFUSED");
  }
});

test("refuses duplicate, drive-absolute and non-canonical backslash paths emitted by a hostile raw Git tree", async (t) => {
  for (const names of [["duplicate.ts", "duplicate.ts"], ["evil\\path.ts"], ["C:/escape.ts"]]) {
    const fixture = await createFixture(t);
    const oid = git(fixture.gitExecutable, fixture.root, ["hash-object", "-w", "--stdin"], { input: Buffer.from("export {};\n") }).toString("utf8").trim();
    setRawRootTree(fixture, names.map((name) => ({ mode: "100644", name, oid })));
    await expectSourceOriginError(captureFrozenSource(captureOptions(fixture)), "REFUSED");
  }
});

test("refuses caller limit substitution and aggregate source or resolution overflow without partial evidence", async (t) => {
  const fixture = await createFixture(t);
  for (const limits of [
    { ...SOURCE_ORIGIN_LIMITS, sourceFiles: Object.keys(SOURCE_BODIES).length - 1 },
    { ...SOURCE_ORIGIN_LIMITS, sourceBytes: 1 },
    { ...SOURCE_ORIGIN_LIMITS, resolutionFiles: Object.keys(RESOLUTION_BODIES).length - 1 },
    { ...SOURCE_ORIGIN_LIMITS, resolutionBytes: 1 },
    { ...SOURCE_ORIGIN_LIMITS, processMillis: 1 },
    { ...SOURCE_ORIGIN_LIMITS, processOutputBytes: 1 },
  ]) {
    await expectSourceOriginError(captureFrozenSource(captureOptions(fixture, limits)), "REFUSED");
  }
});

test("ignores hostile ambient Git variables and repository pager, editor, hook and filter configuration", async (t) => {
  const fixture = await createFixture(t);
  git(fixture.gitExecutable, fixture.root, ["config", "core.pager", "hostile-pager"]);
  git(fixture.gitExecutable, fixture.root, ["config", "core.editor", "hostile-editor"]);
  git(fixture.gitExecutable, fixture.root, ["config", "core.hooksPath", "hostile-hooks"]);
  git(fixture.gitExecutable, fixture.root, ["config", "filter.hostile.process", "hostile-filter"]);
  await writeTracked(fixture.root, ".gitattributes", "*.ts filter=hostile\n");
  const keys = ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_CONFIG_COUNT", "GIT_CONFIG_KEY_0", "GIT_CONFIG_VALUE_0", "GIT_PAGER", "GIT_EDITOR"];
  const saved = new Map(keys.map((key) => [key, process.env[key]]));
  try {
    for (const key of keys) process.env[key] = "hostile-sentinel";
    const result = await captureFrozenSource(captureOptions(fixture));
    assert.equal(result.sourceManifest.expectedHead, fixture.head);
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("refuses repository-local object alternates", async (t) => {
  const fixture = await createFixture(t);
  const gitDir = git(fixture.gitExecutable, fixture.root, ["rev-parse", "--absolute-git-dir"]);
  const alternates = join(gitDir, "objects", "info", "alternates");
  await mkdir(dirname(alternates), { recursive: true });
  await writeFile(alternates, `${join(fixture.root, "alternate-objects")}\n`);
  await expectSourceOriginError(captureFrozenSource(captureOptions(fixture)), "REFUSED");
});

test("refuses repository worktree relocation away from the supplied root", async (t) => {
  const fixture = await createFixture(t);
  const relocated = join(fixture.root, "relocated-worktree");
  await mkdir(relocated);
  git(fixture.gitExecutable, fixture.root, ["config", "core.worktree", relocated]);
  await expectSourceOriginError(captureFrozenSource(captureOptions(fixture)), "REFUSED");
});

test("refuses a missing frozen expected-outcome owner instead of omitting it", async (t) => {
  const fixture = await createFixture(t);
  git(fixture.gitExecutable, fixture.root, ["rm", "src/j.ts.expected.diagnostics.txt"]);
  git(fixture.gitExecutable, fixture.root, ["commit", "-m", "remove expected owner"]);
  fixture.head = git(fixture.gitExecutable, fixture.root, ["rev-parse", "HEAD"]);
  fixture.tree = git(fixture.gitExecutable, fixture.root, ["rev-parse", "HEAD^{tree}"]);
  await expectSourceOriginError(captureFrozenSource(captureOptions(fixture)), "REFUSED");
});

test("refuses an executable locator that cannot run Git", async (t) => {
  const fixture = await createFixture(t);
  const inert = join(fixture.root, platform() === "win32" ? "not-git.exe" : "not-git");
  await writeFile(inert, "not a Git executable\n");
  try { await chmod(inert, 0o755); } catch { /* Windows execution metadata is not authoritative. */ }
  await expectSourceOriginError(captureFrozenSource({ ...captureOptions(fixture), gitExecutableLocator: inert }), "REFUSED");
});

test("size-gates an oversized executable locator before attempting to run it", async (t) => {
  const fixture = await createFixture(t);
  const oversized = join(fixture.root, platform() === "win32" ? "oversized-git.exe" : "oversized-git");
  const handle = await open(oversized, "w");
  try { await handle.truncate(SOURCE_ORIGIN_LIMITS.heldFileBytes + 1); } finally { await handle.close(); }
  try { await chmod(oversized, 0o755); } catch { /* Windows execution metadata is not authoritative. */ }
  await expectSourceOriginError(captureFrozenSource({ ...captureOptions(fixture), gitExecutableLocator: oversized }), "REFUSED");
});

test("refuses Git executable byte drift between the before and after observations", async (t) => {
  if (platform() === "win32") {
    t.skip("self-mutating executable replay requires the Unix shell lane; Windows retains pre/post identity checks");
    return;
  }
  const fixture = await createFixture(t);
  await installSelfMutatingGitForwarder(fixture);
  await expectSourceOriginError(captureFrozenSource(captureOptions(fixture)), "REFUSED");
});

test("repeating capture of one commit produces deterministic manifests and exact held bytes", async (t) => {
  const fixture = await createFixture(t);
  const first = await captureFrozenSource(captureOptions(fixture));
  const second = await captureFrozenSource(captureOptions(fixture));
  assert.deepEqual(second.observation, first.observation);
  assert.deepEqual(second.sourceManifest, first.sourceManifest);
  assert.deepEqual(second.resolutionInputs, first.resolutionInputs);
  assert.deepEqual([...second.sourceBlobs], [...first.sourceBlobs]);
  assert.deepEqual([...second.resolutionBlobs], [...first.resolutionBlobs]);
});

test("held byte maps resist generic Map prototype mutation and buffer alias bypasses", async (t) => {
  const fixture = await createFixture(t);
  const { sourceBlobs } = await captureFrozenSource(captureOptions(fixture));
  const path = "src/j.ts";
  const expected = Buffer.from(SOURCE_BODIES[path]);
  assert.equal(sourceBlobs.size, Object.keys(SOURCE_BODIES).length);
  assert.equal(Map.prototype.get.call(sourceBlobs, path), undefined);
  Map.prototype.set.call(sourceBlobs, path, Buffer.from("mutated"));
  Map.prototype.set.call(sourceBlobs, "attacker.ts", Buffer.from("attacker"));
  assert.deepEqual(sourceBlobs.get(path), expected);
  assert.equal(sourceBlobs.has("attacker.ts"), false);
  assert.equal(sourceBlobs.size, Object.keys(SOURCE_BODIES).length);
  Map.prototype.clear.call(sourceBlobs);
  assert.deepEqual(sourceBlobs.get(path), expected);
  assert.equal(sourceBlobs.size, Object.keys(SOURCE_BODIES).length);
});

test("production capture remains HOLD when the frozen commit has no approved nonempty toolchain pin", async (t) => {
  const fixture = await createFixture(t, { withPin: false });
  await expectSourceOriginError(captureFrozenSource(captureOptions(fixture)), "HOLD");
});
