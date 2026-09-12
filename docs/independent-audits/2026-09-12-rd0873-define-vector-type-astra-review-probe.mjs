import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.argv[2];
const L = await import(pathToFileURL(resolve(root, 'packages-ts/galerina-core-compiler/dist/index.js')));
const oracle = await import(pathToFileURL(resolve(root, 'packages-ts/galerina-core-vector/dist/index.js')));
const twin = readFileSync(resolve(root, 'packages/fungi/products/galerina/rd0873-core-vector/define-vector-type.fungi'), 'utf8');
const numbers = [NaN, Infinity, -Infinity, -0, 0, Number.MIN_VALUE, -Number.MIN_VALUE, 1e-7, 1e-6, 0.9999999999999999, 1, 1.0000000000000002, 1.5, -1, 2, 2**31, 2**32, 2**52-0.5, 2**52, Number.MAX_SAFE_INTEGER, 2**53, Number.MAX_VALUE];
const strings = ['Float32', '', '   ', '\t\r\n', '\u00a0', '\ufeff', '\u2028\u2029', '\u200b', ' Float64 ', '\ud800'];
const cases = strings.flatMap(elementType => numbers.map(lanes => ({ elementType, lanes })));
function probe({elementType, lanes}, i) {
  let expected;
  try { expected = { ok: true, value: oracle.defineVectorType(elementType, lanes) }; }
  catch(error) { assert.ok(error instanceof Error); expected = { ok:false, message:error.message }; }
  return `\npure flow independentProbe${i}(lanes: Float64) -> Bool\ncontract { intent { "Independent primitive-input differential check." } }\n{\n let result: Result<VectorType, String> = defineVectorType(${JSON.stringify(elementType)}, lanes)\n match result {\n Ok(value) => { ${expected.ok ? `return value.elementType == ${JSON.stringify(elementType)} and value.dimension.lanes == lanes` : 'return false'} }\n Err(message) => { ${expected.ok ? 'return false' : `return message == ${JSON.stringify(expected.message)}`} }\n _ => { return false }\n }\n}\n`;
}
async function execute(source) {
  const program = L.parseProgram(source + cases.map(probe).join('\n'), 'independent-vector-review.fungi');
  assert.deepEqual(program.diagnostics.filter(d => d.severity === 'error'), []);
  const effects = L.checkEffects(program.flows, program.ast);
  const { gir } = L.emitGIR(program.ast, program.flows, effects);
  const wat = L.renderWAT(L.buildWATModuleFromGIR(gir, undefined, 'wasm-standalone', program.ast, true));
  const assembled = await L.assembleWAT(wat);
  assert.equal(assembled.valid, true, JSON.stringify(assembled.diagnostics));
  const host = L.createHostRuntime();
  const exactInputStrings=new Map(strings.map(value=>[JSON.stringify(value).slice(1,-1),value]));
  for(const entry of L.getInternedStrings()) host.seedString(entry.handle, exactInputStrings.get(entry.value) ?? entry.value);
  const { instance } = await WebAssembly.instantiate(assembled.wasm, host.imports);
  console.log(JSON.stringify({phase:'direct numeric predicate', values:[NaN,Infinity,-Infinity,0,1].map(value => {try{return {value:String(value),actual:instance.exports.isPositiveSafeInteger(value)}}catch(error){return {value:String(value),error:String(error)}}})}));
  return cases.flatMap((item,i) => {
    try { return instance.exports[`independentProbe${i}`](item.lanes) === 1 ? [] : [{ i, elementType: JSON.stringify(item.elementType), lanes:String(item.lanes) }]; }
    catch(error) { return [{ i, elementType:JSON.stringify(item.elementType), lanes:String(item.lanes), error:String(error) }]; }
  });
}
const failures = await execute(twin);
console.log(JSON.stringify({ phase: 'independent differential', cases:cases.length, failureCount:failures.length, failures:failures.filter(item=>item.elementType==='"Float32"' || item.lanes==='1') }));
const thresholdMutation = twin.replace('value >= 9007199254740992.0', 'value >= 9007199254740994.0');
assert.notEqual(thresholdMutation, twin);
const red = await execute(thresholdMutation);
const newRed = red.filter(item=>!failures.some(baseline=>baseline.i===item.i));
assert.ok(newRed.length > 0, 'unsafe-integer negative control must introduce new failures');
console.log(JSON.stringify({ phase:'threshold mutation', detected:newRed.length, sample:newRed.slice(0,3) }));
process.exitCode=failures.length ? 1 : 0;
