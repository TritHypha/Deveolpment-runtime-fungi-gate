import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, it } from "node:test";

const SLIDE_ROOT = process.env.GALERINA_SLIDE_REPO;
const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SLIDE_AVAILABLE =
  typeof SLIDE_ROOT === "string"
  && existsSync(join(SLIDE_ROOT, "src", "checked-fungi-package-compiler.mjs"));
const ALL_ALLOW = Object.freeze({
  identity: 1,
  provenance: 1,
  target: 1,
  effects: 1,
  policy: 1,
  revocation: 1,
  validation: 1,
  memory: 1,
});

function cases(accepted, rejected) {
  return Object.freeze([
    ...accepted.map((value) => Object.freeze({ value, expected: true })),
    ...rejected.map((value) => Object.freeze({ value, expected: false })),
  ]);
}

const BOUNDARY_KINDS = Object.freeze(["api", "webhook", "internal", "package", "secure", "public"]);
const BOUNDARY_TRUST = Object.freeze(["untrusted", "validated", "internal", "privileged"]);

function boundaryCrossingCases() {
  const rows = [];
  for (const callerKind of BOUNDARY_KINDS) {
    for (const calleeTrustLevel of BOUNDARY_TRUST) {
      const expected = callerKind === "secure"
        ? calleeTrustLevel === "internal" || calleeTrustLevel === "privileged"
        : callerKind === "api" || callerKind === "webhook"
          ? calleeTrustLevel !== "untrusted"
          : true;
      rows.push(Object.freeze({ arguments: [callerKind, calleeTrustLevel], expected }));
    }
  }
  rows.push(
    Object.freeze({ arguments: ["unknown", "internal"], expected: false }),
    Object.freeze({ arguments: ["api", "unknown"], expected: false }),
  );
  return Object.freeze(rows);
}

const CANDIDATES = Object.freeze([
  Object.freeze({
    slice: 33,
    packageIdentity: "@galerina/core-config",
    packageDirectory: "galerina-core-config",
    sourceFile: "environment-mode.fungi",
    flowName: "isEnvironmentMode",
    physicalExpectation: "PROVE",
    usesTextComparisonBudget: true,
    values: cases(
      ["development", "test", "staging", "production"],
      ["", "Development", " production ", "preview", "production\u0000"],
    ),
  }),
  Object.freeze({
    slice: 34,
    packageIdentity: "@galerina/core-runtime",
    packageDirectory: "galerina-core-runtime",
    sourceFile: "terminal-scope.fungi",
    flowName: "isTerminalScope",
    physicalExpectation: "PROVE",
    usesTextComparisonBudget: true,
    values: cases(
      ["succeeded", "failed", "timed_out", "cancelled"],
      ["running", "cancelling", "", "Succeeded", "failed ", "cancelled\u0000"],
    ),
  }),
  Object.freeze({
    slice: 35,
    packageIdentity: "@galerina/core-tasks",
    packageDirectory: "galerina-core-tasks",
    sourceFile: "task-effect.fungi",
    flowName: "isTaskEffect",
    physicalExpectation: "PROVE",
    usesTextComparisonBudget: true,
    values: cases(
      ["filesystem", "network", "database", "environment", "shell", "compiler", "reports", "crypto"],
      ["", "Filesystem", " network", "process", "crypto\u0000"],
    ),
  }),
  Object.freeze({
    slice: 36,
    packageIdentity: "@galerina/data-model",
    packageDirectory: "galerina-data-model",
    sourceFile: "response-safe-classification.fungi",
    flowName: "isResponseSafeClassification",
    physicalExpectation: "PROVE",
    usesTextComparisonBudget: false,
    values: cases(
      ["public"],
      ["internal", "pii", "secret", "", "Public", " public", "public\u0000"],
    ),
  }),
  Object.freeze({
    slice: 37,
    packageIdentity: "@galerina/devtools-context",
    packageDirectory: "galerina-devtools-context",
    sourceFile: "builtin-name.fungi",
    flowName: "isBuiltin",
    physicalExpectation: "REFUSE_COMPILE",
    usesTextComparisonBudget: true,
    values: cases(
      ["AuditLog", "Secrets", "Crypto", "Database", "Http", "File", "Auth", "Session", "validate", "redact", "emit", "return", "Ok", "Err", "Some", "None", "true", "false"],
      ["", "auditlog", "Validate", " return", "false\u0000", "constructor"],
    ),
  }),
  Object.freeze({
    slice: 44,
    packageIdentity: "@galerina/core-logic",
    packageDirectory: "galerina-core-logic",
    sourceFile: "omni-uncertain.fungi",
    flowName: "isOmniUncertain",
    physicalExpectation: "PROVE",
    usesTextComparisonBudget: true,
    values: cases(
      [
        "unknown",
        "partial_true",
        "partial_false",
        "conflicted",
        "deferred",
        "inconsistent",
      ],
      [
        "true",
        "false",
        "",
        "Unknown",
        "partial-true",
        "partial_True",
        " unknown",
        "unknown ",
        "unknown\n",
        "unknown\uFEFF",
        "unknown\u0000",
      ],
    ),
  }),
  Object.freeze({
    slice: 78,
    packageIdentity: "@galerina/devtools-graph-algorithms",
    packageDirectory: "galerina-devtools-graph-algorithms",
    sourceFile: "boundary-crossing.fungi",
    flowName: "isCrossingAllowed",
    physicalExpectation: "REFUSE_COMPILE",
    usesTextComparisonBudget: true,
    values: boundaryCrossingCases(),
  }),
]);

async function loadSlide() {
  const fromSlide = async (path) => import(pathToFileURL(join(SLIDE_ROOT, "src", path)).href);
  const compiler = await fromSlide("checked-fungi-package-compiler.mjs");
  const scalar = await fromSlide("checked-fungi-pure-scalar-compiler.mjs");
  const file = await fromSlide("checked-fungi-package-file.mjs");
  const loader = await fromSlide("checked-fungi-package-publication-loader.mjs");
  const values = await fromSlide("safe-value-envelope.mjs");
  const veo = await fromSlide("portable-veo.mjs");
  return { ...compiler, ...scalar, ...file, ...loader, ...values, ...veo };
}

function flatMatchProbe(armCount) {
  const arms = Array.from(
    { length: armCount },
    (_, index) => `    "value-${index}" => return true`,
  ).join("\n");
  return Uint8Array.from(Buffer.from([
    "@version 1",
    "pure flow probe(value: String) -> Bool",
    "contract { intent { \"Measure one exact physical match boundary.\" } }",
    "{",
    "  match value {",
    arms,
    "    _ => return false",
    "  }",
    "}",
    "",
  ].join("\n"), "utf8"));
}

function verificationExpectation(receipt) {
  return {
    packageSetDigest: receipt.packageSetDigest,
    packageIdentity: receipt.packageIdentity,
    exportName: receipt.exportName,
    receiptDigest: receipt.receiptDigest,
    safeValueTypeId: receipt.safeValueTypeId,
    safeValueStateId: receipt.safeValueStateId,
    safeValueProvenanceDigest: receipt.safeValueProvenanceDigest,
  };
}

function executionBudgets(candidate, steps = 256) {
  return candidate.usesTextComparisonBudget
    ? { steps, textComparisonWork: 65_536 }
    : { steps };
}

async function prepare(slide, candidate, publicationDirectory, context) {
  const prepared = await slide.prepareCheckedFungiPackagePublication({
    publicationDirectory,
    packageIdentity: candidate.packageIdentity,
    exportName: candidate.flowName,
    context,
    gates: ALL_ALLOW,
  });
  assert.equal(prepared.verdict, 1, JSON.stringify(prepared));
  return prepared.packageExecutionHandle;
}

async function proveCandidate(slide, candidate) {
  const context = slide.portableVeoReferenceContext();
  const source = join(
    ROOT,
    "packages-galerina",
    candidate.packageDirectory,
    "src",
    "self-hosted",
    candidate.sourceFile,
  );
  const sourceBytes = Uint8Array.from(readFileSync(source));
  const request = (candidateBytes) => ({
    packages: [{
      identity: candidate.packageIdentity,
      version: "1.0.0-beta.2",
      exports: [{
        name: candidate.flowName,
        sourceFlowName: candidate.flowName,
        sourceBytes: candidateBytes,
      }],
      dependencies: [],
      resources: [],
    }],
    context,
    gates: ALL_ALLOW,
  });

  const compiled = slide.compileCheckedFungiPackageSet(request(sourceBytes));
  if (candidate.physicalExpectation === "REFUSE_COMPILE") {
    assert.equal(compiled.verdict, -1, JSON.stringify(compiled));
    assert.equal(Object.hasOwn(compiled, "packageBuildHandle"), false);
    return;
  }
  assert.equal(compiled.verdict, 1, JSON.stringify(compiled));
  const mutatedSource = Uint8Array.from(sourceBytes);
  mutatedSource[0] ^= 1;
  assert.equal(slide.compileCheckedFungiPackageSet(request(mutatedSource)).verdict, -1);

  const parent = await mkdtemp(join(tmpdir(), `galerina-slice-${candidate.slice}-`));
  const publicationDirectory = join(parent, "published");
  try {
    const published = await slide.publishCheckedFungiPackageBuild({
      packageBuildHandle: compiled.packageBuildHandle,
      outputDirectory: publicationDirectory,
    });
    assert.equal(published.verdict, 1, JSON.stringify(published));
    const slideFiles = published.outputFiles.filter((name) => name.endsWith(".slide"));
    assert.equal(slideFiles.length, 1);

    let retainedReceipt;
    for (const item of candidate.values) {
      const args = item.arguments ?? [item.value];
      const receipt = slide.executeTypedCheckedFungiPackagePublication(
        await prepare(slide, candidate, publicationDirectory, context),
        args,
        executionBudgets(candidate),
      );
      assert.equal(
        receipt.status,
        "SUCCEEDED_PHYSICAL_REFERENCE_ONLY",
        `${candidate.flowName}(${JSON.stringify(args)}): ${JSON.stringify(receipt)}`,
      );
      assert.equal(receipt.safeValueTypeId, slide.SAFE_VALUE_TYPE_IDS.bool);
      const verified = slide.verifyTypedCheckedFungiPackageReceipt(
        receipt,
        verificationExpectation(receipt),
      );
      assert.equal(verified.verdict, 1, JSON.stringify(verified));
      assert.equal(verified.value, item.expected, JSON.stringify(args));
      assert.equal(verified.authorityReleased, false);
      retainedReceipt = receipt;
    }

    const validArguments = candidate.values[0].arguments ?? [candidate.values[0].value];
    const invalidCases = candidate.invalidArguments ?? [
      [],
      [1],
      [true],
      [...validArguments, "extra"],
      ["\ud800"],
      ["x".repeat(257)],
    ];
    for (const invalidArguments of invalidCases) {
      const refused = slide.executeTypedCheckedFungiPackagePublication(
        await prepare(slide, candidate, publicationDirectory, context),
        invalidArguments,
        executionBudgets(candidate),
      );
      assert.equal(refused.status, "REFUSED", JSON.stringify(refused));
      assert.equal(refused.safeValueTypeId, 0);
    }

    const exhausted = slide.executeTypedCheckedFungiPackagePublication(
      await prepare(slide, candidate, publicationDirectory, context),
      validArguments,
      executionBudgets(candidate, 1),
    );
    assert.equal(exhausted.status, "REFUSED", JSON.stringify(exhausted));

    assert.notEqual(retainedReceipt, undefined);
    const expectation = verificationExpectation(retainedReceipt);
    for (const [field, replacement] of [
      ["schema", "slide.checked-fungi.physical-execution.receipt.invalid"],
      ["safeValuePayloadDigest", `sha256:${"0".repeat(64)}`],
      ["receiptDigest", `sha256:${"0".repeat(64)}`],
      ["fallbackInvoked", true],
      ["authorityReleased", true],
    ]) {
      const mutated = { ...retainedReceipt, [field]: replacement };
      assert.equal(slide.inspectTypedCheckedFungiPackageReceipt(mutated).verdict, -1, field);
      assert.equal(slide.verifyTypedCheckedFungiPackageReceipt(mutated, expectation).verdict, -1, field);
    }
    for (let index = 0; index < retainedReceipt.safeValueEnvelopeBytes.length; index += 1) {
      const mutatedBytes = Uint8Array.from(retainedReceipt.safeValueEnvelopeBytes);
      mutatedBytes[index] ^= 1;
      assert.equal(
        slide.verifyTypedCheckedFungiPackageReceipt(
          { ...retainedReceipt, safeValueEnvelopeBytes: mutatedBytes },
          expectation,
        ).verdict,
        -1,
        `safe-value envelope byte ${index}`,
      );
    }

    const mutatedPath = join(publicationDirectory, slideFiles[0]);
    const artifactBytes = await readFile(mutatedPath);
    artifactBytes[0] ^= 1;
    await writeFile(mutatedPath, artifactBytes);
    const mutationAdmission = await slide.prepareCheckedFungiPackagePublication({
      publicationDirectory,
      packageIdentity: candidate.packageIdentity,
      exportName: candidate.flowName,
      context,
      gates: ALL_ALLOW,
    });
    assert.equal(mutationAdmission.verdict, -1);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
}

describe("scalar classifiers through physical SLIDE/VOK", () => {
  it(
    "records the exact seven-pass/eight-refuse flat String-match boundary",
    { skip: !SLIDE_AVAILABLE },
    async () => {
      const slide = await loadSlide();
      const context = slide.portableVeoReferenceContext();
      const request = (armCount) => ({
        sourceBytes: flatMatchProbe(armCount),
        flowName: "probe",
        artifactId: "galerina.flat-match-boundary",
        context,
      });
      const seven = slide.compileCheckedFungiPureScalarModule(request(7));
      assert.equal(seven.verdict, 1, JSON.stringify(seven));
      assert.equal(
        seven.registrySetId,
        "slide.registry.executable-gir.v2c-bounded-wide-control-flow.v1",
      );
      const eight = slide.compileCheckedFungiPureScalarModule(request(8));
      assert.equal(eight.verdict, -1, JSON.stringify(eight));
      assert.equal(Object.hasOwn(eight, "bundleBytes"), false);
    },
  );
  for (const candidate of CANDIDATES) {
    it(
      candidate.physicalExpectation === "PROVE"
        ? `Slice ${candidate.slice} independently publishes and re-admits ${candidate.flowName}`
        : `Slice ${candidate.slice} records the exact physical compile refusal for ${candidate.flowName}`,
      { skip: !SLIDE_AVAILABLE },
      async () => {
        const slide = await loadSlide();
        await proveCandidate(slide, candidate);
      },
    );
  }
  it(
    "Slice 65 conserves the exact two-String physical refusal for validateTransition",
    { skip: !SLIDE_AVAILABLE },
    async () => {
      const slide = await loadSlide();
      const context = slide.portableVeoReferenceContext();
      const sourceBytes = Uint8Array.from(readFileSync(join(
        ROOT,
        "packages-galerina",
        "galerina-devtools-project-graph",
        "src",
        "self-hosted",
        "resource-transition.fungi",
      )));
      const compiled = slide.compileCheckedFungiPackageSet({
        packages: [{
          identity: "@galerina/devtools-project-graph",
          version: "1.0.0-beta.2",
          exports: [{
            name: "validateTransition",
            sourceFlowName: "validateTransition",
            sourceBytes,
          }],
          dependencies: [],
          resources: [],
        }],
        context,
        gates: ALL_ALLOW,
      });
      assert.equal(compiled.verdict, -1, JSON.stringify(compiled));
      assert.equal(Object.hasOwn(compiled, "packageBuildHandle"), false);
    },
  );
});
