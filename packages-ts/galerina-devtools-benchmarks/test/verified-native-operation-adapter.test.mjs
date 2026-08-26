import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";

import {
  admitVerifiedNativeOperationEvidence,
  readVerifiedNativeOperationContract,
  verifyVerifiedNativeOperationPublication,
} from "../src/verified-native-operation-adapter.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const EVIDENCE = join(
  HERE,
  "..",
  "evidence",
  "slide-verified-native-operation-reference.json",
);
const TEMP = mkdtempSync(join(tmpdir(), "galerina-verified-native-operation-"));

after(() => rmSync(TEMP, { recursive: true, force: true }));

function semanticRecord(result) {
  return {
    schema: result.schema,
    status: result.status,
    evidenceK3: result.evidenceK3,
    authorityReleased: result.authorityReleased,
    config: result.config,
    lanes: result.lanes,
    comparisons: result.comparisons,
    checks: result.checks,
  };
}

function evidenceDigest(result) {
  return `sha256:${createHash("sha256")
    .update("slide.verified-loop-slide-benchmark.evidence.v1", "utf8")
    .update(Uint8Array.of(0))
    .update(JSON.stringify(semanticRecord(result)), "utf8")
    .digest("hex")}`;
}

function publicationDigest(publication) {
  const copy = { ...publication };
  delete copy.publicationDigest;
  return `sha256:${createHash("sha256")
    .update("slide.verified-loop-slide-benchmark.publication.v1", "utf8")
    .update(Uint8Array.of(0))
    .update(JSON.stringify(copy), "utf8")
    .digest("hex")}`;
}

function rehash(publication) {
  publication.benchmark.evidenceDigest = evidenceDigest(publication.benchmark);
  publication.publicationDigest = publicationDigest(publication);
  return publication;
}

function hostFacts(publication) {
  return {
    platform: publication.provenance.platform,
    release: publication.provenance.release,
    architecture: publication.provenance.architecture,
    cpu: publication.provenance.cpu,
    node: publication.provenance.node,
  };
}

function contractFor(publication, base) {
  return {
    ...base,
    slideCommit: publication.provenance.commit,
    publicationDigest: publication.publicationDigest,
    evidenceDigest: publication.benchmark.evidenceDigest,
  };
}

test("admits the pinned permission-absent and permission-present reference lanes", async () => {
  const publication = JSON.parse(readFileSync(EVIDENCE, "utf8"));
  const admitted = await admitVerifiedNativeOperationEvidence(
    EVIDENCE,
    hostFacts(publication),
  );

  assert.equal(admitted.verdict, 1);
  assert.equal(admitted.status, "ADMITTED_REFERENCE_ONLY");
  assert.equal(admitted.iterations, 1_000_000);
  assert.equal(admitted.result, 999_999);
  assert.equal(admitted.referenceOnly, true);
  assert.equal(admitted.authorityReleased, false);
  assert.equal(admitted.checkedReference.unit, "element-reads/s");
  assert.equal(admitted.slideReference.unit, "element-reads/s");
  assert.equal(
    admitted.checkedReference.operationsPerSecond,
    Math.floor(1_000_000_000_000_000 / publication.benchmark.lanes.checkedPeer.medianNs),
  );
  assert.equal(
    admitted.slideReference.operationsPerSecond,
    Math.floor(1_000_000_000_000_000 / publication.benchmark.lanes.slideDemand.medianNs),
  );
  assert.equal(admitted.phases.direction, "lower-is-better");
});

test("refuses a host mismatch and any unpinned publication mutation", async () => {
  const publication = JSON.parse(readFileSync(EVIDENCE, "utf8"));
  const wrongHost = { ...hostFacts(publication), platform: "not-the-measured-host" };
  assert.equal(
    (await admitVerifiedNativeOperationEvidence(EVIDENCE, wrongHost)).verdict,
    -1,
  );

  const changed = structuredClone(publication);
  changed.provenance.commit = "0".repeat(40);
  const path = join(TEMP, "changed.json");
  writeFileSync(path, `${JSON.stringify(changed)}\n`, "utf8");
  assert.equal(
    (await admitVerifiedNativeOperationEvidence(path, hostFacts(publication))).verdict,
    -1,
  );
});

test("refuses digest-consistent phase arithmetic and median forgery", async () => {
  const publication = JSON.parse(readFileSync(EVIDENCE, "utf8"));
  const contract = await readVerifiedNativeOperationContract();

  const phaseForgery = structuredClone(publication);
  phaseForgery.benchmark.lanes.slidePreparedTotal.samplesNs[0] += 1;
  rehash(phaseForgery);
  assert.equal(
    verifyVerifiedNativeOperationPublication(
      phaseForgery,
      contractFor(phaseForgery, contract),
      hostFacts(phaseForgery),
    ).verdict,
    -1,
  );

  const medianForgery = structuredClone(publication);
  medianForgery.benchmark.lanes.checkedPeer.medianNs += 1;
  rehash(medianForgery);
  assert.equal(
    verifyVerifiedNativeOperationPublication(
      medianForgery,
      contractFor(medianForgery, contract),
      hostFacts(medianForgery),
    ).verdict,
    -1,
  );
});

test("refuses surplus fields, malformed paths and absent evidence", async () => {
  const publication = JSON.parse(readFileSync(EVIDENCE, "utf8"));
  const contract = await readVerifiedNativeOperationContract();
  const surplus = structuredClone(publication);
  surplus.unadmitted = true;
  rehash(surplus);
  assert.equal(
    verifyVerifiedNativeOperationPublication(
      surplus,
      contractFor(surplus, contract),
      hostFacts(surplus),
    ).verdict,
    -1,
  );
  assert.equal(
    (await admitVerifiedNativeOperationEvidence(join(TEMP, "missing.json"))).verdict,
    -1,
  );
  assert.equal((await admitVerifiedNativeOperationEvidence(TEMP)).verdict, -1);
});
