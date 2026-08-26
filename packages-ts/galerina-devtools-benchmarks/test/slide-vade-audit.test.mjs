import assert from "node:assert/strict";
import test from "node:test";

import {
  auditSlideVadeEvidence,
  classifySlideVadeObservation,
} from "../src/audit-slide-vade.mjs";
import { runSlideVadeObservation } from "../src/runner.mjs";

test("the audit admits the pinned receipt as non-comparative component evidence", async () => {
  assert.deepEqual(await auditSlideVadeEvidence(), {
    verdict: 1,
    status: "AUDIT_CLEAN",
    failureId: "NONE",
    subject: "slide-vade-evidence",
    authorityReleased: false,
  });
});

test("classification refuses any attempt to turn VADE evidence into a comparison or certificate", async () => {
  const observation = await runSlideVadeObservation();
  for (const mutation of [
    { comparative: true },
    { workEquivalenceCertificate: true },
    { evidenceClass: "CROSS_RUNTIME_COMPARISON" },
    { authorityReleased: true },
    { verdict: 0 },
  ]) {
    const result = classifySlideVadeObservation({ ...observation, ...mutation });
    assert.equal(result.verdict, -1);
    assert.equal(result.subject, "");
    assert.equal(result.authorityReleased, false);
  }
});

test("classification refuses proxy and accessor records without executing user code", async () => {
  const observation = await runSlideVadeObservation();
  let trapped = false;
  const proxy = new Proxy(observation, {
    get() {
      trapped = true;
      throw new Error("must not execute");
    },
  });
  assert.equal(classifySlideVadeObservation(proxy).verdict, -1);
  assert.equal(trapped, false);
  const accessor = { ...observation };
  Object.defineProperty(accessor, "comparative", {
    enumerable: true,
    get() {
      trapped = true;
      return false;
    },
  });
  assert.equal(classifySlideVadeObservation(accessor).verdict, -1);
  assert.equal(trapped, false);
});
