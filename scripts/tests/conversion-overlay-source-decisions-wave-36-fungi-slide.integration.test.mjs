import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { it } from "node:test";

const SLIDE_ROOT=process.env.GALERINA_SLIDE_REPO,AVAILABLE=typeof SLIDE_ROOT==="string"&&existsSync(join(SLIDE_ROOT,"src","checked-fungi-package-compiler.mjs")),ROOT=join(process.cwd(),"packages-ts","galerina-test","src","self-hosted","conversion-overlays"),GATES=Object.freeze({identity:1,provenance:1,target:1,effects:1,policy:1,revocation:1,validation:1,memory:1});
const CANDIDATES=Object.freeze([
  ["hardening-residency-discharge-trust-status.fungi","hardeningResidencyDischargeTrustStatusCore",6,"hardening_residency_discharge_trust_built"],
  ["hardening-residency-boundary-trusted-status.fungi","hardeningResidencyBoundaryTrustedStatusCore",6,"hardening_residency_boundary_trusted_built"],
  ["hardening-residency-spill-retype-status.fungi","hardeningResidencySpillRetypeStatusCore",6,"hardening_residency_spill_retype_built"],
  ["hardening-residency-show-derived-status.fungi","hardeningResidencyShowDerivedStatusCore",6,"hardening_residency_show_derived_built"],
  ["hardening-residency-canonicalize-status.fungi","hardeningResidencyCanonicalizeStatusCore",6,"hardening_residency_canonicalize_built"],
  ["hardening-residency-fingerprint-status.fungi","hardeningResidencyFingerprintStatusCore",6,"hardening_residency_fingerprint_built"],
  ["i32-arith-is-i32-trap-status.fungi","i32ArithIsI32TrapStatusCore",6,"i32_arith_is_i32_trap_built"],
  ["i32-arith-add-checked-status.fungi","i32ArithAddCheckedStatusCore",6,"i32_arith_add_checked_built"],
  ["i32-arith-sub-checked-status.fungi","i32ArithSubCheckedStatusCore",6,"i32_arith_sub_checked_built"],
  ["i32-arith-mul-checked-status.fungi","i32ArithMulCheckedStatusCore",6,"i32_arith_mul_checked_built"],
  ["i32-arith-div-checked-status.fungi","i32ArithDivCheckedStatusCore",6,"i32_arith_div_checked_built"],
  ["i32-arith-mod-checked-status.fungi","i32ArithModCheckedStatusCore",6,"i32_arith_mod_checked_built"],
  ["i32-arith-neg-checked-status.fungi","i32ArithNegCheckedStatusCore",6,"i32_arith_neg_checked_built"],
  ["i64-arith-is-i64-trap-status.fungi","i64ArithIsI64TrapStatusCore",6,"i64_arith_is_i64_trap_built"],
  ["i64-arith-range-or-trap-status.fungi","i64ArithRangeOrTrapStatusCore",6,"i64_arith_range_or_trap_built"],
  ["i64-arith-add-checked-status.fungi","i64ArithAddCheckedStatusCore",6,"i64_arith_add_checked_built"],
  ["i64-arith-sub-checked-status.fungi","i64ArithSubCheckedStatusCore",6,"i64_arith_sub_checked_built"],
  ["i64-arith-mul-checked-status.fungi","i64ArithMulCheckedStatusCore",6,"i64_arith_mul_checked_built"],
  ["i64-arith-div-checked-status.fungi","i64ArithDivCheckedStatusCore",6,"i64_arith_div_checked_built"],
  ["i64-arith-mod-checked-status.fungi","i64ArithModCheckedStatusCore",6,"i64_arith_mod_checked_built"],
  ["i64-arith-neg-checked-status.fungi","i64ArithNegCheckedStatusCore",6,"i64_arith_neg_checked_built"],
  ["import-resolver-parse-import-value-status.fungi","importResolverParseImportValueStatusCore",6,"import_resolver_parse_import_value_built"],
  ["import-resolver-manifest-cache-key-status.fungi","importResolverManifestCacheKeyStatusCore",6,"import_resolver_manifest_cache_key_built"],
  ["import-resolver-reset-manifest-type-cache-for-test-status.fungi","importResolverResetManifestTypeCacheForTestStatusCore",6,"import_resolver_reset_manifest_type_cache_for_test_built"],
  ["import-resolver-load-external-manifest-types-status.fungi","importResolverLoadExternalManifestTypesStatusCore",6,"import_resolver_load_external_manifest_types_built"],
  ["import-resolver-resolve-symbol-status.fungi","importResolverResolveSymbolStatusCore",6,"import_resolver_resolve_symbol_built"],
  ["import-resolver-resolve-imports-status.fungi","importResolverResolveImportsStatusCore",6,"import_resolver_resolve_imports_built"],
  ["interpreter-int-val-status.fungi","interpreterIntValStatusCore",6,"interpreter_int_val_built"],
  ["interpreter-i32-r-status.fungi","interpreterI32RStatusCore",6,"interpreter_i32_r_built"],
  ["interpreter-i64-r-status.fungi","interpreterI64RStatusCore",6,"interpreter_i64_r_built"],
  ["interpreter-u64-r-status.fungi","interpreterU64RStatusCore",6,"interpreter_u64_r_built"],
  ["interpreter-decimal-r-status.fungi","interpreterDecimalRStatusCore",6,"interpreter_decimal_r_built"],
  ["interpreter-dec-div-r-status.fungi","interpreterDecDivRStatusCore",6,"interpreter_dec_div_r_built"],
  ["interpreter-to-decimal-string-status.fungi","interpreterToDecimalStringStatusCore",6,"interpreter_to_decimal_string_built"],
  ["interpreter-dec-cmp-status.fungi","interpreterDecCmpStatusCore",6,"interpreter_dec_cmp_built"],
  ["interpreter-literal-i64-from-node-status.fungi","interpreterLiteralI64FromNodeStatusCore",6,"interpreter_literal_i64_from_node_built"],
  ["interpreter-literal-u64-from-node-status.fungi","interpreterLiteralU64FromNodeStatusCore",6,"interpreter_literal_u64_from_node_built"],
  ["interpreter-coerce-to-declared-numeric-status.fungi","interpreterCoerceToDeclaredNumericStatusCore",6,"interpreter_coerce_to_declared_numeric_built"],
  ["interpreter-is-canonical-verdict-status.fungi","interpreterIsCanonicalVerdictStatusCore",6,"interpreter_is_canonical_verdict_built"],
  ["interpreter-mk-float-status.fungi","interpreterMkFloatStatusCore",6,"interpreter_mk_float_built"],
].map(([file,flow,count,expected])=>Object.freeze({file,flow,args:Array(count).fill(true),expected})));

async function api(){const load=async p=>import(pathToFileURL(join(SLIDE_ROOT,"src",p)).href);return {...await load("checked-fungi-package-compiler.mjs"),...await load("checked-fungi-package-file.mjs"),...await load("checked-fungi-package-publication-loader.mjs"),...await load("safe-value-envelope.mjs"),...await load("portable-veo.mjs")};}
function expectation(r){return {packageSetDigest:r.packageSetDigest,packageIdentity:r.packageIdentity,exportName:r.exportName,receiptDigest:r.receiptDigest,safeValueTypeId:r.safeValueTypeId,safeValueStateId:r.safeValueStateId,safeValueProvenanceDigest:r.safeValueProvenanceDigest};}

it("publishes and independently re-admits all 40 wave-36 source decisions through physical SLIDE/VOK",{skip:!AVAILABLE},async()=>{
  const slide=await api(),context=slide.portableVeoReferenceContext(),sources=CANDIDATES.map(c=>Uint8Array.from(readFileSync(join(ROOT,c.file)))),request=bytes=>({packages:[{identity:"@galerina/test",version:"1.0.0-beta.36",exports:CANDIDATES.map((c,i)=>({name:c.flow,sourceFlowName:c.flow,sourceBytes:bytes[i]})),dependencies:[],resources:[]}],context,gates:GATES}),compiled=slide.compileCheckedFungiPackageSet(request(sources));
  assert.equal(compiled.verdict,1,JSON.stringify(compiled));
  const changed=sources.map(source=>Uint8Array.from(source));changed[0][0]^=1;assert.equal(slide.compileCheckedFungiPackageSet(request(changed)).verdict,-1);
  const parent=await mkdtemp(join(tmpdir(),"galerina-wave-36-")),out=join(parent,"published");
  try{
    const published=await slide.publishCheckedFungiPackageBuild({packageBuildHandle:compiled.packageBuildHandle,outputDirectory:out});assert.equal(published.verdict,1,JSON.stringify(published));assert.equal(published.outputFiles.filter(n=>n.endsWith(".slide")).length,40);
    let last;for(const c of CANDIDATES){const prepared=await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:c.flow,context,gates:GATES});assert.equal(prepared.verdict,1,c.flow);const receipt=slide.executeTypedCheckedFungiPackagePublication(prepared.packageExecutionHandle,c.args,undefined),verified=slide.verifyTypedCheckedFungiPackageReceipt(receipt,expectation(receipt));assert.equal(verified.verdict,1,c.flow);assert.equal(verified.value,c.expected,c.flow);assert.equal(verified.authorityReleased,false,c.flow);last=receipt;}
    assert.equal(slide.verifyTypedCheckedFungiPackageReceipt({...last,receiptDigest:"sha256:"+"0".repeat(64)},expectation(last)).verdict,-1);const path=join(out,published.outputFiles.find(n=>n.endsWith(".slide"))),bytes=await readFile(path);bytes[0]^=1;await writeFile(path,bytes);assert.equal((await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:CANDIDATES[0].flow,context,gates:GATES})).verdict,-1);
  }finally{await rm(parent,{recursive:true,force:true});}
});
