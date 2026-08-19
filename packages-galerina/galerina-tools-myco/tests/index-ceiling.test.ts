// Mirror regression for upstream myco 836a742: writer and reader must enforce
// the same term-edge ceiling, and a refusal must not look like an absence.

import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { MAX_INDEX_TERM_EDGES } from "../src/graph/index-contract.ts";
import { SearchGraph } from "../src/graph/model.ts";
import {
  clampTermEdgeCeiling,
  INDEX_DIR,
  INDEX_FILE,
  loadGraphOutcome,
  saveGraph,
} from "../src/graph/store.ts";
import { buildIndex, DEFAULT_INDEX_OPTIONS } from "../src/ingest/indexer.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, "..", "src", "cli.ts");
const CLI_TIMEOUT_MS = 30_000;
const CLI_OUTPUT_LIMIT_BYTES = 4 * 1024 * 1024;

function runCli(args: string[]): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ["--experimental-strip-types", cli, ...args],
      { stdio: ["ignore", "pipe", "pipe"], timeout: CLI_TIMEOUT_MS },
    );
    let out = "";
    let err = "";
    let outputBytes = 0;
    const append = (current: string, chunk: Buffer): string => {
      outputBytes += chunk.byteLength;
      if (outputBytes > CLI_OUTPUT_LIMIT_BYTES) {
        child.kill();
        return current;
      }
      return current + chunk.toString("utf8");
    };
    child.stdout.on("data", (chunk: Buffer) => { out = append(out, chunk); });
    child.stderr.on("data", (chunk: Buffer) => { err = append(err, chunk); });
    child.on("exit", (code) => resolve({ code: code ?? -1, out, err }));
  });
}

async function tempRoot(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "myco-ceiling-"));
}

function graphWithEdges(edgeCount: number): SearchGraph {
  const graph = new SearchGraph();
  const counts = new Map<string, number>();
  for (let i = 0; i < edgeCount; i += 1) counts.set(`term${i}`, 1);
  graph.setFile("a.txt", 1, 1, counts);
  return graph;
}

test("termEdgeCount tracks add, replace and remove", () => {
  const graph = new SearchGraph();
  assert.equal(graph.termEdgeCount(), 0);
  graph.setFile("a.txt", 1, 1, new Map([["x", 1], ["y", 2]]));
  graph.setFile("b.txt", 1, 1, new Map([["z", 1]]));
  assert.equal(graph.termEdgeCount(), 3);
  graph.setFile("a.txt", 2, 2, new Map([["x", 1]]));
  assert.equal(graph.termEdgeCount(), 2);
  graph.removeFile("b.txt");
  graph.removeFile("a.txt");
  assert.equal(graph.termEdgeCount(), 0);
});

test("a caller can tighten but cannot raise the fixed ceiling", () => {
  assert.equal(clampTermEdgeCeiling(undefined), MAX_INDEX_TERM_EDGES);
  assert.equal(clampTermEdgeCeiling(10), 10);
  assert.equal(
    clampTermEdgeCeiling(MAX_INDEX_TERM_EDGES * 10),
    MAX_INDEX_TERM_EDGES,
  );
  assert.equal(clampTermEdgeCeiling(-1), MAX_INDEX_TERM_EDGES);
  assert.equal(clampTermEdgeCeiling(1.5), MAX_INDEX_TERM_EDGES);
});

test("saveGraph refuses an over-ceiling graph and writes no index", async () => {
  const root = await tempRoot();
  const outcome = await saveGraph(root, graphWithEdges(12), { maxTermEdges: 5 });
  assert.equal(outcome.written, false);
  if (outcome.written) throw new Error("unreachable");
  assert.equal(outcome.reason, "term-edge-ceiling");
  assert.equal(outcome.edges, 12);
  assert.equal(outcome.limit, 5);
  const onDisk = await fs
    .stat(path.join(root, INDEX_DIR, INDEX_FILE))
    .catch(() => undefined);
  assert.equal(onDisk, undefined);
});

test("CONTROL: an in-ceiling graph is written", async () => {
  const root = await tempRoot();
  const outcome = await saveGraph(root, graphWithEdges(3), { maxTermEdges: 5 });
  assert.equal(outcome.written, true);
  assert.ok((await fs.stat(path.join(root, INDEX_DIR, INDEX_FILE))).isFile());
});

test("load outcome distinguishes absent from rejected", async () => {
  const root = await tempRoot();
  assert.equal((await loadGraphOutcome(root)).status, "absent");
  await fs.mkdir(path.join(root, INDEX_DIR), { recursive: true });
  await fs.writeFile(path.join(root, INDEX_DIR, INDEX_FILE), "{ not json", "utf8");
  assert.equal((await loadGraphOutcome(root)).status, "rejected");
});

test("load outcome treats a non-ENOENT filesystem failure as rejected", async () => {
  // An embedded NUL is rejected by the filesystem API before lookup. It is a
  // deterministic cross-platform stand-in for permission and I/O failures:
  // only ENOENT may mean that an index is genuinely absent.
  const outcome = await loadGraphOutcome(`invalid\0root`);
  assert.equal(outcome.status, "rejected");
});

test("CONTROL: a well-formed index loads as ok", async () => {
  const root = await tempRoot();
  await saveGraph(root, graphWithEdges(3));
  assert.equal((await loadGraphOutcome(root)).status, "ok");
});

test("CLI status reports a rejected index as REFUSED, never absent", async () => {
  const root = await tempRoot();
  await fs.mkdir(path.join(root, INDEX_DIR), { recursive: true });
  await fs.writeFile(path.join(root, INDEX_DIR, INDEX_FILE), "{ not json", "utf8");
  const result = await runCli(["status", root]);
  assert.equal(result.code, 2);
  assert.match(result.err, /REFUSED/);
  assert.doesNotMatch(result.err, /^no index at/);
});

test("CONTROL: CLI status reports a genuinely absent index as absent", async () => {
  const root = await tempRoot();
  const result = await runCli(["status", root]);
  assert.equal(result.code, 2);
  assert.match(result.err, /^no index at/);
  assert.doesNotMatch(result.err, /REFUSED/);
});

test("buildIndex refuses before producing an unsavable graph", async () => {
  const root = await tempRoot();
  await fs.writeFile(path.join(root, "a.txt"), "alpha bravo charlie delta", "utf8");
  await fs.writeFile(path.join(root, "b.txt"), "echo foxtrot golf hotel", "utf8");
  await assert.rejects(
    () => buildIndex(root, { ...DEFAULT_INDEX_OPTIONS, maxTermEdges: 3 }),
    (error: Error) => {
      assert.match(error.message, /MYCO-INDEX-TOO-LARGE/);
      assert.match(error.message, /narrower root/);
      return true;
    },
  );
});

test("CONTROL: the same tree indexes under a sufficient ceiling", async () => {
  const root = await tempRoot();
  await fs.writeFile(path.join(root, "a.txt"), "alpha bravo charlie delta", "utf8");
  await fs.writeFile(path.join(root, "b.txt"), "echo foxtrot golf hotel", "utf8");
  const built = await buildIndex(root, {
    ...DEFAULT_INDEX_OPTIONS,
    maxTermEdges: 100,
  });
  assert.equal(built.stats.files, 2);
  assert.equal(built.saved.written, true);
});
