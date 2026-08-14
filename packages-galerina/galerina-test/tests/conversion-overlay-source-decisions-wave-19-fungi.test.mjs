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
const H="galerina-framework-app-kernel/src/host-floor.ts";
const K="galerina-framework-app-kernel/src/kernel.ts";
const P="galerina-framework-app-kernel/src/production-slide-restore-admission.ts";
const R="galerina-framework-app-kernel/src/route-defaults.ts";
const S="galerina-framework-app-kernel/src/secret-gate.ts";
const D="galerina-framework-app-kernel/src/registry-durability-production-admission.ts";
const SOURCES=Object.freeze({H,K,P,R,S,D});
const CANDIDATES=Object.freeze([
  ["host-floor-registry-generation-status.fungi","hostFloorRegistryGenerationStatusCore","H","loadRegistryGenerationHostFloor",["importsStarted","modulesLoaded","processNarrowed","capabilitiesBound","floorFrozen"],"host_floor_registry_generation_loaded"],
  ["host-floor-registry-runtime-status.fungi","hostFloorRegistryRuntimeStatusCore","H","loadRegistryRuntimeHostFloor",["importsStarted","modulesLoaded","capabilitiesBound","floorFrozen"],"host_floor_registry_runtime_loaded"],
  ["host-floor-wasm-status.fungi","hostFloorWasmStatusCore","H","instantiateWasmHostFloor",["bytesCaptured","importsCaptured","runtimeInvoked"],"host_floor_wasm_instantiated"],
  ["host-floor-revocation-authority-status.fungi","hostFloorRevocationAuthorityStatusCore","H","loadTrustedRevocationAuthorityHostFloor",["rootCaptured","urlBound","moduleImported"],"host_floor_revocation_authority_loaded"],
  ["kernel-base-content-type-status.fungi","kernelBaseContentTypeStatusCore","K","baseContentType",["valueCaptured","separatorFound","contentTypeNormalized"],"kernel_content_type_normalized"],
  ["kernel-create-status.fungi","kernelCreateStatusCore","K","createAppKernel",["optionsCaptured","routesIndexed","policiesResolved","gatesBound","kernelFrozen"],"kernel_created"],
  ["kernel-error-code-status.fungi","kernelErrorCodeStatusCore","K","errorCodeOf",["responseCaptured","bodyDecoded","codeValidated","resultBound"],"kernel_error_code_resolved"],
  ["kernel-error-response-status.fungi","kernelErrorResponseStatusCore","K","errorResponse",["statusCaptured","codeCaptured","messageCaptured","bodyEncoded"],"kernel_error_response_built"],
  ["kernel-secret-callback-status.fungi","kernelSecretCallbackStatusCore","K","getSecret",["nameCaptured","callbackCaptured","secretUsed"],"kernel_secret_callback_completed"],
  ["kernel-handle-status.fungi","kernelHandleStatusCore","K","handle",["requestCaptured","auditReserved","pipelineCompleted","evidenceCommitted","responseReturned"],"kernel_request_handled"],
  ["kernel-duplicate-json-key-status.fungi","kernelDuplicateJsonKeyStatusCore","K","hasDuplicateJsonKeys",["textCaptured","tokensScanned","objectKeysTracked","duplicatesClassified"],"kernel_json_keys_classified"],
  ["kernel-header-status.fungi","kernelHeaderStatusCore","K","header",["headersCaptured","nameNormalized","entryMatched"],"kernel_header_resolved"],
  ["kernel-rate-status.fungi","kernelRateStatusCore","K","parseRatePerMinute",["rateCaptured","syntaxMatched","valueValidated"],"kernel_rate_parsed"],
  ["kernel-release-slot-status.fungi","kernelReleaseSlotStatusCore","K","releaseSlot",["slotHeld","counterUpdated","releaseRecorded"],"kernel_slot_released"],
  ["kernel-route-key-status.fungi","kernelRouteKeyStatusCore","K","routeKey",["methodCaptured","pathCaptured","keyBuilt"],"kernel_route_key_built"],
  ["kernel-run-pipeline-status.fungi","kernelRunPipelineStatusCore","K","runPipeline",["requestCaptured","routeMatched","policyApplied","gatesPassed","handlerCompleted"],"kernel_pipeline_completed"],
  ["slide-restore-admit-status.fungi","slideRestoreAdmitStatusCore","P","admitAuthenticatedSlideRestoreProfile",["manifestCaptured","objectBound","authorityVerified","observationsMatched","profileSealed"],"slide_restore_profile_admitted"],
  ["slide-restore-authority-shape-status.fungi","slideRestoreAuthorityShapeStatusCore","P","authorityShapeIsValid",["valueCaptured","shapeExact","callbacksBound","authorityValid"],"slide_restore_authority_valid"],
  ["slide-restore-canonical-instant-status.fungi","slideRestoreCanonicalInstantStatusCore","P","canonicalInstant",["valueCaptured","instantParsed","roundTripMatched"],"slide_restore_instant_canonical"],
  ["slide-restore-execution-port-status.fungi","slideRestoreExecutionPortStatusCore","P","executionPortShapeIsValid",["valueCaptured","shapeExact","schemaMatched","callbackBound"],"slide_restore_execution_port_valid"],
  ["slide-restore-data-shape-status.fungi","slideRestoreDataShapeStatusCore","P","hasExactDataShape",["valueCaptured","prototypePlain","keysExact","descriptorsData","cloneSucceeded"],"slide_restore_data_shape_exact"],
  ["slide-restore-profile-guard-status.fungi","slideRestoreProfileGuardStatusCore","P","isAuthenticatedSlideRestoreProfile",["valueCaptured","objectPresent","provenanceMatched"],"slide_restore_profile_authenticated"],
  ["slide-restore-nonempty-string-status.fungi","slideRestoreNonemptyStringStatusCore","P","isNonEmptyString",["valueCaptured","stringTyped","nonempty"],"slide_restore_string_nonempty"],
  ["slide-restore-manifest-shape-status.fungi","slideRestoreManifestShapeStatusCore","P","manifestShapeIsValid",["valueCaptured","shapeExact","digestsValid","epochsValid","signaturesPresent"],"slide_restore_manifest_valid"],
  ["slide-restore-observation-status.fungi","slideRestoreObservationStatusCore","P","observationIsValid",["valueCaptured","shapeExact","identityMatched","provenanceMatched","verdictMatched"],"slide_restore_observation_valid"],
  ["slide-restore-provenance-status.fungi","slideRestoreProvenanceStatusCore","P","provenanceDigestsAreValid",["valueCaptured","arrayPlain","lengthExact","digestsUnique","cloneSucceeded"],"slide_restore_provenance_valid"],
  ["slide-restore-refuse-status.fungi","slideRestoreRefuseStatusCore","P","function refuse",["codeCaptured","errorTyped","refusalRaised"],"slide_restore_refusal_bound"],
  ["slide-restore-preimage-status.fungi","slideRestorePreimageStatusCore","P","signaturePreimage",["manifestCaptured","fieldsOrdered","jsonEncoded","domainBound"],"slide_restore_preimage_ready"],
  ["slide-restore-verify-component-status.fungi","slideRestoreVerifyComponentStatusCore","P","verifyComponent",["verifierCaptured","preimageCaptured","signatureCaptured","keyBound","literalTrue"],"slide_restore_component_verified"],
  ["route-default-idempotency-status.fungi","routeDefaultIdempotencyStatusCore","R","methodAwareIdempotency",["methodCaptured","mutationClassified","policyBuilt"],"route_idempotency_defaulted"],
  ["route-effective-policy-status.fungi","routeEffectivePolicyStatusCore","R","resolveEffectiveRoutePolicy",["routeCaptured","postureApplied","defaultsMerged","relaxationsBound","policyFrozen"],"route_policy_resolved"],
  ["secret-gate-admit-status.fungi","secretGateAdmitStatusCore","S","function admit",["requiredCaptured","providerBound","secretsChecked","decisionBound"],"secret_gate_admission_resolved"],
  ["secret-gate-create-status.fungi","secretGateCreateStatusCore","S","createSecretGate",["providerCaptured","admitBound","useBound","gateFrozen"],"secret_gate_created"],
  ["secret-gate-get-status.fungi","secretGateGetStatusCore","S","getSecret",["requiredCaptured","nameCaptured","providerUsed","callbackCompleted","viewErased"],"secret_gate_use_completed"],
  ["registry-durability-refuse-status.fungi","registryDurabilityRefuseStatusCore","D","function refuse",["codeCaptured","errorTyped","refusalRaised"],"registry_durability_refusal_bound"],
  ["registry-durability-canonical-instant-status.fungi","registryDurabilityCanonicalInstantStatusCore","D","canonicalInstant",["valueCaptured","instantParsed","roundTripMatched"],"registry_durability_instant_canonical"],
  ["registry-durability-manifest-shape-status.fungi","registryDurabilityManifestShapeStatusCore","D","manifestShapeIsValid",["valueCaptured","shapeExact","digestsValid","adapterMatched","signaturesPresent"],"registry_durability_manifest_valid"],
  ["registry-durability-authority-shape-status.fungi","registryDurabilityAuthorityShapeStatusCore","D","authorityShapeIsValid",["valueCaptured","shapeExact","callbacksBound","keyIdsBound"],"registry_durability_authority_valid"],
  ["registry-durability-preimage-status.fungi","registryDurabilityPreimageStatusCore","D","function preimage",["manifestCaptured","fieldsSelected","jsonEncoded","domainBound"],"registry_durability_preimage_ready"],
  ["registry-durability-verify-component-status.fungi","registryDurabilityVerifyComponentStatusCore","D","verifyComponent",["verifierCaptured","preimageCaptured","signatureCaptured","keyBound","literalTrue"],"registry_durability_component_verified"],
].map(([file,flow,source,symbol,names,expected])=>Object.freeze({file,flow,source:SOURCES[source],symbol,input:args(names),expected:string(expected)})));

function shadowFingerprint(source){
  const identifiers=new Map();
  return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");
}

describe("40-file source-bound Fungi decision-core overlay wave 19",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{
    assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[];const scopes=new Set();
    for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-galerina",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);assert.equal(scopes.has(`${c.source}#${c.symbol}`),false);scopes.add(`${c.source}#${c.symbol}`);}
  });
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{
    const seen=new Map();const files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const path=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(path),`${c.file} must exist`);const source=readFileSync(path,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);}}assert.deepEqual(collisions,[]);
  });
  it("parses, effect-checks, emits GIR and executes every decision core",async()=>{for(const c of CANDIDATES){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8");const program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});
