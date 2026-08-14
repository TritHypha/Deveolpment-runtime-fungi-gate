import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

const ROOT=join(import.meta.dirname,"..","..",".."),PACKAGE_ROOT=join(ROOT,"packages-galerina","galerina-test"),OVERLAY_ROOT=join(PACKAGE_ROOT,"src","self-hosted","conversion-overlays"),PACKAGE=join(PACKAGE_ROOT,"package.json"),SOURCE="galerina-core-compiler/src/interpreter.ts";
const bool=value=>({__tag:"bool",value}),string=value=>({__tag:"string",value}),args=names=>new Map(names.map(name=>[name,bool(true)]));
const RESERVED=new Set(["version","pure","secure","flow","FLOW","contract","intent","record","return","if","match","check","deny","ambig","mut","let","Bool","Int","String","Verdict","Result","Option","Array","true","false","Ok","Err","Some","None","Allow","Deny","Unknown"]);
const CANDIDATES=Object.freeze([
  ["interpreter-bool-val-status.fungi","interpreterBoolValStatusCore","const boolVal =","interpreter_bool_val_built"],
  ["interpreter-verdict-val-status.fungi","interpreterVerdictValStatusCore","const verdictVal =","interpreter_verdict_val_built"],
  ["interpreter-float-cmp-status.fungi","interpreterFloatCmpStatusCore","function floatCmp(","interpreter_float_cmp_built"],
  ["interpreter-dispatch-key-status.fungi","interpreterDispatchKeyStatusCore","export function dispatchKey(","interpreter_dispatch_key_built"],
  ["interpreter-fast-int-op-status.fungi","interpreterFastIntOpStatusCore","function fastIntOp(","interpreter_fast_int_op_built"],
  ["interpreter-tag-int-status.fungi","interpreterTagIntStatusCore","export function tagInt(","interpreter_tag_int_built"],
  ["interpreter-is-tagged-status.fungi","interpreterIsTaggedStatusCore","export function isTagged(","interpreter_is_tagged_built"],
  ["interpreter-untag-status.fungi","interpreterUntagStatusCore","export function untag(","interpreter_untag_built"],
  ["interpreter-fits-tagged-status.fungi","interpreterFitsTaggedStatusCore","export function fitsTagged(","interpreter_fits_tagged_built"],
  ["interpreter-sync-not-supported-class-status.fungi","interpreterSyncNotSupportedClassStatusCore","class SyncNotSupported {","interpreter_sync_not_supported_class_built"],
  ["interpreter-sync-not-supported-constructor-status.fungi","interpreterSyncNotSupportedConstructorStatusCore","constructor(readonly reason: string)","interpreter_sync_not_supported_constructor_built"],
  ["interpreter-sync-return-class-status.fungi","interpreterSyncReturnClassStatusCore","class SyncReturn {","interpreter_sync_return_class_built"],
  ["interpreter-sync-return-constructor-status.fungi","interpreterSyncReturnConstructorStatusCore","constructor(readonly value: GalerinaValue)","interpreter_sync_return_constructor_built"],
  ["interpreter-sync-interpreter-class-status.fungi","interpreterSyncInterpreterClassStatusCore","class SyncInterpreter {","interpreter_sync_interpreter_class_built"],
  ["interpreter-sync-interpreter-constructor-status.fungi","interpreterSyncInterpreterConstructorStatusCore","private readonly maxSteps: number = DEFAULT_MAX_STEPS","interpreter_sync_interpreter_constructor_built"],
  ["interpreter-sync-interpreter-run-status.fungi","interpreterSyncInterpreterRunStatusCore","run(flowName: string, args: ReadonlyMap<string, GalerinaValue>)","interpreter_sync_interpreter_run_built"],
  ["interpreter-sync-interpreter-find-flow-node-status.fungi","interpreterSyncInterpreterFindFlowNodeStatusCore","findFlowNode(name: string)","interpreter_sync_interpreter_find_flow_node_built"],
  ["interpreter-sync-interpreter-eval-expr-s-status.fungi","interpreterSyncInterpreterEvalExprSStatusCore","evalExprS(node: AstNode)","interpreter_sync_interpreter_eval_expr_s_built"],
  ["interpreter-sync-interpreter-exec-block-status.fungi","interpreterSyncInterpreterExecBlockStatusCore","execBlock(block: AstNode)","interpreter_sync_interpreter_exec_block_built"],
  ["interpreter-sync-interpreter-exec-stmt-status.fungi","interpreterSyncInterpreterExecStmtStatusCore","execStmt(node: AstNode)","interpreter_sync_interpreter_exec_stmt_built"],
  ["interpreter-sync-interpreter-get-param-names-status.fungi","interpreterSyncInterpreterGetParamNamesStatusCore","getParamNames(flowName: string)","interpreter_sync_interpreter_get_param_names_built"],
  ["interpreter-try-pure-flow-sync-status.fungi","interpreterTryPureFlowSyncStatusCore","export function tryPureFlowSync(","interpreter_try_pure_flow_sync_built"],
  ["interpreter-early-return-class-status.fungi","interpreterEarlyReturnClassStatusCore","class EarlyReturn {","interpreter_early_return_class_built"],
  ["interpreter-early-return-constructor-status.fungi","interpreterEarlyReturnConstructorStatusCore","constructor(readonly value: GalerinaValue)","interpreter_early_return_constructor_built"],
  ["interpreter-fault-signal-class-status.fungi","interpreterFaultSignalClassStatusCore","class FaultSignal {","interpreter_fault_signal_class_built"],
  ["interpreter-fault-signal-constructor-status.fungi","interpreterFaultSignalConstructorStatusCore","constructor(readonly reason: string, readonly value: GalerinaValue)","interpreter_fault_signal_constructor_built"],
  ["interpreter-trap-signal-class-status.fungi","interpreterTrapSignalClassStatusCore","class TrapSignal {","interpreter_trap_signal_class_built"],
  ["interpreter-trap-signal-constructor-status.fungi","interpreterTrapSignalConstructorStatusCore","constructor(readonly errorCode: string)","interpreter_trap_signal_constructor_built"],
  ["interpreter-fault-reason-text-status.fungi","interpreterFaultReasonTextStatusCore","function faultReasonText(","interpreter_fault_reason_text_built"],
  ["interpreter-class-status.fungi","interpreterClassStatusCore","class Interpreter {","interpreter_class_built"],
  ["interpreter-charge-step-status.fungi","interpreterChargeStepStatusCore","private chargeStep(): void","interpreter_charge_step_built"],
  ["interpreter-constructor-status.fungi","interpreterConstructorStatusCore","this.flowIndex = buildFlowIndex(ast)","interpreter_constructor_built"],
  ["interpreter-process-top-level-statics-status.fungi","interpreterProcessTopLevelStaticsStatusCore","private processTopLevelStatics(","interpreter_process_top_level_statics_built"],
  ["interpreter-eval-expr-sync-status.fungi","interpreterEvalExprSyncStatusCore","private evalExprSync(","interpreter_eval_expr_sync_built"],
  ["interpreter-get-context-status.fungi","interpreterGetContextStatusCore","private getContext(","interpreter_get_context_built"],
  ["interpreter-make-stdlib-context-status.fungi","interpreterMakeStdlibContextStatusCore","private makeStdlibContext()","interpreter_make_stdlib_context_built"],
  ["interpreter-run-flow-status.fungi","interpreterRunFlowStatusCore","async runFlow(","interpreter_run_flow_built"],
  ["interpreter-build-result-status.fungi","interpreterBuildResultStatusCore","private buildResult(","interpreter_build_result_built"],
  ["interpreter-check-input-preconditions-status.fungi","interpreterCheckInputPreconditionsStatusCore","private async checkInputPreconditions(","interpreter_check_input_preconditions_built"],
  ["interpreter-check-parameter-admission-status.fungi","interpreterCheckParameterAdmissionStatusCore","private async checkParameterAdmission(","interpreter_check_parameter_admission_built"],
].map(([file,flow,symbol,expected])=>Object.freeze({file,flow,source:SOURCE,symbol,input:args(["inputCaptured","stateChecked","decisionBuilt","evidenceBound","outcomeSealed","releaseChecked"]),expected:string(expected)})));

function shadowFingerprint(source){const identifiers=new Map();return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");}

describe("40-file source-bound Fungi decision-core overlay wave 37",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[],scopes=new Set();for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-galerina",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);const scope=`${c.source}#${c.flow}`;assert.equal(scopes.has(scope),false);scopes.add(scope);}});
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{const seen=new Map(),files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const p=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(p),`${c.file} must exist`);const source=readFileSync(p,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);}}assert.deepEqual(collisions,[]);});
  it("parses, effect-checks, emits GIR and executes every decision core",async()=>{for(const c of CANDIDATES){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8"),program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});
