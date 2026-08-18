import { createHash } from "node:crypto";

import {
  ANALYSIS_COMMANDS,
  CONSTRUCT_IDS,
  CONSTRUCT_REGISTRY,
  LOGIC_ANALYSIS_SCHEMA,
  LOGIC_ANALYSIS_STATUSES,
  LOGIC_ANALYSIS_TOOL_VERSION,
  LogicAnalysisError,
} from "./contracts.mjs";
import { canonicalAnalysisJson } from "./publication.mjs";

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const COMMIT = /^[0-9a-f]{40}$/u;
const STATUS_RANK = Object.freeze({ SUPPORTED: 0, MANUAL_REVIEW: 1, BLOCKED: 2 });
const FLOW_KINDS = new Set(["flowDecl", "secureFlowDecl", "pureFlowDecl", "guardedFlowDecl", "fnDecl"]);

function fail(code, message) {
  throw new LogicAnalysisError(code, message);
}

function record(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("ANALYSIS_RECORD_INVALID", `${label} must be a record`);
  return value;
}

function exactDigest(value, label) {
  if (!DIGEST.test(value)) fail("ANALYSIS_DIGEST_INVALID", `${label} must be sha256`);
  return value;
}

function uniqueSorted(values) {
  return Object.freeze([...new Set(values)].sort((left, right) => left < right ? -1 : left > right ? 1 : 0));
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function validateAnalysisIdentity(value) {
  record(value, "analysis identity");
  const keys = Object.keys(value).sort();
  if (canonicalAnalysisJson(keys) !== canonicalAnalysisJson(["compilerSha256", "graphBuildPoint", "profileSha256", "sourceSha256"])) {
    fail("ANALYSIS_IDENTITY_FIELDS_INVALID", "analysis identity has missing or surplus fields");
  }
  if (!COMMIT.test(value.graphBuildPoint)) fail("ANALYSIS_GRAPH_BUILD_POINT_INVALID", "graph build point must be an exact commit");
  return Object.freeze({
    sourceSha256: exactDigest(value.sourceSha256, "source digest"),
    compilerSha256: exactDigest(value.compilerSha256, "compiler digest"),
    profileSha256: exactDigest(value.profileSha256, "profile digest"),
    graphBuildPoint: value.graphBuildPoint,
  });
}

function walk(node, parent, out) {
  if (node === null || typeof node !== "object" || Array.isArray(node) || typeof node.kind !== "string") return;
  out.push(Object.freeze({ node, parent }));
  for (const child of node.children ?? []) walk(child, node, out);
}

function values(node, prefix) {
  return (node.children ?? []).filter((child) => child?.kind === "identifier" && typeof child.value === "string" && child.value.startsWith(prefix)).map((child) => child.value);
}

function allDiagnosticCodes(diagnostics) {
  record(diagnostics, "diagnostics");
  return uniqueSorted(["parse", "type", "effect", "governance"].flatMap((stage) => {
    const values = diagnostics[stage];
    if (!Array.isArray(values) || values.some((value) => typeof value !== "string" || value.length === 0)) fail("ANALYSIS_DIAGNOSTICS_INVALID", `${stage} diagnostics must be code strings`);
    return values;
  }));
}

function constructBlockers(id, entries, facts, diagnostics) {
  const blockers = [...diagnostics];
  const nodes = entries.map((entry) => entry.node);
  if (id === "if") {
    for (const item of nodes.filter((item) => item.kind === "ifStmt")) {
      const condition = item.children?.[0];
      const conditionEntries = [];
      walk(condition, undefined, conditionEntries);
      if (conditionEntries.some((entry) => entry.node.kind === "callExpr" || entry.node.kind === "awaitExpr")) blockers.push("IF_CONDITION_EFFECT_UNPROVED");
    }
  }
  if (id === "match") {
    for (const item of nodes.filter((item) => item.kind === "matchExpr")) {
      const arms = (item.children ?? []).filter((child) => child?.kind === "matchArm").map((child) => child.value);
      if (!arms.includes("_")) blockers.push("MATCH_EXHAUSTIVENESS_UNPROVED");
    }
  }
  if (id === "check") {
    for (const item of nodes.filter((item) => item.kind === "checkExpr")) {
      const arms = uniqueSorted((item.children ?? []).filter((child) => child?.kind === "checkArm").map((child) => child.value));
      if (canonicalAnalysisJson(arms) !== canonicalAnalysisJson(["ambig", "deny", "if"])) blockers.push("CHECK_ARMS_INCOMPLETE");
    }
  }
  if (id === "contract") {
    const flowNodes = entries.filter((entry) => FLOW_KINDS.has(entry.node.kind)).map((entry) => entry.node);
    if (flowNodes.some((item) => !(item.children ?? []).some((child) => child?.kind === "contractDecl" || child?.kind === "contractSetDecl"))) blockers.push("FLOW_CONTRACT_EVIDENCE_MISSING");
  }
  if (id === "global") {
    if (facts.requestedVaultScopes.some((scope) => scope === "global" || scope === "session")) blockers.push("GLOBAL_VAULT_SCOPE_UNIMPLEMENTED");
  }
  if (id === "vault") {
    if (facts.requestedVaultScopes.some((scope) => scope !== "secure")) blockers.push("VAULT_SCOPE_UNIMPLEMENTED");
    for (const entry of nodes.filter((item) => item.kind === "vaultEntryDecl")) {
      const allows = values(entry, "allow:");
      const audits = values(entry, "audit:");
      if (audits.length !== 1 || !["audit:required", "audit:optional"].includes(audits[0])) blockers.push("VAULT_AUDIT_POLICY_MISSING");
      if (allows.length < 1 || allows.some((allow) => {
        const parts = allow.split(":");
        return parts.length !== 3 || parts[1].length === 0 || !["read", "write"].includes(parts[2]);
      })) blockers.push("VAULT_PERMISSION_INVALID");
      if (values(entry, "readonly:").includes("readonly:true") && allows.some((allow) => allow.endsWith(":write"))) blockers.push("VAULT_READONLY_WRITE_LEAK");
    }
  }
  if (id === "hallmark") {
    for (const item of nodes.filter((node) => node.kind === "hallmarkDecl")) {
      if (!(item.children ?? []).some((child) => child?.kind === "typeRef")) blockers.push("HALLMARK_CARRIER_MISSING");
      if (values(item, "gate:").length !== 1) blockers.push("HALLMARK_ASSAY_GATE_MISSING");
    }
  }
  return uniqueSorted(blockers);
}

function shouldInclude(id, command, entries, facts) {
  if (command !== "scan") return id === command;
  if (id === "contract" && entries.some((entry) => FLOW_KINDS.has(entry.node.kind))) return true;
  if (id === "global") return facts.requestedVaultScopes.some((scope) => scope === "global" || scope === "session");
  const registry = CONSTRUCT_REGISTRY.find((item) => item.id === id);
  return entries.some((entry) => registry.astKinds.includes(entry.node.kind));
}

function constructRecord(registry, command, entries, facts, diagnostics) {
  const relevant = entries.filter((entry) => registry.astKinds.includes(entry.node.kind) || (registry.id === "contract" && FLOW_KINDS.has(entry.node.kind)));
  const direct = entries.filter((entry) => registry.astKinds.includes(entry.node.kind));
  const present = direct.length > 0 || (registry.id === "contract" && entries.some((entry) => FLOW_KINDS.has(entry.node.kind))) || (registry.id === "global" && facts.requestedVaultScopes.some((scope) => scope === "global" || scope === "session"));
  const blockers = constructBlockers(registry.id, relevant, facts, diagnostics);
  const status = blockers.length > 0 ? "BLOCKED" : present ? "SUPPORTED" : "MANUAL_REVIEW";
  const effects = uniqueSorted(facts.effectResults.flatMap((item) => [...(item.declaredEffects ?? []), ...(item.observedEffects ?? [])]));
  const count = registry.id === "flow" || registry.id === "contract"
    ? direct.length
    : direct.filter((entry) => entry.node.kind === registry.astKinds[0]).length;
  return Object.freeze({
    id: registry.id,
    status,
    astKinds: Object.freeze([...registry.astKinds]),
    count,
    effects,
    obligations: Object.freeze([...registry.obligations]),
    blockerCodes: blockers,
    requested: command === registry.id,
  });
}

function aggregate(constructs) {
  if (constructs.length === 0) return "MANUAL_REVIEW";
  return constructs.reduce((current, item) => STATUS_RANK[item.status] > STATUS_RANK[current] ? item.status : current, "SUPPORTED");
}

export function buildAnalysisRun({ command, identity, facts }) {
  if (!ANALYSIS_COMMANDS.includes(command)) fail("ANALYSIS_COMMAND_INVALID", "unknown construct-analysis command");
  const admittedIdentity = validateAnalysisIdentity(identity);
  record(facts, "analysis facts");
  if (!Array.isArray(facts.flows) || !Array.isArray(facts.effectResults) || !Array.isArray(facts.governanceObligations) || !Array.isArray(facts.requestedVaultScopes)) {
    fail("ANALYSIS_FACTS_INVALID", "analysis facts contain malformed arrays");
  }
  const entries = [];
  walk(facts.ast, undefined, entries);
  const diagnostics = allDiagnosticCodes(facts.diagnostics);
  const constructs = CONSTRUCT_REGISTRY
    .filter((registry) => shouldInclude(registry.id, command, entries, facts))
    .map((registry) => constructRecord(registry, command, entries, facts, diagnostics));
  const cacheKey = sha256(Buffer.from(canonicalAnalysisJson(admittedIdentity), "utf8"));
  return Object.freeze({
    schema: LOGIC_ANALYSIS_SCHEMA,
    toolVersion: LOGIC_ANALYSIS_TOOL_VERSION,
    command,
    status: aggregate(constructs),
    ...admittedIdentity,
    cacheKey,
    constructs: Object.freeze(constructs),
    diagnostics: Object.freeze({ codes: diagnostics }),
    governanceObligations: uniqueSorted(facts.governanceObligations),
    actions: Object.freeze({ candidateCompiled: false, physicalProofRun: false, consumerSwitched: false, typescriptRetired: false, productionAuthorityReleased: false }),
  });
}

export function cacheMatchesIdentity(value, identity) {
  try {
    const admitted = validateAnalysisIdentity(identity);
    if (value?.schema !== LOGIC_ANALYSIS_SCHEMA || value?.toolVersion !== LOGIC_ANALYSIS_TOOL_VERSION || !LOGIC_ANALYSIS_STATUSES.includes(value?.status)) return false;
    return value.cacheKey === sha256(Buffer.from(canonicalAnalysisJson(admitted), "utf8"));
  } catch {
    return false;
  }
}

export function runLogicAnalysisSelfTest() {
  const identity = { sourceSha256: `sha256:${"1".repeat(64)}`, compilerSha256: `sha256:${"2".repeat(64)}`, profileSha256: `sha256:${"3".repeat(64)}`, graphBuildPoint: "4".repeat(40) };
  const contract = { kind: "contractDecl", children: [{ kind: "intentDecl", value: "control", children: [] }] };
  const greenFacts = { ast: { kind: "module", children: [{ kind: "pureFlowDecl", value: "control", children: [contract, { kind: "ifStmt", children: [{ kind: "identifier" }, { kind: "block" }] }] }] }, flows: [], effectResults: [], governanceObligations: [], diagnostics: { parse: [], type: [], effect: [], governance: [] }, requestedVaultScopes: [] };
  const redFacts = structuredClone(greenFacts);
  redFacts.ast.children[0].children[1].children[0] = { kind: "callExpr", children: [] };
  const green = buildAnalysisRun({ command: "if", identity, facts: greenFacts });
  const red = buildAnalysisRun({ command: "if", identity, facts: redFacts });
  return Object.freeze({ green: green.status, red: red.status, passed: green.status === "SUPPORTED" && red.status === "BLOCKED" });
}

export { CONSTRUCT_IDS } from "./contracts.mjs";
