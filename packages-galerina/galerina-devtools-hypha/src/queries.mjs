// ============================================================================
// galerina-devtools-hypha — src/queries.mjs
//
// The value layer: the four drift/coverage questions, answered over PLAIN
// FACT OBJECTS.
//
// WHY NO DATABASE. The upstream hypha keeps its facts in SQLite because they
// must PERSIST — so a later run can diff against an earlier one, and so the
// companion `sporeprint` tool can write its execution-verified matrix into the
// same file and be joined against static visibility. Neither reason applies to
// a throwaway command-line scan: there is nothing to diff and nothing to join.
// Carrying the database anyway would mean a Node ≥22.5 floor, a file to load,
// and a `.db` left behind — the three things that make a tool something you
// have to set up rather than something you just run.
//
// So the passive lane drops it. These functions take the fact object straight
// from the extractor. Same questions, same answers, no state.
//
// Each query exists because a real defect of its class was found by hand first;
// the incident is named in each doc comment so nobody has to guess what the
// query is protecting.
// ============================================================================

/** Members of a set, normalised to a comparable signature. */
const sig = (members) => [...members].sort().join(",");

/**
 * duplicateSets — sentinel sets that were hand-copied and then drifted.
 *
 * THE INCIDENT: `FLOW_KINDS` existed at four sites. The parser gained
 * `governedFlowDecl`; one copy was updated and the others were not, so governed
 * flows were skipped by checkers and unrunnable by the flow index.
 *
 * Reports two things, which are different problems:
 *   drift      — sets overlapping by ≥3 members with DIFFERENT membership.
 *                A near-identical pair is the signature of a copy that moved on.
 *   duplicates — sets with IDENTICAL membership at more than one site. Not yet
 *                a defect; a consolidation target, and a drift waiting to happen.
 */
export function duplicateSets(facts) {
  const list = facts.kindSets.map((s) => ({ file: s.file, line: s.line, members: s.members, sig: sig(s.members) }));
  const drift = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const A = new Set(list[i].members), B = new Set(list[j].members);
      const overlap = [...A].filter((x) => B.has(x));
      // Three shared members is the threshold at which two sets are plausibly
      // the same intent rather than a coincidence. Below it the pairing is noise.
      if (overlap.length >= 3 && list[i].sig !== list[j].sig) {
        drift.push({
          a: `${list[i].file}:${list[i].line}`,
          b: `${list[j].file}:${list[j].line}`,
          onlyA: [...A].filter((x) => !B.has(x)),
          onlyB: [...B].filter((x) => !A.has(x)),
        });
      }
    }
  }
  const bySig = new Map();
  for (const s of list) {
    if (!bySig.has(s.sig)) bySig.set(s.sig, []);
    bySig.get(s.sig).push(`${s.file}:${s.line}`);
  }
  const duplicates = [...bySig.entries()]
    .filter(([, sites]) => sites.length > 1)
    .map(([members, sites]) => ({ members: members.split(","), sites }));
  return { drift, duplicates };
}

/**
 * kindCoverage — AST kinds the parser can produce that a gating set omits.
 *
 * THE INCIDENT: the parser gained `governedFlowDecl` and every gating set
 * silently ignored it. Nothing failed; the new kind simply was not checked.
 * This is negative space, so no test could have noticed its absence.
 *
 * Only sets that already contain at least one parser kind are judged — a set of
 * unrelated string constants is not a gating set and reporting it would be noise.
 */
export function kindCoverage(facts) {
  const parserKinds = new Set(facts.parserKinds);
  const gaps = [];
  for (const s of facts.kindSets) {
    const members = new Set(s.members);
    const known = [...members].filter((m) => parserKinds.has(m));
    if (known.length === 0) continue;   // not a gating set — skip, do not report
    const missing = [...parserKinds].filter((k) => !members.has(k));
    if (missing.length) gaps.push({ site: `${s.file}:${s.line}`, has: known.length, missing });
  }
  return { parserKindCount: parserKinds.size, gaps };
}

/**
 * deadExports — checkers that are exported and never called.
 *
 * THE INCIDENT: `checkEvents` was implemented, exported and imported — and
 * called by nothing, so `FUNGI-EVENT-001` was unreachable from the package CLI
 * in every mode. A fully-built gate that never runs is a fail-open wearing the
 * costume of a feature.
 *
 * NOTE ON OVERLAP, stated rather than hidden: Galerina already ships
 * `scripts/audit-checker-wiring.mjs`, which does this more thoroughly (it knows
 * the pipeline's call graph, not just call-site counts). This query is kept for
 * completeness of the map, and it is NOT the reason to run this tool.
 */
export function deadExports(facts) {
  const dead = [];
  for (const c of facts.exportedCheckers) {
    const sites = facts.checkerCallSites[c.name] ?? [];
    if (sites.length === 0) dead.push({ name: c.name, definedAt: `${c.file}:${c.line}`, isChecker: !!c.isChecker });
  }
  return { exported: facts.exportedCheckers.length, dead };
}

/**
 * surface — where a method name is visible, LAYER BY LAYER.
 *
 * THE INCIDENT: `.push()` was judged absent because only the interpreter's
 * inline fallback table was read. It was in the gate list the whole time. One
 * layer was mistaken for the whole surface.
 *
 * This is the query with no equivalent anywhere in Galerina's 163 scripts:
 * `STD_METHOD_NAMES` and the per-receiver inline fallback tables are read by
 * nothing else. Answering "is X supported?" from any single layer is how that
 * incident happened, and the only defence is to show all of them at once.
 *
 * Called with no name, it returns every name that is visible in some layers and
 * absent from others — the asymmetries, which are where the surprises live.
 */
export function surface(facts, name) {
  const gate = new Map(facts.gateList.names.map((n) => [n.name, n]));
  const stdlib = new Map(facts.stdlibCases.map((c) => [c.name, c]));
  // A table the extractor could not attribute to a receiver is NOT evidence that a name is
  // dispatched — it is evidence that a switch exists. `interpreter.js` alone holds two switches
  // that are not dispatch: a `safeDisplay` value-kind formatter (3019-3044) and the string-escape
  // decoder (3215-3218, where `case "0": return "\0"` produced a "method" named "0"). Counting
  // them put 25 names in TWO layers when they are in one — a false PRESENCE, which is the
  // `.push()` incident inverted and harder to catch, because a false absence prompts a look and a
  // false presence closes one. Fail closed: unattributed contributes nothing to the union.
  const attributed = facts.inlineTables.filter((t) => t.receiverTag !== "unresolved");
  const unattributed = facts.inlineTables.filter((t) => t.receiverTag === "unresolved");
  const inline = new Map();
  for (const t of attributed) {
    for (const c of t.cases) {
      if (!inline.has(c.name)) inline.set(c.name, []);
      inline.get(c.name).push({ receiver: t.receiverTag, at: `${t.file}:${c.line}` });
    }
  }
  const describe = (n) => ({
    name: n,
    gateList: gate.has(n) ? { section: gate.get(n).section, at: `line ${gate.get(n).line}` } : null,
    stdlibArm: stdlib.has(n) ? `${stdlib.get(n).file}:${stdlib.get(n).line}` : null,
    inlineTables: inline.get(n) ?? [],
    layers: (gate.has(n) ? 1 : 0) + (stdlib.has(n) ? 1 : 0) + (inline.has(n) ? 1 : 0),
  });
  if (name) return describe(name);
  const all = new Set([...gate.keys(), ...stdlib.keys(), ...inline.keys()]);
  const asymmetric = [...all].map(describe).filter((d) => d.layers > 0 && d.layers < 3);
  return {
    total: all.size,
    asymmetric: asymmetric.sort((a, b) => a.layers - b.layers || a.name.localeCompare(b.name)),
    // Uncertainty gets a FIELD, not a footnote. Dropping these tables silently would discard the
    // one thing the extractor got right — it knew it could not attribute them. A switch sitting
    // beside real dispatch is worth a human glance; it is a lead, not evidence, so it is context
    // and contributes nothing to the finding count.
    unattributedSwitches: unattributed.map((t) => ({ at: `${t.file}:${t.line}`, cases: t.cases.length })),
  };
}

/**
 * nameSetDrift — a guard list that enumerates fewer names than the code recognises.
 *
 * THE INCIDENT: `DECLASSIFIER_NAMES = new Set(["redact","seal","encrypt"])` names the
 * declassifiers one security floor defends. The value-state checker also short-circuits on
 * `node.value === "constantTimeEquals"`, a fourth declassifier that never reached the set. The
 * floor therefore did not cover it — in any tier — and the only thing holding the two lists
 * together was a comment asking a human to keep them in sync.
 *
 * THE SIGNAL, and the two filters that make it readable. Both were added because the first
 * version was unusable, and each removes a specific false-positive shape:
 *
 *   1. SAME RECEIVER, not merely same file. A guard list and the tests it must cover are read
 *      off the SAME FIELD. All four declassifiers are tested through `node.value`. Scoping by
 *      file alone paired `PRODUCTION_STRICTNESS_MODES` (tested via `mode`) with every unrelated
 *      literal in a thousand-line cli.js — `d.severity`, `d.code`, `target`, twenty-eight of
 *      them. Same file is a coincidence; same receiver is a relationship.
 *
 *   2. AT LEAST TWO MEMBERS. A one-member set is not an enumeration, and it matches any receiver
 *      that happens to test its single value, so it pairs with everything downstream of it.
 *
 * Then: EVERY member of the set must appear among that receiver's literals. Full overlap is what
 * establishes that the set and the tests are about one vocabulary, before any gap is reported.
 *
 *   uncovered — literals tested through the same receiver that the set omits. THE FINDING.
 *   unused    — set members never tested through it. Context, not a finding: consumption
 *               elsewhere is normal and says nothing about coverage here.
 */
/** A literal that could plausibly be a member of a set of names. */
const IDENTIFIER = (s) => /^[A-Za-z_$][\w$]*$/.test(s);

export function nameSetDrift(facts) {
  const sets = facts.nameSets ?? [];
  const comparisons = facts.nameComparisons ?? [];
  // key: file + "\u0000" + receiver
  const byFileReceiver = new Map();
  for (const c of comparisons) {
    const k = c.file + "\u0000" + c.receiver;
    if (!byFileReceiver.has(k)) byFileReceiver.set(k, []);
    byFileReceiver.get(k).push(c);
  }
  const uncovered = [], unused = [];
  let considered = 0;
  for (const raw of sets) {
    // FILTER 0: a vocabulary is a SET. `params: ["i32", "i32", "i32"]` is a WASM function
    // signature — three copies of one value — and it slipped past the majority filter because
    // three members outnumbered two extras. Counted as DISTINCT members it has one, and a
    // one-member collection is not an enumeration. A list with repeats is a sequence.
    const s = { ...raw, members: [...new Set(raw.members)] };
    if (s.members.length < 2) continue;          // filter 2
    considered++;
    for (const [k, group] of byFileReceiver) {
      const [file, receiver] = k.split("\u0000");
      if (file !== s.file) continue;             // filter 1
      // FILTER 3: identifier-shaped literals only. A guard list of call names can only be
      // MISSING a call name. `node.value` in the value-state checker is tested against ten
      // literals — three declassifiers, one more declassifier, and six that are operators,
      // node markers and type words (`==`, `!=`, `+`, `#record`, `#record-update`, `string`).
      // Comparing against those inflates the gap with things no set of verbs could contain.
      // This is a shape rule, not a tuned threshold.
      const literals = new Set(group.map((c) => c.literal).filter(IDENTIFIER));
      if (!s.members.every((m) => literals.has(m))) continue;
      const extra = [...literals].filter((l) => !s.members.includes(l));
      // FILTER 3: the set must be the MAJORITY of the vocabulary tested through this field, or it
      // is not that field's guard list. No tunable constant — covered must simply exceed missed.
      // `CONTRACT_SECTIONS` (27 members) is tested through `tok.value` alongside a hundred other
      // parser literals; it enumerates contract sections, not everything a token can be. The
      // declassifier set covers three of four and misses one, which is what a guard list with a
      // hole looks like.
      if (extra.length >= s.members.length) continue;
      if (extra.length) {
        uncovered.push({
          set: s.name,
          at: `${s.file}:${s.line}`,
          receiver,
          members: s.members,
          missing: extra.map((lit) => {
            const site = group.find((c) => c.literal === lit);
            return { literal: lit, at: `${site.file}:${site.line}`, receiver };
          }).sort((a, b) => a.literal.localeCompare(b.literal)),
        });
      }
      const never = s.members.filter((m) => !literals.has(m));
      if (never.length) unused.push({ set: s.name, at: `${s.file}:${s.line}`, receiver, never });
    }
  }
  return {
    uncovered: uncovered.sort((a, b) => a.at.localeCompare(b.at)),
    unused,
    setsExamined: considered,
  };
}

/** The queries a `--scan <target>` may name, in report order. */
export const QUERIES = {
  "duplicate-sets": duplicateSets,
  "kind-coverage": kindCoverage,
  "dead-exports": deadExports,
  "surface": surface,
  "name-set-drift": nameSetDrift,
};
