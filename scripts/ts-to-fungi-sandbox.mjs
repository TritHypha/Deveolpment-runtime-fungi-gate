#!/usr/bin/env node
// Convert only a proved TypeScript subset to non-authorizing Fungi sandbox candidates.

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { SandboxRefusal } from "./lib/ts-to-fungi-sandbox/contracts.mjs";
import { assertCliInput, assertCliOutput, readManifest, runBatch, runInspect, verifyReceipt } from "./lib/ts-to-fungi-sandbox/controller.mjs";
import { discoverGraphProject } from "./lib/ts-to-fungi-sandbox/identity.mjs";
import { canonicalJson } from "./lib/ts-to-fungi-sandbox/journal.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

function parseArgs(argv) {
  const command = argv[0];
  if (!["inspect", "batch", "verify"].includes(command)) throw new SandboxRefusal("CLI_COMMAND_INVALID", "expected inspect, batch or verify");
  const values = new Map();
  let auditOnly = false;
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--audit-only" && !auditOnly) {
      auditOnly = true;
      continue;
    }
    if (!arg.startsWith("--") || index + 1 >= argv.length || argv[index + 1].startsWith("--") || values.has(arg)) throw new SandboxRefusal("CLI_ARGUMENT_INVALID", `invalid or duplicate argument ${arg}`);
    values.set(arg, argv[index + 1]);
    index += 1;
  }
  return { command, values, auditOnly };
}

async function main() {
  const { command, values, auditOnly } = parseArgs(process.argv.slice(2));
  if (command === "verify") {
    if (values.size !== 1 || !values.has("--receipt") || auditOnly) throw new SandboxRefusal("CLI_ARGUMENT_INVALID", "verify requires only --receipt");
    const result = await verifyReceipt({ root: ROOT, receipt: assertCliInput(ROOT, values.get("--receipt"), { sandboxOnly: true }) });
    process.stdout.write(`${canonicalJson(result)}\n`);
    if (!result.valid) process.exitCode = 1;
    return;
  }
  const out = assertCliOutput(ROOT, values.get("--out"));
  const project = values.get("--project") ?? await discoverGraphProject(ROOT);
  let summary;
  if (command === "inspect") {
    if (!["--file", "--symbol", "--out"].every((key) => values.has(key)) || ![3, 4].includes(values.size) || [...values.keys()].some((key) => !["--file", "--symbol", "--project", "--out"].includes(key))) throw new SandboxRefusal("CLI_ARGUMENT_INVALID", "inspect requires --file --symbol --out and accepts optional --project");
    summary = await runInspect({ root: ROOT, project, file: values.get("--file"), symbol: values.get("--symbol"), out, auditOnly });
  } else {
    if (!["--manifest", "--out"].every((key) => values.has(key)) || ![2, 3].includes(values.size) || [...values.keys()].some((key) => !["--manifest", "--project", "--out"].includes(key))) throw new SandboxRefusal("CLI_ARGUMENT_INVALID", "batch requires --manifest --out and accepts optional --project");
    const manifest = await readManifest(assertCliInput(ROOT, values.get("--manifest"), { sandboxOnly: false }));
    summary = await runBatch({ root: ROOT, project, manifest, out, auditOnly });
  }
  process.stdout.write(`${canonicalJson(summary)}\n`);
  if (!auditOnly && summary.outcomes.CONVERTED !== summary.total) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  const code = error instanceof SandboxRefusal ? error.code : "UNEXPECTED_FAILURE";
  const detail = error instanceof SandboxRefusal ? error.message : "unexpected sandbox failure";
  process.stderr.write(`ts-to-fungi-sandbox: REFUSED ${code}: ${detail}\n`);
  process.exitCode = 1;
}
