import { test } from "node:test";
import assert from "node:assert/strict";
import { constants as bufferConstants } from "node:buffer";
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
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
