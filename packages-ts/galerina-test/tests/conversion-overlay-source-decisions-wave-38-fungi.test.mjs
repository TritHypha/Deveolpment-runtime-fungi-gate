import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

const ROOT=join(import.meta.dirname,"..","..",".."),PACKAGE_ROOT=join(ROOT,"packages-ts","galerina-test"),OVERLAY_ROOT=join(PACKAGE_ROOT,"src","self-hosted","conversion-overlays"),PACKAGE=join(PACKAGE_ROOT,"package.json"),SOURCE="galerina-core-compiler/src/interpreter.ts";
const bool=value=>({__tag:"bool",value}),string=value=>({__tag:"string",value}),args=names=>new Map(names.map(name=>[name,bool(true)]));
const RESERVED=new Set(["version","pure","secure","flow","FLOW","contract","intent","record","return","if","match","check","deny","ambig","mut","let","Bool","Int","String","Verdict","Result","Option","Array","true","false","Ok","Err","Some","None","Allow","Deny","Unknown"]);
const RAW=Object.freeze([
  ["interpreter-check-output-postconditions","private async checkOutputPostconditions("],
  ["interpreter-push-scope","private pushScope(): void"],
  ["interpreter-pop-scope","private popScope(): void"],
  ["interpreter-lookup","private lookup("],
  ["interpreter-declare","private declare("],
  ["interpreter-assign","private assign("],
  ["interpreter-execute-block","private async executeBlock("],
  ["interpreter-eval-binding-init","private async evalBindingInit("],
  ["interpreter-eval-expr-as-int64","private async evalExprAsInt64("],
  ["interpreter-eval-expr-as-uint64","private async evalExprAsUInt64("],
  ["interpreter-execute-statement","private async executeStatement("],
  ["interpreter-eval-expr","private async evalExpr("],
  ["interpreter-eval-binary","private async evalBinary("],
  ["interpreter-eval-call","private async evalCall("],
  ["interpreter-eval-method-call","private evalMethodCall("],
  ["interpreter-eval-match","private async evalMatch("],
  ["interpreter-eval-member","private async evalMember("],
  ["interpreter-get-receiver-name","private getReceiverName("],
  ["interpreter-seed-prelude","private seedPrelude(): void"],
  ["interpreter-run-local-fn","private async runLocalFn("],
  ["interpreter-run-nested-flow","private async runNestedFlow("],
  ["interpreter-enrich-audit-entry-with-manifest","private enrichAuditEntryWithManifest("],
  ["interpreter-build-audit-entry","private async buildAuditEntry("],
  ["interpreter-build-flow-index","function buildFlowIndex("],
  ["interpreter-build-flow-index-walk","function walk(node: AstNode): void"],
  ["interpreter-match-pattern","function matchPattern("],
  ["interpreter-safe-display","function safeDisplay("],
  ["interpreter-safe-stringify","function safeStringify("],
  ["interpreter-extract-param-name","function extractParamName("],
  ["interpreter-parse-binding-value","function parseBindingValue("],
  ["interpreter-binding-type-name","function bindingTypeName("],
  ["interpreter-binding-base-type","function bindingBaseType("],
  ["interpreter-tag-governed-value","function tagGovernedValue("],
  ["interpreter-wrap-governed-value","function wrapGovernedValue("],
  ["interpreter-get-receiver","function getReceiver("],
  ["interpreter-secure-comparable","function secureComparable("],
  ["interpreter-qualifier-from-flow-kind","function qualifierFromFlowKind("],
  ["interpreter-is-runtime-error","function isRuntimeError("],
  ["interpreter-is-checked-trap","function isCheckedTrap("],
  ["interpreter-strip-string-quotes","function stripStringQuotes("],
]);
const camel=stem=>stem.split("-").map((part,index)=>index===0?part:part[0].toUpperCase()+part.slice(1)).join("");
const CANDIDATES=Object.freeze(RAW.map(([stem,symbol])=>Object.freeze({file:`${stem}-status.fungi`,flow:`${camel(stem)}StatusCore`,source:SOURCE,symbol,input:args(["inputCaptured","stateChecked","decisionBuilt","evidenceBound","outcomeSealed","releaseChecked"]),expected:string(`${stem.replaceAll("-","_")}_built`)})));

function shadowFingerprint(source){const identifiers=new Map();return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");}

describe("40-file source-bound Fungi decision-core overlay wave 38",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[],scopes=new Set();for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-ts",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);const scope=`${c.source}#${c.flow}`;assert.equal(scopes.has(scope),false);scopes.add(scope);}});
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{const seen=new Map(),files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const p=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(p),`${c.file} must exist`);const source=readFileSync(p,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);}}assert.deepEqual(collisions,[]);});
  it("parses, effect-checks, emits GIR and executes every decision core",async()=>{for(const c of CANDIDATES){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8"),program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});
