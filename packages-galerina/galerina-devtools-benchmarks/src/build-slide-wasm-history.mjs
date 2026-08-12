import { createHash } from "node:crypto";
import { lstatSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildSlideWasmHistoryHtml, buildSlideWasmHistoryModel } from "./slide-wasm-history-report.mjs";
import { publicationStamp } from "./slide-zero-publication.mjs";

const MAX_RESULT_BYTES = 4 * 1024 * 1024;
const MAX_METADATA_BYTES = 128 * 1024;

function readBoundedRegular(path, maximum, label) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new TypeError(`${label} must be a regular single-link file`);
  if (stat.size <= 0 || stat.size > maximum) throw new TypeError(`${label} size is outside the admitted range`);
  return readFileSync(path, "utf8");
}

function parseJson(raw, label) {
  try {
    return JSON.parse(raw);
  } catch {
    throw new TypeError(`${label} must be valid JSON`);
  }
}

function sha256(raw) {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function relativeSource(resultsDir, path) {
  return `results/${relative(resultsDir, path).split(sep).join("/")}`;
}

function writeAtomic(path, content) {
  const temporary = `${path}.tmp-${process.pid}`;
  try {
    writeFileSync(temporary, content, { encoding: "utf8", flag: "wx" });
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}

export function publishSlideWasmHistoryArtifact({ resultsDir }) {
  if (typeof resultsDir !== "string" || resultsDir.length === 0) throw new TypeError("resultsDir must be a path");
  const latestMetadataPath = join(resultsDir, "benchmark-run-metadata-latest.json");
  const latestMetadataRaw = readBoundedRegular(latestMetadataPath, MAX_METADATA_BYTES, "latest benchmark metadata");
  const latestMetadata = parseJson(latestMetadataRaw, "latest benchmark metadata");
  const stamp = publicationStamp(
    latestMetadata.publication === undefined
      ? latestMetadata.generatedAt
      : latestMetadata.publication.generatedAt,
  );
  const runDirectory = join(resultsDir, "runs", stamp);
  const datedMetadataPath = join(runDirectory, "metadata.json");
  const datedMetadataRaw = readBoundedRegular(datedMetadataPath, MAX_METADATA_BYTES, "dated benchmark metadata");
  if (datedMetadataRaw !== latestMetadataRaw) throw new TypeError("latest and dated benchmark metadata differ");
  const metadata = parseJson(datedMetadataRaw, "dated benchmark metadata");

  const archiveDirectory = join(resultsDir, "archive", metadata.wasmReference.archiveDirectory);
  const wasmResultsPath = join(archiveDirectory, "results.json");
  const wasmMetaPath = join(archiveDirectory, "meta.json");
  const currentResultsPath = join(runDirectory, "results.json");
  const wasmRaw = readBoundedRegular(wasmResultsPath, MAX_RESULT_BYTES, "historic Wasm results");
  const currentRaw = readBoundedRegular(currentResultsPath, MAX_RESULT_BYTES, "current benchmark results");
  const wasmMetaRaw = readBoundedRegular(wasmMetaPath, MAX_METADATA_BYTES, "historic Wasm metadata");
  const wasmDigest = sha256(wasmRaw);
  const currentDigest = sha256(currentRaw);
  if (wasmDigest !== metadata.wasmReference.archiveResultsSha256) throw new TypeError("historic Wasm result digest mismatch");
  if (currentDigest !== metadata.resultSha256) throw new TypeError("current result digest mismatch");

  const model = buildSlideWasmHistoryModel({
    wasmArchive: parseJson(wasmRaw, "historic Wasm results"),
    current: parseJson(currentRaw, "current benchmark results"),
    metadata,
    archiveMeta: parseJson(wasmMetaRaw, "historic Wasm metadata"),
    sources: {
      wasmResults: { path: relativeSource(resultsDir, wasmResultsPath), sha256: wasmDigest },
      slideResults: { path: relativeSource(resultsDir, currentResultsPath), sha256: currentDigest },
      wasmMeta: { path: relativeSource(resultsDir, wasmMetaPath), sha256: sha256(wasmMetaRaw) },
    },
  });
  const outputPath = join(resultsDir, "benchmark-slide-vs-wasm-history-latest.html");
  writeAtomic(outputPath, buildSlideWasmHistoryHtml(model));
  return Object.freeze({ outputPath, status: model.status });
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
  const result = publishSlideWasmHistoryArtifact({ resultsDir: join(packageRoot, "results") });
  process.stdout.write(`${JSON.stringify({ status: result.status, output: "results/benchmark-slide-vs-wasm-history-latest.html" })}\n`);
}
