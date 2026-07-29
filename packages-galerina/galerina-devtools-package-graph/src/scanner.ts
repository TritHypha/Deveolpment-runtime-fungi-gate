/**
 * scanner.ts — extract the import surface of a single package
 *
 * Walks the package's SOURCE ROOTS and, for each file, extracts every import/export
 * specifier. Each specifier is classified into one of four kinds so the graph can
 * separate INTERNAL structure from the EXTERNAL boundary:
 *
 *   internal   — relative path that resolves INSIDE the package  ("./x", "../y")
 *   node_core  — Node.js built-in                                ("node:fs", "fs")
 *   workspace  — sibling Galerina package                          ("@galerina/...")
 *   thirdparty — any other bare specifier                        ("axios", "lodash")
 *
 * Scope (roots × extensions):
 *   A Galerina package's real source is not always `src/**\/*.ts`. The canonical app
 *   template keeps its governed compute in `src/**\/*.fungi` and its TypeScript host in
 *   `host/**\/*.ts` (see the framework example app). Hardcoding `src/*.ts` made those
 *   packages scan to ZERO files — a green Hardened Border over an UNSCANNED package,
 *   so import drift in `.fungi` flows or in `host/` never reached the PR diff. So we
 *   walk a configurable set of roots (default `src`, `host`) and extensions
 *   (default `.ts`, `.fungi`). A package may override either via a `packageGraph`
 *   block in its package.json:
 *       "packageGraph": { "roots": ["src", "host"], "extensions": [".ts", ".fungi"] }
 *
 * Escaping relative imports are a BORDER edge, not internal:
 *   A relative import that resolves OUTSIDE the package root (e.g. host code importing
 *   `../../galerina-framework-app-kernel/dist/index.js`) crosses the package boundary.
 *   Classifying it `internal` would silently DROP it (it resolves to no node in this
 *   package) — the cross-package dependency would be invisible to the border gate. We
 *   resolve such an import to the sibling package that owns it and record it as a
 *   workspace/thirdparty border dependency keyed by that package's NAME (stable across
 *   the importing file's depth, and identical whether the import is written as a
 *   relative path or the bare `@galerina/...` specifier).
 *
 * Regex-based (no TypeScript-compiler dependency) to keep the tool dependency-light
 * and aligned with the existing scan-and-report devtools pattern. It recognises:
 *   import ... from "spec"      import "spec"      export ... from "spec"
 *   import("spec")  (dynamic)   import plugin <mode> "spec" as Name { … }  (.fungi)
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, normalize, relative, resolve, sep } from "node:path";

export type EdgeKind = "internal" | "node_core" | "workspace" | "thirdparty";

export interface FileImport {
  readonly specifier: string;   // raw module specifier as written, OR — for an escaping
                                // relative import — the resolved sibling package name
  readonly kind: EdgeKind;
  readonly resolved?: string;   // for internal/escaping: normalised package-relative target (best-effort)
}

export interface ScannedFile {
  readonly path: string;        // package-relative posix path, e.g. "host/server.ts"
  readonly imports: readonly FileImport[];
  readonly exportsFrom: readonly string[]; // re-export specifiers (for index surface)
}

export interface ScanResult {
  readonly packageName: string;
  readonly scopePath: string;   // absolute scope root
  readonly roots: readonly string[];       // source roots actually scanned (those that exist)
  readonly extensions: readonly string[];  // source extensions scanned
  readonly files: readonly ScannedFile[];
  readonly entryPoints: readonly string[];
  readonly loadedAssets: readonly string[];
  readonly allowOrphans: readonly AllowedOrphan[];
}

export interface AllowedOrphan {
  readonly path: string;
  readonly reason: string;
}

export interface PackageGraphConfig {
  readonly roots?: readonly string[];
  readonly extensions?: readonly string[];
  readonly entryPoints?: readonly string[];
  readonly loadedAssets?: readonly string[];
  readonly allowOrphans?: readonly AllowedOrphan[];
}

/** Default source roots — the canonical app template puts governed source in src/ and its host in host/. */
const DEFAULT_ROOTS = ["src", "host"] as const;
/** Default source extensions — TypeScript host code AND governed Galerina flows. */
const DEFAULT_EXTENSIONS = [".ts", ".fungi"] as const;

const NODE_BUILTINS = new Set([
  "assert", "buffer", "child_process", "cluster", "console", "crypto", "dgram",
  "dns", "events", "fs", "http", "http2", "https", "net", "os", "path", "perf_hooks",
  "process", "querystring", "readline", "stream", "string_decoder", "timers", "tls",
  "tty", "url", "util", "v8", "vm", "worker_threads", "zlib",
]);

/** First-pass, string-only classification. Relative specifiers are refined later (escape check). */
function classify(specifier: string): EdgeKind {
  if (specifier.startsWith("./") || specifier.startsWith("../")) return "internal";
  if (specifier.startsWith("node:")) return "node_core";
  const bare = specifier.split("/")[0] ?? specifier;
  if (NODE_BUILTINS.has(bare)) return "node_core";
  if (specifier.startsWith("@galerina/")) return "workspace";
  return "thirdparty";
}

// Matches: from "x" | import "x" | import("x") — single or double quotes.
const IMPORT_RE = /(?:import|export)\s+(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;
// Re-export form specifically: export ... from "x"
const REEXPORT_RE = /export\s+(?:\*|\{[^}]*\})\s+from\s+["']([^"']+)["']/g;
// Galerina plugin import: import plugin safe|assimilate "spec" as Name { … } — IMPORT_RE does
// NOT match this (the `plugin <mode>` words sit between `import` and the quote).
const PLUGIN_IMPORT_RE = /import\s+plugin\s+\S+\s+["']([^"']+)["']/g;

/**
 * Reject false-positive "specifiers" that come from code that EMITS code rather
 * than from a real ES import. The scanner is deliberately regex-based (no TS
 * compiler), so it cannot tell a genuine `import`/`export` statement from one of
 * the same keywords sitting inside a template literal that generates source for
 * another target. The WASM-text emitter is the canonical offender, e.g.
 *   `(import "${imp.module}" "${imp.name}" ...)`   `(export "memory" (memory 0))`
 *   `(export "${fn.name}" (func $${fn.name}))`
 * which the regex would otherwise read as `import "…"` / `export "…"` specifiers
 * and leak into the boundary allowlist.
 *
 * Two discriminators, both of which only ever exclude non-ES strings:
 *   1. Unexpanded template interpolation (`${…}`) can never be a real specifier.
 *   2. A static `import "x"` / `export "x"` match (capture group 1) whose keyword
 *      is immediately preceded by `(` is a WAT/S-expression form — `(import …)` /
 *      `(export …)` — never an ES statement (ES has no bare `export "x"`, and a
 *      real side-effect `import "x"` is never written `(import`). The dynamic
 *      `import("x")` form (capture group 2) is left untouched.
 */
function isRealSpecifier(spec: string, m: RegExpExecArray, src: string): boolean {
  if (spec.includes("${")) return false;
  if (m[1] !== undefined && src[m.index - 1] === "(") return false;
  return true;
}

/** Recursively list source files under `dir` matching `extensions` (skipping node_modules/dist and .d.ts). */
function listSourceFiles(dir: string, extensions: readonly string[]): string[] {
  const out: string[] = [];
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const full = join(dir, name);
    let s;
    try { s = statSync(full); } catch { continue; }
    if (s.isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      out.push(...listSourceFiles(full, extensions));
    } else if (isSourceFile(name, extensions)) {
      out.push(full);
    }
  }
  return out;
}

function isSourceFile(name: string, extensions: readonly string[]): boolean {
  if (name.endsWith(".d.ts")) return false; // declaration files are not the import surface
  return extensions.some((ext) => name.endsWith(ext));
}

interface PackageMeta {
  readonly name: string;
  readonly roots: readonly string[];
  readonly extensions: readonly string[];
  readonly entryPoints: readonly string[];
  readonly loadedAssets: readonly string[];
  readonly allowOrphans: readonly AllowedOrphan[];
}

/** Read the package name and (optional) `packageGraph` scan config. A provided config REPLACES the default. */
function readPackageMeta(scopePath: string): PackageMeta {
  let pkg: unknown;
  try {
    pkg = JSON.parse(readFileSync(join(scopePath, "package.json"), "utf-8"));
  } catch (error) {
    throw new Error(`package.json is missing or unreadable: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isRecord(pkg)) throw new Error("package.json must contain a JSON object");

  const name = typeof pkg.name === "string" && pkg.name.length > 0 ? pkg.name : scopePath;
  if (pkg.packageGraph !== undefined && !isRecord(pkg.packageGraph)) {
    throw new Error("packageGraph must be a JSON object");
  }
  const cfg = (pkg.packageGraph ?? {}) as Record<string, unknown>;
  return {
    name,
    roots: configuredStrings(cfg, "roots", DEFAULT_ROOTS, false),
    extensions: configuredStrings(cfg, "extensions", DEFAULT_EXTENSIONS, false),
    entryPoints: configuredStrings(cfg, "entryPoints", [], true),
    loadedAssets: configuredStrings(cfg, "loadedAssets", [], true),
    allowOrphans: configuredAllowedOrphans(cfg.allowOrphans),
  };
}

/** A non-empty array of non-empty strings, or null (→ caller uses the default). Guards a malformed config. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function configuredStrings(
  cfg: Record<string, unknown>,
  key: string,
  fallback: readonly string[],
  allowEmpty: boolean,
): string[] {
  if (!(key in cfg)) return [...fallback];
  const value = cfg[key];
  if (!Array.isArray(value) ||
      (!allowEmpty && value.length === 0) ||
      !value.every((item) => typeof item === "string" && item.length > 0)) {
    throw new Error(`packageGraph.${key} must be ${allowEmpty ? "an" : "a non-empty"} array of non-empty strings`);
  }
  return [...value] as string[];
}

function configuredAllowedOrphans(value: unknown): AllowedOrphan[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("packageGraph.allowOrphans must be an array");
  return value.map((entry, index) => {
    if (!isRecord(entry) ||
        typeof entry.path !== "string" || entry.path.length === 0 ||
        typeof entry.reason !== "string" || entry.reason.trim().length === 0) {
      throw new Error(`packageGraph.allowOrphans[${index}] must contain non-empty path and reason strings`);
    }
    return { path: entry.path, reason: entry.reason };
  });
}

function canonicalDeclaredPath(
  scopePath: string,
  kind: "entryPoints" | "loadedAssets" | "allowOrphans",
  path: string,
): string {
  const posix = path.replace(/\\/g, "/");
  if (path !== posix || posix.length === 0 || isAbsolute(path) || /^[A-Za-z]:/.test(posix)) {
    throw new Error(`packageGraph.${kind} path '${path}' must be a canonical package-relative path inside the package`);
  }
  const canonical = normalize(posix).split(sep).join("/");
  if (canonical !== posix || canonical === ".") {
    throw new Error(`packageGraph.${kind} path '${path}' must be canonical`);
  }
  if (canonical === ".." || canonical.startsWith("../")) {
    throw new Error(`packageGraph.${kind} path '${path}' must be inside the package`);
  }
  const absolute = resolve(scopePath, canonical);
  const fromScope = relative(scopePath, absolute).split(sep).join("/");
  if (fromScope === ".." || fromScope.startsWith("../")) {
    throw new Error(`packageGraph.${kind} path '${path}' must be inside the package`);
  }
  if (!existsSync(absolute)) {
    throw new Error(`packageGraph.${kind} path '${path}' does not exist`);
  }
  let fileStat;
  try { fileStat = statSync(absolute); } catch {
    throw new Error(`packageGraph.${kind} path '${path}' cannot be inspected`);
  }
  if (!fileStat.isFile()) {
    throw new Error(`packageGraph.${kind} path '${path}' must identify a file`);
  }
  return canonical;
}

function validateOwnership(
  scopePath: string,
  meta: PackageMeta,
  nodeSet: ReadonlySet<string>,
): Pick<ScanResult, "entryPoints" | "loadedAssets" | "allowOrphans"> {
  const declared = new Map<string, string>();
  const validate = (
    kind: "entryPoints" | "loadedAssets" | "allowOrphans",
    path: string,
  ): string => {
    const canonical = canonicalDeclaredPath(scopePath, kind, path);
    if (!nodeSet.has(canonical)) {
      throw new Error(`packageGraph.${kind} path '${path}' is not part of the scanned node set`);
    }
    const previous = declared.get(canonical);
    if (previous !== undefined) {
      throw new Error(`packageGraph path '${canonical}' is declared more than once (${previous}, ${kind})`);
    }
    declared.set(canonical, kind);
    return canonical;
  };

  const configuredEntryPoints = meta.entryPoints.map((path) => validate("entryPoints", path));
  const loadedAssets = meta.loadedAssets.map((path) => validate("loadedAssets", path));
  const allowOrphans = meta.allowOrphans.map((entry) => ({
    path: validate("allowOrphans", entry.path),
    reason: entry.reason,
  }));
  const builtInEntryPoints = meta.roots
    .flatMap((root) => [`${root}/index.ts`, `${root}/cli.ts`])
    .filter((path) => nodeSet.has(path) && !declared.has(path));

  return {
    entryPoints: [...builtInEntryPoints, ...configuredEntryPoints].sort(),
    loadedAssets: loadedAssets.sort(),
    allowOrphans: allowOrphans.sort((a, b) => a.path.localeCompare(b.path)),
  };
}

/** Strip line and block comments so commented-out imports are not counted. `;;` is a Galerina line comment. */
function stripComments(src: string, isFungi: boolean): string {
  let out = src
    .replace(/\/\*[\s\S]*?\*\//g, "")       // block comments
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");  // line comments (avoid eating "://")
  if (isFungi) out = out.replace(/;;[^\n]*/g, ""); // Galerina govComment line comments
  return out;
}

/**
 * Walk up from `absTarget` to the nearest package.json and return the owning package's
 * border identity. Memoised by directory. Returns null if no named package.json is found
 * (caller fails CLOSED — surfaces the raw specifier as thirdparty rather than dropping it).
 */
function resolveOwningPackage(
  absTarget: string,
  cache: Map<string, OwningPackage | null>,
): OwningPackage | null {
  let dir = dirname(absTarget);
  const visited: string[] = [];
  for (let i = 0; i < 64; i++) {
    if (cache.has(dir)) {
      const hit = cache.get(dir)!;
      for (const v of visited) cache.set(v, hit);
      return hit;
    }
    visited.push(dir);
    const pj = join(dir, "package.json");
    if (existsSync(pj)) { // perf-allow: loop-sync-io — package.json walk-up probes a different ancestor dir each iteration (bounded, memoised by dir)
      let result: OwningPackage | null = null;
      try {
        const name = JSON.parse(readFileSync(pj, "utf-8")).name; // perf-allow — loop-sync-io + loop-json-parse: reads & parses each ancestor's own package.json once (distinct file per iteration, not a constant)
        if (typeof name === "string" && name.length > 0) {
          result = { name, kind: name.startsWith("@galerina/") ? "workspace" : "thirdparty" };
        }
      } catch { /* unreadable package.json → null (fail-closed in caller) */ }
      for (const v of visited) cache.set(v, result);
      return result;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  for (const v of visited) cache.set(v, null);
  return null;
}

interface OwningPackage {
  readonly name: string;
  readonly kind: "workspace" | "thirdparty";
}

export function scanPackage(scopePath: string): ScanResult {
  const meta = readPackageMeta(scopePath);

  // Roots that actually exist on disk (a configured-but-absent root is simply skipped).
  const roots = meta.roots.filter((r) => existsSync(join(scopePath, r)));
  const sourceFiles = roots.flatMap((r) => listSourceFiles(join(scopePath, r), meta.extensions));
  const pkgCache = new Map<string, OwningPackage | null>();

  const files: ScannedFile[] = sourceFiles.map((abs) => {
    const isFungi = abs.endsWith(".fungi");
    const raw = stripComments(readFileSync(abs, "utf-8"), isFungi); // perf-allow: loop-sync-io — one-shot package source-tree scan, reads a different file each iteration (N = source file count)
    const relPath = relative(scopePath, abs).split(sep).join("/");

    const imports: FileImport[] = [];
    const seen = new Set<string>();

    // Dedup + classify a single specifier, refining a relative import into either an
    // internal edge (resolves inside the package) or a border edge (escapes it).
    const addSpec = (spec: string): void => {
      if (!spec || seen.has(spec)) return;
      seen.add(spec);

      const kind = classify(spec);
      if (kind !== "internal") {
        imports.push({ specifier: spec, kind });
        return;
      }

      const absTarget = resolve(dirname(abs), spec);
      const relTarget = relative(scopePath, absTarget).split(sep).join("/");
      const escapes = relTarget === ".." || relTarget.startsWith("../");
      if (!escapes) {
        imports.push({ specifier: spec, kind: "internal", resolved: relTarget });
        return;
      }

      // Border edge: attribute it to the sibling package that owns the target.
      const owner = resolveOwningPackage(absTarget, pkgCache);
      if (owner) {
        imports.push({ specifier: owner.name, kind: owner.kind, resolved: relTarget });
      } else {
        // Unknown escaping target — fail-closed: surface it (never drop a border-crossing import).
        imports.push({ specifier: spec, kind: "thirdparty", resolved: relTarget });
      }
    };

    let m: RegExpExecArray | null;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(raw)) !== null) {
      const spec = m[1] ?? m[2];
      if (!spec || !isRealSpecifier(spec, m, raw)) continue;
      addSpec(spec);
    }
    PLUGIN_IMPORT_RE.lastIndex = 0;
    while ((m = PLUGIN_IMPORT_RE.exec(raw)) !== null) {
      const spec = m[1];
      if (!spec || spec.includes("${")) continue;
      addSpec(spec);
    }

    const exportsFrom: string[] = [];
    REEXPORT_RE.lastIndex = 0;
    while ((m = REEXPORT_RE.exec(raw)) !== null) {
      if (m[1]) exportsFrom.push(m[1]);
    }

    return { path: relPath, imports, exportsFrom };
  });

  const ownership = validateOwnership(scopePath, meta, new Set(files.map((file) => file.path)));
  return {
    packageName: meta.name,
    scopePath,
    roots,
    extensions: meta.extensions,
    files,
    ...ownership,
  };
}
