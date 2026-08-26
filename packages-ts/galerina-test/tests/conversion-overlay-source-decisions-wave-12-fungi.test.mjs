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

const CANDIDATES = Object.freeze([
  ["phase1-input-binding-status.fungi", "phase1InputBindingStatusCore", "galerina-ext-proof-snarkjs/src/circuit.ts", "function computePhase1Proof", args([["sourceCaptured", bool(true)], ["contractCaptured", bool(true)], ["resultPresent", bool(true)]]), string("input_and_result_hashes")],
  ["phase1-verification-status.fungi", "phase1VerificationStatusCore", "galerina-ext-proof-snarkjs/src/circuit.ts", "function verifyPhase1Proof", args([["protocolValid", bool(true)], ["curveValid", bool(true)], ["decoded", bool(true)], ["fieldsMatch", bool(true)], ["keyHashesMatch", bool(true)]]), bool(true)],
  ["sha256-seal-backend-status.fungi", "sha256SealBackendStatusCore", "galerina-ext-proof-snarkjs/src/circuit.ts", "class Sha256SealBackend", args([["circuitBound", bool(true)], ["provePresent", bool(true)], ["verifyPresent", bool(true)]]), string("backend_ready")],
  ["sha256-seal-prove-status.fungi", "sha256SealProveStatusCore", "galerina-ext-proof-snarkjs/src/circuit.ts", "async prove(input: ProverInput)", args([["inputCaptured", bool(true)], ["computationSucceeded", bool(true)]]), string("proof_ready")],
  ["sha256-seal-verify-status.fungi", "sha256SealVerifyStatusCore", "galerina-ext-proof-snarkjs/src/circuit.ts", "async verify(proof: ZkProof", args([["proofCaptured", bool(true)], ["inputCaptured", bool(true)], ["verified", bool(true)]]), bool(true)],
  ["snarkjs-prover-class-status.fungi", "snarkjsProverClassStatusCore", "galerina-ext-proof-snarkjs/src/index.ts", "class GalerinaSnarkjsProver", args([["constructible", bool(true)], ["backendBound", bool(true)], ["circuitCopied", bool(true)]]), string("wrapper_ready")],
  ["snarkjs-prover-constructor-status.fungi", "snarkjsProverConstructorStatusCore", "galerina-ext-proof-snarkjs/src/index.ts", "constructor()", args([["backendConstructed", bool(true)], ["circuitCopied", bool(true)]]), string("constructed")],
  ["snarkjs-prover-prove-status.fungi", "snarkjsProverProveStatusCore", "galerina-ext-proof-snarkjs/src/index.ts", "return this._backend.prove(input)", args([["backendReady", bool(true)], ["inputCaptured", bool(true)]]), string("delegated_proof")],
  ["snarkjs-prover-verify-status.fungi", "snarkjsProverVerifyStatusCore", "galerina-ext-proof-snarkjs/src/index.ts", "return this._backend.verify(proof, input)", args([["backendReady", bool(true)], ["proofCaptured", bool(true)], ["inputCaptured", bool(true)]]), string("delegated_verify")],
  ["snarkjs-prover-factory-status.fungi", "snarkjsProverFactoryStatusCore", "galerina-ext-proof-snarkjs/src/index.ts", "function createSnarkjsProver", args([["constructorAvailable", bool(true)]]), string("new_backend")],
  ["wrap-key-derivation-status.fungi", "wrapKeyDerivationStatusCore", "galerina-ext-secrets-spore/src/anchor.ts", "function deriveWrapKey", args([["passphrasePresent", bool(true)], ["saltPresent", bool(true)], ["parametersPinned", bool(true)]]), string("derived_32")],
  ["recipient-secret-wrap-status.fungi", "recipientSecretWrapStatusCore", "galerina-ext-secrets-spore/src/anchor.ts", "function wrapRecipientSecret", args([["secretPresent", bool(true)], ["saltReady", bool(true)], ["ivReady", bool(true)], ["cipherFinal", bool(true)], ["tagReady", bool(true)], ["keyWiped", bool(true)]]), string("wrapped_wiped")],
  ["recipient-secret-unwrap-status.fungi", "recipientSecretUnwrapStatusCore", "galerina-ext-secrets-spore/src/anchor.ts", "function unwrapRecipientSecret", args([["ciphertextLongEnough", bool(true)], ["tagReady", bool(true)], ["decryptFinal", bool(true)], ["callbackContained", bool(true)], ["intermediatesWiped", bool(true)]]), string("unwrapped_wiped")],
  ["prod-anchor-admission-status.fungi", "prodAnchorAdmissionStatusCore", "galerina-ext-secrets-spore/src/anchor.ts", "function anchorProdSecret", args([["sourceAdmitted", bool(true)], ["fetchSucceeded", bool(true)], ["callbackSucceeded", bool(true)], ["bufferWiped", bool(true)]]), string("anchor_wiped")],
  ["seal-arena-put-status.fungi", "sealArenaPutStatusCore", "galerina-ext-secrets-spore/src/arena.ts", "put(name: string", args([["arenaLive", bool(true)], ["replacing", bool(true)], ["stagingPresent", bool(true)], ["copied", bool(true)], ["locked", bool(true)]]), string("replaced_and_wiped")],
  ["seal-arena-use-status.fungi", "sealArenaUseStatusCore", "galerina-ext-secrets-spore/src/arena.ts", "use(name: string", args([["arenaLive", bool(true)], ["entryPresent", bool(true)], ["notFaulted", bool(true)], ["callbackContained", bool(true)], ["transientWiped", bool(true)]]), string("served_wiped")],
  ["seal-arena-has-status.fungi", "sealArenaHasStatusCore", "galerina-ext-secrets-spore/src/arena.ts", "has(name: string)", args([["entryPresent", bool(true)], ["faulted", bool(false)]]), bool(true)],
  ["seal-arena-names-status.fungi", "sealArenaNamesStatusCore", "galerina-ext-secrets-spore/src/arena.ts", "names(): string[]", args([["entriesPresent", bool(true)], ["keysCaptured", bool(true)]]), string("names_snapshot")],
  ["seal-arena-rotate-status.fungi", "sealArenaRotateStatusCore", "galerina-ext-secrets-spore/src/arena.ts", "rotateValue(name: string", args([["arenaLive", bool(true)], ["entryExists", bool(true)], ["staged", bool(true)], ["swapped", bool(true)], ["oldWiped", bool(true)]]), string("rotated_wiped")],
  ["seal-arena-fault-status.fungi", "sealArenaFaultStatusCore", "galerina-ext-secrets-spore/src/arena.ts", "fault(name: string)", args([["entryExists", bool(true)], ["stagingPresent", bool(true)], ["valueWiped", bool(true)]]), string("faulted_wiped")],
  ["seal-arena-remove-status.fungi", "sealArenaRemoveStatusCore", "galerina-ext-secrets-spore/src/arena.ts", "remove(name: string)", args([["entryExists", bool(true)], ["stagingPresent", bool(true)], ["deleted", bool(true)]]), string("removed_wiped")],
  ["seal-arena-dispose-status.fungi", "sealArenaDisposeStatusCore", "galerina-ext-secrets-spore/src/arena.ts", "dispose(): void", args([["entriesPresent", bool(true)], ["allWiped", bool(true)], ["cleared", bool(true)]]), string("disposed")],
  ["transient-wipe-status.fungi", "transientWipeStatusCore", "galerina-ext-secrets-spore/src/arena.ts", "function withWiped", args([["copied", bool(true)], ["callbackCompleted", bool(true)], ["wiped", bool(true)]]), string("callback_then_wipe")],
  ["stdin-secret-read-status.fungi", "stdinSecretReadStatusCore", "galerina-ext-secrets-spore/src/io.ts", "function readStdinBytes", args([["eofReached", bool(true)], ["trailingLf", bool(true)], ["trailingCr", bool(true)], ["sourceWiped", bool(true)]]), string("crlf_stripped_wiped")],
  ["noecho-prompt-status.fungi", "noechoPromptStatusCore", "galerina-ext-secrets-spore/src/io.ts", "function promptNoEcho", args([["tty", bool(true)], ["rawEnabled", bool(true)], ["lineEnded", bool(true)], ["restored", bool(true)], ["arrayWiped", bool(true)]]), string("captured_noecho_wiped")],
  ["ciphertext-atomic-write-status.fungi", "ciphertextAtomicWriteStatusCore", "galerina-ext-secrets-spore/src/io.ts", "function atomicWriteCiphertext", args([["sameDirectory", bool(true)], ["wrote", bool(true)], ["fsynced", bool(true)], ["renamed", bool(true)]]), string("durable_replace")],
  ["mlock-hook-status.fungi", "mlockHookStatusCore", "galerina-ext-secrets-spore/src/mlock.ts", "function setMlockHook", args([["hookProvided", bool(true)]]), string("hook_installed")],
  ["mlock-attempt-status.fungi", "mlockAttemptStatusCore", "galerina-ext-secrets-spore/src/mlock.ts", "function tryMlock", args([["hookPresent", bool(true)], ["returnedTrue", bool(true)], ["threw", bool(false)]]), string("locked")],
  ["spore-load-all-status.fungi", "sporeLoadAllStatusCore", "galerina-ext-secrets-spore/src/runtime.ts", "function loadAll", args([["composeAllowed", bool(true)], ["sectionsComplete", bool(true)], ["profilesValid", bool(true)], ["decrypted", bool(true)], ["allStored", bool(true)]]), string("arena_ready")],
  ["spore-coordinate-status.fungi", "sporeCoordinateStatusCore", "galerina-ext-secrets-spore/src/schema.ts", "function coordForName", args([["nameCaptured", bool(true)], ["domainApplied", bool(true)], ["output16", bool(true)]]), string("opaque_coord_16")],
  ["spore-empty-manifest-status.fungi", "sporeEmptyManifestStatusCore", "galerina-ext-secrets-spore/src/schema.ts", "function emptyManifest", args([["recipientCaptured", bool(true)], ["hexEncoded", bool(true)], ["entriesEmpty", bool(true)]]), string("empty_manifest")],
  ["spore-pack-seal-status.fungi", "sporePackSealStatusCore", "galerina-ext-secrets-spore/src/schema.ts", "function packSeal", args([["magicReady", bool(true)], ["profileBound", bool(true)], ["nonceBound", bool(true)], ["bodyBound", bool(true)], ["lengthsBound", bool(true)]]), string("packed_seal")],
  ["spore-unpack-seal-status.fungi", "sporeUnpackSealStatusCore", "galerina-ext-secrets-spore/src/schema.ts", "function unpackSeal", args([["magicValid", bool(true)], ["minimumLength", bool(true)], ["sectionsBound", bool(true)], ["noTrailingBytes", bool(true)]]), string("unpacked_exact")],
  ["spore-context-binding-status.fungi", "sporeContextBindingStatusCore", "galerina-ext-secrets-spore/src/schema.ts", "function contextFor", args([["idBound", bool(true)], ["coordBound", bool(true)], ["profileBound", bool(true)], ["epochBound", bool(true)]]), string("context_bound")],
  ["spore-secret-section-status.fungi", "sporeSecretSectionStatusCore", "galerina-ext-secrets-spore/src/schema.ts", "function secretSection", args([["coordReady", bool(true)], ["payloadReady", bool(true)]]), string("secret_section")],
  ["spore-manifest-section-status.fungi", "sporeManifestSectionStatusCore", "galerina-ext-secrets-spore/src/schema.ts", "function manifestSection", args([["sentinelReady", bool(true)], ["payloadReady", bool(true)]]), string("manifest_section")],
  ["spore-u16le-status.fungi", "sporeU16leStatusCore", "galerina-ext-secrets-spore/src/schema.ts", "function u16le", args([["numberCaptured", bool(true)], ["masked16", bool(true)], ["littleEndian", bool(true)]]), string("u16le")],
  ["spore-u32le-status.fungi", "sporeU32leStatusCore", "galerina-ext-secrets-spore/src/schema.ts", "function u32le", args([["numberCaptured", bool(true)], ["wrapped32", bool(true)], ["littleEndian", bool(true)]]), string("u32le")],
  ["spore-read-u16-status.fungi", "sporeReadU16StatusCore", "galerina-ext-secrets-spore/src/schema.ts", "function rdU16", args([["viewValid", bool(true)], ["offsetValid", bool(true)], ["littleEndian", bool(true)]]), string("read_u16le")],
  ["spore-read-u32-status.fungi", "sporeReadU32StatusCore", "galerina-ext-secrets-spore/src/schema.ts", "function rdU32", args([["viewValid", bool(true)], ["offsetValid", bool(true)], ["littleEndian", bool(true)]]), string("read_u32le")],
].map(([file, flow, source, symbol, input, expected]) => Object.freeze({ file, flow, source, symbol, input, expected })));

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

describe("40-file source-bound Fungi decision-core overlay wave 12", () => {
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
