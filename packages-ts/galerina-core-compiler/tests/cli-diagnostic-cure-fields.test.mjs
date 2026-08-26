// =============================================================================
// G2 — the CLI diagnostic record must CARRY the two cure channels.
//
// Owner ruling (FUNGI-PROGRAMME-HANDOVER-2026-08-07, §3): "Approve widening it
// with optional `suggestedFix` and `suggestedCode`; remove cast-through-`unknown`
// after producer/consumer parity tests pass."
//
// Required discriminating evidence (§8): producer retains both optional fields ·
// consumer preserves them · absent fields remain absent · no cast-through-
// `unknown` · no silent auto-apply.
//
// WHY THESE ASSERTIONS. The producers (type-checker, value-state-checker,
// effect-checker) declare BOTH fields as typed strings; `CliDiagnostic` declared
// six and omitted both, so `check` could not render a cure it possessed and
// `applyAutoFix` reached one by casting through `unknown` — an access no type
// error can reach, which is why it went unnoticed that it read the PROSE channel
// (`suggestedFix`) rather than the machine channel (`suggestedCode`).
//
// These are SOURCE-STRUCTURE assertions on purpose: `cli.ts` has no exported
// seam for its internal diagnostic funnel, and the defect being closed is a type
// declaration plus an unsafe access — both statically visible, neither
// observable through the CLI's stdout. A behavioural arm would prove the
// rendering, not the carriage, and the carriage is what was missing.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "src");
const cli = readFileSync(join(SRC, "cli.ts"), "utf8");

/**
 * The body of a top-level `function`/`interface` declaration, from its header to
 * the first column-0 `}`.
 *
 * This file is CRLF, so a `"\n}\n"` search silently runs to end-of-file and every
 * body assertion then reads the WHOLE module — passing or failing on unrelated
 * code. Anchoring on `\r?\n\}` is the fix, and the control below is what makes
 * the anchoring checkable rather than assumed.
 */
function blockAfter(text, header) {
  const start = text.indexOf(header);
  assert.ok(start > 0, `${header} must exist in cli.ts`);
  const rest = text.slice(start);
  const m = /\r?\n\}/.exec(rest);
  assert.ok(m, `${header} must be closed by a column-0 brace`);
  return rest.slice(0, m.index);
}

const cliDiagnosticBody = (text) => blockAfter(text, "interface CliDiagnostic");

test("CONTROL: the extractor really reads the interface (it sees the fields that were always there)", () => {
  const body = cliDiagnosticBody(cli);
  for (const known of ["code", "severity", "message", "file", "line", "column"]) {
    assert.match(body, new RegExp("\\b" + known + "\\??:"), `extractor must see the pre-existing field '${known}'`);
  }
});

test("CONTROL: block extraction is BOUNDED — a body must not swallow the module", () => {
  // The earlier version of this helper searched for "\n}\n" in a CRLF file, found
  // nothing, and returned everything to EOF — so every body assertion silently
  // read the whole of cli.ts. A bounded-length control is what catches that.
  for (const header of ["interface CliDiagnostic", "function pushDiag", "function applyAutoFix"]) {
    const body = blockAfter(cli, header);
    assert.ok(body.length < 4000, `${header} body is ${body.length} chars — extraction is unbounded`);
    assert.ok(body.length > 40, `${header} body is ${body.length} chars — extraction found nothing`);
  }
});

test("CliDiagnostic declares suggestedFix as an optional string", () => {
  assert.match(cliDiagnosticBody(cli), /suggestedFix\?:\s*string/,
    "the human-prose cure channel must be part of the CLI's own diagnostic record");
});

test("CliDiagnostic declares suggestedCode as an optional string", () => {
  assert.match(cliDiagnosticBody(cli), /suggestedCode\?:\s*string/,
    "the machine-applicable cure channel must be part of the CLI's own diagnostic record");
});

test("the diagnostic funnel carries both cure fields through", () => {
  // Every producer diagnostic reaches CliDiagnostic through pushDiag; a widened
  // interface that the funnel drops on the floor is a wider type over the same loss.
  const body = blockAfter(cli, "function pushDiag");
  assert.match(body, /suggestedFix/, "pushDiag must accept/propagate suggestedFix");
  assert.match(body, /suggestedCode/, "pushDiag must accept/propagate suggestedCode");
});

test("absent cure fields stay absent — the funnel must not manufacture empty strings", () => {
  const body = blockAfter(cli, "function pushDiag");
  assert.doesNotMatch(body, /suggested(Fix|Code):\s*(""|''|`\s*`)/,
    "an absent cure must remain absent; an empty string is a claim that a cure exists");
  assert.match(body, /!==\s*undefined/,
    "presence must be tested explicitly, mirroring how line/column are already handled");
});

test("★ no cast-through-unknown reaches a cure field", () => {
  assert.doesNotMatch(cli, /as unknown as Record<string,\s*unknown>\)\s*\[\s*["']suggested(Fix|Code)["']\s*\]/,
    "a cast through `unknown` cannot be type-checked — it is what let the wrong channel be read");
});

test("★ the auto-fix path reads the MACHINE channel, never the prose one", () => {
  const body = blockAfter(cli, "function applyAutoFix");
  assert.match(body, /suggestedCode/, "applyAutoFix must select on suggestedCode");
  assert.doesNotMatch(body, /\bd\.suggestedFix\b|\["suggestedFix"\]/,
    "applyAutoFix must not select on the human-prose channel");
});

test("★ no silent auto-apply — the safe-mode boundary is preserved", () => {
  const body = blockAfter(cli, "function applyAutoFix");
  assert.doesNotMatch(body, /writeFileSync|fs\.write/,
    "the owner's G2 safety rule: no cure may silently edit governed source");
  assert.match(body, /fix-confirm/,
    "the confirmation policy must remain named in the path that would apply a cure");
});
