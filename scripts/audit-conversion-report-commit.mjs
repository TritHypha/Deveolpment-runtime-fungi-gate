#!/usr/bin/env node
// Refuse conversion-report commits that do not add a substantial Fungi batch.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { alphaFungiFingerprint, exactFungiFingerprint } from "./lib/fungi-shadow.mjs";

const MINIMUM_FUNGI_FILES = 40;
const EXPECTED_FUNGI_FILES = 50;
const GIT_MAX_BUFFER_BYTES = 128 * 1024 * 1024;
const REPORT = /^docs\/reports\/(?:slice-\d+-[a-z0-9-]+-fungi-conversion-\d{4}-\d{2}-\d{2}|fungi-conversion-[a-z0-9-]+)\.md$/u;
const FUNGI = /\.fungi$/u;

function parseArgs(argv) {
  let root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  let revision = "HEAD";
  let allowFinalReportOnly = false;
  let worktree = false;
  let uniquenessOnly = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--allow-final-report-only") {
      allowFinalReportOnly = true;
      continue;
    }
    if (argument === "--worktree") {
      worktree = true;
      continue;
    }
    if (argument === "--uniqueness-only") {
      uniquenessOnly = true;
      continue;
    }
    if ((argument !== "--root" && argument !== "--commit") || index + 1 >= argv.length) {
      throw new Error(
        "usage: audit-conversion-report-commit [--root path] [--commit revision] [--worktree] [--uniqueness-only] [--allow-final-report-only]",
      );
    }
    const value = argv[++index];
    if (argument === "--root") root = resolve(value);
    else revision = value;
  }
  return Object.freeze({ root, revision, allowFinalReportOnly, worktree, uniquenessOnly });
}

function git(root, args, encoding = "utf8") {
  const result = spawnSync("git", args, { cwd: root, encoding, maxBuffer: GIT_MAX_BUFFER_BYTES });
  if (result.status !== 0) {
    const detail = encoding === "utf8"
      ? (result.stderr || result.stdout || "git command failed").trim()
      : "git command failed";
    throw new Error(detail);
  }
  return result.stdout;
}

function gitWithInput(root, args, input) {
  const result = spawnSync("git", args, {
    cwd: root,
    input,
    encoding: null,
    maxBuffer: GIT_MAX_BUFFER_BYTES,
  });
  if (result.status !== 0) {
    throw new Error((result.stderr?.toString("utf8") || "git command failed").trim());
  }
  return result.stdout;
}

function fungiBlobs(root, revision) {
  if (revision === undefined) return new Map();
  const listing = git(root, ["ls-tree", "-r", "-z", revision], null)
    .toString("utf8")
    .split("\0")
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const match = /^(?:\d+) blob ([0-9a-f]{40})\t(.+)$/u.exec(entry);
      if (match === null) throw new Error("git returned a malformed tree entry");
      return Object.freeze({ oid: match[1], path: match[2] });
    })
    .filter((entry) => FUNGI.test(entry.path));
  if (listing.length === 0) return new Map();

  const bytes = gitWithInput(
    root,
    ["cat-file", "--batch"],
    Buffer.from(listing.map((entry) => entry.oid).join("\n") + "\n", "utf8"),
  );
  const blobs = new Map();
  let offset = 0;
  for (const entry of listing) {
    const headerEnd = bytes.indexOf(0x0a, offset);
    if (headerEnd < 0) throw new Error("git returned a truncated blob header");
    const header = bytes.subarray(offset, headerEnd).toString("utf8");
    const match = /^([0-9a-f]{40}) blob (\d+)$/u.exec(header);
    if (match === null || match[1] !== entry.oid) {
      throw new Error("git returned a malformed blob header");
    }
    const size = Number(match[2]);
    const start = headerEnd + 1;
    const end = start + size;
    if (!Number.isSafeInteger(size) || end >= bytes.length || bytes[end] !== 0x0a) {
      throw new Error("git returned malformed blob bytes");
    }
    blobs.set(entry.path, bytes.subarray(start, end).toString("utf8"));
    offset = end + 1;
  }
  if (offset !== bytes.length) throw new Error("git returned surplus blob bytes");
  return blobs;
}

function auditFungiUniqueness(root, commit, addedFungi) {
  if (addedFungi.length === 0) return;
  const parents = git(root, ["rev-list", "--parents", "-n", "1", commit])
    .trim()
    .split(/\s+/u);
  const parent = parents[1];
  const current = fungiBlobs(root, commit);
  const prior = fungiBlobs(root, parent);
  const exact = new Map();
  const shadows = new Map();

  for (const [path, source] of prior) {
    exact.set(exactFungiFingerprint(source), path);
    shadows.set(alphaFungiFingerprint(source), path);
  }
  for (const path of [...addedFungi].sort()) {
    const source = current.get(path);
    if (source === undefined) throw new Error(`added Fungi file is missing from commit: ${path}`);
    const exactKey = exactFungiFingerprint(source);
    const exactMatch = exact.get(exactKey);
    if (exactMatch !== undefined) {
      throw new Error(`Fungi exact duplicate: ${path} duplicates ${exactMatch}`);
    }
    const shadowKey = alphaFungiFingerprint(source);
    const shadowMatch = shadows.get(shadowKey);
    if (shadowMatch !== undefined) {
      throw new Error(`Fungi template shadow: ${path} shadows ${shadowMatch}`);
    }
    exact.set(exactKey, path);
    shadows.set(shadowKey, path);
  }
}

function worktreeAddedFungi(root) {
  const changed = git(root, ["diff", "--name-only", "--diff-filter=A", "-z", "HEAD"], null)
    .toString("utf8")
    .split("\0")
    .filter((path) => path.length > 0);
  const untracked = git(root, ["ls-files", "--others", "--exclude-standard", "-z"], null)
    .toString("utf8")
    .split("\0")
    .filter((path) => path.length > 0);
  return [...new Set([...changed, ...untracked].filter((path) => FUNGI.test(path)))].sort();
}

function worktreeChangedPaths(root) {
  const changed = git(root, ["diff", "--name-only", "-z", "HEAD"], null)
    .toString("utf8")
    .split("\0")
    .filter((path) => path.length > 0);
  const untracked = git(root, ["ls-files", "--others", "--exclude-standard", "-z"], null)
    .toString("utf8")
    .split("\0")
    .filter((path) => path.length > 0);
  return [...new Set([...changed, ...untracked])].sort();
}

function auditWorktreeFungiUniqueness(root, addedFungi) {
  const prior = fungiBlobs(root, "HEAD");
  const exact = new Map();
  const shadows = new Map();
  for (const [path, source] of prior) {
    exact.set(exactFungiFingerprint(source), path);
    shadows.set(alphaFungiFingerprint(source), path);
  }
  for (const path of addedFungi) {
    const source = readFileSync(join(root, path), "utf8");
    const exactKey = exactFungiFingerprint(source);
    const exactMatch = exact.get(exactKey);
    if (exactMatch !== undefined) {
      throw new Error(`Fungi exact duplicate: ${path} duplicates ${exactMatch}`);
    }
    const shadowKey = alphaFungiFingerprint(source);
    const shadowMatch = shadows.get(shadowKey);
    if (shadowMatch !== undefined) {
      throw new Error(`Fungi template shadow: ${path} shadows ${shadowMatch}`);
    }
    exact.set(exactKey, path);
    shadows.set(shadowKey, path);
  }
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
  const { root, revision, allowFinalReportOnly, worktree, uniquenessOnly } = parseArgs(process.argv.slice(2));
  if (uniquenessOnly && !worktree) throw new Error("--uniqueness-only requires --worktree");
  if (worktree) {
    const reports = worktreeChangedPaths(root).filter((path) => REPORT.test(path));
    if (reports.length > 1) {
      throw new Error(`worktree changes ${reports.length} conversion reports; maximum 1`);
    }
    const fungi = worktreeAddedFungi(root);
    auditWorktreeFungiUniqueness(root, fungi);
    if (uniquenessOnly) {
      console.log(
        `conversion-report-commit: uniqueness-only checked ${fungi.length} new .fungi files; duplication/shadow ${fungi.length}/${fungi.length} unique`,
      );
      process.exit(0);
    }
    if (fungi.length < MINIMUM_FUNGI_FILES) {
      throw new Error(
        `worktree has ${fungi.length} new .fungi files; minimum ${MINIMUM_FUNGI_FILES}; expected ${EXPECTED_FUNGI_FILES}`,
      );
    }
    console.log(
      `conversion-report-commit: worktree has ${fungi.length} new .fungi files; duplication/shadow ${fungi.length}/${fungi.length} unique; minimum ${MINIMUM_FUNGI_FILES}; expected ${EXPECTED_FUNGI_FILES}`,
    );
    process.exit(0);
  }
  const commit = git(root, ["rev-parse", "--verify", `${revision}^{commit}`]).trim();
  if (!/^[0-9a-f]{40}$/u.test(commit)) throw new Error("git returned a malformed commit identity");
  const added = addedPaths(root, commit);
  const changed = changedPaths(root, commit);
  const reports = changed.filter((path) => REPORT.test(path));
  const fungi = added.filter((path) => FUNGI.test(path));
  const short = commit.slice(0, 8);
  if (reports.length > 1) {
    throw new Error(`conversion commit ${short} added ${reports.length} conversion reports; maximum 1`);
  }
  auditFungiUniqueness(root, commit, fungi);

  if (reports.length === 0) {
    console.log(
      `conversion-report-commit: ${short} has no added conversion reports; ${fungi.length} added .fungi files; duplication/shadow ${fungi.length}/${fungi.length} unique`,
    );
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
    `conversion-report-commit: ${short} added ${reports.length} report(s) and ${fungi.length} added .fungi files; duplication/shadow ${fungi.length}/${fungi.length} unique; minimum ${MINIMUM_FUNGI_FILES}; expected ${EXPECTED_FUNGI_FILES}`,
  );
} catch (error) {
  console.error(`REFUSED: ${error instanceof Error ? error.message : "conversion-report commit audit failed"}`);
  process.exit(1);
}
