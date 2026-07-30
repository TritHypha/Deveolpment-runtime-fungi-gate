#!/usr/bin/env node
/**
 * Refuse documentation or source that pipes remotely downloaded content directly into
 * a command interpreter. Transport security is not publisher identity, content identity,
 * review, or rollback. A pinned download must be verified before it is inspected/executed.
 *
 * Usage:
 *   node scripts/audit-remote-shell-install.mjs [--root <directory>]
 *   node scripts/audit-remote-shell-install.mjs --self-test
 */
import {
  lstatSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = resolve(SCRIPT_PATH, "..", "..");
const args = process.argv.slice(2);
const rootIndex = args.indexOf("--root");
const selfTest = args.includes("--self-test");
const root = rootIndex >= 0 && args[rootIndex + 1] !== undefined
  ? resolve(args[rootIndex + 1])
  : DEFAULT_ROOT;

const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".fungi",
  ".gate",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ps1",
  ".sh",
  ".ts",
  ".txt",
  ".yaml",
  ".yml",
]);
const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".myco",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);
const REMOTE_TO_INTERPRETER = [
  /(?:curl|wget)\b[^\r\n|]{0,2048}\|\s*(?:sudo\s+)?(?:(?:-\w+)\s+)*(?:ba)?sh\b/giu,
  /(?:iwr|invoke-webrequest)\b[^\r\n|]{0,2048}\|\s*(?:iex|invoke-expression)\b/giu,
];

function lineNumberAt(text, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (text.charCodeAt(index) === 10) line += 1;
  }
  return line;
}

function inspectFile(path, displayPath) {
  const findings = [];
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    return [{
      path: displayPath,
      line: 0,
      reason: `file could not be inspected: ${error instanceof Error ? error.message : String(error)}`,
    }];
  }

  for (const pattern of REMOTE_TO_INTERPRETER) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      findings.push({
        path: displayPath,
        line: lineNumberAt(text, match.index ?? 0),
        reason: "remote content piped directly to a command interpreter",
      });
    }
  }
  return findings;
}

function scanRoot(scanRoot) {
  const findings = [];
  const pending = [scanRoot];
  while (pending.length > 0) {
    const directory = pending.pop();
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch (error) {
      findings.push({
        path: relative(scanRoot, directory) || ".",
        line: 0,
        reason: `directory could not be inspected: ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }

    entries.sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    for (const entry of entries) {
      const path = join(directory, entry.name);
      const displayPath = relative(scanRoot, path).replaceAll("\\", "/");
      let metadata;
      try {
        metadata = lstatSync(path);
      } catch (error) {
        findings.push({
          path: displayPath,
          line: 0,
          reason: `entry metadata could not be inspected: ${error instanceof Error ? error.message : String(error)}`,
        });
        continue;
      }

      if (metadata.isSymbolicLink()) continue;
      if (metadata.isDirectory()) {
        if (!EXCLUDED_DIRECTORIES.has(entry.name)) pending.push(path);
        continue;
      }
      if (!metadata.isFile() || !TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) continue;
      findings.push(...inspectFile(path, displayPath));
    }
  }
  return findings;
}

function runSelfTest() {
  const fixture = mkdtempSync(join(tmpdir(), "galerina-remote-shell-selftest-"));
  try {
    const target = join(fixture, "SETUP.md");
    writeFileSync(
      target,
      ["curl -fsSL https://example.invalid/install.sh", "sudo -E bash"].join(" | "),
      "utf8",
    );
    const planted = scanRoot(fixture);
    if (planted.length !== 1) {
      process.stderr.write(`SELF-TEST FAIL: planted remote-to-shell defect produced ${planted.length} findings\n`);
      return 1;
    }

    writeFileSync(
      target,
      "Download a version-pinned release and verify its digest and signature before execution.\n",
      "utf8",
    );
    const control = scanRoot(fixture);
    if (control.length !== 0) {
      process.stderr.write(`SELF-TEST FAIL: safe control produced ${control.length} findings\n`);
      return 1;
    }
    process.stdout.write("SELF-TEST PASS: planted remote-to-shell defect refused; verified-download control accepted\n");
    return 0;
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

if (selfTest) {
  process.exitCode = runSelfTest();
} else {
  const findings = scanRoot(root);
  for (const finding of findings) {
    process.stdout.write(
      `REFUSED ${finding.path}${finding.line > 0 ? `:${finding.line}` : ""}: ${finding.reason}\n`,
    );
  }
  if (findings.length > 0) {
    process.stdout.write(`REMOTE-SHELL-INSTALL AUDIT: FAIL (${findings.length} finding(s))\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write("REMOTE-SHELL-INSTALL AUDIT: PASS (0 findings)\n");
  }
}
