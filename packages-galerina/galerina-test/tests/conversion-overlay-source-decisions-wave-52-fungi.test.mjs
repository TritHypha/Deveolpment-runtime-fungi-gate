import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

const ROOT=join(import.meta.dirname,"..","..",".."),PACKAGE_ROOT=join(ROOT,"packages-galerina","galerina-test"),OVERLAY_ROOT=join(PACKAGE_ROOT,"src","self-hosted","conversion-overlays"),PACKAGE=join(PACKAGE_ROOT,"package.json");
const bool=value=>({__tag:"bool",value}),string=value=>({__tag:"string",value}),args=names=>new Map(names.map(name=>[name,bool(true)])),RESERVED=new Set(["version","pure","secure","flow","FLOW","contract","intent","record","return","if","match","check","deny","ambig","mut","let","Bool","Int","String","Verdict","Result","Option","Array","true","false","Ok","Err","Some","None","Allow","Deny","Unknown"]);
const RAW=Object.freeze([
  ["contract-enforcer-context","galerina-core-compiler/src/runtime/contractEnforcer.ts","    get context() {"],
  ["contract-enforcer-enforcement-record","galerina-core-compiler/src/runtime/contractEnforcer.ts","    get enforcementRecord() {"],
  ["contract-enforcer-check-request-size","galerina-core-compiler/src/runtime/contractEnforcer.ts","    checkRequestSize(bytes: number): void {"],
  ["contract-enforcer-check-batch-size","galerina-core-compiler/src/runtime/contractEnforcer.ts","    checkBatchSize(count: number): void {"],
  ["contract-enforcer-check-result-count","galerina-core-compiler/src/runtime/contractEnforcer.ts","    checkResultCount(count: number): void {"],
  ["contract-enforcer-check-query-length","galerina-core-compiler/src/runtime/contractEnforcer.ts","    checkQueryLength(chars: number): void {"],
  ["contract-enforcer-check-amount","galerina-core-compiler/src/runtime/contractEnforcer.ts","    checkAmount(amount: number): void {"],
  ["contract-enforcer-check-concurrent-tasks","galerina-core-compiler/src/runtime/contractEnforcer.ts","    checkConcurrentTasks(current: number): void {"],
  ["contract-enforcer-check-rate","galerina-core-compiler/src/runtime/contractEnforcer.ts","    checkRate(observedInWindow: number): void {"],
  ["contract-enforcer-check-deadline","galerina-core-compiler/src/runtime/contractEnforcer.ts","    checkDeadline(): void {"],
  ["contract-enforcer-with-retry","galerina-core-compiler/src/runtime/contractEnforcer.ts","    async withRetry<T>(effectName: string, fn: () => Promise<T>): Promise<T> {"],
  ["contract-enforcer-record-retry","galerina-core-compiler/src/runtime/contractEnforcer.ts","    recordRetry(effectName: string, attempt: number, max: number): void {"],
  ["execution-plan-validate-context-step","galerina-core-compiler/src/runtime/executionPlan.ts","export interface ValidateContextStep {"],
  ["execution-plan-validate-param-step","galerina-core-compiler/src/runtime/executionPlan.ts","export interface ValidateParamStep {"],
  ["execution-plan-capability-call-step","galerina-core-compiler/src/runtime/executionPlan.ts","export interface CapabilityCallStep {"],
  ["execution-plan-response-step","galerina-core-compiler/src/runtime/executionPlan.ts","export interface ResponseStep {"],
  ["execution-plan-emit-event-step","galerina-core-compiler/src/runtime/executionPlan.ts","export interface EmitEventStep {"],
  ["execution-plan-return-step","galerina-core-compiler/src/runtime/executionPlan.ts","export interface ReturnStep {"],
  ["execution-plan-execution-step","galerina-core-compiler/src/runtime/executionPlan.ts","export type ExecutionStep ="],
  ["execution-plan-approved-capability","galerina-core-compiler/src/runtime/executionPlan.ts","export interface ApprovedCapability {"],
  ["execution-plan-passive-execution-plan","galerina-core-compiler/src/runtime/executionPlan.ts","export interface PassiveExecutionPlan {"],
  ["execution-plan-default-max-age-ms","galerina-core-compiler/src/runtime/executionPlan.ts","export const PLAN_DEFAULT_MAX_AGE_MS ="],
  ["execution-plan-sha256hex","galerina-core-compiler/src/runtime/executionPlan.ts","function sha256hex(text: string): string {"],
  ["execution-plan-collect-emit-events","galerina-core-compiler/src/runtime/executionPlan.ts","function collectEmitEvents(node: AstNode): string[] {"],
  ["execution-plan-collect-emit-events-walk","galerina-core-compiler/src/runtime/executionPlan.ts","  function walk(n: AstNode): void {"],
  ["execution-plan-find-flow-node","galerina-core-compiler/src/runtime/executionPlan.ts","function findFlowNode(ast: AstNode, name: string): AstNode | undefined {"],
  ["execution-plan-find-flow-node-walk","galerina-core-compiler/src/runtime/executionPlan.ts","  function walk(node: AstNode): AstNode | undefined {"],
  ["execution-plan-extract-context-require-fields","galerina-core-compiler/src/runtime/executionPlan.ts","function extractContextRequireFields(contractNode: AstNode): string[] {"],
  ["execution-plan-extract-unsafe-params","galerina-core-compiler/src/runtime/executionPlan.ts","function extractUnsafeParams(meta: FlowMeta): Array<{ name: string; type: string }> {"],
  ["execution-plan-build-execution-plan","galerina-core-compiler/src/runtime/executionPlan.ts","export function buildExecutionPlan("],
  ["execution-plan-plan-admission-result","galerina-core-compiler/src/runtime/executionPlan.ts","export interface PlanAdmissionResult {"],
  ["execution-plan-verify-plan-freshness","galerina-core-compiler/src/runtime/executionPlan.ts","export function verifyPlanFreshness("],
  ["execution-plan-verify-plan-admission","galerina-core-compiler/src/runtime/executionPlan.ts","export function verifyPlanAdmission("],
  ["execution-plan-pure-plan-result","galerina-core-compiler/src/runtime/executionPlan.ts","export interface PurePlanResult {"],
  ["execution-plan-execute-plan","galerina-core-compiler/src/runtime/executionPlan.ts","export async function executePlan("],
  ["governed-memory-governed-value-tag","galerina-core-compiler/src/runtime/governedMemory.ts","export type GovernedValueTag = {"],
  ["governed-memory-governed-memory","galerina-core-compiler/src/runtime/governedMemory.ts","export interface GovernedMemory {"],
  ["governed-memory-create-governed-memory","galerina-core-compiler/src/runtime/governedMemory.ts","export function createGovernedMemory(): GovernedMemory {"],
  ["governed-memory-create-governed-memory-register","galerina-core-compiler/src/runtime/governedMemory.ts","  function register("],
  ["governed-memory-create-governed-memory-access","galerina-core-compiler/src/runtime/governedMemory.ts","  function access(id: string, accessorFlow: string): void {"]
]);
const camel=stem=>stem.split("-").map((p,i)=>i===0?p:p[0].toUpperCase()+p.slice(1)).join("");
const CANDIDATES=Object.freeze(RAW.map(([stem,source,symbol])=>Object.freeze({file:`${stem}-status.fungi`,flow:`${camel(stem)}StatusCore`,source,symbol,input:args(["sourceReady","shapeReady","stateReady","policyReady","routeReady","proofReady","sealReady"]),expected:string(`${stem.replaceAll("-","_")}_built`)})));
function shadowFingerprint(source){const identifiers=new Map();return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");}
describe("40-file source-bound Fungi decision-core overlay wave 52",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[],scopes=new Set();for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-galerina",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);const scope=`${c.source}#${c.symbol}`;assert.equal(scopes.has(scope),false);scopes.add(scope);}});
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{const seen=new Map(),files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const p=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(p),`${c.file} must exist`);const source=readFileSync(p,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);}}assert.deepEqual(collisions,[]);});
  it("parses, effect-checks, emits GIR and executes a deterministic 10-file sample",async()=>{for(const c of CANDIDATES.slice(0,10)){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8"),program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});
