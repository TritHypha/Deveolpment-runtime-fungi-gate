import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { generateProductProfiles } from "../generate-product-profiles.mjs";

const SCRIPT = resolve("scripts/generate-product-profiles.mjs");
const STRICT_JSON = resolve("scripts/lib/assurance-fabric/strict-json.mjs");
const SOURCE_SCHEMA = resolve("product-registry/product-profiles.source.v1.schema.json");
const GENERATED_SCHEMA = resolve("product-registry/product-profiles.v1.schema.json");
const POLICY_PATH = "packages-ts/galerina-core-compiler/src/governance-verifier.ts";
const POLICY_BYTES = Buffer.from("export const policy = true;\n", "utf8");

function sha256Utf8(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sourceRegistry(overrides = {}) {
  return {
    schema: "product-profiles.source.v1",
    schemaVersion: 1,
    products: [
      {
        productId: "galerina",
        productClass: "production",
        governanceClass: "zero-trust",
        compatibilityState: "admitted",
        policyId: "galerina-governance-v1",
        policyPath: POLICY_PATH,
        packageNamespaces: ["@galerina/"],
        artifactNamespace: "galerina/v1",
        admittedSafetyProfiles: ["strict", "high_integrity", "deterministic"],
        admittedBuildModes: [
          "build-production",
          "build-deterministic",
          "build-wasm-standalone",
          "build-wasm-hybrid",
        ],
        admittedPhysicalProfiles: ["1"],
        entrypointId: "galerina",
        externalAuthorizerId: "vok",
      },
      {
        productId: "trametes",
        productClass: "production",
        governanceClass: "admitted-closed-network",
        compatibilityState: "planned",
        policyId: "trametes-policy-unavailable",
        policyPath: "",
        packageNamespaces: [],
        artifactNamespace: "trametes/planned/v1",
        admittedSafetyProfiles: [],
        admittedBuildModes: [],
        admittedPhysicalProfiles: [],
        entrypointId: "trametes-unavailable",
        externalAuthorizerId: "vok",
      },
    ],
    ...overrides,
  };
}

function bytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function generate(sourceBytes, readPolicy = (path) => {
  assert.equal(path, POLICY_PATH);
  return POLICY_BYTES;
}) {
  return generateProductProfiles(sourceBytes, readPolicy, {
    sourceSchemaBytes: readFileSync(SOURCE_SCHEMA),
    generatedSchemaBytes: readFileSync(GENERATED_SCHEMA),
  });
}

test("generator binds admitted policy bytes and planned unavailable policy deterministically", () => {
  const generated = generate(bytes(sourceRegistry()));
  const parsed = JSON.parse(generated.toString("utf8"));
  assert.equal(generated.at(-1), 0x0a);
  assert.equal(parsed.schema, "product-profiles.v1");
  assert.deepEqual(parsed.products.map((row) => row.productId), ["galerina", "trametes"]);
  assert.equal(
    parsed.products[0].policyDigest,
    `sha256:${createHash("sha256").update(POLICY_BYTES).digest("hex")}`,
  );
  const plannedBinding = JSON.stringify({
    domain: "product-policy-unavailable.v1",
    productId: "trametes",
    compatibilityState: "planned",
    policyId: "trametes-policy-unavailable",
  });
  assert.equal(parsed.products[1].policyDigest, `sha256:${sha256Utf8(plannedBinding)}`);
  assert.equal("policyPath" in parsed.products[0], false);

  const reversed = sourceRegistry();
  reversed.products.reverse();
  assert.deepEqual(generate(bytes(reversed)), generated);
});

test("source admission refuses before any policy read", () => {
  const valid = sourceRegistry();
  const withGeneratedField = structuredClone(valid);
  withGeneratedField.products[0].policyDigest = `sha256:${"0".repeat(64)}`;
  const invalidSources = [
    withGeneratedField,
    { ...valid, schema: "product-profiles.v1" },
    { ...valid, extra: true },
  ];
  for (const value of invalidSources) {
    let policyReads = 0;
    assert.throws(
      () => generate(bytes(value), () => {
        policyReads += 1;
        return Buffer.from("forbidden policy read", "utf8");
      }),
      /SOURCE_SCHEMA_REFUSED/,
    );
    assert.equal(policyReads, 0);
  }

  const sourceText = bytes(valid).toString("utf8");
  const escapedDuplicate = Buffer.from(sourceText.replace(
    '"schema": "product-profiles.source.v1",',
    '"schema": "product-profiles.source.v1", "\\u0073chema": "product-profiles.source.v1",',
  ));
  let duplicatePolicyReads = 0;
  assert.throws(
    () => generate(escapedDuplicate, () => {
      duplicatePolicyReads += 1;
      return Buffer.from("forbidden policy read", "utf8");
    }),
    /STRICT_JSON_DUPLICATE/,
  );
  assert.equal(duplicatePolicyReads, 0);
});

test("planned products cannot carry policy paths or admission arrays", () => {
  const withPolicyPath = sourceRegistry();
  withPolicyPath.products[1].policyPath = "policies/trametes.ts";
  assert.throws(() => generate(bytes(withPolicyPath)), /PLANNED_POLICY_PATH/);

  const withAdmission = sourceRegistry();
  withAdmission.products[1].admittedPhysicalProfiles = ["1"];
  assert.throws(() => generate(bytes(withAdmission)), /PLANNED_ADMISSION/);
});

function write(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function copyImplementation(root) {
  const files = [
    [SCRIPT, "scripts/generate-product-profiles.mjs"],
    [STRICT_JSON, "scripts/lib/assurance-fabric/strict-json.mjs"],
    [SOURCE_SCHEMA, "product-registry/product-profiles.source.v1.schema.json"],
    [GENERATED_SCHEMA, "product-registry/product-profiles.v1.schema.json"],
  ];
  for (const [source, destination] of files) {
    const target = join(root, destination);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(source, target);
    assert.equal(
      createHash("sha256").update(readFileSync(target)).digest("hex"),
      createHash("sha256").update(readFileSync(source)).digest("hex"),
    );
  }
  write(root, "package.json", '{"type":"module"}\n');
}

test("CLI source refusal never creates or mutates generated output", () => {
  const valid = sourceRegistry();
  const withGeneratedField = structuredClone(valid);
  withGeneratedField.products[0].policyDigest = `sha256:${"0".repeat(64)}`;
  const escapedDuplicate = Buffer.from(bytes(valid).toString("utf8").replace(
    '"schema": "product-profiles.source.v1",',
    '"schema": "product-profiles.source.v1", "\\u0073chema": "product-profiles.source.v1",',
  ));
  const invalidSources = [
    bytes(withGeneratedField),
    bytes({ ...valid, schema: "product-profiles.v1" }),
    bytes({ ...valid, extra: true }),
    escapedDuplicate,
  ];
  for (const [sourceIndex, invalidBytes] of invalidSources.entries()) {
    for (const sentinel of [null, Buffer.from(`exact sentinel bytes ${sourceIndex}\n`)]) {
    const root = mkdtempSync(join(tmpdir(), "product-profile-generator-"));
    try {
      copyImplementation(root);
      write(root, "product-registry/product-profiles.source.v1.json", invalidBytes);
      const output = join(root, "product-registry/product-profiles.v1.json");
      if (sentinel !== null) writeFileSync(output, sentinel);

      const result = spawnSync(process.execPath, [
        join(root, "scripts/generate-product-profiles.mjs"),
        "--root",
        root,
        "--write",
      ], { cwd: root, encoding: "utf8" });

      assert.notEqual(result.status, 0);
      assert.match(
        `${result.stdout}\n${result.stderr}`,
        sourceIndex === 3 ? /STRICT_JSON_DUPLICATE/ : /SOURCE_SCHEMA_REFUSED/,
      );
      if (sentinel === null) assert.equal(existsSync(output), false);
      else assert.deepEqual(readFileSync(output), sentinel);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
    }
  }
});
