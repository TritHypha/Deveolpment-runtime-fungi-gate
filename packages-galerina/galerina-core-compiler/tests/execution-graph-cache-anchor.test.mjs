// Regression lock: the ExecutionGraph disk cache must live at a FIXED, in-package path, never a
// path that moves with process.cwd().
//
// The defect (found 2026-07-25, R&D 0408): `const DISK_CACHE_DIR = "build/.fungi-cache"` was a bare
// relative path. Run from the repo it resolved inside the repo; run with the cwd one level up it
// resolved to a `build/.fungi-cache` OUTSIDE every repository, unreachable by .gitignore and by any
// cleanup. 204 stray files were found there. It is a compiler cache keyed on flow name + source
// hash, so an unanchored location means the graphs the compiler trusts depend on the directory it
// was launched from — a build input that moves with cwd, which is a supply-chain surface.
//
// THE CONTROL EXERCISES THE AXIS THAT BROKE (R&D 0408's own lesson: their control passed through a
// different surface and so never tested the one that failed). Asserting "the path is absolute" is
// NOT enough — `resolve("build/.fungi-cache")` is absolute too, and would have passed while still
// moving with cwd. So this spawns the module twice from TWO DIFFERENT working directories and
// requires the resolved path to be IDENTICAL. Only cwd-independence can satisfy that.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join, resolve, isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(HERE, "..");
// Probe the SHIPPED artifact (dist/), not src/. Two reasons, both learned by running this:
//   1. `src/execution-graph.ts` cannot be loaded by --experimental-strip-types at all ("TypeScript
//      enum is not supported in strip-only mode"), so a src-based lock cannot run here;
//   2. more importantly, dist/ is what actually executes. A path fixed in source but mangled by the
//      build would pass a src probe and still ship broken — measure the product, not the component.
// A file:// URL, not a bare path: on Windows a dynamic import of `C:\…` is rejected by the ESM
// loader ("Received protocol 'c:'"). Both caught by running the lock rather than reasoning about it.
const DIST = join(PKG_ROOT, "dist", "execution-graph.js");
const SRC_URL = pathToFileURL(DIST).href;

/** Resolve the module's cache dir in a child process launched from `cwd`, loading `url`. */
function cacheDirFrom(cwd, url = SRC_URL) {
  const code = `import(${JSON.stringify("")} + ${JSON.stringify(url)}).then(m => {
    process.stdout.write(String(m.__diskCacheDirForTest));
  });`;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", code], { cwd, encoding: "utf8" });
  assert.equal(r.status, 0, `child failed from ${cwd}:\n${r.stderr}`);
  return r.stdout.trim();
}

// A MISSING export must be distinguishable from a real value. The `?? null` that used to sit here
// made that impossible: it collapsed BOTH undefined and null to "null", so the guard below — which
// tested for the string "undefined" — could never fire on anything (R&D 0412, driven against three
// synthetic modules). An anti-vacuity guard that is itself vacuous is this week's class recursing,
// and I had written the reassuring comment and then stopped checking it. The coalesce is gone;
// `String(undefined)` is now literally "undefined".
const NOT_A_PATH = new Set(["undefined", "null", ""]);

// Fail CLOSED on a stale or missing build. If dist/ predates the fix the export is absent, and every
// assertion below would compare the same sentinel to itself and PASS — a green that measured nothing.
test("execution-graph: the built artifact exists and exposes its cache dir (else this lock is vacuous)", () => {
  assert.ok(existsSync(DIST), `${DIST} is missing — run \`npm run build\` in this package; a lock that cannot load its subject must not read as green`);
  const v = cacheDirFrom(PKG_ROOT);
  assert.ok(!NOT_A_PATH.has(v),
    `dist/ is STALE or the export is gone (got ${JSON.stringify(v)}) — rebuild, or the assertions below compare a sentinel to itself and pass vacuously`);
  assert.ok(isAbsolute(v), `expected an absolute path, got ${JSON.stringify(v)}`);
});

// ★ PROVE THE GUARD IS ALIVE, by driving it with a synthetic bad input rather than reasoning about
// it. That reasoning is exactly what failed above: the guard looked correct and could not fire.
// R&D 0412 put it best — "the check that proves a check is alive needs its own proof, and there is
// no bottom to that stack", which is the argument for driving guards instead of arguing them.
test("execution-graph: ★ the staleness guard FIRES on a module with no such export (control)", () => {
  const stale = join(tmpdir(), `galerina-stale-probe-${process.pid}.mjs`);
  writeFileSync(stale, "export const somethingElse = 1;\n");
  try {
    const v = cacheDirFrom(PKG_ROOT, pathToFileURL(stale).href);
    assert.ok(NOT_A_PATH.has(v),
      `a module WITHOUT the export must read as a sentinel the guard rejects, got ${JSON.stringify(v)} — ` +
      `if this is a real-looking value the guard above is unfireable and the whole lock is vacuous`);
    assert.equal(v, "undefined", "and specifically 'undefined' — the sentinel the guard names, so comment and code agree");
  } finally {
    rmSync(stale, { force: true });
  }
});

test("execution-graph: the disk cache path does NOT move with process.cwd()", () => {
  const fromRepo = cacheDirFrom(PKG_ROOT);
  const fromElsewhere = cacheDirFrom(tmpdir());
  assert.notEqual(fromRepo, "null", "the module must expose its cache dir for this lock to mean anything");
  assert.equal(fromRepo, fromElsewhere,
    "the cache dir changed with the working directory — this is the exact defect: launched from a " +
    "different cwd the compiler writes its cache somewhere else, outside the repo and outside cleanup.");
});

test("execution-graph: the cache lives INSIDE this package (so .gitignore and cleanup reach it)", () => {
  const dir = cacheDirFrom(tmpdir());
  assert.ok(dir.startsWith(resolve(PKG_ROOT)),
    `cache dir ${dir} is outside the package root ${PKG_ROOT} — nothing in-repo can ignore or clean it`);
  // CONTROL for the assertion above: prove this check can FAIL, so a passing run is not vacuous.
  assert.ok(!resolve(tmpdir(), "build", ".fungi-cache").startsWith(resolve(PKG_ROOT)),
    "control: an out-of-package path must NOT satisfy the containment check");
});
