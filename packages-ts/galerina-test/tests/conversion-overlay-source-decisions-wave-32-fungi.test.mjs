import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

const ROOT=join(import.meta.dirname,"..","..",".."),PACKAGE_ROOT=join(ROOT,"packages-ts","galerina-test"),OVERLAY_ROOT=join(PACKAGE_ROOT,"src","self-hosted","conversion-overlays"),PACKAGE=join(PACKAGE_ROOT,"package.json");
const bool=value=>({__tag:"bool",value}),string=value=>({__tag:"string",value}),args=names=>new Map(names.map(name=>[name,bool(true)]));
const RESERVED=new Set(["version","pure","secure","flow","FLOW","contract","intent","record","return","if","match","check","deny","ambig","mut","let","Bool","Int","String","Verdict","Result","Option","Array","true","false","Ok","Err","Some","None","Allow","Deny","Unknown"]);
const CANDIDATES=Object.freeze([
  ["gate-v3-privacy-verify-taint-reaches-sink-status.fungi","gateV3PrivacyVerifyTaintReachesSinkStatusCore","galerina-core-compiler/src/gate-v3-privacy.ts","verifyTaintReachesSink","gate_v3_privacy_verify_taint_reaches_sink_built"],
  ["gate-v3-registry-canonical-json-status.fungi","gateV3RegistryCanonicalJsonStatusCore","galerina-core-compiler/src/gate-v3-registry.ts","function canonicalJson(","gate_v3_registry_canonical_json_built"],
  ["gate-v3-registry-emit-status.fungi","gateV3RegistryEmitStatusCore","galerina-core-compiler/src/gate-v3-registry.ts","const emit =","gate_v3_registry_emit_built"],
  ["gate-v3-registry-fail-status.fungi","gateV3RegistryFailStatusCore","galerina-core-compiler/src/gate-v3-registry.ts","const fail =","gate_v3_registry_fail_built"],
  ["gate-v3-registry-load-gate-v3-registry-status.fungi","gateV3RegistryLoadGateV3RegistryStatusCore","galerina-core-compiler/src/gate-v3-registry.ts","loadGateV3Registry","gate_v3_registry_load_gate_v3_registry_built"],
  ["gate-v3-registry-ports-status.fungi","gateV3RegistryPortsStatusCore","galerina-core-compiler/src/gate-v3-registry.ts","const ports =","gate_v3_registry_ports_built"],
  ["gate-v3-resolve-check-gate-v3-liveness-status.fungi","gateV3ResolveCheckGateV3LivenessStatusCore","galerina-core-compiler/src/gate-v3-resolve.ts","checkGateV3Liveness","gate_v3_resolve_check_gate_v3_liveness_built"],
  ["gate-v3-resolve-emit-status.fungi","gateV3ResolveEmitStatusCore","galerina-core-compiler/src/gate-v3-resolve.ts","const emit =","gate_v3_resolve_emit_built"],
  ["gate-v3-resolve-reach-status.fungi","gateV3ResolveReachStatusCore","galerina-core-compiler/src/gate-v3-resolve.ts","const reach =","gate_v3_resolve_reach_built"],
  ["gate-v3-resolve-resolve-gate-v3-status.fungi","gateV3ResolveResolveGateV3StatusCore","galerina-core-compiler/src/gate-v3-resolve.ts","resolveGateV3","gate_v3_resolve_resolve_gate_v3_built"],
  ["gate-v3-resolve-type-known-status.fungi","gateV3ResolveTypeKnownStatusCore","galerina-core-compiler/src/gate-v3-resolve.ts","const typeKnown =","gate_v3_resolve_type_known_built"],
  ["gate-v3-resolve-value-matches-type-status.fungi","gateV3ResolveValueMatchesTypeStatusCore","galerina-core-compiler/src/gate-v3-resolve.ts","function valueMatchesType(","gate_v3_resolve_value_matches_type_built"],
  ["gate-v3-verdict-fold-verdicts-status.fungi","gateV3VerdictFoldVerdictsStatusCore","galerina-core-compiler/src/gate-v3-verdict.ts","foldVerdicts","gate_v3_verdict_fold_verdicts_built"],
  ["gate-v3-verdict-v-and-status.fungi","gateV3VerdictVAndStatusCore","galerina-core-compiler/src/gate-v3-verdict.ts","function vAnd(","gate_v3_verdict_v_and_built"],
  ["gate-v3-verify-analyze-gate-v3-liveness-status.fungi","gateV3VerifyAnalyzeGateV3LivenessStatusCore","galerina-core-compiler/src/gate-v3-verify.ts","analyzeGateV3Liveness","gate_v3_verify_analyze_gate_v3_liveness_built"],
  ["gate-v3-verify-duplicates-status.fungi","gateV3VerifyDuplicatesStatusCore","galerina-core-compiler/src/gate-v3-verify.ts","const duplicates =","gate_v3_verify_duplicates_built"],
  ["gate-v3-verify-emit-status.fungi","gateV3VerifyEmitStatusCore","galerina-core-compiler/src/gate-v3-verify.ts","const emit =","gate_v3_verify_emit_built"],
  ["gate-v3-verify-find-cycle-status.fungi","gateV3VerifyFindCycleStatusCore","galerina-core-compiler/src/gate-v3-verify.ts","function findCycle(","gate_v3_verify_find_cycle_built"],
  ["gate-v3-verify-verify-gate-v3-structure-status.fungi","gateV3VerifyVerifyGateV3StructureStatusCore","galerina-core-compiler/src/gate-v3-verify.ts","verifyGateV3Structure","gate_v3_verify_verify_gate_v3_structure_built"],
  ["gate-v3-verify-walk-status.fungi","gateV3VerifyWalkStatusCore","galerina-core-compiler/src/gate-v3-verify.ts","const walk =","gate_v3_verify_walk_built"],
  ["gate-v3-verify-walk-value-status.fungi","gateV3VerifyWalkValueStatusCore","galerina-core-compiler/src/gate-v3-verify.ts","const walkValue =","gate_v3_verify_walk_value_built"],
  ["gate-v3-zone-dominators-of-status.fungi","gateV3ZoneDominatorsOfStatusCore","galerina-core-compiler/src/gate-v3-zone.ts","function dominatorsOf(","gate_v3_zone_dominators_of_built"],
  ["gate-v3-zone-refuse-status.fungi","gateV3ZoneRefuseStatusCore","galerina-core-compiler/src/gate-v3-zone.ts","const refuse =","gate_v3_zone_refuse_built"],
  ["gate-v3-zone-semantic-parts-status.fungi","gateV3ZoneSemanticPartsStatusCore","galerina-core-compiler/src/gate-v3-zone.ts","function semanticParts(","gate_v3_zone_semantic_parts_built"],
  ["gate-v3-zone-semantic-types-status.fungi","gateV3ZoneSemanticTypesStatusCore","galerina-core-compiler/src/gate-v3-zone.ts","function semanticTypes(","gate_v3_zone_semantic_types_built"],
  ["gate-v3-zone-verify-zone-domination-status.fungi","gateV3ZoneVerifyZoneDominationStatusCore","galerina-core-compiler/src/gate-v3-zone.ts","verifyZoneDomination","gate_v3_zone_verify_zone_domination_built"],
  ["gate-v3-zone-zone-gates-status.fungi","gateV3ZoneZoneGatesStatusCore","galerina-core-compiler/src/gate-v3-zone.ts","function zoneGates(","gate_v3_zone_zone_gates_built"],
  ["gir-emitter-emit-expr-status.fungi","girEmitterEmitExprStatusCore","galerina-core-compiler/src/gir-emitter.ts","export function emitExpr(","gir_emitter_emit_expr_built"],
  ["gir-emitter-emit-gir-status.fungi","girEmitterEmitGirStatusCore","galerina-core-compiler/src/gir-emitter.ts","export function emitGIR(","gir_emitter_emit_gir_built"],
  ["gir-emitter-find-nodes-status.fungi","girEmitterFindNodesStatusCore","galerina-core-compiler/src/gir-emitter.ts","export function findNodes(","gir_emitter_find_nodes_built"],
  ["gir-emitter-find-flow-node-status.fungi","girEmitterFindFlowNodeStatusCore","galerina-core-compiler/src/gir-emitter.ts","function findFlowNode(","gir_emitter_find_flow_node_built"],
  ["gir-emitter-find-governed-flow-node-status.fungi","girEmitterFindGovernedFlowNodeStatusCore","galerina-core-compiler/src/gir-emitter.ts","function findGovernedFlowNode(","gir_emitter_find_governed_flow_node_built"],
  ["gir-emitter-extract-param-types-status.fungi","girEmitterExtractParamTypesStatusCore","galerina-core-compiler/src/gir-emitter.ts","function extractParamTypes(","gir_emitter_extract_param_types_built"],
  ["gir-emitter-extract-intent-status.fungi","girEmitterExtractIntentStatusCore","galerina-core-compiler/src/gir-emitter.ts","function extractIntent(","gir_emitter_extract_intent_built"],
  ["gir-emitter-extract-protected-values-status.fungi","girEmitterExtractProtectedValuesStatusCore","galerina-core-compiler/src/gir-emitter.ts","function extractProtectedValues(","gir_emitter_extract_protected_values_built"],
  ["gir-emitter-parse-binding-value-status.fungi","girEmitterParseBindingValueStatusCore","galerina-core-compiler/src/gir-emitter.ts","function parseBindingValue(","gir_emitter_parse_binding_value_built"],
  ["gir-emitter-is-redacted-in-flow-status.fungi","girEmitterIsRedactedInFlowStatusCore","galerina-core-compiler/src/gir-emitter.ts","function isRedactedInFlow(","gir_emitter_is_redacted_in_flow_built"],
  ["gir-emitter-has-identifier-descendant-status.fungi","girEmitterHasIdentifierDescendantStatusCore","galerina-core-compiler/src/gir-emitter.ts","function hasIdentifierDescendant(","gir_emitter_has_identifier_descendant_built"],
  ["gir-emitter-extract-execution-status.fungi","girEmitterExtractExecutionStatusCore","galerina-core-compiler/src/gir-emitter.ts","function extractExecution(","gir_emitter_extract_execution_built"],
  ["gir-emitter-default-execution-status.fungi","girEmitterDefaultExecutionStatusCore","galerina-core-compiler/src/gir-emitter.ts","function defaultExecution(","gir_emitter_default_execution_built"],
].map(([file,flow,source,symbol,expected])=>Object.freeze({file,flow,source,symbol,input:args(["inputCaptured","stateChecked","decisionBuilt","evidenceBound","outcomeSealed","releaseChecked"]),expected:string(expected)})));

function shadowFingerprint(source){const identifiers=new Map();return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");}

describe("40-file source-bound Fungi decision-core overlay wave 32",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[],scopes=new Set(),sources=new Map();for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);let source=sources.get(c.source);if(source===undefined){source=readFileSync(join(ROOT,"packages-ts",c.source),"utf8");sources.set(c.source,source);}assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);const scope=`${c.source}#${c.symbol}`;assert.equal(scopes.has(scope),false);scopes.add(scope);}});
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{const seen=new Map(),files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const p=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(p),`${c.file} must exist`);const source=readFileSync(p,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);}}assert.deepEqual(collisions,[]);});
  it("parses, effect-checks, emits GIR and executes every decision core",async()=>{for(const c of CANDIDATES){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8"),program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});
