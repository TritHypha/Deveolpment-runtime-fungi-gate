import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildReferenceManifest,
  buildReferenceOutputFiles,
  publishReferenceOutputTree,
  ReferenceManifestError,
  ReferencePublicationError,
} from "../dist/index.js";

const SOURCE = `@version 1
type Alias = Int
record Person { id: Int }
pure flow choose(value: Int) -> Int
contract { intent { "reference" } }
{ return value }
`;

function manifest(packageName = "@galerina/reference-fixture", moduleName = "fixture") {
  return buildReferenceManifest({
    buildPoint: "5775a9fe9eba16a57133f5b2ba0adbe51d9df672",
    modules: [{
      packageName,
      moduleName,
      file: `packages-galerina/${packageName.replace(/^@galerina\//u, "")}/src/reference.fungi`,
      source: SOURCE,
    }],
  });
}

test("JSON, Markdown and HTML derive deterministically from the admitted manifest", () => {
  const input = manifest();
  const first = buildReferenceOutputFiles(input);
  const second = buildReferenceOutputFiles(input);
  assert.deepEqual(first, second);
  assert.deepEqual(first.map((entry) => entry.path), [
    "README.md",
    "index.html",
    "packages/galerina-reference-fixture.md",
    "reference.json",
  ]);
  assert.match(first.find((entry) => entry.path === "README.md").content, /choose/u);
  assert.match(first.find((entry) => entry.path === "index.html").content, /<!doctype html>/iu);
  assert.equal(JSON.parse(first.find((entry) => entry.path === "reference.json").content).manifestSha256, input.manifestSha256);
  const all = first.map((entry) => `${entry.path}\n${entry.content}`).join("\n");
  assert.doesNotMatch(all, /[A-Za-z]:\\|\/Users\/|-PRIVATE/u);
});

test("stale graph callers are omitted while fresh labelled links are retained", () => {
  const input = manifest();
  const stale = buildReferenceOutputFiles(input, {
    graph: { buildPoint: "0".repeat(40), fresh: false, links: [{ qualifiedName: input.declarations[0].qualifiedName, caller: "caller", confidence: "INFERRED" }] },
  });
  assert.ok(!stale.some((entry) => entry.content.includes("caller")));

  const fresh = buildReferenceOutputFiles(input, {
    graph: { buildPoint: input.buildPoint, fresh: true, links: [{ qualifiedName: input.declarations[0].qualifiedName, caller: "caller", confidence: "ASSERTED" }] },
  });
  assert.ok(fresh.some((entry) => entry.content.includes("ASSERTED") && entry.content.includes("caller")));
});

test("output path collisions and private markers refuse", () => {
  const left = manifest("@scope/a-b", "one");
  const right = manifest("@scope/a_b", "two");
  const declarations = [...left.declarations, ...right.declarations];
  const sources = [...left.sources, ...right.sources];
  const invalidCombined = { ...left, declarations, sources };
  assert.throws(() => buildReferenceOutputFiles(invalidCombined), ReferenceManifestError);

  assert.throws(
    () => manifest("@galerina/reference-PRIVATE", "fixture"),
    (error) => error instanceof ReferenceManifestError && error.code === "INVALID_INPUT",
  );
});

test("atomic publication refuses collisions and check mode detects stale output", async () => {
  const root = await mkdtemp(join(tmpdir(), "galerina-reference-"));
  const out = join(root, "reference");
  const input = manifest();
  await publishReferenceOutputTree({ manifest: input, outDir: out, mode: "write" });
  await publishReferenceOutputTree({ manifest: input, outDir: out, mode: "check" });

  const readme = join(out, "README.md");
  const original = await readFile(readme, "utf8");
  await writeFile(readme, `${original}\nhand edit\n`, "utf8");
  await assert.rejects(
    publishReferenceOutputTree({ manifest: input, outDir: out, mode: "check" }),
    (error) => error instanceof ReferencePublicationError && error.code === "STALE_OUTPUT",
  );
  await assert.rejects(
    publishReferenceOutputTree({ manifest: input, outDir: out, mode: "write" }),
    (error) => error instanceof ReferencePublicationError && error.code === "OUTPUT_COLLISION",
  );
});

test("registered CLI returns ALLOW, REFUSED and ERROR exit classes", async () => {
  const root = await mkdtemp(join(tmpdir(), "galerina-reference-cli-"));
  const manifestPath = join(root, "manifest.json");
  const out = join(root, "reference");
  await writeFile(manifestPath, JSON.stringify(manifest()), "utf8");
  const cli = fileURLToPath(new URL("../dist/reference-cli.js", import.meta.url));
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });

  const written = run("write", "--manifest", manifestPath, "--out", out);
  assert.equal(written.status, 0, written.stderr);
  assert.match(written.stdout, /"status":"ALLOW"/u);
  const checked = run("check", "--manifest", manifestPath, "--out", out);
  assert.equal(checked.status, 0, checked.stderr);
  const refused = run("write", "--manifest", manifestPath, "--out", out);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /"status":"REFUSED"/u);
  const errored = run("write");
  assert.equal(errored.status, 2);
  assert.match(errored.stderr, /"status":"ERROR"/u);
});
