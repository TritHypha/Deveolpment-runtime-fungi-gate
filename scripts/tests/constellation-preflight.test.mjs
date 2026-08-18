import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  PreflightError,
  atomicWriteReport,
  buildPreflightReport,
  runPreflightSelfTest,
} from "../lib/constellation-preflight/index.mjs";

const head = "a".repeat(40);

function identity(logicalKey, repository = logicalKey) {
  return {
    schema: "galerina.graph-project-identity.v1",
    toolVersion: "1.0.0",
    logicalKey,
    declaredProject: logicalKey === "vok" ? "SLIDE" : logicalKey,
    project: logicalKey === "vok" ? "SLIDE" : logicalKey,
    repository,
    componentScope: logicalKey === "vok" ? "src/vok.mjs" : ".",
    root: ".",
    requiredHead: head,
    indexedHeadSha: head,
    stale: false,
    probe: { name: `${logicalKey}Probe`, qualifiedName: `${logicalKey}.probe`, filePath: `src/${logicalKey}.mjs`, label: "Function" },
  };
}

function owner(ownerKey, status = "ALLOW", code = "READY") {
  const repository = ownerKey === "galerina" ? "Galerina" : ownerKey === "vok" ? "SLIDE" : ownerKey;
  return { ownerKey, status, code, clean: true, identity: identity(ownerKey, repository) };
}

function check(id, ownerKey = "shared", status = "ALLOW", code = "READY") {
  return { id, ownerKey, status, code, locator: `tool:${id}`, digest: `sha256:${"b".repeat(64)}` };
}

test("ALLOW requires four separate fresh owner envelopes and green checks", () => {
  const report = buildPreflightReport({
    profile: "detached-scalar",
    owners: [owner("galerina"), owner("slide"), owner("vok"), owner("lyth")],
    checks: [check("converter", "galerina"), check("physical", "slide"), check("receipt", "vok"), check("proof-work", "lyth")],
  });
  assert.equal(report.status, "ALLOW");
  assert.deepEqual(report.owners.map((item) => item.ownerKey), ["galerina", "slide", "vok", "lyth"]);
  assert.equal(report.candidatePublished, false);
  assert.equal(JSON.stringify(report).includes("C:/"), false);
  assert.equal(Object.hasOwn(report, "source"), false);
});

test("least authority makes one required owner or child denial govern the aggregate", () => {
  for (const [status, expected] of [["HOLD", "HOLD"], ["REFUSED", "REFUSED"], ["ERROR", "ERROR"]]) {
    const report = buildPreflightReport({
      profile: "detached-scalar",
      owners: [owner("galerina"), owner("slide", status, `SLIDE_${status}`), owner("vok"), owner("lyth")],
      checks: [check("converter")],
    });
    assert.equal(report.status, expected);
  }
  const child = buildPreflightReport({
    profile: "detached-scalar",
    owners: [owner("galerina"), owner("slide"), owner("vok"), owner("lyth")],
    checks: [check("converter"), check("lyth-command", "lyth", "REFUSED", "CHILD_FAILED")],
  });
  assert.equal(child.status, "REFUSED");
});

test("missing owners, duplicate checks, stale identities and path leakage are malformed", () => {
  const validOwners = [owner("galerina"), owner("slide"), owner("vok"), owner("lyth")];
  const cases = [
    { owners: validOwners.slice(0, 3), checks: [check("a")] },
    { owners: validOwners, checks: [check("a"), check("a")] },
    { owners: validOwners.map((item) => item.ownerKey === "slide" ? { ...item, identity: { ...item.identity, stale: true } } : item), checks: [check("a")] },
    { owners: validOwners, checks: [{ ...check("a"), locator: "C:/private/tool.mjs" }] },
  ];
  for (const input of cases) {
    assert.throws(
      () => buildPreflightReport({ profile: "detached-scalar", ...input }),
      (error) => error instanceof PreflightError,
    );
  }
});

test("the built-in self-test proves one green and one controlled red result", () => {
  assert.deepEqual(runPreflightSelfTest(), { green: "ALLOW", red: "REFUSED", passed: true });
});

test("report publication is deterministic and a failed target refuses without a partial file", async () => {
  const dir = await mkdtemp(join(tmpdir(), "constellation-preflight-"));
  try {
    const report = buildPreflightReport({
      profile: "detached-scalar",
      owners: [owner("galerina"), owner("slide"), owner("vok"), owner("lyth")],
      checks: [check("converter")],
    });
    const out = join(dir, "report.json");
    await atomicWriteReport(out, report);
    const first = await readFile(out);
    await atomicWriteReport(out, report);
    assert.deepEqual(await readFile(out), first);

    const blocked = join(dir, "blocked");
    await mkdir(blocked);
    await assert.rejects(() => atomicWriteReport(blocked, report));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
