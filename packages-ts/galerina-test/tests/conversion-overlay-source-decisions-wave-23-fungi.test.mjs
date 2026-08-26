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
const M="galerina-tower-citizen/src/substrate-model.ts";
const S="galerina-tower-citizen/src/substrate-snapshot.ts";
const G="galerina-tower-citizen/src/three-valued-governance.ts";
const T="galerina-tower-citizen/src/tower-runtime.ts";
const P="galerina-tower-citizen/src/tpl-simulator.ts";
const SOURCES=Object.freeze({M,S,G,T,P});
const CANDIDATES=Object.freeze([
  ["substrate-odd-positive-status.fungi","substrateOddPositiveStatusCore","M","function assertOddPositive",["valueCaptured","integerValid","positive","odd"],"substrate_odd_positive"],
  ["substrate-probability-assert-status.fungi","substrateProbabilityAssertStatusCore","M","function assertProb",["nameCaptured","valueCaptured","numberTyped","notNan","rangeValid"],"substrate_probability_valid"],
  ["substrate-trit-assert-status.fungi","substrateTritAssertStatusCore","M","function assertTritValue",["valueCaptured","numberTyped","ternaryMember"],"substrate_trit_valid"],
  ["substrate-clamp-status.fungi","substrateClampStatusCore","M","function clamp",["valueCaptured","lowerCaptured","upperCaptured","orderingApplied"],"substrate_value_clamped"],
  ["substrate-effective-verdict-status.fungi","substrateEffectiveVerdictStatusCore","M","effectiveVerdict",["idealCaptured","readingCaptured","verdictCombined"],"substrate_verdict_effective"],
  ["substrate-adversarial-error-status.fungi","substrateAdversarialErrorStatusCore","M","empiricalAdversarialError",["paramsCaptured","idealValid","redundancyValid","trialsBounded","lanesSampled","errorMeasured"],"substrate_adversarial_error_measured"],
  ["substrate-fnv-status.fungi","substrateFnvStatusCore","M","function fnv1a",["textCaptured","utf16Scanned","u32Wrapped","hashBuilt"],"substrate_fnv_built"],
  ["substrate-majority-vote-status.fungi","substrateMajorityVoteStatusCore","M","majorityVote",["tritsCaptured","membersValid","sumBuilt","majoritySelected"],"substrate_majority_selected"],
  ["substrate-stream-build-status.fungi","substrateStreamBuildStatusCore","M","function makeStream",["seedCaptured","operationCaptured","hashMixed","fallbackApplied","streamBuilt"],"substrate_stream_built"],
  ["substrate-mulberry-state-status.fungi","substrateMulberryStateStatusCore","M","function mulberry32",["seedCaptured","stateInitialized","stepBound","outputScaled"],"substrate_mulberry_state_ready"],
  ["substrate-single-lane-probability-status.fungi","substrateSingleLaneProbabilityStatusCore","M","singleLaneErrorProbability",["paramsCaptured","paramsValidated","mathBound","probabilityBuilt"],"substrate_single_lane_probability_built"],
  ["substrate-params-validate-status.fungi","substrateParamsValidateStatusCore","M","function validateParams",["paramsCaptured","seedInteger","phaseValid","crosstalkValid","failureValid","readoutValid"],"substrate_params_validated"],
  ["substrate-snapshot-build-status.fungi","substrateSnapshotBuildStatusCore","S","buildSubstrateSnapshot",["paramsCaptured","guaranteeCaptured","laneCaptured","guaranteeChecked","snapshotBuilt"],"substrate_snapshot_built"],
  ["substrate-snapshot-canonical-status.fungi","substrateSnapshotCanonicalStatusCore","S","canonicalSnapshot",["snapshotCaptured","fieldsSelected","numbersBound","jsonBuilt"],"substrate_snapshot_canonical"],
  ["governance-all-of-status.fungi","governanceAllOfStatusCore","G","allOf",["verdictsCaptured","nonemptyChecked","andFolded"],"governance_all_of_folded"],
  ["governance-any-of-status.fungi","governanceAnyOfStatusCore","G","anyOf",["verdictsCaptured","nonemptyChecked","orFolded"],"governance_any_of_folded"],
  ["governance-authorize-status.fungi","governanceAuthorizeStatusCore","G","authorize",["verdictCaptured","allowCompared","authorizationBuilt"],"governance_authorization_built"],
  ["governance-collapse-status.fungi","governanceCollapseStatusCore","G","collapse",["verdictCaptured","allowCompared","decisionCollapsed"],"governance_decision_collapsed"],
  ["governance-confidence-collapse-status.fungi","governanceConfidenceCollapseStatusCore","G","collapseConfidence",["confidenceCaptured","rangesValid","sumValid","thresholdApplied","verdictBuilt"],"governance_confidence_collapsed"],
  ["governance-consensus-status.fungi","governanceConsensusStatusCore","G","consensusTritN",["votesCaptured","tritsValid","sumBuilt","consensusSelected"],"governance_consensus_selected"],
  ["governance-boundary-decision-status.fungi","governanceBoundaryDecisionStatusCore","G","decideAtBoundary",["verdictCaptured","diagnosticDerived","callbackApplied","decisionBuilt"],"governance_boundary_decided"],
  ["governance-and-status.fungi","governanceAndStatusCore","G","function vAnd",["leftCaptured","rightCaptured","minimumApplied","verdictBuilt"],"governance_and_built"],
  ["governance-tensor-and-status.fungi","governanceTensorAndStatusCore","G","vAndTensor(",["leftCaptured","rightCaptured","lengthMatched","elementsValidated","outputBuilt"],"governance_tensor_and_built"],
  ["governance-tensor-2d-status.fungi","governanceTensor2dStatusCore","G","vAndTensor2D",["leftCaptured","rightCaptured","shapeValid","lengthMatched","tensorCombined"],"governance_tensor_2d_built"],
  ["governance-not-status.fungi","governanceNotStatusCore","G","function vNot",["verdictCaptured","tritNegated","verdictBuilt"],"governance_not_built"],
  ["governance-or-status.fungi","governanceOrStatusCore","G","function vOr",["leftCaptured","rightCaptured","maximumApplied","verdictBuilt"],"governance_or_built"],
  ["tower-runtime-class-status.fungi","towerRuntimeClassStatusCore","T","export class TowerRuntime",["classCaptured","prototypeBound","stateSlotsBound"],"tower_runtime_class_bound"],
  ["tower-runtime-constructor-status.fungi","towerRuntimeConstructorStatusCore","T","constructor(config:",["configCaptured","defaultsApplied","certifiedChecked","auditBuilt","stateInitialized"],"tower_runtime_constructed"],
  ["tower-runtime-load-status.fungi","towerRuntimeLoadStatusCore","T","async load(",["metadataCaptured","correlationAdmitted","identityReserved","manifestVerified","sandboxBuilt","auditRecorded"],"tower_runtime_loaded"],
  ["tower-runtime-execute-status.fungi","towerRuntimeExecuteStatusCore","T","async execute(",["sandboxCaptured","inputValidated","hashBuilt","auditStarted","resultBuilt"],"tower_runtime_executed"],
  ["tower-runtime-erase-status.fungi","towerRuntimeEraseStatusCore","T","async erase(",["sandboxCaptured","identityCaptured","sandboxErased","registryCleared","auditRecorded"],"tower_runtime_erased"],
  ["tower-runtime-evict-status.fungi","towerRuntimeEvictStatusCore","T","evict(correlationId:",["correlationCaptured","sandboxFound","sandboxErased","registryCleared","auditRecorded"],"tower_runtime_evicted"],
  ["tower-runtime-active-count-status.fungi","towerRuntimeActiveCountStatusCore","T","getActiveSandboxCount",["runtimeCaptured","registryCaptured","sizeReturned"],"tower_runtime_active_count_built"],
  ["tower-runtime-audit-status.fungi","towerRuntimeAuditStatusCore","T","getAudit()",["runtimeCaptured","auditCaptured","capabilityReturned"],"tower_runtime_audit_returned"],
  ["tower-runtime-lifecycle-status.fungi","towerRuntimeLifecycleStatusCore","T","getLifecycle(correlationId:",["correlationCaptured","auditCaptured","lifecycleQueried"],"tower_runtime_lifecycle_returned"],
  ["tpl-add-status.fungi","tplAddStatusCore","P","function addTrit",["leftCaptured","rightCaptured","sumBuilt","carryBuilt"],"tpl_add_built"],
  ["tpl-as-trit-status.fungi","tplAsTritStatusCore","P","function asTrit",["valueCaptured","valueValidated","tritReturned"],"tpl_trit_admitted"],
  ["tpl-assert-trit-status.fungi","tplAssertTritStatusCore","P","function assertTrit",["valueCaptured","lowerChecked","zeroChecked","upperChecked"],"tpl_trit_validated"],
  ["tpl-carry-status.fungi","tplCarryStatusCore","P","function carryTrit",["leftCaptured","rightCaptured","sumBuilt","carrySelected"],"tpl_carry_built"],
  ["tpl-consensus-status.fungi","tplConsensusStatusCore","P","function consensusTrit",["firstCaptured","secondCaptured","thirdCaptured","sumBuilt","consensusSelected"],"tpl_consensus_built"],
].map(([file,flow,source,symbol,names,expected])=>Object.freeze({file,flow,source:SOURCES[source],symbol,input:args(names),expected:string(expected)})));

function shadowFingerprint(source){const identifiers=new Map();return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");}

describe("40-file source-bound Fungi decision-core overlay wave 23",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[];const scopes=new Set();for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-ts",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);assert.equal(scopes.has(`${c.source}#${c.symbol}`),false);scopes.add(`${c.source}#${c.symbol}`);}});
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{const seen=new Map();const files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const path=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(path),`${c.file} must exist`);const source=readFileSync(path,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);}}assert.deepEqual(collisions,[]);});
  it("parses, effect-checks, emits GIR and executes every decision core",async()=>{for(const c of CANDIDATES){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8");const program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});
