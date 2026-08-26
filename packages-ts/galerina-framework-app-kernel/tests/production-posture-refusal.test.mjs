// Production-posture refusal — FUNGI-FUSE-UNSIGNED-DENIED (RD-0234b Class B(ii)).
//
// WHY THIS EXISTS
//   R&D 0396 measured that 20 of the 51 signing-path refusal codes have ZERO test mention, and
//   this was one of them. "No test mention" is not "broken" — it is a lower bound on assurance —
//   but for a refusal that decides whether an UNSIGNED package may enter a PRODUCTION fuse, an
//   unasserted refusal is exactly the class this project has been bitten by before: the comment
//   at galerina.mjs:1083 records that the posture-derived override was ONCE dead code, and an
//   unsigned package was admitted under the production profile. Nothing stopped that regressing.
//
//   I drove it by hand first and it fires. This locks that in so the next regression is loud.
//
// WHAT IT ASSERTS
//   1. Under GALERINA_PROFILE=production, `--allow-unsigned` is REFUSED, by code, fail-closed
//      (non-zero exit — refused, not warned-and-continued).
//   2. CONTROL: the identical command under a non-production profile does NOT produce that code.
//      Without this, assertion 1 would still pass if the CLI had simply started erroring on
//      everything — it would prove the refusal is reachable, not that it is POSTURE-SPECIFIC.
//
// The refusal fires before any package is loaded, so this needs no built fixture and no key
// material. It is a pure deny-path assertion: nothing here signs, verifies, or reads a key.
import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(here, "..", "..", ".."); // tests/ -> package -> packages-ts -> root
const CLI = join(REPO_ROOT, "galerina.mjs");
const CODE = "FUNGI-FUSE-UNSIGNED-DENIED";
// A path that cannot exist: the refusal is reached before the directory is ever read, so the
// argument only has to satisfy "at least one package dir was named".
const ABSENT_PKG = join(REPO_ROOT, "__no_such_package_dir_for_posture_test__");

function runFuse(profile) {
  const r = spawnSync(process.execPath, [CLI, "fuse", "--allow-unsigned", ABSENT_PKG], {
    cwd: REPO_ROOT,
    env: { ...process.env, GALERINA_PROFILE: profile },
    encoding: "utf8",
  });
  return { out: `${r.stdout ?? ""}${r.stderr ?? ""}`, status: r.status };
}

test("production posture REFUSES --allow-unsigned by code, fail-closed", () => {
  const { out, status } = runFuse("production");
  assert.ok(out.includes(CODE), `expected ${CODE} under the production profile; got:\n${out}`);
  assert.notEqual(status, 0, "the refusal must be fail-closed — a non-zero exit, not a warning");
});

test("CONTROL: a non-production posture does NOT emit the refusal", () => {
  const { out } = runFuse("development");
  assert.ok(!out.includes(CODE),
    `${CODE} must be POSTURE-specific — emitting it under development would mean the check is ` +
    `firing on everything, and the test above would prove nothing:\n${out}`);
});
