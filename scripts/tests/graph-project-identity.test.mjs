import assert from "node:assert/strict";
import test from "node:test";

import {
  GRAPH_PROJECT_ALIASES,
  GraphIdentityError,
  resolveGraphIdentity,
} from "../lib/graph-project-identity/index.mjs";

const head = "a".repeat(40);

function observation(logicalKey, overrides = {}) {
  const alias = GRAPH_PROJECT_ALIASES[logicalKey];
  return {
    project: alias.project,
    rootPath: `C:/repos/${alias.repository}`,
    status: "ready",
    stale: false,
    indexedHeadSha: head,
    gitHeadSha: head,
    symbols: [{
      name: alias.probe.name,
      qualifiedName: `${alias.project}.${alias.probe.name}`,
      filePath: alias.probe.filePath,
      label: "Function",
    }],
    ...overrides,
  };
}

test("all declared logical aliases resolve to bounded body-free envelopes", () => {
  for (const logicalKey of ["galerina", "slide", "vok", "lyth"]) {
    const alias = GRAPH_PROJECT_ALIASES[logicalKey];
    const envelope = resolveGraphIdentity({
      logicalKey,
      expectedRoot: `C:/repos/${alias.repository}`,
      requiredHead: head,
      observations: [observation(logicalKey)],
    });
    assert.equal(envelope.logicalKey, logicalKey);
    assert.equal(envelope.project, alias.project);
    assert.equal(envelope.repository, alias.repository);
    assert.equal(envelope.root, ".");
    assert.equal(envelope.indexedHeadSha, head);
    assert.equal(envelope.probe.name, alias.probe.name);
    assert.equal(JSON.stringify(envelope).includes("C:/repos"), false);
  }
});

test("wrong logical-key case, wrong root, stale head and unavailable owners refuse", () => {
  const cases = [
    [{ logicalKey: "Galerina", expectedRoot: "C:/repos/Galerina", requiredHead: head, observations: [observation("galerina")] }, "LOGICAL_KEY_INVALID"],
    [{ logicalKey: "galerina", expectedRoot: "C:/repos/Galerina", requiredHead: head, observations: [observation("galerina", { rootPath: "C:/repos/galerina" })] }, "ROOT_MISMATCH"],
    [{ logicalKey: "galerina", expectedRoot: "C:/repos/Galerina", requiredHead: head, observations: [observation("galerina", { indexedHeadSha: "b".repeat(40), stale: true })] }, "GRAPH_STALE"],
    [{ logicalKey: "galerina", expectedRoot: "C:/repos/Galerina", requiredHead: head, observations: [] }, "OWNER_UNAVAILABLE"],
  ];
  for (const [input, code] of cases) {
    assert.throws(
      () => resolveGraphIdentity(input),
      (error) => error instanceof GraphIdentityError && error.code === code,
      code,
    );
  }
});

test("ambiguous owners and missing or ambiguous bounded symbols refuse", () => {
  const exact = observation("galerina");
  for (const [observations, code] of [
    [[exact, { ...exact }], "OWNER_AMBIGUOUS"],
    [[{ ...exact, symbols: [] }], "PROBE_MISSING"],
    [[{ ...exact, symbols: [exact.symbols[0], { ...exact.symbols[0], qualifiedName: "Galerina.other.parseProgram" }] }], "PROBE_AMBIGUOUS"],
  ]) {
    assert.throws(
      () => resolveGraphIdentity({ logicalKey: "galerina", expectedRoot: "C:/repos/Galerina", requiredHead: head, observations }),
      (error) => error instanceof GraphIdentityError && error.code === code,
      code,
    );
  }
});

test("an explicit worktree project override remains exact-root and exact-head checked", () => {
  const project = "Galerina-detached-scalar-phase1-20260818";
  const exact = observation("galerina", { project });
  const envelope = resolveGraphIdentity({
    logicalKey: "galerina",
    expectedRoot: "C:/repos/Galerina",
    requiredHead: head,
    projectOverride: project,
    observations: [exact],
  });
  assert.equal(envelope.project, project);
  assert.equal(envelope.declaredProject, "Galerina");

  assert.throws(
    () => resolveGraphIdentity({
      logicalKey: "galerina",
      expectedRoot: "C:/repos/Galerina",
      requiredHead: head,
      projectOverride: project,
      observations: [{ ...exact, rootPath: "C:/repos/Other" }],
    }),
    (error) => error instanceof GraphIdentityError && error.code === "ROOT_MISMATCH",
  );
});

test("a path-shaped project guess is not accepted as a declared graph identity", () => {
  const pathShapedProject = "C-Users-phill-Documents-GitHub-Galerina-detached-scalar-phase1";
  assert.throws(
    () => resolveGraphIdentity({
      logicalKey: "galerina",
      expectedRoot: "C:/repos/Galerina",
      requiredHead: head,
      projectOverride: pathShapedProject,
      observations: [observation("galerina")],
    }),
    (error) => error instanceof GraphIdentityError && error.code === "OWNER_UNAVAILABLE",
  );
});

test("malformed path-bearing probe results refuse", () => {
  const exact = observation("galerina");
  assert.throws(
    () => resolveGraphIdentity({
      logicalKey: "galerina",
      expectedRoot: "C:/repos/Galerina",
      requiredHead: head,
      observations: [{ ...exact, symbols: [{ ...exact.symbols[0], filePath: "C:/leak/parser.ts" }] }],
    }),
    (error) => error instanceof GraphIdentityError && error.code === "PROBE_PATH_INVALID",
  );
});
