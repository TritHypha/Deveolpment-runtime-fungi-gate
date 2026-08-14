import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { SandboxRefusal, codeUnitCompare } from "./contracts.mjs";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort(codeUnitCompare).map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function canonicalJson(value) {
  const result = JSON.stringify(canonicalize(value));
  if (result === undefined) throw new SandboxRefusal("JOURNAL_VALUE_INVALID", "outcome cannot be represented as canonical JSON");
  return result;
}

function recordIdentity(record) {
  const file = record?.source?.file;
  const symbol = record?.source?.symbol;
  const build = record?.source?.sourceBuildPoint;
  return typeof file === "string" && typeof symbol === "string" && typeof build === "string"
    ? `${build}:${file}#${symbol}`
    : canonicalJson(record);
}

export async function appendOutcomeRecord(path, record) {
  const line = canonicalJson(record);
  await mkdir(dirname(path), { recursive: true });
  let existing = "";
  try {
    existing = await readFile(path, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const wanted = recordIdentity(record);
  for (const priorLine of existing.split("\n").filter(Boolean)) {
    let prior;
    try {
      prior = JSON.parse(priorLine);
    } catch {
      throw new SandboxRefusal("JOURNAL_TAMPERED", "existing journal is not canonical JSONL");
    }
    if (canonicalJson(prior) !== priorLine) throw new SandboxRefusal("JOURNAL_TAMPERED", "existing journal line is not canonical");
    if (recordIdentity(prior) === wanted) throw new SandboxRefusal("JOURNAL_DUPLICATE", "outcome already exists for this exact source identity");
  }
  await writeFile(path, `${existing}${line}\n`, { encoding: "utf8", flag: existing === "" ? "wx" : "w" });
}
