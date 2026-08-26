// =============================================================================
// Q2 / Chapter A item 2 — a `.fungi` host boundary is an EFFECT, not a substring.
//
// Owner ruling (FUNGI-PROGRAMME-HANDOVER-2026-08-07 §3): "Replace raw byte
// matching with parser/GIR/effect-derived classification. Comments and strings
// must not create ownership debt; dynamically hidden or unknown native authority
// must refuse."
//
// Required discriminating evidence (§8): real `native.call` classified · comment
// and string ignored · alias/dynamic unknown refuses · source map points at the
// real node.
//
// KNOWN ANSWERS, established from the parser (not from a second regex):
//
//   | file                   | text has native.call | AST                    | boundary? |
//   |------------------------|----------------------|------------------------|-----------|
//   | capability-map.fungi:34| yes                  | kind=stringLiteral     | NO        |
//   | emergency-sm.fungi:25  | yes (a `;;` comment) | NO node at all         | NO        |
//   | vdpm.fungi:105         | yes                  | kind=stringLiteral     | NO        |
//   | a real effects{} block | yes                  | identifier             | YES       |
//   |                        |                      | "effect:native.call"   |           |
//
// Note the second row: a hand-written lexical classifier that knew only `//`
// comments misread the `;;` line as CODE. That is precisely why the ruling says
// to ask the parser — an improved regex is still a regex.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { classifyFungiHostBoundary } from "../lib/fungi-host-boundary.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

const DSS = "packages-ts/galerina-core-security/src/dss/";

test("CONTROL: a REAL effects{ native.call } declaration is classified a boundary", () => {
  const r = classifyFungiHostBoundary(`@version 1
flow crosses() -> Int
contract {
  intent { "really performs a native call" }
  effects { native.call }
}
{
  return 1
}
`, "control.fungi");
  assert.equal(r.isBoundary, true, "a declared native.call effect MUST be a host boundary");
  assert.equal(r.reason, "effect");
  assert.ok(r.sites.length >= 1, "the classification must name where it found the effect");
  assert.equal(typeof r.sites[0].line, "number", "source map must point at the real node");
});

test("CONTROL: an ordinary flow with no native effect is NOT a boundary", () => {
  const r = classifyFungiHostBoundary(`@version 1
pure flow add(a: Int, b: Int) -> Int {
  return a + b
}
`, "plain.fungi");
  assert.equal(r.isBoundary, false, "a plain flow must not create ownership debt");
  assert.equal(r.reason, "no-native-effect");
});

test("a string literal naming the effect is NOT a boundary (capability-map.fungi:34)", () => {
  const src = read(DSS + "capability-map.fungi");
  assert.match(src, /native\.call/, "precondition: the file text really does contain the token");
  const r = classifyFungiHostBoundary(src, "capability-map.fungi");
  assert.equal(r.isBoundary, false, "governing native calls is not performing one");
  assert.equal(r.reason, "no-native-effect");
});

test("a comment naming the effect is NOT a boundary (emergency-sm.fungi:25, a `;;` line)", () => {
  const src = read(DSS + "emergency-sm.fungi");
  assert.match(src, /native\.call/, "precondition: the file text really does contain the token");
  const r = classifyFungiHostBoundary(src, "emergency-sm.fungi");
  assert.equal(r.isBoundary, false, "a comment must never create ownership debt");
});

test("a second string-literal case is NOT a boundary (vdpm.fungi:105)", () => {
  const src = read(DSS + "vdpm.fungi");
  assert.match(src, /native\.call/, "precondition: the file text really does contain the token");
  const r = classifyFungiHostBoundary(src, "vdpm.fungi");
  assert.equal(r.isBoundary, false);
});

test("★ unparseable source REFUSES — unknown native authority is never admitted", () => {
  const r = classifyFungiHostBoundary(`@version 1
flow broken( -> Int {
`, "broken.fungi");
  assert.equal(r.isBoundary, true, "a file whose effects cannot be determined must fail CLOSED");
  assert.equal(r.reason, "unparseable");
});

test("★ a dynamically-hidden effect REFUSES rather than passing as clean", () => {
  // An effect assembled at runtime cannot be proved absent by any static pass.
  const r = classifyFungiHostBoundary(`@version 1
flow sneaky(part: String) -> Int
contract {
  intent { "assembles an effect name at runtime" }
  effects { audit.write }
}
{
  let hidden: String = "native" + "." + "call"
  return hidden.length()
}
`, "sneaky.fungi");
  assert.equal(r.isBoundary, true, "an unresolved dynamic native reference must refuse");
  assert.equal(r.reason, "dynamic-unknown");
});

test("the three DSS files together account for the metric correction", () => {
  const files = ["capability-map.fungi", "emergency-sm.fungi", "vdpm.fungi"];
  const results = files.map((f) => classifyFungiHostBoundary(read(DSS + f), f));
  assert.deepEqual(results.map((r) => r.isBoundary), [false, false, false],
    "all three were counted by the lexical detector and none performs a native call");
});
