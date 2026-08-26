import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { it } from "node:test";

const SLIDE_ROOT=process.env.GALERINA_SLIDE_REPO;
const AVAILABLE=typeof SLIDE_ROOT==="string"&&existsSync(join(SLIDE_ROOT,"src","checked-fungi-package-compiler.mjs"));
const ROOT=join(process.cwd(),"packages-ts","galerina-test","src","self-hosted","conversion-overlays");
const GATES=Object.freeze({identity:1,provenance:1,target:1,effects:1,policy:1,revocation:1,validation:1,memory:1});
const CANDIDATES=Object.freeze([
  ["registry-rotation-index-guard-status.fungi","registryRotationIndexGuardStatusCore",3,"registry_rotation_index_known"],
  ["registry-rotation-index-admit-status.fungi","registryRotationIndexAdmitStatusCore",5,"registry_rotation_index_admitted"],
  ["registry-rotation-denied-status.fungi","registryRotationDeniedStatusCore",4,"registry_rotation_denied"],
  ["registry-rotation-stage-admitted-status.fungi","registryRotationStageAdmittedStatusCore",5,"registry_rotation_candidate_staged"],
  ["registry-controller-refused-status.fungi","registryControllerRefusedStatusCore",4,"registry_controller_refused"],
  ["registry-controller-bundles-match-status.fungi","registryControllerBundlesMatchStatusCore",5,"registry_controller_bundles_matched"],
  ["registry-controller-context-status.fungi","registryControllerContextStatusCore",4,"registry_controller_context_ready"],
  ["registry-controller-advance-status.fungi","registryControllerAdvanceStatusCore",5,"registry_controller_phase_advanced"],
  ["registry-controller-forward-probe-status.fungi","registryControllerForwardProbeStatusCore",4,"registry_controller_probe_verified"],
  ["registry-controller-state-advance-status.fungi","registryControllerStateAdvanceStatusCore",5,"registry_controller_state_advanced"],
  ["registry-runtime-node-load-status.fungi","registryRuntimeNodeLoadStatusCore",3,"registry_runtime_node_loaded"],
  ["registry-runtime-bounded-file-status.fungi","registryRuntimeBoundedFileStatusCore",5,"registry_runtime_file_bounded"],
  ["registry-runtime-utf8-status.fungi","registryRuntimeUtf8StatusCore",4,"registry_runtime_utf8_decoded"],
  ["registry-runtime-parse-object-status.fungi","registryRuntimeParseObjectStatusCore",4,"registry_runtime_object_parsed"],
  ["registry-runtime-base64-status.fungi","registryRuntimeBase64StatusCore",4,"registry_runtime_base64_canonical"],
  ["registry-runtime-sha256-status.fungi","registryRuntimeSha256StatusCore",3,"registry_runtime_digest_ready"],
  ["registry-runtime-public-key-facts-status.fungi","registryRuntimePublicKeyFactsStatusCore",5,"registry_runtime_key_facts_ready"],
  ["registry-runtime-deep-freeze-status.fungi","registryRuntimeDeepFreezeStatusCore",4,"registry_runtime_graph_frozen"],
  ["registry-runtime-admit-status.fungi","registryRuntimeAdmitStatusCore",4,"registry_runtime_package_admitted"],
  ["registry-runtime-load-root-status.fungi","registryRuntimeLoadRootStatusCore",5,"registry_runtime_root_loaded"],
  ["registry-runtime-bootstrap-status.fungi","registryRuntimeBootstrapStatusCore",4,"registry_runtime_bootstrap_loaded"],
  ["registry-runtime-production-status.fungi","registryRuntimeProductionStatusCore",5,"registry_runtime_production_loaded"],
  ["registry-manifest-malformed-status.fungi","registryManifestMalformedStatusCore",3,"registry_manifest_malformed"],
  ["registry-manifest-signing-identity-status.fungi","registryManifestSigningIdentityStatusCore",4,"registry_manifest_identity_valid"],
  ["registry-manifest-base64-status.fungi","registryManifestBase64StatusCore",4,"registry_manifest_base64_canonical"],
  ["registry-manifest-signing-input-status.fungi","registryManifestSigningInputStatusCore",4,"registry_manifest_signing_ready"],
  ["registry-manifest-preimage-status.fungi","registryManifestPreimageStatusCore",5,"registry_manifest_preimage_ready"],
  ["registry-manifest-envelope-status.fungi","registryManifestEnvelopeStatusCore",4,"registry_manifest_envelope_parsed"],
  ["registry-manifest-component-verify-status.fungi","registryManifestComponentVerifyStatusCore",5,"registry_manifest_component_verified"],
  ["registry-manifest-sign-status.fungi","registryManifestSignStatusCore",5,"registry_manifest_signed"],
  ["registry-manifest-verify-status.fungi","registryManifestVerifyStatusCore",5,"registry_manifest_verified"],
  ["registry-authority-malformed-status.fungi","registryAuthorityMalformedStatusCore",4,"registry_authority_malformed"],
  ["registry-authority-nonempty-status.fungi","registryAuthorityNonemptyStatusCore",3,"registry_authority_string_valid"],
  ["registry-authority-instant-status.fungi","registryAuthorityInstantStatusCore",4,"registry_authority_instant_canonical"],
  ["registry-authority-roles-status.fungi","registryAuthorityRolesStatusCore",4,"registry_authority_roles_valid"],
  ["registry-authority-operational-status.fungi","registryAuthorityOperationalStatusCore",5,"registry_authority_operational_valid"],
  ["registry-authority-unsigned-status.fungi","registryAuthorityUnsignedStatusCore",5,"registry_authority_unsigned_valid"],
  ["registry-authority-signing-input-status.fungi","registryAuthoritySigningInputStatusCore",4,"registry_authority_signing_ready"],
  ["registry-authority-preimage-status.fungi","registryAuthorityPreimageStatusCore",5,"registry_authority_preimage_ready"],
  ["registry-authority-build-status.fungi","registryAuthorityBuildStatusCore",5,"registry_authority_delegation_built"],
].map(([file,flow,count,expected])=>Object.freeze({file,flow,args:Array(count).fill(true),expected})));

async function api(){const load=async p=>import(pathToFileURL(join(SLIDE_ROOT,"src",p)).href);return {...await load("checked-fungi-package-compiler.mjs"),...await load("checked-fungi-package-file.mjs"),...await load("checked-fungi-package-publication-loader.mjs"),...await load("safe-value-envelope.mjs"),...await load("portable-veo.mjs")};}
function expectation(r){return {packageSetDigest:r.packageSetDigest,packageIdentity:r.packageIdentity,exportName:r.exportName,receiptDigest:r.receiptDigest,safeValueTypeId:r.safeValueTypeId,safeValueStateId:r.safeValueStateId,safeValueProvenanceDigest:r.safeValueProvenanceDigest};}

it("publishes and independently re-admits all 40 wave-17 source decisions through physical SLIDE/VOK",{skip:!AVAILABLE},async()=>{
  const slide=await api();const context=slide.portableVeoReferenceContext();const sources=CANDIDATES.map(c=>Uint8Array.from(readFileSync(join(ROOT,c.file))));
  const request=bytes=>({packages:[{identity:"@galerina/test",version:"1.0.0-beta.17",exports:CANDIDATES.map((c,i)=>({name:c.flow,sourceFlowName:c.flow,sourceBytes:bytes[i]})),dependencies:[],resources:[]}],context,gates:GATES});
  const compiled=slide.compileCheckedFungiPackageSet(request(sources));
  if(compiled.verdict!==1){const failures=[];for(let i=0;i<CANDIDATES.length;i++){const c=CANDIDATES[i];const one=slide.compileCheckedFungiPackageSet({packages:[{identity:"@galerina/test",version:"1.0.0-beta.17",exports:[{name:c.flow,sourceFlowName:c.flow,sourceBytes:sources[i]}],dependencies:[],resources:[]}],context,gates:GATES});if(one.verdict!==1)failures.push(c.flow+":"+JSON.stringify(one));}assert.fail("physical SLIDE compilation refused: "+failures.join(", "));}
  const changed=sources.map(source=>Uint8Array.from(source));changed[0][0]^=1;assert.equal(slide.compileCheckedFungiPackageSet(request(changed)).verdict,-1);
  const parent=await mkdtemp(join(tmpdir(),"galerina-wave-17-"));const out=join(parent,"published");
  try{const published=await slide.publishCheckedFungiPackageBuild({packageBuildHandle:compiled.packageBuildHandle,outputDirectory:out});assert.equal(published.verdict,1,JSON.stringify(published));const files=published.outputFiles.filter(n=>n.endsWith(".slide"));assert.equal(files.length,40);let last;
    for(const c of CANDIDATES){const prepared=await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:c.flow,context,gates:GATES});assert.equal(prepared.verdict,1,c.flow);const receipt=slide.executeTypedCheckedFungiPackagePublication(prepared.packageExecutionHandle,c.args,undefined);assert.equal(receipt.status,"SUCCEEDED_PHYSICAL_REFERENCE_ONLY",c.flow);const verified=slide.verifyTypedCheckedFungiPackageReceipt(receipt,expectation(receipt));assert.equal(verified.verdict,1,c.flow);assert.equal(verified.value,c.expected,c.flow);assert.equal(verified.authorityReleased,false,c.flow);last=receipt;}
    assert.equal(slide.verifyTypedCheckedFungiPackageReceipt({...last,receiptDigest:"sha256:"+"0".repeat(64)},expectation(last)).verdict,-1);
    const path=join(out,files[0]);const bytes=await readFile(path);bytes[0]^=1;await writeFile(path,bytes);assert.equal((await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:CANDIDATES[0].flow,context,gates:GATES})).verdict,-1);
  }finally{await rm(parent,{recursive:true,force:true});}
});
