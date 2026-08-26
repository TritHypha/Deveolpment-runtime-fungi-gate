#!/usr/bin/env node
// write-gate-code-reference.mjs — generate docs/examples/gate/CODES.md, the
// complete `.gate` diagnostic catalogue, FROM SOURCE.
//
// WHY GENERATED. An audit (cycle 0111) found 47 of 96 GATE-* codes absent from
// the shipped gate docs. RULES.md is the right home for the fail-closed
// INVARIANTS — each with its reasoning — but it was also the only catalogue, so
// every code without an essay was a code an author could hit and not look up.
// A hand-written catalogue would drift again the day a code lands without a
// docs edit; this one is derived from the same source the compiler compiles,
// and a test (gate-v3-code-reference.test.mjs) fails if the committed file
// does not match a fresh generation. Fix and detector, one unit.
//
// The source of truth is deliberately the DECLARATION SITE: the object literals
// carrying `code:`/`name:`/`message:` (and the registry's code map). Messages
// that interpolate at emit time appear here with their static prefix.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, "..", "src");
const OUT = resolve(HERE, "..", "..", "..", "docs", "examples", "gate", "CODES.md");

/** Every GATE-* code declared in the compiler source, with name and message
 *  where the declaration carries them adjacently. */
export function collectGateCodes() {
  const codes = new Map();
  for (const entry of readdirSync(SRC, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    const text = readFileSync(join(SRC, entry.name), "utf8");

    // Shape 1: { code: "GATE-X-001", name: "…", message: "…" } — multiline OK.
    for (const m of text.matchAll(
      /code:\s*"(GATE-[A-Z]+-\d+)"\s*,\s*name:\s*"([^"]+)"\s*(?:,\s*message:\s*"((?:[^"\\]|\\.)*)")?/g,
    )) {
      const [, code, name, message] = m;
      if (!codes.has(code)) codes.set(code, { code, name, message: message ?? "", file: entry.name });
    }
    // Shape 2: bare string mentions establish existence even with no adjacent
    // name (e.g. codes built in maps) — recorded so the catalogue is COMPLETE,
    // with the declaring file as the pointer when no message is available.
    for (const m of text.matchAll(/"(GATE-[A-Z]+-\d+)"/g)) {
      if (!codes.has(m[1])) codes.set(m[1], { code: m[1], name: "", message: "", file: entry.name });
    }
  }
  return codes;
}

const TIER_ORDER = ["PARSE", "REGISTRY", "RESOLVE", "WIRE", "TERM", "AUTH", "LIVE", "EFFECT", "SEM", "ADMIT", "INTERNAL"];
const TIER_BLURB = {
  PARSE: "Tier 1 — syntax. The literal `@gate 3.0.0` header, block order, part/wire grammar, and the GD-006 input ceilings (`GATE_V3_LIMITS`).",
  REGISTRY: "Tier 2a — the component registry. Closed-schema validation of contracts BEFORE any normalisation; a malformed entry never reaches a downstream check.",
  RESOLVE: "Tier 2b — resolution of a circuit against its registry: components exist at the pinned version, required inputs are wired, declared decision arms are routed.",
  WIRE: "Tier 2c — exact nominal wire typing. No generics, no implicit conversion; `GATE-WIRE-101` is the type wall.",
  TERM: "Tier 3a — termination: a part-to-part cycle always refuses. TERM-003 (unbounded) unless some STEP of the cycle has every parallel wire bounded, then TERM-004 (annotated as bounded, pending a registered state contract and termination proof). SEMANTICS §4.",
  AUTH: "Tier 3b — K3 authority shape: three-valued deciders route allow/deny/indeterminate exhaustively.",
  LIVE: "Tier 3c — liveness: every part reachable from IN, every terminal reachable.",
  EFFECT: "Tier 4a — the effect envelope at the circuit boundary.",
  SEM: "Tier 5 — the semantic passes over the GateGraph: privacy domination and separation (002/003), decision shape (004), construction (005), budgets (006), vocabularies (007/008), envelope (009/010), deny-arm containment (011), canonical effect names (012), taint-to-sink (013), zone domination (014).",
  ADMIT: "Tier 6 — G7 admission: building the statement an admission envelope signs over. Construction fails closed on any missing binding; the verdict is computed, never accepted as input. NOTE the G4 capability envelope (SEM-009/010) is a different surface — same word, different job.",
  INTERNAL: "The fail-closed backstop: a host exception surfaced as a diagnostic rather than a crash.",
};

export function renderReference(codes) {
  const byTier = new Map();
  for (const item of codes.values()) {
    const tier = item.code.split("-")[1];
    if (!byTier.has(tier)) byTier.set(tier, []);
    byTier.get(tier).push(item);
  }

  const lines = [
    "# `.gate` diagnostic codes — the complete catalogue",
    "",
    "**GENERATED FILE — do not edit by hand.** Regenerate with:",
    "",
    "```bash",
    "node packages-ts/galerina-core-compiler/scripts/write-gate-code-reference.mjs",
    "```",
    "",
    "Derived from the compiler source declaration sites; a test fails if this",
    "file drifts from a fresh generation. [RULES.md](RULES.md) holds the",
    "invariants with their reasoning — this file answers the narrower question",
    "*\"what does this code mean?\"* for **every** code, including the ones too",
    "mechanical to earn an essay.",
    "",
    "A message shown with `…` interpolates detail at emit time; the static part",
    "is what is searchable here.",
    "",
  ];

  let total = 0;
  for (const tier of TIER_ORDER) {
    const items = byTier.get(tier);
    if (!items) continue;
    items.sort((a, b) => (a.code < b.code ? -1 : 1));
    total += items.length;
    lines.push(`## GATE-${tier}-* (${items.length})`, "", TIER_BLURB[tier] ?? "", "", "| code | name | message |", "|---|---|---|");
    for (const item of items) {
      const message = item.message ? item.message.replace(/\\"/g, '"').replace(/\|/g, "\\|") : `*(declared in \`${item.file}\`; message assembled at emit site)*`;
      lines.push(`| \`${item.code}\` | ${item.name ? `\`${item.name}\`` : "—"} | ${message} |`);
    }
    lines.push("");
  }
  for (const [tier, items] of byTier) {
    if (TIER_ORDER.includes(tier)) continue;
    items.sort((a, b) => (a.code < b.code ? -1 : 1));
    total += items.length;
    lines.push(`## GATE-${tier}-* (${items.length})`, "", "| code | name | message |", "|---|---|---|");
    for (const item of items) lines.push(`| \`${item.code}\` | ${item.name ? `\`${item.name}\`` : "—"} | ${item.message || `*(declared in \`${item.file}\`)*`} |`);
    lines.push("");
  }

  lines.splice(2, 0, `**${total} codes.**`, "");
  return lines.join("\n");
}

// Run as a script: write the file. Imported by the test: just export.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const codes = collectGateCodes();
  writeFileSync(OUT, `${renderReference(codes)}\n`);
  console.log(`gate code reference: ${codes.size} codes -> ${OUT}`);
}
