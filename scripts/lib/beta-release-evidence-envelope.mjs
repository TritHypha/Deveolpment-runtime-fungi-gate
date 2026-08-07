import {
  createHash,
  createPublicKey,
  verify as verifyEd25519,
} from "node:crypto";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { types } from "node:util";

const ROOT = resolve(import.meta.dirname, "..", "..");
const compilerRequire = createRequire(
  join(ROOT, "packages-galerina", "galerina-core-compiler", "package.json"),
);
const { ml_dsa65: mlDsa65 } = await import(
  pathToFileURL(
    compilerRequire.resolve("@noble/post-quantum/ml-dsa.js"),
  ).href
);

const KEY_ID = /^[0-9a-f]{16}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const MAX_CANONICAL_BYTES = 1024 * 1024;
const MAX_DEPTH = 32;
const MAX_NODES = 4096;
const MAX_STRING_BYTES = 64 * 1024;
const CANON = "galerina-canonical-json-v1";
const ALGORITHM = "hybrid-ed25519-mldsa65";
const DELEGATION_CONTEXT = "galerina.release.evidence.delegation.sig.v1";
const VERIFIABLE_SUITE_STATUSES = new Set([
  "active-for-signing",
  "verify-only-retired",
]);

export const RELEASE_EVIDENCE_ROLE = Object.freeze({
  DURABILITY: "durability-evidence.sign",
  REPOSITORY: "repository-evidence.sign",
  // G7 (owner-ratified 2026-08-07): gate admission signs as a NEW ROLE inside
  // THIS envelope — one canonicaliser, one suite catalogue — never a sibling
  // signing layer. The statement it signs over is built by the compiler's
  // gate-v3-admission surface.
  GATE_ADMISSION: "gate-admission.sign",
});

const ROLE_CONTEXT = Object.freeze({
  [RELEASE_EVIDENCE_ROLE.DURABILITY]:
    "galerina.release.evidence.durability.sig.v1",
  [RELEASE_EVIDENCE_ROLE.REPOSITORY]:
    "galerina.release.evidence.repository.sig.v1",
  [RELEASE_EVIDENCE_ROLE.GATE_ADMISSION]:
    "galerina.release.evidence.gate-admission.sig.v1",
});
// Every role a delegation MAY carry, in canonical (code-unit) order. A
// delegation's roles must be a non-empty sorted unique subset of this set —
// widened from the original exact [DURABILITY, REPOSITORY] pin when the
// admission role landed. Existing ceremony delegations carry exactly that
// pair and remain valid byte-for-byte; an unknown role name still refuses.
const KNOWN_ROLES = Object.freeze([
  RELEASE_EVIDENCE_ROLE.DURABILITY,
  RELEASE_EVIDENCE_ROLE.GATE_ADMISSION,
  RELEASE_EVIDENCE_ROLE.REPOSITORY,
]);
const DELEGATION_KEYS = Object.freeze([
  "issuedAt",
  "notAfter",
  "notBefore",
  "operational",
  "releaseId",
  "rootKeyId",
  "schema",
  "serial",
]);
const OPERATIONAL_KEYS = Object.freeze([
  "ed25519Sha256",
  "keyId",
  "mlDsa65Sha256",
  "roles",
]);
const SIGNATURE_KEYS = Object.freeze([
  "algorithm",
  "canon",
  "context",
  "ed25519Signature",
  "keyId",
  "mlDsa65Signature",
]);
const ENVELOPE_KEYS = Object.freeze(["schema", "signature", "statement"]);
const VERIFIED_DELEGATIONS = new WeakSet();

function refuse(code) {
  throw new Error(code);
}

function exactObject(value, keys, code) {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || types.isProxy(value)
    || Object.getPrototypeOf(value) !== Object.prototype
  ) {
    refuse(code);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  if (
    actual.some((key) => typeof key !== "string")
    || actual.length !== keys.length
    || actual.map(String).sort().some((key, index) => key !== keys[index])
  ) {
    refuse(code);
  }
  for (const descriptor of Object.values(descriptors)) {
    if (
      descriptor.enumerable !== true
      || !("value" in descriptor)
      || descriptor.get !== undefined
      || descriptor.set !== undefined
    ) {
      refuse(code);
    }
  }
  return value;
}

function canonicalValue(value, state, depth) {
  state.nodes += 1;
  if (state.nodes > MAX_NODES || depth > MAX_DEPTH) {
    refuse("RELEASE_EVIDENCE_CANONICAL_LIMIT");
  }
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      refuse("RELEASE_EVIDENCE_CANONICAL_NUMBER");
    }
    return value;
  }
  if (typeof value === "string") {
    if (
      value !== value.normalize("NFC")
      || Buffer.byteLength(value, "utf8") > MAX_STRING_BYTES
      || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)
    ) {
      refuse("RELEASE_EVIDENCE_CANONICAL_STRING");
    }
    return value;
  }
  if (typeof value !== "object" || types.isProxy(value)) {
    refuse("RELEASE_EVIDENCE_CANONICAL_TYPE");
  }
  if (Array.isArray(value)) {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (
      keys.some((key) => typeof key !== "string")
      || keys.length !== value.length + 1
      || descriptors.length?.value !== value.length
      || Object.getPrototypeOf(value) !== Array.prototype
    ) {
      refuse("RELEASE_EVIDENCE_CANONICAL_ARRAY");
    }
    const result = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        descriptor === undefined
        || descriptor.enumerable !== true
        || !("value" in descriptor)
        || descriptor.get !== undefined
        || descriptor.set !== undefined
      ) {
        refuse("RELEASE_EVIDENCE_CANONICAL_ARRAY");
      }
      result.push(canonicalValue(descriptor.value, state, depth + 1));
    }
    return result;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    refuse("RELEASE_EVIDENCE_CANONICAL_OBJECT");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key !== "string")) {
    refuse("RELEASE_EVIDENCE_CANONICAL_OBJECT");
  }
  const result = {};
  for (const key of keys.map(String).sort()) {
    if (
      key !== key.normalize("NFC")
      || !Object.hasOwn(descriptors, key)
      || descriptors[key].enumerable !== true
      || !("value" in descriptors[key])
      || descriptors[key].get !== undefined
      || descriptors[key].set !== undefined
    ) {
      refuse("RELEASE_EVIDENCE_CANONICAL_OBJECT");
    }
    result[key] = canonicalValue(descriptors[key].value, state, depth + 1);
  }
  return result;
}

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const entry of Object.values(value)) deepFreeze(entry);
    Object.freeze(value);
  }
  return value;
}

function exactRoles(value) {
  if (
    !Array.isArray(value)
    || types.isProxy(value)
    || Object.getPrototypeOf(value) !== Array.prototype
    || value.length === 0
    || value.length > KNOWN_ROLES.length
  ) {
    refuse("RELEASE_EVIDENCE_DELEGATION_MALFORMED");
  }
  const canonical = canonicalValue(value, { nodes: 0 }, 0);
  // Non-empty, KNOWN, unique, and in canonical order — sorted-unique-subset,
  // so a signed delegation has exactly one byte representation of any role
  // set, and an unknown or shuffled list refuses rather than normalising.
  if (canonical.some((role, index) =>
    !KNOWN_ROLES.includes(role) || (index > 0 && String(canonical[index - 1]) >= String(role)))) {
    refuse("RELEASE_EVIDENCE_DELEGATION_MALFORMED");
  }
  return canonical;
}

function revoked(isRevoked, keyId, code) {
  const state = isRevoked(keyId);
  if (state !== true && state !== false) refuse(code);
  return state;
}

export function canonicalReleaseEvidenceBytes(value) {
  const canonical = canonicalValue(value, { nodes: 0 }, 0);
  const bytes = Buffer.from(JSON.stringify(canonical), "utf8");
  if (bytes.length === 0 || bytes.length > MAX_CANONICAL_BYTES) {
    refuse("RELEASE_EVIDENCE_CANONICAL_LIMIT");
  }
  return bytes;
}

function canonicalInstant(value, code) {
  if (typeof value !== "string") refuse(code);
  const instant = Date.parse(value);
  if (!Number.isFinite(instant) || new Date(instant).toISOString() !== value) {
    refuse(code);
  }
  return instant;
}

function hybridV1PublicBundleFacts(bundle, code) {
  if (
    bundle === null
    || typeof bundle !== "object"
    || !KEY_ID.test(bundle.keyId ?? "")
    || typeof bundle.ed25519PublicKeyPem !== "string"
    || !(bundle.mlDsa65PublicKey instanceof Uint8Array)
    || bundle.mlDsa65PublicKey.length !== mlDsa65.lengths.publicKey
  ) {
    refuse(code);
  }
  let ed25519PublicKey;
  let edDer;
  try {
    ed25519PublicKey = createPublicKey(bundle.ed25519PublicKeyPem);
    if (ed25519PublicKey.asymmetricKeyType !== "ed25519") refuse(code);
    edDer = ed25519PublicKey.export({ type: "spki", format: "der" });
  } catch {
    refuse(code);
  }
  return Object.freeze({
    keyId: bundle.keyId,
    ed25519PublicKey,
    mlDsa65PublicKey: Uint8Array.from(bundle.mlDsa65PublicKey),
    ed25519Sha256: createHash("sha256").update(edDer).digest("hex"),
    mlDsa65Sha256: createHash("sha256")
      .update(bundle.mlDsa65PublicKey)
      .digest("hex"),
  });
}

function decodeSignature(value, expectedLength, code) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length % 4 !== 0
    || !/^[A-Za-z0-9+/]+={0,2}$/u.test(value)
  ) {
    refuse(code);
  }
  const bytes = Buffer.from(value, "base64");
  if (
    bytes.length !== expectedLength
    || bytes.toString("base64") !== value
  ) {
    refuse(code);
  }
  return bytes;
}

function verifyHybridV1(message, signature, facts, context, code) {
  exactObject(signature, SIGNATURE_KEYS, code);
  if (
    signature.algorithm !== ALGORITHM
    || signature.canon !== CANON
    || signature.context !== context
    || signature.keyId !== facts.keyId
  ) {
    refuse(code);
  }
  const edSignature = decodeSignature(signature.ed25519Signature, 64, code);
  const mlSignature = decodeSignature(
    signature.mlDsa65Signature,
    mlDsa65.lengths.signature,
    code,
  );
  let edValid = false;
  let mlValid = false;
  try {
    edValid = verifyEd25519(
      null,
      Buffer.from(message),
      facts.ed25519PublicKey,
      edSignature,
    ) === true;
    mlValid = mlDsa65.verify(
      mlSignature,
      message,
      facts.mlDsa65PublicKey,
      { context: new TextEncoder().encode(context) },
    ) === true;
  } catch {
    refuse(code);
  }
  if (!edValid || !mlValid) refuse(code);
}

const CRYPTO_SUITE_HANDLERS = new Map([[
  ALGORITHM,
  Object.freeze({
    suiteId: ALGORITHM,
    status: "active-for-signing",
    delegationSchema: "galerina.release-evidence.delegation.v1",
    envelopeSchema: "galerina.release-evidence.envelope.v1",
    publicBundleFacts: hybridV1PublicBundleFacts,
    verifySignature: verifyHybridV1,
  }),
]]);

function cryptoSuiteForSignature(signature, code) {
  if (
    signature === null
    || typeof signature !== "object"
    || Array.isArray(signature)
    || types.isProxy(signature)
    || Object.getPrototypeOf(signature) !== Object.prototype
  ) refuse(code);
  const descriptor = Object.getOwnPropertyDescriptor(signature, "algorithm");
  if (
    descriptor === undefined
    || descriptor.enumerable !== true
    || !("value" in descriptor)
    || descriptor.get !== undefined
    || descriptor.set !== undefined
    || typeof descriptor.value !== "string"
  ) refuse(code);
  const suite = CRYPTO_SUITE_HANDLERS.get(descriptor.value);
  if (suite === undefined || !VERIFIABLE_SUITE_STATUSES.has(suite.status)) {
    refuse(code);
  }
  return suite;
}

export function releaseEvidenceCryptoSuiteCatalog() {
  return Object.freeze([...CRYPTO_SUITE_HANDLERS.values()].map((suite) =>
    Object.freeze({
      suiteId: suite.suiteId,
      status: suite.status,
      delegationSchema: suite.delegationSchema,
      envelopeSchema: suite.envelopeSchema,
    })));
}

function validateDelegationBase(value) {
  exactObject(value, DELEGATION_KEYS, "RELEASE_EVIDENCE_DELEGATION_MALFORMED");
  const operational = exactObject(
    value.operational,
    OPERATIONAL_KEYS,
    "RELEASE_EVIDENCE_DELEGATION_MALFORMED",
  );
  if (
    value.schema !== "galerina.release-evidence.delegation.v1"
    || value.releaseId !== "beta-v1"
    || !Number.isSafeInteger(value.serial)
    || value.serial < 1
    || !KEY_ID.test(value.rootKeyId)
    || !KEY_ID.test(operational.keyId)
    || !SHA256.test(operational.ed25519Sha256)
    || !SHA256.test(operational.mlDsa65Sha256)
  ) {
    refuse("RELEASE_EVIDENCE_DELEGATION_MALFORMED");
  }
  exactRoles(operational.roles);
  const issuedAt = canonicalInstant(
    value.issuedAt,
    "RELEASE_EVIDENCE_DELEGATION_MALFORMED",
  );
  const notBefore = canonicalInstant(
    value.notBefore,
    "RELEASE_EVIDENCE_DELEGATION_MALFORMED",
  );
  const notAfter = canonicalInstant(
    value.notAfter,
    "RELEASE_EVIDENCE_DELEGATION_MALFORMED",
  );
  if (issuedAt > notBefore || notBefore >= notAfter) {
    refuse("RELEASE_EVIDENCE_DELEGATION_MALFORMED");
  }
  return { operational, notBefore, notAfter };
}

export function releaseEvidenceDelegationPreimage(delegationBase) {
  validateDelegationBase(delegationBase);
  return Buffer.concat([
    Buffer.from(DELEGATION_CONTEXT, "utf8"),
    Buffer.from([0]),
    canonicalReleaseEvidenceBytes(delegationBase),
  ]);
}

export function releaseEvidenceStatementPreimage(statement, role) {
  const context = ROLE_CONTEXT[role];
  if (context === undefined) refuse("RELEASE_EVIDENCE_ROLE_REFUSED");
  return Buffer.concat([
    Buffer.from(context, "utf8"),
    Buffer.from([0]),
    canonicalReleaseEvidenceBytes(statement),
  ]);
}

export function verifyReleaseEvidenceDelegation(delegation, options) {
  const complete = exactObject(
    delegation,
    [...DELEGATION_KEYS, "signature"].sort(),
    "RELEASE_EVIDENCE_DELEGATION_MALFORMED",
  );
  const { signature, ...base } = complete;
  const facts = validateDelegationBase(base);
  if (
    options === null
    || typeof options !== "object"
    || options.releaseId !== base.releaseId
    || options.expectedRootKeyId !== base.rootKeyId
    || !Number.isSafeInteger(options.minimumSerial)
    || base.serial < options.minimumSerial
    || typeof options.isRevoked !== "function"
  ) {
    refuse("RELEASE_EVIDENCE_DELEGATION_POLICY_REFUSED");
  }
  const at = canonicalInstant(
    options.at,
    "RELEASE_EVIDENCE_DELEGATION_POLICY_REFUSED",
  );
  if (at < facts.notBefore || at >= facts.notAfter) {
    refuse("RELEASE_EVIDENCE_DELEGATION_INACTIVE");
  }
  if (
    revoked(
      options.isRevoked,
      base.rootKeyId,
      "RELEASE_EVIDENCE_DELEGATION_POLICY_REFUSED",
    )
    || revoked(
      options.isRevoked,
      facts.operational.keyId,
      "RELEASE_EVIDENCE_DELEGATION_POLICY_REFUSED",
    )
  ) {
    refuse("RELEASE_EVIDENCE_DELEGATION_REVOKED");
  }
  const suite = cryptoSuiteForSignature(
    signature,
    "RELEASE_EVIDENCE_DELEGATION_SIGNATURE_REFUSED",
  );
  if (base.schema !== suite.delegationSchema) {
    refuse("RELEASE_EVIDENCE_DELEGATION_SIGNATURE_REFUSED");
  }
  const root = suite.publicBundleFacts(
    options.rootPublicBundle,
    "RELEASE_EVIDENCE_ROOT_KEY_REFUSED",
  );
  const operational = suite.publicBundleFacts(
    options.operationalPublicBundle,
    "RELEASE_EVIDENCE_OPERATIONAL_KEY_REFUSED",
  );
  if (
    root.keyId !== base.rootKeyId
    || operational.keyId !== facts.operational.keyId
    || operational.ed25519Sha256 !== facts.operational.ed25519Sha256
    || operational.mlDsa65Sha256 !== facts.operational.mlDsa65Sha256
  ) {
    refuse("RELEASE_EVIDENCE_KEY_BINDING_REFUSED");
  }
  suite.verifySignature(
    releaseEvidenceDelegationPreimage(base),
    signature,
    root,
    DELEGATION_CONTEXT,
    "RELEASE_EVIDENCE_DELEGATION_SIGNATURE_REFUSED",
  );
  const verified = Object.freeze({
    releaseId: base.releaseId,
    serial: base.serial,
    rootKeyId: base.rootKeyId,
    operationalKeyId: facts.operational.keyId,
    roles: Object.freeze([...facts.operational.roles]),
    notBefore: base.notBefore,
    notAfter: base.notAfter,
    ed25519Sha256: operational.ed25519Sha256,
    mlDsa65Sha256: operational.mlDsa65Sha256,
    cryptoSuiteId: suite.suiteId,
  });
  VERIFIED_DELEGATIONS.add(verified);
  return verified;
}

export function verifyReleaseEvidenceEnvelope(envelope, options) {
  const complete = exactObject(
    envelope,
    ENVELOPE_KEYS,
    "RELEASE_EVIDENCE_ENVELOPE_MALFORMED",
  );
  if (
    complete.schema !== "galerina.release-evidence.envelope.v1"
    || options === null
    || typeof options !== "object"
    || !VERIFIED_DELEGATIONS.has(options.delegation)
    || !options.delegation.roles.includes(options.role)
    || typeof options.isRevoked !== "function"
  ) {
    refuse("RELEASE_EVIDENCE_ENVELOPE_POLICY_REFUSED");
  }
  const at = canonicalInstant(
    options.at,
    "RELEASE_EVIDENCE_ENVELOPE_POLICY_REFUSED",
  );
  const notBefore = canonicalInstant(
    options.delegation.notBefore,
    "RELEASE_EVIDENCE_ENVELOPE_POLICY_REFUSED",
  );
  const notAfter = canonicalInstant(
    options.delegation.notAfter,
    "RELEASE_EVIDENCE_ENVELOPE_POLICY_REFUSED",
  );
  if (at < notBefore || at >= notAfter) {
    refuse("RELEASE_EVIDENCE_ENVELOPE_INACTIVE");
  }
  if (revoked(
    options.isRevoked,
    options.delegation.operationalKeyId,
    "RELEASE_EVIDENCE_ENVELOPE_POLICY_REFUSED",
  )) {
    refuse("RELEASE_EVIDENCE_ENVELOPE_REVOKED");
  }
  const suite = cryptoSuiteForSignature(
    complete.signature,
    "RELEASE_EVIDENCE_ENVELOPE_SIGNATURE_REFUSED",
  );
  if (
    complete.schema !== suite.envelopeSchema
    || suite.suiteId !== options.delegation.cryptoSuiteId
  ) {
    refuse("RELEASE_EVIDENCE_ENVELOPE_SIGNATURE_REFUSED");
  }
  const operational = suite.publicBundleFacts(
    options.operationalPublicBundle,
    "RELEASE_EVIDENCE_OPERATIONAL_KEY_REFUSED",
  );
  if (
    operational.keyId !== options.delegation.operationalKeyId
    || operational.ed25519Sha256 !== options.delegation.ed25519Sha256
    || operational.mlDsa65Sha256 !== options.delegation.mlDsa65Sha256
  ) {
    refuse("RELEASE_EVIDENCE_KEY_BINDING_REFUSED");
  }
  const context = ROLE_CONTEXT[options.role];
  if (context === undefined) refuse("RELEASE_EVIDENCE_ROLE_REFUSED");
  suite.verifySignature(
    releaseEvidenceStatementPreimage(complete.statement, options.role),
    complete.signature,
    operational,
    context,
    "RELEASE_EVIDENCE_ENVELOPE_SIGNATURE_REFUSED",
  );
  return Object.freeze({
    statement: deepFreeze(JSON.parse(
      canonicalReleaseEvidenceBytes(complete.statement).toString("utf8"),
    )),
    role: options.role,
    keyId: operational.keyId,
    delegationSerial: options.delegation.serial,
    cryptoSuiteId: suite.suiteId,
  });
}
