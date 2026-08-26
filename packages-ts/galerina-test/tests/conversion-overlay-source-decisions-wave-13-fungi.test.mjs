import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const PACKAGE_ROOT = join(ROOT, "packages-ts", "galerina-test");
const OVERLAY_ROOT = join(PACKAGE_ROOT, "src", "self-hosted", "conversion-overlays");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const bool = (value) => ({ __tag: "bool", value });
const string = (value) => ({ __tag: "string", value });
const args = (entries) => new Map(entries);
const SHADOW_RESERVED_IDENTIFIERS = new Set([
  "version", "pure", "secure", "flow", "FLOW", "contract", "intent", "record",
  "return", "if", "match", "check", "deny", "ambig", "mut", "let",
  "Bool", "Int", "String", "Verdict", "Result", "Option", "Array",
  "true", "false", "Ok", "Err", "Some", "None", "Allow", "Deny", "Unknown",
]);

const S = "galerina-ext-secrets-spore/src/store.ts";
const R = "galerina-ext-secrets-vault/src/rotation-manager.ts";
const V = "galerina-ext-secrets-vault/src/vault-client.ts";
const CANDIDATES = Object.freeze([
  ["spore-crypto-lib-admission-status.fungi", "sporeCryptoLibAdmissionStatusCore", S, "function assertCryptoLib", [["sealReady", true], ["openReady", true]], "crypto_ready"],
  ["spore-verdict-allow-status.fungi", "sporeVerdictAllowStatusCore", S, "function assertAllow", [["allow", true]], "allowed"],
  ["spore-now-epoch-status.fungi", "sporeNowEpochStatusCore", S, "function nowEpoch", [["finiteClock", true], ["floored", true]], "epoch_ready"],
  ["spore-manifest-bytes-status.fungi", "sporeManifestBytesStatusCore", S, "function manifestBytes", [["manifestCaptured", true], ["jsonReady", true], ["utf8Ready", true]], "manifest_bytes"],
  ["spore-nonnegative-integer-status.fungi", "sporeNonnegativeIntegerStatusCore", S, "function isNonNegInt", [["numberValue", true], ["integerValue", true], ["nonnegative", true]], "nonnegative_integer"],
  ["spore-malformed-manifest-status.fungi", "sporeMalformedManifestStatusCore", S, "function malformedManifest", [["reasonCaptured", true], ["typedError", true]], "manifest_refused"],
  ["spore-secret-meta-validation-status.fungi", "sporeSecretMetaValidationStatusCore", S, "function validateSecretMeta", [["recordExact", true], ["coordinateValid", true], ["timesValid", true], ["profileValid", true]], "secret_meta_valid"],
  ["spore-manifest-validation-status.fungi", "sporeManifestValidationStatusCore", S, "function validateManifest", [["schemaValid", true], ["recipientValid", true], ["entriesValid", true], ["forbiddenKeysAbsent", true]], "manifest_valid"],
  ["spore-manifest-parse-status.fungi", "sporeManifestParseStatusCore", S, "function parseManifest", [["bytesCaptured", true], ["utf8Decoded", true], ["jsonParsed", true], ["validationReady", true]], "manifest_parsed"],
  ["spore-section-seal-status.fungi", "sporeSectionSealStatusCore", S, "function sealSection", [["contextBound", true], ["sealSucceeded", true], ["profileMatched", true], ["packed", true]], "section_sealed"],
  ["spore-section-open-status.fungi", "sporeSectionOpenStatusCore", S, "function openSection", [["packedCaptured", true], ["contextBound", true], ["profileMatched", true], ["opened", true]], "section_opened"],
  ["spore-kem-profile-status.fungi", "sporeKemProfileStatusCore", S, "function assertKemProfile", [["profileMatched", true], ["contextMatched", true]], "kem_profile_bound"],
  ["spore-environment-init-status.fungi", "sporeEnvironmentInitStatusCore", S, "function initEnvSpore", [["cryptoReady", true], ["manifestEmpty", true], ["manifestSealed", true], ["written", true]], "environment_initialized"],
  ["spore-compose-read-status.fungi", "sporeComposeReadStatusCore", S, "function composeRead", [["readAllowed", true], ["cryptoReady", true], ["manifestFound", true], ["manifestOpened", true], ["manifestWiped", true]], "compose_ready"],
  ["spore-open-value-status.fungi", "sporeOpenValueStatusCore", S, "function openValue", [["compositionReady", true], ["entryFound", true], ["sectionFound", true], ["opened", true], ["callbackCompleted", true], ["wiped", true]], "value_used_wiped"],
  ["spore-file-read-status.fungi", "sporeFileReadStatusCore", S, "function readFile", [["pathCaptured", true], ["bytesRead", true]], "file_bytes"],
  ["spore-reseal-status.fungi", "sporeResealStatusCore", S, "function reseal", [["manifestSealed", true], ["valuesPresent", true], ["allValuesSealed", true], ["sectionsReturned", true]], "resealed"],
  ["spore-arena-edit-status.fungi", "sporeArenaEditStatusCore", S, "function editInArena", [["compositionReady", true], ["valuesOpened", true], ["arenaLoaded", true], ["mutationApplied", true], ["resealed", true], ["wiped", true]], "edited_wiped"],
  ["spore-set-secret-status.fungi", "sporeSetSecretStatusCore", S, "export function setSecret", [["nameCaptured", true], ["coordinateDerived", true], ["metadataBound", true], ["valueStored", true]], "secret_set"],
  ["spore-remove-secret-status.fungi", "sporeRemoveSecretStatusCore", S, "export function rmSecret", [["secretPresent", true], ["valueWiped", true], ["metadataDeleted", true]], "secret_removed"],
  ["spore-recipient-rotation-status.fungi", "sporeRecipientRotationStatusCore", S, "export function rotateRecipient", [["compositionReady", true], ["allValuesOpened", true], ["recipientChanged", true], ["resealed", true], ["wiped", true]], "recipient_rotated"],
  ["spore-secret-list-status.fungi", "sporeSecretListStatusCore", S, "export function listSecrets", [["compositionReady", true], ["namesCaptured", true], ["metadataCopied", true]], "secret_list"],
  ["vault-credential-load-status.fungi", "vaultCredentialLoadStatusCore", R, "async load(", [["secretFetched", true], ["oldFound", true], ["oldWiped", true], ["handleStored", true]], "credential_loaded"],
  ["vault-rotation-lease-status.fungi", "vaultRotationLeaseStatusCore", R, "async rotate(", [["leaseFree", true], ["operationStarted", true], ["operationCompleted", true], ["leaseCleared", true]], "rotation_completed"],
  ["vault-rotation-commit-status.fungi", "vaultRotationCommitStatusCore", R, "private async rotateOnce(", [["handleFound", true], ["candidateFetched", true], ["quiesced", true], ["identityStable", true], ["swapped", true], ["oldWiped", true]], "rotation_committed"],
  ["vault-active-use-status.fungi", "vaultActiveUseStatusCore", R, "useActive(", [["handlePresent", true], ["notFaulted", true], ["copied", true], ["callbackSync", true], ["copyWiped", true]], "active_used_wiped"],
  ["vault-handle-status.fungi", "vaultHandleStatusCore", R, "getHandle(", [["handlePresent", true], ["statusRedacted", true], ["frozen", true]], "handle_status"],
  ["vault-list-ids-status.fungi", "vaultListIdsStatusCore", R, "listIds():", [["handlesCaptured", true], ["keysCopied", true]], "ids_listed"],
  ["vault-eviction-status.fungi", "vaultEvictionStatusCore", R, "private evict(", [["handlePresent", true], ["activeWiped", true], ["stagingWiped", true], ["deleted", true]], "credential_evicted"],
  ["vault-rotation-fault-status.fungi", "vaultRotationFaultStatusCore", R, "async rotateOrFault(", [["rotationSucceeded", false], ["policyHandled", true], ["secretSafe", true]], "fault_handled"],
  ["vault-sweep-start-status.fungi", "vaultSweepStartStatusCore", R, "startRotationSweep(", [["credentialsCaptured", true], ["intervalValid", true], ["timerStarted", true]], "sweep_started"],
  ["vault-sweep-stop-status.fungi", "vaultSweepStopStatusCore", R, "stopRotationSweep(", [["timerPresent", true], ["timerCleared", true]], "sweep_stopped"],
  ["vault-dispose-status.fungi", "vaultDisposeStatusCore", R, "dispose():", [["handlesPresent", true], ["activeWiped", true], ["stagingWiped", true], ["mapCleared", true]], "vault_disposed"],
  ["vault-http-request-status.fungi", "vaultHttpRequestStatusCore", V, "function makeRequest", [["urlParsed", true], ["transportSelected", true], ["limitsBound", true], ["responseComplete", true]], "request_complete"],
  ["vault-segment-encoding-status.fungi", "vaultSegmentEncodingStatusCore", V, "function encodeVaultSegment", [["segmentNontraversal", true], ["grammarValid", true], ["encoded", true]], "segment_encoded"],
  ["vault-mount-encoding-status.fungi", "vaultMountEncodingStatusCore", V, "function encodeVaultMount", [["singleSegment", true], ["segmentValid", true]], "mount_encoded"],
  ["vault-path-encoding-status.fungi", "vaultPathEncodingStatusCore", V, "function encodeVaultPath", [["prefixStripped", true], ["pathNonempty", true], ["segmentsValid", true], ["joined", true]], "path_encoded"],
  ["vault-client-constructor-status.fungi", "vaultClientConstructorStatusCore", V, "constructor(address:", [["urlValid", true], ["transportAllowed", true], ["tokenPresent", true], ["limitsValid", true]], "client_constructed"],
  ["vault-read-secret-status.fungi", "vaultReadSecretStatusCore", V, "async readSecret(", [["pathEncoded", true], ["mountEncoded", true], ["requestSucceeded", true], ["dataPresent", true], ["serialized", true]], "secret_read"],
  ["vault-list-secrets-status.fungi", "vaultListSecretsStatusCore", V, "async listSecrets(", [["mountEncoded", true], ["requestSucceeded", true], ["keysPresent", true]], "vault_keys"],
].map(([file, flow, source, symbol, input, expected]) => Object.freeze({
  file, flow, source, symbol,
  input: args(input.map(([name, value]) => [name, bool(value)])),
  expected: string(expected),
})));

function shadowFingerprint(source) {
  const identifiers = new Map();
  return createHash("sha256").update(source
    .replace(/^\uFEFF/u, "")
    .replace(/\/\*[\s\S]*?\*\//gu, " ")
    .replace(/^\s*\/\/.*$/gmu, " ")
    .replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu, (match) => match.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u, "FLOW"))
    .replace(/"(?:\\.|[^"\\])*"/gu, '"STRING"')
    .replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu, "NUMBER")
    .replace(/\s+/gu, " ").trim()
    .replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu, (identifier) => {
      if (SHADOW_RESERVED_IDENTIFIERS.has(identifier)) return identifier;
      let replacement = identifiers.get(identifier);
      if (replacement === undefined) {
        replacement = "ID" + identifiers.size;
        identifiers.set(identifier, replacement);
      }
      return replacement;
    }), "utf8").digest("hex");
}

describe("40-file source-bound Fungi decision-core overlay wave 13", () => {
  it("binds 40 distinct live source behaviours and package assets", () => {
    assert.equal(CANDIDATES.length, 40);
    const loadedAssets = JSON.parse(readFileSync(PACKAGE, "utf8")).packageGraph?.loadedAssets ?? [];
    const sourceScopes = new Set();
    for (const candidate of CANDIDATES) {
      assert.ok(loadedAssets.includes(`src/self-hosted/conversion-overlays/${candidate.file}`), `${candidate.file} must be a loaded asset`);
      const reference = readFileSync(join(ROOT, "packages-ts", candidate.source), "utf8");
      assert.ok(reference.includes(candidate.symbol), `${candidate.source} must contain ${candidate.symbol}`);
      assert.equal(sourceScopes.has(`${candidate.source}#${candidate.symbol}`), false, `${candidate.symbol} must be a distinct source scope`);
      sourceScopes.add(`${candidate.source}#${candidate.symbol}`);
    }
  });

  it("has no exact duplicate or normalized whole-corpus template shadow", () => {
    const seen = new Map();
    const candidateFiles = new Set(CANDIDATES.map((candidate) => candidate.file));
    for (const file of readdirSync(OVERLAY_ROOT).filter((file) => file.endsWith(".fungi") && !candidateFiles.has(file))) {
      const source = readFileSync(join(OVERLAY_ROOT, file), "utf8");
      seen.set(createHash("sha256").update(source, "utf8").digest("hex"), file);
      seen.set(shadowFingerprint(source), file);
    }
    const collisions = [];
    for (const candidate of CANDIDATES) {
      const path = join(OVERLAY_ROOT, candidate.file);
      assert.ok(existsSync(path), `${candidate.file} must exist`);
      const source = readFileSync(path, "utf8");
      for (const [kind, fingerprint] of [
        ["exact duplicate", createHash("sha256").update(source, "utf8").digest("hex")],
        ["template shadow", shadowFingerprint(source)],
      ]) {
        if (seen.has(fingerprint)) collisions.push(`${candidate.file} ${kind} of ${seen.get(fingerprint)}`);
        seen.set(fingerprint, candidate.file);
      }
    }
    assert.deepEqual(collisions, []);
  });

  it("parses, effect-checks, emits GIR and executes every decision core", async () => {
    for (const candidate of CANDIDATES) {
      const source = readFileSync(join(OVERLAY_ROOT, candidate.file), "utf8").replace(/^\uFEFF/u, "");
      const program = parseProgram(source, candidate.file);
      assert.deepEqual((program.diagnostics ?? []).filter((d) => d.severity === "error"), [], candidate.file);
      const effects = checkEffects(program.flows, program.ast);
      assert.deepEqual(effects.flatMap((r) => r.diagnostics).filter((d) => d.severity === "error"), [], candidate.file);
      const { gir } = emitGIR(program.ast, program.flows, effects);
      assert.equal(gir.flows.length, 1, candidate.file);
      const execution = await executeFlow(candidate.flow, candidate.input, program.ast, program.flows);
      assert.deepEqual(execution.value, candidate.expected, candidate.file);
    }
  });
});
