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
  ["registry-store-size-bound-status.fungi","registryStoreSizeBoundStatusCore",4,"registry_store_bound_ready"],
  ["registry-store-canonical-utf8-status.fungi","registryStoreCanonicalUtf8StatusCore",5,"registry_store_utf8_canonical"],
  ["registry-store-deep-freeze-status.fungi","registryStoreDeepFreezeStatusCore",4,"registry_store_deep_frozen"],
  ["registry-store-canonical-directory-status.fungi","registryStoreCanonicalDirectoryStatusCore",5,"registry_store_directory_canonical"],
  ["registry-store-bounded-read-status.fungi","registryStoreBoundedReadStatusCore",5,"registry_store_file_bounded"],
  ["registry-store-verified-receipt-status.fungi","registryStoreVerifiedReceiptStatusCore",4,"registry_store_verified_minted"],
  ["registry-store-durable-receipt-status.fungi","registryStoreDurableReceiptStatusCore",5,"registry_store_durable_minted"],
  ["registry-store-host-evidence-adapter-status.fungi","registryStoreHostEvidenceAdapterStatusCore",5,"registry_store_adapter_issued"],
  ["registry-store-host-evidence-flush-status.fungi","registryStoreHostEvidenceFlushStatusCore",4,"registry_store_directory_flushed"],
  ["registry-store-directory-durability-status.fungi","registryStoreDirectoryDurabilityStatusCore",5,"registry_store_durability_proven"],
  ["registry-store-verified-guard-status.fungi","registryStoreVerifiedGuardStatusCore",3,"registry_store_verified"],
  ["registry-store-persisted-guard-status.fungi","registryStorePersistedGuardStatusCore",4,"registry_store_persisted"],
  ["registry-store-production-guard-status.fungi","registryStoreProductionGuardStatusCore",4,"registry_store_production_admitted"],
  ["registry-store-forward-probe-guard-status.fungi","registryStoreForwardProbeGuardStatusCore",4,"registry_store_probe_valid"],
  ["registry-store-forward-probe-consume-status.fungi","registryStoreForwardProbeConsumeStatusCore",3,"registry_store_probe_consumed"],
  ["registry-store-load-generation-status.fungi","registryStoreLoadGenerationStatusCore",5,"registry_store_generation_loaded"],
  ["registry-store-forward-probe-verify-status.fungi","registryStoreForwardProbeVerifyStatusCore",5,"registry_store_probe_issued"],
  ["registry-store-linked-host-publish-status.fungi","registryStoreLinkedHostPublishStatusCore",5,"registry_store_linked_published"],
  ["registry-store-random-suffix-status.fungi","registryStoreRandomSuffixStatusCore",3,"registry_store_suffix_ready"],
  ["registry-store-persist-generation-status.fungi","registryStorePersistGenerationStatusCore",5,"registry_store_generation_persisted"],
  ["registry-generation-deep-freeze-status.fungi","registryGenerationDeepFreezeStatusCore",4,"registry_generation_deep_frozen"],
  ["registry-generation-materialize-status.fungi","registryGenerationMaterializeStatusCore",4,"registry_generation_materialized"],
  ["registry-generation-required-string-status.fungi","registryGenerationRequiredStringStatusCore",3,"registry_generation_string_valid"],
  ["registry-generation-string-list-status.fungi","registryGenerationStringListStatusCore",4,"registry_generation_list_valid"],
  ["registry-generation-canonical-instant-status.fungi","registryGenerationCanonicalInstantStatusCore",4,"registry_generation_instant_canonical"],
  ["registry-generation-artifact-file-list-status.fungi","registryGenerationArtifactFileListStatusCore",4,"registry_generation_artifacts_valid"],
  ["registry-generation-entry-from-manifest-status.fungi","registryGenerationEntryFromManifestStatusCore",5,"registry_generation_entry_built"],
  ["registry-generation-compare-manifest-status.fungi","registryGenerationCompareManifestStatusCore",4,"registry_generation_manifest_compared"],
  ["registry-generation-string-lists-equal-status.fungi","registryGenerationStringListsEqualStatusCore",4,"registry_generation_lists_equal"],
  ["registry-generation-entries-equal-status.fungi","registryGenerationEntriesEqualStatusCore",5,"registry_generation_entries_equal"],
  ["registry-generation-sign-pair-status.fungi","registryGenerationSignPairStatusCore",5,"registry_generation_pair_signed"],
  ["registry-generation-verify-status.fungi","registryGenerationVerifyStatusCore",5,"registry_generation_verified"],
  ["registry-generation-build-status.fungi","registryGenerationBuildStatusCore",5,"registry_generation_built"],
  ["registry-generation-package-pair-cache-status.fungi","registryGenerationPackagePairCacheStatusCore",4,"registry_generation_package_pair_ready"],
  ["registry-generation-index-pair-cache-status.fungi","registryGenerationIndexPairCacheStatusCore",5,"registry_generation_index_pair_ready"],
  ["registry-generation-canonical-json-status.fungi","registryGenerationCanonicalJsonStatusCore",3,"registry_generation_json_canonical"],
  ["registry-generation-identity-status.fungi","registryGenerationIdentityStatusCore",5,"registry_generation_identity_derived"],
  ["registry-generation-file-name-status.fungi","registryGenerationFileNameStatusCore",3,"registry_generation_filename_ready"],
  ["registry-rotation-candidate-admit-status.fungi","registryRotationCandidateAdmitStatusCore",5,"registry_rotation_candidate_admitted"],
  ["registry-rotation-candidate-guard-status.fungi","registryRotationCandidateGuardStatusCore",3,"registry_rotation_candidate_known"],
].map(([file,flow,count,expected])=>Object.freeze({file,flow,args:Array(count).fill(true),expected})));

async function api(){const load=async p=>import(pathToFileURL(join(SLIDE_ROOT,"src",p)).href);return {...await load("checked-fungi-package-compiler.mjs"),...await load("checked-fungi-package-file.mjs"),...await load("checked-fungi-package-publication-loader.mjs"),...await load("safe-value-envelope.mjs"),...await load("portable-veo.mjs")};}
function expectation(r){return {packageSetDigest:r.packageSetDigest,packageIdentity:r.packageIdentity,exportName:r.exportName,receiptDigest:r.receiptDigest,safeValueTypeId:r.safeValueTypeId,safeValueStateId:r.safeValueStateId,safeValueProvenanceDigest:r.safeValueProvenanceDigest};}

it("publishes and independently re-admits all 40 wave-16 source decisions through physical SLIDE/VOK",{skip:!AVAILABLE},async()=>{
  const slide=await api();const context=slide.portableVeoReferenceContext();const sources=CANDIDATES.map(c=>Uint8Array.from(readFileSync(join(ROOT,c.file))));
  const request=bytes=>({packages:[{identity:"@galerina/test",version:"1.0.0-beta.16",exports:CANDIDATES.map((c,i)=>({name:c.flow,sourceFlowName:c.flow,sourceBytes:bytes[i]})),dependencies:[],resources:[]}],context,gates:GATES});
  const compiled=slide.compileCheckedFungiPackageSet(request(sources));
  if(compiled.verdict!==1){const failures=[];for(let i=0;i<CANDIDATES.length;i++){const c=CANDIDATES[i];const one=slide.compileCheckedFungiPackageSet({packages:[{identity:"@galerina/test",version:"1.0.0-beta.16",exports:[{name:c.flow,sourceFlowName:c.flow,sourceBytes:sources[i]}],dependencies:[],resources:[]}],context,gates:GATES});if(one.verdict!==1)failures.push(c.flow+":"+JSON.stringify(one));}assert.fail("physical SLIDE compilation refused: "+failures.join(", "));}
  const changed=sources.map(source=>Uint8Array.from(source));changed[0][0]^=1;assert.equal(slide.compileCheckedFungiPackageSet(request(changed)).verdict,-1);
  const parent=await mkdtemp(join(tmpdir(),"galerina-wave-16-"));const out=join(parent,"published");
  try{const published=await slide.publishCheckedFungiPackageBuild({packageBuildHandle:compiled.packageBuildHandle,outputDirectory:out});assert.equal(published.verdict,1,JSON.stringify(published));const files=published.outputFiles.filter(n=>n.endsWith(".slide"));assert.equal(files.length,40);let last;
    for(const c of CANDIDATES){const prepared=await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:c.flow,context,gates:GATES});assert.equal(prepared.verdict,1,c.flow);const receipt=slide.executeTypedCheckedFungiPackagePublication(prepared.packageExecutionHandle,c.args,undefined);assert.equal(receipt.status,"SUCCEEDED_PHYSICAL_REFERENCE_ONLY",c.flow);const verified=slide.verifyTypedCheckedFungiPackageReceipt(receipt,expectation(receipt));assert.equal(verified.verdict,1,c.flow);assert.equal(verified.value,c.expected,c.flow);assert.equal(verified.authorityReleased,false,c.flow);last=receipt;}
    assert.equal(slide.verifyTypedCheckedFungiPackageReceipt({...last,receiptDigest:"sha256:"+"0".repeat(64)},expectation(last)).verdict,-1);
    const path=join(out,files[0]);const bytes=await readFile(path);bytes[0]^=1;await writeFile(path,bytes);assert.equal((await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:CANDIDATES[0].flow,context,gates:GATES})).verdict,-1);
  }finally{await rm(parent,{recursive:true,force:true});}
});
