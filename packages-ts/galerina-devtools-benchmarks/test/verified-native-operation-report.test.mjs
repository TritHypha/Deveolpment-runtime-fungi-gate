import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  renderVerifiedNativeOperationMarkdown,
  renderVerifiedNativeOperationSvg,
  verifyVerifiedNativeOperationResult,
} from "../src/verified-native-operation-report.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RESULT = join(HERE, "..", "results", "verified-native-operation-latest.json");

test("focused result verifies both permission variants and native controls", () => {
  const result = JSON.parse(readFileSync(RESULT, "utf8"));
  const verified = verifyVerifiedNativeOperationResult(result);
  assert.equal(verified.verdict, 1);
  assert.equal(verified.checkedReference.referenceOnly, true);
  assert.equal(verified.slideReference.referenceOnly, true);
  assert.equal(verified.slideReference.authorityReleased, false);
  assert.equal(verified.iterations, 1_000_000);
  assert.equal(verified.result, 999_999);
  assert.equal(verified.sourcePair.verdict, 1);
  assert.equal(verified.sourcePair.authorityReleased, false);
});

test("Markdown separates higher-is-better throughput from lower-is-better phases", () => {
  const result = JSON.parse(readFileSync(RESULT, "utf8"));
  const markdown = renderVerifiedNativeOperationMarkdown(result);
  assert.match(markdown, /Higher is better.*element-reads\/s/isu);
  assert.match(markdown, /Lower is better.*phase/isu);
  assert.match(markdown, /Checked reference - no permission/u);
  assert.match(markdown, /SLIDE reference - permission present/u);
  assert.match(markdown, /cannot win/u);
  assert.match(markdown, /does not mean Galerina won/u);
  assert.match(markdown, /Reference demand speed-up/u);
  assert.match(markdown, /CHECKED-MILLION-ITERATION-LOOP\.fungi/u);
  assert.match(markdown, /VERIFIED-MILLION-ITERATION-LOOP\.fungi/u);
});

test("SVG shows both variants and declares the direction", () => {
  const result = JSON.parse(readFileSync(RESULT, "utf8"));
  const svg = renderVerifiedNativeOperationSvg(result);
  assert.match(svg, /<svg/u);
  assert.match(svg, /higher is better/u);
  assert.match(svg, /Checked ref - no permission/u);
  assert.match(svg, /SLIDE ref - permission present/u);
  assert.match(svg, /reference only/u);
  assert.match(svg, /CHECKED-MILLION-ITERATION-LOOP\.fungi/u);
  assert.match(svg, /VERIFIED-MILLION-ITERATION-LOOP\.fungi/u);
});

test("renderer refuses semantic or authority forgery", () => {
  const result = JSON.parse(readFileSync(RESULT, "utf8"));
  const wrong = structuredClone(result);
  wrong[0].results.slideReference.authorityReleased = true;
  assert.equal(verifyVerifiedNativeOperationResult(wrong).verdict, -1);
  assert.throws(() => renderVerifiedNativeOperationMarkdown(wrong), /REFUSED/u);

  const missingPair = structuredClone(result);
  delete missingPair[0].sourcePair;
  assert.equal(verifyVerifiedNativeOperationResult(missingPair).verdict, -1);

  const authorityPair = structuredClone(result);
  authorityPair[0].sourcePair.authorityReleased = true;
  assert.equal(verifyVerifiedNativeOperationResult(authorityPair).verdict, -1);
});
