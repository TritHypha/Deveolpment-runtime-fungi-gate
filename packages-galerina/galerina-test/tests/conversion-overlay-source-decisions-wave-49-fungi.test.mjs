import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

const ROOT=join(import.meta.dirname,"..","..",".."),PACKAGE_ROOT=join(ROOT,"packages-galerina","galerina-test"),OVERLAY_ROOT=join(PACKAGE_ROOT,"src","self-hosted","conversion-overlays"),PACKAGE=join(PACKAGE_ROOT,"package.json");
const bool=value=>({__tag:"bool",value}),string=value=>({__tag:"string",value}),args=names=>new Map(names.map(name=>[name,bool(true)])),RESERVED=new Set(["version","pure","secure","flow","FLOW","contract","intent","record","return","if","match","check","deny","ambig","mut","let","Bool","Int","String","Verdict","Result","Option","Array","true","false","Ok","Err","Some","None","Allow","Deny","Unknown"]);
const RAW=Object.freeze([
  ["proof-graph-diff-fingerprints","galerina-core-compiler/src/proof-graph.ts","export function diffFingerprints("],
  ["pure-flow-cache-max-entries","galerina-core-compiler/src/pure-flow-cache.ts","const MAX_ENTRIES ="],
  ["pure-flow-cache-lru-node","galerina-core-compiler/src/pure-flow-cache.ts","interface LRUNode {"],
  ["pure-flow-cache-lru-cache","galerina-core-compiler/src/pure-flow-cache.ts","class LRUCache {"],
  ["pure-flow-cache-lru-cache-constructor","galerina-core-compiler/src/pure-flow-cache.ts","  constructor() {"],
  ["pure-flow-cache-lru-cache-get","galerina-core-compiler/src/pure-flow-cache.ts","  get(key: string):"],
  ["pure-flow-cache-lru-cache-set","galerina-core-compiler/src/pure-flow-cache.ts","  set(key: string, value: GalerinaValue):"],
  ["pure-flow-cache-lru-cache-clear","galerina-core-compiler/src/pure-flow-cache.ts","  clear(): void"],
  ["pure-flow-cache-lru-cache-stats","galerina-core-compiler/src/pure-flow-cache.ts","  get stats()"],
  ["pure-flow-cache-lru-cache-move-to-front","galerina-core-compiler/src/pure-flow-cache.ts","  private moveToFront("],
  ["pure-flow-cache-lru-cache-add-to-front","galerina-core-compiler/src/pure-flow-cache.ts","  private addToFront("],
  ["pure-flow-cache-lru-cache-remove-node","galerina-core-compiler/src/pure-flow-cache.ts","  private removeNode("],
  ["pure-flow-cache-lru-cache-evict-last","galerina-core-compiler/src/pure-flow-cache.ts","  private evictLast("],
  ["pure-flow-cache-session-cache","galerina-core-compiler/src/pure-flow-cache.ts","const SESSION_CACHE ="],
  ["pure-flow-cache-fnv-prime","galerina-core-compiler/src/pure-flow-cache.ts","const FNV_PRIME"],
  ["pure-flow-cache-fnv-offset","galerina-core-compiler/src/pure-flow-cache.ts","const FNV_OFFSET"],
  ["pure-flow-cache-fnv-byte","galerina-core-compiler/src/pure-flow-cache.ts","function fnvByte("],
  ["pure-flow-cache-fnv-int","galerina-core-compiler/src/pure-flow-cache.ts","function fnvInt("],
  ["pure-flow-cache-fnv-str","galerina-core-compiler/src/pure-flow-cache.ts","function fnvStr("],
  ["pure-flow-cache-galerina-value-fingerprint","galerina-core-compiler/src/pure-flow-cache.ts","export function galerinaValueFingerprint("],
  ["pure-flow-cache-pure-flow-cache-key","galerina-core-compiler/src/pure-flow-cache.ts","export function pureFlowCacheKey("],
  ["pure-flow-cache-get-cached-pure-flow","galerina-core-compiler/src/pure-flow-cache.ts","export function getCachedPureFlow("],
  ["pure-flow-cache-set-cached-pure-flow","galerina-core-compiler/src/pure-flow-cache.ts","export function setCachedPureFlow("],
  ["pure-flow-cache-clear-pure-flow-cache","galerina-core-compiler/src/pure-flow-cache.ts","export function clearPureFlowCache("],
  ["pure-flow-cache-get-pure-flow-cache-stats","galerina-core-compiler/src/pure-flow-cache.ts","export function getPureFlowCacheStats("],
  ["register-vm-register-id","galerina-core-compiler/src/register-vm.ts","export type RegisterId ="],
  ["register-vm-constant-pool-index","galerina-core-compiler/src/register-vm.ts","export type ConstantPoolIndex ="],
  ["register-vm-register-opcode","galerina-core-compiler/src/register-vm.ts","export type RegisterOpcode ="],
  ["register-vm-register-instruction","galerina-core-compiler/src/register-vm.ts","export interface RegisterInstruction {"],
  ["register-vm-register-function","galerina-core-compiler/src/register-vm.ts","export interface RegisterFunction {"],
  ["register-vm-register-bytecode-module","galerina-core-compiler/src/register-vm.ts","export interface RegisterBytecodeModule {"],
  ["register-vm-emit-bytecode","galerina-core-compiler/src/register-vm.ts","export function emitBytecode("],
  ["resilience-inference-resilience-fallback","galerina-core-compiler/src/resilience-inference.ts","export type ResilienceFallback ="],
  ["resilience-inference-backoff-strategy","galerina-core-compiler/src/resilience-inference.ts","export type BackoffStrategy ="],
  ["resilience-inference-fault-signal","galerina-core-compiler/src/resilience-inference.ts","export type FaultSignal ="],
  ["resilience-inference-fault-action","galerina-core-compiler/src/resilience-inference.ts","export type FaultAction ="],
  ["resilience-inference-fault-handler","galerina-core-compiler/src/resilience-inference.ts","export interface FaultHandler {"],
  ["resilience-inference-inferred-resilience","galerina-core-compiler/src/resilience-inference.ts","export interface InferredResilience {"],
  ["resilience-inference-mutation-effects","galerina-core-compiler/src/resilience-inference.ts","const MUTATION_EFFECTS ="],
  ["resilience-inference-network-effects","galerina-core-compiler/src/resilience-inference.ts","const NETWORK_EFFECTS ="]
]);
const camel=stem=>stem.split("-").map((p,i)=>i===0?p:p[0].toUpperCase()+p.slice(1)).join("");
const CANDIDATES=Object.freeze(RAW.map(([stem,source,symbol])=>Object.freeze({file:`${stem}-status.fungi`,flow:`${camel(stem)}StatusCore`,source,symbol,input:args(["sourceReady","shapeReady","stateReady","policyReady","routeReady","proofReady","sealReady"]),expected:string(`${stem.replaceAll("-","_")}_built`)})));
function shadowFingerprint(source){const identifiers=new Map();return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");}
describe("40-file source-bound Fungi decision-core overlay wave 49",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[],scopes=new Set();for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-galerina",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);const scope=`${c.source}#${c.flow}`;assert.equal(scopes.has(scope),false);scopes.add(scope);}});
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{const seen=new Map(),files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const p=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(p),`${c.file} must exist`);const source=readFileSync(p,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);} }assert.deepEqual(collisions,[]);});
  it("parses, effect-checks, emits GIR and executes a deterministic 10-file sample",async()=>{for(const c of CANDIDATES.slice(0,10)){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8"),program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});
