import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  parseCanonicalJsonBytes,
  sha256Canonical,
  validateProposedBaseline,
} from "../lib/logic-aig-source-origin/contract.mjs";

const AUDIT = new URL("../audit-example-diagnostics.mjs", import.meta.url);
const OWNER = new URL("../../governance/example-proposed-baseline.json", import.meta.url);
const EXPECTED_ENTRIES = Object.freeze([
  Object.freeze({ directoryName: "Proposed-024-vault-global-basic", reason: "`vault global` has no grammar — parser.ts:5764 implements only `vault secure` (RD-0531 step 1)" }),
  Object.freeze({ directoryName: "Proposed-025-vault-global-secret-invalid", reason: "`vault global` has no grammar — same RD-0531 refusal" }),
  Object.freeze({ directoryName: "Proposed-229-vault-write-without-mut-invalid", reason: "cannot demonstrate FUNGI-VAULT-004: the vault-write syntax `mut secure.x = v` that governance-verifier.ts:302 documents does NOT parse (parser.ts:1601 parseMutDecl takes ONE identifier then expects `=`; no member-path production). Board #174" }),
  Object.freeze({ directoryName: "Proposed-464-enterprise-supply-chain", reason: "cannot demonstrate FUNGI-MODULE-005: package-policy grammar and a signed/canonical policy input are absent from the root check/build path; current package enforcement uses FUNGI-PKG-* and MODULE-005 remains design-only" }),
  Object.freeze({ directoryName: "Proposed-473-scoped-vault-request", reason: "`vault request` is not one of the three declared scopes (secure|global|session)" }),
  Object.freeze({ directoryName: "Proposed-474-vault-session-session-pattern", reason: "`vault session` has no grammar — same RD-0531 refusal" }),
  Object.freeze({ directoryName: "Proposed-Readable-Logic-Forms", reason: "readable-alias syntax (`status is Active` for `==`) is a LANGUAGE PROPOSAL with no grammar; its examples self-declare \"not yet in grammar\" and an expected_diagnostics contract that applies only \"when adopted\"" }),
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

test("installs the approved canonical Proposed-baseline owner without a second executable copy", async () => {
  const bytes = await readFile(OWNER);
  assert.equal(bytes.length, 1605);
  assert.equal(sha256(bytes), "eb1620e43d72f2d1afc3fc7c467c06856d99d936d45c905ef4f1b77abdff8817");
  assert.equal(bytes.includes(10), false);
  assert.equal(bytes.includes(13), false);
  const value = validateProposedBaseline(parseCanonicalJsonBytes(bytes, { label: "Proposed baseline" }));
  assert.deepEqual(value.entries, EXPECTED_ENTRIES);
  assert.equal(value.policyDigest, "7e244a1486778fc21fefbb9412ac1057172f716124ec0266f0ccedbae6dca6f8");

  const auditSource = await readFile(AUDIT, "utf8");
  assert.equal(auditSource.includes("const PROPOSED_BASELINE = Object.freeze({"), false);
  assert.equal(auditSource.includes(EXPECTED_ENTRIES[0].reason), false);
});

test("Proposed-baseline validation refuses reason drift, duplicate authority rows, and stale digests", async () => {
  const bytes = await readFile(OWNER);
  const value = JSON.parse(bytes.toString("utf8"));

  const drifted = structuredClone(value);
  drifted.entries[0].reason += " drift";
  assert.throws(() => validateProposedBaseline(drifted), /SOURCE_ORIGIN_/);

  const duplicate = structuredClone(value);
  duplicate.entries.splice(1, 0, structuredClone(duplicate.entries[0]));
  duplicate.policyDigest = sha256Canonical(duplicate.schema, {
    schema: duplicate.schema,
    entries: duplicate.entries,
    authorizing: duplicate.authorizing,
  });
  assert.throws(() => validateProposedBaseline(duplicate), /SOURCE_ORIGIN_/);
});

test("the migrated audit self-test retains its detector and exit contract", () => {
  const result = spawnSync(process.execPath, [fileURLToPath(AUDIT), "--self-test"], {
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /self-test: 18\/18 detectors fire/);
  assert.equal(result.stderr, "");
});
