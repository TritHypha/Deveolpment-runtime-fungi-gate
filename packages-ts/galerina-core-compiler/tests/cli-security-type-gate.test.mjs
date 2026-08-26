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
  for (const base of ["__sectype_ord", "__sectype_ifint", "__sectype_label", "__sectype_mismatch", "__sectype_clean", "__sectype_mixed", "__sectype_vv", "__sectype_match", "__sectype_notv", "__sectype_fold", "__sectype_cmp", "__sectype_ret", "__sectype_vcmp", "__sectype_vret"]) {
    for (const ext of [".wasm", ".wat", ".lmanifest", ".lmanifest.json", ".fuse.json", ".governance-impact.json"]) {
      try { rmSync(join(BUILD, `${base}${ext}`), { force: true }); } catch { /* ignore */ }
    }
  }
});

// S2 — ordered comparison on a Verdict (fail-open authorization)
const ORD = `pure flow g(v: Verdict) -> Int { if v >= 1 { return 1 } return 0 }\n`;
// S1 — non-Bool if condition (fail-open control flow)
const IFINT = `pure flow g(n: Int) -> Int { if n { return 1 } return 0 }\n`;
// A sensitivity label is not a cast: this would claim protected data was irreversibly redacted.
const LABEL_LAUNDER = `pure flow g(email: protected Email) -> String { let audit: redacted Email = email  return "ok" }\n`;
// S3 — mixed Verdict×Bool boolean operand (fail-open: UNKNOWN coerced into a decision)
const MIXED = `pure flow g(v: Verdict, w: Verdict) -> Verdict { return v and w }\n`;
const MIXEDBAD = `pure flow g(v: Verdict, b: Bool) -> Verdict { let r: Verdict = v and b  return r }\n`;
// S3 — a Verdict `match` whose wildcard covers the DENY arm (fail-open: DENY swept into the default)
const MATCHBAD = `pure flow g(v: Verdict) -> Int { match v { Allow => { return 1 } _ => { return 0 } } }\n`;
// S3+ — `!v` boolean-negates a Verdict (FUNGI-K3-002 — turns a trit into a decision, fail-open)
const NOTVERDICT = `pure flow g(v: Verdict) -> Bool { return !v }\n`;
// S3+ — a K3 fold `all{}` with a non-Verdict operand (FUNGI-K3-003 — unsound coercion into the fold)
const FOLDBAD = `pure flow g(v: Verdict, n: Int) -> Verdict { return all{ v n } }\n`;
// S3/A9 — a Verdict compared to a non-Verdict (FUNGI-K3-004, minted per R&D 0174)
const CMPBAD = `pure flow g(v: Verdict, b: Bool) -> Int { if v == b { return 1 } return 0 }\n`;
// S3/A9 — a non-Verdict returned where Verdict is declared (FUNGI-K3-005, minted per R&D 0174)
const RETBAD = `pure flow g() -> Verdict { return 2 }\n`;
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

test("check+build: protected-to-redacted without redact() (FUNGI-TYPE-034) fails CLOSED", () => {
  const path = fixture("__sectype_label.fungi", LABEL_LAUNDER);
  const c = cli("check", path);
  assert.match(c.out, /FUNGI-TYPE-034/, "label laundering must surface as a security error");
  assert.equal(c.status, 1, `plain check must exit non-zero on label laundering\n${c.out}`);
  const b = cli("build", path);
  assert.match(b.out, /FUNGI-TYPE-034/, "build must name the label-integrity diagnostic");
  assert.match(b.out, /FAILED \(fail-closed/, "build must refuse, not mint an artifact");
  assert.equal(b.status, 1, `build must be refused on label laundering\n${b.out}`);
});

test("check: `v and b` (FUNGI-K3-001, S3) fails CLOSED in plain check — counted, exit 1", () => {
  const r = cli("check", fixture("__sectype_mixed.fungi", MIXEDBAD));
  assert.match(r.out, /FUNGI-K3-001/, "mixed Verdict×Bool operand must surface as an error, not an advisory");
  assert.equal(r.status, 1, `plain check must exit non-zero on the mixed-operand fail-open\n${r.out}`);
});

test("build: `v and b` (FUNGI-K3-001) REFUSES the build — no signed artifact", () => {
  const r = cli("build", fixture("__sectype_mixed.fungi", MIXEDBAD));
  assert.match(r.out, /FUNGI-K3-001/, "build must name the mixed-operand fail-open code");
  assert.match(r.out, /FAILED \(fail-closed/, "build must fail closed, not mint an artifact");
  assert.equal(r.status, 1, `build of the mixed-operand fail-open must be refused\n${r.out}`);
});

test("control: `v and w` (Verdict×Verdict, the sanctioned K3 lane) is clean — exit 0", () => {
  const r = cli("check", fixture("__sectype_vv.fungi", MIXED));
  assert.doesNotMatch(r.out, /FUNGI-K3-001/, "the Verdict×Verdict K3 min/max lane must not trip the gate");
  assert.equal(r.status, 0, `the sanctioned K3 lane must pass\n${r.out}`);
});

test("check: `match v { .Allow => .. _ => .. }` (FUNGI-GOV-3VL-003, S3) fails CLOSED — counted, exit 1", () => {
  const r = cli("check", fixture("__sectype_match.fungi", MATCHBAD));
  assert.match(r.out, /FUNGI-GOV-3VL-003/, "a Verdict-match wildcard over DENY must surface as an error, not an advisory");
  assert.equal(r.status, 1, `plain check must exit non-zero on the wildcard-over-DENY fail-open\n${r.out}`);
});

test("build: the Verdict-match wildcard-over-DENY (FUNGI-GOV-3VL-003) REFUSES the build", () => {
  const r = cli("build", fixture("__sectype_match.fungi", MATCHBAD));
  assert.match(r.out, /FUNGI-GOV-3VL-003/, "build must name the wildcard-over-DENY fail-open code");
  assert.match(r.out, /FAILED \(fail-closed/, "build must fail closed, not mint an artifact");
  assert.equal(r.status, 1, `build of the wildcard-over-DENY fail-open must be refused\n${r.out}`);
});

test("check+build: `!v` on a Verdict (FUNGI-K3-002) fails CLOSED — counted + build refused", () => {
  const c = cli("check", fixture("__sectype_notv.fungi", NOTVERDICT));
  assert.match(c.out, /FUNGI-K3-002/, "boolean-negating a Verdict must surface as an error");
  assert.equal(c.status, 1, `plain check must exit non-zero\n${c.out}`);
  const b = cli("build", fixture("__sectype_notv.fungi", NOTVERDICT));
  assert.match(b.out, /FAILED \(fail-closed/, "build must refuse, not mint an artifact");
  assert.equal(b.status, 1, `build must be refused\n${b.out}`);
});

test("check+build: K3 fold `all{ v n }` with a non-Verdict (FUNGI-K3-003) fails CLOSED", () => {
  const c = cli("check", fixture("__sectype_fold.fungi", FOLDBAD));
  assert.match(c.out, /FUNGI-K3-003/, "a non-Verdict fold operand must surface as an error");
  assert.equal(c.status, 1, `plain check must exit non-zero\n${c.out}`);
  const b = cli("build", fixture("__sectype_fold.fungi", FOLDBAD));
  assert.match(b.out, /FAILED \(fail-closed/, "build must refuse, not mint an artifact");
  assert.equal(b.status, 1, `build must be refused\n${b.out}`);
});

test("check+build: `v == b` (FUNGI-K3-004) fails CLOSED — counted + build refused", () => {
  const c = cli("check", fixture("__sectype_cmp.fungi", CMPBAD));
  assert.match(c.out, /FUNGI-K3-004/, "Verdict compared to a non-Verdict must surface as an error");
  assert.equal(c.status, 1, `plain check must exit non-zero\n${c.out}`);
  const b = cli("build", fixture("__sectype_cmp.fungi", CMPBAD));
  assert.match(b.out, /FAILED \(fail-closed/, "build must refuse, not mint an artifact");
  assert.equal(b.status, 1, `build must be refused\n${b.out}`);
});

test("check+build: `return 2` as Verdict (FUNGI-K3-005) fails CLOSED — counted + build refused", () => {
  const c = cli("check", fixture("__sectype_ret.fungi", RETBAD));
  assert.match(c.out, /FUNGI-K3-005/, "a non-Verdict returned as Verdict must surface as an error");
  assert.equal(c.status, 1, `plain check must exit non-zero\n${c.out}`);
  const b = cli("build", fixture("__sectype_ret.fungi", RETBAD));
  assert.match(b.out, /FAILED \(fail-closed/, "build must refuse, not mint an artifact");
  assert.equal(b.status, 1, `build must be refused\n${b.out}`);
});

test("control: `v == Verdict.Allow` + `return Verdict.Allow` stay clean — exit 0", () => {
  const r1 = cli("check", fixture("__sectype_vcmp.fungi", `pure flow g(v: Verdict) -> Int { if v == Verdict.Allow { return 1 } return 0 }\n`));
  assert.doesNotMatch(r1.out, /FUNGI-K3-004/, "the sanctioned Verdict==Verdict authorization must not trip K3-004");
  assert.equal(r1.status, 0, `== Verdict.Allow must pass\n${r1.out}`);
  const r2 = cli("check", fixture("__sectype_vret.fungi", `pure flow g() -> Verdict { return Verdict.Allow }\n`));
  assert.doesNotMatch(r2.out, /FUNGI-K3-005/, "returning a real Verdict must not trip K3-005");
  assert.equal(r2.status, 0, `return Verdict.Allow must pass\n${r2.out}`);
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
