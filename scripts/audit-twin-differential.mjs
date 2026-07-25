// audit-twin-differential.mjs — run BOTH engines over ONE corpus and compare what they EMIT.
//
// WHY THIS EXISTS (RD bridge 0442→0452, owner ruling 2026-07-25): audit-twin-emit-parity is
// PRESENCE-based — a regex over source text. It compares labels (code present, name equal,
// severity equal) and so cannot distinguish a code that fires never from one that fires always
// from one that fires correctly. The 004/007 divergence sat green under it: on an unrecognised
// declared effect Stage-A emits FUNGI-EFFECT-004 AND -007 (two diagnostics for one fault,
// effect-checker.ts has no registry guard on its 007 loop) while the twin deliberately
// suppresses the duplicate. Confirmed by execution on both engines (bridge 0449, 4/4).
//
// A differential gate compares BEHAVIOUR: same source string into both engines, diff the
// emitted FUNGI-EFFECT-* code sets. A refactor that keeps the strings defeats a textual gate;
// it cannot defeat this one. That is the 20-year property (owner: "make the zero trust choice,
// one that will last 20+ years").
//
// KNOWN DIVERGENCES ARE A NAMED SET, NOT A COUNT (see sentinel discipline): each entry names
// the code, the DIRECTION (which engine over-emits), the witness input, and the reason. Two
// integrity rules, both enforced:
//   1. an observed divergence NOT in the set  -> RED (a new behavioural drift)
//   2. a set entry that no longer OCCURS      -> RED (stale baseline — remove it in the same
//      commit as the Stage-A fix that retired it; a baseline that outlives its fault is vacuous)
// So the gate is born green ONLY because the two known Stage-A faults are named here, and
// main's Stage-A fix will turn it red until the entries are deleted with the fix. Deliberate.
//
// SCOPE, stated not silent:
//   - FUNGI-EFFECT-* codes only. Anything else an engine emits (e.g. FUNGI-TIER-001 from
//     Stage-A's tier floor) is OUTSIDE the twin's charter — dropped from the diff and PRINTED.
//   - Per-INPUT code sets (deduped), not per-flow attribution — v1 corpus is single-fault
//     inputs; per-flow lands with the reachability graph.
//   - The twin has NO defined composition of its two lanes (0444): the union DECL ∪ BODY is a
//     HARNESS-side construction, printed as such. The lane split itself produces expected
//     divergence #2 (twin DECL emits 007 for any declared effect by charter; Stage-A gates on
//     observed ∧ transitive).
//   - Twin leg drives the SELF-HOSTED lexer+parser (never Stage-A's parseProgram on the
//     subject source — that would measure the .ts front end, not the twin).
//
// NOT WIRED into run-phase-close / run-all-tests yet — wiring is main's call and lands with
// the Stage-A fix per the 0449/0452 agreement.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CC = join(ROOT, "packages-galerina", "galerina-core-compiler");

// ── pure comparison core (self-testable without either engine) ──────────────

/** Diff two code sets. Returns [{code, side}] where side names the engine that over-emits. */
export function diffCodeSets(stageA, twin) {
  const a = new Set(stageA), t = new Set(twin);
  const out = [];
  for (const c of [...a].sort()) if (!t.has(c)) out.push({ code: c, side: "stageA-only" });
  for (const c of [...t].sort()) if (!a.has(c)) out.push({ code: c, side: "twin-only" });
  return out;
}

/** Keep only the twin's charter family; report what was dropped rather than silently narrowing. */
export function scopeToEffectFamily(codes) {
  const kept = [], dropped = [];
  for (const c of codes) (/^FUNGI-EFFECT-\d+$/.test(c) ? kept : dropped).push(c);
  return { kept, dropped };
}

/** Classify observed diffs against the named expected set. Matching is code+side+witness. */
export function classify(caseId, diffs, expected) {
  const unexpected = [], matched = [];
  for (const d of diffs) {
    const hit = expected.find((e) => e.code === d.code && e.side === d.side && e.witness === caseId);
    if (hit) matched.push(hit.id); else unexpected.push(d);
  }
  return { unexpected, matched };
}

/** Every expectation must be WITNESSED somewhere in the corpus, or it is a stale baseline. */
export function staleExpectations(expected, matchedIds) {
  const seen = new Set(matchedIds);
  return expected.filter((e) => !seen.has(e.id));
}

// ── the named expected-divergence set ────────────────────────────────────────
// Delete each entry IN THE SAME COMMIT as the fix that retires it — rule 2 forces this.
const EXPECTED = [
  {
    id: "E1-stageA-double-report",
    code: "FUNGI-EFFECT-007", side: "stageA-only", witness: "unrecognised-declared",
    reason: "Stage-A fault (owner ruling: Stage-A conforms UP): its 007 loop has no registry guard, so an unrecognised declared effect draws 004 from one pass and 007 from another — two diagnostics, one fault. The twin suppresses the duplicate by design.",
  },
  // E2 (the lane-split 007 on declares-and-uses) was PREDICTED here and REFUTED by the
  // harness's own first run: Stage-A ALSO emits 007 on that witness — not from a lane charter
  // but because it never observed the body call at all (see E3). Same code, different cause,
  // and a set comparison is blind to cause — so the prediction was unobservable at this level
  // and is deleted rather than kept as decoration. v1 compares WHAT fires, not WHY; cause-level
  // comparison arrives with per-flow attribution + the reachability graph.
  {
    id: "E3-observation-vocabulary-disjoint",
    code: "FUNGI-EFFECT-001", side: "twin-only", witness: "undeclared-use",
    reason: "The engines disagree about WHAT A BODY DOES before any declaration is compared: the twin's BODY lane derives used effects from its own builtin registry (effectOfCall, effect-checker.fungi:413 — dbRead/dbWrite/auditWrite/...), while Stage-A observes via inferEffectsFromNode (effect-checker.ts:680), which does not know those names (0 hits in effect-checker.ts). On a body calling dbWrite() the twin sees database.write and flags the undeclared use; Stage-A sees nothing and stays silent. Found by this harness's first live run, mechanism verified at source both sides. Resolution belongs to the rework: ONE observation vocabulary, one source of truth.",
  },
];

// ── corpus: each input has ONE job ───────────────────────────────────────────
const CORPUS = [
  { id: "clean-pure", src: "pure flow p(a: Int) -> Int { return a }",
    job: "MATCH control — both engines silent; proves agreement is representable" },
  { id: "pure-declares-effect", src: "pure flow p() -> Int\ncontract { effects { audit.write } } { return 1 }",
    job: "MATCH on a shared code (003) — proves a real diagnostic can agree" },
  { id: "unrecognised-declared", src: "secure flow s() -> Int\ncontract { effects { io } } { return 1 }",
    job: "E1 witness — Stage-A double-reports 004+007; twin emits 004 only" },
  { id: "recognised-unused", src: "secure flow s() -> Int\ncontract { effects { audit.write } } { return 1 }",
    job: "liveness control — 007 from BOTH sides (proves the twin lane emits, so E1's suppression is a choice, not a dead lane)" },
  { id: "declares-and-uses", src: "secure flow s() -> Int\ncontract { effects { audit.write } } { auditWrite() return 1 }",
    job: "SAME-CODE-DIFFERENT-CAUSE exhibit — both emit 007, the twin from its DECL charter, Stage-A because it never observed auditWrite() (E3's vocabulary gap). Reads as a match; a set diff cannot see cause. Kept as the documented limit of v1." },
  { id: "undeclared-use", src: "secure flow s() -> Int\ncontract { effects { audit.write } } { dbWrite() auditWrite() return 1 }",
    job: "E3 witness — twin BODY lane derives database.write from dbWrite() and flags the undeclared use (001); Stage-A's observer does not know the name and misses it" },
];

// ── self-test: every rule paired with a control that must NOT fire ──────────
if (process.argv.includes("--self-test")) {
  const checks = [];
  checks.push(["identical sets -> no diff", diffCodeSets(["A-1"], ["A-1"]).length === 0]);
  const d1 = diffCodeSets(["A-1", "A-2"], ["A-1"]);
  checks.push(["Stage-A-only code detected with its side", d1.length === 1 && d1[0].side === "stageA-only"]);
  const d2 = diffCodeSets(["A-1"], ["A-1", "A-3"]);
  checks.push(["twin-only code detected with its side", d2.length === 1 && d2[0].side === "twin-only"]);

  const exp = [{ id: "X", code: "C", side: "stageA-only", witness: "w1" }];
  checks.push(["an expected divergence is not 'unexpected'",
    classify("w1", [{ code: "C", side: "stageA-only" }], exp).unexpected.length === 0]);
  checks.push(["CONTROL same code, WRONG side stays unexpected",
    classify("w1", [{ code: "C", side: "twin-only" }], exp).unexpected.length === 1]);
  checks.push(["CONTROL same code+side, WRONG witness stays unexpected",
    classify("other", [{ code: "C", side: "stageA-only" }], exp).unexpected.length === 1]);
  checks.push(["a never-witnessed expectation is STALE", staleExpectations(exp, []).length === 1]);
  checks.push(["CONTROL a witnessed expectation is not stale", staleExpectations(exp, ["X"]).length === 0]);

  const sc = scopeToEffectFamily(["FUNGI-EFFECT-004", "FUNGI-TIER-001", "FUNGI-EFFECT-007"]);
  checks.push(["scope keeps the charter family", sc.kept.length === 2]);
  checks.push(["scope REPORTS what it dropped (never silent)", sc.dropped.length === 1 && sc.dropped[0] === "FUNGI-TIER-001"]);
  checks.push(["CONTROL an all-charter list drops nothing", scopeToEffectFamily(["FUNGI-EFFECT-001"]).dropped.length === 0]);

  let pass = 0;
  for (const [n, ok] of checks) { console.log(`  ${ok ? "OK  " : "FAIL"}  ${n}`); if (ok) pass++; }
  console.log(`\ntwin-differential self-test: ${pass}/${checks.length} passed`);
  process.exit(pass === checks.length ? 0 : 1);
}

// ── live run: both engines, one corpus ───────────────────────────────────────
const IS_MAIN = process.argv[1] !== undefined &&
  process.argv[1].replace(/\\/g, "/").endsWith("scripts/audit-twin-differential.mjs");
if (IS_MAIN) {
  const dist = await import(pathToFileURL(join(CC, "dist", "index.js")));
  const { parseProgram, resolveSymbols, checkTypes, executeFlow, checkEffects } = dist;

  // Twin stages load ONCE; subject sources then travel the twin's own front end.
  const loadTwin = (name) => {
    let s = readFileSync(join(CC, "src", "self-hosted", name), "utf8");
    if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
    const p = parseProgram(s, name);
    resolveSymbols(p.ast); checkTypes(p.ast);
    return p;
  };
  const lexer = loadTwin("lexer.fungi");
  const parser = loadTwin("parser.fungi");
  const effectTwin = loadTwin("effect-checker.fungi");

  const vStr = (x) => ({ __tag: "string", value: String(x) });
  const run = (entry, args, twin) =>
    executeFlow(entry, args, twin.ast, twin.flows, undefined, undefined, { pureFastPath: false });

  async function twinCodes(src) {
    const lexRes = await run("tokenize", new Map([["source", vStr(src)]]), lexer);
    let tokens = lexRes.value ?? lexRes;
    if (tokens.__tag === "ok") tokens = tokens.value;
    const parseRes = await run("parseFlows", new Map([["tokens", tokens]]), parser);
    const parsed = parseRes.value ?? parseRes;
    const flows = parsed.fields?.get("flows");
    // Parse-error guard (0449): an empty flow list must be a harness ERROR, never "both
    // engines silent -> match". A diff of two failures is not an agreement.
    if (!flows || flows.__tag !== "list" || flows.items.length === 0) {
      throw new Error("twin parse produced 0 flows — refusing to diff a failed parse");
    }
    const codes = new Set();
    for (const lane of ["checkFlowEffects", "checkBodyEffects"]) {
      const r = await run(lane, new Map([["flows", flows]]), effectTwin);
      const rec = r.value ?? r;
      const d = rec.fields?.get("diagnostics");
      if (d?.__tag === "list") for (const x of d.items) codes.add((x.value ?? x).fields.get("code").value);
    }
    return [...codes];
  }

  function stageACodes(src) {
    const parsed = parseProgram(src, "differential-subject.fungi");
    if (!parsed.flows || parsed.flows.length === 0) {
      throw new Error("Stage-A parse produced 0 flows — refusing to diff a failed parse");
    }
    const results = checkEffects(parsed.flows, parsed.ast);
    return [...new Set(results.flatMap((r) => (r.diagnostics ?? []).map((d) => d.code)))];
  }

  let red = 0;
  const matchedIds = [];
  console.log(`twin-differential: ${CORPUS.length} corpus inputs · both engines · FUNGI-EFFECT-* charter\n`);
  for (const c of CORPUS) {
    let aRaw, tRaw;
    try {
      aRaw = stageACodes(c.src);
      tRaw = await twinCodes(c.src);
    } catch (e) {
      console.log(`  ❌ ${c.id}: HARNESS ERROR — ${e.message}`);
      red++; continue;
    }
    const a = scopeToEffectFamily(aRaw), t = scopeToEffectFamily(tRaw);
    const diffs = diffCodeSets(a.kept, t.kept);
    const { unexpected, matched } = classify(c.id, diffs, EXPECTED);
    matchedIds.push(...matched);
    const scopeNote = a.dropped.length + t.dropped.length > 0
      ? `  [scoped out: ${[...a.dropped, ...t.dropped].join(" ")}]` : "";
    if (unexpected.length === 0) {
      const tag = matched.length > 0 ? `known divergence (${matched.join(", ")})` : "match";
      console.log(`  ✅ ${c.id}: ${tag} — A{${a.kept.sort().join(",")}} T{${t.kept.sort().join(",")}}${scopeNote}`);
    } else {
      console.log(`  ❌ ${c.id}: UNEXPECTED divergence — ${unexpected.map((d) => `${d.code} ${d.side}`).join(" · ")} — A{${a.kept.sort().join(",")}} T{${t.kept.sort().join(",")}}${scopeNote}`);
      red++;
    }
  }

  const stale = staleExpectations(EXPECTED, matchedIds);
  for (const s of stale) {
    console.log(`  ❌ STALE expectation ${s.id}: its divergence no longer occurs — delete it in the fix commit (a baseline that outlives its fault is vacuous)`);
    red++;
  }
  // Non-vacuity: a run in which NOTHING diverged and NOTHING matched an expectation would
  // mean the corpus lost its witnesses — the two E-entries above guarantee ≥2 matches today.
  if (matchedIds.length === 0 && EXPECTED.length > 0 && stale.length === 0) {
    console.log("  ❌ NON-VACUITY: no expectation was exercised and none reported stale — harness is not seeing the corpus it thinks it has");
    red++;
  }

  console.log(`\n${red === 0 ? "✅" : "❌"} twin-differential: ${red} problem(s) · expected-divergence set = ${EXPECTED.length} entries, all named above by id`);
  for (const e of EXPECTED) console.log(`     ${e.id} [${e.code} ${e.side} @ ${e.witness}] — ${e.reason.split(".")[0]}.`);
  process.exit(red === 0 ? 0 : 1);
}
