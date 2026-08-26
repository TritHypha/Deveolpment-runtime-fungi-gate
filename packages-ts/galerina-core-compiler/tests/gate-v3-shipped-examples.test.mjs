// gate-v3-shipped-examples.test.mjs — the shipped `.gate` examples must stay valid.
//
// WHY THIS EXISTS. `docs/examples/gate/*.gate` is the on-ramp: the first v3 a
// reader (human or model) ever sees, and the shapes they will copy. Until this
// suite, NOTHING in the repository checked them. `galerina check` cannot: its
// project config (`galerina.check.json`) ignores `docs/**`, so aiming it at the
// examples folder walks zero files and reports "PASS" — a vacuous green that
// reads exactly like a real one. An example could rot through any future
// grammar change and the only signal would be a confused reader.
//
// SCOPE — deliberately stated so the green is not over-read. Every example is
// proved at the SYNTAX and STRUCTURE tier (header, parse, structural verify).
// Three of the five are additionally proved at the RESOLUTION tier against a
// component contract in `fixtures/gate-registries/`, which is where nominal
// type resolution, exact wire typing, declared decision arms, required-input
// coverage and copyability actually live.
//
// Two examples (04, 05) have NO contract and are structure-only. That is not an
// omission: both reuse one component id several times within a single circuit
// with different payload types at each use, and `.gate` wire typing is exact
// nominal equality with no generics, so no registry can satisfy them. See
// fixtures/gate-registries/README.md. `un-contracted set` below pins that list
// so the gap cannot quietly grow.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseGateV3, verifyGateV3Structure, GATE_V3_VERSION, dispatchGateSource } from "../dist/index.js";

// tests -> galerina-core-compiler -> packages-ts -> repository root
const EXAMPLES = resolve(import.meta.dirname, "..", "..", "..", "docs", "examples", "gate");
const REGISTRIES = resolve(import.meta.dirname, "fixtures", "gate-registries");

/** The contract for an example, or undefined when it deliberately has none. */
function contractFor(file) {
  const path = join(REGISTRIES, `${file.replace(/\.gate$/, "")}.registry.json`);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : undefined;
}

/**
 * Resolve an example through the PRODUCTION dispatcher and return its GATE-*
 * error codes.
 *
 * FUNGI-GATELANG-002 is excluded: it fires at error severity on every admitted
 * circuit (signing stays withheld), so counting it would make "this circuit has
 * an error" vacuously true. `signing stays withheld` below asserts separately
 * that it still fires, so excluding it here can never become a silent downgrade.
 */
function resolveCodes(file, registry) {
  const source = readFileSync(join(EXAMPLES, file), "utf8");
  const result = dispatchGateSource(source, file, registry ? { registry } : {});
  return result.diagnostics
    .filter((d) => d.severity === "error" && d.code !== "FUNGI-GATELANG-002")
    .map((d) => d.code);
}

/** Every shipped example, sorted so failures report in a stable order. */
function shippedExamples() {
  return readdirSync(EXAMPLES).filter((f) => f.endsWith(".gate")).sort();
}

test("shipped examples: the on-ramp set is present", () => {
  const files = shippedExamples();
  assert.ok(files.length >= 5, `expected the five documented examples, found ${files.length}`);
});

test("shipped examples: every file carries the exact v3 header", () => {
  // The header is a LITERAL, not a range: `@gate 3.0.0` and nothing else. A
  // stale `@version 1.0.0` example would be refused by the parser anyway, but
  // this asserts the intended fact directly rather than through a side effect.
  for (const f of shippedExamples()) {
    const first = readFileSync(join(EXAMPLES, f), "utf8").split(/\r?\n/)[0];
    assert.equal(first.trim(), `@gate ${GATE_V3_VERSION}`, `${f}: first line must be the exact v3 header`);
  }
});

test("shipped examples: every file parses and verifies with zero errors", () => {
  const failures = [];
  for (const f of shippedExamples()) {
    const parsed = parseGateV3(readFileSync(join(EXAMPLES, f), "utf8"), f);
    if (!parsed.ok) {
      failures.push(`${f} REFUSED: ${parsed.diagnostics.map((d) => `${d.code}@${d.location?.line}`).join(", ")}`);
      continue;
    }
    const errors = verifyGateV3Structure(parsed.circuit).filter((d) => d.severity !== "warning");
    if (errors.length) {
      failures.push(`${f}: ${errors.map((d) => `${d.code}@${d.location?.line}`).join(", ")}`);
    }
  }
  assert.deepEqual(failures, [], `shipped examples must stay valid:\n  ${failures.join("\n  ")}`);
});

test("shipped examples: the suite is load-bearing (a broken circuit is caught)", () => {
  // Guard against the failure this suite exists to prevent: a check that passes
  // over nothing. Take a real example, delete its K3 indeterminate arm, and
  // require the verifier to object — if this ever goes quiet, the assertions
  // above are no longer evidence.
  const source = readFileSync(join(EXAMPLES, "01-authorized-read.gate"), "utf8");
  const mutated = source.split(/\r?\n/).filter((l) => !/^\s*authz\.indeterminate\s*->/.test(l)).join("\n");
  assert.notEqual(mutated, source, "the mutation must actually change the source");

  const parsed = parseGateV3(mutated, "mutated.gate");
  assert.equal(parsed.ok, true, "the mutation should still parse — it is a semantic break, not a syntax one");
  const codes = verifyGateV3Structure(parsed.circuit).map((d) => d.code);
  assert.ok(codes.includes("GATE-AUTH-002"), `removing the indeterminate arm must be caught, got ${codes}`);
});

// ---------------------------------------------------------------- resolution

test("shipped examples: every contracted circuit resolves clean", () => {
  const failures = [];
  let contracted = 0;
  for (const file of shippedExamples()) {
    const registry = contractFor(file);
    if (!registry) continue;
    contracted += 1;
    const codes = resolveCodes(file, registry);
    if (codes.length) failures.push(`${file}: ${codes.join(" ")}`);
  }
  assert.deepEqual(failures, [], `contracted examples must resolve:\n  ${failures.join("\n  ")}`);
  assert.ok(contracted >= 5, `all five examples are contracted since GD-028 B, resolved ${contracted}`);
});

test("shipped examples: the un-contracted set is EMPTY — every circuit has a contract", () => {
  // THE FLIP. This test previously pinned ["04-…", "05-…"] as un-contractable
  // under exact nominal typing (GD-028). The owner ratified Option B — per-use
  // registered variants sharing one implementationDigest — and both circuits
  // now name their variants and resolve. Per the flip discipline, changing
  // this pin is the accepted proof the decision landed. If a future example
  // ships without a contract, this fails rather than letting coverage drift
  // downward unseen.
  const uncontracted = shippedExamples().filter((f) => !contractFor(f));
  assert.deepEqual(uncontracted, [], "every shipped example must carry a per-circuit contract");
});

test("shipped examples: signing stays withheld even when a circuit resolves clean", () => {
  // Constraint 3. A clean resolution must NOT read as production readiness, and
  // it is what makes excluding this code from resolveCodes safe.
  const source = readFileSync(join(EXAMPLES, "01-authorized-read.gate"), "utf8");
  const result = dispatchGateSource(source, "01-authorized-read.gate", { registry: contractFor("01-authorized-read.gate") });
  assert.ok(
    result.diagnostics.some((d) => d.code === "FUNGI-GATELANG-002" && d.severity === "error"),
    "a resolving circuit must still carry the production block",
  );
});

test("shipped examples: the contract is load-bearing at the resolution tier", () => {
  // The structural mutation above cannot prove the REGISTRY is doing anything —
  // it fires with no registry at all. These four break the contract instead, and
  // each must produce the specific rule that owns it. If any goes quiet, the
  // clean resolution above has stopped being evidence.
  const file = "01-authorized-read.gate";
  const source = readFileSync(join(EXAMPLES, file), "utf8");
  const base = () => JSON.parse(JSON.stringify(contractFor(file)));
  const codesFor = (registry, text = source) =>
    dispatchGateSource(text, file, { registry })
      .diagnostics.filter((d) => d.severity === "error" && d.code !== "FUNGI-GATELANG-002")
      .map((d) => d.code);

  assert.deepEqual(codesFor(base()), [], "the unmutated pair must be clean, or nothing below is readable");

  // A declared decision arm left unrouted (the contract-driven K3 rule).
  const armless = source.split(/\r?\n/).filter((l) => !/^\s*authz\.indeterminate\s*->/.test(l)).join("\n");
  assert.notEqual(armless, source, "the arm mutation must actually change the source");
  assert.ok(codesFor(base(), armless).includes("GATE-RESOLVE-111"), "an unrouted declared arm must refuse");

  // Exact nominal wire typing — no implicit conversion at the egress wire.
  const wrongType = base();
  wrongType.types.push({ id: "WrongView", kind: "record", construction: "canonical-only" });
  wrongType.components.find((c) => c.id === "galerina.privacy.cut").outputs[0].type = "WrongView";
  assert.ok(codesFor(wrongType).includes("GATE-WIRE-101"), "a mistyped egress wire must refuse");

  // A required input the drawing never produces.
  const required = base();
  required.components.find((c) => c.id === "app.customer.read").inputs.push({ name: "tenant", type: "CallerId", required: true });
  assert.ok(codesFor(required).includes("GATE-RESOLVE-110"), "an unwired required input must refuse");

  // An empty type catalogue must not disable the nominal wall.
  const noTypes = base();
  noTypes.types = [];
  assert.ok(codesFor(noTypes).includes("GATE-RESOLVE-108"), "an empty catalogue must refuse, not silently permit");
});
