import { link, mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

import { LogicAnalysisError } from "./contracts.mjs";

export function canonicalAnalysisJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalAnalysisJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalAnalysisJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function atomicWriteAnalysis(path, value) {
  const target = resolve(path);
  const parent = dirname(target);
  const temp = resolve(parent, `.${basename(target)}.${process.pid}.tmp`);
  await mkdir(parent, { recursive: true });
  try {
    await writeFile(temp, `${canonicalAnalysisJson(value)}\n`, { flag: "wx" });
    await link(temp, target);
  } catch (error) {
    if (error?.code === "EEXIST") throw new LogicAnalysisError("OUTPUT_EXISTS", "analysis destination already exists");
    throw error;
  } finally {
    await unlink(temp).catch(() => {});
  }
}
