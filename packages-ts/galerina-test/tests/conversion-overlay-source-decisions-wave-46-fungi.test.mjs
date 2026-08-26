import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

const ROOT=join(import.meta.dirname,"..","..",".."),PACKAGE_ROOT=join(ROOT,"packages-ts","galerina-test"),OVERLAY_ROOT=join(PACKAGE_ROOT,"src","self-hosted","conversion-overlays"),PACKAGE=join(PACKAGE_ROOT,"package.json");
const bool=value=>({__tag:"bool",value}),string=value=>({__tag:"string",value}),args=names=>new Map(names.map(name=>[name,bool(true)])),RESERVED=new Set(["version","pure","secure","flow","FLOW","contract","intent","record","return","if","match","check","deny","ambig","mut","let","Bool","Int","String","Verdict","Result","Option","Array","true","false","Ok","Err","Some","None","Allow","Deny","Unknown"]);
const RAW=Object.freeze([
  ["parser-parse-enum-decl","galerina-core-compiler/src/parser.ts","  private parseEnumDecl(): AstNode {"],
  ["parser-emit","galerina-core-compiler/src/parser.ts","  private emit("],
  ["parser-emit-warning","galerina-core-compiler/src/parser.ts","  private emitWarning("],
  ["parser-emit-unexpected","galerina-core-compiler/src/parser.ts","  private emitUnexpected("],
  ["parser-current","galerina-core-compiler/src/parser.ts","  private current(): Token {"],
  ["parser-peek","galerina-core-compiler/src/parser.ts","  private peek(offset: number): Token {"],
  ["parser-advance","galerina-core-compiler/src/parser.ts","  private advance(): Token {"],
  ["parser-is-eof","galerina-core-compiler/src/parser.ts","  private isEof(): boolean {"],
  ["parser-current-is","galerina-core-compiler/src/parser.ts","  private currentIs(kind: Token[\"kind\"], value: string): boolean {"],
  ["parser-current-is-one-of","galerina-core-compiler/src/parser.ts","  private currentIsOneOf(kind: Token[\"kind\"], values: string[]): boolean {"],
  ["parser-skip-newlines","galerina-core-compiler/src/parser.ts","  private skipNewlines(): void {"],
  ["parser-recover-to-statement","galerina-core-compiler/src/parser.ts","  private recoverToStatement(): void {"],
  ["parser-recover-to-block","galerina-core-compiler/src/parser.ts","  private recoverToBlock(): void {"],
  ["parser-recover-to-contract-section","galerina-core-compiler/src/parser.ts","  private recoverToContractSection(): void {"],
  ["parser-skip-to-next-declaration","galerina-core-compiler/src/parser.ts","  private skipToNextDeclaration(): void {"],
  ["parser-skip-top-level-statement","galerina-core-compiler/src/parser.ts","  private skipTopLevelStatement(): void {"],
  ["parser-loc","galerina-core-compiler/src/parser.ts","  private loc(): SourceLocation {"],
  ["parser-expect","galerina-core-compiler/src/parser.ts","  private expect(kind: Token[\"kind\"], value?: string): Token | undefined {"],
  ["parser-parse-program-api","galerina-core-compiler/src/parser.ts","export function parseProgram("],
  ["plugin-schema-plugin-manifest","galerina-core-compiler/src/plugin-schema.ts","export interface PluginManifest {"],
  ["plugin-schema-plugin-data-schema","galerina-core-compiler/src/plugin-schema.ts","export interface PluginDataSchema {"],
  ["plugin-schema-plugin-field","galerina-core-compiler/src/plugin-schema.ts","export interface PluginField {"],
  ["plugin-schema-validate-plugin-input","galerina-core-compiler/src/plugin-schema.ts","export function validatePluginInput("],
  ["plugin-schema-plugin-schema-violation","galerina-core-compiler/src/plugin-schema.ts","export interface PluginSchemaViolation {"],
  ["plugin-schema-infer-type","galerina-core-compiler/src/plugin-schema.ts","function inferType(value: unknown): string {"],
  ["plugin-schema-is-compatible-type","galerina-core-compiler/src/plugin-schema.ts","function isCompatibleType(actual: string, expected: string): boolean {"],
  ["plugin-schema-compute-compliance-hash","galerina-core-compiler/src/plugin-schema.ts","export function computeComplianceHash("],
  ["plugin-schema-hard-erase","galerina-core-compiler/src/plugin-schema.ts","export function hardErase(executionId: string): ErasureReceipt {"],
  ["plugin-schema-erasure-receipt","galerina-core-compiler/src/plugin-schema.ts","export interface ErasureReceipt {"],
  ["production-check-diagnostic-like","galerina-core-compiler/src/production-check.ts","interface DiagnosticLike {"],
  ["production-check-production-blockers","galerina-core-compiler/src/production-check.ts","const PRODUCTION_BLOCKERS: ReadonlySet<string> = new Set(["],
  ["production-check-check-production-readiness","galerina-core-compiler/src/production-check.ts","export function checkProductionReadiness("],
  ["profile-checker-profile-diagnostic","galerina-core-compiler/src/profile-checker.ts","export interface ProfileDiagnostic {"],
  ["profile-checker-fungi-profile-001","galerina-core-compiler/src/profile-checker.ts","export const FUNGI_PROFILE_001 = {"],
  ["profile-checker-fungi-profile-002","galerina-core-compiler/src/profile-checker.ts","export const FUNGI_PROFILE_002 = {"],
  ["profile-checker-fungi-profile-003","galerina-core-compiler/src/profile-checker.ts","export const FUNGI_PROFILE_003 = {"],
  ["profile-checker-fungi-profile-004","galerina-core-compiler/src/profile-checker.ts","export const FUNGI_PROFILE_004 = {"],
  ["profile-checker-fungi-profile-005","galerina-core-compiler/src/profile-checker.ts","export const FUNGI_PROFILE_005 = {"],
  ["profile-checker-fungi-profile-005b","galerina-core-compiler/src/profile-checker.ts","export const FUNGI_PROFILE_005B = {"],
  ["profile-checker-fungi-profile-006","galerina-core-compiler/src/profile-checker.ts","export const FUNGI_PROFILE_006 = {"],
]);
const camel=stem=>stem.split("-").map((p,i)=>i===0?p:p[0].toUpperCase()+p.slice(1)).join("");
const CANDIDATES=Object.freeze(RAW.map(([stem,source,symbol])=>Object.freeze({file:`${stem}-status.fungi`,flow:`${camel(stem)}StatusCore`,source,symbol,input:args(["sourceReady","shapeReady","stateReady","policyReady","routeReady","proofReady","sealReady"]),expected:string(`${stem.replaceAll("-","_")}_built`)})));
function shadowFingerprint(source){const identifiers=new Map();return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");}
describe("40-file source-bound Fungi decision-core overlay wave 46",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[],scopes=new Set();for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-ts",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);const scope=`${c.source}#${c.flow}`;assert.equal(scopes.has(scope),false);scopes.add(scope);}});
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{const seen=new Map(),files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const p=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(p),`${c.file} must exist`);const source=readFileSync(p,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);} }assert.deepEqual(collisions,[]);});
  it("parses, effect-checks, emits GIR and executes every decision core",async()=>{for(const c of CANDIDATES){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8"),program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});
