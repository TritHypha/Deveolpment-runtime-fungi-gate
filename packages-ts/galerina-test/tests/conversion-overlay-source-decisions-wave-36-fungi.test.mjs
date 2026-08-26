import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

const ROOT=join(import.meta.dirname,"..","..",".."),PACKAGE_ROOT=join(ROOT,"packages-ts","galerina-test"),OVERLAY_ROOT=join(PACKAGE_ROOT,"src","self-hosted","conversion-overlays"),PACKAGE=join(PACKAGE_ROOT,"package.json");
const bool=value=>({__tag:"bool",value}),string=value=>({__tag:"string",value}),args=names=>new Map(names.map(name=>[name,bool(true)]));
const RESERVED=new Set(["version","pure","secure","flow","FLOW","contract","intent","record","return","if","match","check","deny","ambig","mut","let","Bool","Int","String","Verdict","Result","Option","Array","true","false","Ok","Err","Some","None","Allow","Deny","Unknown"]);
const CANDIDATES=Object.freeze([
  ["hardening-residency-discharge-trust-status.fungi","hardeningResidencyDischargeTrustStatusCore","galerina-core-compiler/src/hardening-residency.ts","export function dischargeTrust(","hardening_residency_discharge_trust_built"],
  ["hardening-residency-boundary-trusted-status.fungi","hardeningResidencyBoundaryTrustedStatusCore","galerina-core-compiler/src/hardening-residency.ts","export function boundaryTrusted(","hardening_residency_boundary_trusted_built"],
  ["hardening-residency-spill-retype-status.fungi","hardeningResidencySpillRetypeStatusCore","galerina-core-compiler/src/hardening-residency.ts","export function spillRetype(","hardening_residency_spill_retype_built"],
  ["hardening-residency-show-derived-status.fungi","hardeningResidencyShowDerivedStatusCore","galerina-core-compiler/src/hardening-residency.ts","export function showDerived(","hardening_residency_show_derived_built"],
  ["hardening-residency-canonicalize-status.fungi","hardeningResidencyCanonicalizeStatusCore","galerina-core-compiler/src/hardening-residency.ts","export function canonicalize(","hardening_residency_canonicalize_built"],
  ["hardening-residency-fingerprint-status.fungi","hardeningResidencyFingerprintStatusCore","galerina-core-compiler/src/hardening-residency.ts","export function fingerprint(","hardening_residency_fingerprint_built"],
  ["i32-arith-is-i32-trap-status.fungi","i32ArithIsI32TrapStatusCore","galerina-core-compiler/src/i32-arith.ts","export function isI32Trap(","i32_arith_is_i32_trap_built"],
  ["i32-arith-add-checked-status.fungi","i32ArithAddCheckedStatusCore","galerina-core-compiler/src/i32-arith.ts","export function i32AddChecked(","i32_arith_add_checked_built"],
  ["i32-arith-sub-checked-status.fungi","i32ArithSubCheckedStatusCore","galerina-core-compiler/src/i32-arith.ts","export function i32SubChecked(","i32_arith_sub_checked_built"],
  ["i32-arith-mul-checked-status.fungi","i32ArithMulCheckedStatusCore","galerina-core-compiler/src/i32-arith.ts","export function i32MulChecked(","i32_arith_mul_checked_built"],
  ["i32-arith-div-checked-status.fungi","i32ArithDivCheckedStatusCore","galerina-core-compiler/src/i32-arith.ts","export function i32DivChecked(","i32_arith_div_checked_built"],
  ["i32-arith-mod-checked-status.fungi","i32ArithModCheckedStatusCore","galerina-core-compiler/src/i32-arith.ts","export function i32ModChecked(","i32_arith_mod_checked_built"],
  ["i32-arith-neg-checked-status.fungi","i32ArithNegCheckedStatusCore","galerina-core-compiler/src/i32-arith.ts","export function i32NegChecked(","i32_arith_neg_checked_built"],
  ["i64-arith-is-i64-trap-status.fungi","i64ArithIsI64TrapStatusCore","galerina-core-compiler/src/i64-arith.ts","export function isI64Trap(","i64_arith_is_i64_trap_built"],
  ["i64-arith-range-or-trap-status.fungi","i64ArithRangeOrTrapStatusCore","galerina-core-compiler/src/i64-arith.ts","function rangeOrTrap(","i64_arith_range_or_trap_built"],
  ["i64-arith-add-checked-status.fungi","i64ArithAddCheckedStatusCore","galerina-core-compiler/src/i64-arith.ts","export function i64AddChecked(","i64_arith_add_checked_built"],
  ["i64-arith-sub-checked-status.fungi","i64ArithSubCheckedStatusCore","galerina-core-compiler/src/i64-arith.ts","export function i64SubChecked(","i64_arith_sub_checked_built"],
  ["i64-arith-mul-checked-status.fungi","i64ArithMulCheckedStatusCore","galerina-core-compiler/src/i64-arith.ts","export function i64MulChecked(","i64_arith_mul_checked_built"],
  ["i64-arith-div-checked-status.fungi","i64ArithDivCheckedStatusCore","galerina-core-compiler/src/i64-arith.ts","export function i64DivChecked(","i64_arith_div_checked_built"],
  ["i64-arith-mod-checked-status.fungi","i64ArithModCheckedStatusCore","galerina-core-compiler/src/i64-arith.ts","export function i64ModChecked(","i64_arith_mod_checked_built"],
  ["i64-arith-neg-checked-status.fungi","i64ArithNegCheckedStatusCore","galerina-core-compiler/src/i64-arith.ts","export function i64NegChecked(","i64_arith_neg_checked_built"],
  ["import-resolver-parse-import-value-status.fungi","importResolverParseImportValueStatusCore","galerina-core-compiler/src/import-resolver.ts","function parseImportValue(","import_resolver_parse_import_value_built"],
  ["import-resolver-manifest-cache-key-status.fungi","importResolverManifestCacheKeyStatusCore","galerina-core-compiler/src/import-resolver.ts","function manifestCacheKey(","import_resolver_manifest_cache_key_built"],
  ["import-resolver-reset-manifest-type-cache-for-test-status.fungi","importResolverResetManifestTypeCacheForTestStatusCore","galerina-core-compiler/src/import-resolver.ts","export function __resetManifestTypeCacheForTest(","import_resolver_reset_manifest_type_cache_for_test_built"],
  ["import-resolver-load-external-manifest-types-status.fungi","importResolverLoadExternalManifestTypesStatusCore","galerina-core-compiler/src/import-resolver.ts","function loadExternalManifestTypes(","import_resolver_load_external_manifest_types_built"],
  ["import-resolver-resolve-symbol-status.fungi","importResolverResolveSymbolStatusCore","galerina-core-compiler/src/import-resolver.ts","function resolveSymbol(","import_resolver_resolve_symbol_built"],
  ["import-resolver-resolve-imports-status.fungi","importResolverResolveImportsStatusCore","galerina-core-compiler/src/import-resolver.ts","export function resolveImports(","import_resolver_resolve_imports_built"],
  ["interpreter-int-val-status.fungi","interpreterIntValStatusCore","galerina-core-compiler/src/interpreter.ts","function intVal(","interpreter_int_val_built"],
  ["interpreter-i32-r-status.fungi","interpreterI32RStatusCore","galerina-core-compiler/src/interpreter.ts","function i32R(","interpreter_i32_r_built"],
  ["interpreter-i64-r-status.fungi","interpreterI64RStatusCore","galerina-core-compiler/src/interpreter.ts","function i64R(","interpreter_i64_r_built"],
  ["interpreter-u64-r-status.fungi","interpreterU64RStatusCore","galerina-core-compiler/src/interpreter.ts","function u64R(","interpreter_u64_r_built"],
  ["interpreter-decimal-r-status.fungi","interpreterDecimalRStatusCore","galerina-core-compiler/src/interpreter.ts","function decimalR(","interpreter_decimal_r_built"],
  ["interpreter-dec-div-r-status.fungi","interpreterDecDivRStatusCore","galerina-core-compiler/src/interpreter.ts","function decDivR(","interpreter_dec_div_r_built"],
  ["interpreter-to-decimal-string-status.fungi","interpreterToDecimalStringStatusCore","galerina-core-compiler/src/interpreter.ts","function toDecimalString(","interpreter_to_decimal_string_built"],
  ["interpreter-dec-cmp-status.fungi","interpreterDecCmpStatusCore","galerina-core-compiler/src/interpreter.ts","function decCmp(","interpreter_dec_cmp_built"],
  ["interpreter-literal-i64-from-node-status.fungi","interpreterLiteralI64FromNodeStatusCore","galerina-core-compiler/src/interpreter.ts","function literalI64FromNode(","interpreter_literal_i64_from_node_built"],
  ["interpreter-literal-u64-from-node-status.fungi","interpreterLiteralU64FromNodeStatusCore","galerina-core-compiler/src/interpreter.ts","function literalU64FromNode(","interpreter_literal_u64_from_node_built"],
  ["interpreter-coerce-to-declared-numeric-status.fungi","interpreterCoerceToDeclaredNumericStatusCore","galerina-core-compiler/src/interpreter.ts","function coerceToDeclaredNumeric(","interpreter_coerce_to_declared_numeric_built"],
  ["interpreter-is-canonical-verdict-status.fungi","interpreterIsCanonicalVerdictStatusCore","galerina-core-compiler/src/interpreter.ts","function isCanonicalVerdict(","interpreter_is_canonical_verdict_built"],
  ["interpreter-mk-float-status.fungi","interpreterMkFloatStatusCore","galerina-core-compiler/src/interpreter.ts","function mkFloat(","interpreter_mk_float_built"],
].map(([file,flow,source,symbol,expected])=>Object.freeze({file,flow,source,symbol,input:args(["inputCaptured","stateChecked","decisionBuilt","evidenceBound","outcomeSealed","releaseChecked"]),expected:string(expected)})));

function shadowFingerprint(source){const identifiers=new Map();return createHash("sha256").update(source.replace(/^\uFEFF/u," ").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,m=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,id=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");}

describe("40-file source-bound Fungi decision-core overlay wave 36",()=>{
  it("binds 40 distinct, previously uncredited live source behaviours and package assets",()=>{assert.equal(CANDIDATES.length,40);const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[],scopes=new Set();for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-ts",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);const scope=`${c.source}#${c.symbol}`;assert.equal(scopes.has(scope),false);scopes.add(scope);}});
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{const seen=new Map(),files=new Set(CANDIDATES.map(c=>c.file));for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}const collisions=[];for(const c of CANDIDATES){const p=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(p),`${c.file} must exist`);const source=readFileSync(p,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);}}assert.deepEqual(collisions,[]);});
  it("parses, effect-checks, emits GIR and executes every decision core",async()=>{for(const c of CANDIDATES){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8"),program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}});
});
