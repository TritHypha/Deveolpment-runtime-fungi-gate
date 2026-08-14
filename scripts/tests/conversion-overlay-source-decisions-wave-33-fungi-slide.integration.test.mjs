import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { it } from "node:test";

const SLIDE_ROOT=process.env.GALERINA_SLIDE_REPO,AVAILABLE=typeof SLIDE_ROOT==="string"&&existsSync(join(SLIDE_ROOT,"src","checked-fungi-package-compiler.mjs")),ROOT=join(process.cwd(),"packages-galerina","galerina-test","src","self-hosted","conversion-overlays"),GATES=Object.freeze({identity:1,provenance:1,target:1,effects:1,policy:1,revocation:1,validation:1,memory:1});
const CANDIDATES=Object.freeze([
  ["gir-emitter-flatten-compute-entries-status.fungi","girEmitterFlattenComputeEntriesStatusCore",6,"gir_emitter_flatten_compute_entries_built"],
  ["gir-emitter-identifiers-from-node-status.fungi","girEmitterIdentifiersFromNodeStatusCore",6,"gir_emitter_identifiers_from_node_built"],
  ["gir-emitter-build-proofs-status.fungi","girEmitterBuildProofsStatusCore",6,"gir_emitter_build_proofs_built"],
  ["gir-emitter-extract-tensors-status.fungi","girEmitterExtractTensorsStatusCore",6,"gir_emitter_extract_tensors_built"],
  ["gir-emitter-infer-target-affinity-status.fungi","girEmitterInferTargetAffinityStatusCore",6,"gir_emitter_infer_target_affinity_built"],
  ["gir-emitter-unique-status.fungi","girEmitterUniqueStatusCore",6,"gir_emitter_unique_built"],
  ["gir-emitter-strip-string-quotes-status.fungi","girEmitterStripStringQuotesStatusCore",6,"gir_emitter_strip_string_quotes_built"],
  ["gir-emitter-extract-contract-meta-status.fungi","girEmitterExtractContractMetaStatusCore",6,"gir_emitter_extract_contract_meta_built"],
  ["gir-emitter-compute-gir-hash-status.fungi","girEmitterComputeGirHashStatusCore",6,"gir_emitter_compute_gir_hash_built"],
  ["gir-emitter-canonicalise-gir-status.fungi","girEmitterCanonicaliseGirStatusCore",6,"gir_emitter_canonicalise_gir_built"],
  ["gir-emitter-replacer-status.fungi","girEmitterReplacerStatusCore",6,"gir_emitter_replacer_built"],
  ["gir-emitter-sort-keys-status.fungi","girEmitterSortKeysStatusCore",6,"gir_emitter_sort_keys_built"],
  ["gir-emitter-build-semantic-graph-status.fungi","girEmitterBuildSemanticGraphStatusCore",6,"gir_emitter_build_semantic_graph_built"],
  ["gir-emitter-extract-contract-section-status.fungi","girEmitterExtractContractSectionStatusCore",6,"gir_emitter_extract_contract_section_built"],
  ["gir-emitter-extract-contract-scalar-status.fungi","girEmitterExtractContractScalarStatusCore",6,"gir_emitter_extract_contract_scalar_built"],
  ["gir-emitter-extract-emit-events-status.fungi","girEmitterExtractEmitEventsStatusCore",6,"gir_emitter_extract_emit_events_built"],
  ["gir-emitter-extract-called-flows-status.fungi","girEmitterExtractCalledFlowsStatusCore",6,"gir_emitter_extract_called_flows_built"],
  ["gir-emitter-parse-ai-graph-param-status.fungi","girEmitterParseAiGraphParamStatusCore",6,"gir_emitter_parse_ai_graph_param_built"],
  ["gir-emitter-build-ai-graph-status.fungi","girEmitterBuildAiGraphStatusCore",6,"gir_emitter_build_ai_graph_built"],
  ["gir-emitter-find-flow-node-for-ai-status.fungi","girEmitterFindFlowNodeForAiStatusCore",6,"gir_emitter_find_flow_node_for_ai_built"],
  ["gir-emitter-build-execution-plan-status.fungi","girEmitterBuildExecutionPlanStatusCore",6,"gir_emitter_build_execution_plan_built"],
  ["git-ignore-filter-exclude-git-ignored-status.fungi","gitIgnoreFilterExcludeGitIgnoredStatusCore",6,"git_ignore_filter_exclude_git_ignored_built"],
  ["git-ignore-filter-to-repo-rel-status.fungi","gitIgnoreFilterToRepoRelStatusCore",6,"git_ignore_filter_to_repo_rel_built"],
  ["governance-diff-qualifier-escalated-status.fungi","governanceDiffQualifierEscalatedStatusCore",6,"governance_diff_qualifier_escalated_built"],
  ["governance-diff-flow-shape-status.fungi","governanceDiffFlowShapeStatusCore",6,"governance_diff_flow_shape_built"],
  ["governance-diff-diff-governance-status.fungi","governanceDiffDiffGovernanceStatusCore",6,"governance_diff_diff_governance_built"],
  ["governance-diff-classify-delta-status.fungi","governanceDiffClassifyDeltaStatusCore",6,"governance_diff_classify_delta_built"],
  ["governance-diff-max-class-status.fungi","governanceDiffMaxClassStatusCore",6,"governance_diff_max_class_built"],
  ["governance-diff-build-summary-status.fungi","governanceDiffBuildSummaryStatusCore",6,"governance_diff_build_summary_built"],
  ["governance-diff-render-governance-diff-status.fungi","governanceDiffRenderGovernanceDiffStatusCore",6,"governance_diff_render_governance_diff_built"],
  ["governance-mode-resolve-governance-mode-status.fungi","governanceModeResolveGovernanceModeStatusCore",6,"governance_mode_resolve_governance_mode_built"],
  ["governance-verifier-find-flow-node-status.fungi","governanceVerifierFindFlowNodeStatusCore",6,"governance_verifier_find_flow_node_built"],
  ["governance-verifier-find-nodes-status.fungi","governanceVerifierFindNodesStatusCore",6,"governance_verifier_find_nodes_built"],
  ["governance-verifier-has-call-to-status.fungi","governanceVerifierHasCallToStatusCore",6,"governance_verifier_has_call_to_built"],
  ["governance-verifier-extract-denied-targets-status.fungi","governanceVerifierExtractDeniedTargetsStatusCore",6,"governance_verifier_extract_denied_targets_built"],
  ["governance-verifier-has-intent-decl-status.fungi","governanceVerifierHasIntentDeclStatusCore",6,"governance_verifier_has_intent_decl_built"],
  ["governance-verifier-make-gov-diag-status.fungi","governanceVerifierMakeGovDiagStatusCore",6,"governance_verifier_make_gov_diag_built"],
  ["governance-verifier-purpose-family-status.fungi","governanceVerifierPurposeFamilyStatusCore",6,"governance_verifier_purpose_family_built"],
  ["governance-verifier-extract-template-selections-status.fungi","governanceVerifierExtractTemplateSelectionsStatusCore",6,"governance_verifier_extract_template_selections_built"],
  ["governance-verifier-extract-policy-purposes-status.fungi","governanceVerifierExtractPolicyPurposesStatusCore",6,"governance_verifier_extract_policy_purposes_built"],
].map(([file,flow,count,expected])=>Object.freeze({file,flow,args:Array(count).fill(true),expected})));

async function api(){const load=async p=>import(pathToFileURL(join(SLIDE_ROOT,"src",p)).href);return {...await load("checked-fungi-package-compiler.mjs"),...await load("checked-fungi-package-file.mjs"),...await load("checked-fungi-package-publication-loader.mjs"),...await load("safe-value-envelope.mjs"),...await load("portable-veo.mjs")};}
function expectation(r){return {packageSetDigest:r.packageSetDigest,packageIdentity:r.packageIdentity,exportName:r.exportName,receiptDigest:r.receiptDigest,safeValueTypeId:r.safeValueTypeId,safeValueStateId:r.safeValueStateId,safeValueProvenanceDigest:r.safeValueProvenanceDigest};}

it("publishes and independently re-admits all 40 wave-33 source decisions through physical SLIDE/VOK",{skip:!AVAILABLE},async()=>{
  const slide=await api(),context=slide.portableVeoReferenceContext(),sources=CANDIDATES.map(c=>Uint8Array.from(readFileSync(join(ROOT,c.file)))),request=bytes=>({packages:[{identity:"@galerina/test",version:"1.0.0-beta.33",exports:CANDIDATES.map((c,i)=>({name:c.flow,sourceFlowName:c.flow,sourceBytes:bytes[i]})),dependencies:[],resources:[]}],context,gates:GATES}),compiled=slide.compileCheckedFungiPackageSet(request(sources));
  assert.equal(compiled.verdict,1,JSON.stringify(compiled));
  const changed=sources.map(source=>Uint8Array.from(source));changed[0][0]^=1;assert.equal(slide.compileCheckedFungiPackageSet(request(changed)).verdict,-1);
  const parent=await mkdtemp(join(tmpdir(),"galerina-wave-33-")),out=join(parent,"published");
  try{
    const published=await slide.publishCheckedFungiPackageBuild({packageBuildHandle:compiled.packageBuildHandle,outputDirectory:out});
    assert.equal(published.verdict,1,JSON.stringify(published));
    assert.equal(published.outputFiles.filter(n=>n.endsWith(".slide")).length,40);
    let last;
    for(const c of CANDIDATES){
      const prepared=await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:c.flow,context,gates:GATES});
      assert.equal(prepared.verdict,1,c.flow);
      const receipt=slide.executeTypedCheckedFungiPackagePublication(prepared.packageExecutionHandle,c.args,undefined),verified=slide.verifyTypedCheckedFungiPackageReceipt(receipt,expectation(receipt));
      assert.equal(verified.verdict,1,c.flow);assert.equal(verified.value,c.expected,c.flow);assert.equal(verified.authorityReleased,false,c.flow);last=receipt;
    }
    assert.equal(slide.verifyTypedCheckedFungiPackageReceipt({...last,receiptDigest:"sha256:"+"0".repeat(64)},expectation(last)).verdict,-1);
    const path=join(out,published.outputFiles.find(n=>n.endsWith(".slide"))),bytes=await readFile(path);bytes[0]^=1;await writeFile(path,bytes);
    assert.equal((await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:CANDIDATES[0].flow,context,gates:GATES})).verdict,-1);
  }finally{await rm(parent,{recursive:true,force:true});}
});
