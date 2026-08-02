import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, it } from "node:test";

const IMPLEMENTATION = new URL(
  "../export-slide-checked-decision-receipt.mjs",
  import.meta.url,
);
const ROOT = resolve(".");
const COMPILER_VERSION = "1.0.0-beta.2";
const COLD_BOOT = Uint8Array.from(readFileSync(join(
  ROOT,
  "packages-galerina/galerina-core-sentinel-state/src/self-hosted/cold-boot.fungi",
)));
const REGISTRY = Uint8Array.from(readFileSync(join(
  ROOT,
  "packages-galerina/galerina-framework-app-kernel/src/self-hosted/registry-durability-production-admission.fungi",
)));
const SYNTHETIC_TEXT = `@version 1
pure flow syntheticDecision(first: Bool, second: Bool, third: Bool) -> Int
contract { intent { "Allow only when all three independent facts hold." } }
{
  if first == false { return 0 - 1 }
  if second == false { return 0 - 1 }
  if third == false { return 0 - 1 }
  return 1
}
`;
const SYNTHETIC = Uint8Array.from(Buffer.from(SYNTHETIC_TEXT, "utf8"));

function request(sourceBytes, packageId, profileId) {
  return {
    packageId,
    profileId,
    sourceBytes,
    fileLabel: `${profileId}.fungi`,
    compilerVersion: COMPILER_VERSION,
  };
}

describe("checked-decision frontend receipt exporter", () => {
  it("exports byte-identical ordinary and K3 receipts from clean compiler passes", async () => {
    const api = await import(IMPLEMENTATION.href).catch(() => ({}));
    assert.equal(
      typeof api.exportCheckedDecisionReceipt,
      "function",
      "checked-decision receipt exporter is not implemented",
    );
    for (const [source, packageId, profileId, graphKind] of [
      [
        COLD_BOOT,
        "@galerina/core-sentinel-state",
        "galerina.package.restore-verdict.v1",
        "BOOLEAN_ALL",
      ],
      [
        REGISTRY,
        "@galerina/framework-app-kernel",
        "galerina.package.registry-durability-admission.v1",
        "K3_GUARD_BOOLEAN_ALL",
      ],
    ]) {
      const first = api.exportCheckedDecisionReceipt(
        request(source, packageId, profileId),
      );
      const second = api.exportCheckedDecisionReceipt(
        request(source, packageId, profileId),
      );
      assert.equal(first.verdict, 1, JSON.stringify(first));
      assert.equal(first.status, "CHECKED_DECISION_FRONTEND_CANDIDATE");
      assert.deepEqual(first.receiptBytes, second.receiptBytes);
      assert.equal(first.receiptDigest, second.receiptDigest);
      assert.equal(first.graph[0], graphKind);
      assert.equal(first.referenceOnly, true);
      assert.equal(first.authorityReleased, false);
      assert.match(first.receiptDigest, /^sha256:[0-9a-f]{64}$/u);
    }
  });

  it("generalizes to a third clean source without a registered source hash", async () => {
    const { exportCheckedDecisionReceipt } = await import(IMPLEMENTATION.href);
    const result = exportCheckedDecisionReceipt(request(
      SYNTHETIC,
      "@galerina/synthetic-conformance",
      "galerina.package.synthetic-decision.v1",
    ));
    assert.equal(result.verdict, 1, JSON.stringify(result));
    assert.deepEqual(result.graph, ["BOOLEAN_ALL", [0, 1, 2], 1, -1]);
    const receipt = JSON.parse(Buffer.from(result.receiptBytes).toString("utf8"));
    assert.equal(receipt.flowName, "syntheticDecision");
    assert.equal(receipt.parameters.length, 3);
    assert.equal(receipt.instructionCount, 4);
    assert.equal(receipt.authorityReleased, undefined);
  });

  it("names and reproduces one LF source normalization across Windows checkout bytes", async () => {
    const { exportCheckedDecisionReceipt } = await import(IMPLEMENTATION.href);
    const crlf = Uint8Array.from(Buffer.from(
      Buffer.from(COLD_BOOT).toString("utf8").replaceAll("\r\n", "\n").replaceAll("\n", "\r\n"),
      "utf8",
    ));
    const lf = Uint8Array.from(Buffer.from(
      Buffer.from(COLD_BOOT).toString("utf8").replaceAll("\r\n", "\n"),
      "utf8",
    ));
    const crlfResult = exportCheckedDecisionReceipt(request(
      crlf,
      "@galerina/core-sentinel-state",
      "galerina.package.restore-verdict.v1",
    ));
    const lfResult = exportCheckedDecisionReceipt(request(
      lf,
      "@galerina/core-sentinel-state",
      "galerina.package.restore-verdict.v1",
    ));
    assert.equal(crlfResult.verdict, 1);
    assert.deepEqual(crlfResult.receiptBytes, lfResult.receiptBytes);
    const receipt = JSON.parse(Buffer.from(lfResult.receiptBytes).toString("utf8"));
    assert.equal(receipt.sourceNormalization, "UTF8_LF_V1");
    assert.equal(receipt.sourceDigest,
      "5040e0b1ff890f602b8629f6205cee95f4236c502a446579f9184f27d22cf996");

    const bareCarriageReturn = lf.slice();
    bareCarriageReturn[bareCarriageReturn.indexOf(0x0a)] = 0x0d;
    assert.equal(exportCheckedDecisionReceipt({
      ...request(
        bareCarriageReturn,
        "@galerina/core-sentinel-state",
        "galerina.package.restore-verdict.v1",
      ),
    }).verdict, -1);
  });

  it("refuses hostile intake and every unsupported decision construct", async () => {
    const { exportCheckedDecisionReceipt } = await import(IMPLEMENTATION.href);
    const base = request(
      SYNTHETIC,
      "@galerina/synthetic-conformance",
      "galerina.package.synthetic-decision.v1",
    );
    for (const sourceText of [
      SYNTHETIC_TEXT.replace("return 1", "return helper(first)"),
      SYNTHETIC_TEXT.replace("return 1", "while first { return 1 }"),
      SYNTHETIC_TEXT.replace("second: Bool", "first: Bool"),
      SYNTHETIC_TEXT.replace("if first == false", "if first == true"),
      SYNTHETIC_TEXT.replace("if third == false { return 0 - 1 }", ""),
    ]) {
      const result = exportCheckedDecisionReceipt({
        ...base,
        sourceBytes: Uint8Array.from(Buffer.from(sourceText, "utf8")),
      });
      assert.equal(result.verdict, -1, sourceText);
      assert.equal(result.receiptBytes, null);
      assert.equal(result.authorityReleased, false);
    }

    assert.equal(exportCheckedDecisionReceipt({ ...base, extra: true }).verdict, -1);
    assert.equal(exportCheckedDecisionReceipt({
      ...base,
      sourceBytes: new Uint8Array((1024 * 1024) + 1),
    }).verdict, -1);

    let reads = 0;
    const hostile = new Proxy(SYNTHETIC, {
      get() { reads += 1; throw new Error("source trap"); },
    });
    assert.equal(exportCheckedDecisionReceipt({
      ...base,
      sourceBytes: hostile,
    }).verdict, -1);
    assert.equal(reads, 0);
  });
});
