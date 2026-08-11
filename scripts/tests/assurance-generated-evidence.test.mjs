import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import { inspectGeneratedEvidence } from "../lib/assurance-fabric/generated-evidence.mjs";

const HEAD = "a".repeat(40);
const OTHER_HEAD = "b".repeat(40);
const EXTERNAL_DIGEST = "c".repeat(64);
const EXPECTED_SUBJECT_DIGEST = "52990f9e2de843ab3e90de42e0d7e075395883e626e00de840ff3bd92e37e8a0";
const EXPECTED_TOOL_DIGEST = "560915ea6d2d3063445dc3112935247f09e565a165efbed66256e32d4d103374";

function write(root, relativePath, bytes) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  return path;
}

function provenance(overrides = {}) {
  return {
    tool: "fixture-generator",
    authority: "NONE",
    gitCommit: HEAD,
    builtAt: "2026-08-10T00:00:00.000Z",
    node: "v24.18.0",
    ...overrides,
  };
}

function descriptor(overrides = {}) {
  return {
    id: "fixture-output",
    kind: "generated",
    artifactPaths: ["build/output/report.json"],
    evidencePath: "build/output/report.json",
    provenancePath: "build/output/provenance.json",
    toolPath: "scripts/tool.mjs",
    expectedTool: "fixture-generator",
    externalInputPolicy: "forbidden",
    workingTreeClass: "DECLARED_GENERATED_OUTPUT",
    predecessors: [],
    ...overrides,
  };
}

function fixture(provenanceValue = provenance()) {
  const root = mkdtempSync(join(tmpdir(), "assurance-generated-evidence-"));
  write(root, "build/output/report.json", "report\n");
  write(root, "scripts/tool.mjs", "export const tool = true;\n");
  write(root, "build/output/provenance.json", JSON.stringify(provenanceValue, null, 2) + "\n");
  return root;
}

function accepted(root, head = HEAD, value = descriptor()) {
  const result = inspectGeneratedEvidence(root, head, value);
  assert.equal(result.kind, "accepted", JSON.stringify(result));
  return result.value;
}

function refused(root, value, code) {
  const result = inspectGeneratedEvidence(root, HEAD, value);
  assert.equal(result.kind, "refused", JSON.stringify(result));
  assert.equal(result.code, code);
}

describe("bounded generated assurance evidence", () => {
  it("binds exact artifact and tool bytes without promoting informational provenance", () => {
    const root = fixture();
    try {
      const evidence = accepted(root);
      assert.equal(evidence.node.subjectDigest, EXPECTED_SUBJECT_DIGEST);
      assert.equal(evidence.node.toolDigest, EXPECTED_TOOL_DIGEST);
      assert.equal(evidence.node.repositoryHead, HEAD);
      assert.equal(evidence.node.localTrit, 0);
      assert.equal(evidence.freshnessReason, "PROVENANCE_INFORMATIONAL_ONLY");
      assert.deepEqual(evidence.node.externalInput, {
        kind: "absent",
        reason: "descriptor forbids external input",
      });
      assert.equal(Object.isFrozen(evidence), true);
      assert.equal(Object.isFrozen(evidence.node), true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("classifies byte-current output with an older Git build point as unknown", () => {
    const root = fixture(provenance({ gitCommit: OTHER_HEAD }));
    try {
      const evidence = accepted(root);
      assert.equal(evidence.node.localTrit, 0);
      assert.equal(evidence.freshnessReason, "GIT_BUILD_POINT_MISMATCH");
      assert.equal(evidence.node.repositoryHead, HEAD);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("retains an exact required external-input digest", () => {
    const root = fixture(provenance({
      externalInputDigest: EXTERNAL_DIGEST,
      externalDocumentCount: 7,
    }));
    try {
      const evidence = accepted(root, HEAD, descriptor({
        kind: "external",
        externalInputPolicy: "required",
        workingTreeClass: "EXTERNAL_INPUT",
      }));
      assert.equal(evidence.node.localTrit, 0);
      assert.equal(evidence.freshnessReason, "PROVENANCE_INFORMATIONAL_ONLY");
      assert.deepEqual(evidence.node.externalInput, {
        kind: "present",
        digest: EXTERNAL_DIGEST,
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("denies malformed, duplicate-key, wrong-tool and missing external provenance", () => {
    const cases = [
      {
        bytes: "{\"tool\":\"fixture-generator\",\"tool\":\"other\"}\n",
        reason: "PROVENANCE_INVALID",
        value: descriptor(),
      },
      {
        bytes: JSON.stringify(provenance({ tool: "other" })) + "\n",
        reason: "TOOL_IDENTITY_MISMATCH",
        value: descriptor(),
      },
      {
        bytes: JSON.stringify(provenance()) + "\n",
        reason: "EXTERNAL_INPUT_INVALID",
        value: descriptor({
          kind: "external",
          externalInputPolicy: "required",
          workingTreeClass: "EXTERNAL_INPUT",
        }),
      },
      {
        bytes: JSON.stringify(provenance({ gitCommit: null })) + "\n",
        reason: "PROVENANCE_INVALID",
        value: descriptor(),
      },
      {
        bytes: JSON.stringify(provenance({ authority: "SOURCE_BOUND" })) + "\n",
        reason: "PROVENANCE_INVALID",
        value: descriptor(),
      },
      {
        bytes: JSON.stringify({
          tool: "fixture-generator",
          gitCommit: HEAD,
          builtAt: "2026-08-10T00:00:00.000Z",
          node: "v24.18.0",
        }) + "\n",
        reason: "PROVENANCE_INVALID",
        value: descriptor(),
      },
    ];
    for (const item of cases) {
      const root = fixture();
      try {
        write(root, "build/output/provenance.json", item.bytes);
        const evidence = accepted(root, HEAD, item.value);
        assert.equal(evidence.node.localTrit, -1);
        assert.equal(evidence.freshnessReason, item.reason);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it("refuses traversal, sparse descriptors and accessor fields without invoking them", () => {
    const root = fixture();
    try {
      refused(root, descriptor({ artifactPaths: ["../escape"] }), "ASSURANCE-EVIDENCE-PATH");
      refused(root, descriptor({ artifactPaths: ["build/output/report.json:stream"] }), "ASSURANCE-EVIDENCE-PATH");
      refused(root, descriptor({ artifactPaths: ["build/output/re\u0301port.json"] }), "ASSURANCE-EVIDENCE-PATH");
      const sparse = ["build/output/report.json"];
      sparse.length = 2;
      refused(root, descriptor({ artifactPaths: sparse }), "ASSURANCE-EVIDENCE-SHAPE");

      let getterRan = false;
      const hostile = descriptor();
      Object.defineProperty(hostile, "id", {
        enumerable: true,
        get() {
          getterRan = true;
          return "fixture-output";
        },
      });
      refused(root, hostile, "ASSURANCE-EVIDENCE-SHAPE");
      assert.equal(getterRan, false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses a symlinked artifact before reading its target", () => {
    const root = fixture();
    try {
      const outside = write(root, "outside/report.json", "outside\n");
      const linked = join(root, "build/output/linked.json");
      symlinkSync(outside, linked, "file");
      refused(root, descriptor({
        artifactPaths: ["build/output/linked.json"],
        evidencePath: "build/output/linked.json",
      }), "ASSURANCE-EVIDENCE-FILE");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
