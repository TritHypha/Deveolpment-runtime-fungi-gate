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
  ["substrate-odd-positive-status.fungi","substrateOddPositiveStatusCore",4,"substrate_odd_positive"],
  ["substrate-probability-assert-status.fungi","substrateProbabilityAssertStatusCore",5,"substrate_probability_valid"],
  ["substrate-trit-assert-status.fungi","substrateTritAssertStatusCore",3,"substrate_trit_valid"],
  ["substrate-clamp-status.fungi","substrateClampStatusCore",4,"substrate_value_clamped"],
  ["substrate-effective-verdict-status.fungi","substrateEffectiveVerdictStatusCore",3,"substrate_verdict_effective"],
  ["substrate-adversarial-error-status.fungi","substrateAdversarialErrorStatusCore",6,"substrate_adversarial_error_measured"],
  ["substrate-fnv-status.fungi","substrateFnvStatusCore",4,"substrate_fnv_built"],
  ["substrate-majority-vote-status.fungi","substrateMajorityVoteStatusCore",4,"substrate_majority_selected"],
  ["substrate-stream-build-status.fungi","substrateStreamBuildStatusCore",5,"substrate_stream_built"],
  ["substrate-mulberry-state-status.fungi","substrateMulberryStateStatusCore",4,"substrate_mulberry_state_ready"],
  ["substrate-single-lane-probability-status.fungi","substrateSingleLaneProbabilityStatusCore",4,"substrate_single_lane_probability_built"],
  ["substrate-params-validate-status.fungi","substrateParamsValidateStatusCore",6,"substrate_params_validated"],
  ["substrate-snapshot-build-status.fungi","substrateSnapshotBuildStatusCore",5,"substrate_snapshot_built"],
  ["substrate-snapshot-canonical-status.fungi","substrateSnapshotCanonicalStatusCore",4,"substrate_snapshot_canonical"],
  ["governance-all-of-status.fungi","governanceAllOfStatusCore",3,"governance_all_of_folded"],
  ["governance-any-of-status.fungi","governanceAnyOfStatusCore",3,"governance_any_of_folded"],
  ["governance-authorize-status.fungi","governanceAuthorizeStatusCore",3,"governance_authorization_built"],
  ["governance-collapse-status.fungi","governanceCollapseStatusCore",3,"governance_decision_collapsed"],
  ["governance-confidence-collapse-status.fungi","governanceConfidenceCollapseStatusCore",5,"governance_confidence_collapsed"],
  ["governance-consensus-status.fungi","governanceConsensusStatusCore",4,"governance_consensus_selected"],
  ["governance-boundary-decision-status.fungi","governanceBoundaryDecisionStatusCore",4,"governance_boundary_decided"],
  ["governance-and-status.fungi","governanceAndStatusCore",4,"governance_and_built"],
  ["governance-tensor-and-status.fungi","governanceTensorAndStatusCore",5,"governance_tensor_and_built"],
  ["governance-tensor-2d-status.fungi","governanceTensor2dStatusCore",5,"governance_tensor_2d_built"],
  ["governance-not-status.fungi","governanceNotStatusCore",3,"governance_not_built"],
  ["governance-or-status.fungi","governanceOrStatusCore",4,"governance_or_built"],
  ["tower-runtime-class-status.fungi","towerRuntimeClassStatusCore",3,"tower_runtime_class_bound"],
  ["tower-runtime-constructor-status.fungi","towerRuntimeConstructorStatusCore",5,"tower_runtime_constructed"],
  ["tower-runtime-load-status.fungi","towerRuntimeLoadStatusCore",6,"tower_runtime_loaded"],
  ["tower-runtime-execute-status.fungi","towerRuntimeExecuteStatusCore",5,"tower_runtime_executed"],
  ["tower-runtime-erase-status.fungi","towerRuntimeEraseStatusCore",5,"tower_runtime_erased"],
  ["tower-runtime-evict-status.fungi","towerRuntimeEvictStatusCore",5,"tower_runtime_evicted"],
  ["tower-runtime-active-count-status.fungi","towerRuntimeActiveCountStatusCore",3,"tower_runtime_active_count_built"],
  ["tower-runtime-audit-status.fungi","towerRuntimeAuditStatusCore",3,"tower_runtime_audit_returned"],
  ["tower-runtime-lifecycle-status.fungi","towerRuntimeLifecycleStatusCore",3,"tower_runtime_lifecycle_returned"],
  ["tpl-add-status.fungi","tplAddStatusCore",4,"tpl_add_built"],
  ["tpl-as-trit-status.fungi","tplAsTritStatusCore",3,"tpl_trit_admitted"],
  ["tpl-assert-trit-status.fungi","tplAssertTritStatusCore",4,"tpl_trit_validated"],
  ["tpl-carry-status.fungi","tplCarryStatusCore",4,"tpl_carry_built"],
  ["tpl-consensus-status.fungi","tplConsensusStatusCore",5,"tpl_consensus_built"],
].map(([file,flow,count,expected])=>Object.freeze({file,flow,args:Array(count).fill(true),expected})));

async function api(){const load=async p=>import(pathToFileURL(join(SLIDE_ROOT,"src",p)).href);return {...await load("checked-fungi-package-compiler.mjs"),...await load("checked-fungi-package-file.mjs"),...await load("checked-fungi-package-publication-loader.mjs"),...await load("safe-value-envelope.mjs"),...await load("portable-veo.mjs")};}
function expectation(r){return {packageSetDigest:r.packageSetDigest,packageIdentity:r.packageIdentity,exportName:r.exportName,receiptDigest:r.receiptDigest,safeValueTypeId:r.safeValueTypeId,safeValueStateId:r.safeValueStateId,safeValueProvenanceDigest:r.safeValueProvenanceDigest};}

it("publishes and independently re-admits all 40 wave-23 source decisions through physical SLIDE/VOK",{skip:!AVAILABLE},async()=>{
 const slide=await api();const context=slide.portableVeoReferenceContext();const sources=CANDIDATES.map(c=>Uint8Array.from(readFileSync(join(ROOT,c.file))));const request=bytes=>({packages:[{identity:"@galerina/test",version:"1.0.0-beta.23",exports:CANDIDATES.map((c,i)=>({name:c.flow,sourceFlowName:c.flow,sourceBytes:bytes[i]})),dependencies:[],resources:[]}],context,gates:GATES});const compiled=slide.compileCheckedFungiPackageSet(request(sources));if(compiled.verdict!==1){const failures=[];for(let i=0;i<CANDIDATES.length;i++){const c=CANDIDATES[i];const one=slide.compileCheckedFungiPackageSet({packages:[{identity:"@galerina/test",version:"1.0.0-beta.23",exports:[{name:c.flow,sourceFlowName:c.flow,sourceBytes:sources[i]}],dependencies:[],resources:[]}],context,gates:GATES});if(one.verdict!==1)failures.push(c.flow+":"+JSON.stringify(one));}assert.fail("physical SLIDE compilation refused: "+failures.join(", "));}const changed=sources.map(source=>Uint8Array.from(source));changed[0][0]^=1;assert.equal(slide.compileCheckedFungiPackageSet(request(changed)).verdict,-1);const parent=await mkdtemp(join(tmpdir(),"galerina-wave-23-"));const out=join(parent,"published");
 try{const published=await slide.publishCheckedFungiPackageBuild({packageBuildHandle:compiled.packageBuildHandle,outputDirectory:out});assert.equal(published.verdict,1,JSON.stringify(published));const files=published.outputFiles.filter(n=>n.endsWith(".slide"));assert.equal(files.length,40);let last;for(const c of CANDIDATES){const prepared=await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:c.flow,context,gates:GATES});assert.equal(prepared.verdict,1,c.flow);const receipt=slide.executeTypedCheckedFungiPackagePublication(prepared.packageExecutionHandle,c.args,undefined);assert.equal(receipt.status,"SUCCEEDED_PHYSICAL_REFERENCE_ONLY",c.flow);const verified=slide.verifyTypedCheckedFungiPackageReceipt(receipt,expectation(receipt));assert.equal(verified.verdict,1,c.flow);assert.equal(verified.value,c.expected,c.flow);assert.equal(verified.authorityReleased,false,c.flow);last=receipt;}assert.equal(slide.verifyTypedCheckedFungiPackageReceipt({...last,receiptDigest:"sha256:"+"0".repeat(64)},expectation(last)).verdict,-1);const path=join(out,files[0]);const bytes=await readFile(path);bytes[0]^=1;await writeFile(path,bytes);assert.equal((await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:CANDIDATES[0].flow,context,gates:GATES})).verdict,-1);}finally{await rm(parent,{recursive:true,force:true});}
});
