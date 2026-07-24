/**
 * CLI regression — the SECURITY type-code gate (S1/S2, battery bridge 0148 F1/F2) at the
 * `galerina check` / `galerina build` surface, driven through the REAL CLI (spawn `node galerina.mjs`).
 *
 * The GAP this pins (measured 2026-07-24, MAIN): the type-checker EMITTED FUNGI-TYPE-033 (S1, if/while
 * condition not Bool) and FUNGI-GOV-3VL-004 (S2, ordered comparison on a Verdict) at error-severity, but
 * the CLI advisory-downgrades the whole FUNGI-TYPE-* class in plain `check` (folded only under
 * --strict-types, because ~150 baseline files carry unmigrated type errors) AND `build` never folded type
 * errors into its govErrors gate. So `if <Verdict>` / `v >= 1` — both fail-OPEN authorization holes —
 * passed plain check (exit 0) AND minted a SIGNED .wasm at `build`. (My prior bridge 0166 claim that
 * TYPE-033 already refused build was WRONG; this test is the correction + the standing guard.)
 *
 * The fix (galerina.mjs SECURITY_TYPE_CODES): these two codes fail CLOSED on EVERY surface — plain check
 * exits non-zero AND build refuses to emit/sign — exactly like the INTEGRITY_EFFECT_CODES carve-out does
 * for effect codes. The broader type class STAYS advisory (tests 5/6 pin that the carve-out is surgical).
 *
 * Spawns the root galerina.mjs (cwd = repo root) so it exercises the exact dist + CLI wiring a user hits.
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const BUILD = join(ROOT, "build");
const fixtures = [];

function fixture(name, src) {
  if (!src.startsWith("@version")) src = "@version 1\n" + src;
  mkdirSync(BUILD, { recursive: true });
  const p = join(BUILD, name);
  writeFileSync(p, src);
  fixtures.push(p);
  return p;
}
function cli(cmd, file, extra = []) {
  const r = spawnSync(process.execPath, ["galerina.mjs", cmd, file, ...extra],
    { cwd: ROOT, encoding: "utf-8", timeout: 120000, env: { ...process.env } });
  return { status: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

after(() => {
  for (const p of fixtures) { try { rmSync(p, { force: true }); } catch { /* ignore */ } }
  for (const base of ["__sectype_ord", "__sectype_ifint", "__sectype_mismatch", "__sectype_clean"]) {
    for (const ext of [".wasm", ".wat", ".lmanifest", ".lmanifest.json", ".fuse.json", ".governance-impact.json"]) {
      try { rmSync(join(BUILD, `${base}${ext}`), { force: true }); } catch { /* ignore */ }
    }
  }
});

// S2 — ordered comparison on a Verdict (fail-open authorization)
const ORD = `pure flow g(v: Verdict) -> Int { if v >= 1 { return 1 } return 0 }\n`;
// S1 — non-Bool if condition (fail-open control flow)
const IFINT = `pure flow g(n: Int) -> Int { if n { return 1 } return 0 }\n`;
// An ORDINARY type error (Int returned as String) — must STAY advisory (not in the security carve-out)
const MISMATCH = `pure flow g(n: Int) -> String { return n }\n`;
// The sanctioned Verdict authorization idiom — must be clean
const CLEAN = `pure flow g(v: Verdict) -> Int { if v == Verdict.Allow { return 1 } return 0 }\n`;

test("check: `v >= 1` (FUNGI-GOV-3VL-004, S2) fails CLOSED in plain check — counted, exit 1", () => {
  const r = cli("check", fixture("__sectype_ord.fungi", ORD));
  assert.match(r.out, /FUNGI-GOV-3VL-004/, "ordered-comparison-on-Verdict must surface as an error, not an advisory");
  assert.equal(r.status, 1, `plain check must exit non-zero on the fail-open\n${r.out}`);
});

test("check: `if <Int>` (FUNGI-TYPE-033, S1) fails CLOSED in plain check — counted, exit 1", () => {
  const r = cli("check", fixture("__sectype_ifint.fungi", IFINT));
  assert.match(r.out, /FUNGI-TYPE-033/, "non-Bool if-condition must surface as an error, not an advisory");
  assert.equal(r.status, 1, `plain check must exit non-zero on the fail-open (corrects bridge 0166)\n${r.out}`);
});

test("build: `v >= 1` (FUNGI-GOV-3VL-004) REFUSES the build — no signed artifact", () => {
  const r = cli("build", fixture("__sectype_ord.fungi", ORD));
  assert.match(r.out, /FUNGI-GOV-3VL-004/, "build must name the fail-open code");
  assert.match(r.out, /FAILED \(fail-closed/, "build must fail closed, not mint an artifact");
  assert.equal(r.status, 1, `build of the fail-open flow must be refused\n${r.out}`);
});

test("build: `if <Int>` (FUNGI-TYPE-033) REFUSES the build — no signed artifact", () => {
  const r = cli("build", fixture("__sectype_ifint.fungi", IFINT));
  assert.match(r.out, /FUNGI-TYPE-033/, "build must name the fail-open code");
  assert.match(r.out, /FAILED \(fail-closed/, "build must fail closed, not mint an artifact");
  assert.equal(r.status, 1, `build of the fail-open flow must be refused\n${r.out}`);
});

test("REGRESSION: an ORDINARY type error (Int↦String) STAYS advisory in plain check — exit 0", () => {
  const r = cli("check", fixture("__sectype_mismatch.fungi", MISMATCH));
  assert.match(r.out, /advisory/, "the broad type class must remain a dev-advisory in plain check");
  assert.equal(r.status, 0, `carve-out must be surgical — only the two security codes are promoted\n${r.out}`);
});

test("REGRESSION: --strict-types still enforces the ordinary type error — exit 1", () => {
  const r = cli("check", fixture("__sectype_mismatch.fungi", MISMATCH), ["--strict-types"]);
  assert.match(r.out, /FUNGI-TYPE-008/, "the advisory class still hard-fails under --strict-types");
  assert.equal(r.status, 1, `--strict-types path must be unchanged\n${r.out}`);
});

test("control: the sanctioned `== Verdict.Allow` idiom is clean — exit 0", () => {
  const r = cli("check", fixture("__sectype_clean.fungi", CLEAN));
  assert.doesNotMatch(r.out, /FUNGI-GOV-3VL-004|FUNGI-TYPE-033/, "the exact-match authorization idiom must not trip the gate");
  assert.equal(r.status, 0, `the clean idiom must pass\n${r.out}`);
});
