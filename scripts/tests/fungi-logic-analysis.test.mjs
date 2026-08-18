import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  CONSTRUCT_IDS,
  analyzeFungiSource,
  buildAnalysisRun,
  cacheMatchesIdentity,
  digestCompilerTree,
  runLogicAnalysisSelfTest,
} from "../lib/fungi-logic-analysis/index.mjs";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const digest = (character) => `sha256:${character.repeat(64)}`;

function identity(overrides = {}) {
  return {
    sourceSha256: digest("1"),
    compilerSha256: digest("2"),
    profileSha256: digest("3"),
    graphBuildPoint: "4".repeat(40),
    ...overrides,
  };
}

function facts(ast, overrides = {}) {
  return {
    ast,
    flows: [],
    effectResults: [],
    governanceObligations: [],
    diagnostics: { parse: [], type: [], effect: [], governance: [] },
    requestedVaultScopes: [],
    ...overrides,
  };
}

const node = (kind, children = [], value = undefined) => ({ kind, children, ...(value === undefined ? {} : { value }) });
const contract = () => node("contractDecl", [node("intentDecl", [], "preserve admitted behavior")]);
const flow = (...children) => node("pureFlowDecl", [contract(), ...children], "example");

test("the engine exposes one exact eight-construct registry", () => {
  assert.deepEqual(CONSTRUCT_IDS, ["if", "match", "check", "contract", "flow", "global", "vault", "hallmark"]);
});

test("a checked Bool if is supported while a call-shaped condition is blocked", () => {
  const green = buildAnalysisRun({ command: "if", identity: identity(), facts: facts(node("module", [flow(node("ifStmt", [node("identifier"), node("block")]))])) });
  assert.equal(green.status, "SUPPORTED");
  const red = buildAnalysisRun({ command: "if", identity: identity(), facts: facts(node("module", [flow(node("ifStmt", [node("callExpr"), node("block")]))])) });
  assert.equal(red.status, "BLOCKED");
  assert.deepEqual(red.constructs[0].blockerCodes, ["IF_CONDITION_EFFECT_UNPROVED"]);
});

test("match requires a terminal wildcard until exact exhaustiveness is proved", () => {
  const complete = node("matchExpr", [node("identifier"), node("matchArm", [], "1"), node("matchArm", [], "_")]);
  const incomplete = node("matchExpr", [node("identifier"), node("matchArm", [], "1")]);
  assert.equal(buildAnalysisRun({ command: "match", identity: identity(), facts: facts(node("module", [flow(complete)])) }).status, "SUPPORTED");
  const result = buildAnalysisRun({ command: "match", identity: identity(), facts: facts(node("module", [flow(incomplete)])) });
  assert.equal(result.status, "BLOCKED");
  assert.deepEqual(result.constructs[0].blockerCodes, ["MATCH_EXHAUSTIVENESS_UNPROVED"]);
});

test("check admits exactly if deny and ambig arms", () => {
  const complete = node("checkExpr", [node("identifier"), node("checkArm", [], "deny"), node("checkArm", [], "ambig"), node("checkArm", [], "if")]);
  const missing = node("checkExpr", [node("identifier"), node("checkArm", [], "deny"), node("checkArm", [], "if")]);
  assert.equal(buildAnalysisRun({ command: "check", identity: identity(), facts: facts(node("module", [flow(complete)])) }).status, "SUPPORTED");
  const result = buildAnalysisRun({ command: "check", identity: identity(), facts: facts(node("module", [flow(missing)])) });
  assert.equal(result.status, "BLOCKED");
  assert.deepEqual(result.constructs[0].blockerCodes, ["CHECK_ARMS_INCOMPLETE"]);
});

test("every analyzed flow requires attached contract evidence", () => {
  const bare = node("pureFlowDecl", [node("block")], "bare");
  const result = buildAnalysisRun({ command: "scan", identity: identity(), facts: facts(node("module", [bare])) });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.constructs.find((item) => item.id === "contract").status, "BLOCKED");
  assert.deepEqual(result.constructs.find((item) => item.id === "contract").blockerCodes, ["FLOW_CONTRACT_EVIDENCE_MISSING"]);
});

test("flow and contract counts include every canonical declaration variant", () => {
  const ast = node("module", [
    node("flowDecl", [contract()], "plain"),
    node("pureFlowDecl", [contract()], "pure"),
    node("contractSetDecl", [], "shared"),
  ]);
  const result = buildAnalysisRun({ command: "scan", identity: identity(), facts: facts(ast) });
  assert.equal(result.constructs.find((item) => item.id === "flow").count, 2);
  assert.equal(result.constructs.find((item) => item.id === "contract").count, 3);
});

test("global and session vault scopes are explicit parser blockers", () => {
  for (const scope of ["global", "session"]) {
    const result = buildAnalysisRun({
      command: "global",
      identity: identity(),
      facts: facts(node("module", [node("vaultDecl")]), {
        requestedVaultScopes: [scope],
        diagnostics: { parse: ["FUNGI-VAULT-008"], type: [], effect: [], governance: [] },
      }),
    });
    assert.equal(result.status, "BLOCKED", scope);
    assert.match(result.constructs[0].blockerCodes.join(" "), /GLOBAL_VAULT_SCOPE_UNIMPLEMENTED/u);
  }
});

test("secure vault entries require closed permissions and an audit policy", () => {
  const goodEntry = node("vaultEntryDecl", [node("identifier", [], "type:Int"), node("identifier", [], "allow:readValue:read"), node("identifier", [], "audit:required")], "value");
  const badEntry = node("vaultEntryDecl", [node("identifier", [], "type:Int"), node("identifier", [], "allow:readValue:admin")], "value");
  assert.equal(buildAnalysisRun({ command: "vault", identity: identity(), facts: facts(node("module", [node("vaultDecl", [goodEntry])]), { requestedVaultScopes: ["secure"] }) }).status, "SUPPORTED");
  const result = buildAnalysisRun({ command: "vault", identity: identity(), facts: facts(node("module", [node("vaultDecl", [badEntry])]), { requestedVaultScopes: ["secure"] }) });
  assert.equal(result.status, "BLOCKED");
  assert.deepEqual(result.constructs[0].blockerCodes, ["VAULT_AUDIT_POLICY_MISSING", "VAULT_PERMISSION_INVALID"]);
});

test("hallmarks require one carrier and one assay gate", () => {
  const good = node("hallmarkDecl", [node("typeRef", [], "String"), node("identifier", [], "gate:assay")], "CustomerRef");
  const bad = node("hallmarkDecl", [node("typeRef", [], "String")], "CustomerRef");
  assert.equal(buildAnalysisRun({ command: "hallmark", identity: identity(), facts: facts(node("module", [good])) }).status, "SUPPORTED");
  const result = buildAnalysisRun({ command: "hallmark", identity: identity(), facts: facts(node("module", [bad])) });
  assert.equal(result.status, "BLOCKED");
  assert.deepEqual(result.constructs[0].blockerCodes, ["HALLMARK_ASSAY_GATE_MISSING"]);
});

test("compiler diagnostics block present constructs without copying source text", () => {
  const result = buildAnalysisRun({
    command: "flow",
    identity: identity(),
    facts: facts(node("module", [flow()]), { diagnostics: { parse: [], type: ["FUNGI-TYPE-033"], effect: [], governance: [] } }),
  });
  assert.equal(result.status, "BLOCKED");
  assert.match(JSON.stringify(result), /FUNGI-TYPE-033/u);
  assert.doesNotMatch(JSON.stringify(result), /sourceBody|privateSkillText|BEGIN PRIVATE KEY/u);
  assert.deepEqual(result.actions, { candidateCompiled: false, physicalProofRun: false, consumerSwitched: false, typescriptRetired: false, productionAuthorityReleased: false });
});

test("cache identity changes on source compiler profile or graph drift", () => {
  const result = buildAnalysisRun({ command: "flow", identity: identity(), facts: facts(node("module", [flow()])) });
  assert.equal(cacheMatchesIdentity(result, identity()), true);
  for (const field of ["sourceSha256", "compilerSha256", "profileSha256", "graphBuildPoint"]) {
    const changed = field === "graphBuildPoint" ? "5".repeat(40) : digest("5");
    assert.equal(cacheMatchesIdentity(result, identity({ [field]: changed })), false, field);
  }
  assert.equal(cacheMatchesIdentity({ ...result, toolVersion: "0.0.0" }, identity()), false);
});

test("compiler tree identity is order-stable and changes with implementation bytes", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "fungi-logic-compiler-"));
  try {
    await mkdir(resolve(root, "nested"));
    await writeFile(resolve(root, "z.js"), "export const z = 1;\n");
    await writeFile(resolve(root, "nested", "a.js"), "export const a = 1;\n");
    const first = await digestCompilerTree(root);
    assert.equal(await digestCompilerTree(root), first);
    await writeFile(resolve(root, "nested", "a.js"), "export const a = 2;\n");
    assert.notEqual(await digestCompilerTree(root), first);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the live compiler supports golden check match and hallmark sources but refuses global vault", async () => {
  const graphBuildPoint = "a".repeat(40);
  const cases = [
    ["check", "docs/examples/golden/004-k3-check.fungi", "SUPPORTED"],
    ["match", "docs/examples/golden/003-result-match.fungi", "SUPPORTED"],
    ["hallmark", "docs/examples/Level-2-Types/094-hallmark-declaration/example.fungi", "SUPPORTED"],
    ["global", "docs/examples/Level-1-Basics/Proposed-024-vault-global-basic/example.fungi", "BLOCKED"],
  ];
  for (const [command, relative, expected] of cases) {
    const source = await readFile(resolve(ROOT, ...relative.split("/")), "utf8");
    const result = await analyzeFungiSource({ source, file: relative, command, graphBuildPoint, profile: "dev" });
    assert.equal(result.status, expected, relative);
  }
});

test("the planted self-test and CLI prove a green and a controlled red", () => {
  assert.deepEqual(runLogicAnalysisSelfTest(), { green: "SUPPORTED", red: "BLOCKED", passed: true });
  const result = spawnSync(process.execPath, ["scripts/fungi-logic-analysis.mjs", "--self-test"], { cwd: ROOT, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(JSON.parse(result.stdout), { green: "SUPPORTED", passed: true, red: "BLOCKED" });
});
