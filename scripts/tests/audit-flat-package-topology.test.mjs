import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  analyzeTopologyRecords,
  scanWorkspace,
} from "../audit-flat-package-topology.mjs";

const direct = (path, name, kind = "host") => ({ path, name, kind });

describe("flat Galerina package topology audit", () => {
  it("accepts one unique package identity per direct child", () => {
    const result = analyzeTopologyRecords({
      records: [
        direct("galerina-core/package.json", "@galerina/core"),
        direct("galerina-auth/package.fungi.json", "galerina-auth", "native"),
      ],
      legacyNestedNativeManifests: [],
      nodeModulesPaths: [],
      postSlide: false,
    });

    assert.deepEqual(result.violations, []);
    assert.equal(result.deferredNested.length, 0);
  });

  it("fails closed on duplicate package identities", () => {
    const result = analyzeTopologyRecords({
      records: [
        direct("galerina-core/package.json", "@galerina/core"),
        direct("galerina-auth/package.json", "@galerina/core"),
      ],
      legacyNestedNativeManifests: [],
      nodeModulesPaths: [],
      postSlide: false,
    });

    assert.ok(result.violations.some((v) => v.includes("duplicate package identity")));
  });

  it("rejects an unratcheted nested Galerina-native package", () => {
    const result = analyzeTopologyRecords({
      records: [
        direct(
          "galerina-example/packages/copied-plugin/package.fungi.json",
          "copied-plugin",
          "native",
        ),
      ],
      legacyNestedNativeManifests: [],
      nodeModulesPaths: [],
      postSlide: false,
    });

    assert.ok(result.violations.some((v) => v.includes("nested native package")));
  });

  it("tracks one exact pre-SLIDE nested package as debt without admitting growth", () => {
    const nestedPath = "galerina-example/packages/greeting/package.fungi.json";
    const result = analyzeTopologyRecords({
      records: [direct(nestedPath, "greeting", "native")],
      legacyNestedNativeManifests: [nestedPath],
      nodeModulesPaths: [],
      postSlide: false,
    });

    assert.deepEqual(result.violations, []);
    assert.deepEqual(result.deferredNested, [nestedPath]);
  });

  it("rejects a stale legacy exception so resolved debt cannot remain admitted", () => {
    const result = analyzeTopologyRecords({
      records: [],
      legacyNestedNativeManifests: [
        "galerina-example/packages/greeting/package.fungi.json",
      ],
      nodeModulesPaths: [],
      postSlide: false,
    });

    assert.ok(result.violations.some((v) => v.includes("stale legacy")));
  });

  it("post-SLIDE enforcement rejects all nested native packages and node_modules", () => {
    const nestedPath = "galerina-example/packages/greeting/package.fungi.json";
    const result = analyzeTopologyRecords({
      records: [direct(nestedPath, "greeting", "native")],
      legacyNestedNativeManifests: [nestedPath],
      nodeModulesPaths: ["galerina-example/node_modules"],
      postSlide: true,
    });

    assert.ok(result.violations.some((v) => v.includes("post-SLIDE")));
    assert.ok(result.violations.some((v) => v.includes("node_modules")));
  });

  it("refuses a symlinked package subtree instead of following or ignoring it", () => {
    const root = mkdtempSync(join(tmpdir(), "flat-topology-symlink-"));
    const packageRoot = join(root, "packages-galerina");
    const owner = join(packageRoot, "galerina-core");
    const external = join(root, "external-package");
    try {
      mkdirSync(owner, { recursive: true });
      mkdirSync(external, { recursive: true });
      writeFileSync(
        join(external, "package.fungi.json"),
        JSON.stringify({ name: "escaped" }),
      );
      symlinkSync(external, join(owner, "linked"), "junction");

      const scan = scanWorkspace(packageRoot);
      assert.ok(scan.scanViolations.some((item) => item.includes("symlink")));
      assert.ok(!scan.records.some((record) => record.name === "escaped"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
