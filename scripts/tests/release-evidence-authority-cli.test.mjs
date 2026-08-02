import assert from "node:assert/strict";
import {
  createHash,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
} from "node:crypto";
import { createRequire } from "node:module";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { pathToFileURL } from "node:url";

import {
  RELEASE_REPOSITORY_CHECKS,
  deriveRepositoryStatement,
} from "../lib/beta-release-evidence-receipts.mjs";

const ROOT = resolve(import.meta.dirname, "..", "..");
const CLI = join(ROOT, "scripts", "release-evidence-authority-cli.mjs");
const compilerRequire = createRequire(
  join(ROOT, "packages-galerina", "galerina-core-compiler", "package.json"),
);
const { ml_dsa65: mlDsa65 } = await import(
  pathToFileURL(compilerRequire.resolve("@noble/post-quantum/ml-dsa.js")).href
);
const KEY_ID = "3333333333333333";

function canonical(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "release-evidence-cli-"));
  const ed = generateKeyPairSync("ed25519");
  const ml = mlDsa65.keygen(randomBytes(32));
  const edPrivatePem = ed.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const environment = [
    `GALERINA_SIGNING_KEY_ID=${KEY_ID}`,
    "GALERINA_SIGNING_ALGORITHM=hybrid-ed25519-mldsa65",
    "GALERINA_SIGNING_KEY_CREATED=2026-08-02T10:00:00.000Z",
    `GALERINA_SIGNING_PRIVATE_KEY_B64=${Buffer.from(edPrivatePem).toString("base64")}`,
    `GALERINA_SIGNING_MLDSA_PRIVATE_KEY_B64=${Buffer.from(ml.secretKey).toString("base64")}`,
    "",
  ].join("\n");
  const envPath = join(directory, "signing.env");
  writeFileSync(envPath, environment, { flag: "wx" });
  const statement = deriveRepositoryStatement({
    releaseId: "beta-v1",
    repositoryCommit: "a".repeat(40),
    trackedTreeSha256: "b".repeat(64),
    checks: RELEASE_REPOSITORY_CHECKS.map((definition, index) => ({
      id: definition.id,
      command: [...definition.command],
      exitCode: 0,
      stdoutSha256: (index + 1).toString(16).repeat(64),
      stderrSha256: (index + 7).toString(16).repeat(64),
    })),
  });
  const input = join(directory, "statement.json");
  const output = join(directory, "envelope.json");
  writeFileSync(input, canonical(statement), { flag: "wx" });
  return { directory, envPath, input, output, environment };
}

function run(args, envPath) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    env: {
      ...process.env,
      GALERINA_RELEASE_EVIDENCE_SIGNING_ENV_PATH: envPath,
      GALERINA_RELEASE_EVIDENCE_ROOT_SIGNING_ENV_PATH: envPath,
    },
  });
}

test("inspects structure and signs a role-matched statement without leaking private values", () => {
  const value = fixture();
  try {
    const inspect = run(["inspect-environment", "--operational-key-id", KEY_ID], value.envPath);
    assert.equal(inspect.status, 0, inspect.stderr);
    assert.match(inspect.stdout, /STRUCTURE OK/u);
    for (const line of value.environment.split("\n").slice(3, 5)) {
      assert.equal(`${inspect.stdout}${inspect.stderr}`.includes(line.split("=")[1]), false);
    }

    const signed = run([
      "sign-statement",
      "--role", "repository",
      "--input", value.input,
      "--output", value.output,
      "--operational-key-id", KEY_ID,
    ], value.envPath);
    assert.equal(signed.status, 0, signed.stderr);
    assert.match(signed.stdout, /SIGNED repository/u);
    const envelope = JSON.parse(readFileSync(value.output, "utf8"));
    assert.equal(envelope.signature.keyId, KEY_ID);
    assert.equal(envelope.signature.algorithm, "hybrid-ed25519-mldsa65");
    assert.equal(typeof envelope.signature.ed25519Signature, "string");
    assert.equal(typeof envelope.signature.mlDsa65Signature, "string");
  } finally {
    rmSync(value.directory, { recursive: true });
  }
});

test("refuses duplicate environment records, wrong roles and existing output", () => {
  const value = fixture();
  try {
    writeFileSync(
      value.envPath,
      `${value.environment}GALERINA_SIGNING_KEY_ID=${KEY_ID}\n`,
    );
    const duplicate = run(["inspect-environment", "--operational-key-id", KEY_ID], value.envPath);
    assert.notEqual(duplicate.status, 0);
    assert.match(duplicate.stderr, /repeats/u);
    assert.equal(duplicate.stderr.includes("PRIVATE_KEY_B64="), false);

    writeFileSync(value.envPath, value.environment);
    const wrongRole = run([
      "sign-statement",
      "--role", "durability",
      "--input", value.input,
      "--output", value.output,
      "--operational-key-id", KEY_ID,
    ], value.envPath);
    assert.notEqual(wrongRole.status, 0);
    assert.match(wrongRole.stderr, /role/u);

    writeFileSync(value.output, "occupied\n", { flag: "wx" });
    const occupied = run([
      "sign-statement",
      "--role", "repository",
      "--input", value.input,
      "--output", value.output,
      "--operational-key-id", KEY_ID,
    ], value.envPath);
    assert.notEqual(occupied.status, 0);
    assert.match(occupied.stderr, /output/u);
  } finally {
    rmSync(value.directory, { recursive: true });
  }
});

test("root-signs only the exact two-role delegation bound to supplied public keys", () => {
  const value = fixture();
  try {
    const operationalEd = generateKeyPairSync("ed25519");
    const operationalMl = mlDsa65.keygen(randomBytes(32));
    const edFile = join(value.directory, "operational.pub.pem");
    const mlFile = join(value.directory, "operational.mldsa.pub.b64");
    const unsignedFile = join(value.directory, "delegation.unsigned.json");
    const signedFile = join(value.directory, "delegation.json");
    const edPem = operationalEd.publicKey.export({ type: "spki", format: "pem" }).toString();
    const edDer = createPublicKey(edPem).export({ type: "spki", format: "der" });
    writeFileSync(edFile, edPem, { flag: "wx" });
    writeFileSync(
      mlFile,
      `${Buffer.from(operationalMl.publicKey).toString("base64")}\n`,
      { flag: "wx" },
    );
    writeFileSync(unsignedFile, canonical({
      schema: "galerina.release-evidence.delegation.v1",
      releaseId: "beta-v1",
      serial: 1,
      issuedAt: "2026-08-02T10:00:00.000Z",
      notBefore: "2026-08-02T10:00:00.000Z",
      notAfter: "2026-08-03T10:00:00.000Z",
      rootKeyId: KEY_ID,
      operational: {
        keyId: "4444444444444444",
        ed25519Sha256: createHash("sha256").update(edDer).digest("hex"),
        mlDsa65Sha256: createHash("sha256").update(operationalMl.publicKey).digest("hex"),
        roles: ["durability-evidence.sign", "repository-evidence.sign"],
      },
    }), { flag: "wx" });

    const result = run([
      "sign-delegation",
      "--input", unsignedFile,
      "--output", signedFile,
      "--root-key-id", KEY_ID,
      "--operational-ed25519-public", edFile,
      "--operational-mldsa65-public", mlFile,
    ], value.envPath);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /ROOT-SIGNED/u);
    const signed = JSON.parse(readFileSync(signedFile, "utf8"));
    assert.equal(signed.signature.keyId, KEY_ID);
    assert.equal(signed.signature.context, "galerina.release.evidence.delegation.sig.v1");
  } finally {
    rmSync(value.directory, { recursive: true });
  }
});
