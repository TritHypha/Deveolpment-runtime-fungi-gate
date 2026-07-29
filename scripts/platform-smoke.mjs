#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { arch, platform, release } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = resolve(dirname(SCRIPT_PATH), "..");
const COMPILER_DIRECTORY = "packages-galerina/galerina-core-compiler";
const STRICT_FIXTURE = "examples/wasm-hello-world/greet.fungi";
const ALLOWED_PLATFORMS = new Set(["win32", "darwin", "linux"]);
const ALLOWED_ARCHITECTURES = new Set(["x64", "arm64"]);
const COMMAND_TIMEOUT_MS = 120_000;

function refusal(code, message) {
  return new Error(`${code}: ${message}`);
}

export function normalizePortableRelativePath(input) {
  if (typeof input !== "string" || input.length === 0) {
    throw refusal("PLATFORM-SMOKE-PATH-EMPTY", "a repository-relative path is required");
  }
  if (input.includes("\\")) {
    throw refusal("PLATFORM-SMOKE-PATH-SEPARATOR", "portable paths must use '/' separators");
  }
  if (isAbsolute(input) || /^[A-Za-z]:/.test(input)) {
    throw refusal("PLATFORM-SMOKE-PATH-ABSOLUTE", "absolute paths are not admitted");
  }

  const segments = input.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw refusal("PLATFORM-SMOKE-PATH-TRAVERSAL", "empty, dot, and parent segments are not admitted");
  }
  return segments.join("/");
}

function repositoryPath(portablePath) {
  const normalized = normalizePortableRelativePath(portablePath);
  const resolved = resolve(REPOSITORY_ROOT, ...normalized.split("/"));
  const rootPrefix = `${REPOSITORY_ROOT.toLowerCase()}${process.platform === "win32" ? "\\" : "/"}`;
  if (!resolved.toLowerCase().startsWith(rootPrefix)) {
    throw refusal("PLATFORM-SMOKE-PATH-ESCAPE", "resolved path escaped the repository");
  }
  return resolved;
}

export function assertPlatformIdentity(os, architecture) {
  if (!ALLOWED_PLATFORMS.has(os)) {
    throw refusal("PLATFORM-SMOKE-PLATFORM-UNKNOWN", `unsupported platform identity '${os}'`);
  }
  if (!ALLOWED_ARCHITECTURES.has(architecture)) {
    throw refusal("PLATFORM-SMOKE-ARCH-UNKNOWN", `unsupported architecture identity '${architecture}'`);
  }
  return { os, architecture };
}

export function requireExecutable(name, probe) {
  const result = probe();
  if (result?.error !== undefined || result?.status !== 0) {
    throw refusal("PLATFORM-SMOKE-BINARY-MISSING", `required executable '${name}' is unavailable`);
  }
  const version = String(result.stdout ?? result.stderr ?? "").trim();
  if (version.length === 0) {
    throw refusal("PLATFORM-SMOKE-BINARY-EVIDENCE-EMPTY", `'${name}' returned no version evidence`);
  }
  return version.split(/\r?\n/, 1)[0];
}

export function validateEvidence(evidence) {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    throw refusal("PLATFORM-SMOKE-EVIDENCE-EMPTY", "at least one positive result is required");
  }
  const names = new Set();
  for (const row of evidence) {
    if (typeof row?.name !== "string" || row.name.length === 0) {
      throw refusal("PLATFORM-SMOKE-EVIDENCE-NAME", "every result requires a stable name");
    }
    if (names.has(row.name)) {
      throw refusal("PLATFORM-SMOKE-EVIDENCE-DUPLICATE", `duplicate result '${row.name}'`);
    }
    names.add(row.name);
    if (row.status !== "passed") {
      throw refusal("PLATFORM-SMOKE-EVIDENCE-FAILED", `result '${row.name}' is not a positive pass`);
    }
    if (!Number.isFinite(row.durationMs) || row.durationMs < 0) {
      throw refusal("PLATFORM-SMOKE-EVIDENCE-DURATION", `result '${row.name}' has invalid timing evidence`);
    }
  }
  return evidence;
}

export function assertNoSensitiveOutput(serialized) {
  const normalizedSlashes = serialized.replaceAll("\\\\", "\\");
  if (
    /[A-Za-z]:\\(?:Users|Documents|Desktop)\\/i.test(normalizedSlashes)
    || /\/(?:Users|home)\/[^/"\s]+/i.test(serialized)
  ) {
    throw refusal("PLATFORM-SMOKE-OUTPUT-PATH", "structured output contains a local absolute path");
  }
  if (
    /"(?:privateKey|secret|password|token|apiKey|credential)"\s*:/i.test(serialized)
    || /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/.test(serialized)
  ) {
    throw refusal("PLATFORM-SMOKE-OUTPUT-SECRET", "structured output contains a secret-shaped field");
  }
  return serialized;
}

function runProcess(command, args, timeout = COMMAND_TIMEOUT_MS) {
  return spawnSync(command, args, {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    env: process.env,
    shell: false,
    timeout,
    windowsHide: true,
  });
}

function npmInvocation() {
  const candidates = [
    process.env.npm_execpath,
    join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
    join(dirname(dirname(process.execPath)), "lib", "node_modules", "npm", "bin", "npm-cli.js"),
  ].filter((candidate) => typeof candidate === "string" && candidate.length > 0);
  const npmCli = candidates.find((candidate) => existsSync(candidate));
  if (npmCli === undefined) {
    throw refusal("PLATFORM-SMOKE-BINARY-MISSING", "npm JavaScript CLI was not found beside the active Node runtime");
  }
  return { command: process.execPath, prefixArgs: [npmCli] };
}

async function timedEvidence(name, run) {
  const started = performance.now();
  const details = await run();
  return {
    name,
    status: "passed",
    durationMs: Math.round((performance.now() - started) * 1000) / 1000,
    ...(details === undefined ? {} : { details }),
  };
}

function requirePassedProcess(name, result) {
  if (result.error !== undefined) {
    throw refusal("PLATFORM-SMOKE-COMMAND-ERROR", `'${name}' could not start`);
  }
  if (result.signal !== null) {
    throw refusal("PLATFORM-SMOKE-COMMAND-SIGNAL", `'${name}' ended by signal`);
  }
  if (result.status !== 0) {
    throw refusal("PLATFORM-SMOKE-COMMAND-FAILED", `'${name}' exited non-zero`);
  }
  return result;
}

function discoverWorkspace() {
  const workspace = JSON.parse(readFileSync(repositoryPath("galerina.workspace.json"), "utf8"));
  const version = JSON.parse(readFileSync(repositoryPath("version.json"), "utf8"));
  if (!Array.isArray(workspace.packages) || workspace.packages.length === 0) {
    throw refusal("PLATFORM-SMOKE-DISCOVERY-EMPTY", "workspace package inventory is empty");
  }

  const packageNames = new Set();
  for (const rawPath of workspace.packages) {
    const portablePath = normalizePortableRelativePath(rawPath);
    const manifestPath = repositoryPath(`${portablePath}/package.json`);
    if (!existsSync(manifestPath)) {
      throw refusal("PLATFORM-SMOKE-DISCOVERY-MISSING", "a governed package manifest is missing");
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (typeof manifest.name !== "string" || manifest.name.length === 0) {
      throw refusal("PLATFORM-SMOKE-DISCOVERY-NAME", "a governed package has no canonical name");
    }
    if (packageNames.has(manifest.name)) {
      throw refusal("PLATFORM-SMOKE-DISCOVERY-DUPLICATE", `duplicate package identity '${manifest.name}'`);
    }
    packageNames.add(manifest.name);
  }

  if (workspace.packages.length !== version.packageCount) {
    throw refusal(
      "PLATFORM-SMOKE-DISCOVERY-COUNT",
      "workspace discovery disagrees with the generated release count",
    );
  }
  return { packageCount: workspace.packages.length };
}

function readDistributionIdentity() {
  if (process.platform === "win32") {
    return { id: "windows", version: release() };
  }
  if (process.platform === "darwin") {
    return { id: "macos", version: release() };
  }

  const osReleasePath = "/etc/os-release";
  if (!existsSync(osReleasePath)) {
    throw refusal("PLATFORM-SMOKE-DISTRIBUTION-UNKNOWN", "Linux distribution evidence is absent");
  }
  const fields = new Map();
  for (const line of readFileSync(osReleasePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(?:"([^"]*)"|([^\s]*))$/);
    if (match?.[1] !== undefined) {
      fields.set(match[1], match[2] ?? match[3] ?? "");
    }
  }
  const id = fields.get("ID");
  const version = fields.get("VERSION_ID");
  if (
    id === undefined
    || version === undefined
    || !/^[a-z0-9._-]+$/i.test(id)
    || !/^[a-z0-9._-]+$/i.test(version)
  ) {
    throw refusal("PLATFORM-SMOKE-DISTRIBUTION-MALFORMED", "Linux distribution identity is malformed");
  }
  return { id: id.toLowerCase(), version };
}

async function executeWasmProbe() {
  const compilerUrl = pathToFileURL(repositoryPath(`${COMPILER_DIRECTORY}/dist/index.js`)).href;
  const compiler = await import(`${compilerUrl}?platform-smoke=${Date.now()}`);
  const source = `@version 1
;; Adds two bounded test integers for the hermetic platform execution probe.
pure flow add(a: Int, b: Int) -> Int
contract {
  intent { "Add two integers in the platform smoke probe." }
}
{
  return a + b
}
`;
  const program = compiler.parseProgram(source, "platform-smoke.fungi");
  const parseErrors = (program.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error");
  if (parseErrors.length > 0) {
    throw refusal("PLATFORM-SMOKE-WASM-PARSE", "the hermetic Wasm probe did not parse");
  }
  const effects = compiler.checkEffects(program.flows, program.ast);
  const { gir } = compiler.emitGIR(program.ast, program.flows, effects);
  const module = compiler.buildWATModuleFromGIR(
    gir,
    undefined,
    "wasm-standalone",
    program.ast,
    true,
  );
  const wat = compiler.renderWAT(module);
  const execution = await compiler.executeWASMFlow(wat, "add", [19, 23]);
  if (execution.error !== undefined || execution.result !== 42 || execution.binaryBytes <= 8) {
    throw refusal("PLATFORM-SMOKE-WASM-EXECUTION", "compiled Wasm did not return the pinned result");
  }
  return { result: execution.result, binaryBytes: execution.binaryBytes };
}

function parseArguments(argv) {
  const options = { json: false, expectedOs: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") {
      options.json = true;
    } else if (argument === "--expect-os") {
      options.expectedOs = argv[index + 1];
      index += 1;
      if (typeof options.expectedOs !== "string" || !/^[a-z0-9._-]+$/i.test(options.expectedOs)) {
        throw refusal("PLATFORM-SMOKE-ARGUMENT", "--expect-os requires a simple OS identity");
      }
    } else {
      throw refusal("PLATFORM-SMOKE-ARGUMENT", `unknown argument '${argument}'`);
    }
  }
  return options;
}

export async function runPlatformSmoke({ expectedOs } = {}) {
  const identity = assertPlatformIdentity(platform(), arch());
  const distribution = readDistributionIdentity();
  if (expectedOs !== undefined && distribution.id !== expectedOs) {
    throw refusal(
      "PLATFORM-SMOKE-DISTRIBUTION-MISMATCH",
      `expected '${expectedOs}' but admitted '${distribution.id}'`,
    );
  }

  const npm = npmInvocation();
  const evidence = [];
  evidence.push(
    await timedEvidence("npm-binary", () => {
      const version = requireExecutable("npm", () =>
        runProcess(npm.command, [...npm.prefixArgs, "--version"], 15_000),
      );
      return { version };
    }),
  );
  evidence.push(await timedEvidence("workspace-discovery", () => discoverWorkspace()));
  evidence.push(
    await timedEvidence("portable-path-contract", () => ({
      fixture: normalizePortableRelativePath(STRICT_FIXTURE),
      compiler: normalizePortableRelativePath(COMPILER_DIRECTORY),
    })),
  );
  evidence.push(
    await timedEvidence("compiler-build", () => {
      requirePassedProcess(
        "compiler-build",
        runProcess(npm.command, [
          ...npm.prefixArgs,
          "--prefix",
          repositoryPath(COMPILER_DIRECTORY),
          "run",
          "build",
        ]),
      );
    }),
  );
  evidence.push(
    await timedEvidence("strict-fungi-check", () => {
      requirePassedProcess(
        "strict-fungi-check",
        runProcess(process.execPath, [
          repositoryPath("galerina.mjs"),
          "check",
          repositoryPath(STRICT_FIXTURE),
          "--strict-governance",
        ]),
      );
      return { fixture: STRICT_FIXTURE };
    }),
  );
  evidence.push(await timedEvidence("wasm-execution", () => executeWasmProbe()));
  validateEvidence(evidence);

  const report = {
    schemaVersion: "galerina.platform-smoke.v1",
    verdict: "passed",
    platform: {
      ...identity,
      distribution,
      nodeVersion: process.version,
    },
    evidence,
  };
  assertNoSensitiveOutput(JSON.stringify(report));
  return report;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  try {
    const report = await runPlatformSmoke({ expectedOs: options.expectedOs });
    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(
        `Galerina platform smoke: ${report.verdict} — ${report.platform.distribution.id} `
        + `${report.platform.architecture}, ${report.evidence.length} checks`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = message.match(/PLATFORM-SMOKE-[A-Z-]+/)?.[0] ?? "PLATFORM-SMOKE-REFUSED";
    const refused = JSON.stringify({
      schemaVersion: "galerina.platform-smoke.v1",
      verdict: "refused",
      code,
    });
    assertNoSensitiveOutput(refused);
    if (options.json) {
      console.error(refused);
    } else {
      console.error(`Galerina platform smoke: refused — ${code}`);
    }
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === SCRIPT_PATH) {
  await main();
}
