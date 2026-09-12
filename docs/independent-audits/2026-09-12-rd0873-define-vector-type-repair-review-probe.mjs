import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root=process.argv[2];
const L=await import(pathToFileURL(resolve(root,'packages-ts/galerina-core-compiler/dist/index.js')));
const source=`
pure flow classify(value: Float64) -> Bool { return Float64.isFinite(value) }
pure flow order(value: Float64) -> Bool { return value < 1.0 }
pure flow divide(a: Float64, b: Float64) -> Float64 { return a / b }
pure flow classifyDivision(a: Float64, b: Float64) -> Bool { return Float64.isFinite(a / b) }
pure flow next() -> Float64 { return 4.5 }
pure flow classifyOnce() -> Bool { return Float64.isFinite(next()) }
`;
const p=L.parseProgram(source,'independent-classifier-repair.fungi');
assert.deepEqual(p.diagnostics.filter(d=>d.severity==='error'),[]);
const effects=L.checkEffects(p.flows,p.ast);
const {gir}=L.emitGIR(p.ast,p.flows,effects);
const wat=L.renderWAT(L.buildWATModuleFromGIR(gir,undefined,'wasm-standalone',p.ast,true));
const binary=await L.assembleWAT(wat);assert.equal(binary.valid,true,JSON.stringify(binary.diagnostics));
const {instance}=await WebAssembly.instantiate(binary.wasm,L.createHostRuntime().imports);
const tag=value=>({__tag:'float',value});
async function run(name,entries){return L.executeFlow(name,new Map(entries.map(([key,value])=>[key,tag(value)])),p.ast,p.flows)}
let checks=0;const failures=[];
for(const value of [4.5,0,-0,Number.MAX_VALUE,Number.MIN_VALUE,NaN,Infinity,-Infinity]){
  assert.equal(instance.exports.classify(value),Number.isFinite(value)?1:0);checks++;
  const result=await run('classify',[['value',value]]);
  assert.equal(result.value?.__tag,'bool');assert.equal(result.value.value,Number.isFinite(value));checks++;
}
for(const value of [NaN,Infinity,-Infinity]){
  assert.throws(()=>instance.exports.order(value),WebAssembly.RuntimeError);checks++;
  const result=await run('order',[['value',value]]);
  if(result.value?.__tag!=='runtimeError')failures.push({name,value:String(value),result:result.value,audit:result.audit?.result});checks++;
}
for(const [a,b] of [[0,0],[1,0],[-1,0]]) for(const name of ['divide','classifyDivision']){
  assert.throws(()=>instance.exports[name](a,b),WebAssembly.RuntimeError);checks++;
  const result=await run(name,[['a',a],['b',b]]);
  if(result.value?.__tag!=='runtimeError')failures.push({name,a,b,result:result.value,audit:result.audit?.result});checks++;
}
// Instrument only the emitted callee body, leaving the classifier call site exact.
function functionSpan(text,name){
 const start=text.indexOf(`(func $${name} `);assert.ok(start>=0,`missing ${name}`);
 let depth=0;for(let i=start;i<text.length;i++){if(text[i]==='(')depth++;else if(text[i]===')'&&--depth===0)return [start,i+1]}
 throw new Error('unterminated function');
}
const [callStart,callEnd]=functionSpan(wat,'classifyOnce');
assert.equal((wat.slice(callStart,callEnd).match(/\(call \$next\b/gu)||[]).length,1);
const [nextStart,nextEnd]=functionSpan(wat,'next');
const instrumented=(wat.slice(0,nextStart)+'(func $next (result f64) (call $review_counted))'+wat.slice(nextEnd)).replace('(module','(module (import "review" "counted" (func $review_counted (result f64)))');
const injected=await L.assembleWAT(instrumented);assert.equal(injected.valid,true,JSON.stringify(injected.diagnostics));
let calls=0;let answer=4.5;
const imports=L.createHostRuntime().imports;imports.review={counted:()=>{calls++;return answer}};
const wrapped=await WebAssembly.instantiate(injected.wasm,imports);
for(const value of [4.5,NaN,Infinity,-Infinity]){calls=0;answer=value;assert.equal(wrapped.instance.exports.classifyOnce(),Number.isFinite(value)?1:0);assert.equal(calls,1);checks++;}
const pOnce=L.parseProgram('pure flow onceViaAbs(value: Float64) -> Bool { return Float64.isFinite(Math.abs(value)) }','interpreter-once.fungi');
assert.deepEqual(pOnce.diagnostics.filter(d=>d.severity==='error'),[]);
const savedAbs=Math.abs;let absCalls=0;
try{
 Math.abs=(value)=>{absCalls++;return savedAbs(value)};
 const result=await L.executeFlow('onceViaAbs',new Map([['value',tag(-4.5)]]),pOnce.ast,pOnce.flows);
 assert.equal(result.value?.__tag,'bool');assert.equal(result.value.value,true);assert.equal(absCalls,1);checks++;
}finally{Math.abs=savedAbs;}
console.log(JSON.stringify({checks,classification:'PASS',failures,wasmArgumentEvaluationOnce:'PASS',interpreterArgumentEvaluationOnce:'PASS'}));
process.exitCode=failures.length?1:0;
