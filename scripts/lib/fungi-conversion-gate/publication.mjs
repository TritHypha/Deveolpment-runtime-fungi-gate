import { link, mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function atomicWriteRunCard(path, card) {
  const target = resolve(path);
  const parent = dirname(target);
  const temp = resolve(parent, `.${basename(target)}.${process.pid}.tmp`);
  await mkdir(parent, { recursive: true });
  try {
    await writeFile(temp, `${canonicalJson(card)}\n`, { flag: "wx" });
    await link(temp, target);
  } catch (error) {
    if (error?.code === "EEXIST") throw new Error("run-card destination already exists");
    throw error;
  } finally {
    await unlink(temp).catch(() => {});
  }
}
