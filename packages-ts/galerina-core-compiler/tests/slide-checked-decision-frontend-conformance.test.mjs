// =============================================================================
// F-05 conformance vectors — the .fungi checked-decision receipt validator is
// EXECUTED against a mutation corpus, and its domain is compared with the
// independent SLIDE validator's DECLARED domain (owner review 2026-08-07,
// finding F-05: "build executable .fungi conformance vectors matching the
// independent validator's accepted and refused domain ... keep the .fungi
// candidate non-authorizing until exact parity and independent execution are
// proven").
//
// Engines:
//   CANDIDATE — src/self-hosted/slide-checked-decision-frontend.fungi, executed
//     per vector through parseProgram + executeFlow on an in-memory harness
//     (record literals are built in .fungi itself; nothing is written to disk).
//   DOMAIN ORACLE — the independent validator's own declared constants (HASH,
//     IDENTIFIER, PACKAGE_ID, PROFILE_ID, VERSION, MAPPING_KINDS,
//     PARAMETER_TYPES) extracted LIVE from ../../../../SLIDE/src/
//     checked-decision-frontend-receipt.mjs (read-only). If SLIDE tightens or
//     loosens a pattern, this test sees it the same day.
//
// Honest scope:
//   - The full-pipeline oracle (canonical receipt bytes + source re-derivation,
//     validateCheckedDecisionFrontendReceipt) is exercised by SLIDE's own suite
//     and by scripts/tests/export-slide-checked-decision-receipt.test.mjs with
//     a GENUINE exporter pair; hand-built vectors cannot pass its byte-
//     canonicality gate by design, so this file does not duplicate that arm.
//   - Uniqueness-of-parameter-names and exact-keys (surplus facts) are oracle
//     LOGIC, not constants; their divergence rows are cited to the review
//     rather than live-extracted. Surplus fields are additionally INEXPRESSIBLE
//     in the .fungi candidate (closed record type) — a candidate strength.
//   - The candidate stays NON-AUTHORIZING: authorityReleased is asserted false
//     on EVERY path, allow and refuse alike.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseProgram, executeFlow } from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, "..");
const VALIDATOR = join(PKG, "src", "self-hosted", "slide-checked-decision-frontend.fungi");
const SLIDE_ROOT = process.env.GALERINA_SLIDE_DIR
  ? resolve(process.env.GALERINA_SLIDE_DIR)
  : join(PKG, "..", "..", "..", "SLIDE");
const SLIDE_ORACLE = join(SLIDE_ROOT, "src", "checked-decision-frontend-receipt.mjs");

// ---------- domain-constant extraction (live, with a self-test) ----------

function extractDomain(sourceText) {
  const rx = (name) => {
    const m = sourceText.match(new RegExp("const " + name + " = (/.*?/)u?;"));
    if (!m) return null;
    const body = m[1];
    const last = body.lastIndexOf("/");
    return new RegExp(body.slice(1, last), body.slice(last + 1).replace("u", "") + "u");
  };
  const set = (name) => {
    const m = sourceText.match(new RegExp("const " + name + " = new Set\\(\\[([^\\]]*)\\]", "s"));
    if (!m) return null;
    return new Set([...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
  };
  return {
    HASH: rx("HASH"),
    IDENTIFIER: rx("IDENTIFIER"),
    PACKAGE_ID: rx("PACKAGE_ID"),
    PROFILE_ID: rx("PROFILE_ID"),
    VERSION: rx("VERSION"),
    MAPPING_KINDS: set("MAPPING_KINDS"),
    PARAMETER_TYPES: set("PARAMETER_TYPES"),
  };
}

const oracleSource = readFileSync(SLIDE_ORACLE, "utf8");
const DOMAIN = extractDomain(oracleSource);

test("domain extraction control — all 7 constants found and the HASH pattern discriminates", () => {
  for (const [k, v] of Object.entries(DOMAIN)) assert.ok(v, "constant not extracted: " + k);
  assert.ok(DOMAIN.MAPPING_KINDS.size >= 2, "MAPPING_KINDS implausibly small");
  assert.ok(DOMAIN.HASH.test("a".repeat(64)), "HASH must accept lowercase 64-hex");
  assert.ok(!DOMAIN.HASH.test("A".repeat(64)), "HASH must reject uppercase (the F-05 gap axis)");
  assert.ok(!DOMAIN.HASH.test("z".repeat(64)), "HASH must reject non-hex");
});

// ---------- the base receipt (domain-clean by construction) ----------

const KINDS = [...(DOMAIN.MAPPING_KINDS ?? ["decision", "return"])];
const hex = (ch) => ch.repeat(64);

function baseReceipt() {
  return {
    schema: "galerina.slide.checked-decision-frontend.v1",
    frontendId: "@galerina/core-compiler",
    frontendVersion: "1.0.0",
    languageEdition: 1,
    packageId: "@galerina/core-compiler",
    profileId: "galerina.package.checked-decision.v1",
    sourceNormalization: "UTF8_LF_V1",
    sourceByteLength: 120,
    sourceDigest: hex("a"),
    flowName: "decide",
    parameters: [
      { index: 0, name: "gate", typeName: "Verdict" },
      { index: 1, name: "flag", typeName: "Bool" },
    ],
    returnType: "Int",
    k3Sensitive: true,
    semanticTokenDigest: hex("b"),
    mappings: [
      { instructionId: 0, kind: KINDS[0], startByte: 0, endByte: 60 },
      { instructionId: 1, kind: KINDS[1] ?? KINDS[0], startByte: 60, endByte: 120 },
    ],
    decisionGraphCanonical: "{}",
    decisionGraphDigest: hex("c"),
    instructionCount: 2,
    diagnosticDigest: hex("d"),
    memoryPlanDigest: hex("e"),
    effectPlanDigest: hex("f"),
    failurePlanDigest: hex("0"),
    capabilityPlanDigest: hex("1"),
    producerGIRDigest: hex("2"),
    deterministic: true,
    referenceOnly: true,
  };
}

// ---------- JS -> .fungi record-literal serializer (fail-closed) ----------

const FIELD_ORDER = [
  "schema", "frontendId", "frontendVersion", "languageEdition", "packageId",
  "profileId", "sourceNormalization", "sourceByteLength", "sourceDigest",
  "flowName", "parameters", "returnType", "k3Sensitive", "semanticTokenDigest",
  "mappings", "decisionGraphCanonical", "decisionGraphDigest",
  "instructionCount", "diagnosticDigest", "memoryPlanDigest", "effectPlanDigest",
  "failurePlanDigest", "capabilityPlanDigest", "producerGIRDigest",
  "deterministic", "referenceOnly",
];
const PARAM_ORDER = ["index", "name", "typeName"];
const MAP_ORDER = ["instructionId", "kind", "startByte", "endByte"];

function fungiString(s) {
  if (/["\\\r\n]/.test(s)) throw new Error("serializer refuses escapes: " + JSON.stringify(s));
  return '"' + s + '"';
}
function fungiValue(v) {
  if (typeof v === "string") return fungiString(v);
  if (typeof v === "number") { assert.ok(Number.isSafeInteger(v)); return String(v); }
  if (typeof v === "boolean") return v ? "true" : "false";
  throw new Error("serializer refuses value: " + typeof v);
}
function fungiRecord(obj, order) {
  const parts = order.map((k) => {
    const v = obj[k];
    if (Array.isArray(v)) {
      const inner = v.map((el) => fungiRecord(el, k === "parameters" ? PARAM_ORDER : MAP_ORDER)).join(", ");
      return k + ": [" + inner + "]";
    }
    return k + ": " + fungiValue(v);
  });
  return "{ " + parts.join(" ") + " }";
}

// ---------- vector corpus ----------

// [id, mutate(base)->receipt, expectedCandidateFailureId, domainCheck|null, note]
// domainCheck: { verdict: "reject"|"accept", why } evaluated against DOMAIN live —
// null when the divergence rests on oracle LOGIC (review-cited, not extractable).
const VECTORS = [
  ["V00_base_allow", (r) => r, "NONE", { verdict: "accept", why: "base is domain-clean by construction" }, "the allow path"],
  ["V01_schema", (r) => ({ ...r, schema: "galerina.slide.checked-decision-frontend.v2" }), "SLIDE-CDFRONT-001", null, "unknown schema"],
  ["V02_frontend", (r) => ({ ...r, frontendId: "@evil/compiler" }), "SLIDE-CDFRONT-002", null, "wrong frontend identity"],
  ["V03_pkg_empty", (r) => ({ ...r, packageId: "" }), "SLIDE-CDFRONT-003", null, "empty package identity"],
  ["V04_norm", (r) => ({ ...r, sourceNormalization: "UTF8_CRLF_V1" }), "SLIDE-CDFRONT-004", null, "wrong normalization"],
  ["V05_ret", (r) => ({ ...r, returnType: "Bool" }), "SLIDE-CDFRONT-005", null, "wrong return type"],
  ["V06_count", (r) => ({ ...r, instructionCount: 3 }), "SLIDE-CDFRONT-006", null, "instructionCount != mappings"],
  ["V07_graph", (r) => ({ ...r, decisionGraphCanonical: "x" }), "SLIDE-CDFRONT-007", null, "decision graph too short"],
  ["V08_plan", (r) => ({ ...r, diagnosticDigest: "d".repeat(63) }), "SLIDE-CDFRONT-008", null, "plan digest length 63"],
  ["V09_det", (r) => ({ ...r, deterministic: false }), "SLIDE-CDFRONT-009", null, "determinism refused"],
  ["V09b_ref", (r) => ({ ...r, referenceOnly: false }), "SLIDE-CDFRONT-009", null, "reference boundary refused"],
  // ---- the review's five divergence vectors: PARITY CLOSED — candidate now REFUSES each ----
  ["V10_upper_hex", (r) => ({ ...r, sourceDigest: "A".repeat(64) }), "SLIDE-CDFRONT-004", { verdict: "reject", why: "HASH requires lowercase hex" }, "parity: digest form"],
  ["V12_kind_banana", (r) => ({ ...r, mappings: [{ instructionId: 0, kind: "banana", startByte: 0, endByte: 120 }], instructionCount: 1 }), "SLIDE-CDFRONT-006", { verdict: "reject", why: "MAPPING_KINDS is closed" }, "parity: mapping kind"],
  ["V13_pkg_pattern", (r) => ({ ...r, packageId: "Not Canonical Id" }), "SLIDE-CDFRONT-003", { verdict: "reject", why: "PACKAGE_ID pattern" }, "parity: identity pattern"],
  ["V14_param_ident", (r) => ({ ...r, parameters: [{ index: 0, name: "not a name!", typeName: "Verdict" }, { index: 1, name: "flag", typeName: "Bool" }] }), "SLIDE-CDFRONT-005", { verdict: "reject", why: "IDENTIFIER pattern" }, "parity: param identifier"],
  ["V11_dup_params", (r) => ({ ...r, parameters: [{ index: 0, name: "gate", typeName: "Verdict" }, { index: 1, name: "gate", typeName: "Bool" }] }), "SLIDE-CDFRONT-005", null, "parity: duplicate parameter names (oracle LOGIC rule)"],
  // ---- parity additions: forms the oracle refuses that no vector previously drove ----
  ["V25_profile_pattern", (r) => ({ ...r, profileId: "not.a.profile.v1" }), "SLIDE-CDFRONT-003", { verdict: "reject", why: "PROFILE_ID prefix" }, "parity: profile identity"],
  ["V26_version_form", (r) => ({ ...r, frontendVersion: "one.two.three" }), "SLIDE-CDFRONT-002", { verdict: "reject", why: "VERSION pattern" }, "parity: version form"],
  ["V27_nonhex_digest", (r) => ({ ...r, producerGIRDigest: "z".repeat(64) }), "SLIDE-CDFRONT-008", { verdict: "reject", why: "HASH rejects non-hex" }, "parity: non-hex plan digest"],
  ["V28_flow_ident", (r) => ({ ...r, flowName: "not a flow!" }), "SLIDE-CDFRONT-003", { verdict: "reject", why: "IDENTIFIER for flowName" }, "parity: flow name identifier"],
  ["V29_version_prerelease", (r) => ({ ...r, frontendVersion: "1.2.3-beta.1" }), "NONE", { verdict: "accept", why: "VERSION admits a prerelease suffix" }, "parity CONTROL: legal prerelease still ADMITTED"],
  ["V30_kind_other_member", (r) => ({ ...r, mappings: [{ instructionId: 0, kind: "K3_AMBIG", startByte: 0, endByte: 120 }], instructionCount: 1 }), "NONE", { verdict: "accept", why: "K3_AMBIG is a registry member" }, "parity CONTROL: another legal kind still ADMITTED"],
  // ---- boundary vectors (both domains refuse or candidate refuses) ----
  ["V15_params_empty", (r) => ({ ...r, parameters: [] }), "SLIDE-CDFRONT-005", null, "no parameters"],
  ["V17_map_overlap", (r) => ({ ...r, mappings: [{ instructionId: 0, kind: KINDS[0], startByte: 0, endByte: 60 }, { instructionId: 1, kind: KINDS[0], startByte: 30, endByte: 90 }] }), "SLIDE-CDFRONT-006", null, "overlapping byte ranges"],
  ["V18_map_beyond", (r) => ({ ...r, mappings: [{ instructionId: 0, kind: KINDS[0], startByte: 0, endByte: 200 }], instructionCount: 1 }), "SLIDE-CDFRONT-006", null, "endByte beyond source"],
  ["V19_flow_long", (r) => ({ ...r, flowName: "f".repeat(81) }), "SLIDE-CDFRONT-003", null, "flow name length 81"],
  ["V20_ver_long", (r) => ({ ...r, frontendVersion: "1".repeat(65) }), "SLIDE-CDFRONT-002", null, "version length 65"],
  ["V21_verdict_at_1", (r) => ({ ...r, parameters: [{ index: 0, name: "gate", typeName: "Verdict" }, { index: 1, name: "late", typeName: "Verdict" }] }), "SLIDE-CDFRONT-005", null, "Verdict only admitted at index 0"],
  ["V22_bool_head_k3", (r) => ({ ...r, parameters: [{ index: 0, name: "flag", typeName: "Bool" }, { index: 1, name: "gate", typeName: "Bool" }] }), "SLIDE-CDFRONT-005", null, "k3Sensitive demands Verdict head"],
  ["V23_src_zero", (r) => ({ ...r, sourceByteLength: 0, mappings: [{ instructionId: 0, kind: KINDS[0], startByte: 0, endByte: 0 }], instructionCount: 1 }), "SLIDE-CDFRONT-004", null, "zero source length"],
  ["V24_kind_long", (r) => ({ ...r, mappings: [{ instructionId: 0, kind: "k".repeat(33), startByte: 0, endByte: 120 }], instructionCount: 1 }), "SLIDE-CDFRONT-006", null, "mapping kind length 33"],
];

// ---------- harness (in-memory) ----------

const validatorSource = readFileSync(VALIDATOR, "utf8");

function wrapperFlow(id, receipt) {
  return [
    "pure flow " + id + "() -> String",
    "{",
    "  let r: SLIDECheckedDecisionFrontendResult = validateSLIDECheckedDecisionFrontendReceipt(",
    "    " + fungiRecord(receipt, FIELD_ORDER) + ",",
    "  )",
    "  mut auth: String = \"F\"",
    "  if r.authorityReleased { auth = \"T\" }",
    "  return r.failureId + \"|\" + slideCheckedDecisionVerdictText(r.verdict) + \"|\" + auth",
    "}",
  ].join("\n");
}

const harness = [
  validatorSource,
  "",
  ...VECTORS.map(([id, mutate]) => wrapperFlow(id, mutate(baseReceipt()))),
  "",
  "pure flow k3_deny_text() -> String { return slideCheckedDecisionVerdictText(Verdict.Deny) }",
  "pure flow k3_allow_text() -> String { return slideCheckedDecisionVerdictText(Verdict.Allow) }",
  "pure flow k3_unknown_text() -> String { return slideCheckedDecisionVerdictText(Verdict.Unknown) }",
].join("\n");

const parsed = parseProgram(harness, "slide-checked-decision-frontend-conformance-harness.fungi", {
  requireVersionHeader: true,
});

test("harness parses with zero errors (the corpus is well-formed .fungi)", () => {
  assert.deepEqual(parsed.diagnostics.filter((d) => d.severity === "error"), []);
});

// ---------- executable conformance ----------

for (const [id, mutate, expectCandidate, domainCheck, note] of VECTORS) {
  test("vector " + id + " — " + note, async () => {
    const r = await executeFlow(id, new Map(), parsed.ast);
    const text = r?.value?.value;
    assert.equal(typeof text, "string", "wrapper must return a string, got " + JSON.stringify(r?.value));
    const [failureId, verdictText, auth] = text.split("|");
    assert.equal(failureId, expectCandidate, "candidate failureId");
    assert.equal(verdictText, expectCandidate === "NONE" ? "1" : "-1", "candidate K3 verdict must match its failureId");
    assert.equal(auth, "F", "authorityReleased must be false on EVERY path (non-authorizing)");
    if (domainCheck) {
      const receipt = mutate(baseReceipt());
      const rejects = [];
      // EVERY digest field the oracle's receiptShapeValid runs HASH over — an incomplete
      // sweep here makes the domain arm blind (caught by V27/V28 on their first run).
      for (const key of [
        "sourceDigest", "semanticTokenDigest", "decisionGraphDigest", "diagnosticDigest",
        "memoryPlanDigest", "effectPlanDigest", "failurePlanDigest", "capabilityPlanDigest",
        "producerGIRDigest",
      ]) {
        if (!DOMAIN.HASH.test(receipt[key])) rejects.push("HASH:" + key);
      }
      if (!DOMAIN.IDENTIFIER.test(receipt.flowName)) rejects.push("IDENTIFIER:flowName");
      if (!DOMAIN.PACKAGE_ID.test(receipt.packageId)) rejects.push("PACKAGE_ID");
      if (!DOMAIN.PROFILE_ID.test(receipt.profileId)) rejects.push("PROFILE_ID");
      if (!DOMAIN.VERSION.test(receipt.frontendVersion)) rejects.push("VERSION");
      for (const p of receipt.parameters) {
        if (!DOMAIN.IDENTIFIER.test(p.name)) rejects.push("IDENTIFIER:" + p.name);
        if (!DOMAIN.PARAMETER_TYPES.has(p.typeName)) rejects.push("PARAMETER_TYPES:" + p.typeName);
      }
      for (const m of receipt.mappings) {
        if (!DOMAIN.MAPPING_KINDS.has(m.kind)) rejects.push("MAPPING_KINDS:" + m.kind);
      }
      if (domainCheck.verdict === "reject") {
        assert.ok(rejects.length >= 1,
          "oracle DOMAIN was expected to reject (" + domainCheck.why + ") but no constant fired — SLIDE domain drifted or the vector is stale");
      } else {
        assert.deepEqual(rejects, [], "base vector must be domain-clean; fired: " + rejects.join(","));
      }
    }
  });
}

test("K3 three-state coverage — the verdict text preserves deny/unknown/allow distinctly", async () => {
  const deny = await executeFlow("k3_deny_text", new Map(), parsed.ast);
  const allow = await executeFlow("k3_allow_text", new Map(), parsed.ast);
  const unknown = await executeFlow("k3_unknown_text", new Map(), parsed.ast);
  assert.equal(deny?.value?.value, "-1");
  assert.equal(allow?.value?.value, "1");
  assert.equal(unknown?.value?.value, "0");
});

test("PARITY LEDGER — zero candidate-accepts/oracle-refuses rows remain", () => {
  // The invariant that replaces the divergence ledger: no vector may expect the CANDIDATE to
  // admit (failureId NONE) a receipt the oracle DOMAIN rejects. Every such row was a review gap;
  // all five are now closed, and this test refuses the reintroduction of a sixth.
  const stillDivergent = VECTORS.filter(([, , exp, d]) => exp === "NONE" && d !== null && d.verdict === "reject");
  assert.deepEqual(stillDivergent.map(([id]) => id), [],
    "a vector expects the candidate to ADMIT what the oracle domain REFUSES — parity regression");
  // And the reverse direction: every domain-clean control must still be admitted.
  const cleanControls = VECTORS.filter(([, , exp, d]) => d !== null && d.verdict === "accept");
  assert.ok(cleanControls.length >= 3, "keep discriminating accept-controls so the parity checks cannot be vacuously strict");
  assert.deepEqual(cleanControls.filter(([, , exp]) => exp !== "NONE").map(([id]) => id), [],
    "a domain-clean control is expected to be refused — the parity checks are over-strict");
});
