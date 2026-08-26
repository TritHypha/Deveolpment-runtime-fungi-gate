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
const I="galerina-core-compiler/src/substrate-inference.ts";
const V="galerina-core-compiler/src/governance-verifier.ts";
const SOURCES=Object.freeze({I,V});
const CANDIDATES=Object.freeze([
  ["compiler-substrate-block-status.fungi","compilerSubstrateBlockStatusCore","I","findSubstrateBlock",["flowCaptured","childrenScanned","contractFound"],"compiler_substrate_block_found"],
  ["compiler-substrate-decl-text-status.fungi","compilerSubstrateDeclTextStatusCore","I","substrateDeclText",["blockCaptured","declsFiltered","textJoined"],"compiler_substrate_decl_text_built"],
  ["compiler-substrate-field-segment-status.fungi","compilerSubstrateFieldSegmentStatusCore","I","fieldSegment",["textCaptured","fieldCaptured","boundaryFound","segmentTrimmed"],"compiler_substrate_field_segment_built"],
  ["compiler-substrate-lane-field-status.fungi","compilerSubstrateLaneFieldStatusCore","I","parseLaneField",["textCaptured","segmentParsed","laneClosed","fieldBuilt"],"compiler_substrate_lane_field_built"],
  ["compiler-substrate-tolerance-field-status.fungi","compilerSubstrateToleranceFieldStatusCore","I","parseToleranceField",["textCaptured","segmentParsed","numberFinite","fieldBuilt"],"compiler_substrate_tolerance_field_built"],
  ["compiler-substrate-redundancy-field-status.fungi","compilerSubstrateRedundancyFieldStatusCore","I","parseRedundancyField",["textCaptured","segmentParsed","integerValid","oddValid","fieldBuilt"],"compiler_substrate_redundancy_field_built"],
  ["compiler-substrate-indeterminate-field-status.fungi","compilerSubstrateIndeterminateFieldStatusCore","I","parseOnIndeterminateField",["textCaptured","segmentParsed","policyClosed","revoteBounded","fieldBuilt"],"compiler_substrate_indeterminate_field_built"],
  ["compiler-substrate-infer-status.fungi","compilerSubstrateInferStatusCore","I","inferFlowSubstrate",["flowCaptured","blockFound","fieldsParsed","defaultsApplied","inferenceBuilt"],"compiler_substrate_inference_built"],
  ["compiler-substrate-violations-status.fungi","compilerSubstrateViolationsStatusCore","I","checkSubstrateViolations",["flowCaptured","profileCaptured","substrateInferred","effectsChecked","toleranceChecked","violationsBuilt"],"compiler_substrate_violations_built"],
  ["governance-match-check-status.fungi","governanceMatchCheckStatusCore","V","checkMatchExhaustiveness",["matchCaptured","patternsCollected","coverageChecked","diagnosticBuilt"],"governance_match_checked"],
  ["governance-expr-describe-status.fungi","governanceExprDescribeStatusCore","V","describeExpr",["exprCaptured","kindSelected","descriptionBuilt"],"governance_expr_described"],
  ["governance-secret-shape-status.fungi","governanceSecretShapeStatusCore","V","flowIsSecretShaped",["flowCaptured","paramsScanned","returnScanned","secretShapeBuilt"],"governance_secret_shape_built"],
  ["governance-volatility-level-status.fungi","governanceVolatilityLevelStatusCore","V","flowVolatilityLevel",["flowCaptured","contractFound","levelParsed","volatilityBuilt"],"governance_volatility_built"],
  ["governance-result-status.fungi","governanceResultStatusCore","V","getResult",["diagnosticsCaptured","proofsCaptured","resultBuilt"],"governance_result_built"],
  ["governance-secret-timing-status.fungi","governanceSecretTimingStatusCore","V","hasSecretDependentTiming",["flowCaptured","bodyScanned","secretBranchFound","timingBuilt"],"governance_secret_timing_built"],
  ["governance-static-eval-status.fungi","governanceStaticEvalStatusCore","V","tryStaticEval",["exprCaptured","literalChecked","bindingsResolved","valueBuilt"],"governance_static_value_built"],
  ["governance-verifier-run-status.fungi","governanceVerifierRunStatusCore","V","verify(",["astCaptured","flowsCaptured","effectsCaptured","passesOrdered","resultBuilt"],"governance_verifier_run_built"],
  ["governance-access-block-status.fungi","governanceAccessBlockStatusCore","V","verifyAccessBlocks",["nodesCaptured","accessFound","rulesChecked","diagnosticsBuilt"],"governance_access_block_checked"],
  ["governance-architecture-block-status.fungi","governanceArchitectureBlockStatusCore","V","verifyArchitectureBlock",["flowCaptured","architectureFound","fieldsChecked","diagnosticsBuilt"],"governance_architecture_block_checked"],
  ["governance-architecture-stability-status.fungi","governanceArchitectureStabilityStatusCore","V","verifyArchitectureStability",["nodesCaptured","profilesCaptured","stabilityChecked","diagnosticsBuilt"],"governance_architecture_stability_checked"],
  ["governance-assimilated-plugin-status.fungi","governanceAssimilatedPluginStatusCore","V","verifyAssimilatedPlugins",["nodesCaptured","pluginsFound","contractsChecked","diagnosticsBuilt"],"governance_assimilated_plugins_checked"],
  ["governance-assuming-block-status.fungi","governanceAssumingBlockStatusCore","V","verifyAssumingBlocks",["flowCaptured","assumptionsFound","scopeChecked","diagnosticsBuilt"],"governance_assuming_blocks_checked"],
  ["governance-bitfield-decl-status.fungi","governanceBitfieldDeclStatusCore","V","verifyBitfieldDecls",["nodesCaptured","bitfieldsFound","widthsChecked","diagnosticsBuilt"],"governance_bitfields_checked"],
  ["governance-domain-guard-status.fungi","governanceDomainGuardStatusCore","V","verifyDomainGuardConformance",["nodesCaptured","guardsFound","conformanceChecked","diagnosticsBuilt"],"governance_domain_guards_checked"],
  ["governance-epilogue-block-status.fungi","governanceEpilogueBlockStatusCore","V","verifyEpilogueBlock",["flowCaptured","epilogueFound","effectsChecked","diagnosticsBuilt"],"governance_epilogue_checked"],
  ["governance-flow-status.fungi","governanceFlowStatusCore","V","verifyFlow",["flowCaptured","nodeCaptured","profileCaptured","checksApplied","diagnosticsBuilt"],"governance_flow_checked"],
  ["governance-gate-block-status.fungi","governanceGateBlockStatusCore","V","verifyGateBlocks",["flowCaptured","gatesFound","conditionsChecked","diagnosticsBuilt"],"governance_gates_checked"],
  ["governance-governed-flow-status.fungi","governanceGovernedFlowStatusCore","V","verifyGovernedFlows",["nodesCaptured","flowsCaptured","governanceChecked","diagnosticsBuilt"],"governance_governed_flows_checked"],
  ["governance-invariant-block-status.fungi","governanceInvariantBlockStatusCore","V","verifyInvariantBlock",["flowCaptured","invariantsFound","expressionsChecked","diagnosticsBuilt"],"governance_invariants_checked"],
  ["governance-liability-block-status.fungi","governanceLiabilityBlockStatusCore","V","verifyLiabilityBlock",["flowCaptured","liabilityFound","fieldsChecked","diagnosticsBuilt"],"governance_liability_checked"],
  ["governance-limits-block-status.fungi","governanceLimitsBlockStatusCore","V","verifyLimitsBlock",["flowCaptured","limitsFound","unitsChecked","diagnosticsBuilt"],"governance_limits_checked"],
  ["governance-match-exhaustiveness-status.fungi","governanceMatchExhaustivenessStatusCore","V","verifyMatchExhaustiveness",["matchCaptured","casesCaptured","domainClosed","diagnosticsBuilt"],"governance_match_exhaustiveness_checked"],
  ["governance-network-wildcard-status.fungi","governanceNetworkWildcardStatusCore","V","verifyNetworkWildcardBan",["flowCaptured","networkEffectsFound","wildcardsChecked","diagnosticsBuilt"],"governance_network_wildcard_checked"],
  ["governance-physical-hardening-status.fungi","governancePhysicalHardeningStatusCore","V","verifyPhysicalHardeningBlock",["flowCaptured","hardeningFound","controlsChecked","diagnosticsBuilt"],"governance_physical_hardening_checked"],
  ["governance-policy-hierarchy-status.fungi","governancePolicyHierarchyStatusCore","V","verifyPolicyHierarchy",["nodesCaptured","parentsResolved","subsetChecked","diagnosticsBuilt"],"governance_policy_hierarchy_checked"],
  ["governance-policy-monotonicity-status.fungi","governancePolicyMonotonicityStatusCore","V","verifyPolicyMonotonicity",["nodesCaptured","transitionsFound","monotonicityChecked","diagnosticsBuilt"],"governance_policy_monotonicity_checked"],
  ["governance-residency-hardening-status.fungi","governanceResidencyHardeningStatusCore","V","verifyResidencyHardeningBlock",["flowCaptured","residencyFound","hardeningChecked","diagnosticsBuilt"],"governance_residency_hardening_checked"],
  ["governance-static-decl-status.fungi","governanceStaticDeclStatusCore","V","verifyStaticDecls",["nodesCaptured","staticsFound","initializersChecked","diagnosticsBuilt"],"governance_static_decls_checked"],
  ["governance-tenant-isolation-status.fungi","governanceTenantIsolationStatusCore","V","verifyTenantIsolation",["flowCaptured","tenantFieldsFound","isolationChecked","diagnosticsBuilt"],"governance_tenant_isolation_checked"],
  ["governance-termination-annotation-status.fungi","governanceTerminationAnnotationStatusCore","V","verifyTerminationAnnotation",["flowCaptured","recursionFound","metricChecked","diagnosticsBuilt"],"governance_termination_checked"],
].map(([file,flow,source,symbol,names,expected])=>Object.freeze({file,flow,source:SOURCES[source],symbol,input:args(names),expected:string(expected)})));

function shadowFingerprint(source){const identifiers=new Map();return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");}

describe("40-file source-bound Fungi decision-core overlay wave 24",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[];const scopes=new Set();for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-ts",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);assert.equal(scopes.has(`${c.source}#${c.symbol}`),false);scopes.add(`${c.source}#${c.symbol}`);}});
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{const seen=new Map();const files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const p=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(p),`${c.file} must exist`);const source=readFileSync(p,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);}}assert.deepEqual(collisions,[]);});
  it("parses, effect-checks, emits GIR and executes every decision core",async()=>{for(const c of CANDIDATES){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8");const program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});
