import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const UTC_STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

function writeAtomic(path, content) {
  const temporary = `${path}.tmp-${process.pid}`;
  try {
    writeFileSync(temporary, content, { encoding: "utf8", flag: "wx" });
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}

export function publicationStamp(generatedAt) {
  if (typeof generatedAt !== "string" || !UTC_STAMP.test(generatedAt)) {
    throw new TypeError("generatedAt must be a UTC ISO timestamp");
  }
  return generatedAt.replaceAll(":", "-").replace(".", "-");
}

export function publishSlideZeroArtifacts({ resultsDir, generatedAt, latestRaw, metadata, chart, table }) {
  if (typeof resultsDir !== "string" || resultsDir.length === 0) throw new TypeError("resultsDir must be a path");
  for (const [label, value] of Object.entries({ latestRaw, chart, table })) {
    if (typeof value !== "string" || value.length === 0) throw new TypeError(`${label} must be non-empty text`);
  }
  const stamp = publicationStamp(generatedAt);
  const relativeRunDirectory = `runs/${stamp}`;
  const runsDirectory = join(resultsDir, "runs");
  const finalDirectory = join(runsDirectory, stamp);
  if (existsSync(finalDirectory)) throw new Error(`dated run directory already exists: ${relativeRunDirectory}`);
  mkdirSync(runsDirectory, { recursive: true });
  const temporaryDirectory = join(runsDirectory, `.${stamp}.tmp-${process.pid}`);
  mkdirSync(temporaryDirectory, { recursive: false });
  try {
    writeFileSync(join(temporaryDirectory, "results.json"), latestRaw, "utf8");
    writeFileSync(join(temporaryDirectory, "benchmark-slide-zero-chart.html"), chart, "utf8");
    writeFileSync(join(temporaryDirectory, "benchmark-slide-zero-table.html"), table, "utf8");
    writeFileSync(join(temporaryDirectory, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    renameSync(temporaryDirectory, finalDirectory);
  } catch (error) {
    rmSync(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }

  writeAtomic(join(resultsDir, "benchmark-slide-zero-latest.html"), chart);
  writeAtomic(join(resultsDir, "benchmark-slide-zero-table-latest.html"), table);
  writeAtomic(join(resultsDir, "benchmark-run-metadata-latest.json"), `${JSON.stringify(metadata, null, 2)}\n`);
  return Object.freeze({ runDirectory: relativeRunDirectory });
}
