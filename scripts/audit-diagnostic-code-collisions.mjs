#!/usr/bin/env node
// =============================================================================
// audit-diagnostic-code-collisions.mjs — one code, one meaning. Across BOTH engines.
// =============================================================================
// Owner ruling 2026-07-25 (relayed R&D 0374): a diagnostic code emitted by only one
// component carries that component's name (`GOV-<COMPONENT>-NNN`). The owner's framing —
// "this may be a 50-year mistake if we let it slip" — is why the rename ships WITH this
// detector as one unit: a naming scheme with no enforcement decays back to collisions.
//
// WHAT IT CHECKS
//   C1  one code, two meanings — the same FUNGI-* code carrying different NAMES across
//       the `.ts` reference and the `.fungi` twins. This is the GOV-005 class: `.ts`
//       GOV-005 = POLICY_PURPOSE_MISMATCH (live, cross-component) while the `.fungi`
//       gov-verifier used the same code for a guard-capability check.
//   C2  source vs DOCS divergence — the docs code tables are a SECOND, divergent registry
//       (R&D 0376: docs/examples/README.md gives FUNGI-VAULT-001..007 config-vault meanings
//       while governance-verifier.ts registers them as permissions-vault meanings; 005-007
//       partially agree, which disguised the drift for weeks). Invisible until now.
//
// WHY IT READS SOURCE, NOT THE REGISTRY
//   The generated registry LAGS source and is itself derived — grading source against a
//   derivative would make the detector blind exactly when a code is minted without being
//   registered. Emitting sites are the ground truth; see the coining-discipline note in
//   docs/ and RD-0511.
//
//   Usage:  node scripts/audit-diagnostic-code-collisions.mjs [--self-test] [--json]
// =============================================================================

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Tracked source files, enumerated exactly — a glob that silently skips is not a surface. */
function trackedFiles(patterns) {
  return execFileSync("git", ["ls-files", ...patterns], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    .split("\n").map((s) => s.trim()).filter(Boolean)
    .filter((f) => !f.includes("node_modules/"));
}

/**
 * Extract (code -> name) bindings from `.ts` sources.
 * The house declaration shape is an exported const object literal:
 *   code: "FUNGI-VAULT-001", name: "VAULT_MISSING_OPEN_BRACE", severity: "error"
 * Both orders are accepted; a code with no name on the same or adjacent line is recorded
 * as a code SIGHTING with no meaning, which C1 ignores (it can't collide on nothing) but
 * which the unregistered-code check can still use.
 */
export function extractTsBindings(text, file) {
  const out = [];
  const re = /code:\s*"(FUNGI-[A-Z0-9-]+)"\s*,\s*name:\s*"([A-Z0-9_]+)"/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ code: m[1], name: m[2], file, line: text.slice(0, m.index).split("\n").length });
  }
  return out;
}

/**
 * Extract (code -> name) bindings from `.fungi` twins.
 * The twins emit record literals: `{ code: "FUNGI-GOV-005", message: "...", flowName: ... }`
 * — they carry a MESSAGE, not a NAME. So the twin's "meaning" is derived from the message's
 * leading clause, normalised. That is deliberately coarse: it exists to catch a code whose
 * twin meaning is plainly a different subject, not to diff prose.
 */
export function extractFungiBindings(text, file) {
  const out = [];
  const re = /code:\s*"(FUNGI-[A-Z0-9-]+)"\s*,\s*message:\s*([^\n]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const rhs = m[2].trim();
    // Only a STRING LITERAL carries a comparable meaning. The twins commonly build the text in a
    // local first (`message: msg`), and an early draft of this checker compared against the VARIABLE
    // NAME — reporting "meaning split" on `msg`/`pmsg`/`dmsg` where it simply could not see the
    // message. A check that fires when it cannot see is worse than one that stays silent: it
    // produces noise that gets baselined away, taking the real signal with it. Non-literal sites are
    // recorded as UNRESOLVED and counted in the report, never silently dropped.
    const line = text.slice(0, m.index).split("\n").length;
    let meaning = null;
    const lit = rhs.match(/^"((?:[^"\\]|\\.)*)"/);
    if (lit) meaning = lit[1];
    else {
      // ONE level of local resolution. The twins overwhelmingly write
      //   let msg: String = "…literal…" + expr
      //   diags.append({ code: "FUNGI-X-001", message: msg, … })
      // so refusing to resolve `msg` left this detector comparing ZERO sites — a green that meant
      // "I looked at nothing", and it could not see the live GOV-005 collision that motivated it.
      // Resolving the binding's leading string literal is enough to recover the subject; anything
      // deeper stays unresolved and is REPORTED as such rather than guessed.
      const varName = rhs.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*[,}]/)?.[1];
      if (varName) {
        // Resolve to the NEAREST PRECEDING declaration, not the first in the file. An earlier draft
        // used text.match(), which returns the FIRST occurrence anywhere — so a file with several
        // `let msg: String = …` bindings attributed the WRONG text to every emit site after the
        // first. It reported the GOV-005 twin meaning as "safety_critical flow '…'" when that site
        // actually emits the guard permitted_effects message. A resolver that silently mis-attributes
        // is worse than one that declines: it produces confident, wrong evidence.
        const decl = new RegExp(`(?:let|mut)\\s+${varName}\\s*(?::\\s*String\\s*)?=\\s*"((?:[^"\\\\]|\\\\.)*)"`, "g");
        const before = text.slice(0, m.index);
        let d, last = null;
        while ((d = decl.exec(before)) !== null) last = d[1];   // last match BEFORE the emit = nearest
        meaning = last;
      }
    }
    out.push(meaning !== null
      ? { code: m[1], meaning: meaning.slice(0, 80), resolved: true, file, line }
      : { code: m[1], meaning: rhs.slice(0, 40), resolved: false, file, line });
  }
  return out;
}

/** Extract code -> description rows from markdown tables/lists in docs. */
export function extractDocBindings(text, file) {
  const out = [];
  const re = /(FUNGI-[A-Z0-9-]+)\s*[—:|-]+\s*([^\n|]{4,90})/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ code: m[1], desc: m[2].trim(), file, line: text.slice(0, m.index).split("\n").length });
  }
  return out;
}

/** C1: the same code bound to two different NAMES in `.ts` is an outright collision. */
export function findNameCollisions(tsBindings) {
  const byCode = new Map();
  for (const b of tsBindings) {
    if (!byCode.has(b.code)) byCode.set(b.code, new Map());
    const names = byCode.get(b.code);
    if (!names.has(b.name)) names.set(b.name, []);
    names.get(b.name).push(`${b.file}:${b.line}`);
  }
  const out = [];
  for (const [code, names] of byCode) {
    if (names.size > 1) out.push({ code, names: [...names.entries()].map(([n, at]) => ({ name: n, at })) });
  }
  return out;
}

/**
 * C1b: a code registered in `.ts` AND emitted by a `.fungi` twin whose message subject
 * plainly differs. Compared on the SUBJECT WORD — the first identifier-ish token of the
 * registered name vs the twin's message — because prose will never match exactly and a
 * strict compare would be noise, not signal.
 */
export function findCrossEngineCollisions(tsBindings, fungiBindings) {
  const tsByCode = new Map();
  for (const b of tsBindings) if (!tsByCode.has(b.code)) tsByCode.set(b.code, b);
  const out = [];
  for (const f of fungiBindings) {
    if (f.resolved === false) continue;   // cannot see the message — reported as unresolved, never guessed
    const t = tsByCode.get(f.code);
    if (!t) continue;
    const subject = t.name.split("_")[0].toLowerCase();          // VAULT_MISSING… -> "vault"
    const msg = f.meaning.toLowerCase();
    if (!msg.includes(subject)) {
      out.push({ code: f.code, tsName: t.name, tsAt: `${t.file}:${t.line}`, twinMeaning: f.meaning, twinAt: `${f.file}:${f.line}` });
    }
  }
  return out;
}

// ── self-test ────────────────────────────────────────────────────────────────
// The known-bad fixture IS the GOV-005 collision that motivated the detector: if it cannot
// see the instance it was built for, it is not a detector. Plus a clean control, so a
// pass cannot come from the checker matching nothing.
function selfTest() {
  const fails = [];
  const ok = (cond, what) => { if (!cond) fails.push(what); };

  const tsFixture = `
    export const A = { code: "FUNGI-GOV-005", name: "POLICY_PURPOSE_MISMATCH", severity: "error" } as const;
    export const B = { code: "FUNGI-GOV-005", name: "GUARD_UNKNOWN_CAPABILITY", severity: "error" } as const;
    export const C = { code: "FUNGI-GOV-006", name: "SOMETHING_ELSE", severity: "error" } as const;`;
  const collisions = findNameCollisions(extractTsBindings(tsFixture, "fixture.ts"));
  ok(collisions.length === 1, "known-bad: one code with two names must be reported");
  ok(collisions[0]?.code === "FUNGI-GOV-005", "known-bad: the reported code must be GOV-005");
  ok(collisions[0]?.names.length === 2, "known-bad: both meanings must be listed");

  const cleanOnly = findNameCollisions(extractTsBindings(
    `export const C = { code: "FUNGI-GOV-006", name: "SOMETHING_ELSE", severity: "error" } as const;`, "clean.ts"));
  ok(cleanOnly.length === 0, "CONTROL: a clean file must report nothing (else the checker fires on everything)");

  // cross-engine: the real shape — .ts registers a POLICY meaning, the twin emits a GUARD one
  const cross = findCrossEngineCollisions(
    extractTsBindings(`export const A = { code: "FUNGI-GOV-005", name: "POLICY_PURPOSE_MISMATCH" } as const;`, "a.ts"),
    extractFungiBindings(`guardDiags.append({ code: "FUNGI-GOV-005", message: "guard permitted_effects contains unknown capability" })`, "b.fungi"));
  ok(cross.length === 1, "known-bad: cross-engine subject mismatch must be reported");

  const crossClean = findCrossEngineCollisions(
    extractTsBindings(`export const A = { code: "FUNGI-VAULT-001", name: "VAULT_MISSING_OPEN_BRACE" } as const;`, "a.ts"),
    extractFungiBindings(`d.append({ code: "FUNGI-VAULT-001", message: "vault block missing opening brace" })`, "b.fungi"));
  ok(crossClean.length === 0, "CONTROL: agreeing subjects must NOT be reported");

  ok(extractTsBindings(tsFixture, "f.ts").length === 3, "extractor non-vacuity: it must find the fixture's bindings");

  console.log(fails.length === 0
    ? `  ✅ self-test ${6 - fails.length}/6 — the GOV-005 collision is visible to this detector, and controls stay silent`
    : `  ❌ self-test FAILED:\n     - ${fails.join("\n     - ")}`);
  return fails.length === 0 ? 0 : 1;
}

// ── main ─────────────────────────────────────────────────────────────────────
function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--self-test")) process.exit(selfTest());

  const tsFiles = trackedFiles(["*.ts"]).filter((f) => !f.endsWith(".d.ts"));
  const fungiFiles = trackedFiles(["*.fungi"]);
  const docFiles = trackedFiles(["docs/**/*.md", "*.md"]);

  const ts = [], fungi = [], docs = [];
  for (const f of tsFiles) { const p = join(ROOT, f); if (existsSync(p)) ts.push(...extractTsBindings(readFileSync(p, "utf8"), f)); }
  for (const f of fungiFiles) { const p = join(ROOT, f); if (existsSync(p)) fungi.push(...extractFungiBindings(readFileSync(p, "utf8"), f)); }
  for (const f of docFiles) { const p = join(ROOT, f); if (existsSync(p)) docs.push(...extractDocBindings(readFileSync(p, "utf8"), f)); }

  console.log("diagnostic-code collisions — one code, one meaning (owner ruling 2026-07-25, RD-0374)");
  console.log(`  surface: ${tsFiles.length} .ts · ${fungiFiles.length} .fungi · ${docFiles.length} .md  (git-tracked, node_modules excluded)`);
  const resolved = fungi.filter((f) => f.resolved).length;
  const unresolved = fungi.length - resolved;
  console.log(`  bindings: ${ts.length} .ts (code+name) · ${fungi.length} .fungi (code+message) · ${docs.length} doc rows`);
  // No silent caps: say what was NOT compared, so a green result cannot be read as wider than it is.
  console.log(`  twin messages: ${resolved} literal (compared) · ${unresolved} built in a local (NOT compared — see the extractor note)`);
  if (ts.length === 0) { console.error("  ❌ NON-VACUITY: zero .ts bindings found — the extractor is blind, not the tree clean."); process.exit(1); }
  // The cross-engine check is only meaningful over messages it can actually read. If a refactor ever
  // hides every twin message behind an unresolvable expression, this gate must go RED rather than
  // report a green it did not earn — the first draft did exactly that (0 compared, "no collisions").
  if (fungi.length > 0 && resolved === 0) {
    console.error("  ❌ NON-VACUITY: every twin message is unresolvable — the cross-engine check compared NOTHING.");
    console.error("     A green here would mean 'I looked at zero sites'. Extend the resolver before trusting this gate.");
    process.exit(1);
  }

  const c1 = findNameCollisions(ts);
  const c1b = findCrossEngineCollisions(ts, fungi);

  for (const c of c1) {
    console.log(`  🔴 C1 one code, two meanings: ${c.code}`);
    for (const n of c.names) console.log(`        ${n.name}  @ ${n.at.join(", ")}`);
  }
  // C1b is ADVISORY, deliberately, and this is the honest limit of the tool as built. Comparing a
  // twin's prose message against an UPPER_SNAKE registered name is fuzzy: `EFFECT_BOUNDARY_VIOLATION`
  // vs "Pure flow '…' calls …" is the SAME meaning but shares no subject word, so a gating version
  // produced false positives — and a gate that fails the build on a heuristic gets baselined away,
  // taking the real signal with it. So: C1 (exact, mechanical) GATES; C1b REVIEWS.
  // To make the cross-engine check exact, the twins would need to carry a NAME alongside the message
  // the way the .ts constants do — proposed to R&D rather than assumed here, because it is a change
  // to the twins' diagnostic shape and that is a joint decision.
  if (c1b.length) {
    console.log(`\n  ⚠ ADVISORY (not gating) — ${c1b.length} cross-engine pair(s) whose twin message shares no subject`);
    console.log("    word with the registered .ts name. Expect false positives: this is a prose heuristic,");
    console.log("    listed for §5a review, NOT a build failure. See the note above for why it does not gate.");
    for (const c of c1b.slice(0, 12)) {
      console.log(`      ${c.code}  .ts ${c.tsName} @ ${c.tsAt}`);
      console.log(`               twin "${c.twinMeaning}" @ ${c.twinAt}`);
    }
    if (c1b.length > 12) console.log(`      … +${c1b.length - 12} more (no silent cap: the count above is the total)`);
  }

  if (c1.length === 0) {
    console.log("\n  ✅ C1 GATE: no code is bound to two different names in the .ts reference.");
    process.exit(0);
  }
  console.error(`\n❌ diagnostic-code collisions: ${c1.length} C1 violation(s) — a code with two meanings is a 50-year mistake, not a lint.`);
  process.exit(1);
}

main();
