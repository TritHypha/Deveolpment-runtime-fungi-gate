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
  ["registry-index-admit-from-registry-status.fungi","registryIndexAdmitFromRegistryStatusCore",5,"registry_index_admission_granted"],
  ["example-config-fail-status.fungi","exampleConfigFailStatusCore",3,"example_config_failure_bound"],
  ["example-config-parse-status.fungi","exampleConfigParseStatusCore",5,"example_config_parsed"],
  ["example-config-load-status.fungi","exampleConfigLoadStatusCore",4,"example_config_loaded"],
  ["example-revocation-gate-status.fungi","exampleRevocationGateStatusCore",4,"example_revocation_gate_ready"],
  ["example-fuse-greeting-status.fungi","exampleFuseGreetingStatusCore",4,"example_greeting_fused"],
  ["example-greeting-kernel-status.fungi","exampleGreetingKernelStatusCore",5,"example_greeting_kernel_ready"],
  ["example-greeting-dispatch-status.fungi","exampleGreetingDispatchStatusCore",4,"example_greeting_dispatched"],
  ["example-server-start-status.fungi","exampleServerStartStatusCore",5,"example_server_started"],
  ["example-server-close-status.fungi","exampleServerCloseStatusCore",3,"example_server_closed"],
  ["telemetry-label-status.fungi","telemetryLabelStatusCore",3,"telemetry_label_safe"],
  ["telemetry-effect-family-status.fungi","telemetryEffectFamilyStatusCore",3,"telemetry_effect_family_ready"],
  ["telemetry-finite-number-status.fungi","telemetryFiniteNumberStatusCore",3,"telemetry_number_finite"],
  ["telemetry-render-series-status.fungi","telemetryRenderSeriesStatusCore",4,"telemetry_series_rendered"],
  ["telemetry-allow-list-count-status.fungi","telemetryAllowListCountStatusCore",4,"telemetry_allow_list_counted"],
  ["telemetry-snapshot-build-status.fungi","telemetrySnapshotBuildStatusCore",5,"telemetry_snapshot_built"],
  ["telemetry-prometheus-render-status.fungi","telemetryPrometheusRenderStatusCore",5,"telemetry_prometheus_rendered"],
  ["telemetry-label-keep-status.fungi","telemetryLabelKeepStatusCore",4,"telemetry_labels_kept"],
  ["telemetry-scalar-gauge-status.fungi","telemetryScalarGaugeStatusCore",4,"telemetry_gauge_appended"],
  ["telemetry-dynamic-import-status.fungi","telemetryDynamicImportStatusCore",3,"telemetry_module_loaded"],
  ["telemetry-exporter-start-status.fungi","telemetryExporterStartStatusCore",5,"telemetry_exporter_started"],
  ["telemetry-exporter-close-status.fungi","telemetryExporterCloseStatusCore",3,"telemetry_exporter_closed"],
  ["hardware-resolve-status.fungi","hardwareResolveStatusCore",4,"hardware_tier_resolved"],
  ["hardware-identity-resolve-status.fungi","hardwareIdentityResolveStatusCore",4,"hardware_identity_resolved"],
  ["hardware-directive-constructor-status.fungi","hardwareDirectiveConstructorStatusCore",3,"hardware_directive_constructed"],
  ["hardware-directive-resolve-status.fungi","hardwareDirectiveResolveStatusCore",4,"hardware_directive_resolved"],
  ["hardware-directive-invalidate-status.fungi","hardwareDirectiveInvalidateStatusCore",3,"hardware_directive_invalidated"],
  ["hardware-directive-preimage-status.fungi","hardwareDirectivePreimageStatusCore",3,"hardware_directive_preimage_ready"],
  ["hardware-capability-preimage-status.fungi","hardwareCapabilityPreimageStatusCore",3,"hardware_capability_preimage_ready"],
  ["hardware-tier-select-status.fungi","hardwareTierSelectStatusCore",4,"hardware_tier_selected"],
  ["hardware-tier-loader-status.fungi","hardwareTierLoaderStatusCore",3,"hardware_tier_loader_ready"],
  ["hardware-trust-target-status.fungi","hardwareTrustTargetStatusCore",3,"hardware_trust_target_ready"],
  ["bridge-determinism-status.fungi","bridgeDeterminismStatusCore",4,"bridge_determinism_confirmed"],
  ["bridge-manifest-number-status.fungi","bridgeManifestNumberStatusCore",3,"bridge_manifest_number_canonical"],
  ["bridge-manifest-canonical-status.fungi","bridgeManifestCanonicalStatusCore",5,"bridge_manifest_canonical"],
  ["bridge-manifest-validate-status.fungi","bridgeManifestValidateStatusCore",5,"bridge_manifest_valid"],
  ["ai-target-select-status.fungi","aiTargetSelectStatusCore",5,"ai_target_selected"],
  ["ai-target-report-status.fungi","aiTargetReportStatusCore",4,"ai_target_report_built"],
  ["ai-model-validate-status.fungi","aiModelValidateStatusCore",5,"ai_model_validated"],
  ["ai-capability-compatible-status.fungi","aiCapabilityCompatibleStatusCore",5,"ai_capability_compatible"],
].map(([file,flow,count,expected])=>Object.freeze({file,flow,args:Array(count).fill(true),expected})));

async function api(){const load=async p=>import(pathToFileURL(join(SLIDE_ROOT,"src",p)).href);return {...await load("checked-fungi-package-compiler.mjs"),...await load("checked-fungi-package-file.mjs"),...await load("checked-fungi-package-publication-loader.mjs"),...await load("safe-value-envelope.mjs"),...await load("portable-veo.mjs")};}
function expectation(r){return {packageSetDigest:r.packageSetDigest,packageIdentity:r.packageIdentity,exportName:r.exportName,receiptDigest:r.receiptDigest,safeValueTypeId:r.safeValueTypeId,safeValueStateId:r.safeValueStateId,safeValueProvenanceDigest:r.safeValueProvenanceDigest};}

it("publishes and independently re-admits all 40 wave-21 source decisions through physical SLIDE/VOK",{skip:!AVAILABLE},async()=>{
 const slide=await api();const context=slide.portableVeoReferenceContext();const sources=CANDIDATES.map(c=>Uint8Array.from(readFileSync(join(ROOT,c.file))));const request=bytes=>({packages:[{identity:"@galerina/test",version:"1.0.0-beta.21",exports:CANDIDATES.map((c,i)=>({name:c.flow,sourceFlowName:c.flow,sourceBytes:bytes[i]})),dependencies:[],resources:[]}],context,gates:GATES});const compiled=slide.compileCheckedFungiPackageSet(request(sources));if(compiled.verdict!==1){const failures=[];for(let i=0;i<CANDIDATES.length;i++){const c=CANDIDATES[i];const one=slide.compileCheckedFungiPackageSet({packages:[{identity:"@galerina/test",version:"1.0.0-beta.21",exports:[{name:c.flow,sourceFlowName:c.flow,sourceBytes:sources[i]}],dependencies:[],resources:[]}],context,gates:GATES});if(one.verdict!==1)failures.push(c.flow+":"+JSON.stringify(one));}assert.fail("physical SLIDE compilation refused: "+failures.join(", "));}const changed=sources.map(source=>Uint8Array.from(source));changed[0][0]^=1;assert.equal(slide.compileCheckedFungiPackageSet(request(changed)).verdict,-1);const parent=await mkdtemp(join(tmpdir(),"galerina-wave-21-"));const out=join(parent,"published");
 try{const published=await slide.publishCheckedFungiPackageBuild({packageBuildHandle:compiled.packageBuildHandle,outputDirectory:out});assert.equal(published.verdict,1,JSON.stringify(published));const files=published.outputFiles.filter(n=>n.endsWith(".slide"));assert.equal(files.length,40);let last;for(const c of CANDIDATES){const prepared=await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:c.flow,context,gates:GATES});assert.equal(prepared.verdict,1,c.flow);const receipt=slide.executeTypedCheckedFungiPackagePublication(prepared.packageExecutionHandle,c.args,undefined);assert.equal(receipt.status,"SUCCEEDED_PHYSICAL_REFERENCE_ONLY",c.flow);const verified=slide.verifyTypedCheckedFungiPackageReceipt(receipt,expectation(receipt));assert.equal(verified.verdict,1,c.flow);assert.equal(verified.value,c.expected,c.flow);assert.equal(verified.authorityReleased,false,c.flow);last=receipt;}assert.equal(slide.verifyTypedCheckedFungiPackageReceipt({...last,receiptDigest:"sha256:"+"0".repeat(64)},expectation(last)).verdict,-1);const path=join(out,files[0]);const bytes=await readFile(path);bytes[0]^=1;await writeFile(path,bytes);assert.equal((await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:CANDIDATES[0].flow,context,gates:GATES})).verdict,-1);}finally{await rm(parent,{recursive:true,force:true});}
});
