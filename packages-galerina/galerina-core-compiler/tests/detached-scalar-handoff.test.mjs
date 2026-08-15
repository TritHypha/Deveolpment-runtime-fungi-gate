import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { run } from "../dist/index.js";

const SOURCE = `@version 1
pure flow answer() -> Int {
  return 42
}
`;

const COMPILER_COMMIT = `git:${"e".repeat(40)}`;

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function memoryRepository(onRead = () => {}) {
  const bodies = new Map();
  let writes = 0;
  let reads = 0;
  return {
    owner: "galerina",
    async write(kind, bytes) {
      writes += 1;
      const body = Uint8Array.from(bytes);
      const reference = Object.freeze({
        schema: "galerina.artifact-reference.v1",
        owner: "galerina",
        kind,
        digest: sha256(body),
        byteLength: body.byteLength,
      });
      bodies.set(reference.digest, body);
      return reference;
    },
    async read(reference) {
      reads += 1;
      onRead();
      const body = bodies.get(reference.digest);
      if (body === undefined) throw new Error("missing body");
      return Uint8Array.from(body);
    },
    counts() { return { writes, reads }; },
  };
}

function detachedOptions(repository) {
  return {
    mode: "detached-reference",
    detachedReference: {
      repository,
      compilerCommit: COMPILER_COMMIT,
      compilerVersion: "galerina-core-compiler@test",
      checkerProfileVersion: "galerina.checked-module.profile.v1",
    },
  };
}

test("reference-only runtime seals, stores, rereads and emits without executing the AST", async () => {
  const repository = memoryRepository();
  const result = await run(SOURCE, "answer.fungi", "answer", new Map(), detachedOptions(repository));

  assert.equal(result.ok, true);
  assert.equal(result.mode, "detached-reference");
  assert.equal(result.detachedReference?.accepted, true);
  assert.equal(result.detachedReference?.executionAuthorized, false);
  assert.equal(result.detachedReference?.gir.reference.owner, "galerina");
  assert.equal(result.detachedReference?.gir.reference.kind, "canonical-gir");
  assert.equal(result.detachedReference?.gir.bytes.byteLength, 323);
  assert.deepEqual(repository.counts(), { writes: 2, reads: 2 });
  assert.equal("value" in result, false);
  assert.equal("execution" in result, false);
  assert.equal("proofChain" in result, false);
  assert.equal("semanticGraph" in result, false);
  assert.equal("executionPlan" in result, false);
});

test("post-seal source, AST-shaped and registry-shaped mutations cannot change detached GIR", async () => {
  const changed = {
    source: SOURCE,
    ast: { kind: "numberLiteral", value: "42" },
    registry: { digest: "366c36a35ee5493bd59c2329783c33ccbb15055288b1a361d2a16b58a9b0aa66" },
  };
  const repository = memoryRepository(() => {
    changed.source = "pure flow answer() -> Int { return -1 }";
    changed.ast.value = "-1";
    changed.registry.digest = "0".repeat(64);
  });
  const first = await run(SOURCE, "answer.fungi", "answer", new Map(), detachedOptions(repository));
  assert.equal(first.detachedReference?.accepted, true);
  const firstBytes = Uint8Array.from(first.detachedReference.gir.bytes);

  const secondRepository = memoryRepository();
  const second = await run(SOURCE, "answer.fungi", "answer", new Map(), detachedOptions(secondRepository));
  assert.equal(second.detachedReference?.accepted, true);
  assert.deepEqual(second.detachedReference.gir.bytes, firstBytes);
  assert.equal(changed.ast.value, "-1");
  assert.equal(changed.registry.digest, "0".repeat(64));
});

test("unsupported checked semantics and repository failures return typed refusals without fallback", async () => {
  const unconfigured = await run(SOURCE, "answer.fungi", "answer", new Map(), {
    mode: "detached-reference",
  });
  assert.deepEqual(unconfigured.detachedReference, {
    accepted: false,
    executionAuthorized: false,
    code: "DETACHED_CONFIGURATION",
  });

  let getterCalls = 0;
  const hostileOptions = { mode: "detached-reference" };
  Object.defineProperty(hostileOptions, "detachedReference", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return detachedOptions(memoryRepository()).detachedReference;
    },
  });
  const hostile = await run(SOURCE, "answer.fungi", "answer", new Map(), hostileOptions);
  assert.equal(getterCalls, 0);
  assert.equal(hostile.detachedReference?.accepted, false);
  assert.equal(hostile.detachedReference?.code, "DETACHED_CONFIGURATION");

  const noVersion = await run(
    `pure flow answer() -> Int { return 42 }\n`,
    "answer.fungi",
    "answer",
    new Map(),
    detachedOptions(memoryRepository()),
  );
  assert.equal(noVersion.detachedReference?.accepted, false);
  assert.equal(noVersion.detachedReference?.code, "SNAPSHOT_UNAVAILABLE");

  const unsupported = await run(
    `@version 1\npure flow answer() -> Int { return 40 + 2 }\n`,
    "answer.fungi",
    "answer",
    new Map(),
    detachedOptions(memoryRepository()),
  );
  assert.deepEqual(unsupported.detachedReference, {
    accepted: false,
    executionAuthorized: false,
    code: "UNSUPPORTED_SNAPSHOT_SEMANTIC",
  });
  assert.equal("value" in unsupported, false);

  const unavailable = await run(SOURCE, "answer.fungi", "answer", new Map(), detachedOptions({
    owner: "galerina",
    async write() { throw new Error("offline"); },
    async read() { throw new Error("unreachable"); },
  }));
  assert.deepEqual(unavailable.detachedReference, {
    accepted: false,
    executionAuthorized: false,
    code: "REPOSITORY_UNAVAILABLE",
  });

  let writes = 0;
  const partialRepository = memoryRepository();
  const publicationUnavailable = await run(SOURCE, "answer.fungi", "answer", new Map(), detachedOptions({
    owner: "galerina",
    async write(kind, bytes) {
      writes += 1;
      if (writes === 2) throw new Error("publication offline");
      return partialRepository.write(kind, bytes);
    },
    async read(reference) {
      return partialRepository.read(reference);
    },
  }));
  assert.deepEqual(publicationUnavailable.detachedReference, {
    accepted: false,
    executionAuthorized: false,
    code: "REPOSITORY_UNAVAILABLE",
  });
});

test("the post-snapshot handoff module has no parser, AST emitter, execution-plan or Hypha dependency", () => {
  const source = readFileSync(new URL("../src/detached-scalar-handoff.ts", import.meta.url), "utf8");
  for (const forbidden of [
    "./parser.js",
    "./gir-emitter.js",
    "buildExecutionPlan",
    "buildSemanticGraph",
    "executeFlow",
    "hypha",
  ]) {
    assert.equal(source.toLowerCase().includes(forbidden.toLowerCase()), false, forbidden);
  }
});

test("CLI detached-reference writes only Galerina-owned snapshot and canonical GIR bodies", () => {
  const root = mkdtempSync(join(tmpdir(), "galerina-detached-reference-"));
  try {
    const sourcePath = join(root, "answer.fungi");
    const repositoryPath = join(root, "repository");
    writeFileSync(sourcePath, SOURCE, "utf8");
    const result = spawnSync(process.execPath, [
      fileURLToPath(new URL("../dist/cli.js", import.meta.url)),
      "detached-reference",
      sourcePath,
      `--repository=${repositoryPath}`,
      `--compiler-commit=${COMPILER_COMMIT}`,
      "--compiler-version=galerina-core-compiler@test",
      "--checker-profile-version=galerina.checked-module.profile.v1",
    ], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.executionAuthorized, false);
    assert.equal(output.snapshot.owner, "galerina");
    assert.equal(output.gir.owner, "galerina");
    assert.equal(readdirSync(join(repositoryPath, "galerina", "checked-module-snapshot")).length, 1);
    assert.equal(readdirSync(join(repositoryPath, "galerina", "canonical-gir")).length, 1);

    const refusedRoot = join(root, "refused");
    const refused = spawnSync(process.execPath, [
      fileURLToPath(new URL("../dist/cli.js", import.meta.url)),
      "detached-reference",
      sourcePath,
      `--repository=${refusedRoot}`,
    ], { encoding: "utf8" });
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /compiler-commit/u);
    assert.throws(() => readdirSync(refusedRoot));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
