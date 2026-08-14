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
  ["boot-composition-refuse-status.fungi","bootCompositionRefuseStatusCore",3,"boot_composition_refusal_bound"],
  ["boot-composition-data-shape-status.fungi","bootCompositionDataShapeStatusCore",5,"boot_composition_data_shape_exact"],
  ["boot-composition-canonical-instant-status.fungi","bootCompositionCanonicalInstantStatusCore",3,"boot_composition_instant_canonical"],
  ["boot-composition-provenance-status.fungi","bootCompositionProvenanceStatusCore",5,"boot_composition_provenance_valid"],
  ["boot-composition-policy-shape-status.fungi","bootCompositionPolicyShapeStatusCore",5,"boot_composition_policy_valid"],
  ["boot-composition-slide-match-status.fungi","bootCompositionSlideMatchStatusCore",5,"boot_composition_slide_matched"],
  ["boot-composition-durability-match-status.fungi","bootCompositionDurabilityMatchStatusCore",5,"boot_composition_durability_matched"],
  ["boot-composition-admit-status.fungi","bootCompositionAdmitStatusCore",5,"boot_composition_candidate_admitted"],
  ["boot-composition-guard-status.fungi","bootCompositionGuardStatusCore",3,"boot_composition_candidate_authenticated"],
  ["durability-admission-plain-shape-status.fungi","durabilityAdmissionPlainShapeStatusCore",4,"durability_admission_shape_plain"],
  ["durability-admission-string-array-status.fungi","durabilityAdmissionStringArrayStatusCore",4,"durability_admission_array_canonical"],
  ["durability-admission-descriptor-status.fungi","durabilityAdmissionDescriptorStatusCore",5,"durability_adapter_descriptor_valid"],
  ["durability-admission-host-status.fungi","durabilityAdmissionHostStatusCore",4,"durability_host_valid"],
  ["durability-admission-deny-status.fungi","durabilityAdmissionDenyStatusCore",4,"durability_admission_denied"],
  ["durability-admission-assess-status.fungi","durabilityAdmissionAssessStatusCore",5,"durability_candidate_assessed"],
  ["durability-evidence-freeze-keys-status.fungi","durabilityEvidenceFreezeKeysStatusCore",3,"durability_evidence_keys_frozen"],
  ["durability-evidence-refuse-status.fungi","durabilityEvidenceRefuseStatusCore",3,"durability_evidence_refusal_bound"],
  ["durability-evidence-plain-shape-status.fungi","durabilityEvidencePlainShapeStatusCore",4,"durability_evidence_shape_plain"],
  ["durability-evidence-boundaries-status.fungi","durabilityEvidenceBoundariesStatusCore",4,"durability_evidence_boundaries_canonical"],
  ["durability-evidence-shape-status.fungi","durabilityEvidenceShapeStatusCore",5,"durability_evidence_shape_valid"],
  ["durability-evidence-policy-status.fungi","durabilityEvidencePolicyStatusCore",5,"durability_evidence_policy_valid"],
  ["durability-evidence-ceiling-status.fungi","durabilityEvidenceCeilingStatusCore",4,"durability_evidence_claim_ceiling_held"],
  ["durability-evidence-boundary-equality-status.fungi","durabilityEvidenceBoundaryEqualityStatusCore",4,"durability_evidence_boundaries_equal"],
  ["durability-evidence-verify-status.fungi","durabilityEvidenceVerifyStatusCore",5,"durability_evidence_verified"],
  ["durability-evidence-guard-status.fungi","durabilityEvidenceGuardStatusCore",3,"durability_evidence_authenticated"],
  ["registry-durability-profile-admit-status.fungi","registryDurabilityProfileAdmitStatusCore",5,"registry_durability_profile_admitted"],
  ["registry-durability-profile-guard-status.fungi","registryDurabilityProfileGuardStatusCore",3,"registry_durability_profile_authenticated"],
  ["registry-durability-rotation-match-status.fungi","registryDurabilityRotationMatchStatusCore",5,"registry_durability_rotation_matched"],
  ["registry-index-compare-status.fungi","registryIndexCompareStatusCore",3,"registry_index_order_classified"],
  ["registry-index-signing-input-status.fungi","registryIndexSigningInputStatusCore",3,"registry_index_signing_input_ready"],
  ["registry-index-signature-preimage-status.fungi","registryIndexSignaturePreimageStatusCore",4,"registry_index_preimage_ready"],
  ["registry-index-build-status.fungi","registryIndexBuildStatusCore",4,"registry_index_built"],
  ["registry-index-sign-status.fungi","registryIndexSignStatusCore",4,"registry_index_signed"],
  ["registry-index-hybrid-sign-status.fungi","registryIndexHybridSignStatusCore",5,"registry_index_hybrid_signed"],
  ["registry-index-freshness-status.fungi","registryIndexFreshnessStatusCore",3,"registry_index_freshness_classified"],
  ["registry-index-verify-status.fungi","registryIndexVerifyStatusCore",5,"registry_index_verified"],
  ["registry-index-v2-verify-status.fungi","registryIndexV2VerifyStatusCore",5,"registry_index_v2_verified"],
  ["registry-index-component-status.fungi","registryIndexComponentStatusCore",5,"registry_index_component_verified"],
  ["registry-index-lookup-status.fungi","registryIndexLookupStatusCore",5,"registry_index_lookup_resolved"],
  ["registry-index-policy-status.fungi","registryIndexPolicyStatusCore",4,"registry_index_policy_checked"],
].map(([file,flow,count,expected])=>Object.freeze({file,flow,args:Array(count).fill(true),expected})));

async function api(){const load=async p=>import(pathToFileURL(join(SLIDE_ROOT,"src",p)).href);return {...await load("checked-fungi-package-compiler.mjs"),...await load("checked-fungi-package-file.mjs"),...await load("checked-fungi-package-publication-loader.mjs"),...await load("safe-value-envelope.mjs"),...await load("portable-veo.mjs")};}
function expectation(r){return {packageSetDigest:r.packageSetDigest,packageIdentity:r.packageIdentity,exportName:r.exportName,receiptDigest:r.receiptDigest,safeValueTypeId:r.safeValueTypeId,safeValueStateId:r.safeValueStateId,safeValueProvenanceDigest:r.safeValueProvenanceDigest};}

it("publishes and independently re-admits all 40 wave-20 source decisions through physical SLIDE/VOK",{skip:!AVAILABLE},async()=>{
 const slide=await api();const context=slide.portableVeoReferenceContext();const sources=CANDIDATES.map(c=>Uint8Array.from(readFileSync(join(ROOT,c.file))));const request=bytes=>({packages:[{identity:"@galerina/test",version:"1.0.0-beta.20",exports:CANDIDATES.map((c,i)=>({name:c.flow,sourceFlowName:c.flow,sourceBytes:bytes[i]})),dependencies:[],resources:[]}],context,gates:GATES});const compiled=slide.compileCheckedFungiPackageSet(request(sources));if(compiled.verdict!==1){const failures=[];for(let i=0;i<CANDIDATES.length;i++){const c=CANDIDATES[i];const one=slide.compileCheckedFungiPackageSet({packages:[{identity:"@galerina/test",version:"1.0.0-beta.20",exports:[{name:c.flow,sourceFlowName:c.flow,sourceBytes:sources[i]}],dependencies:[],resources:[]}],context,gates:GATES});if(one.verdict!==1)failures.push(c.flow+":"+JSON.stringify(one));}assert.fail("physical SLIDE compilation refused: "+failures.join(", "));}const changed=sources.map(source=>Uint8Array.from(source));changed[0][0]^=1;assert.equal(slide.compileCheckedFungiPackageSet(request(changed)).verdict,-1);const parent=await mkdtemp(join(tmpdir(),"galerina-wave-20-"));const out=join(parent,"published");
 try{const published=await slide.publishCheckedFungiPackageBuild({packageBuildHandle:compiled.packageBuildHandle,outputDirectory:out});assert.equal(published.verdict,1,JSON.stringify(published));const files=published.outputFiles.filter(n=>n.endsWith(".slide"));assert.equal(files.length,40);let last;for(const c of CANDIDATES){const prepared=await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:c.flow,context,gates:GATES});assert.equal(prepared.verdict,1,c.flow);const receipt=slide.executeTypedCheckedFungiPackagePublication(prepared.packageExecutionHandle,c.args,undefined);assert.equal(receipt.status,"SUCCEEDED_PHYSICAL_REFERENCE_ONLY",c.flow);const verified=slide.verifyTypedCheckedFungiPackageReceipt(receipt,expectation(receipt));assert.equal(verified.verdict,1,c.flow);assert.equal(verified.value,c.expected,c.flow);assert.equal(verified.authorityReleased,false,c.flow);last=receipt;}assert.equal(slide.verifyTypedCheckedFungiPackageReceipt({...last,receiptDigest:"sha256:"+"0".repeat(64)},expectation(last)).verdict,-1);const path=join(out,files[0]);const bytes=await readFile(path);bytes[0]^=1;await writeFile(path,bytes);assert.equal((await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:CANDIDATES[0].flow,context,gates:GATES})).verdict,-1);}finally{await rm(parent,{recursive:true,force:true});}
});
