import assert from "node:assert/strict";
import test from "node:test";

import {
  RELEASE_REPOSITORY_CHECKS,
  deriveDurabilityStatement,
  deriveRepositoryStatement,
  validateDurabilityStatement,
  validateRepositoryStatement,
} from "../lib/beta-release-evidence-receipts.mjs";

const COMMIT = "1".repeat(40);
const HASHES = Object.freeze({
  evidence: "2".repeat(64),
  implementation: "3".repeat(64),
  checkpoint: "4".repeat(64),
  reboot: "5".repeat(64),
  powerLoss: "6".repeat(64),
  tree: "7".repeat(64),
});

function durabilityInput(overrides = {}) {
  return {
    releaseId: "beta-v1",
    operatingSystem: "windows-10",
    platform: {
      os: "win32",
      architecture: "x64",
      distribution: "windows",
      distributionVersion: "10",
    },
    repositoryCommit: COMMIT,
    evidenceBundleSha256: HASHES.evidence,
    implementationSha256: HASHES.implementation,
    acceptedCheckpointSha256: HASHES.checkpoint,
    controlledRebootSha256: HASHES.reboot,
    controlledPowerLossSha256: HASHES.powerLoss,
    ...overrides,
  };
}

function repositoryInput(overrides = {}) {
  return {
    releaseId: "beta-v1",
    repositoryCommit: COMMIT,
    trackedTreeSha256: HASHES.tree,
    checks: RELEASE_REPOSITORY_CHECKS.map((definition, index) => ({
      id: definition.id,
      command: [...definition.command],
      exitCode: 0,
      stdoutSha256: String(index + 8).repeat(64).slice(0, 64),
      stderrSha256: String(index + 14).repeat(64).slice(0, 64),
    })),
    ...overrides,
  };
}

test("derives and validates a closed durability statement without trust booleans", () => {
  const input = durabilityInput();
  const statement = deriveDurabilityStatement(input);
  const validated = validateDurabilityStatement(statement, input);

  assert.equal(statement._type, "https://in-toto.io/Statement/v1");
  assert.equal(
    statement.predicateType,
    "https://galerina.dev/attestation/registry-durability/v1",
  );
  assert.equal(statement.subject[0].digest.sha256, HASHES.evidence);
  assert.equal("authenticated" in statement.predicate, false);
  assert.equal("productionAuthorizing" in statement.predicate, false);
  assert.equal(validated, statement);
  assert.equal(Object.isFrozen(statement.predicate.platform), true);
});

test("derives and validates the exact ordered repository fixed point", () => {
  const input = repositoryInput();
  const statement = deriveRepositoryStatement(input);
  const validated = validateRepositoryStatement(statement, {
    releaseId: input.releaseId,
    repositoryCommit: input.repositoryCommit,
    trackedTreeSha256: input.trackedTreeSha256,
  });

  assert.equal(
    statement.predicateType,
    "https://galerina.dev/attestation/repository-fixed-point/v1",
  );
  assert.deepEqual(
    statement.predicate.checks.map((check) => check.id),
    RELEASE_REPOSITORY_CHECKS.map((check) => check.id),
  );
  assert.equal(statement.subject[0].digest.sha256, HASHES.tree);
  assert.equal(validated, statement);
  assert.equal(Object.isFrozen(statement.predicate.checks), true);
});

test("durability refuses absent recovery evidence and subject disagreement", () => {
  const missing = durabilityInput();
  delete missing.controlledPowerLossSha256;
  assert.throws(
    () => deriveDurabilityStatement(missing),
    /RELEASE_DURABILITY_INPUT_MALFORMED/u,
  );

  const validInput = durabilityInput();
  const statement = structuredClone(deriveDurabilityStatement(validInput));
  statement.subject[0].digest.sha256 = "f".repeat(64);
  assert.throws(
    () => validateDurabilityStatement(statement, validInput),
    /RELEASE_DURABILITY_STATEMENT_REFUSED/u,
  );
});

test("repository refuses reordered, changed, absent and nonzero checks", () => {
  const scenarios = [
    (input) => input.checks.reverse(),
    (input) => { input.checks[0].command = ["node", "different.mjs"]; },
    (input) => { input.checks.pop(); },
    (input) => { input.checks[3].exitCode = 1; },
  ];
  for (const mutate of scenarios) {
    const input = repositoryInput();
    mutate(input);
    assert.throws(
      () => deriveRepositoryStatement(input),
      /RELEASE_REPOSITORY_INPUT_REFUSED/u,
    );
  }
});

test("receipt derivation refuses unsafe proxy input", () => {
  assert.throws(
    () => deriveDurabilityStatement(new Proxy(durabilityInput(), {})),
    /RELEASE_DURABILITY_INPUT_MALFORMED/u,
  );
});
