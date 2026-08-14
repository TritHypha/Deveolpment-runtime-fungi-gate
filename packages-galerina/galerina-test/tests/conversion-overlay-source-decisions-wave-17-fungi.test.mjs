import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

const ROOT=join(import.meta.dirname,"..","..","..");
const PACKAGE_ROOT=join(ROOT,"packages-galerina","galerina-test");
const OVERLAY_ROOT=join(PACKAGE_ROOT,"src","self-hosted","conversion-overlays");
const PACKAGE=join(PACKAGE_ROOT,"package.json");
const bool=value=>({__tag:"bool",value});
const string=value=>({__tag:"string",value});
const args=names=>new Map(names.map(name=>[name,bool(true)]));
const RESERVED=new Set(["version","pure","secure","flow","FLOW","contract","intent","record","return","if","match","check","deny","ambig","mut","let","Bool","Int","String","Verdict","Result","Option","Array","true","false","Ok","Err","Some","None","Allow","Deny","Unknown"]);
const R="galerina-framework-app-kernel/src/registry-rotation-authority.ts";
const C="galerina-framework-app-kernel/src/registry-rotation-controller.ts";
const T="galerina-framework-app-kernel/src/registry-runtime.ts";
const M="galerina-framework-app-kernel/src/registry-package-manifest.ts";
const A="galerina-framework-app-kernel/src/registry-authority.ts";
const SOURCES=Object.freeze({R,C,T,M,A});
const CANDIDATES=Object.freeze([
  ["registry-rotation-index-guard-status.fungi","registryRotationIndexGuardStatusCore","R","function isAdmittedRegistryRotationIndex",["valueCaptured","objectPresent","provenanceKnown"],"registry_rotation_index_known"],
  ["registry-rotation-index-admit-status.fungi","registryRotationIndexAdmitStatusCore","R","function admitRegistryRotationIndex",["receiptCaptured","identitiesMatched","entriesBound","signatureVerified","provenanceMinted"],"registry_rotation_index_admitted"],
  ["registry-rotation-denied-status.fungi","registryRotationDeniedStatusCore","R","function denied",["processCaptured","reasonCaptured","boundaryDenied","outcomeBuilt"],"registry_rotation_denied"],
  ["registry-rotation-stage-admitted-status.fungi","registryRotationStageAdmittedStatusCore","R","function stageAdmittedRegistryRotationCandidate",["optionsCaptured","receiptKnown","identityValid","delegationActive","candidateStaged"],"registry_rotation_candidate_staged"],
  ["registry-controller-refused-status.fungi","registryControllerRefusedStatusCore","C","function refused",["optionsCaptured","verdictCaptured","boundaryDecided","outcomeBuilt"],"registry_controller_refused"],
  ["registry-controller-bundles-match-status.fungi","registryControllerBundlesMatchStatusCore","C","function bundlesMatchRing",["optionsCaptured","oldCommitReady","newCommitReady","oldEpochMatched","newEpochMatched"],"registry_controller_bundles_matched"],
  ["registry-controller-context-status.fungi","registryControllerContextStatusCore","C","function contextFor",["optionsCaptured","transitionPresent","bundlesMatched","contextCreated"],"registry_controller_context_ready"],
  ["registry-controller-advance-status.fungi","registryControllerAdvanceStatusCore","C","function advanceRegistryRotation",["optionsCaptured","phaseCaptured","evidenceAdmitted","onePhaseAdvanced","outcomeBound"],"registry_controller_phase_advanced"],
  ["registry-controller-forward-probe-status.fungi","registryControllerForwardProbeStatusCore","C","verifyForwardProbe: () => forwardProbeVerified",["probeCaptured","candidateCaptured","receiptConsumed","generationMatched"],"registry_controller_probe_verified"],
  ["registry-controller-state-advance-status.fungi","registryControllerStateAdvanceStatusCore","C","function advanceRegistryRotationState",["optionsCaptured","stateRestored","probeVerified","candidateAccepted","stateAdvanced"],"registry_controller_state_advanced"],
  ["registry-runtime-node-load-status.fungi","registryRuntimeNodeLoadStatusCore","T","function loadNode",["environmentCaptured","fsLoaded","cryptoLoaded"],"registry_runtime_node_loaded"],
  ["registry-runtime-bounded-file-status.fungi","registryRuntimeBoundedFileStatusCore","T","function readBoundedFile",["pathCaptured","statsValid","sizeBound","bytesRead","identityStable"],"registry_runtime_file_bounded"],
  ["registry-runtime-utf8-status.fungi","registryRuntimeUtf8StatusCore","T","function decodeUtf8",["bytesCaptured","nonEmpty","decoded","noReplacement"],"registry_runtime_utf8_decoded"],
  ["registry-runtime-parse-object-status.fungi","registryRuntimeParseObjectStatusCore","T","function parseObject",["bytesCaptured","utf8Valid","jsonParsed","recordPresent"],"registry_runtime_object_parsed"],
  ["registry-runtime-base64-status.fungi","registryRuntimeBase64StatusCore","T","function decodeCanonicalBase64",["valueCaptured","grammarValid","decoded","canonical"],"registry_runtime_base64_canonical"],
  ["registry-runtime-sha256-status.fungi","registryRuntimeSha256StatusCore","T","function sha256",["cryptoCaptured","bytesCaptured","digestReady"],"registry_runtime_digest_ready"],
  ["registry-runtime-public-key-facts-status.fungi","registryRuntimePublicKeyFactsStatusCore","T","function publicKeyFacts",["keyIdCaptured","filesBound","algorithmsValid","fingerprintsComputed","factsBuilt"],"registry_runtime_key_facts_ready"],
  ["registry-runtime-deep-freeze-status.fungi","registryRuntimeDeepFreezeStatusCore","T","function deepFreeze",["valueCaptured","childrenVisited","objectFrozen","graphSealed"],"registry_runtime_graph_frozen"],
  ["registry-runtime-admit-status.fungi","registryRuntimeAdmitStatusCore","T","admit(\n      lookup",["lookupCaptured","policyCaptured","packageFound","decisionBuilt"],"registry_runtime_package_admitted"],
  ["registry-runtime-load-root-status.fungi","registryRuntimeLoadRootStatusCore","T","function loadProductionRegistryFromRoot",["rootCaptured","optionsCaptured","registryVerified","authorityAdmitted","runtimeBuilt"],"registry_runtime_root_loaded"],
  ["registry-runtime-bootstrap-status.fungi","registryRuntimeBootstrapStatusCore","T","function loadRegistryForBootstrap",["optionsCaptured","rootBound","authorityLoaded","runtimeBuilt"],"registry_runtime_bootstrap_loaded"],
  ["registry-runtime-production-status.fungi","registryRuntimeProductionStatusCore","T","function loadProductionRegistry",["optionsCaptured","stateRestored","epochMatched","registryLoaded","runtimeBound"],"registry_runtime_production_loaded"],
  ["registry-manifest-malformed-status.fungi","registryManifestMalformedStatusCore","M","function malformed",["messageCaptured","errorBuilt","failureTyped"],"registry_manifest_malformed"],
  ["registry-manifest-signing-identity-status.fungi","registryManifestSigningIdentityStatusCore","M","function requireSigningIdentity",["valueCaptured","objectPresent","keyIdValid","returned"],"registry_manifest_identity_valid"],
  ["registry-manifest-base64-status.fungi","registryManifestBase64StatusCore","M","function canonicalBase64",["valueCaptured","grammarValid","decoded","reencoded"],"registry_manifest_base64_canonical"],
  ["registry-manifest-signing-input-status.fungi","registryManifestSigningInputStatusCore","M","function manifestSigningInput",["manifestCaptured","fieldsBound","canonicalReady","bytesReady"],"registry_manifest_signing_ready"],
  ["registry-manifest-preimage-status.fungi","registryManifestPreimageStatusCore","M","function packageManifestSignaturePreimage",["manifestCaptured","signingReady","contextBound","framed","bytesReady"],"registry_manifest_preimage_ready"],
  ["registry-manifest-envelope-status.fungi","registryManifestEnvelopeStatusCore","M","function parseEnvelope",["valueCaptured","shapeValid","signaturesPresent","envelopeBuilt"],"registry_manifest_envelope_parsed"],
  ["registry-manifest-component-verify-status.fungi","registryManifestComponentVerifyStatusCore","M","function verifyComponent",["messageCaptured","signatureParsed","keyMatched","verifierAccepted","resultBound"],"registry_manifest_component_verified"],
  ["registry-manifest-sign-status.fungi","registryManifestSignStatusCore","M","function signRegistryPackageManifest",["manifestCaptured","preimageReady","edSigned","mlSigned","envelopeBuilt"],"registry_manifest_signed"],
  ["registry-manifest-verify-status.fungi","registryManifestVerifyStatusCore","M","function verifyRegistryPackageManifest",["manifestCaptured","envelopeParsed","componentsValid","revocationChecked","verified"],"registry_manifest_verified"],
  ["registry-authority-malformed-status.fungi","registryAuthorityMalformedStatusCore","A","function malformed",["messageCaptured","authorityScoped","errorBuilt","failureTyped"],"registry_authority_malformed"],
  ["registry-authority-nonempty-status.fungi","registryAuthorityNonemptyStatusCore","A","function requireNonEmpty",["valueCaptured","stringTyped","nonEmpty"],"registry_authority_string_valid"],
  ["registry-authority-instant-status.fungi","registryAuthorityInstantStatusCore","A","function parseCanonicalInstant",["valueCaptured","stringTyped","parsed","roundTripped"],"registry_authority_instant_canonical"],
  ["registry-authority-roles-status.fungi","registryAuthorityRolesStatusCore","A","function validateRoles",["rolesCaptured","closedSet","requiredPresent","unique"],"registry_authority_roles_valid"],
  ["registry-authority-operational-status.fungi","registryAuthorityOperationalStatusCore","A","function validateOperational",["operationalCaptured","identityValid","fingerprintsValid","rolesValid","authorityBound"],"registry_authority_operational_valid"],
  ["registry-authority-unsigned-status.fungi","registryAuthorityUnsignedStatusCore","A","function validateUnsignedFields",["delegationCaptured","serialValid","windowCanonical","rolesValid","fieldsBound"],"registry_authority_unsigned_valid"],
  ["registry-authority-signing-input-status.fungi","registryAuthoritySigningInputStatusCore","A","function signingInput",["delegationCaptured","fieldsSelected","canonicalReady","bytesReady"],"registry_authority_signing_ready"],
  ["registry-authority-preimage-status.fungi","registryAuthorityPreimageStatusCore","A","function registryAuthorityDelegationPreimage",["delegationCaptured","signingReady","contextBound","framed","bytesReady"],"registry_authority_preimage_ready"],
  ["registry-authority-build-status.fungi","registryAuthorityBuildStatusCore","A","function buildRegistryAuthorityDelegation",["inputCaptured","fieldsValidated","operationalValid","objectBuilt","frozen"],"registry_authority_delegation_built"],
].map(([file,flow,source,symbol,names,expected])=>Object.freeze({file,flow,source:SOURCES[source],symbol,input:args(names),expected:string(expected)})));

function shadowFingerprint(source){
  const identifiers=new Map();
  return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");
}

describe("40-file source-bound Fungi decision-core overlay wave 17",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{
    assert.equal(CANDIDATES.length,40);
    const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[];
    const scopes=new Set();
    for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-galerina",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);assert.equal(scopes.has(`${c.source}#${c.symbol}`),false);scopes.add(`${c.source}#${c.symbol}`);}
  });
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{
    const seen=new Map();const files=new Set(CANDIDATES.map(c=>c.file));
    for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}
    const collisions=[];for(const c of CANDIDATES){const path=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(path),`${c.file} must exist`);const source=readFileSync(path,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);}}
    assert.deepEqual(collisions,[]);
  });
  it("parses, effect-checks, emits GIR and executes every decision core",async()=>{
    for(const c of CANDIDATES){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8");const program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}
  });
});
