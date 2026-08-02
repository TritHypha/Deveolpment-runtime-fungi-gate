#!/usr/bin/env node

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as signEd25519,
  verify as verifyEd25519,
} from "node:crypto";
import {
  closeSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  RELEASE_EVIDENCE_ROLE,
  releaseEvidenceDelegationPreimage,
  releaseEvidenceStatementPreimage,
} from "./lib/beta-release-evidence-envelope.mjs";
import {
  validateDurabilityStatement,
  validateRepositoryStatement,
} from "./lib/beta-release-evidence-receipts.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(SCRIPT_PATH), "..");
const compilerRequire = createRequire(
  join(ROOT, "packages-galerina", "galerina-core-compiler", "package.json"),
);
const { ml_dsa65: mlDsa65 } = await import(
  pathToFileURL(compilerRequire.resolve("@noble/post-quantum/ml-dsa.js")).href
);

const KEY_ID = /^[0-9a-f]{16}$/u;
const MAX_INPUT_BYTES = 1024 * 1024;
const EXPECTED_ENVIRONMENT_FIELDS = Object.freeze([
  "GALERINA_SIGNING_ALGORITHM",
  "GALERINA_SIGNING_KEY_CREATED",
  "GALERINA_SIGNING_KEY_ID",
  "GALERINA_SIGNING_MLDSA_PRIVATE_KEY_B64",
  "GALERINA_SIGNING_PRIVATE_KEY_B64",
]);
const ROLE = Object.freeze({
  durability: Object.freeze({
    authorityRole: RELEASE_EVIDENCE_ROLE.DURABILITY,
    context: "galerina.release.evidence.durability.sig.v1",
    predicateType: "https://galerina.dev/attestation/registry-durability/v1",
  }),
  repository: Object.freeze({
    authorityRole: RELEASE_EVIDENCE_ROLE.REPOSITORY,
    context: "galerina.release.evidence.repository.sig.v1",
    predicateType: "https://galerina.dev/attestation/repository-fixed-point/v1",
  }),
});
const DELEGATION_CONTEXT = "galerina.release.evidence.delegation.sig.v1";

function refuse(message) {
  throw new Error(`REFUSED: ${message}`);
}

function readStablePrivateFile(path) {
  const candidate = resolve(path);
  let before;
  try {
    before = lstatSync(candidate, { bigint: true });
  } catch {
    refuse("signing environment is unavailable.");
  }
  if (
    !before.isFile()
    || before.isSymbolicLink()
    || before.nlink !== 1n
    || before.size <= 0n
    || before.size > BigInt(MAX_INPUT_BYTES)
    || realpathSync(candidate) !== candidate
  ) {
    refuse("signing environment file identity is not admitted.");
  }
  const descriptor = openSync(candidate, "r");
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor, { bigint: true });
    if (
      opened.dev !== before.dev
      || opened.ino !== before.ino
      || opened.nlink !== 1n
      || BigInt(bytes.length) !== opened.size
      || after.dev !== opened.dev
      || after.ino !== opened.ino
      || after.size !== opened.size
      || after.mtimeNs !== opened.mtimeNs
      || after.nlink !== 1n
    ) {
      refuse("signing environment changed while being read.");
    }
    return bytes;
  } finally {
    closeSync(descriptor);
  }
}

function decodeUtf8(bytes, label) {
  if (
    bytes.includes(0)
    || (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
  ) {
    refuse(`${label} must be canonical UTF-8 without a byte-order mark.`);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    refuse(`${label} must be canonical UTF-8 without a byte-order mark.`);
  }
}

function decodeCanonicalBase64(value, label) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length % 4 !== 0
    || !/^[A-Za-z0-9+/]+={0,2}$/u.test(value)
  ) {
    refuse(`${label} is not canonical base64; private values not shown.`);
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) {
    refuse(`${label} is not canonical base64; private values not shown.`);
  }
  return bytes;
}

function parseEnvironment(bytes, expectedKeyId) {
  const text = decodeUtf8(bytes, "signing environment");
  const fields = new Map();
  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    if (line.length === 0 || line.trimStart().startsWith("#")) continue;
    const match = /^([A-Z0-9_]+)=(.*)$/u.exec(line);
    if (match === null) {
      refuse(`signing environment contains a malformed record at line ${index + 1}; private values not shown.`);
    }
    if (fields.has(match[1])) {
      refuse(`signing environment repeats '${match[1]}' at line ${index + 1}; private values not shown.`);
    }
    fields.set(match[1], match[2]);
  }
  const names = [...fields.keys()].sort();
  if (
    names.length !== EXPECTED_ENVIRONMENT_FIELDS.length
    || names.some((name, index) => name !== EXPECTED_ENVIRONMENT_FIELDS[index])
    || fields.get("GALERINA_SIGNING_KEY_ID") !== expectedKeyId
    || fields.get("GALERINA_SIGNING_ALGORITHM") !== "hybrid-ed25519-mldsa65"
  ) {
    refuse("signing environment fields, key identity or algorithm are not admitted; private values not shown.");
  }
  const created = fields.get("GALERINA_SIGNING_KEY_CREATED");
  const instant = Date.parse(created);
  if (!Number.isFinite(instant) || new Date(instant).toISOString() !== created) {
    refuse("signing environment creation instant is malformed; private values not shown.");
  }
  let edPrivate;
  try {
    edPrivate = createPrivateKey(
      decodeCanonicalBase64(
        fields.get("GALERINA_SIGNING_PRIVATE_KEY_B64"),
        "Ed25519 private key",
      ).toString("utf8"),
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("REFUSED:")) throw error;
    refuse("Ed25519 private key is malformed; private values not shown.");
  }
  if (edPrivate.asymmetricKeyType !== "ed25519") {
    refuse("classical private key is not Ed25519; private values not shown.");
  }
  const mlPrivate = decodeCanonicalBase64(
    fields.get("GALERINA_SIGNING_MLDSA_PRIVATE_KEY_B64"),
    "ML-DSA-65 private key",
  );
  if (mlPrivate.length !== mlDsa65.lengths.secretKey) {
    refuse("ML-DSA-65 private key has the wrong length; private values not shown.");
  }
  return Object.freeze({
    keyId: expectedKeyId,
    edPrivate,
    mlPrivate: Uint8Array.from(mlPrivate),
  });
}

function parseArgs(argv) {
  const mode = argv[0];
  if (!Object.hasOwn({
    "inspect-environment": true,
    "sign-delegation": true,
    "sign-statement": true,
  }, mode ?? "")) {
    refuse("mode must be inspect-environment, sign-delegation or sign-statement.");
  }
  const values = new Map();
  for (let index = 1; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (
      ![
        "--input",
        "--operational-ed25519-public",
        "--operational-key-id",
        "--operational-mldsa65-public",
        "--output",
        "--role",
        "--root-key-id",
      ].includes(name)
      || value === undefined
      || value.startsWith("--")
      || values.has(name)
    ) {
      refuse("command-line options are missing, repeated or unknown.");
    }
    values.set(name, value);
  }
  const keyId = mode === "sign-delegation"
    ? values.get("--root-key-id")
    : values.get("--operational-key-id");
  if (!KEY_ID.test(keyId ?? "")) refuse("signing key ID is malformed.");
  if (mode === "inspect-environment" && values.size !== 1) {
    refuse("inspect-environment accepts only --operational-key-id.");
  }
  if (mode === "sign-statement" && (
    values.size !== 4
    || ROLE[values.get("--role")] === undefined
  )) {
    refuse("sign-statement requires one admitted role, input, output and operational key ID.");
  }
  if (mode === "sign-delegation" && (
    values.size !== 5
    || values.get("--input") === undefined
    || values.get("--output") === undefined
    || values.get("--operational-ed25519-public") === undefined
    || values.get("--operational-mldsa65-public") === undefined
  )) {
    refuse("sign-delegation requires input, output, root key ID and both operational public keys.");
  }
  return Object.freeze({ mode, keyId, values });
}

function readCanonicalStatement(path) {
  const bytes = readStablePrivateFile(path);
  const text = decodeUtf8(bytes, "statement");
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    refuse("statement is not canonical JSON.");
  }
  if (`${JSON.stringify(value, null, 2)}\n` !== text) {
    refuse("statement is not canonical JSON.");
  }
  return value;
}

function validateRoleStatement(statement, roleName) {
  const role = ROLE[roleName];
  if (statement?.predicateType !== role.predicateType) {
    refuse("statement predicate does not match the requested role.");
  }
  const predicate = statement.predicate;
  try {
    if (roleName === "repository") {
      validateRepositoryStatement(statement, {
        releaseId: predicate.releaseId,
        repositoryCommit: predicate.repositoryCommit,
        trackedTreeSha256: predicate.trackedTreeSha256,
      });
    } else {
      validateDurabilityStatement(statement, {
        releaseId: predicate.releaseId,
        operatingSystem: predicate.operatingSystem,
        platform: predicate.platform,
        repositoryCommit: predicate.repositoryCommit,
        evidenceBundleSha256: predicate.evidenceBundleSha256,
        implementationSha256: predicate.implementationSha256,
        acceptedCheckpointSha256: predicate.acceptedCheckpointSha256,
        controlledRebootSha256: predicate.controlledRebootSha256,
        controlledPowerLossSha256: predicate.controlledPowerLossSha256,
      });
    }
  } catch {
    refuse("statement is not a closed, role-matched release predicate.");
  }
  return role;
}

function signStatement(statement, role, privateKey) {
  const message = releaseEvidenceStatementPreimage(statement, role.authorityRole);
  const context = new TextEncoder().encode(role.context);
  const ed25519Signature = signEd25519(
    null,
    message,
    privateKey.edPrivate,
  );
  const mlDsa65Signature = mlDsa65.sign(
    message,
    privateKey.mlPrivate,
    { context },
  );
  const edPublic = createPublicKey(privateKey.edPrivate);
  const mlPublic = mlDsa65.getPublicKey(privateKey.mlPrivate);
  if (
    verifyEd25519(null, message, edPublic, ed25519Signature) !== true
    || mlDsa65.verify(mlDsa65Signature, message, mlPublic, { context }) !== true
  ) {
    refuse("post-sign verification failed.");
  }
  return {
    schema: "galerina.release-evidence.envelope.v1",
    statement,
    signature: {
      algorithm: "hybrid-ed25519-mldsa65",
      canon: "galerina-canonical-json-v1",
      context: role.context,
      keyId: privateKey.keyId,
      ed25519Signature: Buffer.from(ed25519Signature).toString("base64"),
      mlDsa65Signature: Buffer.from(mlDsa65Signature).toString("base64"),
    },
  };
}

function readOperationalPublicFacts(edPath, mlPath) {
  const edBytes = readStablePrivateFile(edPath);
  const mlBytes = readStablePrivateFile(mlPath);
  let edPublic;
  try {
    edPublic = createPublicKey(decodeUtf8(edBytes, "operational Ed25519 public key"));
  } catch {
    refuse("operational Ed25519 public key is malformed.");
  }
  if (edPublic.asymmetricKeyType !== "ed25519") {
    refuse("operational classical public key is not Ed25519.");
  }
  const mlText = decodeUtf8(mlBytes, "operational ML-DSA-65 public key");
  if (!mlText.endsWith("\n") || mlText.slice(0, -1).includes("\n")) {
    refuse("operational ML-DSA-65 public key is not canonical.");
  }
  const mlPublic = decodeCanonicalBase64(
    mlText.slice(0, -1),
    "operational ML-DSA-65 public key",
  );
  if (mlPublic.length !== mlDsa65.lengths.publicKey) {
    refuse("operational ML-DSA-65 public key has the wrong length.");
  }
  return Object.freeze({
    ed25519Sha256: createHash("sha256").update(
      edPublic.export({ type: "spki", format: "der" }),
    ).digest("hex"),
    mlDsa65Sha256: createHash("sha256").update(mlPublic).digest("hex"),
  });
}

function signDelegation(base, privateKey, operationalFacts) {
  if (
    base?.rootKeyId !== privateKey.keyId
    || base?.operational?.ed25519Sha256 !== operationalFacts.ed25519Sha256
    || base?.operational?.mlDsa65Sha256 !== operationalFacts.mlDsa65Sha256
  ) {
    refuse("delegation does not bind the selected root and operational public keys.");
  }
  let message;
  try {
    message = releaseEvidenceDelegationPreimage(base);
  } catch {
    refuse("unsigned delegation is malformed or widens the admitted roles.");
  }
  const context = new TextEncoder().encode(DELEGATION_CONTEXT);
  const ed25519Signature = signEd25519(null, message, privateKey.edPrivate);
  const mlDsa65Signature = mlDsa65.sign(message, privateKey.mlPrivate, { context });
  const edPublic = createPublicKey(privateKey.edPrivate);
  const mlPublic = mlDsa65.getPublicKey(privateKey.mlPrivate);
  if (
    verifyEd25519(null, message, edPublic, ed25519Signature) !== true
    || mlDsa65.verify(mlDsa65Signature, message, mlPublic, { context }) !== true
  ) {
    refuse("post-sign delegation verification failed.");
  }
  return {
    ...base,
    signature: {
      algorithm: "hybrid-ed25519-mldsa65",
      canon: "galerina-canonical-json-v1",
      context: DELEGATION_CONTEXT,
      keyId: privateKey.keyId,
      ed25519Signature: Buffer.from(ed25519Signature).toString("base64"),
      mlDsa65Signature: Buffer.from(mlDsa65Signature).toString("base64"),
    },
  };
}

function writeExclusiveJson(outputValue, outputPath) {
  const output = resolve(outputPath);
  try {
    writeFileSync(output, `${JSON.stringify(outputValue, null, 2)}\n`, {
      flag: "wx",
      mode: 0o600,
    });
  } catch {
    refuse("output must be a new, exclusive file in an existing directory.");
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const environmentPath = options.mode === "sign-delegation"
    ? process.env.GALERINA_RELEASE_EVIDENCE_ROOT_SIGNING_ENV_PATH
    : process.env.GALERINA_RELEASE_EVIDENCE_SIGNING_ENV_PATH;
  if (typeof environmentPath !== "string" || environmentPath.length === 0) {
    refuse("the mode-specific release-evidence signing environment path is required.");
  }
  const privateKey = parseEnvironment(
    readStablePrivateFile(environmentPath),
    options.keyId,
  );
  if (options.mode === "inspect-environment") {
    process.stdout.write(
      `STRUCTURE OK: canonical signing environment has 5 unique fields for expected keyId '${options.keyId}'; private values not shown.\n`,
    );
    return;
  }
  if (options.mode === "sign-delegation") {
    const base = readCanonicalStatement(options.values.get("--input"));
    const operationalFacts = readOperationalPublicFacts(
      options.values.get("--operational-ed25519-public"),
      options.values.get("--operational-mldsa65-public"),
    );
    writeExclusiveJson(
      signDelegation(base, privateKey, operationalFacts),
      options.values.get("--output"),
    );
    process.stdout.write(
      `ROOT-SIGNED release-evidence delegation with root keyId '${options.keyId}' (both components self-verified; private values not shown).\n`,
    );
    return;
  }
  const roleName = options.values.get("--role");
  const statement = readCanonicalStatement(options.values.get("--input"));
  const role = validateRoleStatement(statement, roleName);
  const envelope = signStatement(statement, role, privateKey);
  writeExclusiveJson(envelope, options.values.get("--output"));
  process.stdout.write(
    `SIGNED ${roleName} statement with keyId '${options.keyId}' (both components self-verified; private values not shown).\n`,
  );
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === SCRIPT_PATH) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "REFUSED: unknown release-evidence error."}\n`);
    process.exitCode = 1;
  }
}
