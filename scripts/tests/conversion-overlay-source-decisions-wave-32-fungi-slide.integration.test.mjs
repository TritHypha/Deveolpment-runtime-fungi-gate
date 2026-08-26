import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { it } from "node:test";

const SLIDE_ROOT=process.env.GALERINA_SLIDE_REPO,AVAILABLE=typeof SLIDE_ROOT==="string"&&existsSync(join(SLIDE_ROOT,"src","checked-fungi-package-compiler.mjs")),ROOT=join(process.cwd(),"packages-ts","galerina-test","src","self-hosted","conversion-overlays"),GATES=Object.freeze({identity:1,provenance:1,target:1,effects:1,policy:1,revocation:1,validation:1,memory:1});
const CANDIDATES=Object.freeze([
  ["gate-v3-privacy-verify-taint-reaches-sink-status.fungi","gateV3PrivacyVerifyTaintReachesSinkStatusCore",6,"gate_v3_privacy_verify_taint_reaches_sink_built"],
  ["gate-v3-registry-canonical-json-status.fungi","gateV3RegistryCanonicalJsonStatusCore",6,"gate_v3_registry_canonical_json_built"],
  ["gate-v3-registry-emit-status.fungi","gateV3RegistryEmitStatusCore",6,"gate_v3_registry_emit_built"],
  ["gate-v3-registry-fail-status.fungi","gateV3RegistryFailStatusCore",6,"gate_v3_registry_fail_built"],
  ["gate-v3-registry-load-gate-v3-registry-status.fungi","gateV3RegistryLoadGateV3RegistryStatusCore",6,"gate_v3_registry_load_gate_v3_registry_built"],
  ["gate-v3-registry-ports-status.fungi","gateV3RegistryPortsStatusCore",6,"gate_v3_registry_ports_built"],
  ["gate-v3-resolve-check-gate-v3-liveness-status.fungi","gateV3ResolveCheckGateV3LivenessStatusCore",6,"gate_v3_resolve_check_gate_v3_liveness_built"],
  ["gate-v3-resolve-emit-status.fungi","gateV3ResolveEmitStatusCore",6,"gate_v3_resolve_emit_built"],
  ["gate-v3-resolve-reach-status.fungi","gateV3ResolveReachStatusCore",6,"gate_v3_resolve_reach_built"],
  ["gate-v3-resolve-resolve-gate-v3-status.fungi","gateV3ResolveResolveGateV3StatusCore",6,"gate_v3_resolve_resolve_gate_v3_built"],
  ["gate-v3-resolve-type-known-status.fungi","gateV3ResolveTypeKnownStatusCore",6,"gate_v3_resolve_type_known_built"],
  ["gate-v3-resolve-value-matches-type-status.fungi","gateV3ResolveValueMatchesTypeStatusCore",6,"gate_v3_resolve_value_matches_type_built"],
  ["gate-v3-verdict-fold-verdicts-status.fungi","gateV3VerdictFoldVerdictsStatusCore",6,"gate_v3_verdict_fold_verdicts_built"],
  ["gate-v3-verdict-v-and-status.fungi","gateV3VerdictVAndStatusCore",6,"gate_v3_verdict_v_and_built"],
  ["gate-v3-verify-analyze-gate-v3-liveness-status.fungi","gateV3VerifyAnalyzeGateV3LivenessStatusCore",6,"gate_v3_verify_analyze_gate_v3_liveness_built"],
  ["gate-v3-verify-duplicates-status.fungi","gateV3VerifyDuplicatesStatusCore",6,"gate_v3_verify_duplicates_built"],
  ["gate-v3-verify-emit-status.fungi","gateV3VerifyEmitStatusCore",6,"gate_v3_verify_emit_built"],
  ["gate-v3-verify-find-cycle-status.fungi","gateV3VerifyFindCycleStatusCore",6,"gate_v3_verify_find_cycle_built"],
  ["gate-v3-verify-verify-gate-v3-structure-status.fungi","gateV3VerifyVerifyGateV3StructureStatusCore",6,"gate_v3_verify_verify_gate_v3_structure_built"],
  ["gate-v3-verify-walk-status.fungi","gateV3VerifyWalkStatusCore",6,"gate_v3_verify_walk_built"],
  ["gate-v3-verify-walk-value-status.fungi","gateV3VerifyWalkValueStatusCore",6,"gate_v3_verify_walk_value_built"],
  ["gate-v3-zone-dominators-of-status.fungi","gateV3ZoneDominatorsOfStatusCore",6,"gate_v3_zone_dominators_of_built"],
  ["gate-v3-zone-refuse-status.fungi","gateV3ZoneRefuseStatusCore",6,"gate_v3_zone_refuse_built"],
  ["gate-v3-zone-semantic-parts-status.fungi","gateV3ZoneSemanticPartsStatusCore",6,"gate_v3_zone_semantic_parts_built"],
  ["gate-v3-zone-semantic-types-status.fungi","gateV3ZoneSemanticTypesStatusCore",6,"gate_v3_zone_semantic_types_built"],
  ["gate-v3-zone-verify-zone-domination-status.fungi","gateV3ZoneVerifyZoneDominationStatusCore",6,"gate_v3_zone_verify_zone_domination_built"],
  ["gate-v3-zone-zone-gates-status.fungi","gateV3ZoneZoneGatesStatusCore",6,"gate_v3_zone_zone_gates_built"],
  ["gir-emitter-emit-expr-status.fungi","girEmitterEmitExprStatusCore",6,"gir_emitter_emit_expr_built"],
  ["gir-emitter-emit-gir-status.fungi","girEmitterEmitGirStatusCore",6,"gir_emitter_emit_gir_built"],
  ["gir-emitter-find-nodes-status.fungi","girEmitterFindNodesStatusCore",6,"gir_emitter_find_nodes_built"],
  ["gir-emitter-find-flow-node-status.fungi","girEmitterFindFlowNodeStatusCore",6,"gir_emitter_find_flow_node_built"],
  ["gir-emitter-find-governed-flow-node-status.fungi","girEmitterFindGovernedFlowNodeStatusCore",6,"gir_emitter_find_governed_flow_node_built"],
  ["gir-emitter-extract-param-types-status.fungi","girEmitterExtractParamTypesStatusCore",6,"gir_emitter_extract_param_types_built"],
  ["gir-emitter-extract-intent-status.fungi","girEmitterExtractIntentStatusCore",6,"gir_emitter_extract_intent_built"],
  ["gir-emitter-extract-protected-values-status.fungi","girEmitterExtractProtectedValuesStatusCore",6,"gir_emitter_extract_protected_values_built"],
  ["gir-emitter-parse-binding-value-status.fungi","girEmitterParseBindingValueStatusCore",6,"gir_emitter_parse_binding_value_built"],
  ["gir-emitter-is-redacted-in-flow-status.fungi","girEmitterIsRedactedInFlowStatusCore",6,"gir_emitter_is_redacted_in_flow_built"],
  ["gir-emitter-has-identifier-descendant-status.fungi","girEmitterHasIdentifierDescendantStatusCore",6,"gir_emitter_has_identifier_descendant_built"],
  ["gir-emitter-extract-execution-status.fungi","girEmitterExtractExecutionStatusCore",6,"gir_emitter_extract_execution_built"],
  ["gir-emitter-default-execution-status.fungi","girEmitterDefaultExecutionStatusCore",6,"gir_emitter_default_execution_built"],
].map(([file,flow,count,expected])=>Object.freeze({file,flow,args:Array(count).fill(true),expected})));

async function api(){const load=async p=>import(pathToFileURL(join(SLIDE_ROOT,"src",p)).href);return {...await load("checked-fungi-package-compiler.mjs"),...await load("checked-fungi-package-file.mjs"),...await load("checked-fungi-package-publication-loader.mjs"),...await load("safe-value-envelope.mjs"),...await load("portable-veo.mjs")};}
function expectation(r){return {packageSetDigest:r.packageSetDigest,packageIdentity:r.packageIdentity,exportName:r.exportName,receiptDigest:r.receiptDigest,safeValueTypeId:r.safeValueTypeId,safeValueStateId:r.safeValueStateId,safeValueProvenanceDigest:r.safeValueProvenanceDigest};}

it("publishes and independently re-admits all 40 wave-32 source decisions through physical SLIDE/VOK",{skip:!AVAILABLE},async()=>{
  const slide=await api(),context=slide.portableVeoReferenceContext(),sources=CANDIDATES.map(c=>Uint8Array.from(readFileSync(join(ROOT,c.file)))),request=bytes=>({packages:[{identity:"@galerina/test",version:"1.0.0-beta.32",exports:CANDIDATES.map((c,i)=>({name:c.flow,sourceFlowName:c.flow,sourceBytes:bytes[i]})),dependencies:[],resources:[]}],context,gates:GATES}),compiled=slide.compileCheckedFungiPackageSet(request(sources));
  assert.equal(compiled.verdict,1,JSON.stringify(compiled));
  const changed=sources.map(source=>Uint8Array.from(source));changed[0][0]^=1;assert.equal(slide.compileCheckedFungiPackageSet(request(changed)).verdict,-1);
  const parent=await mkdtemp(join(tmpdir(),"galerina-wave-32-")),out=join(parent,"published");
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
