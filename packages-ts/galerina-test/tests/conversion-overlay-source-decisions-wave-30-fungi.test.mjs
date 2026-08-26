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
  ["fused-pass-pack-opcode-status.fungi","fusedPassPackOpcodeStatusCore","galerina-core-compiler/src/fused-pass.ts","packOpcode","fused_pass_pack_opcode_built"],
  ["fused-pass-unpack-op-status.fungi","fusedPassUnpackOpStatusCore","galerina-core-compiler/src/fused-pass.ts","unpackOp","fused_pass_unpack_op_built"],
  ["fused-pass-unpack-type-id-status.fungi","fusedPassUnpackTypeIdStatusCore","galerina-core-compiler/src/fused-pass.ts","unpackTypeId","fused_pass_unpack_type_id_built"],
  ["fused-pass-unpack-effect-mask-status.fungi","fusedPassUnpackEffectMaskStatusCore","galerina-core-compiler/src/fused-pass.ts","unpackEffectMask","fused_pass_unpack_effect_mask_built"],
  ["fused-pass-unpack-flags-status.fungi","fusedPassUnpackFlagsStatusCore","galerina-core-compiler/src/fused-pass.ts","unpackFlags","fused_pass_unpack_flags_built"],
  ["fused-pass-fused-compile-status.fungi","fusedPassFusedCompileStatusCore","galerina-core-compiler/src/fused-pass.ts","fusedCompile","fused_pass_fused_compile_built"],
  ["fused-pass-emit-status.fungi","fusedPassEmitStatusCore","galerina-core-compiler/src/fused-pass.ts","function emit(","fused_pass_emit_built"],
  ["fused-pass-error-status.fungi","fusedPassErrorStatusCore","galerina-core-compiler/src/fused-pass.ts","function error(","fused_pass_error_built"],
  ["fused-pass-skip-ws-status.fungi","fusedPassSkipWsStatusCore","galerina-core-compiler/src/fused-pass.ts","function skipWS(","fused_pass_skip_ws_built"],
  ["fused-pass-match-keyword-status.fungi","fusedPassMatchKeywordStatusCore","galerina-core-compiler/src/fused-pass.ts","function matchKeyword(","fused_pass_match_keyword_built"],
  ["fused-pass-read-identifier-status.fungi","fusedPassReadIdentifierStatusCore","galerina-core-compiler/src/fused-pass.ts","function readIdentifier(","fused_pass_read_identifier_built"],
  ["gate-dispatch-dispatch-gate-source-status.fungi","gateDispatchDispatchGateSourceStatusCore","galerina-core-compiler/src/gate-dispatch.ts","dispatchGateSource","gate_dispatch_dispatch_gate_source_built"],
  ["gate-dispatch-find-gate-registry-status.fungi","gateDispatchFindGateRegistryStatusCore","galerina-core-compiler/src/gate-dispatch.ts","findGateRegistry","gate_dispatch_find_gate_registry_built"],
  ["gate-from-pattern-refuse-status.fungi","gateFromPatternRefuseStatusCore","galerina-core-compiler/src/gate-from-pattern.ts","const refuse =","gate_from_pattern_refuse_built"],
  ["gate-from-pattern-parse-alternation-status.fungi","gateFromPatternParseAlternationStatusCore","galerina-core-compiler/src/gate-from-pattern.ts","function parseAlternation(","gate_from_pattern_parse_alternation_built"],
  ["gate-from-pattern-parse-sequence-status.fungi","gateFromPatternParseSequenceStatusCore","galerina-core-compiler/src/gate-from-pattern.ts","function parseSequence(","gate_from_pattern_parse_sequence_built"],
  ["gate-from-pattern-parse-atom-status.fungi","gateFromPatternParseAtomStatusCore","galerina-core-compiler/src/gate-from-pattern.ts","function parseAtom(","gate_from_pattern_parse_atom_built"],
  ["gate-from-pattern-parse-quantifier-status.fungi","gateFromPatternParseQuantifierStatusCore","galerina-core-compiler/src/gate-from-pattern.ts","function parseQuantifier(","gate_from_pattern_parse_quantifier_built"],
  ["gate-from-pattern-count-parts-status.fungi","gateFromPatternCountPartsStatusCore","galerina-core-compiler/src/gate-from-pattern.ts","function countParts(","gate_from_pattern_count_parts_built"],
  ["gate-from-pattern-emit-status.fungi","gateFromPatternEmitStatusCore","galerina-core-compiler/src/gate-from-pattern.ts","function emit(","gate_from_pattern_emit_built"],
  ["gate-from-pattern-generate-circuit-from-pattern-status.fungi","gateFromPatternGenerateCircuitFromPatternStatusCore","galerina-core-compiler/src/gate-from-pattern.ts","generateCircuitFromPattern","gate_from_pattern_generate_circuit_from_pattern_built"],
  ["gate-parser-strip-inline-comment-status.fungi","gateParserStripInlineCommentStatusCore","galerina-core-compiler/src/gate-parser.ts","function stripInlineComment(","gate_parser_strip_inline_comment_built"],
  ["gate-parser-parse-gate-header-status.fungi","gateParserParseGateHeaderStatusCore","galerina-core-compiler/src/gate-parser.ts","parseGateHeader","gate_parser_parse_gate_header_built"],
  ["gate-parser-parse-gate-node-status.fungi","gateParserParseGateNodeStatusCore","galerina-core-compiler/src/gate-parser.ts","parseGateNode","gate_parser_parse_gate_node_built"],
  ["gate-parser-parse-gate-edge-status.fungi","gateParserParseGateEdgeStatusCore","galerina-core-compiler/src/gate-parser.ts","parseGateEdge","gate_parser_parse_gate_edge_built"],
  ["gate-parser-parse-gate-flow-status.fungi","gateParserParseGateFlowStatusCore","galerina-core-compiler/src/gate-parser.ts","parseGateFlow","gate_parser_parse_gate_flow_built"],
  ["gate-parser-dedup-status.fungi","gateParserDedupStatusCore","galerina-core-compiler/src/gate-parser.ts","const dedup =","gate_parser_dedup_built"],
  ["gate-parser-gate-flow-name-status.fungi","gateParserGateFlowNameStatusCore","galerina-core-compiler/src/gate-parser.ts","gateFlowName","gate_parser_gate_flow_name_built"],
  ["gate-parser-lower-gate-status.fungi","gateParserLowerGateStatusCore","galerina-core-compiler/src/gate-parser.ts","lowerGate","gate_parser_lower_gate_built"],
  ["gate-parser-parse-gate-status.fungi","gateParserParseGateStatusCore","galerina-core-compiler/src/gate-parser.ts","parseGate","gate_parser_parse_gate_built"],
  ["gate-v3-admission-sha256-status.fungi","gateV3AdmissionSha256StatusCore","galerina-core-compiler/src/gate-v3-admission.ts","const sha256 =","gate_v3_admission_sha256_built"],
  ["gate-v3-admission-verify-admission-bindings-status.fungi","gateV3AdmissionVerifyAdmissionBindingsStatusCore","galerina-core-compiler/src/gate-v3-admission.ts","verifyAdmissionBindings","gate_v3_admission_verify_admission_bindings_built"],
  ["gate-v3-admission-build-admission-statement-status.fungi","gateV3AdmissionBuildAdmissionStatementStatusCore","galerina-core-compiler/src/gate-v3-admission.ts","buildAdmissionStatement","gate_v3_admission_build_admission_statement_built"],
  ["gate-v3-admission-build-admission-statement-refuse-status.fungi","gateV3AdmissionBuildAdmissionStatementRefuseStatusCore","galerina-core-compiler/src/gate-v3-admission.ts","location: input.circuit.location","gate_v3_admission_build_admission_statement_refuse_built"],
  ["gate-v3-authority-verify-terminal-vocabulary-status.fungi","gateV3AuthorityVerifyTerminalVocabularyStatusCore","galerina-core-compiler/src/gate-v3-authority.ts","verifyTerminalVocabulary","gate_v3_authority_verify_terminal_vocabulary_built"],
  ["gate-v3-authority-verify-deny-arm-containment-status.fungi","gateV3AuthorityVerifyDenyArmContainmentStatusCore","galerina-core-compiler/src/gate-v3-authority.ts","verifyDenyArmContainment","gate_v3_authority_verify_deny_arm_containment_built"],
  ["gate-v3-authority-verify-decision-shapes-status.fungi","gateV3AuthorityVerifyDecisionShapesStatusCore","galerina-core-compiler/src/gate-v3-authority.ts","verifyDecisionShapes","gate_v3_authority_verify_decision_shapes_built"],
  ["gate-v3-budget-compose-worst-case-budgets-status.fungi","gateV3BudgetComposeWorstCaseBudgetsStatusCore","galerina-core-compiler/src/gate-v3-budget.ts","composeWorstCaseBudgets","gate_v3_budget_compose_worst_case_budgets_built"],
  ["gate-v3-budget-verify-budget-composition-status.fungi","gateV3BudgetVerifyBudgetCompositionStatusCore","galerina-core-compiler/src/gate-v3-budget.ts","verifyBudgetComposition","gate_v3_budget_verify_budget_composition_built"],
  ["gate-v3-condense-by-code-unit-status.fungi","gateV3CondenseByCodeUnitStatusCore","galerina-core-compiler/src/gate-v3-condense.ts","function byCodeUnit(","gate_v3_condense_by_code_unit_built"],
].map(([file,flow,source,symbol,expected])=>Object.freeze({file,flow,source,symbol,input:args(["inputCaptured","stateChecked","decisionBuilt","evidenceBound","outcomeSealed","releaseChecked"]),expected:string(expected)})));

function shadowFingerprint(source){const identifiers=new Map();return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");}

describe("40-file source-bound Fungi decision-core overlay wave 30",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[],scopes=new Set(),sources=new Map();for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);let source=sources.get(c.source);if(source===undefined){source=readFileSync(join(ROOT,"packages-ts",c.source),"utf8");sources.set(c.source,source);}assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);const scope=`${c.source}#${c.symbol}`;assert.equal(scopes.has(scope),false);scopes.add(scope);}});
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{const seen=new Map(),files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const p=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(p),`${c.file} must exist`);const source=readFileSync(p,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);}}assert.deepEqual(collisions,[]);});
  it("parses, effect-checks, emits GIR and executes every decision core",async()=>{for(const c of CANDIDATES){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8"),program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});
