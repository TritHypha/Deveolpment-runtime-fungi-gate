import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { it } from "node:test";

const SLIDE_ROOT=process.env.GALERINA_SLIDE_REPO;
const AVAILABLE=typeof SLIDE_ROOT==="string"&&existsSync(join(SLIDE_ROOT,"src","checked-fungi-package-compiler.mjs"));
const ROOT=join(process.cwd(),"packages-galerina","galerina-test","src","self-hosted","conversion-overlays");
const GATES=Object.freeze({identity:1,provenance:1,target:1,effects:1,policy:1,revocation:1,validation:1,memory:1});
const CANDIDATES=Object.freeze([
  ["fuse-host-load-status.fungi","fuseHostLoadStatusCore",3,"fuse_host_loaded"],
  ["fuse-utf8-encoding-status.fungi","fuseUtf8EncodingStatusCore",3,"fuse_utf8_encoded"],
  ["fuse-base64-decoding-status.fungi","fuseBase64DecodingStatusCore",4,"fuse_base64_decoded"],
  ["fuse-canonical-string-status.fungi","fuseCanonicalStringStatusCore",4,"fuse_string_canonical"],
  ["fuse-canonical-json-status.fungi","fuseCanonicalJsonStatusCore",4,"fuse_json_canonical"],
  ["fuse-manifest-signing-input-status.fungi","fuseManifestSigningInputStatusCore",3,"fuse_signing_input_ready"],
  ["fuse-network-inbound-factory-status.fungi","fuseNetworkInboundFactoryStatusCore",3,"fuse_network_inbound_factory"],
  ["fuse-network-inbound-accept-status.fungi","fuseNetworkInboundAcceptStatusCore",2,"fuse_network_inbound_accept"],
  ["fuse-network-inbound-peer-status.fungi","fuseNetworkInboundPeerStatusCore",3,"fuse_network_inbound_peer"],
  ["fuse-network-outbound-factory-status.fungi","fuseNetworkOutboundFactoryStatusCore",4,"fuse_network_outbound_factory"],
  ["fuse-network-outbound-connect-status.fungi","fuseNetworkOutboundConnectStatusCore",2,"fuse_network_outbound_connect"],
  ["fuse-network-outbound-send-status.fungi","fuseNetworkOutboundSendStatusCore",3,"fuse_network_outbound_send"],
  ["fuse-clock-factory-status.fungi","fuseClockFactoryStatusCore",3,"fuse_clock_factory"],
  ["fuse-clock-now-status.fungi","fuseClockNowStatusCore",2,"fuse_clock_now"],
  ["fuse-log-factory-status.fungi","fuseLogFactoryStatusCore",4,"fuse_log_factory"],
  ["fuse-log-emit-status.fungi","fuseLogEmitStatusCore",3,"fuse_log_emit"],
  ["fuse-error-status.fungi","fuseErrorStatusCore",3,"fuse_error_raised"],
  ["fuse-read-json-status.fungi","fuseReadJsonStatusCore",4,"fuse_json_read"],
  ["fuse-descriptor-extraction-status.fungi","fuseDescriptorExtractionStatusCore",5,"fuse_descriptor_extracted"],
  ["fuse-manifest-verification-status.fungi","fuseManifestVerificationStatusCore",5,"fuse_manifest_verified"],
  ["fuse-public-key-resolution-status.fungi","fusePublicKeyResolutionStatusCore",4,"fuse_public_key_resolved"],
  ["fuse-governance-key-presence-status.fungi","fuseGovernanceKeyPresenceStatusCore",3,"fuse_governance_key_present"],
  ["fuse-capability-import-status.fungi","fuseCapabilityImportStatusCore",4,"fuse_capability_imports_built"],
  ["fuse-package-load-verification-status.fungi","fusePackageLoadVerificationStatusCore",6,"fuse_package_admitted"],
  ["fuse-component-instantiation-status.fungi","fuseComponentInstantiationStatusCore",4,"fuse_component_instantiated"],
  ["fuse-component-invoke-status.fungi","fuseComponentInvokeStatusCore",4,"fuse_component_invoked"],
  ["fuse-package-status.fungi","fusePackageStatusCore",5,"fuse_package_complete"],
  ["fuse-composition-plan-status.fungi","fuseCompositionPlanStatusCore",5,"fuse_composition_planned"],
  ["fuse-topological-order-status.fungi","fuseTopologicalOrderStatusCore",4,"fuse_topological_ordered"],
  ["fuse-provider-factory-status.fungi","fuseProviderFactoryStatusCore",4,"fuse_provider_factory_built"],
  ["fuse-package-set-status.fungi","fusePackageSetStatusCore",6,"fuse_package_set_complete"],
  ["fuse-import-closure-status.fungi","fuseImportClosureStatusCore",4,"fuse_import_closure_built"],
  ["registry-store-host-load-status.fungi","registryStoreHostLoadStatusCore",4,"registry_store_host_loaded"],
  ["registry-store-frozen-shape-status.fungi","registryStoreFrozenShapeStatusCore",5,"registry_store_shape_exact"],
  ["registry-store-linked-binding-status.fungi","registryStoreLinkedBindingStatusCore",4,"registry_store_binding_linked"],
  ["registry-store-sha256-status.fungi","registryStoreSha256StatusCore",4,"registry_store_sha256_ready"],
  ["registry-store-linked-receipt-status.fungi","registryStoreLinkedReceiptStatusCore",5,"registry_store_receipt_linked"],
  ["registry-store-error-code-status.fungi","registryStoreErrorCodeStatusCore",4,"registry_store_error_code"],
  ["registry-store-path-equality-status.fungi","registryStorePathEqualityStatusCore",4,"registry_store_path_compared"],
  ["registry-store-file-identity-status.fungi","registryStoreFileIdentityStatusCore",7,"registry_store_file_same"],
].map(([file,flow,count,expected])=>Object.freeze({file,flow,args:Array(count).fill(true),expected})));

async function api(){const load=async p=>import(pathToFileURL(join(SLIDE_ROOT,"src",p)).href);return {...await load("checked-fungi-package-compiler.mjs"),...await load("checked-fungi-package-file.mjs"),...await load("checked-fungi-package-publication-loader.mjs"),...await load("safe-value-envelope.mjs"),...await load("portable-veo.mjs")};}
function expectation(r){return {packageSetDigest:r.packageSetDigest,packageIdentity:r.packageIdentity,exportName:r.exportName,receiptDigest:r.receiptDigest,safeValueTypeId:r.safeValueTypeId,safeValueStateId:r.safeValueStateId,safeValueProvenanceDigest:r.safeValueProvenanceDigest};}

it("publishes and independently re-admits all 40 wave-15 source decisions through physical SLIDE/VOK",{skip:!AVAILABLE},async()=>{
  const slide=await api();const context=slide.portableVeoReferenceContext();const sources=CANDIDATES.map(c=>Uint8Array.from(readFileSync(join(ROOT,c.file))));
  const request=bytes=>({packages:[{identity:"@galerina/test",version:"1.0.0-beta.15",exports:CANDIDATES.map((c,i)=>({name:c.flow,sourceFlowName:c.flow,sourceBytes:bytes[i]})),dependencies:[],resources:[]}],context,gates:GATES});
  const compiled=slide.compileCheckedFungiPackageSet(request(sources));
  if(compiled.verdict!==1){const failures=[];for(let i=0;i<CANDIDATES.length;i++){const c=CANDIDATES[i];const one=slide.compileCheckedFungiPackageSet({packages:[{identity:"@galerina/test",version:"1.0.0-beta.15",exports:[{name:c.flow,sourceFlowName:c.flow,sourceBytes:sources[i]}],dependencies:[],resources:[]}],context,gates:GATES});if(one.verdict!==1)failures.push(c.flow+":"+JSON.stringify(one));}assert.fail("physical SLIDE compilation refused: "+failures.join(", "));}
  const changed=sources.map(source=>Uint8Array.from(source));changed[0][0]^=1;assert.equal(slide.compileCheckedFungiPackageSet(request(changed)).verdict,-1);
  const parent=await mkdtemp(join(tmpdir(),"galerina-wave-15-"));const out=join(parent,"published");
  try{const published=await slide.publishCheckedFungiPackageBuild({packageBuildHandle:compiled.packageBuildHandle,outputDirectory:out});assert.equal(published.verdict,1,JSON.stringify(published));const files=published.outputFiles.filter(n=>n.endsWith(".slide"));assert.equal(files.length,40);let last;
    for(const c of CANDIDATES){const prepared=await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:c.flow,context,gates:GATES});assert.equal(prepared.verdict,1,c.flow);const receipt=slide.executeTypedCheckedFungiPackagePublication(prepared.packageExecutionHandle,c.args,undefined);assert.equal(receipt.status,"SUCCEEDED_PHYSICAL_REFERENCE_ONLY",c.flow);const verified=slide.verifyTypedCheckedFungiPackageReceipt(receipt,expectation(receipt));assert.equal(verified.verdict,1,c.flow);assert.equal(verified.value,c.expected,c.flow);assert.equal(verified.authorityReleased,false,c.flow);last=receipt;}
    assert.equal(slide.verifyTypedCheckedFungiPackageReceipt({...last,receiptDigest:"sha256:"+"0".repeat(64)},expectation(last)).verdict,-1);
    const path=join(out,files[0]);const bytes=await readFile(path);bytes[0]^=1;await writeFile(path,bytes);assert.equal((await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:CANDIDATES[0].flow,context,gates:GATES})).verdict,-1);
  }finally{await rm(parent,{recursive:true,force:true});}
});
