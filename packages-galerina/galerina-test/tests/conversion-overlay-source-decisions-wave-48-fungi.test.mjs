import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

const ROOT=join(import.meta.dirname,"..","..",".."),PACKAGE_ROOT=join(ROOT,"packages-galerina","galerina-test"),OVERLAY_ROOT=join(PACKAGE_ROOT,"src","self-hosted","conversion-overlays"),PACKAGE=join(PACKAGE_ROOT,"package.json");
const bool=value=>({__tag:"bool",value}),string=value=>({__tag:"string",value}),args=names=>new Map(names.map(name=>[name,bool(true)])),RESERVED=new Set(["version","pure","secure","flow","FLOW","contract","intent","record","return","if","match","check","deny","ambig","mut","let","Bool","Int","String","Verdict","Result","Option","Array","true","false","Ok","Err","Some","None","Allow","Deny","Unknown"]);
const RAW=Object.freeze([
  [
    "proof-graph-hardware-sealed-dispatch",
    "galerina-core-compiler/src/proof-graph.ts",
    "export interface HardwareSealedDispatch {"
  ],
  [
    "proof-graph-fungi-hw-001",
    "galerina-core-compiler/src/proof-graph.ts",
    "export const FUNGI_HW_001 = {"
  ],
  [
    "proof-graph-fungi-hw-002",
    "galerina-core-compiler/src/proof-graph.ts",
    "export const FUNGI_HW_002 = {"
  ],
  [
    "proof-graph-fungi-hw-003",
    "galerina-core-compiler/src/proof-graph.ts",
    "export const FUNGI_HW_003 = {"
  ],
  [
    "proof-graph-fungi-hw-004",
    "galerina-core-compiler/src/proof-graph.ts",
    "export const FUNGI_HW_004 = {"
  ],
  [
    "proof-graph-proof-obligation-kind",
    "galerina-core-compiler/src/proof-graph.ts",
    "export type ProofObligationKind ="
  ],
  [
    "proof-graph-proof-obligation",
    "galerina-core-compiler/src/proof-graph.ts",
    "export interface ProofObligation {"
  ],
  [
    "proof-graph-proof-evidence",
    "galerina-core-compiler/src/proof-graph.ts",
    "export interface ProofEvidence {"
  ],
  [
    "proof-graph-proof-graph",
    "galerina-core-compiler/src/proof-graph.ts",
    "export interface ProofGraph {"
  ],
  [
    "proof-graph-liability-tier",
    "galerina-core-compiler/src/proof-graph.ts",
    "export type LiabilityTier ="
  ],
  [
    "proof-graph-liability-profile",
    "galerina-core-compiler/src/proof-graph.ts",
    "export interface LiabilityProfile {"
  ],
  [
    "proof-graph-physical-hardening-tier",
    "galerina-core-compiler/src/proof-graph.ts",
    "export type PhysicalHardeningTier ="
  ],
  [
    "proof-graph-tamper-response-strategies",
    "galerina-core-compiler/src/proof-graph.ts",
    "export const TAMPER_RESPONSE_STRATEGIES ="
  ],
  [
    "proof-graph-tamper-response-strategy",
    "galerina-core-compiler/src/proof-graph.ts",
    "export type TamperResponseStrategy ="
  ],
  [
    "proof-graph-build-proof-graph",
    "galerina-core-compiler/src/proof-graph.ts",
    "export function buildProofGraph("
  ],
  [
    "proof-graph-make-manifest-envelope",
    "galerina-core-compiler/src/proof-graph.ts",
    "export function makeManifestEnvelope("
  ],
  [
    "proof-graph-shares-governance-shape",
    "galerina-core-compiler/src/proof-graph.ts",
    "export function sharesGovernanceShape("
  ],
  [
    "proof-graph-governance-algorithm",
    "galerina-core-compiler/src/proof-graph.ts",
    "export type GovernanceAlgorithm ="
  ],
  [
    "proof-graph-mldsa-context",
    "galerina-core-compiler/src/proof-graph.ts",
    "const PROOFGRAPH_MLDSA_CONTEXT ="
  ],
  [
    "proof-graph-governance-key-pair",
    "galerina-core-compiler/src/proof-graph.ts",
    "export interface GovernanceKeyPair {"
  ],
  [
    "proof-graph-generate-governance-key-pair",
    "galerina-core-compiler/src/proof-graph.ts",
    "export function generateGovernanceKeyPair("
  ],
  [
    "proof-graph-generate-hybrid-governance-key-pair",
    "galerina-core-compiler/src/proof-graph.ts",
    "export async function generateHybridGovernanceKeyPair("
  ],
  [
    "proof-graph-canonical-signing-payload",
    "galerina-core-compiler/src/proof-graph.ts",
    "function canonicalSigningPayload("
  ],
  [
    "proof-graph-to-base64url",
    "galerina-core-compiler/src/proof-graph.ts",
    "function toBase64url("
  ],
  [
    "proof-graph-from-base64url",
    "galerina-core-compiler/src/proof-graph.ts",
    "function fromBase64url("
  ],
  [
    "proof-graph-sign-proof-graph",
    "galerina-core-compiler/src/proof-graph.ts",
    "export function signProofGraph("
  ],
  [
    "proof-graph-sign-proof-graph-hybrid",
    "galerina-core-compiler/src/proof-graph.ts",
    "export async function signProofGraphHybrid("
  ],
  [
    "proof-graph-verify-governance-signature",
    "galerina-core-compiler/src/proof-graph.ts",
    "export function verifyGovernanceSignature("
  ],
  [
    "proof-graph-verify-governance-signature-hybrid",
    "galerina-core-compiler/src/proof-graph.ts",
    "export async function verifyGovernanceSignatureHybrid("
  ],
  [
    "proof-graph-cached-proof-shape",
    "galerina-core-compiler/src/proof-graph.ts",
    "interface CachedProofShape {"
  ],
  [
    "proof-graph-proof-shape-cache",
    "galerina-core-compiler/src/proof-graph.ts",
    "const PROOF_SHAPE_CACHE ="
  ],
  [
    "proof-graph-proof-shape-cache-weigh",
    "galerina-core-compiler/src/proof-graph.ts",
    "weigh: (s) =>"
  ],
  [
    "proof-graph-proof-cache-hits",
    "galerina-core-compiler/src/proof-graph.ts",
    "let _proofCacheHits ="
  ],
  [
    "proof-graph-proof-cache-misses",
    "galerina-core-compiler/src/proof-graph.ts",
    "let _proofCacheMisses ="
  ],
  [
    "proof-graph-build-proof-graph-cached",
    "galerina-core-compiler/src/proof-graph.ts",
    "export function buildProofGraphCached("
  ],
  [
    "proof-graph-get-proof-cache-stats",
    "galerina-core-compiler/src/proof-graph.ts",
    "export function getProofCacheStats("
  ],
  [
    "proof-graph-clear-proof-cache",
    "galerina-core-compiler/src/proof-graph.ts",
    "export function clearProofCache("
  ],
  [
    "proof-graph-governance-roi-report",
    "galerina-core-compiler/src/proof-graph.ts",
    "export interface GovernanceROIReport {"
  ],
  [
    "proof-graph-generate-roi-report",
    "galerina-core-compiler/src/proof-graph.ts",
    "export function generateROIReport("
  ],
  [
    "proof-graph-graph-fingerprint",
    "galerina-core-compiler/src/proof-graph.ts",
    "export interface GraphFingerprint {"
  ]
]);
const camel=stem=>stem.split("-").map((p,i)=>i===0?p:p[0].toUpperCase()+p.slice(1)).join("");
const CANDIDATES=Object.freeze(RAW.map(([stem,source,symbol])=>Object.freeze({file:`${stem}-status.fungi`,flow:`${camel(stem)}StatusCore`,source,symbol,input:args(["sourceReady","shapeReady","stateReady","policyReady","routeReady","proofReady","sealReady"]),expected:string(`${stem.replaceAll("-","_")}_built`)})));
function shadowFingerprint(source){const identifiers=new Map();return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");}
describe("40-file source-bound Fungi decision-core overlay wave 48",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[],scopes=new Set();for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-galerina",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);const scope=`${c.source}#${c.flow}`;assert.equal(scopes.has(scope),false);scopes.add(scope);}});
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{const seen=new Map(),files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const p=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(p),`${c.file} must exist`);const source=readFileSync(p,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);} }assert.deepEqual(collisions,[]);});
  it("parses, effect-checks, emits GIR and executes every decision core",async()=>{for(const c of CANDIDATES){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8"),program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});

