import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const PACKAGE_ROOT = join(ROOT, "packages-ts", "galerina-test");
const OVERLAY_ROOT = join(PACKAGE_ROOT, "src", "self-hosted", "conversion-overlays");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const bool = (value) => ({ __tag: "bool", value });
const string = (value) => ({ __tag: "string", value });
const args = (names) => new Map(names.map((name) => [name, bool(true)]));
const RESERVED = new Set(["version","pure","secure","flow","FLOW","contract","intent","record","return","if","match","check","deny","ambig","mut","let","Bool","Int","String","Verdict","Result","Option","Array","true","false","Ok","Err","Some","None","Allow","Deny","Unknown"]);
const F = "galerina-framework-app-kernel/src/fuse-loader.ts";
const G = "galerina-framework-app-kernel/src/registry-generation-store.ts";
const CANDIDATES = Object.freeze([
  ["fuse-host-load-status.fungi","fuseHostLoadStatusCore",F,"async function loadNode()",["floorLoaded","hostTyped","hostReturned"],"fuse_host_loaded"],
  ["fuse-utf8-encoding-status.fungi","fuseUtf8EncodingStatusCore",F,"const utf8 =",["textCaptured","encoderReady","bytesProduced"],"fuse_utf8_encoded"],
  ["fuse-base64-decoding-status.fungi","fuseBase64DecodingStatusCore",F,"function base64ToBytes",["textCaptured","alphabetAccepted","bytesAllocated","allDecoded"],"fuse_base64_decoded"],
  ["fuse-canonical-string-status.fungi","fuseCanonicalStringStatusCore",F,"function canonStr",["textCaptured","quotesEscaped","controlsEscaped","allUnitsCopied"],"fuse_string_canonical"],
  ["fuse-canonical-json-status.fungi","fuseCanonicalJsonStatusCore",F,"export function canonicalJson",["valueCaptured","kindSupported","childrenCanonical","bytesStable"],"fuse_json_canonical"],
  ["fuse-manifest-signing-input-status.fungi","fuseManifestSigningInputStatusCore",F,"function manifestSigningInput",["manifestCaptured","canonSelected","bodySerialized"],"fuse_signing_input_ready"],
  ["fuse-network-inbound-factory-status.fungi","fuseNetworkInboundFactoryStatusCore",F,"\"network.inbound\": () =>",["capabilitySelected","namespaceBound","functionsClosed"],"fuse_network_inbound_factory"],
  ["fuse-network-inbound-accept-status.fungi","fuseNetworkInboundAcceptStatusCore",F,"__net_in_accept: () => -1",["namespaceBound","handleUnavailable"],"fuse_network_inbound_accept"],
  ["fuse-network-inbound-peer-status.fungi","fuseNetworkInboundPeerStatusCore",F,"__net_in_peer: () => -1",["namespaceBound","peerUnavailable","outboundAbsent"],"fuse_network_inbound_peer"],
  ["fuse-network-outbound-factory-status.fungi","fuseNetworkOutboundFactoryStatusCore",F,"\"network.outbound\": () =>",["capabilitySelected","namespaceBound","functionsClosed","inboundAbsent"],"fuse_network_outbound_factory"],
  ["fuse-network-outbound-connect-status.fungi","fuseNetworkOutboundConnectStatusCore",F,"__net_out_connect: () => -1",["namespaceBound","connectionUnavailable"],"fuse_network_outbound_connect"],
  ["fuse-network-outbound-send-status.fungi","fuseNetworkOutboundSendStatusCore",F,"__net_out_send: () => -1",["namespaceBound","sendUnavailable","payloadUnreleased"],"fuse_network_outbound_send"],
  ["fuse-clock-factory-status.fungi","fuseClockFactoryStatusCore",F,"\"clock.read\": () =>",["capabilitySelected","namespaceBound","clockClosed"],"fuse_clock_factory"],
  ["fuse-clock-now-status.fungi","fuseClockNowStatusCore",F,"__clock_now_ms: () => 0",["namespaceBound","zeroReturned"],"fuse_clock_now"],
  ["fuse-log-factory-status.fungi","fuseLogFactoryStatusCore",F,"\"log.write\": () =>",["capabilitySelected","namespaceBound","loggerClosed","egressBound"],"fuse_log_factory"],
  ["fuse-log-emit-status.fungi","fuseLogEmitStatusCore",F,"__log_emit: () => 0",["namespaceBound","emitAcknowledged","authorityUnreleased"],"fuse_log_emit"],
  ["fuse-error-status.fungi","fuseErrorStatusCore",F,"function fuseError",["codeCaptured","messageCaptured","failureRaised"],"fuse_error_raised"],
  ["fuse-read-json-status.fungi","fuseReadJsonStatusCore",F,"function readJson",["pathCaptured","fileRead","jsonParsed","failureMapped"],"fuse_json_read"],
  ["fuse-descriptor-extraction-status.fungi","fuseDescriptorExtractionStatusCore",F,"function extractFuse",["manifestCaptured","descriptorPresent","hashValid","versionClosed","recordBuilt"],"fuse_descriptor_extracted"],
  ["fuse-manifest-verification-status.fungi","fuseManifestVerificationStatusCore",F,"async function verifyManifestSignature",["signatureCaptured","algorithmClosed","keyResolved","bytesCanonical","signatureVerified"],"fuse_manifest_verified"],
  ["fuse-public-key-resolution-status.fungi","fusePublicKeyResolutionStatusCore",F,"function resolvePublicKey",["keyIdCaptured","directoryAdmitted","candidateBuilt","filePresent"],"fuse_public_key_resolved"],
  ["fuse-governance-key-presence-status.fungi","fuseGovernanceKeyPresenceStatusCore",F,"function governanceKeysPresent",["directoryAdmitted","directoryReadable","keyPatternFound"],"fuse_governance_key_present"],
  ["fuse-capability-import-status.fungi","fuseCapabilityImportStatusCore",F,"export function buildCapabilityImports",["capabilitiesCaptured","registryBound","allKnown","namespacesGranted"],"fuse_capability_imports_built"],
  ["fuse-package-load-verification-status.fungi","fusePackageLoadVerificationStatusCore",F,"async function loadAndVerifyPackage",["directoryCaptured","manifestRead","descriptorChecked","hashMatched","signatureChecked","revocationChecked"],"fuse_package_admitted"],
  ["fuse-component-instantiation-status.fungi","fuseComponentInstantiationStatusCore",F,"async function instantiateComponent",["packageAdmitted","importsClosed","wasmInstantiated","exportsWrapped"],"fuse_component_instantiated"],
  ["fuse-component-invoke-status.fungi","fuseComponentInvokeStatusCore",F,"invoke(exportName: string",["exportCaptured","functionPresent","argumentsBound","resultNormalized"],"fuse_component_invoked"],
  ["fuse-package-status.fungi","fusePackageStatusCore",F,"export async function fusePackage",["packageLoaded","signaturePolicyPassed","registryPassed","importsClosed","componentInstantiated"],"fuse_package_complete"],
  ["fuse-composition-plan-status.fungi","fuseCompositionPlanStatusCore",F,"export function planComposition",["membersCaptured","signatureSetValid","providersUnique","capabilitiesResolved","graphAcyclic"],"fuse_composition_planned"],
  ["fuse-topological-order-status.fungi","fuseTopologicalOrderStatusCore",F,"function topoOrder",["namesCaptured","dependenciesCaptured","indegreesBuilt","allEmitted"],"fuse_topological_ordered"],
  ["fuse-provider-factory-status.fungi","fuseProviderFactoryStatusCore",F,"export function makeProviderFactory",["capabilityCaptured","shapeKnown","providerBound","routesBuilt"],"fuse_provider_factory_built"],
  ["fuse-package-set-status.fungi","fusePackageSetStatusCore",F,"export async function fusePackages",["packagesLoaded","namesUnique","registryPassed","planBuilt","providersInstantiated","consumersInstantiated"],"fuse_package_set_complete"],
  ["fuse-import-closure-status.fungi","fuseImportClosureStatusCore",F,"export async function buildImportClosure",["directoriesCaptured","packagesVerified","modulesRecorded","reportUntrusted"],"fuse_import_closure_built"],
  ["registry-store-host-load-status.fungi","registryStoreHostLoadStatusCore",G,"async function loadNode()",["floorLoaded","fsBound","pathBound","processBound"],"registry_store_host_loaded"],
  ["registry-store-frozen-shape-status.fungi","registryStoreFrozenShapeStatusCore",G,"function hasExactFrozenDataShape",["objectCaptured","prototypeExact","frozen","keysExact","descriptorsExact"],"registry_store_shape_exact"],
  ["registry-store-linked-binding-status.fungi","registryStoreLinkedBindingStatusCore",G,"function linkedProductionBinding",["processCaptured","descriptorExact","factoryCalled","candidateExact"],"registry_store_binding_linked"],
  ["registry-store-sha256-status.fungi","registryStoreSha256StatusCore",G,"async function sha256Typed",["bytesCaptured","ownedCopy","digestComputed","hexEncoded"],"registry_store_sha256_ready"],
  ["registry-store-linked-receipt-status.fungi","registryStoreLinkedReceiptStatusCore",G,"function linkedHostReceipt",["valueCaptured","shapeExact","schemaExact","identityMatched","nonAuthorizing"],"registry_store_receipt_linked"],
  ["registry-store-error-code-status.fungi","registryStoreErrorCodeStatusCore",G,"function errorCode",["errorCaptured","objectPresent","codePresent","codeString"],"registry_store_error_code"],
  ["registry-store-path-equality-status.fungi","registryStorePathEqualityStatusCore",G,"function samePath",["leftCaptured","rightCaptured","platformClassified","comparisonComplete"],"registry_store_path_compared"],
  ["registry-store-file-identity-status.fungi","registryStoreFileIdentityStatusCore",G,"function sameFile",["beforeCaptured","handleCaptured","afterCaptured","fileKindsValid","sizesStable","timesStable","identityStable"],"registry_store_file_same"],
].map(([file,flow,source,symbol,names,expected]) => Object.freeze({file,flow,source,symbol,input:args(names),expected:string(expected)})));

function shadowFingerprint(source) {
  const identifiers = new Map();
  return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,(m)=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,(id)=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");
}

describe("40-file source-bound Fungi decision-core overlay wave 15",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{
    assert.equal(CANDIDATES.length,40);
    const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[];
    const scopes=new Set();
    for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-ts",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);assert.equal(scopes.has(`${c.source}#${c.symbol}`),false);scopes.add(`${c.source}#${c.symbol}`);}
  });
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{
    const seen=new Map();const files=new Set(CANDIDATES.map(c=>c.file));
    for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}
    const collisions=[];for(const c of CANDIDATES){const path=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(path),`${c.file} must exist`);const source=readFileSync(path,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);}}
    assert.deepEqual(collisions,[]);
  });
  it("parses, effect-checks, emits GIR and executes every decision core",async()=>{
    for(const c of CANDIDATES){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8");const program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}
  });
});
