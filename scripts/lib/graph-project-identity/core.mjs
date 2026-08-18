import { isAbsolute, posix } from "node:path";

import {
  GRAPH_IDENTITY_SCHEMA,
  GRAPH_IDENTITY_TOOL_VERSION,
  GRAPH_PROJECT_ALIASES,
  GraphIdentityError,
} from "./contracts.mjs";

function refuse(code, message) {
  throw new GraphIdentityError(code, message);
}

function exactCommit(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/u.test(value)) refuse("COMMIT_INVALID", `${label} is not an exact Git commit`);
  return value;
}

function comparableRoot(value) {
  if (typeof value !== "string" || value.length === 0) refuse("ROOT_INVALID", "repository root is missing");
  return value.replaceAll("\\", "/").replace(/\/$/u, "");
}

function relativePath(value) {
  if (typeof value !== "string"
    || value.length === 0
    || value.includes("\\")
    || isAbsolute(value)
    || /^[A-Za-z]:\//u.test(value)
    || posix.normalize(value) !== value
    || value.startsWith("../")) refuse("PROBE_PATH_INVALID", "bounded graph probe path is not repository-relative");
  return value;
}

function observationRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) refuse("OWNER_OBSERVATION_INVALID", "graph owner observation is malformed");
  if (typeof value.project !== "string" || value.project.length === 0) refuse("OWNER_OBSERVATION_INVALID", "graph owner project is missing");
  if (!Array.isArray(value.symbols)) refuse("OWNER_OBSERVATION_INVALID", "graph owner symbols are missing");
  return value;
}

export function resolveGraphIdentity({ logicalKey, expectedRoot, requiredHead, observations, projectOverride }) {
  if (typeof logicalKey !== "string" || !Object.hasOwn(GRAPH_PROJECT_ALIASES, logicalKey)) {
    refuse("LOGICAL_KEY_INVALID", "logical graph key must be one exact declared lowercase alias");
  }
  const alias = GRAPH_PROJECT_ALIASES[logicalKey];
  const selectedProject = projectOverride ?? alias.project;
  if (typeof selectedProject !== "string" || selectedProject.length === 0 || /[\r\n\0]/u.test(selectedProject)) {
    refuse("PROJECT_OVERRIDE_INVALID", "graph project override is malformed");
  }
  const head = exactCommit(requiredHead, "required build point");
  const root = comparableRoot(expectedRoot);
  if (!Array.isArray(observations)) refuse("OWNER_OBSERVATION_INVALID", "graph observations must be an array");
  const matches = observations.map(observationRecord).filter((item) => item.project === selectedProject);
  if (matches.length === 0) refuse("OWNER_UNAVAILABLE", `declared graph owner ${selectedProject} is unavailable`);
  if (matches.length !== 1) refuse("OWNER_AMBIGUOUS", `declared graph owner ${selectedProject} resolved ${matches.length} times`);
  const observation = matches[0];
  if (comparableRoot(observation.rootPath) !== root) refuse("ROOT_MISMATCH", "graph owner root does not match the exact repository root");
  if (observation.status !== "ready") refuse("OWNER_UNAVAILABLE", "graph owner is not ready");
  if (observation.stale !== false
    || observation.indexedHeadSha !== head
    || observation.gitHeadSha !== head) refuse("GRAPH_STALE", "graph build point is not the exact required Git head");
  exactCommit(observation.indexedHeadSha, "indexed build point");
  exactCommit(observation.gitHeadSha, "graph Git head");

  for (const symbol of observation.symbols) {
    if (symbol === null || typeof symbol !== "object" || Array.isArray(symbol)) {
      refuse("PROBE_INVALID", "bounded graph symbol probe is malformed");
    }
    relativePath(symbol.filePath);
  }
  const probes = observation.symbols.filter((item) => item.name === alias.probe.name && item.filePath === alias.probe.filePath);
  if (probes.length === 0) refuse("PROBE_MISSING", "bounded graph symbol probe is missing");
  if (probes.length !== 1) refuse("PROBE_AMBIGUOUS", `bounded graph symbol probe resolved ${probes.length} times`);
  const probe = probes[0];
  if (typeof probe.qualifiedName !== "string" || probe.qualifiedName.length === 0 || typeof probe.label !== "string" || probe.label.length === 0) {
    refuse("PROBE_INVALID", "bounded graph symbol probe is malformed");
  }

  return Object.freeze({
    schema: GRAPH_IDENTITY_SCHEMA,
    toolVersion: GRAPH_IDENTITY_TOOL_VERSION,
    logicalKey,
    declaredProject: alias.project,
    project: selectedProject,
    repository: alias.repository,
    componentScope: alias.componentScope,
    root: ".",
    requiredHead: head,
    indexedHeadSha: observation.indexedHeadSha,
    stale: false,
    probe: Object.freeze({
      name: probe.name,
      qualifiedName: probe.qualifiedName,
      filePath: probe.filePath,
      label: probe.label,
    }),
  });
}
