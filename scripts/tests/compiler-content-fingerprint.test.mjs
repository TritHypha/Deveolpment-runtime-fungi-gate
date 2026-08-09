import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { compilerContentFingerprint } from "../lib/compiler-content-fingerprint.mjs";

test("compiler fingerprint ignores timestamps but changes with executable content", async () => {
  const root = await mkdtemp(join(tmpdir(), "galerina-compiler-fingerprint-"));
  const dist = join(root, "packages-galerina", "galerina-core-compiler", "dist");
  await mkdir(dist, { recursive: true });
  const entrypoint = join(root, "galerina.mjs");
  const compiler = join(dist, "compiler.js");
  await writeFile(entrypoint, "export const entry = 1;\n");
  await writeFile(compiler, "export const compiler = 1;\n");

  const before = compilerContentFingerprint(root);
  await utimes(entrypoint, new Date(1_000), new Date(2_000));
  await utimes(compiler, new Date(3_000), new Date(4_000));
  const afterTimestampOnly = compilerContentFingerprint(root);
  assert.equal(afterTimestampOnly, before);

  await writeFile(compiler, "export const compiler = 2;\n");
  assert.notEqual(compilerContentFingerprint(root), before);
});

test("compiler fingerprint binds relative file identity as well as bytes", async () => {
  const root = await mkdtemp(join(tmpdir(), "galerina-compiler-fingerprint-path-"));
  const dist = join(root, "packages-galerina", "galerina-core-compiler", "dist");
  await mkdir(dist, { recursive: true });
  await writeFile(join(root, "galerina.mjs"), "same\n");
  await writeFile(join(dist, "a.js"), "same\n");
  const before = compilerContentFingerprint(root);
  await writeFile(join(dist, "b.js"), "same\n");
  assert.notEqual(compilerContentFingerprint(root), before);
});
