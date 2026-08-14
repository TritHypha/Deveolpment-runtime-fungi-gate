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
const A="galerina-framework-app-kernel/src/registry-authority.ts";
const S="galerina-framework-app-kernel/src/registry-activation-simulator.ts";
const D="galerina-framework-app-kernel/src/registry-durability-artifact.ts";
const H="galerina-framework-app-kernel/src/host-floor.ts";
const SOURCES=Object.freeze({A,S,D,H});
const CANDIDATES=Object.freeze([
  ["registry-authority-sign-delegation-status.fungi","registryAuthoritySignDelegationStatusCore","A","signRegistryAuthorityDelegation",["delegationCaptured","preimageReady","edSigned","mlSigned","envelopeBuilt"],"registry_authority_delegation_signed"],
  ["registry-authority-revocation-status.fungi","registryAuthorityRevocationStatusCore","A","function isRevoked",["keyIdCaptured","checkBound","callbackCompleted","literalTrue"],"registry_authority_not_revoked"],
  ["registry-authority-verify-delegation-status.fungi","registryAuthorityVerifyDelegationStatusCore","A","verifyRegistryAuthorityDelegation",["delegationCaptured","optionsCaptured","signaturesVerified","windowActive","rolesAuthorized"],"registry_authority_delegation_verified"],
  ["registry-authority-root-component-status.fungi","registryAuthorityRootComponentStatusCore","A","function verifyRootComponent",["messageCaptured","signatureCaptured","keyMatched","verifierAccepted","resultBound"],"registry_authority_root_component_verified"],
  ["registry-authority-manifest-delegation-status.fungi","registryAuthorityManifestDelegationStatusCore","A","verifyRegistryPackageManifestUnderDelegation",["manifestCaptured","delegationVerified","fingerprintsMatched","identitiesBound","manifestVerified"],"registry_authority_manifest_verified"],
  ["registry-authority-index-delegation-status.fungi","registryAuthorityIndexDelegationStatusCore","A","verifyRegistryIndexUnderDelegation",["indexCaptured","delegationVerified","fingerprintsMatched","identityBound","indexVerified"],"registry_authority_index_verified"],
  ["registry-activation-plain-shape-status.fungi","registryActivationPlainShapeStatusCore","S","function hasPlainDataShape",["valueCaptured","objectPresent","prototypePlain","keysData"],"registry_activation_shape_plain"],
  ["registry-activation-deep-freeze-status.fungi","registryActivationDeepFreezeStatusCore","S","function deepFreeze",["valueCaptured","childrenVisited","objectFrozen","graphSealed"],"registry_activation_graph_frozen"],
  ["registry-activation-canonical-json-status.fungi","registryActivationCanonicalJsonStatusCore","S","function canonicalJson",["valueCaptured","shapeAdmitted","keysOrdered","serialized"],"registry_activation_json_canonical"],
  ["registry-activation-sha256-status.fungi","registryActivationSha256StatusCore","S","function sha256",["valueCaptured","canonicalReady","bytesEncoded","digestReady"],"registry_activation_digest_ready"],
  ["registry-activation-boundary-status.fungi","registryActivationBoundaryStatusCore","S","function isBoundary",["valueCaptured","stringTyped","boundaryKnown"],"registry_activation_boundary_known"],
  ["registry-activation-canary-status.fungi","registryActivationCanaryStatusCore","S","function isCanaryVerdict",["valueCaptured","stringTyped","verdictKnown"],"registry_activation_canary_known"],
  ["registry-activation-normalize-status.fungi","registryActivationNormalizeStatusCore","S","function normalizeOptions",["optionsCaptured","digestsValid","budgetValid","canaryValid","faultsValid"],"registry_activation_options_normalized"],
  ["registry-activation-schedule-status.fungi","registryActivationScheduleStatusCore","S","function activeSchedule",["optionsCaptured","faultsCaptured","boundariesOrdered","budgetApplied","scheduleBuilt"],"registry_activation_schedule_ready"],
  ["registry-activation-fault-boundary-status.fungi","registryActivationFaultBoundaryStatusCore","S","function validFaultAtBoundary",["faultCaptured","boundaryMatched","kindAllowed","timingValid"],"registry_activation_fault_valid"],
  ["registry-activation-terminal-status.fungi","registryActivationTerminalStatusCore","S","function terminalForAcceptedAuthority",["boundaryCaptured","candidateAccepted","canaryClassified","terminalSelected"],"registry_activation_terminal_selected"],
  ["registry-activation-set-terminal-status.fungi","registryActivationSetTerminalStatusCore","S","const setAcceptedTerminal",["stateCaptured","boundaryCaptured","authorityMatched","terminalSelected","stateUpdated"],"registry_activation_terminal_set"],
  ["registry-activation-finish-receipt-status.fungi","registryActivationFinishReceiptStatusCore","S","function finishReceipt",["receiptCaptured","fieldsBound","canonicalReady","digestComputed","receiptFrozen"],"registry_activation_receipt_finished"],
  ["registry-activation-simulate-status.fungi","registryActivationSimulateStatusCore","S","function simulateRegistryActivation",["optionsCaptured","scheduleReady","faultsApplied","terminalReached","receiptBuilt"],"registry_activation_simulated"],
  ["registry-activation-planted-fault-status.fungi","registryActivationPlantedFaultStatusCore","S","function plantedFaultFor",["boundaryCaptured","kindSelected","mappingClosed","faultReady"],"registry_activation_fault_planted"],
  ["registry-activation-seeded-order-status.fungi","registryActivationSeededOrderStatusCore","S","function seededScenarioOrder",["seedCaptured","boundariesScored","scoresOrdered","tiesResolved","orderFrozen"],"registry_activation_order_seeded"],
  ["registry-activation-explore-status.fungi","registryActivationExploreStatusCore","S","exploreRegistryActivationFaultMatrix",["optionsCaptured","controlSimulated","scenariosExplored","coverageComplete","matrixBound"],"registry_activation_matrix_explored"],
  ["registry-artifact-node-load-status.fungi","registryArtifactNodeLoadStatusCore","D","function loadNode",["hostCaptured","modulesNarrowed","nodeReady"],"registry_artifact_node_loaded"],
  ["registry-artifact-deny-status.fungi","registryArtifactDenyStatusCore","D","function deny",["reasonCaptured","verdictDenied","fieldsCleared","decisionFrozen"],"registry_artifact_denied"],
  ["registry-artifact-stats-identity-status.fungi","registryArtifactStatsIdentityStatusCore","D","function statsIdentityMatches",["leftCaptured","rightCaptured","deviceMatched","metadataMatched","timestampsMatched"],"registry_artifact_identity_matched"],
  ["registry-artifact-uint16-status.fungi","registryArtifactUint16StatusCore","D","function uint16LE",["bytesCaptured","offsetValid","wordDecoded"],"registry_artifact_uint16_decoded"],
  ["registry-artifact-uint32-status.fungi","registryArtifactUint32StatusCore","D","function uint32LE",["bytesCaptured","offsetValid","wordDecoded","unsignedBound"],"registry_artifact_uint32_decoded"],
  ["registry-artifact-pe-status.fungi","registryArtifactPeStatusCore","D","function peCoffMatches",["bytesCaptured","headerValid","offsetBound","machineMatched","formatAccepted"],"registry_artifact_pe_matched"],
  ["registry-artifact-elf-status.fungi","registryArtifactElfStatusCore","D","function elfMatches",["bytesCaptured","headerValid","classMatched","machineMatched","formatAccepted"],"registry_artifact_elf_matched"],
  ["registry-artifact-macho-status.fungi","registryArtifactMachoStatusCore","D","function machOMatches",["bytesCaptured","magicMatched","cpuMatched","formatAccepted"],"registry_artifact_macho_matched"],
  ["registry-artifact-container-status.fungi","registryArtifactContainerStatusCore","D","function binaryContainerMatches",["bytesCaptured","descriptorCaptured","formatSelected","parserAccepted","containerMatched"],"registry_artifact_container_matched"],
  ["registry-artifact-ancestor-status.fungi","registryArtifactAncestorStatusCore","D","function hasSymbolicOrUnavailableAncestor",["pathCaptured","ancestorRead","linkAbsent","rootReached"],"registry_artifact_ancestors_direct"],
  ["registry-artifact-direct-path-status.fungi","registryArtifactDirectPathStatusCore","D","function directArtifactPath",["rootCaptured","descriptorCaptured","segmentsBound","metadataValid","pathReturned"],"registry_artifact_path_direct"],
  ["registry-artifact-inspect-status.fungi","registryArtifactInspectStatusCore","D","inspectRegistryDurabilityArtifactCandidate",["inputsCaptured","pathAdmitted","bytesStable","formatVerified","digestMatched"],"registry_artifact_candidate_verified"],
  ["host-floor-import-status.fungi","hostFloorImportStatusCore","H","const importHostModule",["specifierCaptured","importBound","moduleLoaded"],"host_floor_module_loaded"],
  ["host-floor-record-status.fungi","hostFloorRecordStatusCore","H","function requireHostRecord",["valueCaptured","recordClassified","recordReturned"],"host_floor_record_required"],
  ["host-floor-callable-slice-status.fungi","hostFloorCallableSliceStatusCore","H","function callableSlice",["valueCaptured","namesCaptured","callablesChecked","wrappersBound","sliceFrozen"],"host_floor_callable_slice_ready"],
  ["host-floor-data-field-status.fungi","hostFloorDataFieldStatusCore","H","function dataField",["valueCaptured","nameCaptured","descriptorData","fieldReturned"],"host_floor_data_ready"],
  ["host-floor-fuse-status.fungi","hostFloorFuseStatusCore","H","loadFuseHostFloor",["importsStarted","modulesLoaded","capabilitiesNarrowed","recordFrozen","floorReturned"],"host_floor_fuse_loaded"],
  ["host-floor-artifact-status.fungi","hostFloorArtifactStatusCore","H","loadDurabilityArtifactHostFloor",["importsStarted","modulesLoaded","constantsNarrowed","capabilitiesNarrowed","floorFrozen"],"host_floor_artifact_loaded"],
].map(([file,flow,source,symbol,names,expected])=>Object.freeze({file,flow,source:SOURCES[source],symbol,input:args(names),expected:string(expected)})));

function shadowFingerprint(source){
  const identifiers=new Map();
  return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");
}

describe("40-file source-bound Fungi decision-core overlay wave 18",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{
    assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[];const scopes=new Set();
    for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-galerina",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);assert.equal(scopes.has(`${c.source}#${c.symbol}`),false);scopes.add(`${c.source}#${c.symbol}`);}
  });
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{
    const seen=new Map();const files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const path=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(path),`${c.file} must exist`);const source=readFileSync(path,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);}}assert.deepEqual(collisions,[]);
  });
  it("parses, effect-checks, emits GIR and executes every decision core",async()=>{for(const c of CANDIDATES){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8");const program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});
