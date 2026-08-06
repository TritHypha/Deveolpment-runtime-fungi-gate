// ============================================================================
// galerina-devtools-hypha — src/namesets.mjs
//
// NOT VENDORED. `src/extract.mjs` is a mechanical transform of upstream hypha
// and must never be hand-edited (see README, Provenance). This module is local
// to the devtool and adds one fact family the upstream extractor does not have.
//
// WHY THIS EXISTS. `extractKindSets` collects sets whose members are PARSER
// KINDS. That is the right shape for the drift it was built for, and it is
// structurally unable to see a different, equally real one:
//
//   const DECLASSIFIER_NAMES = new Set(["redact", "seal", "encrypt"]);
//   …
//   node.value === "redact"          // isRedactCall
//   node.value === "seal" || node.value === "encrypt"   // isSealCall
//   node.value === "constantTimeEquals"                 // ← tested, NOT in the set
//
// The set enumerates the names one guard defends; the inline comparisons
// enumerate the names the code actually recognises. When the second list is
// longer, the guard has a hole — and the only thing keeping them in step is a
// comment asking a human to remember.
//
// This module extracts both lists so a query can compare them.
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import { distFiles, distDir } from "./extract.mjs";

/**
 * A `new Set([...])` whose members are string literals.
 *
 * THE DECLARATOR IS OPTIONAL AND `:` IS ACCEPTED. A formatting fixture (tests) showed three legal
 * forms this pattern used to miss: a bare assignment `X = new Set([…])`, an object property
 * `{ kinds: new Set([…]) }`, and — the one that would have hurt — single-quoted members. None of
 * the three currently carries a flow-kind vocabulary in this corpus, so widening changed no
 * finding; it is insurance against repeating WP100, where four real gates were invisible for no
 * reason but formatting. This corpus is compiled JS, so there are no TypeScript type annotations
 * to step around.
 */
const SET_DECL = /(?:(?:const|let|var)\s+)?([A-Za-z_$][\w$]*)\s*[=:]\s*new Set\(\s*\[([^\]]*)\]/g;
/**
 * The SAME vocabulary, written as an array or a frozen array.
 *
 * WHY THIS SHAPE MATTERS. `effect-checker.ts`'s own `findFlowNode` declares its flow kinds as
 *   const kinds: AstNodeKind[] = ["flowDecl", "secureFlowDecl", "pureFlowDecl", "guardedFlowDecl"]
 * and every census that looked for `new Set([...])` — including this tool's `kind-coverage` —
 * walked straight past it. A vocabulary does not stop being a vocabulary because of the brackets
 * around it, and a detector that keys on syntax rather than meaning will always be one shape
 * behind the code.
 */
const ARRAY_DECL = /(?:(?:const|let|var)\s+)?([A-Za-z_$][\w$]*)\s*[=:]\s*(?:Object\.freeze\(\s*)?\[([^\]]*)\]/g;
/** Any `=== "literal"` comparison. The receiver is captured so a query can tell
 *  `.value === "x"` (a NAME test) from `.kind === "x"` (a KIND test). */
const COMPARISON = /([A-Za-z_$][\w$.?\[\]]*)\s*===\s*"([^"]+)"/g;
/**
 * String literals inside a bracketed list, in EITHER quote style.
 *
 * `dist/` carries 88 single-quoted identifiers across 16 files. None of them is currently inside a
 * flow-kind collection — but a double-quote-only matcher makes that a matter of luck rather than
 * of coverage, and luck is what WP100 was about.
 */
const STRINGS = /"([^"]*)"|'([^']*)'/g;

/**
 * Every string-literal Set in the scanned tree.
 * @returns {{name:string,file:string,line:number,members:string[]}[]}
 */
export function extractNameSets(root) {
  const out = [];
  for (const { file, text } of readAll(root)) {
    const lines = text.split(/\r?\n/);
    for (const [re, shape] of [[SET_DECL, "set"], [ARRAY_DECL, "array"]]) {
      for (const m of text.matchAll(re)) {
        // STRINGS has two capture groups (double-quoted, single-quoted); take whichever matched.
        const members = [...m[2].matchAll(STRINGS)].map((s) => s[1] ?? s[2]).filter(Boolean);
        // A collection with no string members is some other kind of collection — skip it
        // rather than record an empty fact that every query then has to guard against.
        if (members.length === 0) continue;
        out.push({ name: m[1], file, line: lineOf(text, m.index, lines), members, shape });
      }
    }
  }
  return out;
}

/**
 * The subset of the above whose members are flow kinds — the same fact shape
 * `extractKindSets` produces, so the bin can merge them into `facts.kindSets`
 * and `kind-coverage` / `duplicate-sets` gain the array-form sites for free.
 *
 * The kind list is a PARAMETER, not a constant here: the caller passes the
 * parser's own kinds, so this cannot drift from what the parser can produce —
 * which is the defect the whole tool exists to find.
 */
export function extractKindCollections(root, parserKinds, alreadySeen = []) {
  const known = new Set(parserKinds ?? []);
  if (known.size === 0) return [];   // no reference set ⇒ no claim; see kind-coverage's vacuity note
  // The vendored extractor is LINE-BASED (its README says so), so it sees
  //     const FLOW_KINDS = new Set(["flowDecl", …]);
  // and misses
  //     const FLOW_KINDS = new Set([
  //       "flowDecl",
  //       …
  //     ]);
  // Four real gating sets were invisible for exactly that reason — event-checker,
  // naming-policy-checker and symbol-resolver among them, each used as `.has(node.kind)`.
  // The regexes here span lines, so BOTH shapes are returned and the caller de-duplicates
  // against what the vendored pass already found. Formatting is not a property of meaning.
  const seen = new Set(alreadySeen.map((c) => `${c.file}:${c.line}`));
  return extractNameSets(root)
    // DISTINCT kinds, for the reason nameSetDrift's filter 0 gives: a repeated member is a
    // sequence position, not a second vocabulary entry.
    .filter((c) => new Set(c.members.filter((m) => known.has(m))).size >= 2)
    .filter((c) => !seen.has(`${c.file}:${c.line}`))
    .map((c) => ({ file: c.file, line: c.line, members: c.members, name: c.name, shape: c.shape }));
}

/**
 * Every `=== "literal"` comparison, with the receiver expression that was tested.
 * @returns {{receiver:string,literal:string,file:string,line:number}[]}
 */
export function extractNameComparisons(root) {
  const out = [];
  for (const { file, text } of readAll(root)) {
    const lines = text.split(/\r?\n/);
    for (const m of text.matchAll(COMPARISON))
      out.push({ receiver: m[1], literal: m[2], file, line: lineOf(text, m.index, lines) });
  }
  return out;
}

/**
 * Read every scanned file once. `distFiles` yields BASE NAMES, so they must be
 * joined to `distDir` — the first version of this function read the bare names,
 * every read threw ENOENT, and a `catch { continue }` turned 90 failures into a
 * confident "0 sets examined, none drifted".
 *
 * FAIL CLOSED. Reading nothing is not the same as there being nothing, and the
 * difference is invisible downstream: both produce an empty findings list and
 * exit 0. So an empty read THROWS rather than returning `[]`. The tool's own
 * Known Limits records the same failure for `kind-coverage`, which went vacuous
 * on a reference set of one and read exactly like a clean result.
 */
function readAll(root) {
  const dir = distDir(root);
  const names = distFiles(root);
  const out = [];
  let unreadable = 0;
  for (const name of names) {
    // Tolerate an absolute path too, so this survives a change upstream.
    const full = path.isAbsolute(name) ? name : path.join(dir, name);
    try { out.push({ file: path.basename(full), text: fs.readFileSync(full, "utf8") }); }
    catch { unreadable++; }
  }
  if (out.length === 0) {
    throw new Error(
      `namesets: read 0 of ${names.length} file(s) under ${dir} ` +
      `(${unreadable} unreadable) — refusing to report a clean result from an empty corpus`);
  }
  return out;
}

/** 1-indexed line for a character offset. */
function lineOf(text, index, lines) {
  let n = 0, seen = 0;
  while (n < lines.length && seen + lines[n].length + 1 <= index) { seen += lines[n].length + 1; n++; }
  return n + 1;
}
