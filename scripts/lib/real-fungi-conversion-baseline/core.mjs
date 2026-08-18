import { createHash } from "node:crypto";
import { isAbsolute, posix } from "node:path";

import {
  alphaFungiFingerprint,
  exactFungiFingerprint,
} from "../fungi-shadow.mjs";

export const BASELINE_SCHEMA = "galerina.real-fungi-conversion-baseline.v1";
export const BASELINE_TOOL_VERSION = "1.0.0";

const OVERLAY_PREFIX = "packages-galerina/galerina-test/src/self-hosted/conversion-overlays/";
const ORACLE = /^\/\/\/ TypeScript oracle: (packages-galerina\/[A-Za-z0-9._/-]+\.(?:ts|mts|cts))#([A-Za-z_$][A-Za-z0-9_$.]*)$/mu;
const CONVERSION_MARKER = "Non-authorizing sandbox candidate; TypeScript remains the oracle.";

function codeUnitCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sha256(source) {
  return `sha256:${createHash("sha256").update(source, "utf8").digest("hex")}`;
}

function assertCommit(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/u.test(value)) {
    throw new TypeError(`${label} must be an exact lowercase Git commit`);
  }
  return value;
}

function assertRelativePath(value) {
  if (typeof value !== "string"
    || value.length === 0
    || value.includes("\\")
    || isAbsolute(value)
    || /^[A-Za-z]:\//u.test(value)
    || posix.normalize(value) !== value
    || value === ".."
    || value.startsWith("../")) {
    throw new TypeError("Fungi baseline paths must be canonical repository-relative paths");
  }
  return value;
}

function assertFungi(item) {
  if (item === null || typeof item !== "object" || Array.isArray(item)) {
    throw new TypeError("Fungi baseline entries must be records");
  }
  const path = assertRelativePath(item.path);
  if (!path.endsWith(".fungi") || typeof item.source !== "string" || item.source.length === 0) {
    throw new TypeError("Fungi baseline entries require a .fungi path and nonempty source");
  }
  const introducedCommit = assertCommit(item.introducedCommit, "introducing commit");
  return Object.freeze({ path, source: item.source, introducedCommit });
}

function oracleOf(source) {
  if (!source.includes(CONVERSION_MARKER)) return undefined;
  const match = ORACLE.exec(source);
  if (match === null) return Object.freeze({ malformed: true });
  return Object.freeze({ path: match[1], symbol: match[2], identity: `${match[1]}#${match[2]}` });
}

function collisionGroups(items, fingerprint) {
  const groups = new Map();
  for (const item of items) {
    const key = fingerprint(item.source);
    const paths = groups.get(key) ?? [];
    paths.push(item.path);
    groups.set(key, paths);
  }
  return new Map([...groups].filter(([, paths]) => paths.length > 1));
}

function stateFor(sourceStates, oracle) {
  if (oracle === undefined || oracle.malformed === true) return undefined;
  const state = sourceStates.get(oracle.identity);
  if (state === undefined || state === null || typeof state !== "object" || Array.isArray(state)) {
    return Object.freeze({ present: false, symbolPresent: false });
  }
  return state;
}

function baseStatus(oracle, state) {
  if (oracle === undefined) return "NOT_APPLICABLE";
  if (oracle.malformed === true || state?.present !== true || state?.symbolPresent !== true) return "UNBOUND";
  if (typeof state.currentSha256 !== "string"
    || typeof state.introducedSha256 !== "string"
    || state.currentSha256 !== state.introducedSha256) return "STALE";
  return "BOUND";
}

function collisionFor(item, exactGroups, shadowGroups, casePathGroups) {
  const exact = exactGroups.get(exactFungiFingerprint(item.source));
  if (exact !== undefined) return Object.freeze({ kind: "EXACT_DUPLICATE", paths: Object.freeze([...exact].sort(codeUnitCompare)) });
  const shadow = shadowGroups.get(alphaFungiFingerprint(item.source));
  if (shadow !== undefined) return Object.freeze({ kind: "ALPHA_SHADOW", paths: Object.freeze([...shadow].sort(codeUnitCompare)) });
  const casePath = casePathGroups.get(item.path.toLowerCase());
  if (casePath !== undefined) return Object.freeze({ kind: "CASE_PATH_SHADOW", paths: Object.freeze([...casePath].sort(codeUnitCompare)) });
  return undefined;
}

function casePathCollisionGroups(items) {
  const groups = new Map();
  for (const item of items) {
    const key = item.path.toLowerCase();
    const paths = groups.get(key) ?? [];
    paths.push(item.path);
    groups.set(key, paths);
  }
  return new Map([...groups].filter(([, paths]) => paths.length > 1));
}

export function classifyFungiBaseline({ head, fungi, sourceStates }) {
  assertCommit(head, "baseline head");
  if (!Array.isArray(fungi) || !(sourceStates instanceof Map)) {
    throw new TypeError("Fungi baseline requires an entry array and source-state map");
  }
  const admitted = fungi.map(assertFungi);
  const duplicatePaths = new Set();
  for (const item of admitted) {
    if (duplicatePaths.has(item.path)) throw new TypeError(`Fungi baseline contains duplicate path ${item.path}`);
    duplicatePaths.add(item.path);
  }
  const ordered = [...admitted].sort((left, right) => codeUnitCompare(left.path, right.path));
  const excluded = ordered
    .filter((item) => item.path.startsWith(OVERLAY_PREFIX))
    .map((item) => Object.freeze({ path: item.path, introducedCommit: item.introducedCommit, reason: "TEST_OVERLAY_NO_CONVERSION_CREDIT" }));
  const real = ordered.filter((item) => !item.path.startsWith(OVERLAY_PREFIX));
  const exactGroups = collisionGroups(real, exactFungiFingerprint);
  const shadowGroups = collisionGroups(real, alphaFungiFingerprint);
  const casePathGroups = casePathCollisionGroups(real);

  const entries = real.map((item) => {
    const oracle = oracleOf(item.source);
    const role = oracle === undefined ? "NATIVE_FUNGI" : "CONVERSION_CANDIDATE";
    const state = stateFor(sourceStates, oracle);
    const collision = collisionFor(item, exactGroups, shadowGroups, casePathGroups);
    const status = collision === undefined ? baseStatus(oracle, state) : "SHADOWED";
    return Object.freeze({
      path: item.path,
      role,
      status,
      introducedCommit: item.introducedCommit,
      fungiSha256: sha256(item.source),
      ...(oracle === undefined ? {} : oracle.malformed === true
        ? { oracle: Object.freeze({ malformed: true }) }
        : { oracle: Object.freeze({ path: oracle.path, symbol: oracle.symbol }) }),
      ...(state?.present === true ? {
        source: Object.freeze({
          currentSha256: state.currentSha256,
          introducedSha256: state.introducedSha256,
          symbolPresent: state.symbolPresent === true,
        }),
      } : {}),
      ...(collision === undefined ? {} : { collision }),
    });
  });

  const count = (status) => entries.filter((entry) => entry.status === status).length;
  return Object.freeze({
    schema: BASELINE_SCHEMA,
    toolVersion: BASELINE_TOOL_VERSION,
    head,
    counts: Object.freeze({
      totalFungi: ordered.length,
      realPackageFungi: entries.length,
      excludedTestOverlays: excluded.length,
      conversionCandidates: entries.filter((entry) => entry.role === "CONVERSION_CANDIDATE").length,
      nativeFungi: entries.filter((entry) => entry.role === "NATIVE_FUNGI").length,
      BOUND: count("BOUND"),
      UNBOUND: count("UNBOUND"),
      STALE: count("STALE"),
      SHADOWED: count("SHADOWED"),
    }),
    entries: Object.freeze(entries),
    excluded: Object.freeze(excluded),
    fixtureDebt: Object.freeze({
      overlayPrefix: OVERLAY_PREFIX,
      fileCount: excluded.length,
      introducingCommits: Object.freeze([...new Set(excluded.map((entry) => entry.introducedCommit))].sort(codeUnitCompare)),
      conversionCredit: 0,
    }),
    authority: Object.freeze({
      productionAuthorityReleased: false,
      consumerSwitched: false,
      typescriptRetired: false,
      conversionCreditGrantedToTestOverlays: false,
    }),
  });
}
