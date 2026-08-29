import { test } from "node:test";
import assert from "node:assert/strict";
import { constants as bufferConstants } from "node:buffer";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  _parseOwnedProcessFrame,
  runOwnedProcess,
  runOwnedProcessSync,
} = require("../lib/owned-process-tree.cjs");
const suiteLeasePath = require.resolve("../lib/suite-run-lease.cjs");
const { acquireSuiteLease } = require(suiteLeasePath);
const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(TEST_DIR, "..", "fixtures");
const OWNED_FRAME_MAGIC = Buffer.from("GLRNOWND", "ascii");
const OWNED_FRAME_VERSION = 1;
const OWNED_FRAME_HEADER_BYTES = 32;

function ownedFrameMetadata(overrides = {}) {
  return {
    status: 0,
    signal: null,
    stdoutBytes: 0,
    stderrBytes: 0,
    timedOut: false,
    outputLimitExceeded: false,
    cleanupAttempted: false,
    cleanupAcknowledged: false,
    cleanupDetail: "not required",
    spawnError: null,
    ...overrides,
  };
}

function ownedFrame({ metadata = ownedFrameMetadata(), stdout = Buffer.alloc(0), stderr = Buffer.alloc(0) } = {}) {
  const metadataBytes = Buffer.from(JSON.stringify(metadata), "utf8");
  const header = Buffer.alloc(OWNED_FRAME_HEADER_BYTES);
  OWNED_FRAME_MAGIC.copy(header, 0);
  header.writeUInt8(OWNED_FRAME_VERSION, 8);
  header.writeUInt32BE(metadataBytes.length, 12);
  header.writeBigUInt64BE(BigInt(stdout.length), 16);
  header.writeBigUInt64BE(BigInt(stderr.length), 24);
  return Buffer.concat([header, metadataBytes, stdout, stderr]);
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

async function waitForDead(pid, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isAlive(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return !isAlive(pid);
}

async function waitForPath(file, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(file)) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return existsSync(file);
}

function sha256File(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function protectedFileManifest(root, rows) {
  return {
    schema: "galerina.protected-file-set.v1",
    root: realpathSync.native(root),
    files: rows.map(([relativePath, file]) => ({
      path: relativePath,
      sha256: sha256File(file),
    })),
  };
}

test("a normal owned command returns its exact output and exit", async () => {
  const result = await runOwnedProcess({
    command: process.execPath,
    args: ["-e", "process.stdout.write('owned-ok')"],
    cwd: FIXTURES,
    env: process.env,
    timeoutMs: 2_000,
  });

  assert.equal(result.status, 0);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, "owned-ok");
  assert.equal(result.stderr, "");
  assert.equal(result.timedOut, false);
  assert.equal(result.cleanupAttempted, false);
});

test("stdout and stderr consume independent exact byte ceilings", async () => {
  const result = await runOwnedProcess({
    command: process.execPath,
    args: [
      "-e",
      "process.stdout.write('S'.repeat(128)); process.stderr.write('E'.repeat(128));",
    ],
    cwd: FIXTURES,
    env: process.env,
    timeoutMs: 2_000,
    maxOutputBytes: 16,
    maxStdoutBytes: 128,
    maxStderrBytes: 128,
  });

  assert.equal(result.outputLimitExceeded, false);
  assert.equal(result.stdout, "S".repeat(128));
  assert.equal(result.stderr, "E".repeat(128));
  assert.equal(result.stdoutBytes, 128);
  assert.equal(result.stderrBytes, 128);
});

test("one-byte stdout overflow cannot borrow unused stderr capacity", async () => {
  const result = await runOwnedProcess({
    command: process.execPath,
    args: [
      "-e",
      [
        "process.stderr.write('E'.repeat(128), () => {",
        "  process.stdout.write('S'.repeat(129));",
        "  setTimeout(() => {}, 1_000);",
        "});",
      ].join("\n"),
    ],
    cwd: FIXTURES,
    env: process.env,
    timeoutMs: 2_000,
    maxStdoutBytes: 128,
    maxStderrBytes: 128,
  });

  assert.equal(result.outputLimitExceeded, true);
  assert.equal(result.stdoutBytes, 129);
  assert.equal(result.stderrBytes, 128);
});

test("one-byte stderr overflow cannot borrow unused stdout capacity", async () => {
  const result = await runOwnedProcess({
    command: process.execPath,
    args: [
      "-e",
      [
        "process.stdout.write('S'.repeat(128), () => {",
        "  process.stderr.write('E'.repeat(129));",
        "  setTimeout(() => {}, 1_000);",
        "});",
      ].join("\n"),
    ],
    cwd: FIXTURES,
    env: process.env,
    timeoutMs: 2_000,
    maxStdoutBytes: 128,
    maxStderrBytes: 128,
  });

  assert.equal(result.outputLimitExceeded, true);
  assert.equal(result.stdoutBytes, 128);
  assert.equal(result.stderrBytes, 129);
});

test("raw byte evidence is counted before UTF-8 decoding", async () => {
  const result = await runOwnedProcess({
    command: process.execPath,
    args: ["-e", "process.stdout.write('€'); process.stderr.write('🙂');"],
    cwd: FIXTURES,
    env: process.env,
    timeoutMs: 2_000,
    maxStdoutBytes: 3,
    maxStderrBytes: 4,
  });

  assert.equal(result.outputLimitExceeded, false);
  assert.equal(result.stdout, "€");
  assert.equal(result.stderr, "🙂");
  assert.equal(result.stdoutBytes, 3);
  assert.equal(result.stderrBytes, 4);
});

test("the scalar output limit remains the compatibility default for both streams", async () => {
  const result = await runOwnedProcess({
    command: process.execPath,
    args: ["-e", "process.stdout.write('S'.repeat(129));"],
    cwd: FIXTURES,
    env: process.env,
    timeoutMs: 2_000,
    maxOutputBytes: 128,
  });

  assert.equal(result.outputLimitExceeded, true);
  assert.equal(result.stdoutBytes, 129);
  assert.equal(result.stderrBytes, 0);
});

test("the scalar output limit also remains the compatibility default for stderr", async () => {
  const result = await runOwnedProcess({
    command: process.execPath,
    args: ["-e", "process.stderr.write('E'.repeat(129));"],
    cwd: FIXTURES,
    env: process.env,
    timeoutMs: 2_000,
    maxOutputBytes: 128,
  });

  assert.equal(result.outputLimitExceeded, true);
  assert.equal(result.stdoutBytes, 0);
  assert.equal(result.stderrBytes, 129);
});

test("timeout terminates the owned parent and grandchild", async () => {
  const result = await runOwnedProcess({
    command: process.execPath,
    args: [join(FIXTURES, "process-tree-parent.cjs")],
    cwd: FIXTURES,
    env: process.env,
    timeoutMs: 300,
    cleanupGraceMs: 500,
  });

  assert.equal(result.timedOut, true);
  assert.equal(result.cleanupAttempted, true);
  assert.equal(result.cleanupAcknowledged, true, result.cleanupDetail);
  const identity = JSON.parse(result.stdout.trim().split(/\r?\n/)[0]);
  assert.equal(await waitForDead(identity.parentPid), true, "parent remained alive");
  assert.equal(await waitForDead(identity.childPid), true, "grandchild remained alive");
});

test("invalid command and timeout inputs refuse before spawning", async () => {
  await assert.rejects(
    runOwnedProcess({ command: "", args: [], cwd: FIXTURES, timeoutMs: 1 }),
    (error) => error.code === "OWNED-PROCESS-INPUT-INVALID",
  );
  await assert.rejects(
    runOwnedProcess({
      command: process.execPath,
      args: "not-an-array",
      cwd: FIXTURES,
      timeoutMs: 1,
    }),
    (error) => error.code === "OWNED-PROCESS-INPUT-INVALID",
  );
});

test("invalid or hostile per-stream inputs refuse before spawn without invoking accessors", async () => {
  const root = mkdtempSync(join(tmpdir(), "galerina-owned-input-"));
  const sentinel = join(root, "spawned.txt");
  const base = {
    command: process.execPath,
    args: ["-e", `require('node:fs').writeFileSync(${JSON.stringify(sentinel)}, 'spawned')`],
    cwd: root,
    env: process.env,
    timeoutMs: 2_000,
  };
  try {
    for (const options of [
      { ...base, maxStdoutBytes: 0 },
      { ...base, maxStderrBytes: -1 },
      { ...base, maxStdoutBytes: Number.MAX_SAFE_INTEGER + 1 },
      { ...base, maxStdoutByte: 128 },
      Object.assign(Object.create(null), base, { maxStdoutBytes: 128 }),
    ]) {
      await assert.rejects(
        runOwnedProcess(options),
        (error) => error.code === "OWNED-PROCESS-INPUT-INVALID",
      );
    }

    let accessorCalls = 0;
    const accessor = { ...base };
    Object.defineProperty(accessor, "maxStdoutBytes", {
      enumerable: true,
      get() {
        accessorCalls += 1;
        return 128;
      },
    });
    await assert.rejects(
      runOwnedProcess(accessor),
      (error) => error.code === "OWNED-PROCESS-INPUT-INVALID",
    );
    assert.equal(accessorCalls, 0);

    let proxyTrapCalls = 0;
    const proxy = new Proxy({ ...base, maxStdoutBytes: 128 }, {
      getPrototypeOf() {
        proxyTrapCalls += 1;
        throw new Error("must not run");
      },
    });
    await assert.rejects(
      runOwnedProcess(proxy),
      (error) => error.code === "OWNED-PROCESS-INPUT-INVALID",
    );
    assert.equal(proxyTrapCalls, 0);
    assert.equal(existsSync(sentinel), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("protected-file-set validation is closed, canonical and trap-free before spawn", async () => {
  const root = mkdtempSync(join(tmpdir(), "galerina-owned-manifest-input-"));
  const protectedFile = join(root, "input.txt");
  const sentinel = join(root, "spawned.txt");
  writeFileSync(protectedFile, "authenticated", "utf8");
  const manifest = protectedFileManifest(root, [["input.txt", protectedFile]]);
  const command = {
    command: process.execPath,
    args: ["-e", `require('node:fs').writeFileSync(${JSON.stringify(sentinel)}, 'spawned')`],
    cwd: root,
    env: process.env,
    timeoutMs: 2_000,
  };
  const digest = manifest.files[0].sha256;
  const tooManyFiles = Array.from({ length: 8_193 }, (_, index) => ({
    path: `${String(index).padStart(4, "0")}.txt`,
    sha256: digest,
  }));
  const oversizedFiles = Array.from({ length: 8_192 }, (_, index) => ({
    path: `${String(index).padStart(4, "0")}/${"a".repeat(500)}.txt`,
    sha256: digest,
  }));
  const foreignManifest = Object.assign(Object.create(null), manifest);
  const foreignFiles = Object.assign(Object.create(null), manifest.files);
  const accessorEntry = { sha256: digest };
  let accessorCalls = 0;
  Object.defineProperty(accessorEntry, "path", {
    enumerable: true,
    get() {
      accessorCalls += 1;
      return "input.txt";
    },
  });
  let proxyTrapCalls = 0;
  const proxyManifest = new Proxy(manifest, {
    getPrototypeOf() {
      proxyTrapCalls += 1;
      throw new Error("must not run");
    },
  });

  const invalidManifests = [
    { ...manifest, unknown: true },
    { ...manifest, schema: "galerina.protected-file-set.v0" },
    { ...manifest, root: `${manifest.root}\\.` },
    { ...manifest, files: [] },
    { ...manifest, files: tooManyFiles },
    { ...manifest, files: oversizedFiles },
    { ...manifest, files: [{ path: "/absolute.txt", sha256: digest }] },
    { ...manifest, files: [{ path: "../escape.txt", sha256: digest }] },
    { ...manifest, files: [{ path: "dir/./input.txt", sha256: digest }] },
    { ...manifest, files: [{ path: "dir\\input.txt", sha256: digest }] },
    { ...manifest, files: [{ path: "e\u0301.txt", sha256: digest }] },
    { ...manifest, files: [{ path: `${"a".repeat(4_093)}.txt`, sha256: digest }] },
    { ...manifest, files: [{ path: "z.txt", sha256: digest }, { path: "a.txt", sha256: digest }] },
    { ...manifest, files: [{ path: "a.txt", sha256: digest }, { path: "a.txt", sha256: digest }] },
    { ...manifest, files: [{ path: "A.txt", sha256: digest }, { path: "a.txt", sha256: digest }] },
    { ...manifest, files: [{ path: "input.txt", sha256: digest.toUpperCase() }] },
    { ...manifest, files: [{ path: "input.txt", sha256: digest, unknown: true }] },
    foreignManifest,
    { ...manifest, files: foreignFiles },
    { ...manifest, files: [accessorEntry] },
    proxyManifest,
  ];

  try {
    for (const protectedFileSet of invalidManifests) {
      rmSync(sentinel, { force: true });
      await assert.rejects(
        runOwnedProcess({ ...command, protectedFileSet }),
        (error) => error.code === "OWNED-PROCESS-INPUT-INVALID",
      );
      assert.equal(existsSync(sentinel), false);
    }
    await assert.rejects(
      runOwnedProcess({
        ...command,
        protectedReadTree: root,
        protectedFileSet: manifest,
      }),
      (error) => error.code === "OWNED-PROCESS-INPUT-INVALID",
    );
    assert.throws(
      () => runOwnedProcessSync({ ...command, protectedFileSet: manifest }),
      (error) => error.code === "OWNED-PROCESS-INPUT-INVALID",
    );
    assert.equal(accessorCalls, 0);
    assert.equal(proxyTrapCalls, 0);
    assert.equal(existsSync(sentinel), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the Windows warden authenticates exact protected bytes before child authority", {
  skip: process.platform !== "win32",
}, async () => {
  const root = mkdtempSync(join(tmpdir(), "galerina-owned-file-set-"));
  const protectedFile = join(root, "input.txt");
  writeFileSync(protectedFile, "authenticated", "utf8");
  const child = [
    "const fs = require('node:fs');",
    "let stdinBytes = 0;",
    "process.stdin.on('data', (chunk) => { stdinBytes += chunk.length; });",
    "process.stdin.on('end', () => {",
    "  if (stdinBytes !== 0) process.exit(41);",
    `  process.stdout.write(fs.readFileSync(${JSON.stringify(protectedFile)}, 'utf8'));`,
    "});",
  ].join("\n");
  try {
    const result = await runOwnedProcess({
      command: process.execPath,
      args: ["-e", child],
      cwd: root,
      env: process.env,
      timeoutMs: 2_000,
      protectedFileSet: protectedFileManifest(root, [["input.txt", protectedFile]]),
    });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.spawnError, null);
    assert.equal(result.stdout, "authenticated");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a wrong protected digest refuses before the sentinel and discloses no source body", {
  skip: process.platform !== "win32",
}, async () => {
  const root = mkdtempSync(join(tmpdir(), "galerina-owned-digest-refusal-"));
  const protectedFile = join(root, "input.txt");
  const sentinel = join(root, "spawned.txt");
  const sourceBody = "DO_NOT_DISCLOSE_PROTECTED_SOURCE_BODY_0873";
  writeFileSync(protectedFile, sourceBody, "utf8");
  const manifest = protectedFileManifest(root, [["input.txt", protectedFile]]);
  manifest.files[0].sha256 = "0".repeat(64);
  try {
    const result = await runOwnedProcess({
      command: process.execPath,
      args: ["-e", `require('node:fs').writeFileSync(${JSON.stringify(sentinel)}, 'spawned')`],
      cwd: root,
      env: process.env,
      timeoutMs: 2_000,
      protectedFileSet: manifest,
    });

    assert.equal(result.status, 126);
    assert.equal(result.spawnError?.code, "PROCESS-WARDEN-SETUP-REFUSED");
    assert.equal(existsSync(sentinel), false);
    assert.equal(result.stderr.includes("WARDEN_SETUP_REFUSED"), true);
    assert.equal(result.stderr.includes(sourceBody), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("retained protected handles block child write, delete and rename", {
  skip: process.platform !== "win32",
}, async () => {
  const root = mkdtempSync(join(tmpdir(), "galerina-owned-retained-file-"));
  const protectedFile = join(root, "input.txt");
  const renamedFile = join(root, "renamed.txt");
  writeFileSync(protectedFile, "authenticated", "utf8");
  const child = [
    "const fs = require('node:fs');",
    `const file = ${JSON.stringify(protectedFile)};`,
    `const renamed = ${JSON.stringify(renamedFile)};`,
    "const blocked = {};",
    "for (const [name, operation] of Object.entries({",
    "  write: () => fs.writeFileSync(file, 'substituted'),",
    "  delete: () => fs.unlinkSync(file),",
    "  rename: () => fs.renameSync(file, renamed),",
    "})) { try { operation(); blocked[name] = false; } catch { blocked[name] = true; } }",
    "blocked.body = fs.readFileSync(file, 'utf8');",
    "process.stdout.write(JSON.stringify(blocked));",
  ].join("\n");
  try {
    const result = await runOwnedProcess({
      command: process.execPath,
      args: ["-e", child],
      cwd: root,
      env: process.env,
      timeoutMs: 2_000,
      protectedFileSet: protectedFileManifest(root, [["input.txt", protectedFile]]),
    });

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      write: true,
      delete: true,
      rename: true,
      body: "authenticated",
    });
    assert.equal(readFileSync(protectedFile, "utf8"), "authenticated");
    assert.equal(existsSync(renamedFile), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("direct symlinks and junction ancestors refuse before child authority", {
  skip: process.platform !== "win32",
}, async () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "galerina-owned-reparse-"));
  const root = join(fixtureRoot, "root");
  const outside = join(fixtureRoot, "outside");
  const outsideFile = join(outside, "input.txt");
  const directLink = join(root, "direct-link.txt");
  const junction = join(root, "junction");
  mkdirSync(root);
  mkdirSync(outside);
  writeFileSync(outsideFile, "authenticated", "utf8");
  symlinkSync(outsideFile, directLink, "file");
  symlinkSync(outside, junction, "junction");
  try {
    for (const [relativePath, protectedPath] of [
      ["direct-link.txt", directLink],
      ["junction/input.txt", join(junction, "input.txt")],
    ]) {
      const sentinel = join(root, `${relativePath.replaceAll("/", "-")}.spawned`);
      const result = await runOwnedProcess({
        command: process.execPath,
        args: ["-e", `require('node:fs').writeFileSync(${JSON.stringify(sentinel)}, 'spawned')`],
        cwd: root,
        env: process.env,
        timeoutMs: 2_000,
        protectedFileSet: protectedFileManifest(root, [[relativePath, protectedPath]]),
      });
      assert.equal(result.status, 126, result.stderr);
      assert.equal(result.spawnError?.code, "PROCESS-WARDEN-SETUP-REFUSED");
      assert.equal(existsSync(sentinel), false);
    }
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("a concurrent replacement attempt cannot substitute retained protected bytes", {
  skip: process.platform !== "win32",
}, async () => {
  const root = mkdtempSync(join(tmpdir(), "galerina-owned-concurrent-"));
  const protectedFile = join(root, "input.txt");
  const renamedFile = join(root, "renamed.txt");
  const ready = join(root, "ready.txt");
  const proceed = join(root, "proceed.txt");
  writeFileSync(protectedFile, "authenticated", "utf8");
  const child = [
    "const fs = require('node:fs');",
    `const input = ${JSON.stringify(protectedFile)};`,
    `const ready = ${JSON.stringify(ready)};`,
    `const proceed = ${JSON.stringify(proceed)};`,
    "fs.writeFileSync(ready, 'ready');",
    "const deadline = Date.now() + 3000;",
    "const timer = setInterval(() => {",
    "  if (!fs.existsSync(proceed) && Date.now() < deadline) return;",
    "  clearInterval(timer);",
    "  if (!fs.existsSync(proceed)) process.exit(31);",
    "  process.stdout.write(fs.readFileSync(input, 'utf8'));",
    "}, 10);",
  ].join("\n");
  try {
    const owned = runOwnedProcess({
      command: process.execPath,
      args: ["-e", child],
      cwd: root,
      env: process.env,
      timeoutMs: 4_000,
      protectedFileSet: protectedFileManifest(root, [["input.txt", protectedFile]]),
    });
    assert.equal(await waitForPath(ready), true, "protected child never became ready");
    assert.throws(() => writeFileSync(protectedFile, "substituted", "utf8"));
    assert.throws(() => renameSync(protectedFile, renamedFile));
    writeFileSync(proceed, "proceed", "utf8");
    const result = await owned;

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "authenticated");
    assert.equal(readFileSync(protectedFile, "utf8"), "authenticated");
    assert.equal(existsSync(renamedFile), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the Windows warden prevents writes inside a protected read tree", {
  skip: process.platform !== "win32",
}, async () => {
  const root = mkdtempSync(join(tmpdir(), "galerina-owned-protected-"));
  const protectedTree = join(root, "protected");
  const protectedFile = join(protectedTree, "locked.txt");
  mkdirSync(protectedTree, { recursive: true });
  writeFileSync(protectedFile, "authenticated", "utf8");
  try {
    const result = await runOwnedProcess({
      command: process.execPath,
      args: [
        "-e",
        [
          "const fs = require('node:fs');",
          `const file = ${JSON.stringify(protectedFile)};`,
          "if (fs.readFileSync(file, 'utf8') !== 'authenticated') process.exit(22);",
          "try { fs.writeFileSync(file, 'substituted'); process.exit(23); } catch { process.exit(24); }",
        ].join(" "),
      ],
      cwd: root,
      env: process.env,
      timeoutMs: 2_000,
      protectedReadTree: protectedTree,
    });

    assert.equal(result.status, 24, result.stderr);
    assert.equal(readFileSync(protectedFile, "utf8"), "authenticated");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the synchronous adapter preserves owned output and exit semantics", () => {
  assert.equal(typeof runOwnedProcessSync, "function");
  const result = runOwnedProcessSync({
    command: process.execPath,
    args: ["-e", "process.stdout.write('sync-owned')"],
    cwd: FIXTURES,
    env: process.env,
    timeoutMs: 2_000,
  });

  assert.equal(result.status, 0);
  assert.equal(result.signal, null);
  assert.equal(result.error, undefined);
  assert.equal(result.stdout, "sync-owned");
  assert.equal(result.stderr, "");
  assert.equal(result.owned.cleanupAttempted, false);
});

test("the synchronous wrapper propagates unequal stream ceilings and raw counts", () => {
  const result = runOwnedProcessSync({
    command: process.execPath,
    args: ["-e", "process.stdout.write('S'.repeat(128)); process.stderr.write('EEEE');"],
    cwd: FIXTURES,
    env: process.env,
    timeoutMs: 2_000,
    maxOutputBytes: 8,
    maxStdoutBytes: 128,
    maxStderrBytes: 4,
  });

  assert.equal(result.error, undefined);
  assert.equal(result.stdout, "S".repeat(128));
  assert.equal(result.stderr, "EEEE");
  assert.equal(result.stdoutBytes, 128);
  assert.equal(result.stderrBytes, 4);
  assert.equal(result.owned.stdoutBytes, 128);
  assert.equal(result.owned.stderrBytes, 4);
});

test("the synchronous wrapper admits worst-case JSON escapes at the exact byte ceiling", () => {
  const exactBytes = 300_000;
  const result = runOwnedProcessSync({
    command: process.execPath,
    args: ["-e", `process.stdout.write(Buffer.alloc(${exactBytes}))`],
    cwd: FIXTURES,
    env: process.env,
    timeoutMs: 5_000,
    maxOutputBytes: exactBytes,
  });

  assert.equal(result.error, undefined);
  assert.notEqual(result.owned, null);
  assert.equal(result.stdoutBytes, exactBytes);
  assert.equal(result.stderrBytes, 0);
  assert.equal(result.stdout.length, exactBytes);
  assert.equal(result.stdout.charCodeAt(0), 0);
  assert.equal(result.stdout.charCodeAt(exactBytes - 1), 0);
});

test("the synchronous wrapper admits limits above the obsolete JSON string projection", () => {
  const aboveJsonProjection = Math.floor((bufferConstants.MAX_STRING_LENGTH - (1024 * 1024)) / 6) + 1;
  const result = runOwnedProcessSync({
    command: process.execPath,
    args: ["-e", "process.stdout.write('framed', () => process.exit(99))"],
    cwd: FIXTURES,
    env: process.env,
    timeoutMs: 2_000,
    maxStdoutBytes: aboveJsonProjection,
    maxStderrBytes: 1,
  });

  assert.equal(result.error, undefined);
  assert.equal(result.status, 99);
  assert.equal(result.stdout, "framed");
  assert.notEqual(result.owned, null);
});

test("the synchronous wrapper refuses raw evidence beyond the runtime buffer range", () => {
  assert.throws(
    () => runOwnedProcessSync({
      command: process.execPath,
      args: ["-e", "process.exit(99)"],
      cwd: FIXTURES,
      env: process.env,
      timeoutMs: 2_000,
      maxStdoutBytes: bufferConstants.MAX_LENGTH,
      maxStderrBytes: 1,
    }),
    (error) => error.code === "OWNED-PROCESS-INPUT-INVALID",
  );
});

test("the owned-process frame parser refuses malformed framing and open metadata", () => {
  const badMagic = ownedFrame();
  badMagic[0] ^= 0xff;
  const badVersion = ownedFrame();
  badVersion.writeUInt8(2, 8);
  const openMetadata = ownedFrame({
    metadata: ownedFrameMetadata({ stdout: "body-must-not-be-metadata" }),
  });

  for (const frame of [badMagic, badVersion, openMetadata]) {
    assert.throws(
      () => _parseOwnedProcessFrame(frame, { maxStdoutBytes: 16, maxStderrBytes: 16 }),
      (error) => error.code === "OWNED-PROCESS-WRAPPER-MALFORMED",
    );
  }
});

test("the owned-process frame parser refuses truncated payloads", () => {
  const frame = ownedFrame({
    metadata: ownedFrameMetadata({ stdoutBytes: 4 }),
    stdout: Buffer.from("data"),
  });
  assert.throws(
    () => _parseOwnedProcessFrame(frame.subarray(0, frame.length - 1), {
      maxStdoutBytes: 4,
      maxStderrBytes: 1,
    }),
    (error) => error.code === "OWNED-PROCESS-WRAPPER-MALFORMED",
  );
});

test("the owned-process frame parser refuses trailing bytes", () => {
  const frame = Buffer.concat([ownedFrame(), Buffer.from([0])]);
  assert.throws(
    () => _parseOwnedProcessFrame(frame, { maxStdoutBytes: 1, maxStderrBytes: 1 }),
    (error) => error.code === "OWNED-PROCESS-WRAPPER-MALFORMED",
  );
});

test("the owned-process frame parser refuses payloads above their admitted stream limit", () => {
  const frame = ownedFrame({
    metadata: ownedFrameMetadata({ stdoutBytes: 2 }),
    stdout: Buffer.from("AB"),
  });
  assert.throws(
    () => _parseOwnedProcessFrame(frame, { maxStdoutBytes: 1, maxStderrBytes: 1 }),
    (error) => error.code === "OWNED-PROCESS-WRAPPER-MALFORMED",
  );
});

test("the owned supervisor preserves an authenticated nested suite lease", () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "galerina-owned-lease-"));
  const checkout = join(fixtureRoot, "checkout");
  const leaseBase = join(fixtureRoot, "leases");
  mkdirSync(checkout, { recursive: true });
  const lease = acquireSuiteLease({ root: checkout, leaseBase, commandClass: "phase-close" });
  try {
    const result = runOwnedProcessSync({
      command: process.execPath,
      args: [
        join(FIXTURES, "suite-lease-admit-child.cjs"),
        suiteLeasePath,
        checkout,
        leaseBase,
      ],
      cwd: FIXTURES,
      env: lease.childEnvironment(process.env),
      timeoutMs: 2_000,
    });

    assert.equal(result.status, 0, result.stderr || result.error?.message);
    assert.equal(result.error, undefined);
    assert.deepEqual(JSON.parse(result.stdout), {
      inherited: true,
      ownerPid: process.pid,
    });
  } finally {
    assert.equal(lease.release(), true);
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
