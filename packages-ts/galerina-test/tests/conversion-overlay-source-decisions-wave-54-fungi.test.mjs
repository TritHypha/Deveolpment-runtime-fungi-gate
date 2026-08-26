import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

const ROOT=join(import.meta.dirname,"..","..",".."),PACKAGE_ROOT=join(ROOT,"packages-ts","galerina-test"),OVERLAY_ROOT=join(PACKAGE_ROOT,"src","self-hosted","conversion-overlays"),PACKAGE=join(PACKAGE_ROOT,"package.json");
const bool=value=>({__tag:"bool",value}),string=value=>({__tag:"string",value}),args=names=>new Map(names.map(name=>[name,bool(true)])),RESERVED=new Set(["version","pure","secure","flow","FLOW","contract","intent","record","return","if","match","check","deny","ambig","mut","let","Bool","Int","String","Verdict","Result","Option","Array","true","false","Ok","Err","Some","None","Allow","Deny","Unknown"]);
const RAW=Object.freeze([
  ["root-capability-provider-capability-domain","galerina-core-compiler/src/runtime/rootCapabilityProvider.ts","export type CapabilityDomain ="],
  ["root-capability-provider-compiler-capability-host","galerina-core-compiler/src/runtime/rootCapabilityProvider.ts","export interface CompilerCapabilityHost {"],
  ["root-capability-provider-user-runtime-capabilities","galerina-core-compiler/src/runtime/rootCapabilityProvider.ts","export interface UserRuntimeCapabilities {"],
  ["root-capability-provider-audit-log-entry","galerina-core-compiler/src/runtime/rootCapabilityProvider.ts","export interface AuditLogEntry {"],
  ["root-capability-provider-root-capability-provider","galerina-core-compiler/src/runtime/rootCapabilityProvider.ts","export interface RootCapabilityProvider {"],
  ["root-capability-provider-compiler-minimum-capabilities","galerina-core-compiler/src/runtime/rootCapabilityProvider.ts","export const COMPILER_MINIMUM_CAPABILITIES"],
  ["root-capability-provider-create-root-capability-provider","galerina-core-compiler/src/runtime/rootCapabilityProvider.ts","export function createRootCapabilityProvider()"],
  ["root-capability-provider-create-root-capability-provider-audit","galerina-core-compiler/src/runtime/rootCapabilityProvider.ts","  function audit("],
  ["root-capability-provider-create-root-capability-provider-create-compiler-host","galerina-core-compiler/src/runtime/rootCapabilityProvider.ts","  function createCompilerHost("],
  ["root-capability-provider-create-root-capability-provider-check","galerina-core-compiler/src/runtime/rootCapabilityProvider.ts","      check(capability: string): boolean {"],
  ["root-capability-provider-create-root-capability-provider-use","galerina-core-compiler/src/runtime/rootCapabilityProvider.ts","      use(capability: string, resource: string): void {"],
  ["root-capability-provider-create-root-capability-provider-create-user-runtime","galerina-core-compiler/src/runtime/rootCapabilityProvider.ts","  function createUserRuntime("],
  ["root-capability-provider-create-root-capability-provider-can-use","galerina-core-compiler/src/runtime/rootCapabilityProvider.ts","      canUse(effect: string): boolean {"],
  ["root-capability-provider-create-root-capability-provider-get-audit-log","galerina-core-compiler/src/runtime/rootCapabilityProvider.ts","    getAuditLog(): readonly AuditLogEntry[] {"],
  ["runtime-context-runtime-context","galerina-core-compiler/src/runtime/runtimeContext.ts","export interface RuntimeContext {"],
  ["runtime-context-create-context","galerina-core-compiler/src/runtime/runtimeContext.ts","export function createContext("],
  ["runtime-context-is-expired","galerina-core-compiler/src/runtime/runtimeContext.ts","export function isExpired("],
  ["runtime-context-remaining-ms","galerina-core-compiler/src/runtime/runtimeContext.ts","export function remainingMs("],
  ["runtime-context-verify-runtime-manifest-hash","galerina-core-compiler/src/runtime/runtimeContext.ts","export function verifyRuntimeManifestHash("],
  ["runtime-report-contract-enforcement-record","galerina-core-compiler/src/runtime/runtimeReport.ts","export interface ContractEnforcementRecord {"],
  ["runtime-report-create-enforcement-record","galerina-core-compiler/src/runtime/runtimeReport.ts","export function createEnforcementRecord("],
  ["runtime-report-record-retry-attempt","galerina-core-compiler/src/runtime/runtimeReport.ts","export function recordRetryAttempt("],
  ["runtime-report-record-limit-violation","galerina-core-compiler/src/runtime/runtimeReport.ts","export function recordLimitViolation("],
  ["runtime-report-format-enforcement-record","galerina-core-compiler/src/runtime/runtimeReport.ts","export function formatEnforcementRecord("],
  ["runtime-report-format-violation-message","galerina-core-compiler/src/runtime/runtimeReport.ts","function formatViolationMessage("],
  ["runtime-report-apply-violation-to-limits","galerina-core-compiler/src/runtime/runtimeReport.ts","function applyViolationToLimits("],
  ["runtime-report-format-limits","galerina-core-compiler/src/runtime/runtimeReport.ts","function formatLimits("],
  ["timeout-policy-timeout-config","galerina-core-compiler/src/runtime/timeoutPolicy.ts","export interface TimeoutConfig {"],
  ["timeout-policy-default-timeout-config","galerina-core-compiler/src/runtime/timeoutPolicy.ts","const DEFAULT_TIMEOUT_CONFIG"],
  ["timeout-policy-parse-timeout-config","galerina-core-compiler/src/runtime/timeoutPolicy.ts","export function parseTimeoutConfig("],
  ["timeout-policy-check-deadline","galerina-core-compiler/src/runtime/timeoutPolicy.ts","export function checkDeadline("],
  ["timeout-policy-find-contract-section","galerina-core-compiler/src/runtime/timeoutPolicy.ts","function findContractSection("],
  ["timeout-policy-parse-time-value","galerina-core-compiler/src/runtime/timeoutPolicy.ts","function parseTimeValue("],
  ["timeout-policy-to-ms","galerina-core-compiler/src/runtime/timeoutPolicy.ts","function toMs("],
  ["sbom-sbom-sha256-re","galerina-core-compiler/src/sbom.ts","const SBOM_SHA256_RE"],
  ["sbom-sbom-diagnostic","galerina-core-compiler/src/sbom.ts","export interface SbomDiagnostic {"],
  ["sbom-sbom-result","galerina-core-compiler/src/sbom.ts","export interface SbomResult {"],
  ["sbom-sbom-options","galerina-core-compiler/src/sbom.ts","export interface SbomOptions {"],
  ["sbom-props","galerina-core-compiler/src/sbom.ts","function props("],
  ["sbom-generate-cyclone-dx-sbom","galerina-core-compiler/src/sbom.ts","export function generateCycloneDxSbom("],
]);
const CANDIDATES=Object.freeze(RAW.map(([stem,source,symbol],index)=>Object.freeze({file:`${stem}-status.fungi`,flow:`wave54Item${String(index+1).padStart(2,"0")}StatusCore`,source,symbol,input:args(["sourceReady","shapeReady","stateReady","policyReady","routeReady","proofReady","sealReady"]),expected:string(`${stem.replaceAll("-","_")}_built`)})));
function shadowFingerprint(source){const identifiers=new Map();return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");}
describe("40-file source-bound Fungi decision-core overlay wave 54",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[],scopes=new Set();for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-ts",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);const scope=`${c.source}#${c.symbol}`;assert.equal(scopes.has(scope),false);scopes.add(scope);}});
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{const seen=new Map(),files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const p=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(p),`${c.file} must exist`);const source=readFileSync(p,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);}}assert.deepEqual(collisions,[]);});
  it("parses, effect-checks, emits GIR and executes a deterministic 10-file sample",async()=>{for(const c of CANDIDATES.slice(0,10)){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8"),program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});
