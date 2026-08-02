#!/usr/bin/env node

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import suiteLeaseModule from "./lib/suite-run-lease.cjs";

const { leasePathForRoot } = suiteLeaseModule;
const DEFAULT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseArguments(argv) {
  let root = DEFAULT_ROOT;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument !== "--root") {
      throw new Error(`Unknown option: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error("--root requires a checkout path");
    }
    root = resolve(value);
    index += 1;
  }
  return { root };
}

function emit(state, detail) {
  process.stdout.write(`${JSON.stringify({
    systemMessage:
      `Galerina phase-close is explicit-only — ${state}. ${detail}`,
    suppressOutput: true,
  })}\n`);
}

let options;
try {
  options = parseArguments(process.argv.slice(2));
} catch (error) {
  emit("UNKNOWN", `Heartbeat refused: ${error.message}`);
  process.exit(0);
}

try {
  const leasePath = leasePathForRoot(options.root);
  if (existsSync(leasePath)) {
    emit("HELD", "An explicit root suite owns the checkout; no Stop-hook child was started.");
  } else {
    emit("IDLE", "Run npm run phase-close explicitly when the current work chapter is ready.");
  }
} catch (error) {
  emit("UNKNOWN", `Lease state could not be verified (${error.code || "LEASE-ERROR"}); no child was started.`);
}
