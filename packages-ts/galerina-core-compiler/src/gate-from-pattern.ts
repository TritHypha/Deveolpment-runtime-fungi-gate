// =============================================================================
// `galerina gate from-pattern` — generate a GateRegex circuit from a bounded
// pattern. Ratified programme order 2 (KTA 35, doc 34 §4).
//
// Description: lowers an explicitly admitted regular subset to ordinary
//   `REQUIRES`/`WIRES` source. The GENERATED TEXT is the artifact — reviewed,
//   committed, and verified by the normal parser/registry/G3/G4 pipeline. No
//   `PATTERN` block enters the grammar (that proposal is REJECTED in
//   GATEREGEX.md §7); this is tooling, not syntax.
//
// ★ THE CONSTRAINT THAT DEFINES THE SUBSET: `.gate` v3 is SINGLE-ASSIGNMENT.
//   `GATE-WIRE-002` refuses any consumer with more than one producer — fan-OUT
//   is admitted, fan-IN is not (measured, cycle 0114). So a drawing cannot
//   CONVERGE: two alternation branches cannot both reach one boundary, and an
//   optional repetition cannot offer a skip edge past its own tail. Those are
//   not oversights in this generator; they are not expressible in the language.
//
//   The same rule is why every refusal needs its OWN terminal reason. That is
//   the shipped house style already (`DENY.not_authorized` beside
//   `DENY.authority_unknown`), and it is strictly more informative: the
//   terminal names WHICH position refused, not merely that something did.
//
// THE ADMITTED SUBSET, v1 — closed, small, and bounded by the above:
//   literals (with common escapes) · \d \w \s · `.` · grouping `( )` ·
//   exact `{n}` repetition. Everything else refuses BY NAME — alternation and
//   optional/bounded-range repetition because they need convergence;
//   backreferences and lookaround because they are not regular; `*`/`+`
//   because they have no finite drawing; bracket classes because they have no
//   canonical name. Unrepresentable beats silently approximated: the one thing
//   this tool must never do is change a pattern's meaning (doc 34 §4).
//
// WHY DRAWABILITY IS THE POINT: a pattern that cannot be expanded finitely is
//   refused, which is GATEREGEX.md §3's ReDoS argument made executable — if it
//   draws, it is linear. Ceilings are applied to the COUNT before the expansion
//   is allocated (GD-006's discipline: measure before recursing into the
//   allocation, not after it happened).
//
// DETERMINISM: output is a pure function of (pattern, name, ceiling). No
//   timestamps, no randomness, part names minted in one canonical walk —
//   byte-identical output for identical input is a tested property, because a
//   generator whose output wobbles poisons every diff review of its artifacts.
// =============================================================================

import { GATE_V3_LIMITS } from "./gate-v3-parser.js";

export type FromPatternResult =
  | {
      readonly ok: true;
      readonly source: string;
      readonly parts: number;
      readonly wires: number;
      /** The DENY reasons the drawing uses — a registry must declare exactly
       *  these, or `GATE-SEM-007` refuses. Returned so a caller building the
       *  contract does not have to re-derive them from the text. */
      readonly reasons: readonly string[];
    }
  | { readonly ok: false; readonly reason: string };

const refuse = (reason: string): FromPatternResult => ({ ok: false, reason });

// ── pattern AST ──────────────────────────────────────────────────────────────
type PatternNode =
  | { readonly kind: "lit"; readonly ch: string }
  | { readonly kind: "class"; readonly name: string }
  | { readonly kind: "seq"; readonly items: readonly PatternNode[] }
  // No `alt` variant, and no `max` on `rep`: both would describe a convergence
  // the language cannot express. Absent from the type, not merely unhandled.
  | { readonly kind: "rep"; readonly item: PatternNode; readonly min: number };

/** Named classes for the admitted escapes. Bracket classes are v1-refused —
 *  a `[a-z]` has no canonical NAME, and inventing one per class would mint
 *  registry vocabulary from inside a generator. */
const CLASS_NAMES: Readonly<Record<string, string>> = Object.freeze({
  d: "digit", w: "word", s: "space",
});
/** Escapes admitted as literal characters. */
const LITERAL_ESCAPES: Readonly<Record<string, string>> = Object.freeze({
  "\\": "\\", ".": ".", "+": "+", "*": "*", "?": "?", "(": "(", ")": ")",
  "[": "[", "]": "]", "{": "{", "}": "}", "|": "|", "^": "^", "$": "$",
  "/": "/", "-": "-", n: "\n", t: "\t", r: "\r",
});

// No `ceiling` field. Doc 34 §4 asked for one, so that `*`/`+` could be
// admitted under an explicit finite bound — but single assignment refuses a
// bounded repetition too (it still needs a skip edge). An option that cannot
// change any outcome is a lie in the interface, so it is not offered. (It also
// carried this file's only `| null`; the ratchet caught the new file and the
// honest fix removed the option rather than the type.)
interface ParseState { text: string; at: number; depth: number }

/** Group nesting bound: the parser's own set-nesting ceiling, reused so the
 *  generator refuses depth the language itself would treat as hostile. */
const MAX_GROUP_DEPTH = GATE_V3_LIMITS.setNesting;

function parseAlternation(s: ParseState): PatternNode | string {
  const first = parseSequence(s);
  if (typeof first === "string") return first;
  if (s.text[s.at] === "|") {
    // Not "unsupported yet" — unrepresentable. Both branches would have to
    // reach one boundary, and a consumer takes one producer (GATE-WIRE-002).
    return "alternation '|' needs two producers to converge on one consumer, which .gate refuses (GATE-WIRE-002, single assignment) — draw each alternative as its own circuit";
  }
  return first;
}

function parseSequence(s: ParseState): PatternNode | string {
  const items: PatternNode[] = [];
  while (s.at < s.text.length) {
    const ch = s.text[s.at]!;
    if (ch === "|" || ch === ")") break;
    const atom = parseAtom(s);
    if (typeof atom === "string") return atom;
    const wrapped = parseQuantifier(s, atom);
    if (typeof wrapped === "string") return wrapped;
    items.push(wrapped);
  }
  return items.length === 1 ? items[0]! : { kind: "seq", items };
}

function parseAtom(s: ParseState): PatternNode | string {
  const ch = s.text[s.at]!;

  if (ch === "(") {
    if (s.text[s.at + 1] === "?") {
      return "'(?…' forms are not admitted — no lookaround, no named or non-capturing groups; grouping is plain '( )'";
    }
    if (s.depth >= MAX_GROUP_DEPTH) return `group nesting exceeds the admitted depth (${MAX_GROUP_DEPTH})`;
    s.at += 1; s.depth += 1;
    const inner = parseAlternation(s);
    s.depth -= 1;
    if (typeof inner === "string") return inner;
    if (s.text[s.at] !== ")") return "unbalanced '(' — the group is never closed";
    s.at += 1;
    return inner;
  }
  if (ch === ")") return "unbalanced ')' — no group is open";
  if (ch === "[") return "bracket classes '[…]' are not admitted in v1 — use the named escapes \\d \\w \\s, literals, or alternation";
  if (ch === "^" || ch === "$") {
    // Whole-input matching is inherent to the drawing (IN is ^, the boundary
    // part is $). At the very ends the anchor is redundant and admitted as
    // documentation; anywhere else it has no finite-drawing meaning.
    const atStart = s.at === 0 && ch === "^";
    const atEnd = s.at === s.text.length - 1 && ch === "$";
    if (atStart || atEnd) { s.at += 1; return { kind: "seq", items: [] }; }
    return "an interior '^' or '$' has no meaning in a whole-input drawing";
  }
  if (ch === "*" || ch === "+" || ch === "?" || ch === "{") {
    return `'${ch}' has nothing to repeat — a quantifier must follow an atom`;
  }
  if (ch === "\\") {
    const next = s.text[s.at + 1];
    if (next === undefined) return "trailing '\\' escapes nothing";
    if (/[1-9]/.test(next)) return "backreferences are not regular — no finite drawing exists (GATEREGEX.md §3)";
    if (next === "b" || next === "B") return "word-boundary assertions are not admitted";
    if (CLASS_NAMES[next]) { s.at += 2; return { kind: "class", name: CLASS_NAMES[next]! }; }
    const literal = LITERAL_ESCAPES[next];
    if (literal !== undefined) { s.at += 2; return { kind: "lit", ch: literal }; }
    return `unknown escape '\\${next}' — unknown escapes refuse rather than guess`;
  }
  if (ch === ".") { s.at += 1; return { kind: "class", name: "any_but_newline" }; }
  s.at += 1;
  return { kind: "lit", ch };
}

function parseQuantifier(s: ParseState, atom: PatternNode): PatternNode | string {
  const ch = s.text[s.at];
  let min: number, max: number;

  // The OPTIONAL family all need the same impossible thing: a skip edge past
  // the optional part, which is a second producer for whatever follows.
  const OPTIONAL_REFUSAL =
    "an optional repetition needs a skip edge, i.e. a second producer for the next consumer, which .gate refuses (GATE-WIRE-002, single assignment) — use exact {n}";

  if (ch === "?") return OPTIONAL_REFUSAL;
  if (ch === "*" || ch === "+") {
    // Two independent reasons; the finite-drawing one is named first because it
    // is the deeper property (GATEREGEX.md §3) and holds in any language.
    return `unbounded '${ch}' has no finite drawing — and even bounded it would need a skip edge .gate refuses`;
  }
  if (ch === "{") {
    const m = /^\{(\d+)(?:,(\d+)?)?\}/.exec(s.text.slice(s.at));
    if (!m) return "malformed '{…}' quantifier";
    min = Number(m[1]);
    if (m[2] !== undefined) {
      max = Number(m[2]);
      if (max !== min) return OPTIONAL_REFUSAL;
    } else if (m[0].includes(",")) {
      return "open-ended '{n,}' has no finite drawing — and a range needs a skip edge .gate refuses";
    } else max = min;
    s.at += m[0].length;
  } else return atom;

  if (s.text[s.at] === "?" || s.text[s.at] === "+") {
    return "lazy and possessive quantifier suffixes are not admitted — greediness is meaningless in a whole-input drawing";
  }
  if (max === 0) return "a {0} repetition matches nothing and draws nothing — remove the atom instead";
  return { kind: "rep", item: atom, min };
}

// ── ceilings BEFORE expansion ────────────────────────────────────────────────
/** Part count of the drawing, computed on the AST before anything is built. */
function countParts(node: PatternNode): number {
  switch (node.kind) {
    case "lit": case "class": return 1;
    case "seq": return node.items.reduce((sum, item) => sum + countParts(item), 0);
    case "rep": return node.min * countParts(node.item);
  }
}

// ── expansion ────────────────────────────────────────────────────────────────
interface Emit {
  parts: string[];
  wires: string[];
  /** Terminal reasons minted, so the generator can print the registry
   *  vocabulary its own output requires (GATE-SEM-007/008). */
  reasons: string[];
  next: number;
}

/**
 * Emit one node. `entry` is the single `node.port` feeding it and the return is
 * the single exit — SINGULAR, not a list, because the language is
 * single-assignment (GATE-WIRE-002) and a list would be a fan-in waiting to
 * happen. The type carries the constraint so a future contributor adding
 * alternation has to change the signature, not merely forget the rule.
 *
 * Each classifier's refusal gets its OWN terminal reason, `no_match_at_N`,
 * which the language requires and which names WHICH position refused.
 */
function emit(node: PatternNode, entry: string, out: Emit): string {
  switch (node.kind) {
    case "lit":
    case "class": {
      const index = out.next++;
      const name = `p${index}`;
      const decl = node.kind === "lit"
        ? `re.literal@1.0.0 value=${JSON.stringify(node.ch)}`
        : `re.class@1.0.0 set={${node.name}}`;
      out.parts.push(`    [${name} :: ${decl}]`);
      out.wires.push(`    ${entry} -> ${name}.subject`);
      out.wires.push(`    ${name}.no -> DENY.no_match_at_${index}`);
      out.reasons.push(`no_match_at_${index}`);
      return `${name}.match`;
    }
    case "seq": {
      let current = entry;
      for (const item of node.items) current = emit(item, current, out);
      return current;
    }
    case "rep": {
      let current = entry;
      for (let i = 0; i < node.min; i += 1) current = emit(node.item, current, out);
      return current;
    }
  }
}

// ── the generator ────────────────────────────────────────────────────────────
const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function generateCircuitFromPattern(
  pattern: string,
  options: { readonly name: string },
): FromPatternResult {
  const { name } = options;

  if (!NAME_RE.test(name)) return refuse(`circuit name '${name}' is not an identifier`);
  if (name.length > GATE_V3_LIMITS.identifier) return refuse("circuit name exceeds the identifier ceiling");
  if (pattern.length === 0) return refuse("an empty pattern draws nothing");
  // Refused HERE, not left to the pipeline: this generator must never emit
  // source it knows cannot parse (GATE-PARSE-003 admits ASCII only).
  if (/[^\x20-\x7E]/.test(pattern)) return refuse("pattern contains non-ASCII — semantic source is ASCII-only (GATE-PARSE-003)");

  const state: ParseState = { text: pattern, at: 0, depth: 0 };
  const ast = parseAlternation(state);
  if (typeof ast === "string") return refuse(ast);
  if (state.at !== pattern.length) return refuse(`unconsumed input at position ${state.at} — likely an unbalanced ')'`);

  // Ceilings BEFORE the expansion is allocated: the boundary part is +1.
  const partCount = countParts(ast) + 1;
  if (partCount > GATE_V3_LIMITS.parts) {
    return refuse(`the drawing needs ${partCount} parts, over the ${GATE_V3_LIMITS.parts} ceiling — lower the bounds; the ceiling is the ReDoS refusal working`);
  }

  const out: Emit = { parts: [], wires: [], reasons: [], next: 1 };
  const exit = emit(ast, "IN.raw", out);
  if (out.parts.length === 0) return refuse("the pattern reduces to nothing — anchors alone draw no circuit");

  const end = "end";
  out.parts.push(`    [${end} :: re.boundary@1.0.0]`);
  out.wires.push(`    ${exit} -> ${end}.subject`);
  out.wires.push(`    ${end}.ok -> OUT.value`);
  out.wires.push(`    ${end}.more -> DENY.trailing_input`);
  out.reasons.push("trailing_input");

  if (out.wires.length > GATE_V3_LIMITS.wires) {
    return refuse(`the drawing needs ${out.wires.length} wires, over the ${GATE_V3_LIMITS.wires} ceiling`);
  }

  // INTENT carries the pattern verbatim (JSON-escaped) — the ONE place it
  // survives as text, as provenance, never as checker input. Deliberately NOT
  // in a `#` comment: a quote inside a comment refuses at parse (learned the
  // hard way, cycle 0096), and a pattern may contain anything printable.
  const intent = JSON.stringify(`Whole-input match of pattern ${pattern} - generated; the drawing is the artifact.`);
  const source = [
    "@gate 3.0.0",
    "# GENERATED by galerina gate from-pattern - regenerate rather than edit.",
    `# parts: ${partCount}`,
    `CIRCUIT ${name}(raw: RawText) -> MatchedText`,
    `  INTENT ${intent}`,
    "  REQUIRES:",
    "  PARTS:",
    ...out.parts,
    "  WIRES:",
    ...out.wires,
    "END",
    "",
  ].join("\n");

  // Byte length via TextEncoder, not Buffer — this module must not assume a
  // Node global, and the source is ASCII-checked above so the two agree anyway.
  if (new TextEncoder().encode(source).length > GATE_V3_LIMITS.fileBytes) {
    return refuse("the generated source exceeds the file-size ceiling");
  }
  return { ok: true, source, parts: partCount, wires: out.wires.length, reasons: Object.freeze([...out.reasons]) };
}
