import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { execFile as execFileCallback } from "node:child_process";
import { access, lstat, readFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { dirname, resolve } from "node:path";

import { GraphIdentityError, resolveRegisteredGraphProject } from "../graph-project-identity/index.mjs";
import { PREFLIGHT_PROFILE } from "./contracts.mjs";
import { buildPreflightReport } from "./core.mjs";

const execFile = promisify(execFileCallback);
const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

async function gitClean(root) {
  const { stdout } = await execFile("git", ["status", "--porcelain=v1"], { cwd: root, encoding: "utf8", windowsHide: true });
  return stdout.trim().length === 0;
}

function identityFailure(error) {
  if (!(error instanceof GraphIdentityError)) return { status: "ERROR", code: "OWNER_CHECK_ERROR" };
  if (["GRAPH_STALE", "OWNER_UNAVAILABLE"].includes(error.code)) return { status: "HOLD", code: error.code };
  if (["OWNER_COMMAND_FAILED", "OWNER_JSON_INVALID"].includes(error.code)) return { status: "ERROR", code: error.code };
  return { status: "REFUSED", code: error.code };
}

async function collectOwner({ ownerKey, root, projectOverride }) {
  try {
    const identity = await resolveRegisteredGraphProject({ root, logicalKey: ownerKey, projectOverride });
    const clean = await gitClean(root);
    return Object.freeze({ ownerKey, status: clean ? "ALLOW" : "HOLD", code: clean ? "READY" : "WORKTREE_DIRTY", clean, identity });
  } catch (error) {
    const failure = identityFailure(error);
    return Object.freeze({ ownerKey, ...failure, clean: false, identity: null });
  }
}

async function fileCheck({ id, ownerKey, root, path }) {
  try {
    const full = resolve(root, ...path.split("/"));
    const stat = await lstat(full);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("not regular");
    return Object.freeze({ id, ownerKey, status: "ALLOW", code: "READY", locator: `repo:${ownerKey}:${path}`, digest: sha256(await readFile(full)) });
  } catch {
    return Object.freeze({ id, ownerKey, status: "HOLD", code: "REQUIRED_FILE_UNAVAILABLE", locator: `repo:${ownerKey}:${path}` });
  }
}

async function skillCheck({ name, skillRoot }) {
  try {
    const file = resolve(skillRoot, name, "SKILL.md");
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("not regular");
    return Object.freeze({ id: `skill-${name}`, ownerKey: "shared", status: "ALLOW", code: "INSTALLED_PRIVATE_IDENTITY", locator: `skill:${name}`, digest: sha256(await readFile(file)) });
  } catch {
    return Object.freeze({ id: `skill-${name}`, ownerKey: "shared", status: "HOLD", code: "PRIVATE_SKILL_UNAVAILABLE", locator: `skill:${name}` });
  }
}

async function packageScriptCheck({ id, ownerKey, root, script }) {
  try {
    const bytes = await readFile(resolve(root, "package.json"));
    const manifest = JSON.parse(bytes.toString("utf8"));
    if (typeof manifest?.scripts?.[script] !== "string" || manifest.scripts[script].length === 0) throw new Error("missing script");
    return Object.freeze({ id, ownerKey, status: "ALLOW", code: "REGISTERED_COMMAND", locator: `package-script:${ownerKey}:${script}`, digest: sha256(bytes) });
  } catch {
    return Object.freeze({ id, ownerKey, status: "HOLD", code: "REGISTERED_COMMAND_MISSING", locator: `package-script:${ownerKey}:${script}` });
  }
}

async function outputCheck(outputRoot) {
  try {
    let probe = outputRoot;
    for (;;) {
      try {
        const stat = await lstat(probe);
        if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("output parent is not a regular directory");
        await access(probe, fsConstants.W_OK);
        break;
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
        const parent = dirname(probe);
        if (parent === probe) throw error;
        probe = parent;
      }
    }
    return Object.freeze({ id: "output-root", ownerKey: "galerina", status: "ALLOW", code: "WRITABLE", locator: "output:." });
  } catch {
    return Object.freeze({ id: "output-root", ownerKey: "galerina", status: "ERROR", code: "OUTPUT_UNAVAILABLE", locator: "output:." });
  }
}

export async function collectConstellationPreflight({ galerinaRoot, slideRoot, lythRoot, skillRoot, outputRoot, projects = {} }) {
  const owners = await Promise.all([
    collectOwner({ ownerKey: "galerina", root: galerinaRoot, projectOverride: projects.galerina }),
    collectOwner({ ownerKey: "slide", root: slideRoot, projectOverride: projects.slide }),
    collectOwner({ ownerKey: "vok", root: slideRoot, projectOverride: projects.vok ?? projects.slide }),
    collectOwner({ ownerKey: "lyth", root: lythRoot, projectOverride: projects.lyth }),
  ]);
  const checks = await Promise.all([
    fileCheck({ id: "ts-to-fungi-converter", ownerKey: "galerina", root: galerinaRoot, path: "scripts/ts-to-fungi-sandbox.mjs" }),
    fileCheck({ id: "fungi-shadow-detector", ownerKey: "galerina", root: galerinaRoot, path: "scripts/audit-real-fungi-conversion-baseline.mjs" }),
    fileCheck({ id: "ts-fungi-drift-detector", ownerKey: "galerina", root: galerinaRoot, path: "scripts/audit-ts-fungi-drift.mjs" }),
    fileCheck({ id: "galerina-detached-scalar", ownerKey: "galerina", root: galerinaRoot, path: "packages-galerina/galerina-core-compiler/src/detached-scalar-handoff.ts" }),
    fileCheck({ id: "galerina-detached-scalar-check", ownerKey: "galerina", root: galerinaRoot, path: "packages-galerina/galerina-core-compiler/tests/detached-scalar-slide-vok.integration.test.mjs" }),
    fileCheck({ id: "slide-physical-compiler", ownerKey: "slide", root: slideRoot, path: "src/checked-fungi-package-compiler.mjs" }),
    fileCheck({ id: "slide-physical-check", ownerKey: "slide", root: slideRoot, path: "tests/checked-fungi-package-compiler.test.mjs" }),
    fileCheck({ id: "vok-receipt-verifier", ownerKey: "vok", root: slideRoot, path: "src/checked-fungi-package-publication-loader.mjs" }),
    fileCheck({ id: "vok-receipt-check", ownerKey: "vok", root: slideRoot, path: "tests/detached-scalar-vok-boundary.test.mjs" }),
    packageScriptCheck({ id: "lyth-detached-scalar-command", ownerKey: "lyth", root: lythRoot, script: "verify:detached-scalar" }),
    skillCheck({ name: "translating-typescript-to-fungi", skillRoot }),
    skillCheck({ name: "writing-fungi", skillRoot }),
    outputCheck(outputRoot),
  ]);
  return buildPreflightReport({ profile: PREFLIGHT_PROFILE, owners, checks });
}
