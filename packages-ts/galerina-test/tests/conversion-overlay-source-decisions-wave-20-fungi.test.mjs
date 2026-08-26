import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

const ROOT=join(import.meta.dirname,"..","..","..");
const PACKAGE_ROOT=join(ROOT,"packages-ts","galerina-test");
const OVERLAY_ROOT=join(PACKAGE_ROOT,"src","self-hosted","conversion-overlays");
const PACKAGE=join(PACKAGE_ROOT,"package.json");
const bool=value=>({__tag:"bool",value});
const string=value=>({__tag:"string",value});
const args=names=>new Map(names.map(name=>[name,bool(true)]));
const RESERVED=new Set(["version","pure","secure","flow","FLOW","contract","intent","record","return","if","match","check","deny","ambig","mut","let","Bool","Int","String","Verdict","Result","Option","Array","true","false","Ok","Err","Some","None","Allow","Deny","Unknown"]);
const P="galerina-framework-app-kernel/src/production-boot-composition-candidate.ts";
const A="galerina-framework-app-kernel/src/registry-durability-admission.ts";
const E="galerina-framework-app-kernel/src/registry-durability-evidence.ts";
const D="galerina-framework-app-kernel/src/registry-durability-production-admission.ts";
const I="galerina-framework-app-kernel/src/registry-index.ts";
const SOURCES=Object.freeze({P,A,E,D,I});
const CANDIDATES=Object.freeze([
  ["boot-composition-refuse-status.fungi","bootCompositionRefuseStatusCore","P","function refuse",["errorTyped","verdictDenied","refusalRaised"],"boot_composition_refusal_bound"],
  ["boot-composition-data-shape-status.fungi","bootCompositionDataShapeStatusCore","P","hasExactDataShape",["valueCaptured","prototypePlain","keysExact","descriptorsData","cloneSucceeded"],"boot_composition_data_shape_exact"],
  ["boot-composition-canonical-instant-status.fungi","bootCompositionCanonicalInstantStatusCore","P","canonicalInstant",["valueCaptured","instantParsed","roundTripMatched"],"boot_composition_instant_canonical"],
  ["boot-composition-provenance-status.fungi","bootCompositionProvenanceStatusCore","P","provenanceDigestsAreValid",["valueCaptured","arrayPlain","lengthExact","digestsUnique","cloneSucceeded"],"boot_composition_provenance_valid"],
  ["boot-composition-policy-shape-status.fungi","bootCompositionPolicyShapeStatusCore","P","policyShapeIsValid",["valueCaptured","shapeExact","identitiesValid","timeWindowValid","policyClosed"],"boot_composition_policy_valid"],
  ["boot-composition-slide-match-status.fungi","bootCompositionSlideMatchStatusCore","P","slideProfileMatches",["policyCaptured","profileCaptured","identityMatched","authorityContained","factsMatched"],"boot_composition_slide_matched"],
  ["boot-composition-durability-match-status.fungi","bootCompositionDurabilityMatchStatusCore","P","durabilityProfileMatches",["policyCaptured","profileCaptured","platformMatched","timeBound","factsMatched"],"boot_composition_durability_matched"],
  ["boot-composition-admit-status.fungi","bootCompositionAdmitStatusCore","P","admitProductionBootCompositionCandidate",["policyCaptured","slideAuthenticated","durabilityAuthenticated","profilesMatched","candidateSealed"],"boot_composition_candidate_admitted"],
  ["boot-composition-guard-status.fungi","bootCompositionGuardStatusCore","P","isProductionBootCompositionCandidate",["valueCaptured","objectPresent","provenanceMatched"],"boot_composition_candidate_authenticated"],
  ["durability-admission-plain-shape-status.fungi","durabilityAdmissionPlainShapeStatusCore","A","hasPlainDataShape",["valueCaptured","prototypePlain","keysExact","descriptorsData"],"durability_admission_shape_plain"],
  ["durability-admission-string-array-status.fungi","durabilityAdmissionStringArrayStatusCore","A","stringArrayIsCanonical",["valueCaptured","arrayPlain","valuesAllowed","duplicatesAbsent"],"durability_admission_array_canonical"],
  ["durability-admission-descriptor-status.fungi","durabilityAdmissionDescriptorStatusCore","A","isRegistryDurabilityAdapterDescriptor",["valueCaptured","shapeExact","platformKnown","architectureKnown","descriptorValid"],"durability_adapter_descriptor_valid"],
  ["durability-admission-host-status.fungi","durabilityAdmissionHostStatusCore","A","hostIsValid",["valueCaptured","shapeExact","callbacksBound","hostValid"],"durability_host_valid"],
  ["durability-admission-deny-status.fungi","durabilityAdmissionDenyStatusCore","A","function deny",["reasonCaptured","verdictDenied","fieldsCleared","decisionFrozen"],"durability_admission_denied"],
  ["durability-admission-assess-status.fungi","durabilityAdmissionAssessStatusCore","A","assessRegistryDurabilityAdapterCandidate",["descriptorCaptured","hostCaptured","shapesValid","factsMatched","candidateBound"],"durability_candidate_assessed"],
  ["durability-evidence-freeze-keys-status.fungi","durabilityEvidenceFreezeKeysStatusCore","E","freezeCheckKeys",["keysCaptured","keysCopied","arrayFrozen"],"durability_evidence_keys_frozen"],
  ["durability-evidence-refuse-status.fungi","durabilityEvidenceRefuseStatusCore","E","function refuse",["codeCaptured","errorTyped","refusalRaised"],"durability_evidence_refusal_bound"],
  ["durability-evidence-plain-shape-status.fungi","durabilityEvidencePlainShapeStatusCore","E","hasPlainDataShape",["valueCaptured","prototypePlain","keysExact","descriptorsData"],"durability_evidence_shape_plain"],
  ["durability-evidence-boundaries-status.fungi","durabilityEvidenceBoundariesStatusCore","E","canonicalBoundaries",["valueCaptured","arrayPlain","entriesKnown","orderCanonical"],"durability_evidence_boundaries_canonical"],
  ["durability-evidence-shape-status.fungi","durabilityEvidenceShapeStatusCore","E","evidenceShapeIsValid",["valueCaptured","shapeExact","checksValid","digestsValid","evidenceValid"],"durability_evidence_shape_valid"],
  ["durability-evidence-policy-status.fungi","durabilityEvidencePolicyStatusCore","E","policyShapeIsValid",["valueCaptured","shapeExact","classesKnown","boundariesKnown","policyValid"],"durability_evidence_policy_valid"],
  ["durability-evidence-ceiling-status.fungi","durabilityEvidenceCeilingStatusCore","E","checkClaimCeiling",["recordCaptured","classBound","claimsChecked","ceilingHeld"],"durability_evidence_claim_ceiling_held"],
  ["durability-evidence-boundary-equality-status.fungi","durabilityEvidenceBoundaryEqualityStatusCore","E","boundariesEqual",["leftCaptured","rightCaptured","lengthMatched","entriesMatched"],"durability_evidence_boundaries_equal"],
  ["durability-evidence-verify-status.fungi","durabilityEvidenceVerifyStatusCore","E","verifyRegistryDurabilityEvidence",["evidenceCaptured","policyCaptured","shapeVerified","claimsBound","receiptMinted"],"durability_evidence_verified"],
  ["durability-evidence-guard-status.fungi","durabilityEvidenceGuardStatusCore","E","isVerifiedRegistryDurabilityEvidence",["valueCaptured","objectPresent","provenanceMatched"],"durability_evidence_authenticated"],
  ["registry-durability-profile-admit-status.fungi","registryDurabilityProfileAdmitStatusCore","D","admitRegistryDurabilityProfile",["manifestCaptured","evidenceVerified","authorityBound","signaturesVerified","profileSealed"],"registry_durability_profile_admitted"],
  ["registry-durability-profile-guard-status.fungi","registryDurabilityProfileGuardStatusCore","D","isProductionRegistryDurabilityProfile",["valueCaptured","objectPresent","provenanceMatched"],"registry_durability_profile_authenticated"],
  ["registry-durability-rotation-match-status.fungi","registryDurabilityRotationMatchStatusCore","D","registryDurabilityProfileMatchesRotation",["identityCaptured","profileAuthenticated","generationMatched","keysMatched","rotationBound"],"registry_durability_rotation_matched"],
  ["registry-index-compare-status.fungi","registryIndexCompareStatusCore","I","const cmp",["leftCaptured","rightCaptured","orderClassified"],"registry_index_order_classified"],
  ["registry-index-signing-input-status.fungi","registryIndexSigningInputStatusCore","I","registryIndexSigningInput",["indexCaptured","signatureOmitted","canonicalReady"],"registry_index_signing_input_ready"],
  ["registry-index-signature-preimage-status.fungi","registryIndexSignaturePreimageStatusCore","I","registryIndexSignaturePreimage",["indexCaptured","schemaSelected","keyBound","domainSeparated"],"registry_index_preimage_ready"],
  ["registry-index-build-status.fungi","registryIndexBuildStatusCore","I","buildRegistryIndex",["inputCaptured","entriesCopied","entriesSorted","indexBuilt"],"registry_index_built"],
  ["registry-index-sign-status.fungi","registryIndexSignStatusCore","I","signRegistryIndex",["indexCaptured","schemaAccepted","preimageReady","signatureBound"],"registry_index_signed"],
  ["registry-index-hybrid-sign-status.fungi","registryIndexHybridSignStatusCore","I","signRegistryIndexHybrid",["indexCaptured","keyBound","preimageReady","bothSigned","envelopeBuilt"],"registry_index_hybrid_signed"],
  ["registry-index-freshness-status.fungi","registryIndexFreshnessStatusCore","I","isStrictlyNewerThanFloor",["issuedAtCaptured","floorCaptured","freshnessClassified"],"registry_index_freshness_classified"],
  ["registry-index-verify-status.fungi","registryIndexVerifyStatusCore","I","verifyRegistryIndex",["indexCaptured","signatureVerified","schemaChecked","freshnessHeld","resultBound"],"registry_index_verified"],
  ["registry-index-v2-verify-status.fungi","registryIndexV2VerifyStatusCore","I","verifyRegistryIndexV2",["indexCaptured","suitePinned","componentsVerified","freshnessHeld","resultBound"],"registry_index_v2_verified"],
  ["registry-index-component-status.fungi","registryIndexComponentStatusCore","I","function verifyComponent",["messageCaptured","signatureCaptured","keyBound","verifierCompleted","literalTrue"],"registry_index_component_verified"],
  ["registry-index-lookup-status.fungi","registryIndexLookupStatusCore","I","lookupCertifiedPackage",["indexCaptured","queryCaptured","entryUnique","identityMatched","resultBound"],"registry_index_lookup_resolved"],
  ["registry-index-policy-status.fungi","registryIndexPolicyStatusCore","I","checkRegistryPolicy",["entryCaptured","policyCaptured","levelAllowed","riskAllowed"],"registry_index_policy_checked"],
].map(([file,flow,source,symbol,names,expected])=>Object.freeze({file,flow,source:SOURCES[source],symbol,input:args(names),expected:string(expected)})));

function shadowFingerprint(source){const identifiers=new Map();return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");}

describe("40-file source-bound Fungi decision-core overlay wave 20",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[];const scopes=new Set();for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-ts",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);assert.equal(scopes.has(`${c.source}#${c.symbol}`),false);scopes.add(`${c.source}#${c.symbol}`);}});
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{const seen=new Map();const files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const path=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(path),`${c.file} must exist`);const source=readFileSync(path,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);}}assert.deepEqual(collisions,[]);});
  it("parses, effect-checks, emits GIR and executes every decision core",async()=>{for(const c of CANDIDATES){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8");const program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});
