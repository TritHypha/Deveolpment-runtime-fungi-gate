// ============================================================================
// galerina-devtools-hypha — src/callsites.mjs
//
// A ONE-PASS replacement for calling findCallSites() once per checker name.
//
// THE MEASUREMENT that motivated this (2026-08-06, this repo, 335 checkers):
//
//     extraction (8 phases, all of it)      124 ms     0.8 %
//     call-site sweep (335 × findCallSites) 16 236 ms  99.2 %   <-- everything
//     ------------------------------------------------------
//     total                                 16 360 ms
//
//   48.5 ms per checker, and the whole scan is 16.4 seconds — slow enough to
//   change how the tool gets used, which makes it a correctness problem as much
//   as a speed one: a scanner nobody runs detects nothing.
//
// THE CAUSE. `findCallSites(root, name)` reads and scans the entire dist tree
// for ONE name. Called per checker, the tree is read 335 times — the work is
// O(names × files) with the FILES in the inner loop, and the file reads are the
// expensive part.
//
// THE FIX. Invert it: read each file once, test every name against that file's
// lines while it is in hand. Same O(names × files) comparisons, but 1 read per
// file instead of 335 — and comparisons are nearly free next to I/O.
//
// WHY THIS LIVES HERE AND NOT IN extract.mjs. `src/extract.mjs` is a mechanical
// transform of the upstream source and is verified against its SHA-256 by the
// self-test. Hand-editing it would break that provenance and reintroduce the
// exact drift class this tool detects. So the vendored file stays faithful and
// the improvement lives beside it, using only its exported `distFiles`.
//
// UPSTREAM: the same defect is in subprojects/hypha/src/extract.js. Logged as
// an improvement note rather than fixed silently in two places.
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import { distFiles } from "./extract.mjs";

/** `distFiles()` returns BASENAMES, not paths — the upstream extractors pair it
 *  with an internal `distLines(root, file)` that joins them. That internal is
 *  not exported, so the join is reproduced here, once, with a name that says so.
 *
 *  This exact mismatch is how the first version of this module returned zero
 *  call sites for 228 of 335 names: every `readFileSync` threw ENOENT and a
 *  `catch { continue }` swallowed it, so a totally broken sweep reported
 *  "no call sites found" — indistinguishable from a clean result. The catch is
 *  gone (see below) and a differential against the original engine now guards it. */
function distPath(root, basename) {
  return path.join(root, "packages-galerina", "galerina-core-compiler", "dist", basename);
}

/**
 * Find call sites for MANY names in one sweep of the tree.
 *
 * Returns { [name]: [{ file, line }] } for every requested name — including an
 * empty array for names with no call sites, because "no entry" and "no call
 * sites" must not be the same shape. A caller that cannot tell them apart will
 * eventually report a missing extraction as a dead checker.
 *
 * @param {string} root      Galerina checkout
 * @param {string[]} names   symbol names to locate
 */
export function findAllCallSites(root, names) {
  const out = Object.create(null);
  for (const n of names) out[n] = [];
  if (names.length === 0) return out;

  // One matcher per name, built once rather than per file. The predicate is
  // REPRODUCED EXACTLY from the upstream findCallSites, because a faster engine
  // that answers a slightly different question is not an optimisation:
  //
  //   \bNAME\s*\(          a CALL, not a mention — imports, exports and type
  //                        references are not call sites
  //   !/function\s/        skip the definition line itself
  //   !//before the name   skip commented-out code
  //
  // The first version of this module matched every word-boundary mention and
  // returned 5 sites where upstream returned 1. A differential over all 335
  // names caught it; a spot check would not have.
  const matchers = names.map((n) => ({
    name: n,
    re: new RegExp("\\b" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\("),
  }));

  /** Apply the upstream predicate to one file's lines. */
  const scan = (lines, file, present) => {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/function\s/.test(line)) continue;          // definition, not a call
      for (const m of present) {
        if (!m.re.test(line)) continue;
        const beforeName = line.split(m.name)[0] ?? "";
        if (/\/\//.test(beforeName)) continue;        // commented out
        out[m.name].push({ file, line: i + 1 });
      }
    }
  };

  const files = distFiles(root);
  let read = 0;
  for (const file of files) {
    // NO try/catch here, deliberately. An unreadable dist file is not a
    // "0 call sites" answer — it is a broken sweep, and swallowing it turns a
    // total failure into a clean bill of health. If reading throws, the caller
    // should see the throw.
    const text = fs.readFileSync(distPath(root, file), "utf8");
    read++;
    // Cheap pre-filter: a name absent from the file's text entirely cannot have
    // a call site in it. Most names miss most files, so this is where the
    // remaining time goes.
    const present = matchers.filter((m) => text.includes(m.name));
    if (present.length === 0) continue;
    // Report the BASENAME, as upstream does, so results are directly comparable
    // and the caller's definition-line de-duplication keeps working.
    scan(text.split("\n"), file, present);
  }

  // Upstream also scans the root CLI: the public entry point imports
  // dist/index.js, so a checker dead within dist can still be alive from the
  // root. Omitting this file makes "dead" dishonest.
  const rootCli = path.join(root, "galerina.mjs");
  if (fs.existsSync(rootCli)) {
    const text = fs.readFileSync(rootCli, "utf8");
    scan(text.split("\n"), "galerina.mjs", matchers.filter((m) => text.includes(m.name)));
  }

  // A sweep that read nothing cannot distinguish "no call sites" from "no
  // files", and the second must never be reported as the first.
  if (read === 0) throw new Error(`hypha: call-site sweep read 0 of ${files.length} dist files — the sweep is broken, not the codebase`);
  return out;
}
