import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { it } from "node:test";

const SLIDE_ROOT=process.env.GALERINA_SLIDE_REPO,AVAILABLE=typeof SLIDE_ROOT==="string"&&existsSync(join(SLIDE_ROOT,"src","checked-fungi-package-compiler.mjs")),ROOT=join(process.cwd(),"packages-ts","galerina-test","src","self-hosted","conversion-overlays"),GATES=Object.freeze({identity:1,provenance:1,target:1,effects:1,policy:1,revocation:1,validation:1,memory:1});
const CANDIDATES=Object.freeze([
  ["governance-verifier-has-authority-reason-status.fungi","governanceVerifierHasAuthorityReasonStatusCore",6,"governance_verifier_has_authority_reason_built"],
  ["governance-verifier-has-protected-value-declaration-status.fungi","governanceVerifierHasProtectedValueDeclarationStatusCore",6,"governance_verifier_has_protected_value_declaration_built"],
  ["governance-verifier-is-privileged-flow-status.fungi","governanceVerifierIsPrivilegedFlowStatusCore",6,"governance_verifier_is_privileged_flow_built"],
  ["governance-verifier-extract-response-denied-fields-status.fungi","governanceVerifierExtractResponseDeniedFieldsStatusCore",6,"governance_verifier_extract_response_denied_fields_built"],
  ["governance-verifier-extract-privacy-denied-response-fields-status.fungi","governanceVerifierExtractPrivacyDeniedResponseFieldsStatusCore",6,"governance_verifier_extract_privacy_denied_response_fields_built"],
  ["governance-verifier-binding-name-of-status.fungi","governanceVerifierBindingNameOfStatusCore",6,"governance_verifier_binding_name_of_built"],
  ["governance-verifier-collect-body-field-names-status.fungi","governanceVerifierCollectBodyFieldNamesStatusCore",6,"governance_verifier_collect_body_field_names_built"],
  ["governance-verifier-collect-fields-status.fungi","governanceVerifierCollectFieldsStatusCore",6,"governance_verifier_collect_fields_built"],
  ["governance-verifier-carry-of-status.fungi","governanceVerifierCarryOfStatusCore",6,"governance_verifier_carry_of_built"],
  ["governance-verifier-build-aliases-status.fungi","governanceVerifierBuildAliasesStatusCore",6,"governance_verifier_build_aliases_built"],
  ["governance-verifier-find-return-stmts-status.fungi","governanceVerifierFindReturnStmtsStatusCore",6,"governance_verifier_find_return_stmts_built"],
  ["governance-verifier-extract-required-context-status.fungi","governanceVerifierExtractRequiredContextStatusCore",6,"governance_verifier_extract_required_context_built"],
  ["governance-verifier-extract-value-classification-status.fungi","governanceVerifierExtractValueClassificationStatusCore",6,"governance_verifier_extract_value_classification_built"],
  ["governance-verifier-extract-safety-requirements-status.fungi","governanceVerifierExtractSafetyRequirementsStatusCore",6,"governance_verifier_extract_safety_requirements_built"],
  ["governance-verifier-extract-hardware-targets-status.fungi","governanceVerifierExtractHardwareTargetsStatusCore",6,"governance_verifier_extract_hardware_targets_built"],
  ["governance-verifier-is-context-field-accessed-status.fungi","governanceVerifierIsContextFieldAccessedStatusCore",6,"governance_verifier_is_context_field_accessed_built"],
  ["governance-verifier-extract-limits-fields-status.fungi","governanceVerifierExtractLimitsFieldsStatusCore",6,"governance_verifier_extract_limits_fields_built"],
  ["governance-verifier-canonical-limit-name-status.fungi","governanceVerifierCanonicalLimitNameStatusCore",6,"governance_verifier_canonical_limit_name_built"],
  ["governance-verifier-parse-limit-value-status.fungi","governanceVerifierParseLimitValueStatusCore",6,"governance_verifier_parse_limit_value_built"],
  ["governance-verifier-parse-flow-limit-decl-status.fungi","governanceVerifierParseFlowLimitDeclStatusCore",6,"governance_verifier_parse_flow_limit_decl_built"],
  ["governance-verifier-has-overly-broad-authority-status.fungi","governanceVerifierHasOverlyBroadAuthorityStatusCore",6,"governance_verifier_has_overly_broad_authority_built"],
  ["governance-verifier-extract-max-risk-liability-status.fungi","governanceVerifierExtractMaxRiskLiabilityStatusCore",6,"governance_verifier_extract_max_risk_liability_built"],
  ["governance-verifier-has-epilogue-block-status.fungi","governanceVerifierHasEpilogueBlockStatusCore",6,"governance_verifier_has_epilogue_block_built"],
  ["governance-verifier-has-recursive-call-status.fungi","governanceVerifierHasRecursiveCallStatusCore",6,"governance_verifier_has_recursive_call_built"],
  ["governance-verifier-has-recursive-call-walk-status.fungi","governanceVerifierHasRecursiveCallWalkStatusCore",6,"governance_verifier_has_recursive_call_walk_built"],
  ["governance-verifier-detect-intent-mismatch-status.fungi","governanceVerifierDetectIntentMismatchStatusCore",6,"governance_verifier_detect_intent_mismatch_built"],
  ["governance-verifier-extract-arena-limit-mb-status.fungi","governanceVerifierExtractArenaLimitMbStatusCore",6,"governance_verifier_extract_arena_limit_mb_built"],
  ["governance-verifier-collect-unresolved-identifiers-status.fungi","governanceVerifierCollectUnresolvedIdentifiersStatusCore",6,"governance_verifier_collect_unresolved_identifiers_built"],
  ["governance-verifier-collect-unresolved-identifiers-walk-status.fungi","governanceVerifierCollectUnresolvedIdentifiersWalkStatusCore",6,"governance_verifier_collect_unresolved_identifiers_walk_built"],
  ["governance-verifier-expr-references-result-status.fungi","governanceVerifierExprReferencesResultStatusCore",6,"governance_verifier_expr_references_result_built"],
  ["governance-verifier-class-status.fungi","governanceVerifierClassStatusCore",6,"governance_verifier_class_built"],
  ["governance-verifier-verify-status.fungi","governanceVerifierVerifyStatusCore",6,"governance_verifier_verify_built"],
  ["governance-verifier-get-result-status.fungi","governanceVerifierGetResultStatusCore",6,"governance_verifier_get_result_built"],
  ["governance-verifier-verify-flow-status.fungi","governanceVerifierVerifyFlowStatusCore",6,"governance_verifier_verify_flow_built"],
  ["governance-verifier-verify-assuming-blocks-status.fungi","governanceVerifierVerifyAssumingBlocksStatusCore",6,"governance_verifier_verify_assuming_blocks_built"],
  ["governance-verifier-verify-architecture-block-status.fungi","governanceVerifierVerifyArchitectureBlockStatusCore",6,"governance_verifier_verify_architecture_block_built"],
  ["governance-verifier-flow-volatility-level-status.fungi","governanceVerifierFlowVolatilityLevelStatusCore",6,"governance_verifier_flow_volatility_level_built"],
  ["governance-verifier-verify-architecture-stability-status.fungi","governanceVerifierVerifyArchitectureStabilityStatusCore",6,"governance_verifier_verify_architecture_stability_built"],
  ["governance-verifier-verify-invariant-block-status.fungi","governanceVerifierVerifyInvariantBlockStatusCore",6,"governance_verifier_verify_invariant_block_built"],
  ["governance-verifier-try-static-eval-status.fungi","governanceVerifierTryStaticEvalStatusCore",6,"governance_verifier_try_static_eval_built"],
].map(([file,flow,count,expected])=>Object.freeze({file,flow,args:Array(count).fill(true),expected})));

async function api(){const load=async p=>import(pathToFileURL(join(SLIDE_ROOT,"src",p)).href);return {...await load("checked-fungi-package-compiler.mjs"),...await load("checked-fungi-package-file.mjs"),...await load("checked-fungi-package-publication-loader.mjs"),...await load("safe-value-envelope.mjs"),...await load("portable-veo.mjs")};}
function expectation(r){return {packageSetDigest:r.packageSetDigest,packageIdentity:r.packageIdentity,exportName:r.exportName,receiptDigest:r.receiptDigest,safeValueTypeId:r.safeValueTypeId,safeValueStateId:r.safeValueStateId,safeValueProvenanceDigest:r.safeValueProvenanceDigest};}

it("publishes and independently re-admits all 40 wave-34 source decisions through physical SLIDE/VOK",{skip:!AVAILABLE},async()=>{
  const slide=await api(),context=slide.portableVeoReferenceContext(),sources=CANDIDATES.map(c=>Uint8Array.from(readFileSync(join(ROOT,c.file)))),request=bytes=>({packages:[{identity:"@galerina/test",version:"1.0.0-beta.34",exports:CANDIDATES.map((c,i)=>({name:c.flow,sourceFlowName:c.flow,sourceBytes:bytes[i]})),dependencies:[],resources:[]}],context,gates:GATES}),compiled=slide.compileCheckedFungiPackageSet(request(sources));
  assert.equal(compiled.verdict,1,JSON.stringify(compiled));
  const changed=sources.map(source=>Uint8Array.from(source));changed[0][0]^=1;assert.equal(slide.compileCheckedFungiPackageSet(request(changed)).verdict,-1);
  const parent=await mkdtemp(join(tmpdir(),"galerina-wave-34-")),out=join(parent,"published");
  try{
    const published=await slide.publishCheckedFungiPackageBuild({packageBuildHandle:compiled.packageBuildHandle,outputDirectory:out});assert.equal(published.verdict,1,JSON.stringify(published));assert.equal(published.outputFiles.filter(n=>n.endsWith(".slide")).length,40);
    let last;for(const c of CANDIDATES){const prepared=await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:c.flow,context,gates:GATES});assert.equal(prepared.verdict,1,c.flow);const receipt=slide.executeTypedCheckedFungiPackagePublication(prepared.packageExecutionHandle,c.args,undefined),verified=slide.verifyTypedCheckedFungiPackageReceipt(receipt,expectation(receipt));assert.equal(verified.verdict,1,c.flow);assert.equal(verified.value,c.expected,c.flow);assert.equal(verified.authorityReleased,false,c.flow);last=receipt;}
    assert.equal(slide.verifyTypedCheckedFungiPackageReceipt({...last,receiptDigest:"sha256:"+"0".repeat(64)},expectation(last)).verdict,-1);const path=join(out,published.outputFiles.find(n=>n.endsWith(".slide"))),bytes=await readFile(path);bytes[0]^=1;await writeFile(path,bytes);assert.equal((await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:CANDIDATES[0].flow,context,gates:GATES})).verdict,-1);
  }finally{await rm(parent,{recursive:true,force:true});}
});
