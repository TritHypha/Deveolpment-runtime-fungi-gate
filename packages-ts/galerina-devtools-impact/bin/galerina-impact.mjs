#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { discoverChangedPaths } from "../src/git-changes.mjs";
import { buildImpactPlan } from "../src/impact-plan.mjs";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
let root = defaultRoot;
let base = "HEAD";
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--root") {
    root = resolve(process.argv[index + 1] ?? "");
    index += 1;
  } else if (argument === "--base") {
    base = process.argv[index + 1] ?? "";
    index += 1;
  } else if (argument !== "--json") {
    process.stderr.write(`galerina-impact: unknown option ${argument}\n`);
    process.exit(3);
  }
}

try {
  const plan = buildImpactPlan({ root, changedPaths: discoverChangedPaths(root, base) });
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  process.exit(plan.fullRequired ? 2 : 0);
} catch (error) {
  process.stdout.write(`${JSON.stringify({
    tool: "galerina-devtools-impact",
    schemaVersion: 1,
    status: "FULL_REQUIRED",
    fullRequired: true,
    authorizing: false,
    code: "IMPACT-DISCOVERY-REFUSED",
    detail: error instanceof Error ? error.message : String(error),
  }, null, 2)}\n`);
  process.exit(2);
}
