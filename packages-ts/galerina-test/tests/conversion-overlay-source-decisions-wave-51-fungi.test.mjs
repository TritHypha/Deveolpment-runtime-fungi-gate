import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

const ROOT=join(import.meta.dirname,"..","..",".."),PACKAGE_ROOT=join(ROOT,"packages-ts","galerina-test"),OVERLAY_ROOT=join(PACKAGE_ROOT,"src","self-hosted","conversion-overlays"),PACKAGE=join(PACKAGE_ROOT,"package.json");
const bool=value=>({__tag:"bool",value}),string=value=>({__tag:"string",value}),args=names=>new Map(names.map(name=>[name,bool(true)])),RESERVED=new Set(["version","pure","secure","flow","FLOW","contract","intent","record","return","if","match","check","deny","ambig","mut","let","Bool","Int","String","Verdict","Result","Option","Array","true","false","Ok","Err","Some","None","Allow","Deny","Unknown"]);
const RAW=Object.freeze([
  [
    "runtime-runtime-mode",
    "galerina-core-compiler/src/runtime.ts",
    "export type RuntimeMode ="
  ],
  [
    "runtime-runtime-options",
    "galerina-core-compiler/src/runtime.ts",
    "export interface RuntimeOptions {"
  ],
  [
    "runtime-runtime-result",
    "galerina-core-compiler/src/runtime.ts",
    "export interface RuntimeResult {"
  ],
  [
    "runtime-runtime-admission",
    "galerina-core-compiler/src/runtime.ts",
    "interface RuntimeAdmission {"
  ],
  [
    "runtime-decode-runtime-mode",
    "galerina-core-compiler/src/runtime.ts",
    "function decodeRuntimeMode("
  ],
  [
    "runtime-admit-runtime",
    "galerina-core-compiler/src/runtime.ts",
    "function admitRuntime("
  ],
  [
    "runtime-admit-runtime-append-diagnostics",
    "galerina-core-compiler/src/runtime.ts",
    "  const appendDiagnostics = ("
  ],
  [
    "runtime-run",
    "galerina-core-compiler/src/runtime.ts",
    "export async function run("
  ],
  [
    "runtime-run-find-flow-node",
    "galerina-core-compiler/src/runtime.ts",
    "  function findFlowNode("
  ],
  [
    "runtime-serve",
    "galerina-core-compiler/src/runtime.ts",
    "export async function serve("
  ],
  [
    "canonical-hash-sha256hex",
    "galerina-core-compiler/src/runtime/canonicalHash.ts",
    "function sha256hex("
  ],
  [
    "canonical-hash-iso-date-re",
    "galerina-core-compiler/src/runtime/canonicalHash.ts",
    "const ISO_DATE_RE ="
  ],
  [
    "canonical-hash-is-timestamp-string",
    "galerina-core-compiler/src/runtime/canonicalHash.ts",
    "function isTimestampString("
  ],
  [
    "canonical-hash-to-canonical",
    "galerina-core-compiler/src/runtime/canonicalHash.ts",
    "function toCanonical("
  ],
  [
    "canonical-hash-canonical-hash",
    "galerina-core-compiler/src/runtime/canonicalHash.ts",
    "export function canonicalHash("
  ],
  [
    "canonical-hash-timestamp-keys",
    "galerina-core-compiler/src/runtime/canonicalHash.ts",
    "const TIMESTAMP_KEYS ="
  ],
  [
    "canonical-hash-strip-non-deterministic",
    "galerina-core-compiler/src/runtime/canonicalHash.ts",
    "export function stripNonDeterministic("
  ],
  [
    "canonical-hash-hash-source",
    "galerina-core-compiler/src/runtime/canonicalHash.ts",
    "export function hashSource("
  ],
  [
    "canonical-hash-hash-gir",
    "galerina-core-compiler/src/runtime/canonicalHash.ts",
    "export function hashGIR("
  ],
  [
    "canonical-hash-hash-passive-plan",
    "galerina-core-compiler/src/runtime/canonicalHash.ts",
    "export function hashPassivePlan("
  ],
  [
    "capability-host-capability-check-result",
    "galerina-core-compiler/src/runtime/capabilityHost.ts",
    "export interface CapabilityCheckResult {"
  ],
  [
    "capability-host-capability-call",
    "galerina-core-compiler/src/runtime/capabilityHost.ts",
    "export interface CapabilityCall {"
  ],
  [
    "capability-host-capability-result",
    "galerina-core-compiler/src/runtime/capabilityHost.ts",
    "export interface CapabilityResult {"
  ],
  [
    "capability-host-private-prefixes",
    "galerina-core-compiler/src/runtime/capabilityHost.ts",
    "const PRIVATE_PREFIXES ="
  ],
  [
    "capability-host-looks-like-private-ip",
    "galerina-core-compiler/src/runtime/capabilityHost.ts",
    "function looksLikePrivateIp("
  ],
  [
    "capability-host-extract-hostname",
    "galerina-core-compiler/src/runtime/capabilityHost.ts",
    "function extractHostname("
  ],
  [
    "capability-host-flow-call-counters",
    "galerina-core-compiler/src/runtime/capabilityHost.ts",
    "export interface FlowCallCounters {"
  ],
  [
    "capability-host-config",
    "galerina-core-compiler/src/runtime/capabilityHost.ts",
    "export interface CapabilityHostConfig {"
  ],
  [
    "capability-host",
    "galerina-core-compiler/src/runtime/capabilityHost.ts",
    "export interface CapabilityHost {"
  ],
  [
    "capability-host-create",
    "galerina-core-compiler/src/runtime/capabilityHost.ts",
    "export function createCapabilityHost("
  ],
  [
    "capability-host-create-check-network-destination",
    "galerina-core-compiler/src/runtime/capabilityHost.ts",
    "  function checkNetworkDestination("
  ],
  [
    "capability-host-create-track-call-count",
    "galerina-core-compiler/src/runtime/capabilityHost.ts",
    "  function trackCallCount("
  ],
  [
    "capability-host-create-check",
    "galerina-core-compiler/src/runtime/capabilityHost.ts",
    "  function check(call: CapabilityCall):"
  ],
  [
    "capability-host-create-execute",
    "galerina-core-compiler/src/runtime/capabilityHost.ts",
    "  async function execute("
  ],
  [
    "capability-host-create-observed-effects",
    "galerina-core-compiler/src/runtime/capabilityHost.ts",
    "    get observedEffects():"
  ],
  [
    "capability-host-create-call-counters",
    "galerina-core-compiler/src/runtime/capabilityHost.ts",
    "    get callCounters():"
  ],
  [
    "contract-enforcer-compiled-contract",
    "galerina-core-compiler/src/runtime/contractEnforcer.ts",
    "export interface CompiledContract {"
  ],
  [
    "contract-enforcer-compile-contract",
    "galerina-core-compiler/src/runtime/contractEnforcer.ts",
    "export function compileContract("
  ],
  [
    "contract-enforcer-contract-enforcer",
    "galerina-core-compiler/src/runtime/contractEnforcer.ts",
    "export interface ContractEnforcer {"
  ],
  [
    "contract-enforcer-create-contract-enforcer",
    "galerina-core-compiler/src/runtime/contractEnforcer.ts",
    "export function createContractEnforcer("
  ]
]);
const camel=stem=>stem.split("-").map((p,i)=>i===0?p:p[0].toUpperCase()+p.slice(1)).join("");
const CANDIDATES=Object.freeze(RAW.map(([stem,source,symbol])=>Object.freeze({file:`${stem}-status.fungi`,flow:`${camel(stem)}StatusCore`,source,symbol,input:args(["sourceReady","shapeReady","stateReady","policyReady","routeReady","proofReady","sealReady"]),expected:string(`${stem.replaceAll("-","_")}_built`)})));
function shadowFingerprint(source){const identifiers=new Map();return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");}
describe("40-file source-bound Fungi decision-core overlay wave 51",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[],scopes=new Set();for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-ts",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);const scope=`${c.source}#${c.symbol}`;assert.equal(scopes.has(scope),false);scopes.add(scope);}});
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{const seen=new Map(),files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const p=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(p),`${c.file} must exist`);const source=readFileSync(p,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);}}assert.deepEqual(collisions,[]);});
  it("parses, effect-checks, emits GIR and executes a deterministic 10-file sample",async()=>{for(const c of CANDIDATES.slice(0,10)){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8"),program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});
