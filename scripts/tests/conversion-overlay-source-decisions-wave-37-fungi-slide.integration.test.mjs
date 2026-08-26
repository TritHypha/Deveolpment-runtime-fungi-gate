import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { it } from "node:test";

const SLIDE_ROOT=process.env.GALERINA_SLIDE_REPO,AVAILABLE=typeof SLIDE_ROOT==="string"&&existsSync(join(SLIDE_ROOT,"src","checked-fungi-package-compiler.mjs")),ROOT=join(process.cwd(),"packages-ts","galerina-test","src","self-hosted","conversion-overlays"),GATES=Object.freeze({identity:1,provenance:1,target:1,effects:1,policy:1,revocation:1,validation:1,memory:1});
const CANDIDATES=Object.freeze([
  ["interpreter-bool-val-status.fungi","interpreterBoolValStatusCore","interpreter_bool_val_built"],
  ["interpreter-verdict-val-status.fungi","interpreterVerdictValStatusCore","interpreter_verdict_val_built"],
  ["interpreter-float-cmp-status.fungi","interpreterFloatCmpStatusCore","interpreter_float_cmp_built"],
  ["interpreter-dispatch-key-status.fungi","interpreterDispatchKeyStatusCore","interpreter_dispatch_key_built"],
  ["interpreter-fast-int-op-status.fungi","interpreterFastIntOpStatusCore","interpreter_fast_int_op_built"],
  ["interpreter-tag-int-status.fungi","interpreterTagIntStatusCore","interpreter_tag_int_built"],
  ["interpreter-is-tagged-status.fungi","interpreterIsTaggedStatusCore","interpreter_is_tagged_built"],
  ["interpreter-untag-status.fungi","interpreterUntagStatusCore","interpreter_untag_built"],
  ["interpreter-fits-tagged-status.fungi","interpreterFitsTaggedStatusCore","interpreter_fits_tagged_built"],
  ["interpreter-sync-not-supported-class-status.fungi","interpreterSyncNotSupportedClassStatusCore","interpreter_sync_not_supported_class_built"],
  ["interpreter-sync-not-supported-constructor-status.fungi","interpreterSyncNotSupportedConstructorStatusCore","interpreter_sync_not_supported_constructor_built"],
  ["interpreter-sync-return-class-status.fungi","interpreterSyncReturnClassStatusCore","interpreter_sync_return_class_built"],
  ["interpreter-sync-return-constructor-status.fungi","interpreterSyncReturnConstructorStatusCore","interpreter_sync_return_constructor_built"],
  ["interpreter-sync-interpreter-class-status.fungi","interpreterSyncInterpreterClassStatusCore","interpreter_sync_interpreter_class_built"],
  ["interpreter-sync-interpreter-constructor-status.fungi","interpreterSyncInterpreterConstructorStatusCore","interpreter_sync_interpreter_constructor_built"],
  ["interpreter-sync-interpreter-run-status.fungi","interpreterSyncInterpreterRunStatusCore","interpreter_sync_interpreter_run_built"],
  ["interpreter-sync-interpreter-find-flow-node-status.fungi","interpreterSyncInterpreterFindFlowNodeStatusCore","interpreter_sync_interpreter_find_flow_node_built"],
  ["interpreter-sync-interpreter-eval-expr-s-status.fungi","interpreterSyncInterpreterEvalExprSStatusCore","interpreter_sync_interpreter_eval_expr_s_built"],
  ["interpreter-sync-interpreter-exec-block-status.fungi","interpreterSyncInterpreterExecBlockStatusCore","interpreter_sync_interpreter_exec_block_built"],
  ["interpreter-sync-interpreter-exec-stmt-status.fungi","interpreterSyncInterpreterExecStmtStatusCore","interpreter_sync_interpreter_exec_stmt_built"],
  ["interpreter-sync-interpreter-get-param-names-status.fungi","interpreterSyncInterpreterGetParamNamesStatusCore","interpreter_sync_interpreter_get_param_names_built"],
  ["interpreter-try-pure-flow-sync-status.fungi","interpreterTryPureFlowSyncStatusCore","interpreter_try_pure_flow_sync_built"],
  ["interpreter-early-return-class-status.fungi","interpreterEarlyReturnClassStatusCore","interpreter_early_return_class_built"],
  ["interpreter-early-return-constructor-status.fungi","interpreterEarlyReturnConstructorStatusCore","interpreter_early_return_constructor_built"],
  ["interpreter-fault-signal-class-status.fungi","interpreterFaultSignalClassStatusCore","interpreter_fault_signal_class_built"],
  ["interpreter-fault-signal-constructor-status.fungi","interpreterFaultSignalConstructorStatusCore","interpreter_fault_signal_constructor_built"],
  ["interpreter-trap-signal-class-status.fungi","interpreterTrapSignalClassStatusCore","interpreter_trap_signal_class_built"],
  ["interpreter-trap-signal-constructor-status.fungi","interpreterTrapSignalConstructorStatusCore","interpreter_trap_signal_constructor_built"],
  ["interpreter-fault-reason-text-status.fungi","interpreterFaultReasonTextStatusCore","interpreter_fault_reason_text_built"],
  ["interpreter-class-status.fungi","interpreterClassStatusCore","interpreter_class_built"],
  ["interpreter-charge-step-status.fungi","interpreterChargeStepStatusCore","interpreter_charge_step_built"],
  ["interpreter-constructor-status.fungi","interpreterConstructorStatusCore","interpreter_constructor_built"],
  ["interpreter-process-top-level-statics-status.fungi","interpreterProcessTopLevelStaticsStatusCore","interpreter_process_top_level_statics_built"],
  ["interpreter-eval-expr-sync-status.fungi","interpreterEvalExprSyncStatusCore","interpreter_eval_expr_sync_built"],
  ["interpreter-get-context-status.fungi","interpreterGetContextStatusCore","interpreter_get_context_built"],
  ["interpreter-make-stdlib-context-status.fungi","interpreterMakeStdlibContextStatusCore","interpreter_make_stdlib_context_built"],
  ["interpreter-run-flow-status.fungi","interpreterRunFlowStatusCore","interpreter_run_flow_built"],
  ["interpreter-build-result-status.fungi","interpreterBuildResultStatusCore","interpreter_build_result_built"],
  ["interpreter-check-input-preconditions-status.fungi","interpreterCheckInputPreconditionsStatusCore","interpreter_check_input_preconditions_built"],
  ["interpreter-check-parameter-admission-status.fungi","interpreterCheckParameterAdmissionStatusCore","interpreter_check_parameter_admission_built"],
].map(([file,flow,expected])=>Object.freeze({file,flow,args:Array(6).fill(true),expected})));

async function api(){const load=async p=>import(pathToFileURL(join(SLIDE_ROOT,"src",p)).href);return {...await load("checked-fungi-package-compiler.mjs"),...await load("checked-fungi-package-file.mjs"),...await load("checked-fungi-package-publication-loader.mjs"),...await load("safe-value-envelope.mjs"),...await load("portable-veo.mjs")};}
function expectation(r){return {packageSetDigest:r.packageSetDigest,packageIdentity:r.packageIdentity,exportName:r.exportName,receiptDigest:r.receiptDigest,safeValueTypeId:r.safeValueTypeId,safeValueStateId:r.safeValueStateId,safeValueProvenanceDigest:r.safeValueProvenanceDigest};}

it("publishes and independently re-admits all 40 wave-37 source decisions through physical SLIDE/VOK",{skip:!AVAILABLE},async()=>{
  const slide=await api(),context=slide.portableVeoReferenceContext(),sources=CANDIDATES.map(c=>Uint8Array.from(readFileSync(join(ROOT,c.file)))),request=bytes=>({packages:[{identity:"@galerina/test",version:"1.0.0-beta.37",exports:CANDIDATES.map((c,i)=>({name:c.flow,sourceFlowName:c.flow,sourceBytes:bytes[i]})),dependencies:[],resources:[]}],context,gates:GATES}),compiled=slide.compileCheckedFungiPackageSet(request(sources));
  assert.equal(compiled.verdict,1,JSON.stringify(compiled));const changed=sources.map(source=>Uint8Array.from(source));changed[0][0]^=1;assert.equal(slide.compileCheckedFungiPackageSet(request(changed)).verdict,-1);
  const parent=await mkdtemp(join(tmpdir(),"galerina-wave-37-")),out=join(parent,"published");
  try{const published=await slide.publishCheckedFungiPackageBuild({packageBuildHandle:compiled.packageBuildHandle,outputDirectory:out});assert.equal(published.verdict,1,JSON.stringify(published));assert.equal(published.outputFiles.filter(n=>n.endsWith(".slide")).length,40);let last;for(const c of CANDIDATES){const prepared=await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:c.flow,context,gates:GATES});assert.equal(prepared.verdict,1,c.flow);const receipt=slide.executeTypedCheckedFungiPackagePublication(prepared.packageExecutionHandle,c.args,undefined),verified=slide.verifyTypedCheckedFungiPackageReceipt(receipt,expectation(receipt));assert.equal(verified.verdict,1,c.flow);assert.equal(verified.value,c.expected,c.flow);assert.equal(verified.authorityReleased,false,c.flow);last=receipt;}assert.equal(slide.verifyTypedCheckedFungiPackageReceipt({...last,receiptDigest:"sha256:"+"0".repeat(64)},expectation(last)).verdict,-1);const path=join(out,published.outputFiles.find(n=>n.endsWith(".slide"))),bytes=await readFile(path);bytes[0]^=1;await writeFile(path,bytes);assert.equal((await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:CANDIDATES[0].flow,context,gates:GATES})).verdict,-1);}finally{await rm(parent,{recursive:true,force:true});}
});
