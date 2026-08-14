import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

const ROOT=join(import.meta.dirname,"..","..","..");
const PACKAGE_ROOT=join(ROOT,"packages-galerina","galerina-test");
const OVERLAY_ROOT=join(PACKAGE_ROOT,"src","self-hosted","conversion-overlays");
const PACKAGE=join(PACKAGE_ROOT,"package.json");
const bool=value=>({__tag:"bool",value});
const string=value=>({__tag:"string",value});
const args=names=>new Map(names.map(name=>[name,bool(true)]));
const RESERVED=new Set(["version","pure","secure","flow","FLOW","contract","intent","record","return","if","match","check","deny","ambig","mut","let","Bool","Int","String","Verdict","Result","Option","Array","true","false","Ok","Err","Some","None","Allow","Deny","Unknown"]);
const C="galerina-target-cpu/src/index.ts";
const G="galerina-target-gpu/src/index.ts";
const J="galerina-target-js/src/index.ts";
const N="galerina-target-native/src/index.ts";
const P="galerina-target-photonic/src/index.ts";
const W="galerina-target-wasm/src/index.ts";
const K="galerina-tools-benchmark/src/index.ts";
const X="galerina-tools-myco/src/graph/index-contract.ts";
const Y="galerina-tools-myco/src/graph/model.ts";
const Z="galerina-tools-myco/src/graph/store.ts";
const Q="galerina-tools-myco/src/ingest/indexer.ts";
const R="galerina-tools-myco/src/ingest/tokenize.ts";
const S="galerina-tools-myco/src/ingest/walk.ts";
const O="galerina-tools-myco/src/output.ts";
const L="galerina-tools-myco/src/query/links.ts";
const SOURCES=Object.freeze({C,G,J,N,P,W,K,X,Y,Z,Q,R,S,O,L});
const CANDIDATES=Object.freeze([
  ["cpu-lowbit-path-status.fungi","cpuLowbitPathStatusCore","C","canUseLowBitCpuPath",["capabilityCaptured","lowBitEnabled","architectureKnown","simdAvailable"],"cpu_lowbit_path_available"],
  ["cpu-feature-probe-validate-status.fungi","cpuFeatureProbeValidateStatusCore","C","validateCpuFeatureProbe",["probeCaptured","coresPositive","memoryOptionalValid","diagnosticsBuilt"],"cpu_feature_probe_validated"],
  ["cpu-target-plan-select-status.fungi","cpuTargetPlanSelectStatusCore","C","selectCpuTargetPlan",["capabilityCaptured","plansCaptured","featuresMatched","memoryMatched","lowbitMatched","reportBuilt"],"cpu_target_plan_selected"],
  ["gpu-diagnostic-build-status.fungi","gpuDiagnosticBuildStatusCore","G","function gpuDiagnostic",["codeCaptured","severityCaptured","messageCaptured","pathOptional","recordBuilt"],"gpu_diagnostic_built"],
  ["gpu-kernel-plan-validate-status.fungi","gpuKernelPlanValidateStatusCore","G","validateGpuKernelPlan",["planCaptured","flowNamed","backendKnown","backendAvailable","operationsPresent"],"gpu_kernel_plan_validated"],
  ["gpu-target-report-build-status.fungi","gpuTargetReportBuildStatusCore","G","createGpuTargetReport",["inputCaptured","plansValidated","warningsLifted","reportBuilt"],"gpu_target_report_built"],
  ["js-diagnostic-build-status.fungi","jsDiagnosticBuildStatusCore","J","function jsDiagnostic",["codeCaptured","severityCaptured","messageCaptured","pathOptional","recordBuilt"],"js_diagnostic_built"],
  ["js-output-plan-validate-status.fungi","jsOutputPlanValidateStatusCore","J","validateJsOutputPlan",["planCaptured","runtimeKnown","formatKnown","browserPolicyPassed","sourceMapSafe"],"js_output_plan_validated"],
  ["js-module-metadata-validate-status.fungi","jsModuleMetadataValidateStatusCore","J","validateEsModuleMetadata",["metadataCaptured","pathNamed","exportsReviewed","diagnosticsBuilt"],"js_module_metadata_validated"],
  ["js-framework-adapter-validate-status.fungi","jsFrameworkAdapterValidateStatusCore","J","validateFrameworkAdapterMetadata",["metadataCaptured","frameworkNamed","pathBound","diagnosticsBuilt"],"js_framework_adapter_validated"],
  ["js-bundle-report-build-status.fungi","jsBundleReportBuildStatusCore","J","createJsBundleReport",["inputCaptured","planValidated","modulesValidated","adaptersValidated","checksBuilt","reportBuilt"],"js_bundle_report_built"],
  ["js-bundle-check-presence-status.fungi","jsBundleCheckPresenceStatusCore","J","const has =",["checksCaptured","kindSelected","matchFound"],"js_bundle_check_present"],
  ["native-diagnostic-build-status.fungi","nativeDiagnosticBuildStatusCore","N","function nativeDiagnostic",["codeCaptured","severityCaptured","messageCaptured","pathOptional","recordBuilt"],"native_diagnostic_built"],
  ["native-target-validate-status.fungi","nativeTargetValidateStatusCore","N","validateNativeTarget",["targetCaptured","platformKnown","architectureKnown","formatKnown","diagnosticsBuilt"],"native_target_validated"],
  ["native-artifact-validate-status.fungi","nativeArtifactValidateStatusCore","N","validateNativeArtifact",["artifactCaptured","pathNamed","targetValidated","exportsReviewed"],"native_artifact_validated"],
  ["native-target-report-build-status.fungi","nativeTargetReportBuildStatusCore","N","createNativeTargetReport",["inputCaptured","artifactsValidated","warningsLifted","reportBuilt"],"native_target_report_built"],
  ["photonic-diagnostic-build-status.fungi","photonicDiagnosticBuildStatusCore","P","function photonicDiagnostic",["codeCaptured","messageCaptured","fixOptional","recordBuilt"],"photonic_diagnostic_built"],
  ["optical-channel-layout-validate-status.fungi","opticalChannelLayoutValidateStatusCore","P","validateOpticalChannelLayout",["channelCaptured","idNamed","wavelengthPositive","phaseFinite","amplitudeNormal"],"optical_channel_layout_validated"],
  ["photonic-lowering-plan-validate-status.fungi","photonicLoweringPlanValidateStatusCore","P","validatePhotonicLoweringPlan",["planCaptured","statusKnown","unsupportedExplained","statusConsistent","workPresent"],"photonic_lowering_plan_validated"],
  ["wasm-diagnostic-build-status.fungi","wasmDiagnosticBuildStatusCore","W","function wasmDiagnostic",["codeCaptured","severityCaptured","messageCaptured","pathOptional","recordBuilt"],"wasm_diagnostic_built"],
  ["wasm-artifact-validate-status.fungi","wasmArtifactValidateStatusCore","W","validateWasmArtefact",["artifactCaptured","pathNamed","runtimeKnown","exportsReviewed"],"wasm_artifact_validated"],
  ["wasm-target-report-build-status.fungi","wasmTargetReportBuildStatusCore","W","createWasmTargetReport",["inputCaptured","artifactsValidated","warningsLifted","reportBuilt"],"wasm_target_report_built"],
  ["benchmark-diagnostic-build-status.fungi","benchmarkDiagnosticBuildStatusCore","K","function createBenchmarkDiagnostic",["codeCaptured","severityCaptured","messageCaptured","pathOptional","recordBuilt"],"benchmark_diagnostic_built"],
  ["benchmark-config-validate-status.fungi","benchmarkConfigValidateStatusCore","K","validateBenchmarkConfig",["configCaptured","durationPositive","singleTestBounded","privacySafe","targetEnabled"],"benchmark_config_validated"],
  ["myco-index-path-validate-status.fungi","mycoIndexPathValidateStatusCore","X","isCanonicalIndexPath",["valueCaptured","stringTyped","lengthBounded","pathRelative","segmentsCanonical"],"myco_index_path_validated"],
  ["myco-stored-index-validate-status.fungi","mycoStoredIndexValidateStatusCore","X","validateStoredIndex",["valueCaptured","limitsValid","shapeExact","filesBounded","termsBounded","indexBuilt"],"myco_stored_index_validated"],
  ["myco-name-terms-build-status.fungi","mycoNameTermsBuildStatusCore","Y","nameTermsOf",["pathCaptured","tokensScanned","termsFolded","resultBuilt"],"myco_name_terms_built"],
  ["myco-term-edge-ceiling-status.fungi","mycoTermEdgeCeilingStatusCore","Z","clampTermEdgeCeiling",["requestCaptured","integerValid","nonnegative","ceilingApplied"],"myco_term_edge_ceiling_applied"],
  ["myco-graph-save-status.fungi","mycoGraphSaveStatusCore","Z","saveGraph",["rootCaptured","graphCaptured","edgesBounded","filesOrdered","payloadWritten"],"myco_graph_saved"],
  ["myco-graph-load-status.fungi","mycoGraphLoadStatusCore","Z","loadGraph",["rootCaptured","optionsCaptured","outcomeLoaded","statusProjected"],"myco_graph_loaded"],
  ["myco-graph-load-outcome-status.fungi","mycoGraphLoadOutcomeStatusCore","Z","loadGraphOutcome",["rootCaptured","boundsValid","pathContained","fileTrusted","jsonValidated","graphBuilt"],"myco_graph_outcome_loaded"],
  ["myco-index-build-status.fungi","mycoIndexBuildStatusCore","Q","buildIndex",["rootCaptured","priorLoaded","filesWalked","termsCounted","ceilingHeld","graphSaved"],"myco_index_built"],
  ["myco-term-count-status.fungi","mycoTermCountStatusCore","R","countTerms",["textCaptured","wordsScanned","caseFolded","countsBuilt"],"myco_terms_counted"],
  ["myco-walk-status.fungi","mycoWalkStatusCore","S","export async function walk",["rootCaptured","optionsCaptured","ignoreRulesLoaded","entriesBounded","filesCollected"],"myco_walk_completed"],
  ["myco-render-status.fungi","mycoRenderStatusCore","O","export function render",["resultCaptured","modeCaptured","optionsCaptured","bodyRendered"],"myco_result_rendered"],
  ["myco-summary-line-status.fungi","mycoSummaryLineStatusCore","O","summaryLine",["resultCaptured","countsRendered","narrowingDisclosed","summaryBuilt"],"myco_summary_line_built"],
  ["myco-link-classify-status.fungi","mycoLinkClassifyStatusCore","L","classifyBroken",["hrefCaptured","pathDecoded","placeholderChecked","candidatesResolved","classBuilt"],"myco_link_classified"],
  ["myco-trailing-slash-status.fungi","mycoTrailingSlashStatusCore","L","stripTrailingSlash",["pathCaptured","lengthChecked","suffixChecked","pathReturned"],"myco_trailing_slash_handled"],
  ["myco-private-reference-scan-status.fungi","mycoPrivateReferenceScanStatusCore","L","scanPrivateRefs",["fileCaptured","textCaptured","linksScanned","targetsChecked","privateRefsBuilt"],"myco_private_references_scanned"],
  ["myco-link-scan-status.fungi","mycoLinkScanStatusCore","L","scanText",["fileCaptured","textCaptured","linksScanned","targetsChecked","brokenLinksBuilt"],"myco_links_scanned"],
].map(([file,flow,source,symbol,names,expected])=>Object.freeze({file,flow,source:SOURCES[source],symbol,input:args(names),expected:string(expected)})));

function shadowFingerprint(source){const identifiers=new Map();return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");}

describe("40-file source-bound Fungi decision-core overlay wave 22",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[];const scopes=new Set();for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-galerina",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);assert.equal(scopes.has(`${c.source}#${c.symbol}`),false);scopes.add(`${c.source}#${c.symbol}`);}});
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{const seen=new Map();const files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const path=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(path),`${c.file} must exist`);const source=readFileSync(path,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);}}assert.deepEqual(collisions,[]);});
  it("parses, effect-checks, emits GIR and executes every decision core",async()=>{for(const c of CANDIDATES){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8");const program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});

