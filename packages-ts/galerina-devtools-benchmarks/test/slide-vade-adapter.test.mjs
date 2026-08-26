import assert from "node:assert/strict";
import {
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  admitSlideVadeEvidence,
  readSlideVadeContract,
  sameStableFile,
  verifySlideVadeReceipt,
} from "../src/slide-vade-adapter.mjs";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE = join(
  PACKAGE_ROOT,
  "evidence",
  "slide-v2g-verified-ahead-of-demand-b5aab13.json",
);
const TEMP = mkdtempSync(join(tmpdir(), "galerina-slide-vade-"));
after(() => rmSync(TEMP, { recursive: true, force: true }));

const fresh = (name, bytes) => {
  const path = join(TEMP, name);
  writeFileSync(path, bytes);
  return path;
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const canonical = (value) => `${JSON.stringify(value, null, 2)}\n`;

test("the exact committed SLIDE receipt is admitted without releasing authority", async () => {
  const result = await admitSlideVadeEvidence(EVIDENCE);
  assert.deepEqual(result, {
    verdict: 1,
    status: "ADMITTED_NON_AUTHORIZING",
    failureId: "NONE",
    benchmark: "slide-v2g-verified-ahead-of-demand",
    receiptDigest: "4f0871eacd0f0e3f5d69c5545802adff317b0231fcf995c5b8c73dbcf8e0b564",
    slideCommit: "b5aab13d59d59195cfd1c4bee25bcc663060bad4",
    authorityReleased: false,
  });
  assert.equal(Object.isFrozen(result), true);
});

test("strict absence refuses while explicitly observational absence is indeterminate", async () => {
  assert.equal((await admitSlideVadeEvidence(join(TEMP, "missing.json"))).verdict, -1);
  assert.deepEqual(
    await admitSlideVadeEvidence(join(TEMP, "missing.json"), { observational: true }),
    {
      verdict: 0,
      status: "INDETERMINATE",
      failureId: "GALERINA-SLIDE-VADE-MISSING",
      benchmark: "",
      receiptDigest: "",
      slideCommit: "",
      authorityReleased: false,
    },
  );
});

test("the byte boundary refuses empty, oversized, directory, hard-link, BOM and malformed UTF-8", async () => {
  assert.equal((await admitSlideVadeEvidence(fresh("empty.json", ""))).verdict, -1);
  const oversized = fresh("oversized.json", "x");
  truncateSync(oversized, 1_048_577);
  assert.equal((await admitSlideVadeEvidence(oversized)).verdict, -1);
  const directory = join(TEMP, "directory.json");
  mkdirSync(directory);
  assert.equal((await admitSlideVadeEvidence(directory)).verdict, -1);
  const hardLinkSource = fresh("hard-link-source.json", readFileSync(EVIDENCE));
  const hardLink = join(TEMP, "hard-link.json");
  linkSync(hardLinkSource, hardLink);
  assert.equal((await admitSlideVadeEvidence(hardLink)).verdict, -1);
  rmSync(hardLink);
  assert.equal((await admitSlideVadeEvidence(fresh("bom.json", Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])))).verdict, -1);
  assert.equal((await admitSlideVadeEvidence(fresh("bad-utf8.json", Buffer.from([0xc3, 0x28])))).verdict, -1);
});

test("the byte boundary refuses symbolic links where the host permits creating one", async (t) => {
  const link = join(TEMP, "symbolic.json");
  try {
    symlinkSync(EVIDENCE, link, "file");
  } catch (error) {
    if (error?.code === "EPERM") {
      t.skip("host policy does not permit an unprivileged symbolic-link fixture");
      return;
    }
    throw error;
  }
  assert.equal((await admitSlideVadeEvidence(link)).verdict, -1);
});

test("alternate bytes, trailing data, key reordering and duplicate keys cannot inherit the receipt pin", async () => {
  const receipt = JSON.parse(readFileSync(EVIDENCE, "utf8"));
  const cases = [
    ["compact.json", JSON.stringify(receipt)],
    ["trailing.json", `${canonical(receipt)}x`],
    ["reordered.json", canonical({ benchmark: receipt.benchmark, ...receipt })],
    ["duplicate.json", "{\n  \"schemaVersion\": 0,\n  \"schemaVersion\": 1\n}\n"],
    ["escaped-duplicate.json", "{\n  \"schemaVersion\": 0,\n  \"schema\\u0056ersion\": 1\n}\n"],
  ];
  for (const [name, bytes] of cases) {
    assert.equal((await admitSlideVadeEvidence(fresh(name, bytes))).verdict, -1, name);
  }
});

test("stable-file identity includes device, inode, link count, size and both timestamps", () => {
  const base = { dev: 1n, ino: 2n, nlink: 1n, size: 3n, mtimeNs: 4n, ctimeNs: 5n };
  assert.equal(sameStableFile(base, { ...base }), true);
  for (const key of Object.keys(base)) {
    assert.equal(sameStableFile(base, { ...base, [key]: base[key] + 1n }), false, key);
  }
});

test("independent semantic admission refuses mutations across identity, lanes, arithmetic and authority", async () => {
  const receipt = JSON.parse(readFileSync(EVIDENCE, "utf8"));
  const contract = await readSlideVadeContract();
  assert.equal(verifySlideVadeReceipt(receipt, contract).verdict, 1);
  const mutations = [
    (r) => { r.schemaVersion = 2; },
    (r) => { r.benchmark = "other"; },
    (r) => { r.provenance.slide.commit = "0".repeat(40); },
    (r) => { r.provenance.bodyDigest = "0".repeat(64); },
    (r) => { r.provenance.semanticDigest = "0".repeat(64); },
    (r) => { r.provenance.inputDigest = "0".repeat(64); },
    (r) => { r.provenance.platform = "linux"; },
    (r) => { r.provenance.node = "v0.0.0"; },
    (r) => { r.provenance.capsule.hostClass = "UNADMITTED_HOST"; },
    (r) => { r.config.seed += 1; },
    (r) => { r.config.operations += 1; },
    (r) => { r.config.warmups += 1; },
    (r) => { r.config.samples += 2; },
    (r) => { r.nonClaims.pop(); },
    (r) => { r.authorityReleased = true; },
    (r) => { r.equivalence.semanticChecksum = "0".repeat(64); },
    (r) => { r.equivalence.refusalChecksum = "0".repeat(64); },
    (r) => { r.equivalence.capsuleDigest = "0".repeat(64); },
    (r) => { r.lanes.reverse(); },
    (r) => { r.laneOrders[0].reverse(); },
    (r) => { r.lanes[0].samplesNs[0] += 1; },
    (r) => { r.lanes[0].medianNs += 1; },
    (r) => { r.economics.demandSavingsNs += 1; },
  ];
  for (const mutate of mutations) {
    const changed = clone(receipt);
    mutate(changed);
    const result = verifySlideVadeReceipt(changed, contract);
    assert.equal(result.verdict, -1);
    assert.equal(result.benchmark, "");
    assert.equal(result.receiptDigest, "");
    assert.equal(result.slideCommit, "");
    assert.equal(result.authorityReleased, false);
  }
  const changedContract = clone(contract);
  changedContract.receiptSha256 = "0".repeat(64);
  assert.equal(verifySlideVadeReceipt(receipt, changedContract).verdict, -1);
});

test("programmatic verification refuses proxies and accessors before treating them as data", async () => {
  const receipt = JSON.parse(readFileSync(EVIDENCE, "utf8"));
  const contract = await readSlideVadeContract();
  assert.equal(verifySlideVadeReceipt(new Proxy(receipt, {}), contract).verdict, -1);
  const accessor = clone(receipt);
  Object.defineProperty(accessor, "benchmark", { enumerable: true, get: () => receipt.benchmark });
  assert.equal(verifySlideVadeReceipt(accessor, contract).verdict, -1);
  assert.equal((await admitSlideVadeEvidence(EVIDENCE, new Proxy({}, {}))).verdict, -1);
});

test("programmatic verification refuses sparse arrays and array-owned side data", async () => {
  const receipt = JSON.parse(readFileSync(EVIDENCE, "utf8"));
  const contract = await readSlideVadeContract();

  const sparseOrders = clone(receipt);
  sparseOrders.laneOrders = new Array(receipt.laneOrders.length);
  assert.equal(verifySlideVadeReceipt(sparseOrders, contract).verdict, -1);

  const sparseSamples = clone(receipt);
  sparseSamples.lanes[0].samplesNs = new Array(receipt.config.samples);
  assert.equal(verifySlideVadeReceipt(sparseSamples, contract).verdict, -1);

  const sideData = clone(receipt);
  sideData.laneOrders.extra = "not receipt data";
  assert.equal(verifySlideVadeReceipt(sideData, contract).verdict, -1);
});

test("the direct-argv CLI emits only a bounded reconstructed result", () => {
  const cli = join(PACKAGE_ROOT, "src", "slide-vade-adapter.mjs");
  const admitted = spawnSync(process.execPath, [cli, "--input", EVIDENCE], { encoding: "utf8" });
  assert.equal(admitted.status, 0, admitted.stderr);
  assert.deepEqual(JSON.parse(admitted.stdout), {
    verdict: 1,
    status: "ADMITTED_NON_AUTHORIZING",
    failureId: "NONE",
    benchmark: "slide-v2g-verified-ahead-of-demand",
    receiptDigest: "4f0871eacd0f0e3f5d69c5545802adff317b0231fcf995c5b8c73dbcf8e0b564",
    slideCommit: "b5aab13d59d59195cfd1c4bee25bcc663060bad4",
    authorityReleased: false,
  });
  const refusedPath = join(TEMP, "private-owner-path.json");
  const refused = spawnSync(process.execPath, [cli, "--input", refusedPath], { encoding: "utf8" });
  assert.notEqual(refused.status, 0);
  assert.equal(JSON.parse(refused.stdout).verdict, -1);
  assert.doesNotMatch(`${refused.stdout}${refused.stderr}`, /private-owner-path|ENOENT|stack|Error:/u);
});
