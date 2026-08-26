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
  ["compiler-substrate-block-status.fungi","compilerSubstrateBlockStatusCore",3,"compiler_substrate_block_found"],
  ["compiler-substrate-decl-text-status.fungi","compilerSubstrateDeclTextStatusCore",3,"compiler_substrate_decl_text_built"],
  ["compiler-substrate-field-segment-status.fungi","compilerSubstrateFieldSegmentStatusCore",4,"compiler_substrate_field_segment_built"],
  ["compiler-substrate-lane-field-status.fungi","compilerSubstrateLaneFieldStatusCore",4,"compiler_substrate_lane_field_built"],
  ["compiler-substrate-tolerance-field-status.fungi","compilerSubstrateToleranceFieldStatusCore",4,"compiler_substrate_tolerance_field_built"],
  ["compiler-substrate-redundancy-field-status.fungi","compilerSubstrateRedundancyFieldStatusCore",5,"compiler_substrate_redundancy_field_built"],
  ["compiler-substrate-indeterminate-field-status.fungi","compilerSubstrateIndeterminateFieldStatusCore",5,"compiler_substrate_indeterminate_field_built"],
  ["compiler-substrate-infer-status.fungi","compilerSubstrateInferStatusCore",5,"compiler_substrate_inference_built"],
  ["compiler-substrate-violations-status.fungi","compilerSubstrateViolationsStatusCore",6,"compiler_substrate_violations_built"],
  ["governance-match-check-status.fungi","governanceMatchCheckStatusCore",4,"governance_match_checked"],
  ["governance-expr-describe-status.fungi","governanceExprDescribeStatusCore",3,"governance_expr_described"],
  ["governance-secret-shape-status.fungi","governanceSecretShapeStatusCore",4,"governance_secret_shape_built"],
  ["governance-volatility-level-status.fungi","governanceVolatilityLevelStatusCore",4,"governance_volatility_built"],
  ["governance-result-status.fungi","governanceResultStatusCore",3,"governance_result_built"],
  ["governance-secret-timing-status.fungi","governanceSecretTimingStatusCore",4,"governance_secret_timing_built"],
  ["governance-static-eval-status.fungi","governanceStaticEvalStatusCore",4,"governance_static_value_built"],
  ["governance-verifier-run-status.fungi","governanceVerifierRunStatusCore",5,"governance_verifier_run_built"],
  ["governance-access-block-status.fungi","governanceAccessBlockStatusCore",4,"governance_access_block_checked"],
  ["governance-architecture-block-status.fungi","governanceArchitectureBlockStatusCore",4,"governance_architecture_block_checked"],
  ["governance-architecture-stability-status.fungi","governanceArchitectureStabilityStatusCore",4,"governance_architecture_stability_checked"],
  ["governance-assimilated-plugin-status.fungi","governanceAssimilatedPluginStatusCore",4,"governance_assimilated_plugins_checked"],
  ["governance-assuming-block-status.fungi","governanceAssumingBlockStatusCore",4,"governance_assuming_blocks_checked"],
  ["governance-bitfield-decl-status.fungi","governanceBitfieldDeclStatusCore",4,"governance_bitfields_checked"],
  ["governance-domain-guard-status.fungi","governanceDomainGuardStatusCore",4,"governance_domain_guards_checked"],
  ["governance-epilogue-block-status.fungi","governanceEpilogueBlockStatusCore",4,"governance_epilogue_checked"],
  ["governance-flow-status.fungi","governanceFlowStatusCore",5,"governance_flow_checked"],
  ["governance-gate-block-status.fungi","governanceGateBlockStatusCore",4,"governance_gates_checked"],
  ["governance-governed-flow-status.fungi","governanceGovernedFlowStatusCore",4,"governance_governed_flows_checked"],
  ["governance-invariant-block-status.fungi","governanceInvariantBlockStatusCore",4,"governance_invariants_checked"],
  ["governance-liability-block-status.fungi","governanceLiabilityBlockStatusCore",4,"governance_liability_checked"],
  ["governance-limits-block-status.fungi","governanceLimitsBlockStatusCore",4,"governance_limits_checked"],
  ["governance-match-exhaustiveness-status.fungi","governanceMatchExhaustivenessStatusCore",4,"governance_match_exhaustiveness_checked"],
  ["governance-network-wildcard-status.fungi","governanceNetworkWildcardStatusCore",4,"governance_network_wildcard_checked"],
  ["governance-physical-hardening-status.fungi","governancePhysicalHardeningStatusCore",4,"governance_physical_hardening_checked"],
  ["governance-policy-hierarchy-status.fungi","governancePolicyHierarchyStatusCore",4,"governance_policy_hierarchy_checked"],
  ["governance-policy-monotonicity-status.fungi","governancePolicyMonotonicityStatusCore",4,"governance_policy_monotonicity_checked"],
  ["governance-residency-hardening-status.fungi","governanceResidencyHardeningStatusCore",4,"governance_residency_hardening_checked"],
  ["governance-static-decl-status.fungi","governanceStaticDeclStatusCore",4,"governance_static_decls_checked"],
  ["governance-tenant-isolation-status.fungi","governanceTenantIsolationStatusCore",4,"governance_tenant_isolation_checked"],
  ["governance-termination-annotation-status.fungi","governanceTerminationAnnotationStatusCore",4,"governance_termination_checked"],
].map(([file,flow,count,expected])=>Object.freeze({file,flow,args:Array(count).fill(true),expected})));

async function api(){const load=async p=>import(pathToFileURL(join(SLIDE_ROOT,"src",p)).href);return {...await load("checked-fungi-package-compiler.mjs"),...await load("checked-fungi-package-file.mjs"),...await load("checked-fungi-package-publication-loader.mjs"),...await load("safe-value-envelope.mjs"),...await load("portable-veo.mjs")};}
function expectation(r){return {packageSetDigest:r.packageSetDigest,packageIdentity:r.packageIdentity,exportName:r.exportName,receiptDigest:r.receiptDigest,safeValueTypeId:r.safeValueTypeId,safeValueStateId:r.safeValueStateId,safeValueProvenanceDigest:r.safeValueProvenanceDigest};}

it("publishes and independently re-admits all 40 wave-24 source decisions through physical SLIDE/VOK",{skip:!AVAILABLE},async()=>{
 const slide=await api();const context=slide.portableVeoReferenceContext();const sources=CANDIDATES.map(c=>Uint8Array.from(readFileSync(join(ROOT,c.file))));const request=bytes=>({packages:[{identity:"@galerina/test",version:"1.0.0-beta.24",exports:CANDIDATES.map((c,i)=>({name:c.flow,sourceFlowName:c.flow,sourceBytes:bytes[i]})),dependencies:[],resources:[]}],context,gates:GATES});const compiled=slide.compileCheckedFungiPackageSet(request(sources));if(compiled.verdict!==1){const failures=[];for(let i=0;i<CANDIDATES.length;i++){const c=CANDIDATES[i];const one=slide.compileCheckedFungiPackageSet({packages:[{identity:"@galerina/test",version:"1.0.0-beta.24",exports:[{name:c.flow,sourceFlowName:c.flow,sourceBytes:sources[i]}],dependencies:[],resources:[]}],context,gates:GATES});if(one.verdict!==1)failures.push(c.flow+":"+JSON.stringify(one));}assert.fail("physical SLIDE compilation refused: "+failures.join(", "));}const changed=sources.map(source=>Uint8Array.from(source));changed[0][0]^=1;assert.equal(slide.compileCheckedFungiPackageSet(request(changed)).verdict,-1);const parent=await mkdtemp(join(tmpdir(),"galerina-wave-24-"));const out=join(parent,"published");
 try{const published=await slide.publishCheckedFungiPackageBuild({packageBuildHandle:compiled.packageBuildHandle,outputDirectory:out});assert.equal(published.verdict,1,JSON.stringify(published));const files=published.outputFiles.filter(n=>n.endsWith(".slide"));assert.equal(files.length,40);let last;for(const c of CANDIDATES){const prepared=await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:c.flow,context,gates:GATES});assert.equal(prepared.verdict,1,c.flow);const receipt=slide.executeTypedCheckedFungiPackagePublication(prepared.packageExecutionHandle,c.args,undefined);assert.equal(receipt.status,"SUCCEEDED_PHYSICAL_REFERENCE_ONLY",c.flow);const verified=slide.verifyTypedCheckedFungiPackageReceipt(receipt,expectation(receipt));assert.equal(verified.verdict,1,c.flow);assert.equal(verified.value,c.expected,c.flow);assert.equal(verified.authorityReleased,false,c.flow);last=receipt;}assert.equal(slide.verifyTypedCheckedFungiPackageReceipt({...last,receiptDigest:"sha256:"+"0".repeat(64)},expectation(last)).verdict,-1);const p=join(out,files[0]);const bytes=await readFile(p);bytes[0]^=1;await writeFile(p,bytes);assert.equal((await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:CANDIDATES[0].flow,context,gates:GATES})).verdict,-1);}finally{await rm(parent,{recursive:true,force:true});}
});
