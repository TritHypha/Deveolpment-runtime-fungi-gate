// store.ts - persist and reload the search graph.

import { promises as fs } from "node:fs";
import * as path from "node:path";

import {
  MAX_INDEX_BYTES,
  MAX_INDEX_TERM_EDGES,
  validateStoredIndex,
} from "./index-contract.ts";
import type { StoredFile, StoredIndex } from "./index-contract.ts";
import { SearchGraph } from "./model.ts";
import type { TermCounts } from "./model.ts";

const FORMAT = 1;
export const INDEX_DIR = ".myco";
export const INDEX_FILE = "index.json";

export interface IndexMeta {
  createdAt: number;
  fileCount: number;
  termCount: number;
}

export interface LoadGraphOptions {
  /** Tests may tighten this ceiling; callers cannot raise the fixed maximum. */
  maxIndexBytes?: number;
}

export interface SaveGraphOptions {
  /** Tests may tighten this ceiling; callers cannot raise the fixed maximum. */
  maxTermEdges?: number;
}

export function clampTermEdgeCeiling(requested: number | undefined): number {
  if (
    requested === undefined
    || !Number.isSafeInteger(requested)
    || requested < 0
  ) {
    return MAX_INDEX_TERM_EDGES;
  }
  return Math.min(requested, MAX_INDEX_TERM_EDGES);
}

function indexPath(root: string): string {
  return path.join(root, INDEX_DIR, INDEX_FILE);
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export type SaveOutcome =
  | { written: true }
  | { written: false; reason: "term-edge-ceiling"; edges: number; limit: number };

// The writer enforces the same ceiling the reader enforces. Declining to write
// prevents a permanent reject-rebuild-reject cache loop.
export async function saveGraph(
  root: string,
  graph: SearchGraph,
  options: SaveGraphOptions = {},
): Promise<SaveOutcome> {
  const limit = clampTermEdgeCeiling(options.maxTermEdges);
  const edges = graph.termEdgeCount();
  if (edges > limit) {
    return { written: false, reason: "term-edge-ceiling", edges, limit };
  }

  const files: StoredFile[] = [];
  for (const rec of graph.files()) {
    const counts = graph.forwardOf(rec.id);
    if (!counts) continue;
    files.push({
      p: rec.path,
      m: rec.mtimeMs,
      s: rec.size,
      t: [...counts].sort(([left], [right]) => compareCodeUnits(left, right)),
    });
  }
  files.sort((left, right) => compareCodeUnits(left.p, right.p));
  const payload: StoredIndex = { format: FORMAT, createdAt: Date.now(), files };
  const dir = path.join(root, INDEX_DIR);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(indexPath(root), JSON.stringify(payload), "utf8");
  return { written: true };
}

export type LoadStatus = "ok" | "absent" | "rejected";

// Compatibility wrapper for callers that need only the admitted graph.
export async function loadGraph(
  root: string,
  options: LoadGraphOptions = {},
): Promise<{ graph: SearchGraph; meta: IndexMeta } | null> {
  const outcome = await loadGraphOutcome(root, options);
  return outcome.status === "ok"
    ? { graph: outcome.graph, meta: outcome.meta }
    : null;
}

// A genuine absence and a rejected artifact are distinct states with distinct
// remedies. Never collapse them into one reassuring "first run" signal.
export async function loadGraphOutcome(
  root: string,
  options: LoadGraphOptions = {},
): Promise<
  | { status: "ok"; graph: SearchGraph; meta: IndexMeta }
  | { status: "absent" | "rejected" }
> {
  const maxIndexBytes = options.maxIndexBytes ?? MAX_INDEX_BYTES;
  if (
    !Number.isSafeInteger(maxIndexBytes)
    || maxIndexBytes < 1
    || maxIndexBytes > MAX_INDEX_BYTES
  ) {
    return { status: "rejected" };
  }

  let text: string;
  try {
    const requestedIndex = indexPath(root);
    const [realRoot, realIndex] = await Promise.all([
      fs.realpath(root),
      fs.realpath(requestedIndex),
    ]);
    const relativeIndex = path.relative(realRoot, realIndex);
    if (
      relativeIndex === ""
      || relativeIndex === ".."
      || relativeIndex.startsWith(`..${path.sep}`)
      || path.isAbsolute(relativeIndex)
    ) {
      return { status: "rejected" };
    }
    const stat = await fs.lstat(requestedIndex);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxIndexBytes) {
      return { status: "rejected" };
    }
    text = await fs.readFile(requestedIndex, "utf8");
  } catch (error: unknown) {
    // Only a genuinely missing path is absence. Permission failures, invalid
    // paths and I/O faults are rejected evidence, never a reassuring first run.
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return { status: "absent" };
    }
    return { status: "rejected" };
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(text) as unknown;
  } catch {
    return { status: "rejected" };
  }
  const data = validateStoredIndex(decoded);
  if (data === null) return { status: "rejected" };

  const graph = new SearchGraph();
  try {
    for (const file of data.files) {
      const counts: TermCounts = new Map(file.t);
      graph.setFile(file.p, file.m, file.s, counts);
    }
  } catch {
    return { status: "rejected" };
  }

  return {
    status: "ok",
    graph,
    meta: {
      createdAt: data.createdAt,
      fileCount: graph.fileCount(),
      termCount: graph.termCount(),
    },
  };
}
