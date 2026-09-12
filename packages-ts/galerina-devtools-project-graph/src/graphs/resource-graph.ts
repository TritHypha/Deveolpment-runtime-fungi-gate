// =============================================================================
// fungi-graph — ResourceLifecycleGraph
//
// State machine graph for Galerina runtime resource lifecycle.
// States: declared → planned → initializing → ready → failed → shutting_down → closed
// =============================================================================

import { GraphBuilder } from "../core/builder.js";
import type { Graph, FungiDiagnostic, NodeId } from "../core/types.js";
import { FUNGI_PGRAPH_002, FUNGI_PGRAPH_005 } from "../core/types.js";
import { updateNode } from "../algorithms/fixpoint.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ResourceState =
  | "declared"
  | "planned"
  | "initializing"
  | "ready"
  | "failed"
  | "shutting_down"
  | "closed";

export type ResourceScope = "runtime" | "request";

export interface ResourceNodeData {
  readonly resourceName: string;
  readonly scope: ResourceScope;
  readonly state: ResourceState;
  readonly initializedAt?: string;
  readonly closedAt?: string;
  readonly failureReason?: string;
}

export interface LifecycleTransitionData {
  /** The event that triggers this transition, e.g. "init_success". */
  readonly trigger: string;
  readonly guardCondition?: string;
}

export type ResourceLifecycleGraph = Graph<ResourceNodeData, LifecycleTransitionData>;

export function validateTransition(from: ResourceState, to: ResourceState): boolean {
  if (from === "declared") {
    return to === "planned" || to === "failed";
  }
  if (from === "planned") {
    return to === "initializing" || to === "failed";
  }
  if (from === "initializing") {
    return to === "ready" || to === "failed";
  }
  if (from === "ready") {
    return to === "shutting_down" || to === "failed";
  }
  if (from === "failed") {
    return to === "shutting_down";
  }
  if (from === "shutting_down") {
    return to === "closed" || to === "failed";
  }
  return false;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export interface ResourceEntry {
  readonly resourceName: string;
  readonly scope: ResourceScope;
  readonly initialState?: ResourceState;
}

/**
 * Build a ResourceLifecycleGraph with one node per resource.
 * The graph edges represent the state machine transitions common to all
 * resources (not instance-specific history). For instance-specific
 * lifecycle tracking, use advanceState().
 */
export function buildResourceLifecycleGraph(
  resources: readonly ResourceEntry[],
): ResourceLifecycleGraph {
  const builder = new GraphBuilder<ResourceNodeData, LifecycleTransitionData>();

  for (const r of resources) {
    builder.addNode(r.resourceName, {
      resourceName: r.resourceName,
      scope: r.scope,
      state: r.initialState ?? "declared",
    });
  }

  return builder.build();
}

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------

export interface AdvanceStateOptions {
  readonly trigger: string;
  readonly timestamp?: string;
  readonly failureReason?: string;
}

export type AdvanceResult =
  | { readonly ok: true; readonly graph: ResourceLifecycleGraph }
  | { readonly ok: false; readonly diagnostic: FungiDiagnostic };

/**
 * Advance a resource to a new state, returning an updated immutable graph.
 * Validates the transition is permitted by the state machine.
 */
export function advanceState(
  graph: ResourceLifecycleGraph,
  resourceName: NodeId,
  nextState: ResourceState,
  options: AdvanceStateOptions,
): AdvanceResult {
  const node = graph.node(resourceName);
  if (node === undefined) {
    return {
      ok: false,
      diagnostic: {
        ...FUNGI_PGRAPH_002,
        message: `Resource "${resourceName}" not found in the lifecycle graph.`,
      },
    };
  }

  if (!validateTransition(node.data.state, nextState)) {
    return {
      ok: false,
      diagnostic: {
        ...FUNGI_PGRAPH_005,
        message: `Cannot transition resource "${resourceName}" from "${node.data.state}" to "${nextState}".`,
      },
    };
  }

  const updated = updateNode(graph, resourceName, (current) => ({
    ...current,
    state: nextState,
    initializedAt: nextState === "ready" ? (options.timestamp ?? new Date().toISOString()) : current.initializedAt,
    closedAt: nextState === "closed" ? (options.timestamp ?? new Date().toISOString()) : current.closedAt,
    failureReason: nextState === "failed" ? options.failureReason : undefined,
  }));

  return { ok: true, graph: updated };
}
