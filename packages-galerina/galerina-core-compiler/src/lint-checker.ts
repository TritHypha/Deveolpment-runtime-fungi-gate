// =============================================================================
// Galerina — Lint Checker (ergonomics / code-quality warnings)
//
// These are NOT governance violations — the code is correct. These are
// structural signals that a developer may want to refactor.
//
// FUNGI-LINT-001   EXCESSIVE_NESTING   — flow body nesting depth > 4 AND ≥3 identical Err(e) arms.
//                  Recommendation: extract inner logic into a named helper flow.
// FUNGI-LINT-002   UNUSED_BINDING      — a named local (`let`/`mut`) or match-pattern binding
//                  (`Some(x)`) whose name is never read anywhere in its flow. Enforces the owner's
//                  "no dead code" standard (CG code-quality) and catches the wrong-variable tell
//                  (a bound `Some(ex)` where the arm body used a different name). R&D corpus
//                  `audit-tooling/unused-binding-diagnostic-corpus` (bridge 0244). Scope this rung:
//                  locals + match bindings (corpus R1–R3); params (R5/F1) and self-referential dead
//                  `mut acc=acc+1` (R4 — needs liveness, a syntactic read exists) are DEFERRED rungs.
// =============================================================================

import { type AstNode, type FlowMeta, type SourceLocation } from "./parser.js";

// ---------------------------------------------------------------------------
// Diagnostic constant
// ---------------------------------------------------------------------------

export const FUNGI_LINT_001 = {
  code: "FUNGI-LINT-001",
  name: "EXCESSIVE_NESTING",
  severity: "info" as const,
  message:
    "Flow body nesting depth exceeds 4 and contains repeated Err() propagations. " +
    "Consider extracting inner logic into a named helper flow to reduce nesting.",
} as const;

export interface LintDiagnostic {
  readonly code: "FUNGI-LINT-001";
  readonly name: string;
  readonly severity: "info" | "warning";
  readonly message: string;
  readonly flowName: string;
  readonly nestingDepth: number;
  readonly repeatedErrCount: number;
}

// ---------------------------------------------------------------------------
// Nesting depth and Err-propagation counters
// ---------------------------------------------------------------------------

// AST node kinds that add a nesting level for lint purposes:
//   - `matchExpr` (match arms each introduce a level)
//   - `checkExpr` (check{} if:/deny: arms introduce a level)
//   - `ifExpr`    (if/unless block introduces a level)
//   - `block`     (anonymous block — also nests)
const NESTING_KINDS = new Set<string>(["matchExpr", "checkExpr", "ifExpr", "block"]);

/**
 * Walk an AST subtree and return the maximum nesting depth reached.
 * Only NESTING_KINDS nodes contribute a depth increment.
 */
function maxNestingDepth(node: AstNode, currentDepth = 0): number {
  let max = currentDepth;
  for (const child of node.children ?? []) {
    const childDepth = NESTING_KINDS.has(child.kind) ? currentDepth + 1 : currentDepth;
    const descendant = maxNestingDepth(child, childDepth);
    if (descendant > max) max = descendant;
  }
  return max;
}

/**
 * Count the number of Err(e) / Err(_) propagation nodes in the subtree.
 * Heuristic: a callExpr with value="Err" whose child is a single identifier
 * is considered an error-propagation arm.
 */
function countErrPropagations(node: AstNode): number {
  let count = 0;
  if (
    node.kind === "callExpr" &&
    node.value === "Err" &&
    node.children?.length === 1 &&
    node.children[0]?.kind === "identifier"
  ) {
    count += 1;
  }
  for (const child of node.children ?? []) {
    count += countErrPropagations(child);
  }
  return count;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check all flow bodies for excessive nesting (FUNGI-LINT-001).
 *
 * Fires when BOTH conditions hold:
 *   1. The flow body's maximum nesting depth > NESTING_THRESHOLD (4)
 *   2. The body contains ≥ ERR_REPEAT_THRESHOLD (3) identical Err() propagations
 *
 * Severity: "info" — this is a suggestion, never a build error.
 */
export function checkLint(
  ast: AstNode,
  flows: readonly FlowMeta[],
): LintDiagnostic[] {
  const NESTING_THRESHOLD = 4;
  const ERR_REPEAT_THRESHOLD = 3;

  const diagnostics: LintDiagnostic[] = [];
  const FLOW_KINDS = new Set(["pureFlowDecl", "guardedFlowDecl", "secureFlowDecl", "flowDecl"]);

  for (const c of ast.children ?? []) {
    if (!FLOW_KINDS.has(c.kind)) continue;
    const flowName = c.value ?? "";
    if (!flows.some(f => f.name === flowName)) continue;

    // The body is the last block child of the flow declaration
    const body = (c.children ?? []).find(ch => ch.kind === "block"); // perf-allow: loop-array-find — c.children has ≤5 elements (flow-level children: params, effects, contract, block); O(1) in practice
    if (body === undefined) continue;

    const depth = maxNestingDepth(body);
    const errCount = countErrPropagations(body);

    if (depth > NESTING_THRESHOLD && errCount >= ERR_REPEAT_THRESHOLD) {
      diagnostics.push({
        code: "FUNGI-LINT-001",
        name: "EXCESSIVE_NESTING",
        severity: "info",
        message:
          `Flow '${flowName}' has nesting depth ${depth} (>${NESTING_THRESHOLD}) and ` +
          `${errCount} repeated Err() propagations (≥${ERR_REPEAT_THRESHOLD}). ` +
          `Consider extracting inner logic into a named helper flow.`,
        flowName,
        nestingDepth: depth,
        repeatedErrCount: errCount,
      });
    }
  }

  return diagnostics;
}

// ---------------------------------------------------------------------------
// FUNGI-LINT-002 — unused binding (dead local / match binding)
// ---------------------------------------------------------------------------

export const FUNGI_LINT_002 = {
  code: "FUNGI-LINT-002",
  name: "UNUSED_BINDING",
  severity: "warning" as const,
  message: "A named binding is never read in its flow. Remove it, or use its value.",
} as const;

export interface UnusedBindingDiagnostic {
  readonly code: "FUNGI-LINT-002";
  readonly name: string;
  readonly severity: "warning";
  readonly message: string;
  readonly bindingName: string;
  readonly flowName: string;
  readonly location?: SourceLocation;
}

/** Node kinds that introduce a named local binding (params excluded — deferred rung F1). */
const LOCAL_BINDING_KINDS = new Set<string>(["letDecl", "mutDecl", "readonlyDecl"]);

/** Flow declaration kinds (a binding's scope is its enclosing flow). */
const UB_FLOW_KINDS = new Set<string>(["pureFlowDecl", "guardedFlowDecl", "secureFlowDecl", "flowDecl", "fnDecl"]);

/** A binding site pending a use-check: its name, source node (for location), and kind label. */
interface BindingSite {
  readonly name: string;
  readonly node: AstNode;
  readonly form: "local" | "match";
}

/** Extract the leading identifier from a binding node's `value` (handles "n" and "n: Int"). */
function bindingNameOf(raw: string | undefined): string | undefined {
  const m = (raw ?? "").trim().match(/^([A-Za-z][A-Za-z0-9_]*)/);
  return m?.[1];
}

/**
 * Collect, within one flow subtree, every named binding site and the set of pattern-binding
 * identifier NODES (so they are not miscounted as reads of themselves).
 *
 * `letDecl`/`mutDecl` carry the name in `.value` (not an identifier node), so no exclusion is
 * needed for them. A `matchArm` carries the constructor in `.value` and its sub-bindings as the
 * leading `identifier` children BEFORE the arm's `block`; those identifier nodes are binding
 * sites, not reads. Bare `_`/`None` arms have no identifier child → they bind nothing (corpus A6).
 */
function collectBindings(node: AstNode, bindings: BindingSite[], patternNodes: Set<AstNode>): void {
  if (LOCAL_BINDING_KINDS.has(node.kind)) {
    const name = bindingNameOf(node.value);
    if (name !== undefined) bindings.push({ name, node, form: "local" });
  }
  if (node.kind === "matchArm") {
    // Leading identifier children (before the block) are the constructor's sub-bindings.
    for (const child of node.children ?? []) {
      if (child.kind === "block") break;
      if (child.kind === "identifier") {
        const name = (child.value ?? "").trim();
        if (name !== "" && name !== "_") {
          bindings.push({ name, node: child, form: "match" });
          patternNodes.add(child);
        }
      }
    }
  }
  for (const child of node.children ?? []) collectBindings(child, bindings, patternNodes);
}

/** Collect every name READ (identifier node) in the subtree, excluding pattern-binding sites. */
function collectReads(node: AstNode, patternNodes: Set<AstNode>, reads: Set<string>): void {
  if (node.kind === "identifier" && !patternNodes.has(node)) {
    const name = (node.value ?? "").trim();
    if (name !== "") reads.add(name);
  }
  for (const child of node.children ?? []) collectReads(child, patternNodes, reads);
}

/**
 * Check every flow for named bindings (locals + match-pattern bindings) that are never read
 * anywhere in the flow (FUNGI-LINT-002).
 *
 * Sound direction: a binding is flagged ONLY if its name appears as NO identifier-read in the
 * whole flow, so any real use (even in dead code or a sibling arm) suppresses the warning — the
 * check cannot produce a false positive; it can only miss (e.g. a shadowed earlier binding whose
 * name is read by the shadowing one — a safe under-report, F4). Params (F1) and self-referential
 * dead `mut` (R4, a syntactic read exists) are deferred rungs, not handled here.
 */
export function checkUnusedBindings(ast: AstNode, flows: readonly FlowMeta[]): UnusedBindingDiagnostic[] {
  const diagnostics: UnusedBindingDiagnostic[] = [];

  for (const flow of ast.children ?? []) {
    if (!UB_FLOW_KINDS.has(flow.kind)) continue;
    const flowName = flow.value ?? "";
    // Only real, registered flows (mirrors checkLint's guard against stray decls).
    if (!flows.some((f) => f.name === flowName)) continue;

    const bindings: BindingSite[] = [];
    const patternNodes = new Set<AstNode>();
    collectBindings(flow, bindings, patternNodes);
    if (bindings.length === 0) continue;

    const reads = new Set<string>();
    collectReads(flow, patternNodes, reads);

    for (const b of bindings) {
      if (reads.has(b.name)) continue;
      diagnostics.push({
        code: "FUNGI-LINT-002",
        name: "UNUSED_BINDING",
        severity: "warning",
        message:
          `${b.form === "match" ? "Match binding" : "Binding"} '${b.name}' in flow '${flowName}' ` +
          `is never read. Remove it, or use its value.`,
        bindingName: b.name,
        flowName,
        ...(b.node.location !== undefined ? { location: b.node.location } : {}),
      });
    }
  }

  return diagnostics;
}
