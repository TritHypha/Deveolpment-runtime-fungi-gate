import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

const ROOT=join(import.meta.dirname,"..","..",".."),PACKAGE_ROOT=join(ROOT,"packages-galerina","galerina-test"),OVERLAY_ROOT=join(PACKAGE_ROOT,"src","self-hosted","conversion-overlays"),PACKAGE=join(PACKAGE_ROOT,"package.json"),SOURCE="galerina-core-compiler/src/governance-verifier.ts";
const bool=value=>({__tag:"bool",value}),string=value=>({__tag:"string",value}),args=names=>new Map(names.map(name=>[name,bool(true)]));
const RESERVED=new Set(["version","pure","secure","flow","FLOW","contract","intent","record","return","if","match","check","deny","ambig","mut","let","Bool","Int","String","Verdict","Result","Option","Array","true","false","Ok","Err","Some","None","Allow","Deny","Unknown"]);
const CANDIDATES=Object.freeze([
  ["governance-verifier-has-authority-reason-status.fungi","governanceVerifierHasAuthorityReasonStatusCore","function hasAuthorityReason(","governance_verifier_has_authority_reason_built"],
  ["governance-verifier-has-protected-value-declaration-status.fungi","governanceVerifierHasProtectedValueDeclarationStatusCore","function hasProtectedValueDeclaration(","governance_verifier_has_protected_value_declaration_built"],
  ["governance-verifier-is-privileged-flow-status.fungi","governanceVerifierIsPrivilegedFlowStatusCore","function isPrivilegedFlow(","governance_verifier_is_privileged_flow_built"],
  ["governance-verifier-extract-response-denied-fields-status.fungi","governanceVerifierExtractResponseDeniedFieldsStatusCore","function extractResponseDeniedFields(","governance_verifier_extract_response_denied_fields_built"],
  ["governance-verifier-extract-privacy-denied-response-fields-status.fungi","governanceVerifierExtractPrivacyDeniedResponseFieldsStatusCore","function extractPrivacyDeniedResponseFields(","governance_verifier_extract_privacy_denied_response_fields_built"],
  ["governance-verifier-binding-name-of-status.fungi","governanceVerifierBindingNameOfStatusCore","function bindingNameOf(","governance_verifier_binding_name_of_built"],
  ["governance-verifier-collect-body-field-names-status.fungi","governanceVerifierCollectBodyFieldNamesStatusCore","function collectBodyFieldNames(","governance_verifier_collect_body_field_names_built"],
  ["governance-verifier-collect-fields-status.fungi","governanceVerifierCollectFieldsStatusCore","function collectFields(","governance_verifier_collect_fields_built"],
  ["governance-verifier-carry-of-status.fungi","governanceVerifierCarryOfStatusCore","function carryOf(","governance_verifier_carry_of_built"],
  ["governance-verifier-build-aliases-status.fungi","governanceVerifierBuildAliasesStatusCore","function buildAliases(","governance_verifier_build_aliases_built"],
  ["governance-verifier-find-return-stmts-status.fungi","governanceVerifierFindReturnStmtsStatusCore","function findReturnStmts(","governance_verifier_find_return_stmts_built"],
  ["governance-verifier-extract-required-context-status.fungi","governanceVerifierExtractRequiredContextStatusCore","function extractRequiredContext(","governance_verifier_extract_required_context_built"],
  ["governance-verifier-extract-value-classification-status.fungi","governanceVerifierExtractValueClassificationStatusCore","function extractValueClassification(","governance_verifier_extract_value_classification_built"],
  ["governance-verifier-extract-safety-requirements-status.fungi","governanceVerifierExtractSafetyRequirementsStatusCore","function extractSafetyRequirements(","governance_verifier_extract_safety_requirements_built"],
  ["governance-verifier-extract-hardware-targets-status.fungi","governanceVerifierExtractHardwareTargetsStatusCore","function extractHardwareTargets(","governance_verifier_extract_hardware_targets_built"],
  ["governance-verifier-is-context-field-accessed-status.fungi","governanceVerifierIsContextFieldAccessedStatusCore","function isContextFieldAccessed(","governance_verifier_is_context_field_accessed_built"],
  ["governance-verifier-extract-limits-fields-status.fungi","governanceVerifierExtractLimitsFieldsStatusCore","function extractLimitsFields(","governance_verifier_extract_limits_fields_built"],
  ["governance-verifier-canonical-limit-name-status.fungi","governanceVerifierCanonicalLimitNameStatusCore","function canonicalLimitName(","governance_verifier_canonical_limit_name_built"],
  ["governance-verifier-parse-limit-value-status.fungi","governanceVerifierParseLimitValueStatusCore","function parseLimitValue(","governance_verifier_parse_limit_value_built"],
  ["governance-verifier-parse-flow-limit-decl-status.fungi","governanceVerifierParseFlowLimitDeclStatusCore","function parseFlowLimitDecl(","governance_verifier_parse_flow_limit_decl_built"],
  ["governance-verifier-has-overly-broad-authority-status.fungi","governanceVerifierHasOverlyBroadAuthorityStatusCore","function hasOverlyBroadAuthority(","governance_verifier_has_overly_broad_authority_built"],
  ["governance-verifier-extract-max-risk-liability-status.fungi","governanceVerifierExtractMaxRiskLiabilityStatusCore","function extractMaxRiskLiability(","governance_verifier_extract_max_risk_liability_built"],
  ["governance-verifier-has-epilogue-block-status.fungi","governanceVerifierHasEpilogueBlockStatusCore","function hasEpilogueBlock(","governance_verifier_has_epilogue_block_built"],
  ["governance-verifier-has-recursive-call-status.fungi","governanceVerifierHasRecursiveCallStatusCore","function hasRecursiveCall(","governance_verifier_has_recursive_call_built"],
  ["governance-verifier-has-recursive-call-walk-status.fungi","governanceVerifierHasRecursiveCallWalkStatusCore","function walk(node: AstNode): boolean {","governance_verifier_has_recursive_call_walk_built"],
  ["governance-verifier-detect-intent-mismatch-status.fungi","governanceVerifierDetectIntentMismatchStatusCore","function detectIntentMismatch(","governance_verifier_detect_intent_mismatch_built"],
  ["governance-verifier-extract-arena-limit-mb-status.fungi","governanceVerifierExtractArenaLimitMbStatusCore","export function extractArenaLimitMB(","governance_verifier_extract_arena_limit_mb_built"],
  ["governance-verifier-collect-unresolved-identifiers-status.fungi","governanceVerifierCollectUnresolvedIdentifiersStatusCore","function collectUnresolvedIdentifiers(","governance_verifier_collect_unresolved_identifiers_built"],
  ["governance-verifier-collect-unresolved-identifiers-walk-status.fungi","governanceVerifierCollectUnresolvedIdentifiersWalkStatusCore","function walk(node: AstNode): void {","governance_verifier_collect_unresolved_identifiers_walk_built"],
  ["governance-verifier-expr-references-result-status.fungi","governanceVerifierExprReferencesResultStatusCore","function exprReferencesResult(","governance_verifier_expr_references_result_built"],
  ["governance-verifier-class-status.fungi","governanceVerifierClassStatusCore","class GovernanceVerifier {","governance_verifier_class_built"],
  ["governance-verifier-verify-status.fungi","governanceVerifierVerifyStatusCore","  verify(","governance_verifier_verify_built"],
  ["governance-verifier-get-result-status.fungi","governanceVerifierGetResultStatusCore","  getResult(): GovernanceVerifyResult {","governance_verifier_get_result_built"],
  ["governance-verifier-verify-flow-status.fungi","governanceVerifierVerifyFlowStatusCore","  private verifyFlow(","governance_verifier_verify_flow_built"],
  ["governance-verifier-verify-assuming-blocks-status.fungi","governanceVerifierVerifyAssumingBlocksStatusCore","  private verifyAssumingBlocks(","governance_verifier_verify_assuming_blocks_built"],
  ["governance-verifier-verify-architecture-block-status.fungi","governanceVerifierVerifyArchitectureBlockStatusCore","  private verifyArchitectureBlock(","governance_verifier_verify_architecture_block_built"],
  ["governance-verifier-flow-volatility-level-status.fungi","governanceVerifierFlowVolatilityLevelStatusCore","  private flowVolatilityLevel(","governance_verifier_flow_volatility_level_built"],
  ["governance-verifier-verify-architecture-stability-status.fungi","governanceVerifierVerifyArchitectureStabilityStatusCore","  private verifyArchitectureStability(","governance_verifier_verify_architecture_stability_built"],
  ["governance-verifier-verify-invariant-block-status.fungi","governanceVerifierVerifyInvariantBlockStatusCore","  private verifyInvariantBlock(","governance_verifier_verify_invariant_block_built"],
  ["governance-verifier-try-static-eval-status.fungi","governanceVerifierTryStaticEvalStatusCore","  private tryStaticEval(","governance_verifier_try_static_eval_built"],
].map(([file,flow,symbol,expected])=>Object.freeze({file,flow,source:SOURCE,symbol,input:args(["inputCaptured","stateChecked","decisionBuilt","evidenceBound","outcomeSealed","releaseChecked"]),expected:string(expected)})));

function shadowFingerprint(source){const identifiers=new Map();return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");}

describe("40-file source-bound Fungi decision-core overlay wave 34",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[],scopes=new Set(),source=readFileSync(join(ROOT,"packages-galerina",SOURCE),"utf8");for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);assert.ok(source.includes(c.symbol),`${SOURCE} must contain ${c.symbol}`);const scope=`${c.source}#${c.symbol}`;assert.equal(scopes.has(scope),false);scopes.add(scope);}});
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{const seen=new Map(),files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const p=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(p),`${c.file} must exist`);const source=readFileSync(p,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);}}assert.deepEqual(collisions,[]);});
  it("parses, effect-checks, emits GIR and executes every decision core",async()=>{for(const c of CANDIDATES){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8"),program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});
