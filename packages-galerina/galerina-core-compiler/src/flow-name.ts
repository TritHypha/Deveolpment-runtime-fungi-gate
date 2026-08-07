// =============================================================================
// flow-name.ts — the ONE decoder for a flow declaration's name and floor.
//
// WHY THIS EXISTS. A governed flow parses to `kind: "governedFlowDecl"` with
// `value: "governed:<floor>:<name>"` (parser.ts:1074-1083), while the other four
// qualifiers carry the bare name directly in `value`. A lookup written
//   FLOW_DECL_KINDS.has(node.kind) && node.value === name
// therefore misses a governed flow TWICE: the kind is absent from the set, and
// the encoded value never equals the bare name. The correct decode already
// existed at three sites independently (governance-verifier, gir-emitter,
// wat-emitter); this module makes it ONE exported function so the remaining
// checker-lane lookups adopt the same truth rather than a fourth copy.
//
// Depends only on the `AstNode` shape from the parser — no checker imports — so
// it introduces no dependency cycle (owner Q1 condition 2).
// =============================================================================
import { type AstNode, type AstNodeKind } from "./parser.js";

/** The four qualifiers whose declaration node carries the bare flow name in `value`. */
export const FLOW_DECL_KINDS: ReadonlySet<AstNodeKind> = new Set<AstNodeKind>([
  "flowDecl",
  "secureFlowDecl",
  "pureFlowDecl",
  "guardedFlowDecl",
]);

/** A decoded flow declaration. `floor` is present only for a governed flow. */
export interface DecodedFlow {
  readonly name: string;
  readonly floor?: string;
}

/**
 * Decode a flow declaration node to its declared name (and governed floor).
 *
 * Returns:
 *   - a `DecodedFlow` for any of the five flow-declaration kinds;
 *   - `{ error }` for a governedFlowDecl whose value is malformed — a diagnostic
 *     to surface, NEVER a silent "not a flow" (owner Q1 condition 3);
 *   - `undefined` for a node that is not a flow declaration.
 *
 * ★ The name is taken as `parts.slice(2).join(":")`, NOT `parts[2]`: a qualified
 * flow name may itself contain ':' (e.g. `ns:sub:flow`), and `[2]` would silently
 * return a different, real-looking name — the precise trap the owner flagged.
 */
export function decodeFlowDecl(node: AstNode): DecodedFlow | { error: string } | undefined {
  if (node.kind === "governedFlowDecl") {
    const parts = (node.value ?? "").split(":");
    // Shape: ["governed", "<floor>", "<name...>"], name possibly containing ':'.
    // Bind locals so the truthiness guards below narrow `string | undefined` → `string`.
    const floor = parts[1];
    const name = parts.slice(2).join(":");
    if (parts.length < 3 || parts[0] !== "governed" || !floor || !name) {
      return { error: `malformed governedFlowDecl value: ${JSON.stringify(node.value)}` };
    }
    return { name, floor };
  }
  if (FLOW_DECL_KINDS.has(node.kind)) {
    return { name: node.value ?? "" };
  }
  return undefined;
}

/**
 * True when `node` is a flow declaration of any tier declaring exactly `name`.
 * A malformed governed value does NOT match any name — it is a diagnostic
 * condition surfaced elsewhere, and must never resolve to a false positive here.
 * This is the drop-in replacement for the `kind ∈ SET && value === name` shape.
 */
export function isFlowDeclNamed(node: AstNode, name: string): boolean {
  const decoded = decodeFlowDecl(node);
  return decoded !== undefined && !("error" in decoded) && decoded.name === name;
}
