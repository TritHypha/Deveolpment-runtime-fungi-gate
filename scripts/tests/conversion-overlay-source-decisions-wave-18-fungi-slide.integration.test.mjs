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
  ["registry-authority-sign-delegation-status.fungi","registryAuthoritySignDelegationStatusCore",5,"registry_authority_delegation_signed"],
  ["registry-authority-revocation-status.fungi","registryAuthorityRevocationStatusCore",4,"registry_authority_not_revoked"],
  ["registry-authority-verify-delegation-status.fungi","registryAuthorityVerifyDelegationStatusCore",5,"registry_authority_delegation_verified"],
  ["registry-authority-root-component-status.fungi","registryAuthorityRootComponentStatusCore",5,"registry_authority_root_component_verified"],
  ["registry-authority-manifest-delegation-status.fungi","registryAuthorityManifestDelegationStatusCore",5,"registry_authority_manifest_verified"],
  ["registry-authority-index-delegation-status.fungi","registryAuthorityIndexDelegationStatusCore",5,"registry_authority_index_verified"],
  ["registry-activation-plain-shape-status.fungi","registryActivationPlainShapeStatusCore",4,"registry_activation_shape_plain"],
  ["registry-activation-deep-freeze-status.fungi","registryActivationDeepFreezeStatusCore",4,"registry_activation_graph_frozen"],
  ["registry-activation-canonical-json-status.fungi","registryActivationCanonicalJsonStatusCore",4,"registry_activation_json_canonical"],
  ["registry-activation-sha256-status.fungi","registryActivationSha256StatusCore",4,"registry_activation_digest_ready"],
  ["registry-activation-boundary-status.fungi","registryActivationBoundaryStatusCore",3,"registry_activation_boundary_known"],
  ["registry-activation-canary-status.fungi","registryActivationCanaryStatusCore",3,"registry_activation_canary_known"],
  ["registry-activation-normalize-status.fungi","registryActivationNormalizeStatusCore",5,"registry_activation_options_normalized"],
  ["registry-activation-schedule-status.fungi","registryActivationScheduleStatusCore",5,"registry_activation_schedule_ready"],
  ["registry-activation-fault-boundary-status.fungi","registryActivationFaultBoundaryStatusCore",4,"registry_activation_fault_valid"],
  ["registry-activation-terminal-status.fungi","registryActivationTerminalStatusCore",4,"registry_activation_terminal_selected"],
  ["registry-activation-set-terminal-status.fungi","registryActivationSetTerminalStatusCore",5,"registry_activation_terminal_set"],
  ["registry-activation-finish-receipt-status.fungi","registryActivationFinishReceiptStatusCore",5,"registry_activation_receipt_finished"],
  ["registry-activation-simulate-status.fungi","registryActivationSimulateStatusCore",5,"registry_activation_simulated"],
  ["registry-activation-planted-fault-status.fungi","registryActivationPlantedFaultStatusCore",4,"registry_activation_fault_planted"],
  ["registry-activation-seeded-order-status.fungi","registryActivationSeededOrderStatusCore",5,"registry_activation_order_seeded"],
  ["registry-activation-explore-status.fungi","registryActivationExploreStatusCore",5,"registry_activation_matrix_explored"],
  ["registry-artifact-node-load-status.fungi","registryArtifactNodeLoadStatusCore",3,"registry_artifact_node_loaded"],
  ["registry-artifact-deny-status.fungi","registryArtifactDenyStatusCore",4,"registry_artifact_denied"],
  ["registry-artifact-stats-identity-status.fungi","registryArtifactStatsIdentityStatusCore",5,"registry_artifact_identity_matched"],
  ["registry-artifact-uint16-status.fungi","registryArtifactUint16StatusCore",3,"registry_artifact_uint16_decoded"],
  ["registry-artifact-uint32-status.fungi","registryArtifactUint32StatusCore",4,"registry_artifact_uint32_decoded"],
  ["registry-artifact-pe-status.fungi","registryArtifactPeStatusCore",5,"registry_artifact_pe_matched"],
  ["registry-artifact-elf-status.fungi","registryArtifactElfStatusCore",5,"registry_artifact_elf_matched"],
  ["registry-artifact-macho-status.fungi","registryArtifactMachoStatusCore",4,"registry_artifact_macho_matched"],
  ["registry-artifact-container-status.fungi","registryArtifactContainerStatusCore",5,"registry_artifact_container_matched"],
  ["registry-artifact-ancestor-status.fungi","registryArtifactAncestorStatusCore",4,"registry_artifact_ancestors_direct"],
  ["registry-artifact-direct-path-status.fungi","registryArtifactDirectPathStatusCore",5,"registry_artifact_path_direct"],
  ["registry-artifact-inspect-status.fungi","registryArtifactInspectStatusCore",5,"registry_artifact_candidate_verified"],
  ["host-floor-import-status.fungi","hostFloorImportStatusCore",3,"host_floor_module_loaded"],
  ["host-floor-record-status.fungi","hostFloorRecordStatusCore",3,"host_floor_record_required"],
  ["host-floor-callable-slice-status.fungi","hostFloorCallableSliceStatusCore",5,"host_floor_callable_slice_ready"],
  ["host-floor-data-field-status.fungi","hostFloorDataFieldStatusCore",4,"host_floor_data_ready"],
  ["host-floor-fuse-status.fungi","hostFloorFuseStatusCore",5,"host_floor_fuse_loaded"],
  ["host-floor-artifact-status.fungi","hostFloorArtifactStatusCore",5,"host_floor_artifact_loaded"],
].map(([file,flow,count,expected])=>Object.freeze({file,flow,args:Array(count).fill(true),expected})));

async function api(){const load=async p=>import(pathToFileURL(join(SLIDE_ROOT,"src",p)).href);return {...await load("checked-fungi-package-compiler.mjs"),...await load("checked-fungi-package-file.mjs"),...await load("checked-fungi-package-publication-loader.mjs"),...await load("safe-value-envelope.mjs"),...await load("portable-veo.mjs")};}
function expectation(r){return {packageSetDigest:r.packageSetDigest,packageIdentity:r.packageIdentity,exportName:r.exportName,receiptDigest:r.receiptDigest,safeValueTypeId:r.safeValueTypeId,safeValueStateId:r.safeValueStateId,safeValueProvenanceDigest:r.safeValueProvenanceDigest};}

it("publishes and independently re-admits all 40 wave-18 source decisions through physical SLIDE/VOK",{skip:!AVAILABLE},async()=>{
 const slide=await api();const context=slide.portableVeoReferenceContext();const sources=CANDIDATES.map(c=>Uint8Array.from(readFileSync(join(ROOT,c.file))));const request=bytes=>({packages:[{identity:"@galerina/test",version:"1.0.0-beta.18",exports:CANDIDATES.map((c,i)=>({name:c.flow,sourceFlowName:c.flow,sourceBytes:bytes[i]})),dependencies:[],resources:[]}],context,gates:GATES});const compiled=slide.compileCheckedFungiPackageSet(request(sources));if(compiled.verdict!==1){const failures=[];for(let i=0;i<CANDIDATES.length;i++){const c=CANDIDATES[i];const one=slide.compileCheckedFungiPackageSet({packages:[{identity:"@galerina/test",version:"1.0.0-beta.18",exports:[{name:c.flow,sourceFlowName:c.flow,sourceBytes:sources[i]}],dependencies:[],resources:[]}],context,gates:GATES});if(one.verdict!==1)failures.push(c.flow+":"+JSON.stringify(one));}assert.fail("physical SLIDE compilation refused: "+failures.join(", "));}const changed=sources.map(source=>Uint8Array.from(source));changed[0][0]^=1;assert.equal(slide.compileCheckedFungiPackageSet(request(changed)).verdict,-1);const parent=await mkdtemp(join(tmpdir(),"galerina-wave-18-"));const out=join(parent,"published");
 try{const published=await slide.publishCheckedFungiPackageBuild({packageBuildHandle:compiled.packageBuildHandle,outputDirectory:out});assert.equal(published.verdict,1,JSON.stringify(published));const files=published.outputFiles.filter(n=>n.endsWith(".slide"));assert.equal(files.length,40);let last;for(const c of CANDIDATES){const prepared=await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:c.flow,context,gates:GATES});assert.equal(prepared.verdict,1,c.flow);const receipt=slide.executeTypedCheckedFungiPackagePublication(prepared.packageExecutionHandle,c.args,undefined);assert.equal(receipt.status,"SUCCEEDED_PHYSICAL_REFERENCE_ONLY",c.flow);const verified=slide.verifyTypedCheckedFungiPackageReceipt(receipt,expectation(receipt));assert.equal(verified.verdict,1,c.flow);assert.equal(verified.value,c.expected,c.flow);assert.equal(verified.authorityReleased,false,c.flow);last=receipt;}assert.equal(slide.verifyTypedCheckedFungiPackageReceipt({...last,receiptDigest:"sha256:"+"0".repeat(64)},expectation(last)).verdict,-1);const path=join(out,files[0]);const bytes=await readFile(path);bytes[0]^=1;await writeFile(path,bytes);assert.equal((await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:CANDIDATES[0].flow,context,gates:GATES})).verdict,-1);}finally{await rm(parent,{recursive:true,force:true});}
});
