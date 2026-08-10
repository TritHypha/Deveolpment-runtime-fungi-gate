import { types as utilTypes } from "node:util";

const ROOT_KEYS = Object.freeze([
  "detectors",
  "executableFamily",
  "legacyUnmapped",
  "packages",
  "repositoryHead",
  "requirements",
  "routes",
  "schemaVersion",
  "systemContracts",
  "tests",
]);
const REQUIREMENT_KEYS = Object.freeze(["criticality", "evidencePath", "id"]);
const SYSTEM_CONTRACT_KEYS = Object.freeze(["evidencePath", "id"]);
const ROUTE_KEYS = Object.freeze([
  "flowName",
  "id",
  "line",
  "method",
  "parserProvenance",
  "path",
  "sourcePath",
]);
const PACKAGE_KEYS = Object.freeze([
  "declaredFanIn",
  "declaredFanOut",
  "derivedFanIn",
  "derivedFanOut",
  "id",
  "sourcePath",
]);
const TEST_KEYS = Object.freeze([
  "class",
  "id",
  "polarity",
  "requirementIds",
  "sourcePath",
  "systemContract",
]);
const DETECTOR_KEYS = Object.freeze(["id", "plantedDefectId", "ruleId", "testId"]);
const EXECUTABLE_KEYS = Object.freeze([
  "cjs",
  "cts",
  "declarationTs",
  "js",
  "mjs",
  "mts",
  "total",
  "ts",
]);
const EXECUTABLE_ARRAY_KEYS = Object.freeze([
  "ts",
  "declarationTs",
  "mts",
  "cts",
  "mjs",
  "js",
  "cjs",
]);
const LEGACY_KEYS = Object.freeze(["baselineCount", "currentCount", "pathsDigest"]);
const REQUIREMENT_CRITICALITIES = new Set(["release", "system"]);
const TEST_CLASSES = new Set([
  "unit",
  "contract",
  "negative-refusal",
  "detector-self-test",
  "mutation",
  "integration",
  "platform",
  "durability-recovery",
  "differential-oracle",
  "system-contract",
]);
const POLARITIES = new Set(["positive", "refusal", "neutral"]);
const DETECTOR_CLASSES = new Set(["detector-self-test", "mutation"]);
const GIT_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/u;
const ID_PATTERN = /^[a-z0-9][a-z0-9._:/-]{0,191}$/u;
const SIMPLE_ID_PATTERN = /^[A-Za-z_][A-Za-z0-9._-]{0,127}$/u;
const DRIVE_RELATIVE_PATTERN = /^[A-Za-z]:/u;
const reportBrand = new WeakSet();

class SemanticGraphRefusal extends Error {
  constructor(code, detail) {
    super(detail);
    this.code = code;
  }
}

function refuse(code, detail) {
  throw new SemanticGraphRefusal(code, detail);
}

function recordDescriptors(value, label) {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || utilTypes.isProxy(value)
    || Object.getPrototypeOf(value) !== Object.prototype
  ) {
    refuse("ASSURANCE-SEMANTIC-SHAPE", `${label} must be an exact ordinary object`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).some((key) => typeof key !== "string")) {
    refuse("ASSURANCE-SEMANTIC-SHAPE", `${label} cannot contain symbol fields`);
  }
  return descriptors;
}

function exactRecord(value, expectedKeys, label) {
  const descriptors = recordDescriptors(value, label);
  const actual = Object.keys(descriptors).sort();
  const expected = [...expectedKeys].sort();
  if (
    actual.length !== expected.length
    || actual.some((key, index) => key !== expected[index])
  ) {
    refuse("ASSURANCE-SEMANTIC-SHAPE", `${label} has an unexpected or missing field`);
  }
  const result = {};
  for (const key of expected) {
    const descriptor = descriptors[key];
    if (
      !descriptor
      || descriptor.enumerable !== true
      || !("value" in descriptor)
      || descriptor.get !== undefined
      || descriptor.set !== undefined
    ) {
      refuse("ASSURANCE-SEMANTIC-SHAPE", `${label}.${key} must be an ordinary enumerable data field`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function exactArray(value, label, minimum = 0) {
  if (
    !Array.isArray(value)
    || utilTypes.isProxy(value)
    || Object.getPrototypeOf(value) !== Array.prototype
  ) {
    refuse("ASSURANCE-SEMANTIC-SHAPE", `${label} must be an ordinary array`);
  }
  if (value.length < minimum || value.length > 100_000) {
    refuse("ASSURANCE-SEMANTIC-SHAPE", `${label} has an invalid bounded length`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string") || ownKeys.length !== value.length + 1) {
    refuse("ASSURANCE-SEMANTIC-SHAPE", `${label} cannot contain holes or surplus fields`);
  }
  const result = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (
      !descriptor
      || descriptor.enumerable !== true
      || !("value" in descriptor)
      || descriptor.get !== undefined
      || descriptor.set !== undefined
    ) {
      refuse("ASSURANCE-SEMANTIC-SHAPE", `${label}[${index}] must be an ordinary data field`);
    }
    result.push(descriptor.value);
  }
  return result;
}

function nonEmptyString(value, label, maximum = 512) {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum) {
    refuse("ASSURANCE-SEMANTIC-VALUE", `${label} must be a bounded non-empty string`);
  }
  return value;
}

function identifier(value, label) {
  const id = nonEmptyString(value, label, 192);
  if (!ID_PATTERN.test(id)) {
    refuse("ASSURANCE-SEMANTIC-VALUE", `${label} is not a canonical identifier`);
  }
  return id;
}

function simpleIdentifier(value, label) {
  const id = nonEmptyString(value, label, 128);
  if (!SIMPLE_ID_PATTERN.test(id)) {
    refuse("ASSURANCE-SEMANTIC-VALUE", `${label} is not a canonical language identifier`);
  }
  return id;
}

function enumValue(value, admitted, label) {
  if (!admitted.has(value)) {
    refuse("ASSURANCE-SEMANTIC-VALUE", `${label} is outside the closed vocabulary`);
  }
  return value;
}

function count(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    refuse("ASSURANCE-SEMANTIC-COUNT", `${label} must be a finite non-negative safe integer`);
  }
  return value;
}

function gitIdentity(value, label) {
  if (typeof value !== "string" || !GIT_PATTERN.test(value)) {
    refuse("ASSURANCE-SEMANTIC-GIT", `${label} must be an exact lowercase Git identity`);
  }
  return value;
}

function digest(value, label) {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value)) {
    refuse("ASSURANCE-SEMANTIC-DIGEST", `${label} must be an exact lowercase SHA-256 digest`);
  }
  return value;
}

function canonicalPath(value, label) {
  const path = nonEmptyString(value, label, 1024);
  const segments = path.split("/");
  if (
    path.startsWith("/")
    || DRIVE_RELATIVE_PATTERN.test(path)
    || path.includes("\\")
    || path !== path.normalize("NFC")
    || /[\u0000-\u001f\u007f:*?"<>|]/u.test(path)
    || segments.some((segment) => (
      segment.length === 0
      || segment === "."
      || segment === ".."
      || /[ .]$/u.test(segment)
    ))
  ) {
    refuse("ASSURANCE-SEMANTIC-PATH", `${label} must be a canonical repository-relative path`);
  }
  return path;
}

function routePath(value, label) {
  const path = nonEmptyString(value, label, 2048);
  if (
    !path.startsWith("/")
    || path.includes("\\")
    || path.includes("?")
    || path.includes("#")
    || /[\u0000-\u001f\u007f]/u.test(path)
    || path !== path.normalize("NFC")
  ) {
    refuse("ASSURANCE-SEMANTIC-ROUTE", `${label} is not a canonical route path`);
  }
  return path;
}

function cloneRequirement(value, index) {
  const label = `requirements[${index}]`;
  const fields = exactRecord(value, REQUIREMENT_KEYS, label);
  return {
    id: identifier(fields.id, `${label}.id`),
    criticality: enumValue(fields.criticality, REQUIREMENT_CRITICALITIES, `${label}.criticality`),
    evidencePath: canonicalPath(fields.evidencePath, `${label}.evidencePath`),
  };
}

function cloneSystemContractNode(value, index) {
  const label = `systemContracts[${index}]`;
  const fields = exactRecord(value, SYSTEM_CONTRACT_KEYS, label);
  const id = identifier(fields.id, `${label}.id`);
  if (!id.startsWith("system-contract:")) {
    refuse("ASSURANCE-SEMANTIC-VALUE", `${label}.id must use the system-contract namespace`);
  }
  return {
    id,
    evidencePath: canonicalPath(fields.evidencePath, `${label}.evidencePath`),
  };
}

function cloneRoute(value, index) {
  const label = `routes[${index}]`;
  const fields = exactRecord(value, ROUTE_KEYS, label);
  const sourcePath = canonicalPath(fields.sourcePath, `${label}.sourcePath`);
  if (
    !/^packages-galerina\/[^/]+\/src\/.+\.fungi$/u.test(sourcePath)
    || fields.parserProvenance !== "canonical-fungi-ast"
    || !Number.isSafeInteger(fields.line)
    || fields.line < 1
    || typeof fields.method !== "string"
    || !/^[A-Z]+$/u.test(fields.method)
  ) {
    refuse("ASSURANCE-SEMANTIC-ROUTE", `${label} lacks canonical parser provenance`);
  }
  return {
    id: identifier(fields.id, `${label}.id`),
    sourcePath,
    line: fields.line,
    method: fields.method,
    path: routePath(fields.path, `${label}.path`),
    flowName: simpleIdentifier(fields.flowName, `${label}.flowName`),
    parserProvenance: "canonical-fungi-ast",
  };
}

function clonePackage(value, index) {
  const label = `packages[${index}]`;
  const fields = exactRecord(value, PACKAGE_KEYS, label);
  const result = {
    id: identifier(fields.id, `${label}.id`),
    sourcePath: canonicalPath(fields.sourcePath, `${label}.sourcePath`),
    declaredFanIn: count(fields.declaredFanIn, `${label}.declaredFanIn`),
    declaredFanOut: count(fields.declaredFanOut, `${label}.declaredFanOut`),
    derivedFanIn: count(fields.derivedFanIn, `${label}.derivedFanIn`),
    derivedFanOut: count(fields.derivedFanOut, `${label}.derivedFanOut`),
  };
  if (
    result.declaredFanIn !== result.derivedFanIn
    || result.declaredFanOut !== result.derivedFanOut
  ) {
    refuse("ASSURANCE-SEMANTIC-PACKAGE", `${label} fan-in/fan-out does not conserve`);
  }
  return result;
}

function cloneSystemContract(value, label) {
  const descriptors = recordDescriptors(value, label);
  const kindDescriptor = descriptors.kind;
  if (
    !kindDescriptor
    || !("value" in kindDescriptor)
    || kindDescriptor.get !== undefined
    || kindDescriptor.set !== undefined
  ) {
    refuse("ASSURANCE-SEMANTIC-SHAPE", `${label}.kind must be an ordinary data field`);
  }
  if (kindDescriptor.value === "absent") {
    const fields = exactRecord(value, ["kind", "reason"], label);
    return Object.freeze({
      kind: "absent",
      reason: nonEmptyString(fields.reason, `${label}.reason`),
    });
  }
  if (kindDescriptor.value === "present") {
    const fields = exactRecord(value, ["id", "kind"], label);
    return Object.freeze({
      kind: "present",
      id: identifier(fields.id, `${label}.id`),
    });
  }
  refuse("ASSURANCE-SEMANTIC-VALUE", `${label}.kind is outside the closed vocabulary`);
}

function cloneTest(value, index) {
  const label = `tests[${index}]`;
  const fields = exactRecord(value, TEST_KEYS, label);
  const requirementIds = exactArray(fields.requirementIds, `${label}.requirementIds`)
    .map((item, requirementIndex) => identifier(item, `${label}.requirementIds[${requirementIndex}]`));
  if (new Set(requirementIds).size !== requirementIds.length) {
    refuse("ASSURANCE-SEMANTIC-DUPLICATE", `${label} contains duplicate requirement identities`);
  }
  const admittedSystemContract = cloneSystemContract(fields.systemContract, `${label}.systemContract`);
  if (
    (requirementIds.length === 0 && admittedSystemContract.kind !== "present")
    || (requirementIds.length > 0 && admittedSystemContract.kind !== "absent")
  ) {
    refuse("ASSURANCE-SEMANTIC-TEST", `${label} must map to requirements or one system contract, never neither or both`);
  }
  const testClass = enumValue(fields.class, TEST_CLASSES, `${label}.class`);
  if (admittedSystemContract.kind === "present" && testClass !== "system-contract") {
    refuse("ASSURANCE-SEMANTIC-TEST", `${label} system-contract mapping requires system-contract class`);
  }
  return {
    id: identifier(fields.id, `${label}.id`),
    sourcePath: canonicalPath(fields.sourcePath, `${label}.sourcePath`),
    class: testClass,
    polarity: enumValue(fields.polarity, POLARITIES, `${label}.polarity`),
    requirementIds,
    systemContract: admittedSystemContract,
  };
}

function cloneDetector(value, index) {
  const label = `detectors[${index}]`;
  const fields = exactRecord(value, DETECTOR_KEYS, label);
  return {
    id: identifier(fields.id, `${label}.id`),
    ruleId: identifier(fields.ruleId, `${label}.ruleId`),
    plantedDefectId: identifier(fields.plantedDefectId, `${label}.plantedDefectId`),
    testId: identifier(fields.testId, `${label}.testId`),
  };
}

function cloneExecutableFamily(value) {
  const fields = exactRecord(value, EXECUTABLE_KEYS, "executableFamily");
  const result = {};
  const allPaths = [];
  for (const key of EXECUTABLE_ARRAY_KEYS) {
    const suffix = key === "declarationTs" ? ".d.ts" : `.${key}`;
    result[key] = exactArray(fields[key], `executableFamily.${key}`)
      .map((item, index) => canonicalPath(item, `executableFamily.${key}[${index}]`));
    if (result[key].some((path) => !path.endsWith(suffix))) {
      refuse("ASSURANCE-SEMANTIC-VALUE", `executableFamily.${key} contains a wrong-extension path`);
    }
    allPaths.push(...result[key]);
  }
  if (new Set(allPaths).size !== allPaths.length) {
    refuse("ASSURANCE-SEMANTIC-DUPLICATE", "executableFamily contains a path in more than one class");
  }
  const total = count(fields.total, "executableFamily.total");
  if (total !== allPaths.length) {
    refuse("ASSURANCE-SEMANTIC-COUNT", "executableFamily.total does not conserve its seven classes");
  }
  return { ...result, total };
}

function cloneLegacyUnmapped(value) {
  const fields = exactRecord(value, LEGACY_KEYS, "legacyUnmapped");
  const result = {
    baselineCount: count(fields.baselineCount, "legacyUnmapped.baselineCount"),
    currentCount: count(fields.currentCount, "legacyUnmapped.currentCount"),
    pathsDigest: digest(fields.pathsDigest, "legacyUnmapped.pathsDigest"),
  };
  if (result.currentCount > result.baselineCount) {
    refuse("ASSURANCE-SEMANTIC-BASELINE", "legacy unmapped test baseline cannot grow");
  }
  return result;
}

function uniqueById(items, label) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.id)) {
      refuse("ASSURANCE-SEMANTIC-DUPLICATE", `${label} contains duplicate id ${item.id}`);
    }
    seen.add(item.id);
  }
  return seen;
}

function deepFreeze(value) {
  if (Array.isArray(value)) {
    for (const item of value) deepFreeze(item);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return Object.freeze(value);
}

function validateSemanticGraph(value) {
  const fields = exactRecord(value, ROOT_KEYS, "graph");
  if (fields.schemaVersion !== 1) {
    refuse("ASSURANCE-SEMANTIC-VERSION", "graph.schemaVersion must equal 1");
  }
  const repositoryHead = gitIdentity(fields.repositoryHead, "graph.repositoryHead");
  const requirements = exactArray(fields.requirements, "graph.requirements", 1)
    .map(cloneRequirement);
  const systemContracts = exactArray(fields.systemContracts, "graph.systemContracts", 1)
    .map(cloneSystemContractNode);
  const routes = exactArray(fields.routes, "graph.routes").map(cloneRoute);
  const packages = exactArray(fields.packages, "graph.packages", 1).map(clonePackage);
  const tests = exactArray(fields.tests, "graph.tests", 1).map(cloneTest);
  const detectors = exactArray(fields.detectors, "graph.detectors").map(cloneDetector);
  const executableFamily = cloneExecutableFamily(fields.executableFamily);
  const legacyUnmapped = cloneLegacyUnmapped(fields.legacyUnmapped);

  const requirementIds = uniqueById(requirements, "requirements");
  const systemContractIds = uniqueById(systemContracts, "systemContracts");
  uniqueById(routes, "routes");
  const packageIds = uniqueById(packages, "packages");
  const testIds = uniqueById(tests, "tests");
  uniqueById(detectors, "detectors");

  for (const item of tests) {
    for (const requirementId of item.requirementIds) {
      if (!requirementIds.has(requirementId)) {
        refuse("ASSURANCE-SEMANTIC-ENDPOINT", `test ${item.id} names unknown requirement ${requirementId}`);
      }
    }
    if (
      item.systemContract.kind === "present"
      && !packageIds.has(item.systemContract.id)
      && !systemContractIds.has(item.systemContract.id)
    ) {
      refuse("ASSURANCE-SEMANTIC-ENDPOINT", `test ${item.id} names unknown system contract ${item.systemContract.id}`);
    }
  }

  for (const item of requirements) {
    if (item.criticality !== "release") continue;
    const evidence = tests.filter((test) => test.requirementIds.includes(item.id));
    if (
      !evidence.some((test) => test.polarity === "positive")
      || !evidence.some((test) => test.polarity === "refusal")
    ) {
      refuse("ASSURANCE-SEMANTIC-REQUIREMENT", `release requirement ${item.id} lacks positive or refusal evidence`);
    }
  }

  for (const item of detectors) {
    const test = tests.find((candidate) => candidate.id === item.testId);
    if (!test) {
      refuse("ASSURANCE-SEMANTIC-ENDPOINT", `detector ${item.id} names unknown test ${item.testId}`);
    }
    if (!DETECTOR_CLASSES.has(test.class)) {
      refuse("ASSURANCE-SEMANTIC-DETECTOR", `detector ${item.id} is not mapped to a detector-self-test or mutation`);
    }
  }
  return {
    repositoryHead,
    requirements,
    systemContracts,
    routes,
    packages,
    tests,
    detectors,
    executableFamily,
    legacyUnmapped,
  };
}

export function evaluateSemanticGraph(value) {
  try {
    const graph = validateSemanticGraph(value);
    const nodes = [
      ...graph.requirements.map((item) => ({
        id: `requirement:${item.id}`,
        kind: "requirement",
        evidencePath: item.evidencePath,
      })),
      ...graph.systemContracts.map((item) => ({
        id: item.id,
        kind: "system-contract",
        evidencePath: item.evidencePath,
      })),
      ...graph.routes.map((item) => ({
        id: item.id,
        kind: "route",
        evidencePath: item.sourcePath,
        line: item.line,
      })),
      ...graph.packages.map((item) => ({
        id: item.id,
        kind: "package",
        evidencePath: item.sourcePath,
      })),
      ...graph.tests.map((item) => ({
        id: `test:${item.id}`,
        kind: "test",
        evidencePath: item.sourcePath,
      })),
      ...graph.detectors.map((item) => ({
        id: item.id,
        kind: "detector",
        evidencePath: graph.tests.find((test) => test.id === item.testId).sourcePath,
      })),
      {
        id: "executable-family:packages",
        kind: "executable-family",
        evidencePath: "build/ts-retirement/ts-retirement.json",
      },
    ];
    const edges = [
      ...graph.tests.flatMap((item) => item.requirementIds.map((requirementId) => ({
        from: `test:${item.id}`,
        to: `requirement:${requirementId}`,
        type: "TESTS",
      }))),
      ...graph.tests
        .filter((item) => item.systemContract.kind === "present")
        .map((item) => ({
          from: `test:${item.id}`,
          to: item.systemContract.id,
          type: "CLASSIFIES",
        })),
      ...graph.detectors.map((item) => ({
        from: item.id,
        to: `test:${item.testId}`,
        type: "PROVES_LIVENESS",
      })),
    ];
    const report = deepFreeze({
      schemaVersion: 1,
      repositoryHead: graph.repositoryHead,
      nodes,
      edges,
      totals: {
        requirements: graph.requirements.length,
        systemContracts: graph.systemContracts.length,
        routes: graph.routes.length,
        packages: graph.packages.length,
        tests: graph.tests.length,
        detectors: graph.detectors.length,
        executableFamily: graph.executableFamily.total,
        legacyUnmapped: graph.legacyUnmapped.currentCount,
      },
      verdictTrit: graph.legacyUnmapped.currentCount === 0 ? 1 : 0,
      authorizing: false,
    });
    reportBrand.add(report);
    return Object.freeze({ kind: "accepted", value: report });
  } catch (error) {
    if (error instanceof SemanticGraphRefusal) {
      return Object.freeze({ kind: "refused", code: error.code, detail: error.message });
    }
    return Object.freeze({
      kind: "refused",
      code: "ASSURANCE-SEMANTIC-INVALID",
      detail: "semantic graph validation refused an unclassified input",
    });
  }
}

export function isSemanticGraphReport(value) {
  return value !== null && typeof value === "object" && reportBrand.has(value);
}
