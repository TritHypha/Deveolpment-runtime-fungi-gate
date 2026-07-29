import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { before, describe, it } from "node:test";

import { checkTypes, executeFlow, parseProgram } from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(
  HERE,
  "..",
  "src",
  "self-hosted",
  "slide-v2b-capability-request.fungi",
);
const LEASE_SOURCE = join(
  HERE,
  "..",
  "src",
  "self-hosted",
  "slide-v2b-lease-shape.fungi",
);

let parsed;
let capabilitySet;
let leaseFixture;

function field(record, name) {
  assert.equal(record.__tag, "record");
  const value = record.fields.get(name);
  assert.ok(value, `missing field ${name}`);
  return value;
}

function intValue(value) {
  return { __tag: "int", value };
}

function stringValue(value) {
  return { __tag: "string", value };
}

async function run(flowName, args = new Map()) {
  return executeFlow(
    flowName,
    args,
    parsed.ast,
    parsed.flows,
    undefined,
    undefined,
    { pureFastPath: false },
  );
}

async function validate(candidate) {
  const result = await run(
    "validateSLIDEV2BCapabilitySet",
    new Map([["candidate", candidate]]),
  );
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  return result.value;
}

async function validateLease(
  lease,
  request = field(leaseFixture, "request"),
  verifierReceipt = field(leaseFixture, "verifierReceipt"),
  validationTime = field(leaseFixture, "validationTime"),
) {
  const result = await run(
    "validateSLIDEV2BLeaseShape",
    new Map([
      ["lease", lease],
      ["request", request],
      ["verifierReceipt", verifierReceipt],
      ["validationTime", validationTime],
    ]),
  );
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  return result.value;
}

before(async () => {
  const requestSource = await readFile(SOURCE, "utf8");
  const leaseSource = await readFile(LEASE_SOURCE, "utf8");
  const source = `${requestSource}\n${leaseSource.replace(/^@version 1\r?\n/, "")}`;
  parsed = parseProgram(source, SOURCE, { requireVersionHeader: true });
  assert.deepEqual(
    parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  assert.deepEqual(
    checkTypes(parsed.ast).diagnostics.filter(
      (diagnostic) => diagnostic.severity === "error",
    ),
    [],
  );
  const result = await run("materializeSLIDEV2BCapabilitySet");
  assert.equal(result.audit.result, "ok");
  capabilitySet = result.value;
  const fixtureResult = await run(
    "materializeSLIDEV2BLeaseFixture",
    new Map([["capabilitySet", capabilitySet]]),
  );
  assert.equal(fixtureResult.audit.result, "ok");
  leaseFixture = fixtureResult.value;
});

describe("SLIDE V2-B capability request shape", () => {
  it("validates the three exact requests while releasing no authority", async () => {
    const decision = await validate(capabilitySet);
    assert.equal(field(decision, "verdict").value, 1);
    assert.equal(field(decision, "status").value, "SHAPE_VALIDATED");
    assert.equal(field(decision, "authorityReleased").value, false);
    assert.equal(field(capabilitySet, "requests").items.length, 3);
  });

  const mutations = [
    [
      "profile drift",
      (candidate) =>
        candidate.fields.set("profileId", stringValue("slide.capability.any")),
      "SLIDE-V2B-CAPABILITY-001",
    ],
    [
      "descriptor drift",
      (candidate) =>
        candidate.fields.set("descriptorDigest", stringValue("00")),
      "SLIDE-V2B-CAPABILITY-002",
    ],
    [
      "effect/class mismatch",
      (candidate) =>
        field(candidate, "requests").items[0].fields.set("effectId", intValue(2)),
      "SLIDE-V2B-CAPABILITY-004",
    ],
    [
      "wildcard-like surplus calls",
      (candidate) =>
        field(candidate, "requests").items[1].fields.set("maxCalls", intValue(99)),
      "SLIDE-V2B-CAPABILITY-005",
    ],
    [
      "database resource drift",
      (candidate) =>
        field(candidate, "requests").items[0].fields.set(
          "resourceDescriptorDigest",
          stringValue(
            "750102fc1c2df495cb09d059ad844f6df2465d31d53db846e003efd14c23acd8",
          ),
        ),
      "SLIDE-V2B-CAPABILITY-006",
    ],
    [
      "missing audit requirement",
      (candidate) =>
        field(candidate, "requests").items[2].fields.set(
          "auditRequirementId",
          intValue(0),
        ),
      "SLIDE-V2B-CAPABILITY-005",
    ],
  ];

  for (const [name, mutate, expectedFailure] of mutations) {
    it(`fails closed for ${name}`, async () => {
      const candidate = structuredClone(capabilitySet);
      mutate(candidate);
      const decision = await validate(candidate);
      assert.equal(field(decision, "verdict").value, -1);
      assert.equal(field(decision, "authorityReleased").value, false);
      assert.equal(field(decision, "failureId").value, expectedFailure);
    });
  }
});

describe("SLIDE V2-B lease and typed verifier-receipt shape", () => {
  it("validates exact binding while releasing no authority", async () => {
    const decision = await validateLease(field(leaseFixture, "lease"));
    assert.equal(field(decision, "verdict").value, 1);
    assert.equal(field(decision, "status").value, "LEASE_SHAPE_VALIDATED");
    assert.equal(field(decision, "authorityReleased").value, false);
  });

  const mutations = [
    [
      "absent lease identity",
      ({ lease }) => lease.fields.set("leaseId", stringValue("")),
      "SLIDE-V2B-LEASE-001",
    ],
    [
      "malformed artifact digest",
      ({ lease }) =>
        lease.fields.set("artifactSemanticDigest", stringValue("00")),
      "SLIDE-V2B-LEASE-002",
    ],
    [
      "request binding drift",
      ({ lease }) => lease.fields.set("effectId", intValue(2)),
      "SLIDE-V2B-LEASE-003",
    ],
    [
      "expired validation window",
      ({ validationTime }) => {
        validationTime.value = 1100;
      },
      "SLIDE-V2B-LEASE-004",
    ],
    [
      "widened call ceiling",
      ({ lease }) => lease.fields.set("maxCalls", intValue(2)),
      "SLIDE-V2B-LEASE-005",
    ],
    [
      "unrecognized issuer role",
      ({ lease }) => lease.fields.set("issuerRoleId", intValue(2)),
      "SLIDE-V2B-LEASE-006",
    ],
    [
      "absent verifier identity",
      ({ receipt }) => receipt.fields.set("verifierId", stringValue("")),
      "SLIDE-V2B-LEASE-007",
    ],
    [
      "signed-byte digest mismatch",
      ({ receipt }) =>
        receipt.fields.set(
          "signedBytesDigest",
          stringValue(
            "abababababababababababababababababababababababababababababababab",
          ),
        ),
      "SLIDE-V2B-LEASE-008",
    ],
    [
      "malformed verifier evidence",
      ({ receipt }) =>
        receipt.fields.set("evidenceDigest", stringValue("00")),
      "SLIDE-V2B-LEASE-009",
    ],
    [
      "cryptographic denial",
      ({ receipt }) =>
        receipt.fields.set("verdict", { __tag: "verdict", value: -1 }),
      "SLIDE-V2B-LEASE-010",
    ],
    [
      "cryptographic ambiguity",
      ({ receipt }) =>
        receipt.fields.set("verdict", { __tag: "verdict", value: 0 }),
      "SLIDE-V2B-LEASE-011",
    ],
  ];

  for (const [name, mutate, expectedFailure] of mutations) {
    it(`fails closed for ${name}`, async () => {
      const lease = structuredClone(field(leaseFixture, "lease"));
      const request = structuredClone(field(leaseFixture, "request"));
      const receipt = structuredClone(field(leaseFixture, "verifierReceipt"));
      const validationTime = structuredClone(field(leaseFixture, "validationTime"));
      mutate({ lease, request, receipt, validationTime });
      const decision = await validateLease(
        lease,
        request,
        receipt,
        validationTime,
      );
      assert.equal(field(decision, "verdict").value, -1);
      assert.equal(field(decision, "authorityReleased").value, false);
      assert.equal(field(decision, "failureId").value, expectedFailure);
    });
  }
});
