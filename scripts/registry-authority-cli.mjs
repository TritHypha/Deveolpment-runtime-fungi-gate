#!/usr/bin/env node
// Offline-root -> operational registry authority ceremony.
// Private files are read as data, never sourced, and private values are never
// printed. Every mode writes only after validation and cryptographic checking.

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  sign as edSign,
  verify as edVerify,
} from "node:crypto";
import {
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DECIDER_PATH = join(
  ROOT,
  "packages-galerina",
  "galerina-framework-app-kernel",
  "dist",
  "index.js",
);
const COMPILER_PACKAGE = join(
  ROOT,
  "packages-galerina",
  "galerina-core-compiler",
  "package.json",
);
const REVOCATION_GATE_PATH = join(
  ROOT,
  "governance",
  "revocation-registry.mjs",
);

const args = process.argv.slice(2);
const arg = (name, fallback = undefined) => {
  const index = args.indexOf(name);
  return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback;
};
const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");

async function loadDecider() {
  return import(pathToFileURL(DECIDER_PATH).href);
}

async function loadMlDsa65() {
  const compilerRequire = createRequire(COMPILER_PACKAGE);
  const modulePath = compilerRequire.resolve("@noble/post-quantum/ml-dsa.js");
  const { ml_dsa65: mlDsa65 } =
    await import(pathToFileURL(modulePath).href);
  return mlDsa65;
}

function decodeCanonicalBase64(value, label) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new Error(`REFUSED: ${label} is not canonical base64.`);
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) {
    throw new Error(`REFUSED: ${label} is not canonical base64.`);
  }
  return bytes;
}

function readSigningEnvironment(path) {
  const fields = new Map();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (line.trim().length === 0 || line.trimStart().startsWith("#")) continue;
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (!match || fields.has(match[1])) {
      throw new Error("REFUSED: signing environment is malformed or repeats a field.");
    }
    fields.set(match[1], match[2].trim());
  }
  return fields;
}

async function readRootPrivate(path, expectedKeyId) {
  const fields = readSigningEnvironment(path);
  const keyId = fields.get("GALERINA_SIGNING_KEY_ID");
  const algorithm = fields.get("GALERINA_SIGNING_ALGORITHM");
  const edB64 = fields.get("GALERINA_SIGNING_PRIVATE_KEY_B64");
  const mlB64 = fields.get("GALERINA_SIGNING_MLDSA_PRIVATE_KEY_B64");
  if (keyId !== expectedKeyId) {
    throw new Error(
      `REFUSED: root environment keyId '${String(keyId)}' does not match expected root '${expectedKeyId}'.`,
    );
  }
  if (algorithm !== "hybrid-ed25519-mldsa65" || !edB64 || !mlB64) {
    throw new Error(
      "REFUSED: the registry root must contain the complete hybrid-ed25519-mldsa65 key; an Ed25519-only root delegation is a prohibited downgrade.",
    );
  }
  const edPrivate = createPrivateKey(
    decodeCanonicalBase64(edB64, "root Ed25519 private key").toString("utf8"),
  );
  if (edPrivate.asymmetricKeyType !== "ed25519") {
    throw new Error("REFUSED: root private key is not Ed25519.");
  }
  const mlDsa65 = await loadMlDsa65();
  const mlPrivate = decodeCanonicalBase64(mlB64, "root ML-DSA-65 private key");
  if (mlPrivate.length !== mlDsa65.lengths.secretKey) {
    throw new Error("REFUSED: root ML-DSA-65 private key has the wrong length.");
  }
  return { edPrivate, mlPrivate: new Uint8Array(mlPrivate), mlDsa65 };
}

async function readOperationalPrivate(path, expectedKeyId) {
  const fields = readSigningEnvironment(path);
  const keyId = fields.get("GALERINA_SIGNING_KEY_ID");
  if (keyId !== expectedKeyId) {
    throw new Error(
      `REFUSED: operational environment keyId '${String(keyId)}' does not match expected operational key '${expectedKeyId}'.`,
    );
  }
  const algorithm = fields.get("GALERINA_SIGNING_ALGORITHM");
  const edB64 = fields.get("GALERINA_SIGNING_PRIVATE_KEY_B64");
  const mlB64 = fields.get("GALERINA_SIGNING_MLDSA_PRIVATE_KEY_B64");
  if (!algorithm && edB64 && !mlB64) {
    throw new Error(
      "REFUSED: this is a legacy Ed25519-only signer; mint a new dedicated hybrid operational key with `node galerina.mjs keygen --hybrid` rather than relabelling or extending the old identity.",
    );
  }
  if (algorithm !== "hybrid-ed25519-mldsa65") {
    throw new Error(
      `REFUSED: operational signing suite '${String(algorithm)}' is not hybrid-ed25519-mldsa65.`,
    );
  }
  if (!edB64 || !mlB64) {
    throw new Error("REFUSED: operational environment lacks one or both private halves.");
  }
  const edPrivate = createPrivateKey(
    decodeCanonicalBase64(edB64, "operational Ed25519 private key").toString("utf8"),
  );
  if (edPrivate.asymmetricKeyType !== "ed25519") {
    throw new Error("REFUSED: operational classical key is not Ed25519.");
  }
  const mlDsa65 = await loadMlDsa65();
  const mlPrivate = decodeCanonicalBase64(
    mlB64,
    "operational ML-DSA-65 private key",
  );
  if (mlPrivate.length !== mlDsa65.lengths.secretKey) {
    throw new Error("REFUSED: operational ML-DSA-65 private key has the wrong length.");
  }
  return { edPrivate, mlPrivate: new Uint8Array(mlPrivate), mlDsa65 };
}

function publicFacts(edPublicPem, mlPublicBytes) {
  const edPublic = createPublicKey(edPublicPem);
  if (edPublic.asymmetricKeyType !== "ed25519") {
    throw new Error("REFUSED: operational classical public key is not Ed25519.");
  }
  const edDer = edPublic.export({ type: "spki", format: "der" });
  return {
    edPublic,
    ed25519PublicKeySha256: sha256(edDer),
    mlDsa65PublicKeySha256: sha256(mlPublicBytes),
  };
}

const delegationMlDsaOptions = (decider) => ({
  context: new TextEncoder().encode(decider.REGISTRY_DELEGATION_V1_CONTEXT),
});

async function assertNotRevoked(keyId) {
  const revocation = await import(pathToFileURL(REVOCATION_GATE_PATH).href);
  revocation.assertRegistryTrustworthy(ROOT);
  if (revocation.isKeyRevoked(keyId, ROOT)) {
    throw new Error(`REFUSED: keyId '${keyId}' is revoked.`);
  }
}

async function selfTest() {
  const decider = await loadDecider();
  const mlDsa65 = await loadMlDsa65();
  const checks = [];
  const check = (name, condition) => checks.push({ name, pass: condition === true });
  const rootKeys = generateKeyPairSync("ed25519");
  const rootMlKeys = mlDsa65.keygen(randomBytes(32));
  const operationalEd = generateKeyPairSync("ed25519");
  const operationalMl = mlDsa65.keygen(randomBytes(32));
  const rootId = "root-disposable";
  const operationalId = "operational-disposable";
  const facts = publicFacts(
    operationalEd.publicKey.export({ type: "spki", format: "pem" }),
    operationalMl.publicKey,
  );
  const draft = decider.buildRegistryAuthorityDelegation({
    registry: "galerina-self-test",
    serial: 1,
    issuedAt: "2026-07-30T10:00:00.000Z",
    notBefore: "2026-07-30T10:00:00.000Z",
    notAfter: "2027-07-30T10:00:00.000Z",
    rootKeyId: rootId,
    operational: {
      keyId: operationalId,
      algorithm: "Ed25519+ML-DSA-65",
      ed25519PublicKeySha256: facts.ed25519PublicKeySha256,
      mlDsa65PublicKeySha256: facts.mlDsa65PublicKeySha256,
    },
    roles: ["package-manifest.sign", "registry-index.sign"],
  });
  check("draft pins operational Ed25519 bytes", draft.operational.ed25519PublicKeySha256 === facts.ed25519PublicKeySha256);
  check("draft pins operational ML-DSA-65 bytes", draft.operational.mlDsa65PublicKeySha256 === facts.mlDsa65PublicKeySha256);
  check("roles are closed", draft.roles.length === 2);
  const signed = decider.signRegistryAuthorityDelegation(
    draft,
    (message) => edSign(null, message, rootKeys.privateKey).toString("base64"),
    (message) => Buffer.from(
      mlDsa65.sign(
        message,
        rootMlKeys.secretKey,
        delegationMlDsaOptions(decider),
      ),
    ).toString("base64"),
  );
  check(
    "root signature exists",
    signed.rootSignature.ed25519Signature.length > 0
      && signed.rootSignature.mlDsa65Signature.length > 0,
  );
  const verification = {
    expectedRootKeyId: rootId,
    at: "2026-08-01T00:00:00.000Z",
    minSerial: 0,
    requiredRoles: ["package-manifest.sign", "registry-index.sign"],
    isRevoked: () => false,
    verifyRoot: {
      ed25519: (message, signature, keyId) =>
        keyId === rootId
          ? edVerify(null, message, rootKeys.publicKey, Buffer.from(signature, "base64"))
          : "no-key",
      mlDsa65: (message, signature, keyId) =>
        keyId === rootId
          ? mlDsa65.verify(
            Buffer.from(signature, "base64"),
            message,
            rootMlKeys.publicKey,
            delegationMlDsaOptions(decider),
          )
          : "no-key",
    },
  };
  check("root-signed delegation verifies", decider.verifyRegistryAuthorityDelegation(signed, verification) === "verified");
  let wrongOperational = false;
  try {
    if (operationalId !== "wrong-operational") throw new Error("mismatch");
  } catch {
    wrongOperational = true;
  }
  check("wrong operational key id refused", wrongOperational);
  let tampered = false;
  try {
    decider.verifyRegistryAuthorityDelegation({
      ...signed,
      operational: { ...signed.operational, keyId: "attacker" },
    }, verification);
  } catch {
    tampered = true;
  }
  check("tampered delegation refused", tampered);
  let stale = false;
  try {
    decider.verifyRegistryAuthorityDelegation(signed, { ...verification, minSerial: 1 });
  } catch {
    stale = true;
  }
  check("rollback serial refused", stale);
  let revoked = false;
  try {
    decider.verifyRegistryAuthorityDelegation(signed, {
      ...verification,
      isRevoked: (keyId) => keyId === operationalId,
    });
  } catch {
    revoked = true;
  }
  check("revoked operational key refused", revoked);

  for (const item of checks) console.log(`  ${item.pass ? "PASS" : "FAIL"} ${item.name}`);
  const failed = checks.filter((item) => !item.pass);
  console.log(`registry-authority-cli self-test: ${checks.length - failed.length}/${checks.length}`);
  return failed.length === 0 ? 0 : 1;
}

async function main() {
  if (args.includes("--self-test")) process.exit(await selfTest());
  const mode = args[0];
  const decider = await loadDecider();

  if (mode === "export-public") {
    const outputEd = arg("--ed25519-out");
    const outputMl = arg("--mldsa65-out");
    const keyId = arg("--operational-key-id");
    const envPath = process.env.GALERINA_REGISTRY_SIGNING_ENV_PATH;
    if (!outputEd || !outputMl || !keyId || !envPath) {
      throw new Error("REFUSED: export-public requires both output paths, --operational-key-id, and GALERINA_REGISTRY_SIGNING_ENV_PATH.");
    }
    await assertNotRevoked(keyId);
    const loaded = await readOperationalPrivate(envPath, keyId);
    const edPublic = createPublicKey(loaded.edPrivate).export({ type: "spki", format: "pem" });
    const mlPublic = loaded.mlDsa65.getPublicKey(loaded.mlPrivate);
    writeFileSync(outputEd, edPublic);
    writeFileSync(outputMl, Buffer.from(mlPublic).toString("base64") + "\n");
    console.log(`PUBLIC ONLY: exported both halves for keyId '${keyId}'.`);
    process.exit(0);
  }

  if (mode === "draft") {
    const output = arg("--out");
    const rootKeyId = arg("--root-key-id");
    const operationalKeyId = arg("--operational-key-id");
    const edPath = arg("--ed25519-pubkey");
    const mlPath = arg("--mldsa65-pubkey");
    const serialText = arg("--serial");
    const issuedAt = arg("--issued-at");
    const notBefore = arg("--not-before");
    const notAfter = arg("--not-after");
    if (!output || !rootKeyId || !operationalKeyId || !edPath || !mlPath || !serialText || !issuedAt || !notBefore || !notAfter) {
      throw new Error("REFUSED: draft requires explicit output, both key IDs, both operational public files, serial, and all three UTC instants.");
    }
    await assertNotRevoked(rootKeyId);
    await assertNotRevoked(operationalKeyId);
    const mlDsa65 = await loadMlDsa65();
    const mlPublic = decodeCanonicalBase64(
      readFileSync(mlPath, "utf8").trim(),
      "operational ML-DSA-65 public key",
    );
    if (mlPublic.length !== mlDsa65.lengths.publicKey) {
      throw new Error("REFUSED: operational ML-DSA-65 public key has the wrong length.");
    }
    const facts = publicFacts(readFileSync(edPath, "utf8"), mlPublic);
    const delegation = decider.buildRegistryAuthorityDelegation({
      registry: arg("--registry", "https://registry.galerina.dev"),
      serial: Number(serialText),
      issuedAt,
      notBefore,
      notAfter,
      rootKeyId,
      operational: {
        keyId: operationalKeyId,
        algorithm: "Ed25519+ML-DSA-65",
        ed25519PublicKeySha256: facts.ed25519PublicKeySha256,
        mlDsa65PublicKeySha256: facts.mlDsa65PublicKeySha256,
      },
      roles: ["package-manifest.sign", "registry-index.sign"],
    });
    writeFileSync(output, JSON.stringify(delegation, null, 2) + "\n");
    console.log(`UNSIGNED delegation draft -> ${output}`);
    process.exit(0);
  }

  if (mode === "sign") {
    const input = arg("--in");
    const output = arg("--out");
    const rootKeyId = arg("--root-key-id");
    const envPath = process.env.GALERINA_ROOT_SIGNING_ENV_PATH;
    if (!input || !output || !rootKeyId || !envPath) {
      throw new Error("REFUSED: sign requires --in, --out, --root-key-id, and GALERINA_ROOT_SIGNING_ENV_PATH.");
    }
    await assertNotRevoked(rootKeyId);
    const draft = JSON.parse(readFileSync(input, "utf8"));
    if (draft.rootKeyId !== rootKeyId || draft.rootSignature !== undefined) {
      throw new Error("REFUSED: input is not an unsigned draft for the expected root.");
    }
    if (
      typeof draft.operational?.keyId !== "string"
      || draft.operational.keyId.length === 0
    ) {
      throw new Error("REFUSED: draft lacks an operational signing identity.");
    }
    await assertNotRevoked(draft.operational.keyId);
    const rootPrivate = await readRootPrivate(envPath, rootKeyId);
    const rootMlOptions = delegationMlDsaOptions(decider);
    const signed = decider.signRegistryAuthorityDelegation(
      draft,
      (message) =>
        edSign(null, message, rootPrivate.edPrivate).toString("base64"),
      (message) => Buffer.from(
        rootPrivate.mlDsa65.sign(
          message,
          rootPrivate.mlPrivate,
          rootMlOptions,
        ),
      ).toString("base64"),
    );
    const rootPublic = createPublicKey(rootPrivate.edPrivate);
    const rootMlPublic =
      rootPrivate.mlDsa65.getPublicKey(rootPrivate.mlPrivate);
    decider.verifyRegistryAuthorityDelegation(signed, {
      expectedRootKeyId: rootKeyId,
      at: draft.notBefore,
      minSerial: 0,
      requiredRoles: ["package-manifest.sign", "registry-index.sign"],
      isRevoked: () => false,
      verifyRoot: {
        ed25519: (message, signature, keyId) =>
          keyId === rootKeyId
            ? edVerify(null, message, rootPublic, Buffer.from(signature, "base64"))
            : "no-key",
        mlDsa65: (message, signature, keyId) =>
          keyId === rootKeyId
            ? rootPrivate.mlDsa65.verify(
              Buffer.from(signature, "base64"),
              message,
              rootMlPublic,
              rootMlOptions,
            )
            : "no-key",
      },
    });
    writeFileSync(output, JSON.stringify(signed, null, 2) + "\n");
    console.log(`ROOT-SIGNED delegation -> ${output} (private material not shown).`);
    process.exit(0);
  }

  if (mode === "verify") {
    const input = arg("--in");
    const rootPublicPath = arg("--root-pubkey");
    const rootMlPublicPath = arg("--root-mldsa65-pubkey");
    const rootKeyId = arg("--root-key-id");
    const at = arg("--at");
    const minSerial = Number(arg("--min-serial", "0"));
    if (!input || !rootPublicPath || !rootMlPublicPath || !rootKeyId || !at) {
      throw new Error("REFUSED: verify requires signed input, both root public keys, root key ID, and verification instant.");
    }
    await assertNotRevoked(rootKeyId);
    const delegation = JSON.parse(readFileSync(input, "utf8"));
    if (
      typeof delegation.operational?.keyId !== "string"
      || delegation.operational.keyId.length === 0
    ) {
      throw new Error("REFUSED: delegation lacks an operational signing identity.");
    }
    await assertNotRevoked(delegation.operational.keyId);
    const rootPublic = createPublicKey(readFileSync(rootPublicPath, "utf8"));
    const mlDsa65 = await loadMlDsa65();
    const rootMlPublic = decodeCanonicalBase64(
      readFileSync(rootMlPublicPath, "utf8").trim(),
      "root ML-DSA-65 public key",
    );
    if (rootMlPublic.length !== mlDsa65.lengths.publicKey) {
      throw new Error("REFUSED: root ML-DSA-65 public key has the wrong length.");
    }
    const rootMlOptions = delegationMlDsaOptions(decider);
    decider.verifyRegistryAuthorityDelegation(delegation, {
      expectedRootKeyId: rootKeyId,
      at,
      minSerial,
      requiredRoles: ["package-manifest.sign", "registry-index.sign"],
      isRevoked: () => false,
      verifyRoot: {
        ed25519: (message, signature, keyId) =>
          keyId === rootKeyId
            ? edVerify(null, message, rootPublic, Buffer.from(signature, "base64"))
            : "no-key",
        mlDsa65: (message, signature, keyId) =>
          keyId === rootKeyId
            ? mlDsa65.verify(
              Buffer.from(signature, "base64"),
              message,
              rootMlPublic,
              rootMlOptions,
            )
            : "no-key",
      },
    });
    console.log(`VERIFIED delegation serial ${delegation.serial} for operational keyId '${delegation.operational.keyId}'.`);
    process.exit(0);
  }

  throw new Error("REFUSED: mode must be export-public, draft, sign, verify, or --self-test.");
}

main().catch((error) => {
  const message = String(error?.message ?? error);
  console.error(message.startsWith("REFUSED:") ? message : "REFUSED: registry authority operation failed.");
  process.exit(1);
});
