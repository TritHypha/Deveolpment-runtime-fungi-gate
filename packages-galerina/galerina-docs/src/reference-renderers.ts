import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import { assertReferenceManifestIntegrity } from "./reference-manifest.js";
import type { GalerinaReferenceManifest, ReferenceDeclaration } from "./reference-types.js";

export type GraphLinkConfidence = "ASSERTED" | "INFERRED";

export interface ReferenceGraphLink {
  readonly qualifiedName: string;
  readonly caller: string;
  readonly confidence: GraphLinkConfidence;
}

export interface ReferenceGraphEnvelope {
  readonly buildPoint: string;
  readonly fresh: boolean;
  readonly links: readonly ReferenceGraphLink[];
}

export interface ReferenceRenderOptions {
  readonly graph?: ReferenceGraphEnvelope;
}

export interface ReferenceOutputFile {
  readonly path: string;
  readonly content: string;
}

export type ReferencePublicationErrorCode = "OUTPUT_COLLISION" | "STALE_OUTPUT" | "PUBLICATION_ERROR";

export class ReferencePublicationError extends Error {
  readonly code: ReferencePublicationErrorCode;

  constructor(code: ReferencePublicationErrorCode, message: string) {
    super(`[${code}] ${message}`);
    this.name = "ReferencePublicationError";
    this.code = code;
  }
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function packageSlug(packageName: string): string {
  return packageName.replace(/^@/u, "").replace(/[^A-Za-z0-9-]+/gu, "-").replace(/-+/gu, "-");
}

function anchor(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
}

function escapeHtml(value: string): string {
  return value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;");
}

function admittedLinks(manifest: GalerinaReferenceManifest, options: ReferenceRenderOptions): readonly ReferenceGraphLink[] {
  const graph = options.graph;
  if (graph === undefined || !graph.fresh || graph.buildPoint !== manifest.buildPoint) return [];
  const declarations = new Set(manifest.declarations.map((entry) => entry.qualifiedName));
  return graph.links.filter((link) => declarations.has(link.qualifiedName) && (link.confidence === "ASSERTED" || link.confidence === "INFERRED"))
    .sort((left, right) => compareCodeUnits(`${left.qualifiedName}\0${left.caller}\0${left.confidence}`, `${right.qualifiedName}\0${right.caller}\0${right.confidence}`));
}

function renderDeclarationMarkdown(declaration: ReferenceDeclaration, links: readonly ReferenceGraphLink[]): string {
  const typeLinks = declaration.typeLinks.length === 0 ? "none" : declaration.typeLinks.map((type) => `[${type}](#${anchor(type)})`).join(", ");
  const callers = links.filter((link) => link.qualifiedName === declaration.qualifiedName)
    .map((link) => `- ${link.confidence}: \`${link.caller}\``).join("\n");
  return `### ${declaration.name}\n\n` +
    `- Kind: \`${declaration.kind}\`\n` +
    `- Signature: \`${declaration.signature.replace(/`/gu, "\\`")}\`\n` +
    `- Types: ${typeLinks}\n` +
    `- Source: \`${declaration.locator.file}:${declaration.locator.line}\` (bytes ${declaration.locator.byteStart}-${declaration.locator.byteEnd})\n` +
    (callers === "" ? "" : `- Graph callers (${declaration.locator.sourceSha256.slice(0, 12)} source pin):\n${callers}\n`) + "\n";
}

function renderPackageMarkdown(manifest: GalerinaReferenceManifest, packageName: string, links: readonly ReferenceGraphLink[]): string {
  const declarations = manifest.declarations.filter((entry) => entry.packageName === packageName);
  return `# ${packageName} reference\n\n` +
    `Generated from checked Galerina AST at build \`${manifest.buildPoint}\`. Do not edit.\n\n` +
    declarations.map((entry) => renderDeclarationMarkdown(entry, links)).join("");
}

function renderRootMarkdown(manifest: GalerinaReferenceManifest, packages: readonly { readonly name: string; readonly slug: string }[], links: readonly ReferenceGraphLink[]): string {
  return "# Galerina checked reference\n\n" +
    `Manifest: \`${manifest.manifestSha256}\`  \nBuild point: \`${manifest.buildPoint}\`\n\n` +
    "## Packages\n\n" + packages.map((entry) => `- [${entry.name}](packages/${entry.slug}.md)`).join("\n") + "\n\n" +
    "## Declarations\n\n" + manifest.declarations.map((entry) => renderDeclarationMarkdown(entry, links)).join("");
}

function renderHtml(manifest: GalerinaReferenceManifest, links: readonly ReferenceGraphLink[]): string {
  const items = manifest.declarations.map((entry) => {
    const callers = links.filter((link) => link.qualifiedName === entry.qualifiedName)
      .map((link) => `<li>${escapeHtml(link.confidence)}: <code>${escapeHtml(link.caller)}</code></li>`).join("");
    return `<article id="${anchor(entry.qualifiedName)}"><h2>${escapeHtml(entry.name)}</h2><p><strong>${escapeHtml(entry.kind)}</strong></p><pre>${escapeHtml(entry.signature)}</pre><p><code>${escapeHtml(entry.locator.file)}:${entry.locator.line}</code></p>${callers === "" ? "" : `<ul>${callers}</ul>`}</article>`;
  }).join("");
  return "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Galerina checked reference</title><style>body{font:16px system-ui;max-width:72rem;margin:auto;padding:2rem}article{border-top:1px solid #ccc;padding:1rem 0}pre{white-space:pre-wrap;background:#f5f5f5;padding:.75rem}</style></head>" +
    `<body><h1>Galerina checked reference</h1><p>Build <code>${manifest.buildPoint}</code></p>${items}</body></html>\n`;
}

export function buildReferenceOutputFiles(manifest: GalerinaReferenceManifest, options: ReferenceRenderOptions = {}): readonly ReferenceOutputFile[] {
  assertReferenceManifestIntegrity(manifest);
  const serialised = JSON.stringify(manifest);
  if (serialised.includes("-PRIVATE") || /[A-Za-z]:\\\\|\/Users\//u.test(serialised)) {
    throw new ReferencePublicationError("PUBLICATION_ERROR", "private marker or absolute path reached the admitted manifest");
  }
  const packageNames = [...new Set(manifest.declarations.map((entry) => entry.packageName))].sort(compareCodeUnits);
  const packages = packageNames.map((name) => ({ name, slug: packageSlug(name) }));
  const folded = new Set<string>();
  for (const entry of packages) {
    const key = entry.slug.toLowerCase();
    if (entry.slug === "" || folded.has(key)) throw new ReferencePublicationError("OUTPUT_COLLISION", `package output collision for ${entry.name}`);
    folded.add(key);
  }
  const links = admittedLinks(manifest, options);
  const files: ReferenceOutputFile[] = [
    { path: "README.md", content: renderRootMarkdown(manifest, packages, links) },
    { path: "index.html", content: renderHtml(manifest, links) },
    ...packages.map((entry) => ({ path: `packages/${entry.slug}.md`, content: renderPackageMarkdown(manifest, entry.name, links) })),
    { path: "reference.json", content: `${JSON.stringify(manifest, null, 2)}\n` },
  ];
  return files.sort((left, right) => compareCodeUnits(left.path, right.path));
}

async function listFiles(root: string, prefix = ""): Promise<string[]> {
  const entries = await readdir(join(root, prefix), { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new ReferencePublicationError("STALE_OUTPUT", `symbolic link in output tree: ${rel}`);
    if (entry.isDirectory()) files.push(...await listFiles(root, rel));
    else if (entry.isFile()) files.push(rel);
    else throw new ReferencePublicationError("STALE_OUTPUT", `unsupported output entry: ${rel}`);
  }
  return files.sort(compareCodeUnits);
}

export async function publishReferenceOutputTree(input: {
  readonly manifest: GalerinaReferenceManifest;
  readonly outDir: string;
  readonly mode: "write" | "check";
  readonly options?: ReferenceRenderOptions;
}): Promise<void> {
  const files = buildReferenceOutputFiles(input.manifest, input.options);
  if (input.mode === "check") {
    try {
      const stat = await lstat(input.outDir);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new ReferencePublicationError("STALE_OUTPUT", "output root is not an ordinary directory");
      const actualPaths = await listFiles(input.outDir);
      const expectedPaths = files.map((entry) => entry.path);
      if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) throw new ReferencePublicationError("STALE_OUTPUT", "output file set differs from the admitted manifest");
      for (const file of files) {
        if (await readFile(join(input.outDir, ...file.path.split("/")), "utf8") !== file.content) {
          throw new ReferencePublicationError("STALE_OUTPUT", `generated output is stale: ${file.path}`);
        }
      }
      return;
    } catch (error) {
      if (error instanceof ReferencePublicationError) throw error;
      throw new ReferencePublicationError("STALE_OUTPUT", `generated output is unavailable: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  try {
    await lstat(input.outDir);
    throw new ReferencePublicationError("OUTPUT_COLLISION", "output root already exists; check it or choose a new root");
  } catch (error) {
    if (error instanceof ReferencePublicationError) throw error;
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new ReferencePublicationError("PUBLICATION_ERROR", error instanceof Error ? error.message : String(error));
  }

  const parent = dirname(input.outDir);
  await mkdir(parent, { recursive: true });
  const temp = await mkdtemp(join(parent, `.${basename(input.outDir)}.tmp-`));
  try {
    for (const file of files) {
      const target = join(temp, ...file.path.split("/"));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content, { encoding: "utf8", flag: "wx" });
    }
    await rename(temp, input.outDir);
  } catch (error) {
    await rm(temp, { recursive: true, force: true });
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new ReferencePublicationError("OUTPUT_COLLISION", "output publication collided with an existing path");
    throw new ReferencePublicationError("PUBLICATION_ERROR", error instanceof Error ? error.message : String(error));
  }
}
