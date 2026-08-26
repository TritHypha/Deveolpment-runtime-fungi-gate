import { readFileSync } from "node:fs";
import { parseProgram, resolveSymbols, checkTypes, checkValueStates, checkEffects, effectResultsToDiagnostics, verifyGovernance, checkEvents } from "../dist/index.js";

const SUPPRESS = new Set(["FUNGI-TYPE-001","FUNGI-TYPE-009","FUNGI-NAME-001","FUNGI-GOV-002","FUNGI-SYNTAX-003","FUNGI-SYNTAX-006","FUNGI-SYNTAX-007","FUNGI-SYNTAX-008"]);

const src = readFileSync("C:/laragon/www/LO/docs/Examples/Level-9-Enterprise/468-full-contract-model/example.fungi", "utf8");
const p = parseProgram(src, "test.fungi");
const sr = resolveSymbols(p.ast);
const tr = checkTypes(p.ast);
const vr = checkValueStates(p.ast);
const ef = checkEffects(p.flows, p.ast);
const gov = verifyGovernance(p.ast, p.flows, ef, "dev");
const ev = checkEvents(p.ast);
const all = [...p.diagnostics, ...sr.diagnostics, ...tr.diagnostics, ...vr.diagnostics, ...effectResultsToDiagnostics(ef), ...gov.diagnostics, ...ev.diagnostics];

console.log("All errors after suppression:");
const filtered = all.filter(d => !SUPPRESS.has(d.code) && d.severity === "error");
filtered.forEach(d => console.log(`  ${d.code} ${d.severity}: ${d.message.slice(0, 80)}`));
if (filtered.length === 0) console.log("  (none — would pass!)");
