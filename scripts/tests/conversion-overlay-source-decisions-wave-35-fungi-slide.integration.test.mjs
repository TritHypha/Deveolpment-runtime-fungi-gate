import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { it } from "node:test";

const SLIDE_ROOT=process.env.GALERINA_SLIDE_REPO,AVAILABLE=typeof SLIDE_ROOT==="string"&&existsSync(join(SLIDE_ROOT,"src","checked-fungi-package-compiler.mjs")),ROOT=join(process.cwd(),"packages-galerina","galerina-test","src","self-hosted","conversion-overlays"),GATES=Object.freeze({identity:1,provenance:1,target:1,effects:1,policy:1,revocation:1,validation:1,memory:1});
const CANDIDATES=Object.freeze([
  ["governance-verifier-describe-expr-status.fungi","governanceVerifierDescribeExprStatusCore",6,"governance_verifier_describe_expr_built"],
  ["governance-verifier-verify-network-wildcard-ban-status.fungi","governanceVerifierVerifyNetworkWildcardBanStatusCore",6,"governance_verifier_verify_network_wildcard_ban_built"],
  ["governance-verifier-verify-domain-guard-conformance-status.fungi","governanceVerifierVerifyDomainGuardConformanceStatusCore",6,"governance_verifier_verify_domain_guard_conformance_built"],
  ["governance-verifier-verify-tenant-isolation-status.fungi","governanceVerifierVerifyTenantIsolationStatusCore",6,"governance_verifier_verify_tenant_isolation_built"],
  ["governance-verifier-verify-vault-effects-status.fungi","governanceVerifierVerifyVaultEffectsStatusCore",6,"governance_verifier_verify_vault_effects_built"],
  ["governance-verifier-verify-limits-block-status.fungi","governanceVerifierVerifyLimitsBlockStatusCore",6,"governance_verifier_verify_limits_block_built"],
  ["governance-verifier-verify-termination-annotation-status.fungi","governanceVerifierVerifyTerminationAnnotationStatusCore",6,"governance_verifier_verify_termination_annotation_built"],
  ["governance-verifier-verify-residency-hardening-block-status.fungi","governanceVerifierVerifyResidencyHardeningBlockStatusCore",6,"governance_verifier_verify_residency_hardening_block_built"],
  ["governance-verifier-flow-is-secret-shaped-status.fungi","governanceVerifierFlowIsSecretShapedStatusCore",6,"governance_verifier_flow_is_secret_shaped_built"],
  ["governance-verifier-has-secret-dependent-timing-status.fungi","governanceVerifierHasSecretDependentTimingStatusCore",6,"governance_verifier_has_secret_dependent_timing_built"],
  ["governance-verifier-verify-physical-hardening-block-status.fungi","governanceVerifierVerifyPhysicalHardeningBlockStatusCore",6,"governance_verifier_verify_physical_hardening_block_built"],
  ["governance-verifier-verify-liability-block-status.fungi","governanceVerifierVerifyLiabilityBlockStatusCore",6,"governance_verifier_verify_liability_block_built"],
  ["governance-verifier-verify-policy-hierarchy-status.fungi","governanceVerifierVerifyPolicyHierarchyStatusCore",6,"governance_verifier_verify_policy_hierarchy_built"],
  ["governance-verifier-verify-policy-monotonicity-status.fungi","governanceVerifierVerifyPolicyMonotonicityStatusCore",6,"governance_verifier_verify_policy_monotonicity_built"],
  ["governance-verifier-verify-epilogue-block-status.fungi","governanceVerifierVerifyEpilogueBlockStatusCore",6,"governance_verifier_verify_epilogue_block_built"],
  ["governance-verifier-verify-trap-decls-status.fungi","governanceVerifierVerifyTrapDeclsStatusCore",6,"governance_verifier_verify_trap_decls_built"],
  ["governance-verifier-verify-static-decls-status.fungi","governanceVerifierVerifyStaticDeclsStatusCore",6,"governance_verifier_verify_static_decls_built"],
  ["governance-verifier-verify-bitfield-decls-status.fungi","governanceVerifierVerifyBitfieldDeclsStatusCore",6,"governance_verifier_verify_bitfield_decls_built"],
  ["governance-verifier-verify-governed-flows-status.fungi","governanceVerifierVerifyGovernedFlowsStatusCore",6,"governance_verifier_verify_governed_flows_built"],
  ["governance-verifier-verify-assimilated-plugins-status.fungi","governanceVerifierVerifyAssimilatedPluginsStatusCore",6,"governance_verifier_verify_assimilated_plugins_built"],
  ["governance-verifier-verify-gate-blocks-status.fungi","governanceVerifierVerifyGateBlocksStatusCore",6,"governance_verifier_verify_gate_blocks_built"],
  ["governance-verifier-verify-access-blocks-status.fungi","governanceVerifierVerifyAccessBlocksStatusCore",6,"governance_verifier_verify_access_blocks_built"],
  ["governance-verifier-check-match-exhaustiveness-status.fungi","governanceVerifierCheckMatchExhaustivenessStatusCore",6,"governance_verifier_check_match_exhaustiveness_built"],
  ["governance-verifier-walk-for-match-expr-status.fungi","governanceVerifierWalkForMatchExprStatusCore",6,"governance_verifier_walk_for_match_expr_built"],
  ["governance-verifier-verify-match-exhaustiveness-status.fungi","governanceVerifierVerifyMatchExhaustivenessStatusCore",6,"governance_verifier_verify_match_exhaustiveness_built"],
  ["governance-verifier-verify-governance-status.fungi","governanceVerifierVerifyGovernanceStatusCore",6,"governance_verifier_verify_governance_built"],
  ["gpu-plan-build-web-gpu-plan-status.fungi","gpuPlanBuildWebGpuPlanStatusCore",6,"gpu_plan_build_web_gpu_plan_built"],
  ["gpu-plan-build-npu-plan-status.fungi","gpuPlanBuildNpuPlanStatusCore",6,"gpu_plan_build_npu_plan_built"],
  ["gpu-plan-parse-shape-status.fungi","gpuPlanParseShapeStatusCore",6,"gpu_plan_parse_shape_built"],
  ["gpu-plan-build-apu-shared-memory-plan-status.fungi","gpuPlanBuildApuSharedMemoryPlanStatusCore",6,"gpu_plan_build_apu_shared_memory_plan_built"],
  ["hardening-residency-stricter-residency-status.fungi","hardeningResidencyStricterResidencyStatusCore",6,"hardening_residency_stricter_residency_built"],
  ["hardening-residency-at-least-as-strict-status.fungi","hardeningResidencyAtLeastAsStrictStatusCore",6,"hardening_residency_at_least_as_strict_built"],
  ["hardening-residency-derive-auto-status.fungi","hardeningResidencyDeriveAutoStatusCore",6,"hardening_residency_derive_auto_built"],
  ["hardening-residency-reconcile-explicit-status.fungi","hardeningResidencyReconcileExplicitStatusCore",6,"hardening_residency_reconcile_explicit_built"],
  ["hardening-residency-pick-two-valued-status.fungi","hardeningResidencyPickTwoValuedStatusCore",6,"hardening_residency_pick_two_valued_built"],
  ["hardening-residency-resolve-host-status.fungi","hardeningResidencyResolveHostStatusCore",6,"hardening_residency_resolve_host_built"],
  ["hardening-residency-can-honour-status.fungi","hardeningResidencyCanHonourStatusCore",6,"hardening_residency_can_honour_built"],
  ["hardening-residency-trust-name-status.fungi","hardeningResidencyTrustNameStatusCore",6,"hardening_residency_trust_name_built"],
  ["hardening-residency-refute-status.fungi","hardeningResidencyRefuteStatusCore",6,"hardening_residency_refute_built"],
  ["hardening-residency-combine-trust-status.fungi","hardeningResidencyCombineTrustStatusCore",6,"hardening_residency_combine_trust_built"],
].map(([file,flow,count,expected])=>Object.freeze({file,flow,args:Array(count).fill(true),expected})));

async function api(){const load=async p=>import(pathToFileURL(join(SLIDE_ROOT,"src",p)).href);return {...await load("checked-fungi-package-compiler.mjs"),...await load("checked-fungi-package-file.mjs"),...await load("checked-fungi-package-publication-loader.mjs"),...await load("safe-value-envelope.mjs"),...await load("portable-veo.mjs")};}
function expectation(r){return {packageSetDigest:r.packageSetDigest,packageIdentity:r.packageIdentity,exportName:r.exportName,receiptDigest:r.receiptDigest,safeValueTypeId:r.safeValueTypeId,safeValueStateId:r.safeValueStateId,safeValueProvenanceDigest:r.safeValueProvenanceDigest};}

it("publishes and independently re-admits all 40 wave-35 source decisions through physical SLIDE/VOK",{skip:!AVAILABLE},async()=>{
  const slide=await api(),context=slide.portableVeoReferenceContext(),sources=CANDIDATES.map(c=>Uint8Array.from(readFileSync(join(ROOT,c.file)))),request=bytes=>({packages:[{identity:"@galerina/test",version:"1.0.0-beta.35",exports:CANDIDATES.map((c,i)=>({name:c.flow,sourceFlowName:c.flow,sourceBytes:bytes[i]})),dependencies:[],resources:[]}],context,gates:GATES}),compiled=slide.compileCheckedFungiPackageSet(request(sources));
  assert.equal(compiled.verdict,1,JSON.stringify(compiled));
  const changed=sources.map(source=>Uint8Array.from(source));changed[0][0]^=1;assert.equal(slide.compileCheckedFungiPackageSet(request(changed)).verdict,-1);
  const parent=await mkdtemp(join(tmpdir(),"galerina-wave-35-")),out=join(parent,"published");
  try{
    const published=await slide.publishCheckedFungiPackageBuild({packageBuildHandle:compiled.packageBuildHandle,outputDirectory:out});assert.equal(published.verdict,1,JSON.stringify(published));assert.equal(published.outputFiles.filter(n=>n.endsWith(".slide")).length,40);
    let last;for(const c of CANDIDATES){const prepared=await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:c.flow,context,gates:GATES});assert.equal(prepared.verdict,1,c.flow);const receipt=slide.executeTypedCheckedFungiPackagePublication(prepared.packageExecutionHandle,c.args,undefined),verified=slide.verifyTypedCheckedFungiPackageReceipt(receipt,expectation(receipt));assert.equal(verified.verdict,1,c.flow);assert.equal(verified.value,c.expected,c.flow);assert.equal(verified.authorityReleased,false,c.flow);last=receipt;}
    assert.equal(slide.verifyTypedCheckedFungiPackageReceipt({...last,receiptDigest:"sha256:"+"0".repeat(64)},expectation(last)).verdict,-1);const path=join(out,published.outputFiles.find(n=>n.endsWith(".slide"))),bytes=await readFile(path);bytes[0]^=1;await writeFile(path,bytes);assert.equal((await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:CANDIDATES[0].flow,context,gates:GATES})).verdict,-1);
  }finally{await rm(parent,{recursive:true,force:true});}
});
