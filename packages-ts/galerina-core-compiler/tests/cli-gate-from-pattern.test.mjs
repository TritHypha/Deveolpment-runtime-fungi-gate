// cli-gate-from-pattern.test.mjs — the CLI surface of ratified order 2.
//
// The library is tested in gate-from-pattern.test.mjs. What is tested HERE is
// the shell contract, which the library cannot check:
//   - STDOUT carries the circuit and NOTHING else, so `> out.gate` is safe;
//   - a refusal exits NON-ZERO and writes nothing to stdout, so a pipeline can
//     never mistake a refusal for a circuit;
//   - no file is created (doc 34 §4: stdout by default);
//   - a shell-split pattern REFUSES rather than generating for a fragment.
// That last one is the interesting case: `galerina … from-pattern a b --name x`
// with an unquoted pattern would otherwise silently draw only `a`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const CLI = resolve(import.meta.dirname, "..", "dist", "cli.js");
const run = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });

test("stdout carries ONLY the circuit — safe to redirect straight into a file", () => {
  const r = run("gate", "from-pattern", "\\d{2}", "--name", "pair");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^@gate 3\.0\.0\n/, "must start with the exact header");
  assert.match(r.stdout, /\nEND\n$/, "must end with END and a newline");
  // The advisory belongs on stderr, or a redirect would corrupt the artifact.
  assert.ok(!r.stdout.includes("[info]"), "stdout must not carry the advisory");
  assert.match(r.stderr, /The registry must declare deny reasons/);
});

test("★ a refusal exits non-zero and writes NOTHING to stdout", () => {
  const r = run("gate", "from-pattern", "a|b", "--name", "alt");
  assert.notEqual(r.status, 0, "must exit non-zero");
  assert.equal(r.stdout, "", "a refusal must not put text where a circuit goes");
  assert.match(r.stderr, /GATE-WIRE-002, single assignment/);
});

test("★ a shell-split pattern REFUSES rather than drawing a fragment", () => {
  // `from-pattern a b --name x` is what an unquoted pattern containing a space
  // looks like by the time it reaches argv. Generating for `a` alone would be
  // the worst outcome: a valid circuit for something the author did not write.
  const r = run("gate", "from-pattern", "a", "b", "--name", "frag");
  assert.notEqual(r.status, 0);
  assert.equal(r.stdout, "");
  assert.match(r.stderr, /expected one pattern, got 2 — quote the pattern/);
});

test("missing --name or missing pattern prints usage and exits non-zero", () => {
  for (const args of [["gate", "from-pattern", "ab"], ["gate", "from-pattern", "--name", "x"]]) {
    const r = run(...args);
    assert.notEqual(r.status, 0, args.join(" "));
    assert.equal(r.stdout, "");
    assert.match(r.stderr, /Usage: galerina gate from-pattern/);
    assert.match(r.stderr, /not an admission authority/, "usage must say what the tool is not");
  }
});

test("no file is created — stdout is the only output channel", () => {
  const before = new Set(readdirSync(process.cwd()));
  const r = run("gate", "from-pattern", "\\w{2}", "--name", "wordpair");
  assert.equal(r.status, 0, r.stderr);
  const added = readdirSync(process.cwd()).filter((f) => !before.has(f));
  assert.deepEqual(added, [], `the generator must not write files, created: ${added.join(", ")}`);
});

test("the top-level usage lists the subcommand — a hidden command is an undiscoverable one", () => {
  const r = run("nonsense-command");
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /gate from-pattern <p> --name <c>/);
});

test("★ the ROOT entry point routes it too, and byte-identically — GD-024's class", () => {
  // GD-024 was "the ROOT galerina.mjs had no .gate routing; round one wired
  // only the compiler package's own CLI". Wiring this subcommand into the
  // package CLI alone reproduced it exactly: `galerina gate from-pattern …`
  // fell through to the file pipeline and tried to stat a file named
  // `from-pattern`. The root now DELEGATES to this same CLI — one
  // implementation, so the two entry points cannot drift — and this test is
  // what keeps that true.
  const ROOT = resolve(import.meta.dirname, "..", "..", "..", "galerina.mjs");
  const viaRoot = spawnSync(process.execPath, [ROOT, "gate", "from-pattern", "\\d{2}", "--name", "pair"], { encoding: "utf8" });
  const viaPackage = run("gate", "from-pattern", "\\d{2}", "--name", "pair");

  assert.equal(viaRoot.status, 0, viaRoot.stderr);
  assert.equal(viaRoot.stdout, viaPackage.stdout, "both entry points must emit the same circuit");

  // And a refusal must still be a refusal through the extra hop — a delegating
  // wrapper that swallowed the exit code would turn every refusal into a pass.
  const refusal = spawnSync(process.execPath, [ROOT, "gate", "from-pattern", "a|b", "--name", "alt"], { encoding: "utf8" });
  assert.notEqual(refusal.status, 0, "the root must propagate a non-zero exit");
  assert.equal(refusal.stdout, "");
});

test("identical invocations produce byte-identical stdout", () => {
  const a = run("gate", "from-pattern", "(ab)c{2}", "--name", "twice");
  const b = run("gate", "from-pattern", "(ab)c{2}", "--name", "twice");
  assert.equal(a.status, 0, a.stderr);
  assert.equal(a.stdout, b.stdout);
});
