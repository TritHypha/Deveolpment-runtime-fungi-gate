// =============================================================================
// scripts/lib/fungi-host-boundary.mjs
//
// Effect-derived host-boundary classification for `.fungi` sources.
//
// WHY THIS EXISTS. `ts-retirement-graph.mjs` classified a `.fungi` file as a
// host boundary by running HOST_BOUNDARY_PATTERN over the whole file text. Three
// files in the DSS package were counted that way — `capability-map.fungi:34` and
// `vdpm.fungi:105` (the token inside a STRING being compared) and
// `emergency-sm.fungi:25` (the token inside a `;;` COMMENT). All three GOVERN
// native calls; none performs one. A metric that counts comments is one refactor
// away from being ignored, and the standing ruling forbids fixing that by
// exempting boundaries — so the detector is corrected instead.
//
// WHY NOT A BETTER REGEX. A hand-written lexical classifier written for exactly
// this task knew `//` comments and did not know `;;`, so it read the comment
// line as CODE. An improved regex is still a regex. The parser already knows the
// difference and encodes it unambiguously:
//
//     real effect      -> node.kind === "identifier", value "effect:native.call"
//     string literal   -> node.kind === "stringLiteral", value "\"native.call\""
//     comment          -> no node at all
//
// FAIL-CLOSED. Absence of evidence is not evidence of absence:
//   * source that will not parse            -> BOUNDARY ("unparseable")
//   * a runtime-assembled native reference  -> BOUNDARY ("dynamic-unknown")
// Unknown native authority is never admitted as clean.
//
// Writes nothing. No network. Pure function of source text.
// =============================================================================

import { parseProgram } from "../../packages-ts/galerina-core-compiler/dist/index.js";

/**
 * Effects that constitute crossing into host/native authority. Kept as a named
 * set with ONE consumer so a new native effect cannot be added to the language
 * without this classifier seeing it — the inline-sentinel drift this estate has
 * been bitten by before.
 */
export const NATIVE_EFFECTS = Object.freeze(["native.call"]);

/** The parser's encoding of a declared effect on an identifier node. */
const EFFECT_PREFIX = "effect:";

/**
 * Fragments that, when concatenated at runtime, could assemble a native effect
 * name that no static pass can resolve. Deliberately narrow: a false refusal
 * costs one manual adjudication, a false pass costs an unowned boundary.
 */
const DYNAMIC_FRAGMENTS = NATIVE_EFFECTS.flatMap((e) => e.split("."));

function walk(node, visit) {
  if (node === null || typeof node !== "object") return;
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
}

/**
 * Classify one `.fungi` source.
 *
 * @returns {{ isBoundary: boolean, reason: string, sites: {line?: number, kind: string, value: string}[] }}
 *   reason ∈ "effect" | "dynamic-unknown" | "unparseable" | "no-native-effect"
 */
export function classifyFungiHostBoundary(source, fileName = "source.fungi") {
  let parsed;
  try {
    parsed = parseProgram(source, fileName, { requireVersionHeader: true });
  } catch {
    return { isBoundary: true, reason: "unparseable", sites: [] };
  }
  const errors = (parsed.diagnostics ?? []).filter((d) => d.severity === "error");
  if (errors.length > 0 || parsed.ast === undefined) {
    // Effects cannot be enumerated from a source the parser rejected, so the
    // native surface is UNKNOWN. Unknown refuses.
    return {
      isBoundary: true,
      reason: "unparseable",
      sites: errors.slice(0, 3).map((d) => ({
        line: d.location?.line,
        kind: "parse-error",
        value: d.code ?? "FUNGI-PARSE",
      })),
    };
  }

  const effectSites = [];
  const stringFragments = [];
  walk(parsed.ast, (n) => {
    const value = typeof n.value === "string" ? n.value : "";
    if (value === "") return;
    if (n.kind === "identifier" && value.startsWith(EFFECT_PREFIX)) {
      const effect = value.slice(EFFECT_PREFIX.length);
      if (NATIVE_EFFECTS.includes(effect)) {
        effectSites.push({ line: n.location?.line, kind: n.kind, value });
      }
      return;
    }
    // A string literal is DATA — governing an effect by name is not performing
    // it. Recorded only to detect runtime assembly, below.
    if (n.kind === "stringLiteral") stringFragments.push({ line: n.location?.line, value });
  });

  if (effectSites.length > 0) {
    return { isBoundary: true, reason: "effect", sites: effectSites };
  }

  // Runtime assembly: a native effect name spelled across concatenated literals
  // cannot be proved absent statically. Only fires when the WHOLE name is not
  // present as one literal (that case is plain data, already handled above).
  for (const effect of NATIVE_EFFECTS) {
    const whole = stringFragments.some((s) => s.value.includes(effect));
    if (whole) continue;
    const parts = DYNAMIC_FRAGMENTS.filter((p) => p.length > 2);
    const seen = parts.filter((p) => stringFragments.some((s) => s.value.includes(p)));
    if (parts.length > 0 && seen.length === parts.length) {
      return {
        isBoundary: true,
        reason: "dynamic-unknown",
        sites: stringFragments
          .filter((s) => parts.some((p) => s.value.includes(p)))
          .map((s) => ({ line: s.line, kind: "stringLiteral", value: s.value })),
      };
    }
  }

  return { isBoundary: false, reason: "no-native-effect", sites: [] };
}
