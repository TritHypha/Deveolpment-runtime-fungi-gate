import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { OWNER_PROPOSAL_POLICY } from "../lib/logic-aig-source-origin/owner-proposal-policy.mjs";
import { PARSER_POLICY_BODY, SOURCE_POLICY_BODY, sha256Canonical } from "../lib/logic-aig-source-origin/contract.mjs";

const ENTRY = new URL("../propose-logic-aig-source-origin-owners.mjs", import.meta.url);
const RUNTIME = new URL("../lib/logic-aig-source-origin/owner-proposal-runtime.mjs", import.meta.url);

test("proposal-only entry exposes the one approved owner proposal operation", async () => {
  const entry = await import(ENTRY);
  assert.equal(typeof entry.proposeLogicAigSourceOriginOwners, "function");
});

test("proposal-only entry rejects every caller capability except one copied Git locator", async () => {
  const { proposeLogicAigSourceOriginOwners } = await import(ENTRY);
  const cases = [
    undefined,
    null,
    {},
    { gitExecutableLocator: "git" },
    { gitExecutableLocator: process.execPath, commit: "0".repeat(40) },
    Object.defineProperty({}, "gitExecutableLocator", { enumerable: true, get() { throw new Error("accessor reached"); } }),
    new Proxy({ gitExecutableLocator: "C:\\git.exe" }, { ownKeys() { throw new Error("proxy reached"); } }),
  ];
  for (const value of cases) {
    await assert.rejects(
      () => proposeLogicAigSourceOriginOwners(value),
      (error) => error?.code === "SOURCE_ORIGIN_OWNER_PROPOSAL_OPTIONS",
    );
  }
});

test("option capture copies the sole primitive field into an immutable null-prototype record", async () => {
  const { captureOwnerProposalOptions } = await import(RUNTIME);
  const input = { gitExecutableLocator: process.execPath };
  const captured = captureOwnerProposalOptions(input);
  input.gitExecutableLocator = "changed";
  assert.equal(Object.getPrototypeOf(captured), null);
  assert.equal(Object.isFrozen(captured), true);
  assert.equal(captured.gitExecutableLocator, process.execPath);
});

test("option capture rejects an accessor without invoking it", async () => {
  const { captureOwnerProposalOptions } = await import(RUNTIME);
  let calls = 0;
  const input = {};
  Object.defineProperty(input, "gitExecutableLocator", {
    enumerable: true,
    get() {
      calls += 1;
      return process.execPath;
    },
  });
  assert.throws(() => captureOwnerProposalOptions(input), { code: "SOURCE_ORIGIN_OWNER_PROPOSAL_OPTIONS" });
  assert.equal(calls, 0);
});

test("option capture rejects a proxy before any proxy trap executes", async () => {
  const { captureOwnerProposalOptions } = await import(RUNTIME);
  let calls = 0;
  const input = new Proxy({ gitExecutableLocator: process.execPath }, {
    getPrototypeOf() {
      calls += 1;
      throw new Error("trap must not run");
    },
  });
  assert.throws(() => captureOwnerProposalOptions(input), { code: "SOURCE_ORIGIN_OWNER_PROPOSAL_OPTIONS" });
  assert.equal(calls, 0);
});

test("option capture rejects missing, surplus, symbolic, and non-string fields", async () => {
  const { captureOwnerProposalOptions } = await import(RUNTIME);
  for (const input of [
    {},
    { gitExecutableLocator: process.execPath, repositoryRoot: "forbidden" },
    { gitExecutableLocator: process.execPath, [Symbol("forbidden")]: true },
    { gitExecutableLocator: new String(process.execPath) },
  ]) {
    assert.throws(() => captureOwnerProposalOptions(input), { code: "SOURCE_ORIGIN_OWNER_PROPOSAL_OPTIONS" });
  }
});

test("the current unpinned executable refuses after owner validation and before child creation", async () => {
  const { proposeLogicAigSourceOriginOwners } = await import(ENTRY);
  await assert.rejects(
    proposeLogicAigSourceOriginOwners({ gitExecutableLocator: process.execPath }),
    { code: "SOURCE_ORIGIN_OWNER_PROPOSAL_EXECUTABLE" },
  );
});

function configBytes({ omitCommandKey = null, localRows = [] } = {}) {
  const repositoryRoot = process.platform === "win32" ? "C:\\repo" : "/repo";
  const records = [];
  const prefix = OWNER_PROPOSAL_POLICY.gitProcessPolicy.fixedPrefix;
  for (let index = 0; index < prefix.length; index += 1) {
    if (prefix[index] !== "-c") continue;
    const assignment = prefix[index + 1].replace("<REPOSITORY_ROOT>", repositoryRoot);
    const split = assignment.indexOf("=");
    const key = assignment.slice(0, split);
    if (key === omitCommandKey) continue;
    records.push("command", "command line:", `${key}\n${assignment.slice(split + 1)}`);
  }
  for (const [key, value] of localRows) records.push("local", "file:.git/config", `${key}\n${value}`);
  return Buffer.from(`${records.join("\0")}\0`, "utf8");
}

test("config parser requires the complete command prefix and a closed local allowance", async () => {
  const { parseGitConfigRows } = await import(RUNTIME);
  const repositoryRoot = process.platform === "win32" ? "C:\\repo" : "/repo";
  const accepted = parseGitConfigRows(
    configBytes({ localRows: [["core.repositoryformatversion", "0"], ["remote.origin.fetch", "+refs/heads/*:refs/remotes/origin/*"]] }),
    OWNER_PROPOSAL_POLICY.gitProcessPolicy,
    repositoryRoot,
  );
  assert.equal(accepted.commandRowCount, 12);
  assert.equal(accepted.localRowCount, 2);
  assert.match(accepted.semanticDigest, /^[0-9a-f]{64}$/u);

  for (const poisoned of [
    configBytes({ omitCommandKey: "core.commitgraph" }),
    configBytes({ localRows: [["core.hooksPath", "C:\\poison"]] }),
    configBytes({ localRows: [["core.bare", "false"], ["core.bare", "false"]] }),
  ]) {
    assert.throws(
      () => parseGitConfigRows(poisoned, OWNER_PROPOSAL_POLICY.gitProcessPolicy, repositoryRoot),
      { code: "SOURCE_ORIGIN_OWNER_PROPOSAL_CONFIG" },
    );
  }
});

test("sealed command materialization replaces both root token forms before the first child", async () => {
  const { materializeGitCommand } = await import(RUNTIME);
  const repositoryRoot = process.platform === "win32" ? "C:\\repo" : "/repo";
  const command = materializeGitCommand(OWNER_PROPOSAL_POLICY.gitProcessPolicy, "GIT_VERSION", repositoryRoot);
  assert.ok(command.arguments.includes(`core.worktree=${repositoryRoot}`));
  assert.ok(command.arguments.includes(repositoryRoot));
  assert.equal(command.arguments.some((argument) => argument.includes("<REPOSITORY_ROOT>")), false);
});

test("Git layout scalars reject a text alias even when it resolves to the held file", async () => {
  const { canonicalExistingPath } = await import(RUNTIME);
  const native = realpathSync.native(fileURLToPath(import.meta.url));
  const canonical = process.platform === "win32" ? native.replaceAll("\\", "/") : native;
  assert.equal(canonicalExistingPath(canonical, "FILE"), native);
  const split = canonical.lastIndexOf("/");
  const alias = `${canonical.slice(0, split)}/./${canonical.slice(split + 1)}`;
  assert.throws(() => canonicalExistingPath(alias, "FILE"), { code: "SOURCE_ORIGIN_OWNER_PROPOSAL_REPOSITORY" });
});

test("historical baseline extraction is lexical, exact, and yields the seven approved entries", async () => {
  const { extractHistoricalBaselineEntries } = await import(RUNTIME);
  const source = readFileSync(new URL("../audit-example-diagnostics.mjs", import.meta.url));
  const entries = extractHistoricalBaselineEntries(source);
  assert.equal(entries.length, 7);
  assert.deepEqual(entries.map((entry) => entry.directoryName), [
    "Proposed-024-vault-global-basic",
    "Proposed-025-vault-global-secret-invalid",
    "Proposed-229-vault-write-without-mut-invalid",
    "Proposed-464-enterprise-supply-chain",
    "Proposed-473-scoped-vault-request",
    "Proposed-474-vault-session-session-pattern",
    "Proposed-Readable-Logic-Forms",
  ]);
  const poisoned = Buffer.from(source);
  poisoned[poisoned.indexOf(Buffer.from("same RD-0531 refusal", "utf8"))] ^= 1;
  assert.throws(() => extractHistoricalBaselineEntries(poisoned), { code: "SOURCE_ORIGIN_OWNER_PROPOSAL_HISTORICAL" });
});

test("tree and index parsers require one identical stage-zero ordinary census", async () => {
  const { assertIndexMatchesTree, parseIndexFlagRows, parseIndexStageRows, parseTreeRows } = await import(RUNTIME);
  const oidA = "1".repeat(40);
  const oidB = "2".repeat(40);
  const tree = parseTreeRows(Buffer.from(`100644 blob ${oidA}\ta/file.fungi${"\0"}100755 blob ${oidB}\tb/tool.mjs${"\0"}`), "sha1");
  const stage = parseIndexStageRows(Buffer.from(`100644 ${oidA} 0\ta/file.fungi${"\0"}100755 ${oidB} 0\tb/tool.mjs${"\0"}`), "sha1");
  const flags = parseIndexFlagRows(Buffer.from("H a/file.fungi\0H b/tool.mjs\0"));
  assert.doesNotThrow(() => assertIndexMatchesTree(tree, stage, flags));
  assert.throws(
    () => parseIndexStageRows(Buffer.from(`100644 ${oidA} 1\ta/file.fungi\0`), "sha1"),
    { code: "SOURCE_ORIGIN_OWNER_PROPOSAL_INDEX" },
  );
  assert.throws(
    () => assertIndexMatchesTree(tree, stage, parseIndexFlagRows(Buffer.from("S a/file.fungi\0H b/tool.mjs\0"))),
    { code: "SOURCE_ORIGIN_OWNER_PROPOSAL_INDEX" },
  );
});

test("four-set derivation is exact and refuses inline-sidecar overlap", async () => {
  const { deriveExpectedOutcomeRows, extractHistoricalBaselineEntries } = await import(RUNTIME);
  const parserPolicy = {
    ...PARSER_POLICY_BODY,
    policyDigest: sha256Canonical(PARSER_POLICY_BODY.schema, PARSER_POLICY_BODY),
  };
  const sourcePolicy = {
    ...SOURCE_POLICY_BODY,
    policyDigest: sha256Canonical(SOURCE_POLICY_BODY.schema, SOURCE_POLICY_BODY),
  };
  const historical = readFileSync(new URL("../audit-example-diagnostics.mjs", import.meta.url));
  const baselineEntries = extractHistoricalBaselineEntries(historical);
  const selectedSources = baselineEntries.map((entry) => ({
    path: `docs/examples/${entry.directoryName}/example.fungi`,
    bytes: Buffer.from(entry.directoryName === "Proposed-Readable-Logic-Forms" ? "/// expected_diagnostics: none (when adopted)\n" : "/// expected_diagnostics: none\n", "utf8"),
    sidecarBytes: null,
  }));
  selectedSources.push(
    { path: "docs/examples/inline.fungi", bytes: Buffer.from("/// expected_diagnostics: FUNGI-TYPE-001\n"), sidecarBytes: null },
    { path: "docs/examples/sidecar.ts", bytes: Buffer.from("export {};\n"), sidecarBytes: Buffer.from("TS-123\n") },
    { path: "packages-ts/galerina-core-compiler/tests/fixtures/gate-v3/test__fixtures__negative__wrong-version.gate", bytes: Buffer.from("gate G {}\n"), sidecarBytes: null },
  );
  const rows = deriveExpectedOutcomeRows({
    baselineEntries,
    gateVerdicts: { "test__fixtures__negative__wrong-version.gate": { ok: false, codes: ["GATE-PARSE-002"] } },
    parserPolicy,
    selectedSources,
    sourcePolicy,
  });
  assert.equal(rows.length, 10);
  assert.deepEqual(
    Object.fromEntries(["GATE_V3_VERDICT", "INLINE_EXPECTATION", "PROPOSED_BASELINE", "SIDECAR_EXPECTATION"].map((kind) => [kind, rows.filter((row) => row.ownerKind === kind).length])),
    { GATE_V3_VERDICT: 1, INLINE_EXPECTATION: 1, PROPOSED_BASELINE: 7, SIDECAR_EXPECTATION: 1 },
  );
  const overlapped = selectedSources.map((source) => source.path === "docs/examples/inline.fungi" ? { ...source, sidecarBytes: Buffer.from("FUNGI-TYPE-001\n") } : source);
  assert.throws(
    () => deriveExpectedOutcomeRows({ baselineEntries, gateVerdicts: {}, parserPolicy, selectedSources: overlapped, sourcePolicy }),
    { code: "SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES" },
  );
});

test("Gate-v3 verdicts match one source basename and create rows only for refusal", async () => {
  const { deriveExpectedOutcomeRows, extractHistoricalBaselineEntries } = await import(RUNTIME);
  const parserPolicy = {
    ...PARSER_POLICY_BODY,
    policyDigest: sha256Canonical(PARSER_POLICY_BODY.schema, PARSER_POLICY_BODY),
  };
  const sourcePolicy = {
    ...SOURCE_POLICY_BODY,
    policyDigest: sha256Canonical(SOURCE_POLICY_BODY.schema, SOURCE_POLICY_BODY),
  };
  const baselineEntries = extractHistoricalBaselineEntries(readFileSync(new URL("../audit-example-diagnostics.mjs", import.meta.url)));
  const selectedSources = baselineEntries.map((entry) => ({
    path: `docs/examples/${entry.directoryName}/example.fungi`,
    bytes: Buffer.from("/// expected_diagnostics: none\n"),
    sidecarBytes: null,
  }));
  const warningKey = "test__fixtures__negative__duplicate-consumer.gate";
  const refusalKey = "test__fixtures__negative__wrong-version.gate";
  const refusalPath = `packages-ts/galerina-core-compiler/tests/fixtures/gate-v3/${refusalKey}`;
  selectedSources.push(
    { path: `packages-ts/galerina-core-compiler/tests/fixtures/gate-v3/${warningKey}`, bytes: Buffer.from("gate Warning {}\n"), sidecarBytes: null },
    { path: refusalPath, bytes: Buffer.from("gate Refusal {}\n"), sidecarBytes: null },
  );
  const gateVerdicts = {
    [warningKey]: { ok: true, codes: ["GATE-WIRE-002"] },
    [refusalKey]: { ok: false, codes: ["GATE-PARSE-002"] },
  };
  const input = { baselineEntries, gateVerdicts, parserPolicy, selectedSources, sourcePolicy };

  const rows = deriveExpectedOutcomeRows(input);
  assert.deepEqual(rows.filter((row) => row.ownerKind === "GATE_V3_VERDICT"), [{
    path: refusalPath,
    domain: "GATE",
    parserId: "galerina-gate-v3-parser",
    disposition: "EXPECTED_REFUSAL",
    diagnosticCodes: ["GATE-PARSE-002"],
    ownerKind: "GATE_V3_VERDICT",
    ownerLocator: "packages-ts/galerina-core-compiler/tests/fixtures/gate-v3/REFERENCE-VERDICTS.json",
    ownerKey: refusalKey,
  }]);
  assert.throws(
    () => deriveExpectedOutcomeRows({ ...input, gateVerdicts: { ...gateVerdicts, "missing.gate": { ok: false, codes: ["GATE-PARSE-002"] } } }),
    { code: "SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES" },
  );
});

test("the three coded Proposed sources derive once as opaque and inline overlap still refuses", async () => {
  const { deriveExpectedOutcomeRows, extractHistoricalBaselineEntries } = await import(RUNTIME);
  const parserPolicy = {
    ...PARSER_POLICY_BODY,
    policyDigest: sha256Canonical(PARSER_POLICY_BODY.schema, PARSER_POLICY_BODY),
  };
  const sourcePolicy = {
    ...SOURCE_POLICY_BODY,
    policyDigest: sha256Canonical(SOURCE_POLICY_BODY.schema, SOURCE_POLICY_BODY),
  };
  const baselineEntries = extractHistoricalBaselineEntries(readFileSync(new URL("../audit-example-diagnostics.mjs", import.meta.url)));
  const targets = [
    { directoryName: "Proposed-025-vault-global-secret-invalid", path: "docs/examples/Level-1-Basics/Proposed-025-vault-global-secret-invalid/example.fungi" },
    { directoryName: "Proposed-229-vault-write-without-mut-invalid", path: "docs/examples/Level-5-Governance/Proposed-229-vault-write-without-mut-invalid/example.fungi" },
    { directoryName: "Proposed-464-enterprise-supply-chain", path: "docs/examples/Level-9-Enterprise/Proposed-464-enterprise-supply-chain/example.fungi" },
  ];
  const targetByDirectory = new Map(targets.map((target) => [target.directoryName, target]));
  const selectedSources = baselineEntries.map((entry) => {
    const target = targetByDirectory.get(entry.directoryName);
    return target ? {
      path: target.path,
      bytes: readFileSync(new URL(`../../${target.path}`, import.meta.url)),
      sidecarBytes: null,
    } : {
      path: `docs/examples/${entry.directoryName}/example.fungi`,
      bytes: Buffer.from("/// expected_diagnostics: none\n"),
      sidecarBytes: null,
    };
  });
  const input = { baselineEntries, gateVerdicts: {}, parserPolicy, selectedSources, sourcePolicy };

  const rows = deriveExpectedOutcomeRows(input);
  assert.equal(rows.length, 7);
  for (const target of targets) {
    assert.deepEqual(rows.filter((row) => row.path === target.path), [{
      path: target.path,
      domain: "FUNGI",
      parserId: "galerina-fungi-parser",
      disposition: "OPAQUE_PROPOSED",
      diagnosticCodes: null,
      ownerKind: "PROPOSED_BASELINE",
      ownerLocator: "governance/example-proposed-baseline.json",
      ownerKey: target.directoryName,
    }]);
  }

  const overlapped = selectedSources.map((source) => source.path === targets[0].path ? {
    ...source,
    bytes: Buffer.concat([Buffer.from("/// expected_diagnostics: FUNGI-VAULT-001\n"), source.bytes]),
  } : source);
  assert.throws(
    () => deriveExpectedOutcomeRows({ ...input, selectedSources: overlapped }),
    { code: "SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES" },
  );
});

test("transaction command trace fixes first, closing, complete, and no-post-close child order", async () => {
  const { assertCommandTrace } = await import(RUNTIME);
  const commandIds = OWNER_PROPOSAL_POLICY.gitProcessPolicy.commandRows.map((row) => row.commandId);
  const middle = commandIds.filter((commandId) => commandId !== "GIT_VERSION" && commandId !== "CONFIG_ROWS");
  const valid = ["GIT_VERSION", "CONFIG_ROWS", ...middle, "CONFIG_ROWS", "GIT_VERSION"];
  assert.doesNotThrow(() => assertCommandTrace(valid, OWNER_PROPOSAL_POLICY.gitProcessPolicy));
  for (const poisoned of [
    ["CONFIG_ROWS", "GIT_VERSION", ...middle, "CONFIG_ROWS", "GIT_VERSION"],
    valid.filter((commandId) => commandId !== "TREE"),
    [...valid, "HEAD"],
  ]) {
    assert.throws(() => assertCommandTrace(poisoned, OWNER_PROPOSAL_POLICY.gitProcessPolicy), { code: "SOURCE_ORIGIN_OWNER_PROPOSAL_COMMAND_TRACE" });
  }
});

test("child output enforcement accepts exact ceilings and refuses per-stream or combined plus one", async () => {
  const { exceedsChildOutputLimit } = await import(RUNTIME);
  assert.equal(exceedsChildOutputLimit(64, 0, 64, 64), false);
  assert.equal(exceedsChildOutputLimit(65, 0, 64, 128), true);
  assert.equal(exceedsChildOutputLimit(40, 25, 64, 64), true);
  assert.throws(() => exceedsChildOutputLimit(-1, 0, 64, 64), { code: "SOURCE_ORIGIN_OWNER_PROPOSAL_LIMIT" });
});

test("held bootstrap equality and closing bindings refuse one-byte or identity drift", async () => {
  const { assertClosingBindings, assertHeldOwnerBytes } = await import(RUNTIME);
  const pins = Buffer.from("pins");
  const temporary = Buffer.from("temporary");
  assert.doesNotThrow(() => assertHeldOwnerBytes(Buffer.from(pins), Buffer.from(temporary), pins, temporary));
  assert.throws(() => assertHeldOwnerBytes(Buffer.from("Pins"), Buffer.from(temporary), pins, temporary), { code: "SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER" });

  const owners = {
    pins: { rawSha256: "1".repeat(64), semanticDigest: "2".repeat(64) },
    temporary: { rawSha256: "3".repeat(64), semanticDigest: "4".repeat(64) },
  };
  const executable = {
    locator: process.execPath,
    byteLength: 1,
    rawSha256: "5".repeat(64),
    stat: { dev: 1n, ino: 2n, size: 1n, mtimeNs: 3n },
  };
  assert.doesNotThrow(() => assertClosingBindings(owners, structuredClone(owners), executable, structuredClone(executable)));
  const drifted = structuredClone(owners);
  drifted.temporary.rawSha256 = "6".repeat(64);
  assert.throws(() => assertClosingBindings(owners, drifted, executable, structuredClone(executable)), { code: "SOURCE_ORIGIN_OWNER_PROPOSAL_DRIFT" });
});

test("output builders bind predecessor digests and return body-free fresh Buffer copies", async () => {
  const { createProposalOutputs, createReceiptBytes, extractHistoricalBaselineEntries, packageProposalResult } = await import(RUNTIME);
  const parserPolicy = { ...PARSER_POLICY_BODY, policyDigest: sha256Canonical(PARSER_POLICY_BODY.schema, PARSER_POLICY_BODY) };
  const baselineEntries = extractHistoricalBaselineEntries(readFileSync(new URL("../audit-example-diagnostics.mjs", import.meta.url)));
  const digest = "7".repeat(64);
  const outputs = createProposalOutputs({
    baselineEntries,
    bindings: {
      sourcePolicyDigest: digest,
      exclusionDigest: digest,
      resolutionPolicyDigest: digest,
      parserPolicyDigest: parserPolicy.policyDigest,
      generatedConsumerPolicyDigest: digest,
      repositoryIdentityDigest: digest,
      toolchainPinsDigest: OWNER_PROPOSAL_POLICY.toolchainPinsDigest,
    },
    parserPolicy,
    rows: [],
  });
  const exporter = JSON.parse(outputs.exporter.bytes.toString("utf8"));
  assert.equal(exporter.proposedBaselineDigest, outputs.baseline.semanticDigest);
  assert.equal(exporter.expectedOutcomesDigest, outputs.expected.semanticDigest);
  const receiptBytes = createReceiptBytes({
    currentOwners: [{ locator: "governance/owner.json", blobOid: "1".repeat(40), byteLength: 1, rawSha256: digest, semanticDigest: digest }],
    historical: { identity: OWNER_PROPOSAL_POLICY.historicalBaselineSource },
    opening: { commitOid: "2".repeat(40), treeOid: "3".repeat(40), objectFormat: "sha1" },
    outcomeCounts: [{ ownerKind: "PROPOSED_BASELINE", sourceCount: 0, rowCount: 0 }],
    outputs,
  });
  const receiptText = receiptBytes.toString("utf8");
  const receipt = JSON.parse(receiptText);
  assert.equal(receipt.status, "PROPOSED");
  assert.equal(receipt.authorizing, false);
  assert.equal(receipt.proposedBaselineDigest, outputs.baseline.semanticDigest);
  assert.doesNotMatch(receiptText, /(?:[A-Za-z]:[\\/]|environment|timestamp|runnerId|reason)/u);

  const first = packageProposalResult(outputs, receiptBytes);
  const second = packageProposalResult(outputs, receiptBytes);
  assert.deepEqual(Object.keys(first).sort(), ["expectedOutcomesBytes", "exporterPolicyBytes", "proposedBaselineBytes", "receiptBytes"]);
  first.proposedBaselineBytes[0] ^= 1;
  first.receiptBytes[0] ^= 1;
  assert.notDeepEqual(first.proposedBaselineBytes, outputs.baseline.bytes);
  assert.deepEqual(second.proposedBaselineBytes, outputs.baseline.bytes);
  assert.deepEqual(second.receiptBytes, receiptBytes);
});
