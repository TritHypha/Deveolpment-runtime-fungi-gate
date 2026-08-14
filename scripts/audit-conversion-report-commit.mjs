#!/usr/bin/env node
// Refuse conversion-report commits that do not add a substantial Fungi batch.
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MINIMUM_FUNGI_FILES = 40;
const EXPECTED_FUNGI_FILES = 50;
const REPORT = /^docs\/reports\/(?:slice-\d+-[a-z0-9-]+-fungi-conversion-\d{4}-\d{2}-\d{2}|fungi-conversion-[a-z0-9-]+)\.md$/u;
const FUNGI = /\.fungi$/u;

function parseArgs(argv) {
  let root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  let revision = "HEAD";
  let allowFinalReportOnly = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--allow-final-report-only") {
      allowFinalReportOnly = true;
      continue;
    }
    if ((argument !== "--root" && argument !== "--commit") || index + 1 >= argv.length) {
      throw new Error(
        "usage: audit-conversion-report-commit [--root path] [--commit revision] [--allow-final-report-only]",
      );
    }
    const value = argv[++index];
    if (argument === "--root") root = resolve(value);
    else revision = value;
  }
  return Object.freeze({ root, revision, allowFinalReportOnly });
}

function git(root, args, encoding = "utf8") {
  const result = spawnSync("git", args, { cwd: root, encoding });
  if (result.status !== 0) {
    const detail = encoding === "utf8"
      ? (result.stderr || result.stdout || "git command failed").trim()
      : "git command failed";
    throw new Error(detail);
  }
  return result.stdout;
}

function diffPaths(root, commit, filter) {
  const bytes = git(root, [
    "diff-tree",
    "--root",
    "-m",
    "--no-commit-id",
    "--name-only",
    `--diff-filter=${filter}`,
    "-r",
    "-z",
    commit,
  ], null);
  return [...new Set(bytes.toString("utf8").split("\0").filter((path) => path.length > 0))];
}

function addedPaths(root, commit) {
  return diffPaths(root, commit, "A");
}

function changedPaths(root, commit) {
  return diffPaths(root, commit, "ACMR");
}

function reportOnlyState(root, commit) {
  const history = git(root, ["rev-list", commit])
    .trim()
    .split(/\r?\n/u)
    .filter((revision) => revision.length > 0);
  let streak = 0;
  for (const revision of history) {
    const added = addedPaths(root, revision);
    const changed = changedPaths(root, revision);
    const fungi = added.filter((path) => FUNGI.test(path));
    if (fungi.length >= MINIMUM_FUNGI_FILES) {
      return Object.freeze({ qualifyingBatch: revision, streak });
    }
    if (changed.some((path) => REPORT.test(path))) streak += 1;
  }
  return Object.freeze({ qualifyingBatch: undefined, streak });
}

try {
  const { root, revision, allowFinalReportOnly } = parseArgs(process.argv.slice(2));
  const commit = git(root, ["rev-parse", "--verify", `${revision}^{commit}`]).trim();
  if (!/^[0-9a-f]{40}$/u.test(commit)) throw new Error("git returned a malformed commit identity");
  const added = addedPaths(root, commit);
  const changed = changedPaths(root, commit);
  const reports = changed.filter((path) => REPORT.test(path));
  const fungi = added.filter((path) => FUNGI.test(path));
  const short = commit.slice(0, 8);

  if (reports.length === 0) {
    console.log(`conversion-report-commit: ${short} has no added conversion reports`);
    process.exit(0);
  }
  if (fungi.length < MINIMUM_FUNGI_FILES) {
    if (allowFinalReportOnly) {
      const state = reportOnlyState(root, commit);
      if (state.qualifyingBatch === undefined) {
        console.error(
          `REFUSED: conversion-report commit ${short} has no preceding qualifying Fungi batch`,
        );
        process.exit(1);
      }
      if (state.streak > 1) {
        console.error(
          `REFUSED: conversion-report commit ${short} report-only streak ${state.streak} exceeds maximum 1`,
        );
        process.exit(1);
      }
      console.log(
        `conversion-report-commit: ${short} final bookkeeping exception; report-only streak ${state.streak}/1 after qualifying batch ${state.qualifyingBatch.slice(0, 8)}`,
      );
      process.exit(0);
    }
    console.error(
      `REFUSED: conversion-report commit ${short} added ${reports.length} report(s) but found ${fungi.length} added .fungi files; minimum ${MINIMUM_FUNGI_FILES}; expected ${EXPECTED_FUNGI_FILES}`,
    );
    process.exit(1);
  }
  console.log(
    `conversion-report-commit: ${short} added ${reports.length} report(s) and ${fungi.length} added .fungi files; minimum ${MINIMUM_FUNGI_FILES}; expected ${EXPECTED_FUNGI_FILES}`,
  );
} catch (error) {
  console.error(`REFUSED: ${error instanceof Error ? error.message : "conversion-report commit audit failed"}`);
  process.exit(1);
}
