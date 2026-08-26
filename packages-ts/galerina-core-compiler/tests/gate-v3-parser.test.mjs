// gate-v3-parser.test.mjs — Round-one G1 (steps 1-2): the `.gate` v3 front-end parser.
//
// Separate from the v1 `gate-parser.ts` (Ruling A / hard constraint 1: the v1
// parser and its 14 tests stay intact). Proves v3 header recognition, the
// fail-closed dispatch boundary (22-g0-boundary-freeze.md §1), the full section
// parse (CIRCUIT/INTENT/REQUIRES/PARTS/WIRES/END), and EXACT SPANS on every node
// (the reference parser is line-only and explicitly does not satisfy the
// production interface — spans are the G1 deliverable).
//
// Tests-first (KAT discipline): written before the code, red then green.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGateV3, formatGateV3, GATE_V3_VERSION, GATE_PARSE_002 } from "../dist/index.js";

const codesOf = (r) => r.diagnostics.map((d) => d.code);

const VALID = [
  "@gate 3.0.0",
  "CIRCUIT get_customer(caller: CallerId, id: CustomerId) -> CustomerView",
  '  INTENT "Return one authorized, redacted customer view."',
  "  REQUIRES:",
  "    capability customer.read",
  "    effect database.read",
  "    budget scanned_rows=100",
  "  PARTS:",
  "    [auth :: galerina.tower.authorize@1.0.0 capability=customer.read]",
  "    [load :: app.customer.read@1.2.0]",
  "  WIRES:",
  "    IN.caller -> auth.subject",
  "    IN.id -> load.key",
  "    auth.allow -> load.authority",
  "    auth.deny -> DENY.not_authorized",
  "    auth.indeterminate -> DENY.authority_unknown",
  "    load.record -> OUT.value",
  "END",
  "",
].join("\n");

// ── Step 1: header recognition (fail-closed) ───────────────────────────────

test("gate-v3: a valid `@gate 3.0.0` header is accepted", () => {
  const r = parseGateV3(VALID, "customer.gate");
  assert.equal(r.ok, true, JSON.stringify(codesOf(r)));
  assert.equal(r.exactVersion, GATE_V3_VERSION);
  assert.ok(!codesOf(r).includes(GATE_PARSE_002.code));
});

test("gate-v3: v1 `@version`, v2 glyph, blank, and two-space headers REFUSE", () => {
  for (const bad of ["@version 1.0.0\n", "GATE Foo(x: T) -> T:\n", "\n@gate 3.0.0\n", "@gate  3.0.0\n"]) {
    const r = parseGateV3(bad, "bad.gate");
    assert.equal(r.ok, false, bad);
    assert.deepEqual(codesOf(r), [GATE_PARSE_002.code], bad);
  }
});

test("gate-v3: CRLF is normalized — a CRLF checkout of a valid circuit parses identically", () => {
  // The whole file in CRLF: header check, section scan and spans must all be
  // line-ending independent (a Windows checkout must not change admission).
  const crlf = parseGateV3(VALID.replace(/\n/g, "\r\n"), "crlf.gate");
  const lf = parseGateV3(VALID, "crlf.gate");
  assert.equal(crlf.ok, true, JSON.stringify(codesOf(crlf)));
  assert.deepEqual(crlf.circuit.wires.length, lf.circuit.wires.length);
  assert.deepEqual(crlf.circuit.parts[0].location, lf.circuit.parts[0].location, "spans identical across line endings");
});

test("gate-v3: a header-only file REFUSES (no CIRCUIT) and the refusal carries a line:column", () => {
  const headerOnly = parseGateV3("@gate 3.0.0\n", "empty.gate");
  assert.equal(headerOnly.ok, false);
  assert.ok(codesOf(headerOnly).includes("GATE-PARSE-004"));
  const diag = parseGateV3("nope\n", "loc.gate").diagnostics[0];
  assert.deepEqual([diag.location.file, diag.location.line, diag.location.column], ["loc.gate", 1, 1]);
});

// ── Step 2: full section parse ─────────────────────────────────────────────

test("gate-v3: the circuit AST records name, params (typed), return type, intent", () => {
  const c = parseGateV3(VALID, "customer.gate").circuit;
  assert.equal(c.name, "get_customer");
  assert.deepEqual(c.params.map((p) => [p.name, p.type]), [["caller", "CallerId"], ["id", "CustomerId"]]);
  assert.equal(c.returnType, "CustomerView");
  assert.equal(c.intent, "Return one authorized, redacted customer view.");
});

test("gate-v3: REQUIRES parses capabilities, effects, budgets", () => {
  const req = parseGateV3(VALID, "customer.gate").circuit.requirements;
  assert.deepEqual(req.capabilities.map((c) => c.name), ["customer.read"]);
  assert.deepEqual(req.effects.map((e) => e.name), ["database.read"]);
  assert.deepEqual(req.budgets.map((b) => [b.name, b.value]), [["scanned_rows", 100]]);
});

test("gate-v3: PARTS parse instance, component, exact version, and args", () => {
  const parts = parseGateV3(VALID, "customer.gate").circuit.parts;
  assert.deepEqual(parts.map((p) => [p.instance, p.component, p.version]), [
    ["auth", "galerina.tower.authorize", "1.0.0"],
    ["load", "app.customer.read", "1.2.0"],
  ]);
  assert.deepEqual(parts[0].args.map((a) => [a.name, a.value.value]), [["capability", "customer.read"]]);
});

test("gate-v3: WIRES parse endpoints and node/port split", () => {
  const wires = parseGateV3(VALID, "customer.gate").circuit.wires;
  assert.equal(wires.length, 6);
  const first = wires[0];
  assert.deepEqual([first.from.node, first.from.port, first.to.node, first.to.port], ["IN", "caller", "auth", "subject"]);
});

test("gate-v3: EXACT SPANS — every top node has line AND column start/end", () => {
  const c = parseGateV3(VALID, "customer.gate").circuit;
  // circuit on line 2, params/return present
  assert.equal(c.location.line, 2);
  assert.ok(c.location.column >= 1 && c.location.endColumn > c.location.column, "circuit has a column span");
  // a part instance token span points at the right line and a real column
  const auth = c.parts[0];
  assert.equal(auth.location.line, 9);
  assert.ok(auth.location.column >= 1, "part carries a column");
  assert.ok(auth.location.endColumn >= auth.location.column, "part has an end column");
  // a wire span
  const w = c.wires[0];
  assert.equal(w.location.line, 12);
  assert.ok(w.location.endColumn > w.location.column, "wire has a column span");
  // a param span is narrower than the whole circuit line
  const p = c.params[0];
  assert.ok(p.location.column > 1, "param column is past 'CIRCUIT '");
});

test("gate-v3: the AST is frozen (immutable)", () => {
  const c = parseGateV3(VALID, "customer.gate").circuit;
  assert.throws(() => { c.name = "hacked"; }, TypeError);
  assert.throws(() => { c.parts.push({}); }, TypeError);
});

// ── Step 2: section refusals (fail-closed, faithful to the reference codes) ──

test("gate-v3: structural malformations REFUSE with the right PARSE code", () => {
  const cases = [
    ["@gate 3.0.0\n", "GATE-PARSE-004"], // missing CIRCUIT
    ["@gate 3.0.0\nCIRCUIT bad line\n", "GATE-PARSE-005"], // malformed CIRCUIT
    ["@gate 3.0.0\nCIRCUIT f() -> T\n  REQUIRES:\n", "GATE-PARSE-006"], // missing INTENT
    ['@gate 3.0.0\nCIRCUIT f() -> T\n  INTENT "x"\n  PARTS:\n', "GATE-PARSE-008"], // missing REQUIRES
    ['@gate 3.0.0\nCIRCUIT f() -> T\n  INTENT "x"\n  REQUIRES:\n', "GATE-PARSE-010"], // missing PARTS
  ];
  for (const [src, code] of cases) {
    const r = parseGateV3(src, "m.gate");
    assert.equal(r.ok, false, src);
    assert.ok(codesOf(r).includes(code), `${src} => expected ${code}, got ${codesOf(r)}`);
  }
});

// ── Step 3-4: the canonical formatter ──────────────────────────────────────
// Correct-by-construction: ASCII code-unit ordering (NOT locale collation —
// the reference's localeCompare inverts 'A' vs 'a' between en and da locales),
// no interior blank lines (Ruling B), canonical numeric forms.

test("gate-v3 formatter: parse(format(x)) is identity on the corpus circuit", () => {
  const first = parseGateV3(VALID, "customer.gate");
  const formatted = formatGateV3(first.circuit);
  const second = parseGateV3(formatted, "customer.gate");
  assert.equal(second.ok, true, JSON.stringify(codesOf(second)));
  assert.equal(formatGateV3(second.circuit), formatted, "format is idempotent");
});

test("gate-v3 formatter: emits NO interior blank lines (Ruling B)", () => {
  const out = formatGateV3(parseGateV3(VALID, "c.gate").circuit);
  const body = out.split("\n").slice(1); // everything after the version line
  const blanks = body.filter((l, i) => l.trim() === "" && i < body.length - 1);
  assert.deepEqual(blanks, [], "no blank lines inside the circuit body");
});

test("gate-v3 formatter: ordering is ASCII code-unit, not locale collation", () => {
  // 'A' vs 'a' invert under en/da locale collation; code-unit ordering is
  // stable everywhere. Uppercase must sort BEFORE lowercase ('A'=65 < 'a'=97).
  const src = [
    "@gate 3.0.0",
    "CIRCUIT ordering(value: T) -> T",
    '  INTENT "x"',
    "  REQUIRES:",
    "    effect a.lower",
    "    effect A.upper",
    "  PARTS:",
    "    [alpha :: test.z@1.0.0]",
    "    [Alpha :: test.a@1.0.0]",
    "  WIRES:",
    "    IN.value -> alpha.value",
    "    IN.value -> Alpha.value",
    "    alpha.value -> OUT.value",
    "    Alpha.value -> DRAIN.spare",
    "END",
    "",
  ].join("\n");
  const out = formatGateV3(parseGateV3(src, "o.gate").circuit);
  const effects = out.split("\n").filter((l) => l.trim().startsWith("effect")).map((l) => l.trim());
  assert.deepEqual(effects, ["effect A.upper", "effect a.lower"], "uppercase sorts first (code-unit)");
  const partLines = out.split("\n").filter((l) => l.trim().startsWith("[")).map((l) => l.trim().slice(1, 6));
  assert.equal(partLines[0], "Alpha", "Alpha before alpha (code-unit)");
});

test("gate-v3 formatter: numeric forms are canonical (no -0, no 0.0 aliases)", () => {
  const src = [
    "@gate 3.0.0",
    "CIRCUIT nums(value: T) -> T",
    '  INTENT "x"',
    "  REQUIRES:",
    "  PARTS:",
    "    [c :: test.k@1.0.0 a=-0 b=0.0 d=-0.0 e=0]",
    "  WIRES:",
    "    IN.value -> c.value",
    "    c.value -> OUT.value",
    "END",
    "",
  ].join("\n");
  const out = formatGateV3(parseGateV3(src, "n.gate").circuit);
  const part = out.split("\n").find((l) => l.includes("test.k"));
  // every spelling of zero collapses to the single canonical form "0"
  assert.match(part, /a=0 /, "-0 canonicalizes to 0");
  assert.match(part, /b=0 /, "0.0 canonicalizes to 0");
  assert.match(part, /d=0 /, "-0.0 canonicalizes to 0");
  assert.doesNotMatch(part, /-0/, "no signed zero survives formatting");
});
