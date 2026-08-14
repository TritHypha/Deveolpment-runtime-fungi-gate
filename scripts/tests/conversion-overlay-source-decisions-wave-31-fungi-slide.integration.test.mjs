import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { it } from "node:test";

const SLIDE_ROOT=process.env.GALERINA_SLIDE_REPO,AVAILABLE=typeof SLIDE_ROOT==="string"&&existsSync(join(SLIDE_ROOT,"src","checked-fungi-package-compiler.mjs")),ROOT=join(process.cwd(),"packages-galerina","galerina-test","src","self-hosted","conversion-overlays"),GATES=Object.freeze({identity:1,provenance:1,target:1,effects:1,policy:1,revocation:1,validation:1,memory:1});
const CANDIDATES=Object.freeze([
  ["gate-v3-condense-condense-gate-graph-status.fungi","gateV3CondenseCondenseGateGraphStatusCore",6,"gate_v3_condense_condense_gate_graph_built"],
  ["gate-v3-condense-verify-gate-graph-acyclic-status.fungi","gateV3CondenseVerifyGateGraphAcyclicStatusCore",6,"gate_v3_condense_verify_gate_graph_acyclic_built"],
  ["gate-v3-construction-verify-construction-entry-status.fungi","gateV3ConstructionVerifyConstructionEntryStatusCore",6,"gate_v3_construction_verify_construction_entry_built"],
  ["gate-v3-envelope-verify-effect-names-status.fungi","gateV3EnvelopeVerifyEffectNamesStatusCore",6,"gate_v3_envelope_verify_effect_names_built"],
  ["gate-v3-envelope-judge-status.fungi","gateV3EnvelopeJudgeStatusCore",6,"gate_v3_envelope_judge_built"],
  ["gate-v3-envelope-verify-effect-envelope-status.fungi","gateV3EnvelopeVerifyEffectEnvelopeStatusCore",6,"gate_v3_envelope_verify_effect_envelope_built"],
  ["gate-v3-gir-by-code-unit-status.fungi","gateV3GirByCodeUnitStatusCore",6,"gate_v3_gir_by_code_unit_built"],
  ["gate-v3-gir-envelope-of-status.fungi","gateV3GirEnvelopeOfStatusCore",6,"gate_v3_gir_envelope_of_built"],
  ["gate-v3-gir-has-cut-status.fungi","gateV3GirHasCutStatusCore",6,"gate_v3_gir_has_cut_built"],
  ["gate-v3-gir-has-decision-status.fungi","gateV3GirHasDecisionStatusCore",6,"gate_v3_gir_has_decision_built"],
  ["gate-v3-gir-has-semantic-part-status.fungi","gateV3GirHasSemanticPartStatusCore",6,"gate_v3_gir_has_semantic_part_built"],
  ["gate-v3-gir-circuit-proofs-status.fungi","gateV3GirCircuitProofsStatusCore",6,"gate_v3_gir_circuit_proofs_built"],
  ["gate-v3-gir-lower-circuit-to-gir-status.fungi","gateV3GirLowerCircuitToGirStatusCore",6,"gate_v3_gir_lower_circuit_to_gir_built"],
  ["gate-v3-graph-by-code-unit-status.fungi","gateV3GraphByCodeUnitStatusCore",6,"gate_v3_graph_by_code_unit_built"],
  ["gate-v3-graph-node-id-of-status.fungi","gateV3GraphNodeIdOfStatusCore",6,"gate_v3_graph_node_id_of_built"],
  ["gate-v3-graph-port-of-status.fungi","gateV3GraphPortOfStatusCore",6,"gate_v3_graph_port_of_built"],
  ["gate-v3-graph-build-gate-graph-status.fungi","gateV3GraphBuildGateGraphStatusCore",6,"gate_v3_graph_build_gate_graph_built"],
  ["gate-v3-graph-bound-key-status.fungi","gateV3GraphBoundKeyStatusCore",6,"gate_v3_graph_bound_key_built"],
  ["gate-v3-graph-serialize-gate-graph-status.fungi","gateV3GraphSerializeGateGraphStatusCore",6,"gate_v3_graph_serialize_gate_graph_built"],
  ["gate-v3-parser-span-status.fungi","gateV3ParserSpanStatusCore",6,"gate_v3_parser_span_built"],
  ["gate-v3-parser-locate-status.fungi","gateV3ParserLocateStatusCore",6,"gate_v3_parser_locate_built"],
  ["gate-v3-parser-parse-gate-v3-status.fungi","gateV3ParserParseGateV3StatusCore",6,"gate_v3_parser_parse_gate_v3_built"],
  ["gate-v3-parser-refuse-status.fungi","gateV3ParserRefuseStatusCore",6,"gate_v3_parser_refuse_built"],
  ["gate-v3-parser-current-status.fungi","gateV3ParserCurrentStatusCore",6,"gate_v3_parser_current_built"],
  ["gate-v3-parser-consume-status.fungi","gateV3ParserConsumeStatusCore",6,"gate_v3_parser_consume_built"],
  ["gate-v3-parser-canonical-number-status.fungi","gateV3ParserCanonicalNumberStatusCore",6,"gate_v3_parser_canonical_number_built"],
  ["gate-v3-parser-format-value-status.fungi","gateV3ParserFormatValueStatusCore",6,"gate_v3_parser_format_value_built"],
  ["gate-v3-parser-format-gate-v3-status.fungi","gateV3ParserFormatGateV3StatusCore",6,"gate_v3_parser_format_gate_v3_built"],
  ["gate-v3-parser-split-arguments-status.fungi","gateV3ParserSplitArgumentsStatusCore",6,"gate_v3_parser_split_arguments_built"],
  ["gate-v3-parser-measure-set-shape-status.fungi","gateV3ParserMeasureSetShapeStatusCore",6,"gate_v3_parser_measure_set_shape_built"],
  ["gate-v3-parser-absence-reason-status.fungi","gateV3ParserAbsenceReasonStatusCore",6,"gate_v3_parser_absence_reason_built"],
  ["gate-v3-parser-parse-value-status.fungi","gateV3ParserParseValueStatusCore",6,"gate_v3_parser_parse_value_built"],
  ["gate-v3-parser-parse-endpoint-status.fungi","gateV3ParserParseEndpointStatusCore",6,"gate_v3_parser_parse_endpoint_built"],
  ["gate-v3-privacy-compute-dominators-status.fungi","gateV3PrivacyComputeDominatorsStatusCore",6,"gate_v3_privacy_compute_dominators_built"],
  ["gate-v3-privacy-intersect-status.fungi","gateV3PrivacyIntersectStatusCore",6,"gate_v3_privacy_intersect_built"],
  ["gate-v3-privacy-dominators-of-status.fungi","gateV3PrivacyDominatorsOfStatusCore",6,"gate_v3_privacy_dominators_of_built"],
  ["gate-v3-privacy-taint-frontier-status.fungi","gateV3PrivacyTaintFrontierStatusCore",6,"gate_v3_privacy_taint_frontier_built"],
  ["gate-v3-privacy-declared-cuts-status.fungi","gateV3PrivacyDeclaredCutsStatusCore",6,"gate_v3_privacy_declared_cuts_built"],
  ["gate-v3-privacy-verify-cut-dominates-egress-status.fungi","gateV3PrivacyVerifyCutDominatesEgressStatusCore",6,"gate_v3_privacy_verify_cut_dominates_egress_built"],
  ["gate-v3-privacy-verify-taint-cut-separator-status.fungi","gateV3PrivacyVerifyTaintCutSeparatorStatusCore",6,"gate_v3_privacy_verify_taint_cut_separator_built"],
].map(([file,flow,count,expected])=>Object.freeze({file,flow,args:Array(count).fill(true),expected})));

async function api(){const load=async p=>import(pathToFileURL(join(SLIDE_ROOT,"src",p)).href);return {...await load("checked-fungi-package-compiler.mjs"),...await load("checked-fungi-package-file.mjs"),...await load("checked-fungi-package-publication-loader.mjs"),...await load("safe-value-envelope.mjs"),...await load("portable-veo.mjs")};}
function expectation(r){return {packageSetDigest:r.packageSetDigest,packageIdentity:r.packageIdentity,exportName:r.exportName,receiptDigest:r.receiptDigest,safeValueTypeId:r.safeValueTypeId,safeValueStateId:r.safeValueStateId,safeValueProvenanceDigest:r.safeValueProvenanceDigest};}

it("publishes and independently re-admits all 40 wave-31 source decisions through physical SLIDE/VOK",{skip:!AVAILABLE},async()=>{
  const slide=await api(),context=slide.portableVeoReferenceContext(),sources=CANDIDATES.map(c=>Uint8Array.from(readFileSync(join(ROOT,c.file)))),request=bytes=>({packages:[{identity:"@galerina/test",version:"1.0.0-beta.31",exports:CANDIDATES.map((c,i)=>({name:c.flow,sourceFlowName:c.flow,sourceBytes:bytes[i]})),dependencies:[],resources:[]}],context,gates:GATES}),compiled=slide.compileCheckedFungiPackageSet(request(sources));
  assert.equal(compiled.verdict,1,JSON.stringify(compiled));
  const changed=sources.map(source=>Uint8Array.from(source));changed[0][0]^=1;assert.equal(slide.compileCheckedFungiPackageSet(request(changed)).verdict,-1);
  const parent=await mkdtemp(join(tmpdir(),"galerina-wave-31-")),out=join(parent,"published");
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
