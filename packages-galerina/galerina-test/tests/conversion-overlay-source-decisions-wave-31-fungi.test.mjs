import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

const ROOT=join(import.meta.dirname,"..","..",".."),PACKAGE_ROOT=join(ROOT,"packages-galerina","galerina-test"),OVERLAY_ROOT=join(PACKAGE_ROOT,"src","self-hosted","conversion-overlays"),PACKAGE=join(PACKAGE_ROOT,"package.json");
const bool=value=>({__tag:"bool",value}),string=value=>({__tag:"string",value}),args=names=>new Map(names.map(name=>[name,bool(true)]));
const RESERVED=new Set(["version","pure","secure","flow","FLOW","contract","intent","record","return","if","match","check","deny","ambig","mut","let","Bool","Int","String","Verdict","Result","Option","Array","true","false","Ok","Err","Some","None","Allow","Deny","Unknown"]);
const CANDIDATES=Object.freeze([
  ["gate-v3-condense-condense-gate-graph-status.fungi","gateV3CondenseCondenseGateGraphStatusCore","galerina-core-compiler/src/gate-v3-condense.ts","condenseGateGraph","gate_v3_condense_condense_gate_graph_built"],
  ["gate-v3-condense-verify-gate-graph-acyclic-status.fungi","gateV3CondenseVerifyGateGraphAcyclicStatusCore","galerina-core-compiler/src/gate-v3-condense.ts","verifyGateGraphAcyclic","gate_v3_condense_verify_gate_graph_acyclic_built"],
  ["gate-v3-construction-verify-construction-entry-status.fungi","gateV3ConstructionVerifyConstructionEntryStatusCore","galerina-core-compiler/src/gate-v3-construction.ts","verifyConstructionEntry","gate_v3_construction_verify_construction_entry_built"],
  ["gate-v3-envelope-verify-effect-names-status.fungi","gateV3EnvelopeVerifyEffectNamesStatusCore","galerina-core-compiler/src/gate-v3-envelope.ts","function verifyEffectNames(","gate_v3_envelope_verify_effect_names_built"],
  ["gate-v3-envelope-judge-status.fungi","gateV3EnvelopeJudgeStatusCore","galerina-core-compiler/src/gate-v3-envelope.ts","const judge =","gate_v3_envelope_judge_built"],
  ["gate-v3-envelope-verify-effect-envelope-status.fungi","gateV3EnvelopeVerifyEffectEnvelopeStatusCore","galerina-core-compiler/src/gate-v3-envelope.ts","verifyEffectEnvelope","gate_v3_envelope_verify_effect_envelope_built"],
  ["gate-v3-gir-by-code-unit-status.fungi","gateV3GirByCodeUnitStatusCore","galerina-core-compiler/src/gate-v3-gir.ts","function byCodeUnit(","gate_v3_gir_by_code_unit_built"],
  ["gate-v3-gir-envelope-of-status.fungi","gateV3GirEnvelopeOfStatusCore","galerina-core-compiler/src/gate-v3-gir.ts","function envelopeOf(","gate_v3_gir_envelope_of_built"],
  ["gate-v3-gir-has-cut-status.fungi","gateV3GirHasCutStatusCore","galerina-core-compiler/src/gate-v3-gir.ts","function hasCut(","gate_v3_gir_has_cut_built"],
  ["gate-v3-gir-has-decision-status.fungi","gateV3GirHasDecisionStatusCore","galerina-core-compiler/src/gate-v3-gir.ts","function hasDecision(","gate_v3_gir_has_decision_built"],
  ["gate-v3-gir-has-semantic-part-status.fungi","gateV3GirHasSemanticPartStatusCore","galerina-core-compiler/src/gate-v3-gir.ts","function hasSemanticPart(","gate_v3_gir_has_semantic_part_built"],
  ["gate-v3-gir-circuit-proofs-status.fungi","gateV3GirCircuitProofsStatusCore","galerina-core-compiler/src/gate-v3-gir.ts","function circuitProofs(","gate_v3_gir_circuit_proofs_built"],
  ["gate-v3-gir-lower-circuit-to-gir-status.fungi","gateV3GirLowerCircuitToGirStatusCore","galerina-core-compiler/src/gate-v3-gir.ts","lowerCircuitToGIR","gate_v3_gir_lower_circuit_to_gir_built"],
  ["gate-v3-graph-by-code-unit-status.fungi","gateV3GraphByCodeUnitStatusCore","galerina-core-compiler/src/gate-v3-graph.ts","function byCodeUnit(","gate_v3_graph_by_code_unit_built"],
  ["gate-v3-graph-node-id-of-status.fungi","gateV3GraphNodeIdOfStatusCore","galerina-core-compiler/src/gate-v3-graph.ts","function nodeIdOf(","gate_v3_graph_node_id_of_built"],
  ["gate-v3-graph-port-of-status.fungi","gateV3GraphPortOfStatusCore","galerina-core-compiler/src/gate-v3-graph.ts","function portOf(","gate_v3_graph_port_of_built"],
  ["gate-v3-graph-build-gate-graph-status.fungi","gateV3GraphBuildGateGraphStatusCore","galerina-core-compiler/src/gate-v3-graph.ts","buildGateGraph","gate_v3_graph_build_gate_graph_built"],
  ["gate-v3-graph-bound-key-status.fungi","gateV3GraphBoundKeyStatusCore","galerina-core-compiler/src/gate-v3-graph.ts","const boundKey =","gate_v3_graph_bound_key_built"],
  ["gate-v3-graph-serialize-gate-graph-status.fungi","gateV3GraphSerializeGateGraphStatusCore","galerina-core-compiler/src/gate-v3-graph.ts","serializeGateGraph","gate_v3_graph_serialize_gate_graph_built"],
  ["gate-v3-parser-span-status.fungi","gateV3ParserSpanStatusCore","galerina-core-compiler/src/gate-v3-parser.ts","function span(","gate_v3_parser_span_built"],
  ["gate-v3-parser-locate-status.fungi","gateV3ParserLocateStatusCore","galerina-core-compiler/src/gate-v3-parser.ts","function locate(","gate_v3_parser_locate_built"],
  ["gate-v3-parser-parse-gate-v3-status.fungi","gateV3ParserParseGateV3StatusCore","galerina-core-compiler/src/gate-v3-parser.ts","parseGateV3","gate_v3_parser_parse_gate_v3_built"],
  ["gate-v3-parser-refuse-status.fungi","gateV3ParserRefuseStatusCore","galerina-core-compiler/src/gate-v3-parser.ts","const refuse =","gate_v3_parser_refuse_built"],
  ["gate-v3-parser-current-status.fungi","gateV3ParserCurrentStatusCore","galerina-core-compiler/src/gate-v3-parser.ts","const current =","gate_v3_parser_current_built"],
  ["gate-v3-parser-consume-status.fungi","gateV3ParserConsumeStatusCore","galerina-core-compiler/src/gate-v3-parser.ts","const consume =","gate_v3_parser_consume_built"],
  ["gate-v3-parser-canonical-number-status.fungi","gateV3ParserCanonicalNumberStatusCore","galerina-core-compiler/src/gate-v3-parser.ts","function canonicalNumber(","gate_v3_parser_canonical_number_built"],
  ["gate-v3-parser-format-value-status.fungi","gateV3ParserFormatValueStatusCore","galerina-core-compiler/src/gate-v3-parser.ts","function formatValue(","gate_v3_parser_format_value_built"],
  ["gate-v3-parser-format-gate-v3-status.fungi","gateV3ParserFormatGateV3StatusCore","galerina-core-compiler/src/gate-v3-parser.ts","formatGateV3","gate_v3_parser_format_gate_v3_built"],
  ["gate-v3-parser-split-arguments-status.fungi","gateV3ParserSplitArgumentsStatusCore","galerina-core-compiler/src/gate-v3-parser.ts","function splitArguments(","gate_v3_parser_split_arguments_built"],
  ["gate-v3-parser-measure-set-shape-status.fungi","gateV3ParserMeasureSetShapeStatusCore","galerina-core-compiler/src/gate-v3-parser.ts","function measureSetShape(","gate_v3_parser_measure_set_shape_built"],
  ["gate-v3-parser-absence-reason-status.fungi","gateV3ParserAbsenceReasonStatusCore","galerina-core-compiler/src/gate-v3-parser.ts","const absenceReason =","gate_v3_parser_absence_reason_built"],
  ["gate-v3-parser-parse-value-status.fungi","gateV3ParserParseValueStatusCore","galerina-core-compiler/src/gate-v3-parser.ts","function parseValue(","gate_v3_parser_parse_value_built"],
  ["gate-v3-parser-parse-endpoint-status.fungi","gateV3ParserParseEndpointStatusCore","galerina-core-compiler/src/gate-v3-parser.ts","function parseEndpoint(","gate_v3_parser_parse_endpoint_built"],
  ["gate-v3-privacy-compute-dominators-status.fungi","gateV3PrivacyComputeDominatorsStatusCore","galerina-core-compiler/src/gate-v3-privacy.ts","computeDominators","gate_v3_privacy_compute_dominators_built"],
  ["gate-v3-privacy-intersect-status.fungi","gateV3PrivacyIntersectStatusCore","galerina-core-compiler/src/gate-v3-privacy.ts","const intersect =","gate_v3_privacy_intersect_built"],
  ["gate-v3-privacy-dominators-of-status.fungi","gateV3PrivacyDominatorsOfStatusCore","galerina-core-compiler/src/gate-v3-privacy.ts","function dominatorsOf(","gate_v3_privacy_dominators_of_built"],
  ["gate-v3-privacy-taint-frontier-status.fungi","gateV3PrivacyTaintFrontierStatusCore","galerina-core-compiler/src/gate-v3-privacy.ts","function taintFrontier(","gate_v3_privacy_taint_frontier_built"],
  ["gate-v3-privacy-declared-cuts-status.fungi","gateV3PrivacyDeclaredCutsStatusCore","galerina-core-compiler/src/gate-v3-privacy.ts","function declaredCuts(","gate_v3_privacy_declared_cuts_built"],
  ["gate-v3-privacy-verify-cut-dominates-egress-status.fungi","gateV3PrivacyVerifyCutDominatesEgressStatusCore","galerina-core-compiler/src/gate-v3-privacy.ts","verifyCutDominatesEgress","gate_v3_privacy_verify_cut_dominates_egress_built"],
  ["gate-v3-privacy-verify-taint-cut-separator-status.fungi","gateV3PrivacyVerifyTaintCutSeparatorStatusCore","galerina-core-compiler/src/gate-v3-privacy.ts","verifyTaintCutSeparator","gate_v3_privacy_verify_taint_cut_separator_built"],
].map(([file,flow,source,symbol,expected])=>Object.freeze({file,flow,source,symbol,input:args(["inputCaptured","stateChecked","decisionBuilt","evidenceBound","outcomeSealed","releaseChecked"]),expected:string(expected)})));

function shadowFingerprint(source){const identifiers=new Map();return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");}

describe("40-file source-bound Fungi decision-core overlay wave 31",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[],scopes=new Set(),sources=new Map();for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);let source=sources.get(c.source);if(source===undefined){source=readFileSync(join(ROOT,"packages-galerina",c.source),"utf8");sources.set(c.source,source);}assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);const scope=`${c.source}#${c.symbol}`;assert.equal(scopes.has(scope),false);scopes.add(scope);}});
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{const seen=new Map(),files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const p=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(p),`${c.file} must exist`);const source=readFileSync(p,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);}}assert.deepEqual(collisions,[]);});
  it("parses, effect-checks, emits GIR and executes every decision core",async()=>{for(const c of CANDIDATES){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8"),program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});
