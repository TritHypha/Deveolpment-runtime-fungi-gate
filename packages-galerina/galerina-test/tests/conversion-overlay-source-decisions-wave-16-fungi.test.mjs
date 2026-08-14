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
const G="galerina-framework-app-kernel/src/registry-generation-store.ts";
const H="galerina-framework-app-kernel/src/registry-generation.ts";
const R="galerina-framework-app-kernel/src/registry-rotation-authority.ts";
const CANDIDATES=Object.freeze([
  ["registry-store-size-bound-status.fungi","registryStoreSizeBoundStatusCore","G","function sizeBound",["valueCaptured","defaultApplied","safeInteger","withinRange"],"registry_store_bound_ready"],
  ["registry-store-canonical-utf8-status.fungi","registryStoreCanonicalUtf8StatusCore","G","function decodeCanonicalUtf8",["bytesCaptured","nonEmpty","bomAbsent","utf8Decoded","nulAbsent"],"registry_store_utf8_canonical"],
  ["registry-store-deep-freeze-status.fungi","registryStoreDeepFreezeStatusCore","G","function deepFreeze",["valueCaptured","objectClassified","childrenFrozen","objectFrozen"],"registry_store_deep_frozen"],
  ["registry-store-canonical-directory-status.fungi","registryStoreCanonicalDirectoryStatusCore","G","function canonicalDirectory",["directoryCaptured","absolutePath","resolved","statsLoaded","directDirectory"],"registry_store_directory_canonical"],
  ["registry-store-bounded-read-status.fungi","registryStoreBoundedReadStatusCore","G","function readBoundedRegularFile",["pathCaptured","regularFile","bytesRead","identityStable","handleClosed"],"registry_store_file_bounded"],
  ["registry-store-verified-receipt-status.fungi","registryStoreVerifiedReceiptStatusCore","G","function makeReceipt",["generationCaptured","generationFrozen","receiptBuilt","verifiedMinted"],"registry_store_verified_minted"],
  ["registry-store-durable-receipt-status.fungi","registryStoreDurableReceiptStatusCore","G","function makeDurableReceipt",["verifiedCaptured","adapterCaptured","receiptBuilt","durableMinted","productionClassified"],"registry_store_durable_minted"],
  ["registry-store-host-evidence-adapter-status.fungi","registryStoreHostEvidenceAdapterStatusCore","G","function createRegistryGenerationHostEvidenceAdapter",["optionsCaptured","identityValid","digestValid","callbackCaptured","capabilityMinted"],"registry_store_adapter_issued"],
  ["registry-store-host-evidence-flush-status.fungi","registryStoreHostEvidenceFlushStatusCore","G","async flushDirectory(directory: string)",["directoryCaptured","callbackBound","callbackCompleted","literalTrue"],"registry_store_directory_flushed"],
  ["registry-store-directory-durability-status.fungi","registryStoreDirectoryDurabilityStatusCore","G","function proveDirectoryDurability",["adapterCaptured","capabilityIssued","identityValid","callbackCompleted","literalTrue"],"registry_store_durability_proven"],
  ["registry-store-verified-guard-status.fungi","registryStoreVerifiedGuardStatusCore","G","function isVerifiedRegistryGeneration",["valueCaptured","objectPresent","receiptKnown"],"registry_store_verified"],
  ["registry-store-persisted-guard-status.fungi","registryStorePersistedGuardStatusCore","G","function isPersistedRegistryGeneration",["valueCaptured","objectPresent","verifiedKnown","durableKnown"],"registry_store_persisted"],
  ["registry-store-production-guard-status.fungi","registryStoreProductionGuardStatusCore","G","function isProductionAdmittedRegistryGeneration",["valueCaptured","persistedKnown","productionKnown","bindingKnown"],"registry_store_production_admitted"],
  ["registry-store-forward-probe-guard-status.fungi","registryStoreForwardProbeGuardStatusCore","G","function isRegistryGenerationForwardProbe",["valueCaptured","probeKnown","generationVerified","identityMatched"],"registry_store_probe_valid"],
  ["registry-store-forward-probe-consume-status.fungi","registryStoreForwardProbeConsumeStatusCore","G","function consumeRegistryGenerationForwardProbe",["probeCaptured","identityMatched","receiptConsumed"],"registry_store_probe_consumed"],
  ["registry-store-load-generation-status.fungi","registryStoreLoadGenerationStatusCore","G","function loadRegistryGeneration",["optionsCaptured","borderAdmitted","bytesVerified","generationVerified","receiptMinted"],"registry_store_generation_loaded"],
  ["registry-store-forward-probe-verify-status.fungi","registryStoreForwardProbeVerifyStatusCore","G","function verifyRegistryGenerationForwardProbe",["optionsCaptured","generationLoaded","receiptBuilt","authorityRetained","provenanceMinted"],"registry_store_probe_issued"],
  ["registry-store-linked-host-publish-status.fungi","registryStoreLinkedHostPublishStatusCore","G","function publishRegistryGenerationWithLinkedHost",["optionsCaptured","profileAdmitted","hostVerified","publicationVerified","receiptMinted"],"registry_store_linked_published"],
  ["registry-store-random-suffix-status.fungi","registryStoreRandomSuffixStatusCore","G","function randomSuffix",["entropyReady","bytesFilled","hexEncoded"],"registry_store_suffix_ready"],
  ["registry-store-persist-generation-status.fungi","registryStorePersistGenerationStatusCore","G","function persistRegistryGeneration",["optionsCaptured","adapterIssued","generationVerified","publicationDurable","receiptMinted"],"registry_store_generation_persisted"],
  ["registry-generation-deep-freeze-status.fungi","registryGenerationDeepFreezeStatusCore","H","function deepFreeze",["valueCaptured","objectClassified","childrenFrozen","objectFrozen"],"registry_generation_deep_frozen"],
  ["registry-generation-materialize-status.fungi","registryGenerationMaterializeStatusCore","H","function materialize",["valueCaptured","canonicalSerialized","jsonParsed","detachedReady"],"registry_generation_materialized"],
  ["registry-generation-required-string-status.fungi","registryGenerationRequiredStringStatusCore","H","function requiredString",["valueCaptured","stringTyped","nonEmpty"],"registry_generation_string_valid"],
  ["registry-generation-string-list-status.fungi","registryGenerationStringListStatusCore","H","function stringList",["valueCaptured","arrayTyped","itemsValid","duplicatesAbsent"],"registry_generation_list_valid"],
  ["registry-generation-canonical-instant-status.fungi","registryGenerationCanonicalInstantStatusCore","H","function canonicalInstant",["valueCaptured","stringTyped","patternValid","dateRoundTrip"],"registry_generation_instant_canonical"],
  ["registry-generation-artifact-file-list-status.fungi","registryGenerationArtifactFileListStatusCore","H","function artifactFileList",["valueCaptured","listValid","bounded","relativePaths"],"registry_generation_artifacts_valid"],
  ["registry-generation-entry-from-manifest-status.fungi","registryGenerationEntryFromManifestStatusCore","H","function entryFromManifest",["manifestCaptured","identityValid","governanceReviewed","collectionsValid","entryBuilt"],"registry_generation_entry_built"],
  ["registry-generation-compare-manifest-status.fungi","registryGenerationCompareManifestStatusCore","H","function compareManifest",["leftCaptured","rightCaptured","namesCompared","versionsCompared"],"registry_generation_manifest_compared"],
  ["registry-generation-string-lists-equal-status.fungi","registryGenerationStringListsEqualStatusCore","H","function stringListsEqual",["leftCaptured","rightCaptured","lengthsEqual","itemsEqual"],"registry_generation_lists_equal"],
  ["registry-generation-entries-equal-status.fungi","registryGenerationEntriesEqualStatusCore","H","function registryEntriesEqual",["leftCaptured","rightCaptured","lengthsEqual","fieldsEqual","listsEqual"],"registry_generation_entries_equal"],
  ["registry-generation-sign-pair-status.fungi","registryGenerationSignPairStatusCore","H","function signPair",["custodyCaptured","inputsBound","callbackCompleted","proofsComplete","pairReturned"],"registry_generation_pair_signed"],
  ["registry-generation-verify-status.fungi","registryGenerationVerifyStatusCore","H","function verifyRegistryGeneration",["generationCaptured","optionsCaptured","envelopeValid","contentsVerified","entriesMatched"],"registry_generation_verified"],
  ["registry-generation-build-status.fungi","registryGenerationBuildStatusCore","H","function buildRegistryGeneration",["optionsCaptured","inputValid","manifestsSigned","indexSigned","generationVerified"],"registry_generation_built"],
  ["registry-generation-package-pair-cache-status.fungi","registryGenerationPackagePairCacheStatusCore","H","const getPair =",["messageCaptured","cacheChecked","pairSigned","pairReturned"],"registry_generation_package_pair_ready"],
  ["registry-generation-index-pair-cache-status.fungi","registryGenerationIndexPairCacheStatusCore","H","const getIndexPair =",["indexMessageCaptured","cacheChecked","pairSigned","cacheStored","pairReturned"],"registry_generation_index_pair_ready"],
  ["registry-generation-canonical-json-status.fungi","registryGenerationCanonicalJsonStatusCore","H","function registryGenerationCanonicalJson",["generationCaptured","schemaValid","canonicalSerialized"],"registry_generation_json_canonical"],
  ["registry-generation-identity-status.fungi","registryGenerationIdentityStatusCore","H","function registryGenerationId",["generationCaptured","canonicalReady","domainFramed","digestComputed","hexEncoded"],"registry_generation_identity_derived"],
  ["registry-generation-file-name-status.fungi","registryGenerationFileNameStatusCore","H","function registryGenerationFileName",["identityCaptured","grammarValid","nameBuilt"],"registry_generation_filename_ready"],
  ["registry-rotation-candidate-admit-status.fungi","registryRotationCandidateAdmitStatusCore","R","function admitRegistryRotationCandidate",["optionsCaptured","identitiesMatched","delegationVerified","fingerprintsMatched","provenanceMinted"],"registry_rotation_candidate_admitted"],
  ["registry-rotation-candidate-guard-status.fungi","registryRotationCandidateGuardStatusCore","R","function isAdmittedRegistryRotationCandidate",["valueCaptured","objectPresent","provenanceKnown"],"registry_rotation_candidate_known"],
].map(([file,flow,source,symbol,names,expected])=>Object.freeze({
  file,
  flow,
  source: source === "G" ? G : source === "H" ? H : R,
  symbol,
  input: args(names),
  expected: string(expected),
})));

function shadowFingerprint(source){
  const identifiers=new Map();
  return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");
}

describe("40-file source-bound Fungi decision-core overlay wave 16",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{
    assert.equal(CANDIDATES.length,40);
    const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[];
    const scopes=new Set();
    for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-galerina",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);assert.equal(scopes.has(`${c.source}#${c.symbol}`),false);scopes.add(`${c.source}#${c.symbol}`);}
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
