import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { it } from "node:test";

const SLIDE_ROOT=process.env.GALERINA_SLIDE_REPO;
const AVAILABLE=typeof SLIDE_ROOT==="string"&&existsSync(join(SLIDE_ROOT,"src","checked-fungi-package-compiler.mjs"));
const ROOT=join(process.cwd(),"packages-galerina","galerina-test","src","self-hosted","conversion-overlays");
const GATES=Object.freeze({identity:1,provenance:1,target:1,effects:1,policy:1,revocation:1,validation:1,memory:1});
const CANDIDATES=Object.freeze([
  ["host-floor-registry-generation-status.fungi","hostFloorRegistryGenerationStatusCore",5,"host_floor_registry_generation_loaded"],
  ["host-floor-registry-runtime-status.fungi","hostFloorRegistryRuntimeStatusCore",4,"host_floor_registry_runtime_loaded"],
  ["host-floor-wasm-status.fungi","hostFloorWasmStatusCore",3,"host_floor_wasm_instantiated"],
  ["host-floor-revocation-authority-status.fungi","hostFloorRevocationAuthorityStatusCore",3,"host_floor_revocation_authority_loaded"],
  ["kernel-base-content-type-status.fungi","kernelBaseContentTypeStatusCore",3,"kernel_content_type_normalized"],
  ["kernel-create-status.fungi","kernelCreateStatusCore",5,"kernel_created"],
  ["kernel-error-code-status.fungi","kernelErrorCodeStatusCore",4,"kernel_error_code_resolved"],
  ["kernel-error-response-status.fungi","kernelErrorResponseStatusCore",4,"kernel_error_response_built"],
  ["kernel-secret-callback-status.fungi","kernelSecretCallbackStatusCore",3,"kernel_secret_callback_completed"],
  ["kernel-handle-status.fungi","kernelHandleStatusCore",5,"kernel_request_handled"],
  ["kernel-duplicate-json-key-status.fungi","kernelDuplicateJsonKeyStatusCore",4,"kernel_json_keys_classified"],
  ["kernel-header-status.fungi","kernelHeaderStatusCore",3,"kernel_header_resolved"],
  ["kernel-rate-status.fungi","kernelRateStatusCore",3,"kernel_rate_parsed"],
  ["kernel-release-slot-status.fungi","kernelReleaseSlotStatusCore",3,"kernel_slot_released"],
  ["kernel-route-key-status.fungi","kernelRouteKeyStatusCore",3,"kernel_route_key_built"],
  ["kernel-run-pipeline-status.fungi","kernelRunPipelineStatusCore",5,"kernel_pipeline_completed"],
  ["slide-restore-admit-status.fungi","slideRestoreAdmitStatusCore",5,"slide_restore_profile_admitted"],
  ["slide-restore-authority-shape-status.fungi","slideRestoreAuthorityShapeStatusCore",4,"slide_restore_authority_valid"],
  ["slide-restore-canonical-instant-status.fungi","slideRestoreCanonicalInstantStatusCore",3,"slide_restore_instant_canonical"],
  ["slide-restore-execution-port-status.fungi","slideRestoreExecutionPortStatusCore",4,"slide_restore_execution_port_valid"],
  ["slide-restore-data-shape-status.fungi","slideRestoreDataShapeStatusCore",5,"slide_restore_data_shape_exact"],
  ["slide-restore-profile-guard-status.fungi","slideRestoreProfileGuardStatusCore",3,"slide_restore_profile_authenticated"],
  ["slide-restore-nonempty-string-status.fungi","slideRestoreNonemptyStringStatusCore",3,"slide_restore_string_nonempty"],
  ["slide-restore-manifest-shape-status.fungi","slideRestoreManifestShapeStatusCore",5,"slide_restore_manifest_valid"],
  ["slide-restore-observation-status.fungi","slideRestoreObservationStatusCore",5,"slide_restore_observation_valid"],
  ["slide-restore-provenance-status.fungi","slideRestoreProvenanceStatusCore",5,"slide_restore_provenance_valid"],
  ["slide-restore-refuse-status.fungi","slideRestoreRefuseStatusCore",3,"slide_restore_refusal_bound"],
  ["slide-restore-preimage-status.fungi","slideRestorePreimageStatusCore",4,"slide_restore_preimage_ready"],
  ["slide-restore-verify-component-status.fungi","slideRestoreVerifyComponentStatusCore",5,"slide_restore_component_verified"],
  ["route-default-idempotency-status.fungi","routeDefaultIdempotencyStatusCore",3,"route_idempotency_defaulted"],
  ["route-effective-policy-status.fungi","routeEffectivePolicyStatusCore",5,"route_policy_resolved"],
  ["secret-gate-admit-status.fungi","secretGateAdmitStatusCore",4,"secret_gate_admission_resolved"],
  ["secret-gate-create-status.fungi","secretGateCreateStatusCore",4,"secret_gate_created"],
  ["secret-gate-get-status.fungi","secretGateGetStatusCore",5,"secret_gate_use_completed"],
  ["registry-durability-refuse-status.fungi","registryDurabilityRefuseStatusCore",3,"registry_durability_refusal_bound"],
  ["registry-durability-canonical-instant-status.fungi","registryDurabilityCanonicalInstantStatusCore",3,"registry_durability_instant_canonical"],
  ["registry-durability-manifest-shape-status.fungi","registryDurabilityManifestShapeStatusCore",5,"registry_durability_manifest_valid"],
  ["registry-durability-authority-shape-status.fungi","registryDurabilityAuthorityShapeStatusCore",4,"registry_durability_authority_valid"],
  ["registry-durability-preimage-status.fungi","registryDurabilityPreimageStatusCore",4,"registry_durability_preimage_ready"],
  ["registry-durability-verify-component-status.fungi","registryDurabilityVerifyComponentStatusCore",5,"registry_durability_component_verified"],
].map(([file,flow,count,expected])=>Object.freeze({file,flow,args:Array(count).fill(true),expected})));

async function api(){const load=async p=>import(pathToFileURL(join(SLIDE_ROOT,"src",p)).href);return {...await load("checked-fungi-package-compiler.mjs"),...await load("checked-fungi-package-file.mjs"),...await load("checked-fungi-package-publication-loader.mjs"),...await load("safe-value-envelope.mjs"),...await load("portable-veo.mjs")};}
function expectation(r){return {packageSetDigest:r.packageSetDigest,packageIdentity:r.packageIdentity,exportName:r.exportName,receiptDigest:r.receiptDigest,safeValueTypeId:r.safeValueTypeId,safeValueStateId:r.safeValueStateId,safeValueProvenanceDigest:r.safeValueProvenanceDigest};}

it("publishes and independently re-admits all 40 wave-19 source decisions through physical SLIDE/VOK",{skip:!AVAILABLE},async()=>{
 const slide=await api();const context=slide.portableVeoReferenceContext();const sources=CANDIDATES.map(c=>Uint8Array.from(readFileSync(join(ROOT,c.file))));const request=bytes=>({packages:[{identity:"@galerina/test",version:"1.0.0-beta.19",exports:CANDIDATES.map((c,i)=>({name:c.flow,sourceFlowName:c.flow,sourceBytes:bytes[i]})),dependencies:[],resources:[]}],context,gates:GATES});const compiled=slide.compileCheckedFungiPackageSet(request(sources));if(compiled.verdict!==1){const failures=[];for(let i=0;i<CANDIDATES.length;i++){const c=CANDIDATES[i];const one=slide.compileCheckedFungiPackageSet({packages:[{identity:"@galerina/test",version:"1.0.0-beta.19",exports:[{name:c.flow,sourceFlowName:c.flow,sourceBytes:sources[i]}],dependencies:[],resources:[]}],context,gates:GATES});if(one.verdict!==1)failures.push(c.flow+":"+JSON.stringify(one));}assert.fail("physical SLIDE compilation refused: "+failures.join(", "));}const changed=sources.map(source=>Uint8Array.from(source));changed[0][0]^=1;assert.equal(slide.compileCheckedFungiPackageSet(request(changed)).verdict,-1);const parent=await mkdtemp(join(tmpdir(),"galerina-wave-19-"));const out=join(parent,"published");
 try{const published=await slide.publishCheckedFungiPackageBuild({packageBuildHandle:compiled.packageBuildHandle,outputDirectory:out});assert.equal(published.verdict,1,JSON.stringify(published));const files=published.outputFiles.filter(n=>n.endsWith(".slide"));assert.equal(files.length,40);let last;for(const c of CANDIDATES){const prepared=await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:c.flow,context,gates:GATES});assert.equal(prepared.verdict,1,c.flow);const receipt=slide.executeTypedCheckedFungiPackagePublication(prepared.packageExecutionHandle,c.args,undefined);assert.equal(receipt.status,"SUCCEEDED_PHYSICAL_REFERENCE_ONLY",c.flow);const verified=slide.verifyTypedCheckedFungiPackageReceipt(receipt,expectation(receipt));assert.equal(verified.verdict,1,c.flow);assert.equal(verified.value,c.expected,c.flow);assert.equal(verified.authorityReleased,false,c.flow);last=receipt;}assert.equal(slide.verifyTypedCheckedFungiPackageReceipt({...last,receiptDigest:"sha256:"+"0".repeat(64)},expectation(last)).verdict,-1);const path=join(out,files[0]);const bytes=await readFile(path);bytes[0]^=1;await writeFile(path,bytes);assert.equal((await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:CANDIDATES[0].flow,context,gates:GATES})).verdict,-1);}finally{await rm(parent,{recursive:true,force:true});}
});
