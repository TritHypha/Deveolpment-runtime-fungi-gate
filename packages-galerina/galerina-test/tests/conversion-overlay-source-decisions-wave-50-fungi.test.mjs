import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

const ROOT=join(import.meta.dirname,"..","..",".."),PACKAGE_ROOT=join(ROOT,"packages-galerina","galerina-test"),OVERLAY_ROOT=join(PACKAGE_ROOT,"src","self-hosted","conversion-overlays"),PACKAGE=join(PACKAGE_ROOT,"package.json");
const bool=value=>({__tag:"bool",value}),string=value=>({__tag:"string",value}),args=names=>new Map(names.map(name=>[name,bool(true)])),RESERVED=new Set(["version","pure","secure","flow","FLOW","contract","intent","record","return","if","match","check","deny","ambig","mut","let","Bool","Int","String","Verdict","Result","Option","Array","true","false","Ok","Err","Some","None","Allow","Deny","Unknown"]);
const RAW=Object.freeze([
  ["resilience-inference-has-explicit-resilience","galerina-core-compiler/src/resilience-inference.ts","function hasExplicitResilience("],
  ["resilience-inference-extract-resilience-field","galerina-core-compiler/src/resilience-inference.ts","function extractResilienceField("],
  ["resilience-inference-extract-idempotent-flag","galerina-core-compiler/src/resilience-inference.ts","function extractIdempotentFlag("],
  ["resilience-inference-extract-fallback","galerina-core-compiler/src/resilience-inference.ts","function extractFallback("],
  ["resilience-inference-extract-retry-count","galerina-core-compiler/src/resilience-inference.ts","function extractRetryCount("],
  ["resilience-inference-extract-on-quarantine","galerina-core-compiler/src/resilience-inference.ts","function extractOnQuarantine("],
  ["resilience-inference-fault-signals","galerina-core-compiler/src/resilience-inference.ts","const FAULT_SIGNALS:"],
  ["resilience-inference-secure-default-fault-action","galerina-core-compiler/src/resilience-inference.ts","const SECURE_DEFAULT_FAULT_ACTION:"],
  ["resilience-inference-extract-declared-fault-handlers","galerina-core-compiler/src/resilience-inference.ts","function extractDeclaredFaultHandlers("],
  ["resilience-inference-coerce-fault-action","galerina-core-compiler/src/resilience-inference.ts","function coerceFaultAction("],
  ["resilience-inference-build-fault-handlers","galerina-core-compiler/src/resilience-inference.ts","function buildFaultHandlers("],
  ["resilience-inference-infer-flow-resilience","galerina-core-compiler/src/resilience-inference.ts","export function inferFlowResilience("],
  ["resilience-inference-resilience-violation","galerina-core-compiler/src/resilience-inference.ts","export interface ResilienceViolation {"],
  ["resilience-inference-check-resilience-violations","galerina-core-compiler/src/resilience-inference.ts","export function checkResilienceViolations("],
  ["resilience-inference-fault-handler-violation","galerina-core-compiler/src/resilience-inference.ts","export interface FaultHandlerViolation {"],
  ["resilience-inference-check-fault-handler-violations","galerina-core-compiler/src/resilience-inference.ts","export function checkFaultHandlerViolations("],
  ["route-dispatcher-server-config","galerina-core-compiler/src/route-dispatcher.ts","export interface ServerConfig {"],
  ["route-dispatcher-rate-limiter","galerina-core-compiler/src/route-dispatcher.ts","export class RateLimiter {"],
  ["route-dispatcher-rate-limiter-constructor","galerina-core-compiler/src/route-dispatcher.ts","  constructor("],
  ["route-dispatcher-rate-limiter-is-allowed","galerina-core-compiler/src/route-dispatcher.ts","  isAllowed(ip: string): boolean {"],
  ["route-dispatcher-running-server","galerina-core-compiler/src/route-dispatcher.ts","export interface RunningServer {"],
  ["route-dispatcher-admitted-route-executor","galerina-core-compiler/src/route-dispatcher.ts","export type AdmittedRouteExecutor ="],
  ["route-dispatcher-make-response-value","galerina-core-compiler/src/route-dispatcher.ts","export function makeResponseValue("],
  ["route-dispatcher-make-api-error-value","galerina-core-compiler/src/route-dispatcher.ts","export function makeApiErrorValue("],
  ["route-dispatcher-start-server","galerina-core-compiler/src/route-dispatcher.ts","export async function startServer("],
  ["route-dispatcher-close","galerina-core-compiler/src/route-dispatcher.ts","        close(): Promise<void> {"],
  ["route-dispatcher-hydrate-request","galerina-core-compiler/src/route-dispatcher.ts","function hydrateRequest("],
  ["route-dispatcher-parse-query-string","galerina-core-compiler/src/route-dispatcher.ts","function parseQueryString("],
  ["route-dispatcher-serialize-response","galerina-core-compiler/src/route-dispatcher.ts","function serializeResponse("],
  ["route-dispatcher-serialize-response-value","galerina-core-compiler/src/route-dispatcher.ts","function serializeResponseValue("],
  ["route-dispatcher-serialize-error-value","galerina-core-compiler/src/route-dispatcher.ts","function serializeErrorValue("],
  ["route-dispatcher-galerina-value-to-js","galerina-core-compiler/src/route-dispatcher.ts","function galerinaValueToJs("],
  ["route-dispatcher-concat-bytes","galerina-core-compiler/src/route-dispatcher.ts","function concatBytes("],
  ["route-registry-route-entry","galerina-core-compiler/src/route-registry.ts","export interface RouteEntry {"],
  ["route-registry-route-match","galerina-core-compiler/src/route-registry.ts","export interface RouteMatch {"],
  ["route-registry-route-registry","galerina-core-compiler/src/route-registry.ts","export interface RouteRegistry {"],
  ["route-registry-build-route-registry","galerina-core-compiler/src/route-registry.ts","export function buildRouteRegistry("],
  ["route-registry-walk","galerina-core-compiler/src/route-registry.ts","  function walk("],
  ["route-registry-match","galerina-core-compiler/src/route-registry.ts","    match(method: string, rawPath: string):"],
  ["route-registry-parse-route-entry","galerina-core-compiler/src/route-registry.ts","function parseRouteEntry("]
]);
const camel=stem=>stem.split("-").map((p,i)=>i===0?p:p[0].toUpperCase()+p.slice(1)).join("");
const CANDIDATES=Object.freeze(RAW.map(([stem,source,symbol])=>Object.freeze({file:`${stem}-status.fungi`,flow:`${camel(stem)}StatusCore`,source,symbol,input:args(["sourceReady","shapeReady","stateReady","policyReady","routeReady","proofReady","sealReady"]),expected:string(`${stem.replaceAll("-","_")}_built`)})));
function shadowFingerprint(source){const identifiers=new Map();return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");}
describe("40-file source-bound Fungi decision-core overlay wave 50",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[],scopes=new Set();for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-galerina",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);const scope=`${c.source}#${c.flow}`;assert.equal(scopes.has(scope),false);scopes.add(scope);}});
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{const seen=new Map(),files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const p=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(p),`${c.file} must exist`);const source=readFileSync(p,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);}}assert.deepEqual(collisions,[]);});
  it("parses, effect-checks, emits GIR and executes a deterministic 10-file sample",async()=>{for(const c of CANDIDATES.slice(0,10)){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8"),program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});
