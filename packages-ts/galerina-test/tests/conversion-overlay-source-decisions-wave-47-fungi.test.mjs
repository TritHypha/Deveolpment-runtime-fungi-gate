import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

const ROOT=join(import.meta.dirname,"..","..",".."),PACKAGE_ROOT=join(ROOT,"packages-ts","galerina-test"),OVERLAY_ROOT=join(PACKAGE_ROOT,"src","self-hosted","conversion-overlays"),PACKAGE=join(PACKAGE_ROOT,"package.json");
const bool=value=>({__tag:"bool",value}),string=value=>({__tag:"string",value}),args=names=>new Map(names.map(name=>[name,bool(true)])),RESERVED=new Set(["version","pure","secure","flow","FLOW","contract","intent","record","return","if","match","check","deny","ambig","mut","let","Bool","Int","String","Verdict","Result","Option","Array","true","false","Ok","Err","Some","None","Allow","Deny","Unknown"]);
const RAW=Object.freeze([
  ["profile-checker-fungi-profile-007","galerina-core-compiler/src/profile-checker.ts","export const FUNGI_PROFILE_007 = {"],
  ["profile-checker-runtime-profile","galerina-core-compiler/src/profile-checker.ts","export type RuntimeProfile ="],
  ["profile-checker-profile-rules","galerina-core-compiler/src/profile-checker.ts","interface ProfileRules {"],
  ["profile-checker-profile-rules-table","galerina-core-compiler/src/profile-checker.ts","const PROFILE_RULES: Record<RuntimeProfile, ProfileRules> = {"],
  ["profile-checker-find-flow-node","galerina-core-compiler/src/profile-checker.ts","function findFlowNode("],
  ["profile-checker-collect-called-flows","galerina-core-compiler/src/profile-checker.ts","function collectCalledFlows("],
  ["profile-checker-is-recursive","galerina-core-compiler/src/profile-checker.ts","function isRecursive("],
  ["profile-checker-is-recursive-dfs","galerina-core-compiler/src/profile-checker.ts","  function dfs(current: string): boolean {"],
  ["profile-checker-has-unbounded-loop","galerina-core-compiler/src/profile-checker.ts","function hasUnboundedLoop("],
  ["profile-checker-is-bounded-condition","galerina-core-compiler/src/profile-checker.ts","function isBoundedCondition("],
  ["profile-checker-dynamic-regex-calls","galerina-core-compiler/src/profile-checker.ts","const DYNAMIC_REGEX_CALLS = new Set(["],
  ["profile-checker-has-dynamic-regex-call","galerina-core-compiler/src/profile-checker.ts","function hasDynamicRegexCall("],
  ["profile-checker-has-dynamic-regex-call-walk","galerina-core-compiler/src/profile-checker.ts","  function walk(node: AstNode): boolean {"],
  ["profile-checker-has-runtime-budget","galerina-core-compiler/src/profile-checker.ts","function hasRuntimeBudget("],
  ["profile-checker-check-profiles","galerina-core-compiler/src/profile-checker.ts","export function checkProfiles("],
  ["profile-checker-profile-diagnostics","galerina-core-compiler/src/profile-checker.ts","export const PROFILE_DIAGNOSTICS = ["],
  ["proof-chain-execution-proof-chain","galerina-core-compiler/src/proof-chain.ts","export interface ExecutionProofChain {"],
  ["proof-chain-proof-hashes","galerina-core-compiler/src/proof-chain.ts","export interface ProofHashes {"],
  ["proof-chain-evidence-record","galerina-core-compiler/src/proof-chain.ts","export interface EvidenceRecord {"],
  ["proof-chain-denial-record","galerina-core-compiler/src/proof-chain.ts","export interface DenialRecord {"],
  ["proof-chain-inputs","galerina-core-compiler/src/proof-chain.ts","export interface ProofChainInputs {"],
  ["proof-chain-sha256","galerina-core-compiler/src/proof-chain.ts","function sha256(content: string): string {"],
  ["proof-chain-canonical","galerina-core-compiler/src/proof-chain.ts","function canonical(value: unknown): string {"],
  ["proof-chain-sort-keys-replacer","galerina-core-compiler/src/proof-chain.ts","function sortKeysReplacer("],
  ["proof-chain-to-jsonl","galerina-core-compiler/src/proof-chain.ts","function toJSONL(events: readonly unknown[]): string {"],
  ["proof-chain-build-proof-chain","galerina-core-compiler/src/proof-chain.ts","export function buildProofChain("],
  ["proof-chain-verify-proof-chain","galerina-core-compiler/src/proof-chain.ts","export function verifyProofChain("],
  ["proof-graph-execution-signature","galerina-core-compiler/src/proof-graph.ts","export interface ExecutionSignature {"],
  ["proof-graph-compute-execution-signature","galerina-core-compiler/src/proof-graph.ts","export function computeExecutionSignature("],
  ["proof-graph-execution-signature-hash","galerina-core-compiler/src/proof-graph.ts","export function executionSignatureHash("],
  ["proof-graph-immutable-input-seal","galerina-core-compiler/src/proof-graph.ts","export interface ImmutableInputSeal {"],
  ["proof-graph-epilogue-proof-strategy","galerina-core-compiler/src/proof-graph.ts","export type EpilogueProofStrategy ="],
  ["proof-graph-epilogue-failure-action","galerina-core-compiler/src/proof-graph.ts","export type EpilogueFailureAction ="],
  ["proof-graph-zk-proof","galerina-core-compiler/src/proof-graph.ts","export interface ZkProof {"],
  ["proof-graph-epilogue-receipt","galerina-core-compiler/src/proof-graph.ts","export interface EpilogueReceipt {"],
  ["proof-graph-placeholder-circuit-ids","galerina-core-compiler/src/proof-graph.ts","export const PLACEHOLDER_CIRCUIT_IDS:"],
  ["proof-graph-fungi-proof-cert-001","galerina-core-compiler/src/proof-graph.ts","export const FUNGI_PROOF_CERT_001 ="],
  ["proof-graph-fungi-proof-cert-002","galerina-core-compiler/src/proof-graph.ts","export const FUNGI_PROOF_CERT_002 ="],
  ["proof-graph-decode-proof-meta","galerina-core-compiler/src/proof-graph.ts","function decodeProofMeta("],
  ["proof-graph-generate-epilogue-receipt","galerina-core-compiler/src/proof-graph.ts","export function generateEpilogueReceipt("],
]);
const camel=stem=>stem.split("-").map((p,i)=>i===0?p:p[0].toUpperCase()+p.slice(1)).join("");
const CANDIDATES=Object.freeze(RAW.map(([stem,source,symbol])=>Object.freeze({file:`${stem}-status.fungi`,flow:`${camel(stem)}StatusCore`,source,symbol,input:args(["sourceReady","shapeReady","stateReady","policyReady","routeReady","proofReady","sealReady"]),expected:string(`${stem.replaceAll("-","_")}_built`)})));
function shadowFingerprint(source){const identifiers=new Map();return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");}
describe("40-file source-bound Fungi decision-core overlay wave 47",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[],scopes=new Set();for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-ts",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);const scope=`${c.source}#${c.flow}`;assert.equal(scopes.has(scope),false);scopes.add(scope);}});
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{const seen=new Map(),files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const p=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(p),`${c.file} must exist`);const source=readFileSync(p,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);} }assert.deepEqual(collisions,[]);});
  it("parses, effect-checks, emits GIR and executes every decision core",async()=>{for(const c of CANDIDATES){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8"),program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});
