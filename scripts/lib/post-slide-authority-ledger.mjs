import { createHash } from "node:crypto";
import { types } from "node:util";

import {
  RELEASE_EVIDENCE_ROLE,
  verifyReleaseEvidenceEnvelope,
} from "./beta-release-evidence-envelope.mjs";
import {
  POST_SLIDE_FUNGI_INPUT_FIELDS,
  POST_SLIDE_HOST_INPUT_FIELDS,
  validateFungiExecutionStatement,
  validateHostOwnershipStatement,
} from "./post-slide-authority-receipts.mjs";

const MAX_ARTIFACT_BYTES = 16 * 1024 * 1024;
const RECEIPT_ROOT = "docs/security/post-slide-authority-receipts/";
const SHA256 = /^[0-9a-f]{64}$/u;
const ENTRY_EXTRA_FIELDS = Object.freeze([
  "envelopePath",
  "envelopeSha256",
  "evidencePath",
  "state",
]);

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
  ) refuse(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  const expected = [...keys].sort();
  if (
    actual.some((key) => typeof key !== "string")
    || actual.length !== expected.length
    || actual.map(String).sort().some((key, index) => key !== expected[index])
    || Object.values(descriptors).some((descriptor) => (
      descriptor.enumerable !== true
      || !("value" in descriptor)
      || descriptor.get !== undefined
      || descriptor.set !== undefined
    ))
  ) refuse(code);
  return value;
}

function exactArray(value, code) {
  if (!Array.isArray(value) || types.isProxy(value)) refuse(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== value.length + 1 || descriptors.length?.value !== value.length) {
    refuse(code);
  }
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (
      descriptor === undefined
      || descriptor.enumerable !== true
      || !("value" in descriptor)
      || descriptor.get !== undefined
      || descriptor.set !== undefined
    ) refuse(code);
  }
  return value;
}

function canonicalPath(value, prefix, code) {
  if (
    typeof value !== "string"
    || !value.startsWith(prefix)
    || value.includes("\\")
    || value !== value.normalize("NFC")
    || value.split("/").some((segment) => segment.length === 0 || segment === "." || segment === "..")
  ) refuse(code);
  return value;
}

function artifact(readArtifact, path, code) {
  let value;
  try {
    value = readArtifact(path);
  } catch {
    refuse(code);
  }
  if (
    !(value instanceof Uint8Array)
    || types.isProxy(value)
    || value.byteLength < 1
    || value.byteLength > MAX_ARTIFACT_BYTES
  ) refuse(code);
  return Uint8Array.from(value);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalEnvelope(bytes, code) {
  let text;
  let value;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    value = JSON.parse(text);
  } catch {
    refuse(code);
  }
  if (`${JSON.stringify(value, null, 2)}\n` !== text) refuse(code);
  return value;
}

function sensitive(bytes, code) {
  const text = Buffer.from(bytes).toString("utf8");
  if (
    /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/u.test(text)
    || /"(?:privateKey|secret|password|token|apiKey|credential)"\s*:/iu.test(text)
  ) refuse(code);
}

function authorityOptions(authority) {
  exactObject(
    authority,
    ["isRevoked", "minimumReceiptSerial", "operationalPublicBundle", "verificationTime", "verifiedDelegation"],
    "POST_SLIDE_AUTHORITY_OPTIONS_REFUSED",
  );
  const at = Date.parse(authority.verificationTime);
  if (
    !Number.isFinite(at)
    || new Date(at).toISOString() !== authority.verificationTime
    || !Number.isSafeInteger(authority.minimumReceiptSerial)
    || authority.minimumReceiptSerial < 1
    || typeof authority.isRevoked !== "function"
  ) refuse("POST_SLIDE_AUTHORITY_OPTIONS_REFUSED");
  return { ...authority, at };
}

function verifyEntries(entries, inputFields, expectedState, validator, scope, state) {
  exactArray(entries, "POST_SLIDE_AUTHORITY_LEDGER_REFUSED");
  const admitted = [];
  for (const entry of entries) {
    const code = `POST_SLIDE_${scope}_ENTRY_REFUSED`;
    exactObject(entry, [...inputFields, ...ENTRY_EXTRA_FIELDS], code);
    if (
      entry.state !== expectedState
      || entry.receiptSerial < state.authority.minimumReceiptSerial
      || state.serials.has(entry.receiptSerial)
      || !SHA256.test(entry.envelopeSha256)
      || !state.trackedPaths.has(entry.sourcePath)
    ) refuse(code);
    state.serials.add(entry.receiptSerial);
    const evidencePath = canonicalPath(entry.evidencePath, RECEIPT_ROOT, code);
    const envelopePath = canonicalPath(entry.envelopePath, RECEIPT_ROOT, code);
    if (
      evidencePath === envelopePath
      || !state.trackedPaths.has(evidencePath)
      || !state.trackedPaths.has(envelopePath)
    ) refuse(code);
    const source = artifact(state.readArtifact, entry.sourcePath, code);
    const evidence = artifact(state.readArtifact, evidencePath, code);
    const envelopeBytes = artifact(state.readArtifact, envelopePath, code);
    sensitive(evidence, code);
    sensitive(envelopeBytes, code);
    if (
      sha256(source) !== entry.sourceSha256
      || sha256(evidence) !== entry.evidenceBundleSha256
      || sha256(envelopeBytes) !== entry.envelopeSha256
      || entry.repositoryCommit !== state.repositoryCommit
    ) refuse(code);
    const issuedAt = Date.parse(entry.issuedAt);
    const expiresAt = Date.parse(entry.expiresAt);
    if (state.authority.at < issuedAt || state.authority.at >= expiresAt) refuse(code);
    const envelope = canonicalEnvelope(envelopeBytes, code);
    const verified = verifyReleaseEvidenceEnvelope(envelope, {
      role: RELEASE_EVIDENCE_ROLE.REPOSITORY,
      at: state.authority.verificationTime,
      delegation: state.authority.verifiedDelegation,
      operationalPublicBundle: state.authority.operationalPublicBundle,
      isRevoked: state.authority.isRevoked,
    });
    const expected = Object.fromEntries(inputFields.map((field) => [field, entry[field]]));
    validator(verified.statement, expected);
    admitted.push(entry.sourcePath);
  }
  return admitted;
}

export function verifyPostSlideAuthorityLedgerEntries(options) {
  exactObject(
    options,
    ["authority", "fungiSources", "hostBridges", "readArtifact", "repositoryCommit", "trackedPaths"],
    "POST_SLIDE_AUTHORITY_LEDGER_REFUSED",
  );
  if (
    typeof options.repositoryCommit !== "string"
    || !/^[0-9a-f]{40}$/u.test(options.repositoryCommit)
    || !(options.trackedPaths instanceof Set)
    || types.isProxy(options.trackedPaths)
    || typeof options.readArtifact !== "function"
  ) refuse("POST_SLIDE_AUTHORITY_LEDGER_REFUSED");
  const authority = authorityOptions(options.authority);
  const state = {
    authority,
    readArtifact: options.readArtifact,
    repositoryCommit: options.repositoryCommit,
    trackedPaths: options.trackedPaths,
    serials: new Set(),
  };
  const fungiSources = verifyEntries(
    options.fungiSources,
    POST_SLIDE_FUNGI_INPUT_FIELDS,
    "executed",
    validateFungiExecutionStatement,
    "FUNGI",
    state,
  );
  const hostBridges = verifyEntries(
    options.hostBridges,
    POST_SLIDE_HOST_INPUT_FIELDS,
    "owned",
    validateHostOwnershipStatement,
    "HOST",
    state,
  );
  return Object.freeze({
    fungiSources: Object.freeze(fungiSources),
    hostBridges: Object.freeze(hostBridges),
  });
}
