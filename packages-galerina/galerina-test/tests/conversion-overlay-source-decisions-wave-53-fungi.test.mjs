import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

const ROOT=join(import.meta.dirname,"..","..",".."),PACKAGE_ROOT=join(ROOT,"packages-galerina","galerina-test"),OVERLAY_ROOT=join(PACKAGE_ROOT,"src","self-hosted","conversion-overlays"),PACKAGE=join(PACKAGE_ROOT,"package.json");
const bool=value=>({__tag:"bool",value}),string=value=>({__tag:"string",value}),args=names=>new Map(names.map(name=>[name,bool(true)])),RESERVED=new Set(["version","pure","secure","flow","FLOW","contract","intent","record","return","if","match","check","deny","ambig","mut","let","Bool","Int","String","Verdict","Result","Option","Array","true","false","Ok","Err","Some","None","Allow","Deny","Unknown"]);
const RAW=Object.freeze([
  ["governed-memory-create-governed-memory-can-access","galerina-core-compiler/src/runtime/governedMemory.ts","  function canAccess(id: string, accessorFlow: string): boolean {"],
  ["governed-memory-create-governed-memory-get-all","galerina-core-compiler/src/runtime/governedMemory.ts","  function getAll(): readonly GovernedValueTag[] {"],
  ["governed-memory-create-governed-memory-get-access-log","galerina-core-compiler/src/runtime/governedMemory.ts","  function getAccessLog(id: string): readonly string[] {"],
  ["limit-policy-rate-limit","galerina-core-compiler/src/runtime/limitPolicy.ts","export interface RateLimit {"],
  ["limit-policy-limit-config","galerina-core-compiler/src/runtime/limitPolicy.ts","export interface LimitConfig {"],
  ["limit-policy-limit-violation","galerina-core-compiler/src/runtime/limitPolicy.ts","export type LimitViolation = {"],
  ["limit-policy-default-limit-config","galerina-core-compiler/src/runtime/limitPolicy.ts","const DEFAULT_LIMIT_CONFIG: LimitConfig = {};"],
  ["limit-policy-limit-request-size-re","galerina-core-compiler/src/runtime/limitPolicy.ts","const LIMIT_REQUEST_SIZE_RE ="],
  ["limit-policy-limit-batch-size-re","galerina-core-compiler/src/runtime/limitPolicy.ts","const LIMIT_BATCH_SIZE_RE"],
  ["limit-policy-limit-memory-re","galerina-core-compiler/src/runtime/limitPolicy.ts","const LIMIT_MEMORY_RE"],
  ["limit-policy-limit-prompt-re","galerina-core-compiler/src/runtime/limitPolicy.ts","const LIMIT_PROMPT_RE"],
  ["limit-policy-limit-results-re","galerina-core-compiler/src/runtime/limitPolicy.ts","const LIMIT_RESULTS_RE"],
  ["limit-policy-limit-query-length-re","galerina-core-compiler/src/runtime/limitPolicy.ts","const LIMIT_QUERY_LENGTH_RE"],
  ["limit-policy-limit-amount-re","galerina-core-compiler/src/runtime/limitPolicy.ts","const LIMIT_AMOUNT_RE"],
  ["limit-policy-limit-concurrent-re","galerina-core-compiler/src/runtime/limitPolicy.ts","const LIMIT_CONCURRENT_RE"],
  ["limit-policy-limit-rate-re","galerina-core-compiler/src/runtime/limitPolicy.ts","const LIMIT_RATE_RE"],
  ["limit-policy-all-limit-patterns","galerina-core-compiler/src/runtime/limitPolicy.ts","const ALL_LIMIT_PATTERNS = ["],
  ["limit-policy-is-recognized-limit-decl","galerina-core-compiler/src/runtime/limitPolicy.ts","export function isRecognizedLimitDecl(decl: string): boolean {"],
  ["limit-policy-parse-limit-config","galerina-core-compiler/src/runtime/limitPolicy.ts","export function parseLimitConfig("],
  ["limit-policy-check-request-size","galerina-core-compiler/src/runtime/limitPolicy.ts","export function checkRequestSize("],
  ["limit-policy-check-batch-size","galerina-core-compiler/src/runtime/limitPolicy.ts","export function checkBatchSize("],
  ["limit-policy-check-result-count","galerina-core-compiler/src/runtime/limitPolicy.ts","export function checkResultCount(count: number, config: LimitConfig): LimitViolation | null {"],
  ["limit-policy-check-query-length","galerina-core-compiler/src/runtime/limitPolicy.ts","export function checkQueryLength(chars: number, config: LimitConfig): LimitViolation | null {"],
  ["limit-policy-check-amount","galerina-core-compiler/src/runtime/limitPolicy.ts","export function checkAmount(amount: number, config: LimitConfig): LimitViolation | null {"],
  ["limit-policy-check-concurrent-tasks","galerina-core-compiler/src/runtime/limitPolicy.ts","export function checkConcurrentTasks(current: number, config: LimitConfig): LimitViolation | null {"],
  ["limit-policy-check-rate","galerina-core-compiler/src/runtime/limitPolicy.ts","export function checkRate(observedInWindow: number, config: LimitConfig): LimitViolation | null {"],
  ["limit-policy-find-contract-section","galerina-core-compiler/src/runtime/limitPolicy.ts","function findContractSection("],
  ["limit-policy-to-bytes","galerina-core-compiler/src/runtime/limitPolicy.ts","function toBytes(value: number, unit: string): number {"],
  ["limit-policy-to-period-ms","galerina-core-compiler/src/runtime/limitPolicy.ts","function toPeriodMs(unit: string): number {"],
  ["limit-policy-normalise-rate-scope","galerina-core-compiler/src/runtime/limitPolicy.ts","function normaliseRateScope(raw: string | undefined): RateLimit[\"scope\"] {"],
  ["retry-policy-retry-config","galerina-core-compiler/src/runtime/retryPolicy.ts","export interface RetryConfig {"],
  ["retry-policy-effect-retry-policy","galerina-core-compiler/src/runtime/retryPolicy.ts","export interface EffectRetryPolicy {"],
  ["retry-policy-default-retry-config","galerina-core-compiler/src/runtime/retryPolicy.ts","const DEFAULT_RETRY_CONFIG: RetryConfig = {"],
  ["retry-policy-default-effect-retry-policy","galerina-core-compiler/src/runtime/retryPolicy.ts","const DEFAULT_EFFECT_RETRY_POLICY: EffectRetryPolicy = {"],
  ["retry-policy-parse-retry-policy","galerina-core-compiler/src/runtime/retryPolicy.ts","export function parseRetryPolicy("],
  ["retry-policy-with-retry","galerina-core-compiler/src/runtime/retryPolicy.ts","export async function withRetry<T>("],
  ["retry-policy-compute-delay","galerina-core-compiler/src/runtime/retryPolicy.ts","function computeDelay(config: RetryConfig, attempt: number): number {"],
  ["retry-policy-sleep","galerina-core-compiler/src/runtime/retryPolicy.ts","function sleep(ms: number): Promise<void> {"],
  ["retry-policy-find-contract-section","galerina-core-compiler/src/runtime/retryPolicy.ts","function findContractSection("],
  ["retry-policy-is-valid-strategy","galerina-core-compiler/src/runtime/retryPolicy.ts","function isValidStrategy(s: string): s is RetryConfig[\"strategy\"] {"],]);
const camel=stem=>stem.split("-").map((p,i)=>i===0?p:p[0].toUpperCase()+p.slice(1)).join("");
const CANDIDATES=Object.freeze(RAW.map(([stem,source,symbol])=>Object.freeze({file:`${stem}-status.fungi`,flow:`${camel(stem)}StatusCore`,source,symbol,input:args(["sourceReady","shapeReady","stateReady","policyReady","routeReady","proofReady","sealReady"]),expected:string(`${stem.replaceAll("-","_")}_built`)})));
function shadowFingerprint(source){const identifiers=new Map();return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");}
describe("40-file source-bound Fungi decision-core overlay wave 53",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[],scopes=new Set();for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-galerina",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);const scope=`${c.source}#${c.symbol}`;assert.equal(scopes.has(scope),false);scopes.add(scope);}});
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{const seen=new Map(),files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const p=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(p),`${c.file} must exist`);const source=readFileSync(p,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);}}assert.deepEqual(collisions,[]);});
  it("parses, effect-checks, emits GIR and executes a deterministic 10-file sample",async()=>{for(const c of CANDIDATES.slice(0,10)){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8"),program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});
