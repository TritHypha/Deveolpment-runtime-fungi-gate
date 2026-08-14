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
const I="galerina-framework-app-kernel/src/registry-index.ts";
const C="galerina-framework-example-app/host/config.ts";
const S="galerina-framework-example-app/host/server.ts";
const E="galerina-governance-telemetry/src/exposition.ts";
const T="galerina-governance-telemetry/src/server.ts";
const H="galerina-hardware-tier/src/hardware-directive.ts";
const L="galerina-hardware-tier/src/tier-loader.ts";
const P="galerina-hardware-tier/src/trust-profiles.ts";
const B="galerina-inference-bridge-contract/src/bridge.ts";
const M="galerina-inference-bridge-contract/src/manifest.ts";
const A="galerina-target-ai-accelerator/src/index.ts";
const SOURCES=Object.freeze({I,C,S,E,T,H,L,P,B,M,A});
const CANDIDATES=Object.freeze([
  ["registry-index-admit-from-registry-status.fungi","registryIndexAdmitFromRegistryStatusCore","I","admitFromRegistry",["indexCaptured","verifierBound","signatureValid","lookupResolved","policyAllowed"],"registry_index_admission_granted"],
  ["example-config-fail-status.fungi","exampleConfigFailStatusCore","C","function fail",["reasonCaptured","errorTyped","failureRaised"],"example_config_failure_bound"],
  ["example-config-parse-status.fungi","exampleConfigParseStatusCore","C","parseConfig",["valueCaptured","shapeValid","environmentKnown","routeValid","configBuilt"],"example_config_parsed"],
  ["example-config-load-status.fungi","exampleConfigLoadStatusCore","C","loadConfig",["pathCaptured","fileRead","jsonParsed","configValidated"],"example_config_loaded"],
  ["example-revocation-gate-status.fungi","exampleRevocationGateStatusCore","S","loadRevocationGate",["directoryCaptured","registryImported","anchorVerified","predicateBound"],"example_revocation_gate_ready"],
  ["example-fuse-greeting-status.fungi","exampleFuseGreetingStatusCore","S","fuseGreeting",["optionsCaptured","revocationBound","packageLoaded","componentFused"],"example_greeting_fused"],
  ["example-greeting-kernel-status.fungi","exampleGreetingKernelStatusCore","S","createGreetingKernel",["configCaptured","componentCaptured","routeBuilt","dispatchBound","kernelCreated"],"example_greeting_kernel_ready"],
  ["example-greeting-dispatch-status.fungi","exampleGreetingDispatchStatusCore","S","greeting: () =>",["componentBound","invoked","statusCaptured","responseBuilt"],"example_greeting_dispatched"],
  ["example-server-start-status.fungi","exampleServerStartStatusCore","S","startServer",["configCaptured","componentFused","kernelCreated","serverCreated","listenerReady"],"example_server_started"],
  ["example-server-close-status.fungi","exampleServerCloseStatusCore","S","close: () => new Promise",["serverCaptured","closeInvoked","completionResolved"],"example_server_closed"],
  ["telemetry-label-status.fungi","telemetryLabelStatusCore","E","isSafeLabel",["valueCaptured","grammarMatched","labelAccepted"],"telemetry_label_safe"],
  ["telemetry-effect-family-status.fungi","telemetryEffectFamilyStatusCore","E","effectFamily",["effectCaptured","familyDerived","labelSafe"],"telemetry_effect_family_ready"],
  ["telemetry-finite-number-status.fungi","telemetryFiniteNumberStatusCore","E","isFiniteNum",["valueCaptured","numberTyped","finite"],"telemetry_number_finite"],
  ["telemetry-render-series-status.fungi","telemetryRenderSeriesStatusCore","E","renderSeries",["seriesCaptured","labelsSafe","valueFinite","lineRendered"],"telemetry_series_rendered"],
  ["telemetry-allow-list-count-status.fungi","telemetryAllowListCountStatusCore","E","allowListCounts",["valuesCaptured","labelsFiltered","countsFolded","resultFrozen"],"telemetry_allow_list_counted"],
  ["telemetry-snapshot-build-status.fungi","telemetrySnapshotBuildStatusCore","E","buildGovernanceSnapshot",["stateCaptured","familiesCounted","queuesBound","limitsBound","snapshotBuilt"],"telemetry_snapshot_built"],
  ["telemetry-prometheus-render-status.fungi","telemetryPrometheusRenderStatusCore","E","renderPrometheus",["snapshotCaptured","labelsFiltered","gaugesRendered","seriesRendered","bodyBuilt"],"telemetry_prometheus_rendered"],
  ["telemetry-label-keep-status.fungi","telemetryLabelKeepStatusCore","E","const keep",["labelsCaptured","valuesChecked","unsafeRejected","accepted"],"telemetry_labels_kept"],
  ["telemetry-scalar-gauge-status.fungi","telemetryScalarGaugeStatusCore","E","const scalarGauge",["nameCaptured","helpCaptured","valueFinite","gaugeAppended"],"telemetry_gauge_appended"],
  ["telemetry-dynamic-import-status.fungi","telemetryDynamicImportStatusCore","T","const dynImport",["specifierCaptured","importInvoked","moduleLoaded"],"telemetry_module_loaded"],
  ["telemetry-exporter-start-status.fungi","telemetryExporterStartStatusCore","T","startExporter",["optionsCaptured","httpLoaded","routesBound","listenerReady","handleBuilt"],"telemetry_exporter_started"],
  ["telemetry-exporter-close-status.fungi","telemetryExporterCloseStatusCore","T","close: () => new Promise",["serverCaptured","closeInvoked","completionResolved"],"telemetry_exporter_closed"],
  ["hardware-resolve-status.fungi","hardwareResolveStatusCore","H","resolveHardware",["inputCaptured","overrideChecked","gpuChecked","cpuChecked"],"hardware_tier_resolved"],
  ["hardware-identity-resolve-status.fungi","hardwareIdentityResolveStatusCore","H","resolveHardwareFromIdentity",["inputCaptured","identityParsed","targetMatched","tierResolved"],"hardware_identity_resolved"],
  ["hardware-directive-constructor-status.fungi","hardwareDirectiveConstructorStatusCore","H","constructor(input:",["inputCaptured","stateBound","cacheEmpty"],"hardware_directive_constructed"],
  ["hardware-directive-resolve-status.fungi","hardwareDirectiveResolveStatusCore","H","resolve(): Tier",["stateCaptured","cacheChecked","tierResolved","cacheStored"],"hardware_directive_resolved"],
  ["hardware-directive-invalidate-status.fungi","hardwareDirectiveInvalidateStatusCore","H","invalidate(): void",["directiveCaptured","cachePresent","cacheCleared"],"hardware_directive_invalidated"],
  ["hardware-directive-preimage-status.fungi","hardwareDirectivePreimageStatusCore","H","capabilityPreimage(): string",["directiveCaptured","tierResolved","preimageBuilt"],"hardware_directive_preimage_ready"],
  ["hardware-capability-preimage-status.fungi","hardwareCapabilityPreimageStatusCore","H","export function capabilityPreimage",["tierCaptured","domainBound","preimageBuilt"],"hardware_capability_preimage_ready"],
  ["hardware-tier-select-status.fungi","hardwareTierSelectStatusCore","L","selectTier",["registriesCaptured","requestCaptured","tierAvailable","selectionBuilt"],"hardware_tier_selected"],
  ["hardware-tier-loader-status.fungi","hardwareTierLoaderStatusCore","L","createTierLoader",["registriesCaptured","loaderBuilt","selectorBound"],"hardware_tier_loader_ready"],
  ["hardware-trust-target-status.fungi","hardwareTrustTargetStatusCore","P","targetFromHardwareIdentity",["identityCaptured","grammarValid","targetDerived"],"hardware_trust_target_ready"],
  ["bridge-determinism-status.fungi","bridgeDeterminismStatusCore","B","assertDeterminism",["resultCaptured","flagChecked","checksumPresent","deterministic"],"bridge_determinism_confirmed"],
  ["bridge-manifest-number-status.fungi","bridgeManifestNumberStatusCore","M","canonNum",["valueCaptured","finiteChecked","canonicalReturned"],"bridge_manifest_number_canonical"],
  ["bridge-manifest-canonical-status.fungi","bridgeManifestCanonicalStatusCore","M","canonicalManifestString",["manifestCaptured","fieldsSelected","numbersCanonical","keysOrdered","jsonBuilt"],"bridge_manifest_canonical"],
  ["bridge-manifest-validate-status.fungi","bridgeManifestValidateStatusCore","M","validateManifestShape",["manifestCaptured","identityValid","numericFieldsValid","profileValid","shapeAccepted"],"bridge_manifest_valid"],
  ["ai-target-select-status.fungi","aiTargetSelectStatusCore","A","selectAiAcceleratorTarget",["capabilitiesCaptured","preferenceCaptured","compatibleFiltered","ranked","selectionBuilt"],"ai_target_selected"],
  ["ai-target-report-status.fungi","aiTargetReportStatusCore","A","createAiAcceleratorTargetReport",["selectionCaptured","diagnosticsBound","limitsBound","reportBuilt"],"ai_target_report_built"],
  ["ai-model-validate-status.fungi","aiModelValidateStatusCore","A","validateAiAcceleratorModel",["modelCaptured","formatChecked","precisionChecked","memoryChecked","resultBound"],"ai_model_validated"],
  ["ai-capability-compatible-status.fungi","aiCapabilityCompatibleStatusCore","A","isCapabilityCompatible",["capabilityCaptured","modelCaptured","frameworkMatched","precisionMatched","memorySufficient"],"ai_capability_compatible"],
].map(([file,flow,source,symbol,names,expected])=>Object.freeze({file,flow,source:SOURCES[source],symbol,input:args(names),expected:string(expected)})));

function shadowFingerprint(source){const identifiers=new Map();return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");}

describe("40-file source-bound Fungi decision-core overlay wave 21",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[];const scopes=new Set();for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-galerina",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);assert.equal(scopes.has(`${c.source}#${c.symbol}`),false);scopes.add(`${c.source}#${c.symbol}`);}});
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{const seen=new Map();const files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const path=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(path),`${c.file} must exist`);const source=readFileSync(path,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);}}assert.deepEqual(collisions,[]);});
  it("parses, effect-checks, emits GIR and executes every decision core",async()=>{for(const c of CANDIDATES){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8");const program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});
