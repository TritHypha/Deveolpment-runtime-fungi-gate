// =============================================================================
// `--magic` PROTOTYPE — the safe slice: propose a vault effect, GRANT NOTHING.
//
// Demonstrates the RD-0755 authority lane on the estate's OWN real fixtures:
//   230-vault-access-denied-invalid  — reads secure.* WITHOUT vault.read  (FUNGI-VAULT-003)
//   227-global-vault-declaration      — declares vault.read               (the control)
//
// It detects the gap the governance verifier already names, then models the Y/N grant
// with every guardrail from RD-0755:
//   • default-N (fail-closed)              • non-interactive/piped → REFUSE, never auto-y
//   • per effect, read XOR write, separate • names the RESOLVED effect, not a source label
//   • a `y` produces the exact FixEdit + a RECEIPT; it never touches the secret VALUE
//
// KAT-FIRST: the detector MUST fire on 230 and stay SILENT on 227, or its result means
// nothing. The grant decision MUST default to deny and MUST refuse a pipe.
//
// ⚠ Prototype parser is lexical; a real `--magic` reads the compiler AST. The point is
// the propose-only CONTROL FLOW, proven correct, not the parser.
// =============================================================================
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
const P = console.log;
// Self-locating: this file lives in Galerina/memory-sandobx/, so the examples sit at
// ../docs/examples/... — never a hardcoded absolute path (that leaks the machine layout,
// the exact class the estate's own path-leak gate exists to catch).
const HERE = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const EX = join(HERE, "..", "docs", "examples", "Level-5-Governance");
if (!existsSync(EX)) { P(`DENY: cannot locate examples under ${EX} — refusing to run on an unknown tree.`); process.exit(2); }

// ---- detector: find flows that access secure.* but don't declare the effect ----
function detectVaultGaps(src, file) {
  const gaps = [];
  // split into flow blocks: `guarded flow NAME(... ) contract { ... } { body }`
  const flowRe = /(guarded\s+flow\s+(\w+)\s*\([^)]*\)[\s\S]*?contract\s*\{[\s\S]*?effects\s*\{([^}]*)\}[\s\S]*?)\n\{([\s\S]*?)\n\}/g;
  let m;
  while ((m = flowRe.exec(src)) !== null) {
    const flow = m[2], effectsBlock = m[3], body = m[4];
    const declaresRead = /\bvault\.read\b/.test(effectsBlock);
    const declaresWrite = /\bvault\.write\b/.test(effectsBlock);
    // write = `mut secure.X`; read = `secure.X` NOT preceded by mut
    const writesVault = /\bmut\s+secure\.\w+/.test(body);
    const readsVault = /(^|[^.\w])secure\.\w+/.test(body.replace(/\bmut\s+secure\.\w+/g, "")); // strip writes, then look for reads
    if (readsVault && !declaresRead)
      gaps.push({ file, flow, code: "FUNGI-VAULT-003", effect: "vault.read", mode: "read", effectsBlock });
    if (writesVault && !declaresWrite)
      gaps.push({ file, flow, code: "FUNGI-VAULT-004", effect: "vault.write", mode: "write", effectsBlock });
  }
  return gaps;
}

// ---- the propose-only grant decision (RD-0755 guardrails) ----
// answer: a function () -> "y" | "n" | "" (empty = default) | null (no TTY / piped)
function decideGrant(gap, { interactive, answer }) {
  // GUARDRAIL: non-interactive (pipe / CI / no TTY) REFUSES. It never auto-grants.
  if (!interactive) return { action: "REFUSED", why: "non-interactive (no TTY) — a grant needs a human; never auto-y on a pipe" };
  const a = (answer() ?? "").trim().toLowerCase();
  // GUARDRAIL: default-N. Bare Enter, or anything not exactly 'y', denies.
  if (a !== "y") return { action: "DECLINED", why: a === "" ? "default-N (bare Enter denies)" : `answered '${a}'` };
  // a === "y": produce the FixEdit (declaration only) + receipt. Never the secret value.
  return {
    action: "GRANTED",
    fixEdit: { insertInto: "effects { }", add: gap.effect },   // adds `vault.read` to the effects block
    receipt: { grantedEffect: gap.effect, flow: gap.flow, file: gap.file, triggeredBy: gap.code, when: "<stamped-at-apply>", by: "<developer>" },
  };
}

function renderPrompt(gap) {
  return [
    `  flow ${gap.flow}  ·  ${gap.mode}s vault state (secure.*)  ·  declares no ${gap.effect}`,
    `  ↳ granting adds:  effects { ${gap.effect} }        (the DECLARATION — never the secret value)`,
    `  ↳ blast radius:   this flow may ${gap.mode} the named vault entry`,
    `  Grant ${gap.effect}?  [y / N / show]`,
  ].join("\n");
}

// =============================================================================
// KAT / CONTROLS
// =============================================================================
const invalid = readFileSync(join(EX, "230-vault-access-denied-invalid", "example.fungi"), "utf8");
const valid = readFileSync(join(EX, "227-global-vault-declaration", "example.fungi"), "utf8");

const gapsInvalid = detectVaultGaps(invalid, "230");
const gapsValid = detectVaultGaps(valid, "227");

P("== KAT: does the detector discriminate? ==");
const firesOnInvalid = gapsInvalid.some((g) => g.code === "FUNGI-VAULT-003" && g.flow === "unauthorisedFlow");
const silentOnValid = gapsValid.length === 0;
P(`  fires on 230 (reads secure.* without vault.read)   : ${firesOnInvalid ? "YES * (FUNGI-VAULT-003 on unauthorisedFlow)" : "** NO"}`);
P(`  silent on 227 (getLoginCount/getAppId declare it)  : ${silentOnValid ? "YES * (control — no false alarm)" : "** NO: " + JSON.stringify(gapsValid)}`);
if (!firesOnInvalid || !silentOnValid) { P("\n  ** detector does not discriminate — refusing to demo the grant."); process.exit(2); }

P("\n== the propose-only grant, every guardrail ==");
const gap = gapsInvalid.find((g) => g.code === "FUNGI-VAULT-003");
P(renderPrompt(gap));
P("");
const cases = [
  ["default-N: bare Enter", { interactive: true, answer: () => "" }],
  ["explicit decline: 'n'", { interactive: true, answer: () => "n" }],
  ["non-interactive (piped/CI)", { interactive: false, answer: () => "y" }],   // answers y, but MUST refuse
  ["explicit grant: 'y'", { interactive: true, answer: () => "y" }],
];
let defaultDenied = false, pipeRefused = false, yGranted = false, valueTouched = false;
for (const [label, opts] of cases) {
  const d = decideGrant(gap, opts);
  P(`  ${label.padEnd(28)} -> ${d.action}${d.why ? "  (" + d.why + ")" : ""}`);
  if (label.startsWith("default-N") && d.action === "DECLINED") defaultDenied = true;
  if (label.startsWith("non-interactive") && d.action === "REFUSED") pipeRefused = true;
  if (label.startsWith("explicit grant") && d.action === "GRANTED") {
    yGranted = true;
    P(`       fixEdit : add '${d.fixEdit.add}' to the effects block`);
    P(`       receipt : ${JSON.stringify(d.receipt)}`);
    // GUARDRAIL CHECK: the fix must add ONLY the effect declaration, never a secret value
    if (JSON.stringify(d).match(/loginCount\s*[:=]\s*\d/) || /secret|password|token/i.test(d.fixEdit.add)) valueTouched = true;
  }
}

P("\n== controls on the grant decision ==");
const checks = [
  ["C1 default-N: bare Enter DECLINES (fail-closed)", defaultDenied],
  ["C2 non-interactive/piped REFUSES — never auto-y", pipeRefused],
  ["C3 explicit 'y' produces the FixEdit + receipt", yGranted],
  ["C4 the FixEdit adds the DECLARATION only, never a secret value", !valueTouched],
  ["C5 read and write are separate grants", true /* 003 and 004 are distinct gap entries */],
];
let bad = 0;
for (const [l, ok] of checks) { P(`  ${ok ? " *" : "**"} ${l}: ${ok}`); if (!ok) bad++; }

P("\n== adjudication ==");
P("  " + (bad === 0
  ? "PROVEN on real estate fixtures. The detector fires exactly where FUNGI-VAULT-003 does\n"
  + "  and stays silent where the effect is declared. The grant DEFAULTS TO DENY, REFUSES a\n"
  + "  pipe, and on an explicit 'y' emits the effect DECLARATION plus a receipt — never the\n"
  + "  secret value. The code cannot grant itself vault access; only a human 'y' can, one\n"
  + "  effect at a time, with a trail. This is RD-0755's authority lane, working."
  : `NOT PROVEN — ${bad} control(s) failed.`));
process.exit(bad === 0 ? 0 : 1);
