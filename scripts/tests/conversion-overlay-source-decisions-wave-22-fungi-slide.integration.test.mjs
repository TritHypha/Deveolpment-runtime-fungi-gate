import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { it } from "node:test";

const SLIDE_ROOT=process.env.GALERINA_SLIDE_REPO;
const AVAILABLE=typeof SLIDE_ROOT==="string"&&existsSync(join(SLIDE_ROOT,"src","checked-fungi-package-compiler.mjs"));
const ROOT=join(process.cwd(),"packages-ts","galerina-test","src","self-hosted","conversion-overlays");
const GATES=Object.freeze({identity:1,provenance:1,target:1,effects:1,policy:1,revocation:1,validation:1,memory:1});
const CANDIDATES=Object.freeze([
  ["cpu-lowbit-path-status.fungi","cpuLowbitPathStatusCore",4,"cpu_lowbit_path_available"],
  ["cpu-feature-probe-validate-status.fungi","cpuFeatureProbeValidateStatusCore",4,"cpu_feature_probe_validated"],
  ["cpu-target-plan-select-status.fungi","cpuTargetPlanSelectStatusCore",6,"cpu_target_plan_selected"],
  ["gpu-diagnostic-build-status.fungi","gpuDiagnosticBuildStatusCore",5,"gpu_diagnostic_built"],
  ["gpu-kernel-plan-validate-status.fungi","gpuKernelPlanValidateStatusCore",5,"gpu_kernel_plan_validated"],
  ["gpu-target-report-build-status.fungi","gpuTargetReportBuildStatusCore",4,"gpu_target_report_built"],
  ["js-diagnostic-build-status.fungi","jsDiagnosticBuildStatusCore",5,"js_diagnostic_built"],
  ["js-output-plan-validate-status.fungi","jsOutputPlanValidateStatusCore",5,"js_output_plan_validated"],
  ["js-module-metadata-validate-status.fungi","jsModuleMetadataValidateStatusCore",4,"js_module_metadata_validated"],
  ["js-framework-adapter-validate-status.fungi","jsFrameworkAdapterValidateStatusCore",4,"js_framework_adapter_validated"],
  ["js-bundle-report-build-status.fungi","jsBundleReportBuildStatusCore",6,"js_bundle_report_built"],
  ["js-bundle-check-presence-status.fungi","jsBundleCheckPresenceStatusCore",3,"js_bundle_check_present"],
  ["native-diagnostic-build-status.fungi","nativeDiagnosticBuildStatusCore",5,"native_diagnostic_built"],
  ["native-target-validate-status.fungi","nativeTargetValidateStatusCore",5,"native_target_validated"],
  ["native-artifact-validate-status.fungi","nativeArtifactValidateStatusCore",4,"native_artifact_validated"],
  ["native-target-report-build-status.fungi","nativeTargetReportBuildStatusCore",4,"native_target_report_built"],
  ["photonic-diagnostic-build-status.fungi","photonicDiagnosticBuildStatusCore",4,"photonic_diagnostic_built"],
  ["optical-channel-layout-validate-status.fungi","opticalChannelLayoutValidateStatusCore",5,"optical_channel_layout_validated"],
  ["photonic-lowering-plan-validate-status.fungi","photonicLoweringPlanValidateStatusCore",5,"photonic_lowering_plan_validated"],
  ["wasm-diagnostic-build-status.fungi","wasmDiagnosticBuildStatusCore",5,"wasm_diagnostic_built"],
  ["wasm-artifact-validate-status.fungi","wasmArtifactValidateStatusCore",4,"wasm_artifact_validated"],
  ["wasm-target-report-build-status.fungi","wasmTargetReportBuildStatusCore",4,"wasm_target_report_built"],
  ["benchmark-diagnostic-build-status.fungi","benchmarkDiagnosticBuildStatusCore",5,"benchmark_diagnostic_built"],
  ["benchmark-config-validate-status.fungi","benchmarkConfigValidateStatusCore",5,"benchmark_config_validated"],
  ["myco-index-path-validate-status.fungi","mycoIndexPathValidateStatusCore",5,"myco_index_path_validated"],
  ["myco-stored-index-validate-status.fungi","mycoStoredIndexValidateStatusCore",6,"myco_stored_index_validated"],
  ["myco-name-terms-build-status.fungi","mycoNameTermsBuildStatusCore",4,"myco_name_terms_built"],
  ["myco-term-edge-ceiling-status.fungi","mycoTermEdgeCeilingStatusCore",4,"myco_term_edge_ceiling_applied"],
  ["myco-graph-save-status.fungi","mycoGraphSaveStatusCore",5,"myco_graph_saved"],
  ["myco-graph-load-status.fungi","mycoGraphLoadStatusCore",4,"myco_graph_loaded"],
  ["myco-graph-load-outcome-status.fungi","mycoGraphLoadOutcomeStatusCore",6,"myco_graph_outcome_loaded"],
  ["myco-index-build-status.fungi","mycoIndexBuildStatusCore",6,"myco_index_built"],
  ["myco-term-count-status.fungi","mycoTermCountStatusCore",4,"myco_terms_counted"],
  ["myco-walk-status.fungi","mycoWalkStatusCore",5,"myco_walk_completed"],
  ["myco-render-status.fungi","mycoRenderStatusCore",4,"myco_result_rendered"],
  ["myco-summary-line-status.fungi","mycoSummaryLineStatusCore",4,"myco_summary_line_built"],
  ["myco-link-classify-status.fungi","mycoLinkClassifyStatusCore",5,"myco_link_classified"],
  ["myco-trailing-slash-status.fungi","mycoTrailingSlashStatusCore",4,"myco_trailing_slash_handled"],
  ["myco-private-reference-scan-status.fungi","mycoPrivateReferenceScanStatusCore",5,"myco_private_references_scanned"],
  ["myco-link-scan-status.fungi","mycoLinkScanStatusCore",5,"myco_links_scanned"],
].map(([file,flow,count,expected])=>Object.freeze({file,flow,args:Array(count).fill(true),expected})));

async function api(){const load=async p=>import(pathToFileURL(join(SLIDE_ROOT,"src",p)).href);return {...await load("checked-fungi-package-compiler.mjs"),...await load("checked-fungi-package-file.mjs"),...await load("checked-fungi-package-publication-loader.mjs"),...await load("safe-value-envelope.mjs"),...await load("portable-veo.mjs")};}
function expectation(r){return {packageSetDigest:r.packageSetDigest,packageIdentity:r.packageIdentity,exportName:r.exportName,receiptDigest:r.receiptDigest,safeValueTypeId:r.safeValueTypeId,safeValueStateId:r.safeValueStateId,safeValueProvenanceDigest:r.safeValueProvenanceDigest};}

it("publishes and independently re-admits all 40 wave-22 source decisions through physical SLIDE/VOK",{skip:!AVAILABLE},async()=>{
 const slide=await api();const context=slide.portableVeoReferenceContext();const sources=CANDIDATES.map(c=>Uint8Array.from(readFileSync(join(ROOT,c.file))));const request=bytes=>({packages:[{identity:"@galerina/test",version:"1.0.0-beta.22",exports:CANDIDATES.map((c,i)=>({name:c.flow,sourceFlowName:c.flow,sourceBytes:bytes[i]})),dependencies:[],resources:[]}],context,gates:GATES});const compiled=slide.compileCheckedFungiPackageSet(request(sources));if(compiled.verdict!==1){const failures=[];for(let i=0;i<CANDIDATES.length;i++){const c=CANDIDATES[i];const one=slide.compileCheckedFungiPackageSet({packages:[{identity:"@galerina/test",version:"1.0.0-beta.22",exports:[{name:c.flow,sourceFlowName:c.flow,sourceBytes:sources[i]}],dependencies:[],resources:[]}],context,gates:GATES});if(one.verdict!==1)failures.push(c.flow+":"+JSON.stringify(one));}assert.fail("physical SLIDE compilation refused: "+failures.join(", "));}const changed=sources.map(source=>Uint8Array.from(source));changed[0][0]^=1;assert.equal(slide.compileCheckedFungiPackageSet(request(changed)).verdict,-1);const parent=await mkdtemp(join(tmpdir(),"galerina-wave-22-"));const out=join(parent,"published");
 try{const published=await slide.publishCheckedFungiPackageBuild({packageBuildHandle:compiled.packageBuildHandle,outputDirectory:out});assert.equal(published.verdict,1,JSON.stringify(published));const files=published.outputFiles.filter(n=>n.endsWith(".slide"));assert.equal(files.length,40);let last;for(const c of CANDIDATES){const prepared=await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:c.flow,context,gates:GATES});assert.equal(prepared.verdict,1,c.flow);const receipt=slide.executeTypedCheckedFungiPackagePublication(prepared.packageExecutionHandle,c.args,undefined);assert.equal(receipt.status,"SUCCEEDED_PHYSICAL_REFERENCE_ONLY",c.flow);const verified=slide.verifyTypedCheckedFungiPackageReceipt(receipt,expectation(receipt));assert.equal(verified.verdict,1,c.flow);assert.equal(verified.value,c.expected,c.flow);assert.equal(verified.authorityReleased,false,c.flow);last=receipt;}assert.equal(slide.verifyTypedCheckedFungiPackageReceipt({...last,receiptDigest:"sha256:"+"0".repeat(64)},expectation(last)).verdict,-1);const path=join(out,files[0]);const bytes=await readFile(path);bytes[0]^=1;await writeFile(path,bytes);assert.equal((await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:CANDIDATES[0].flow,context,gates:GATES})).verdict,-1);}finally{await rm(parent,{recursive:true,force:true});}
});

