#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { discoverChangedPaths } from "../packages-ts/galerina-devtools-impact/src/git-changes.mjs";
import { buildImpactPlan } from "../packages-ts/galerina-devtools-impact/src/impact-plan.mjs";
import { executeImpactPlan } from "./lib/impact-executor.mjs";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let root = defaultRoot;
let base = "HEAD";
let execute = false;
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--root") {
    root = resolve(process.argv[index + 1] ?? "");
    index += 1;
  } else if (argument === "--base") {
    base = process.argv[index + 1] ?? "";
    index += 1;
  } else if (argument === "--execute") {
    execute = true;
  } else if (argument !== "--json") {
    process.stderr.write(`run-impact-check: unknown option ${argument}\n`);
    process.exit(3);
  }
}

let plan;
try {
  plan = buildImpactPlan({ root, changedPaths: discoverChangedPaths(root, base) });
} catch (error) {
  process.stdout.write(`${JSON.stringify({
    tool: "run-impact-check",
    schemaVersion: 1,
    ok: false,
    authorizing: false,
    code: "IMPACT-DISCOVERY-REFUSED",
    detail: error instanceof Error ? error.message : String(error),
  }, null, 2)}\n`);
  process.exit(2);
}

if (!execute) {
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  process.exit(plan.fullRequired ? 2 : 0);
}
const report = await executeImpactPlan(plan, { root });
process.stdout.write(`${JSON.stringify({ plan, execution: report }, null, 2)}\n`);
process.exit(report.ok ? 0 : plan.fullRequired ? 2 : 1);
