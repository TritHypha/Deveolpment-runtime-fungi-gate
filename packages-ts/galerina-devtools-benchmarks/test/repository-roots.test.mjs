import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";

import { resolveSlideRepository } from "../src/repository-roots.mjs";

const galerinaRepository = resolve("fixture", "Galerina");
const configuredSlide = resolve("fixture", "SLIDE");

test("an explicit SLIDE directory is admitted in a worktree", () => {
  assert.equal(
    resolveSlideRepository({
      env: { GALERINA_SLIDE_DIR: configuredSlide },
      galerinaRepository,
    }),
    configuredSlide,
  );
});

test("the legacy SLIDE repository input remains admitted", () => {
  assert.equal(
    resolveSlideRepository({
      env: { GALERINA_SLIDE_REPO: configuredSlide },
      galerinaRepository,
    }),
    configuredSlide,
  );
});

test("conflicting, blank, or relative SLIDE inputs refuse", () => {
  assert.throws(
    () => resolveSlideRepository({
      env: {
        GALERINA_SLIDE_DIR: configuredSlide,
        GALERINA_SLIDE_REPO: resolve("other", "SLIDE"),
      },
      galerinaRepository,
    }),
    /conflict/u,
  );
  for (const value of ["", `.${process.platform === "win32" ? "\\" : "/"}SLIDE`]) {
    assert.throws(
      () => resolveSlideRepository({
        env: { GALERINA_SLIDE_DIR: value },
        galerinaRepository,
      }),
      /absolute path/u,
    );
  }
});

test("an unconfigured main checkout retains the sibling default", () => {
  assert.equal(
    resolveSlideRepository({ env: {}, galerinaRepository }),
    resolve(galerinaRepository, "..", "SLIDE"),
  );
});
