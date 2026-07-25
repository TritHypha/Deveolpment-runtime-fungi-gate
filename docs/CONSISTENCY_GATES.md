# Consistency Gates — dev tools + rules that block the "internal drift / silent fail-open" class

**Why this exists (2026-07-01):** a class of defects kept recurring where the compiler's own
*derived tables and boundaries* drifted apart or were silently softened, so a check that looked
enforced was not. Examples found and fixed this session: the effect vocabulary was defined in
≥4 tables that disagreed (`secret.read/write` were mask-invisible → a fast-path fail-open); a
plain `build` **signed** an artifact that `build --production` would refuse; security/governance
diagnostics were mode-gated or suppressed. None of these is a *user* bug — they are **meta**
defects (the toolchain lying to itself). Ordinary tests don't catch them because each table/mode
is internally consistent; only a *cross-table / cross-mode* invariant check does.

This file is the registry of the **rules** (invariants that must always hold) and the **gates**
(dev tools that fail CI if a rule is violated). Rule: **every rule here has an executable gate;
every gate here is wired into `scripts/run-phase-close.mjs`** so it runs on every phase close.

---

## Rules (invariants that must always hold)

| # | Rule | Rationale |
|---|---|---|
| **CG-1** | **One source of truth for the effect vocabulary.** `effect-checker.ts::CANONICAL_EFFECTS` is authoritative; every other effect table (`type-registry.ts::EFFECT_NAME_TO_FLAG`, `EFFECT_REGISTRY`, `SECURE_REQUIRED`/`PURE_FORBIDDEN`, and the docs) must agree — a name accepted by one part of the compiler but unknown to another is forbidden. | A drifted name is accepted in one pass and dropped in another → a silent authority gap (e.g. mask-invisible `secret.read`). |
| **CG-2** | **No canonical name is mask-invisible.** Every canonical effect used in a fast subset check must map to an `EffectFlags` bit (or be explicitly documented as bit-exempt). | `effectsToFlags(x)===0` for a real effect makes `(required & declared)===required` pass vacuously. |
| **CG-3** | **No security/governance diagnostic may be muted silently.** A security/governance code that is mode-gated (softer outside `build --production`) or in a `SUPPRESS` set must be on a **reviewed allowlist with a reason**. | "Muted early to stop it alerting" is how a real control gets left off. Muting must be a visible, auditable act. |
| **CG-4** | **A signed artifact must be production-strict.** The compiler must not emit a signed `.lmanifest` for an artifact that fails production-strict security/governance — even from a lenient `build`. | A signed manifest is an admission credential; signing a dev-lenient violating artifact is a fail-open at the boundary. |
| **CG-5** | **Local effect/capability sets use only real names.** Any hand-maintained `Set` of effect/capability names (inference passes, tier sets, capability maps) must contain only canonical effects, registered aliases, `EFFECT_REGISTRY` operations, or known capabilities — never a name that matches nothing. | A dead name (`gateway.charge` vs `payment.charge`) silently disables the classification for real flows. |
| **CG-6** | **Docs/specs teach only compilable vocabulary.** The KB registry and the `.gate` SPEC (`SPEC-gate-language.md`) may name only canonical effects/families. | An AI (or human) authoring from the docs otherwise writes plausible-but-non-compiling governed code. |
| **CG-7** | **A SIGNED fusable package is never modified or rebuilt locally.** A package whose `dist/<name>.lmanifest.json` carries a real (offline-ceremony) signature must stay git-clean; no tool may write into its `src` (generated `//fungi:` comments included) or regenerate its manifest. Re-signing is an offline ceremony. | Dirtying signed src bumps mtimes → the fuse-rebuild hook regenerates the `.lmanifest` UNSIGNED → the fuse loader fail-closes (`FUNGI-FUSE-UNSIGNED`) → the suite goes red from a "cosmetic" comment write (the annotation→re-fuse→unsigned cascade, hit 2026-07-01). |
| **CG-8** | **Closed vocabularies are variant types, not `String`s.** A field/parameter whose values are a fixed, documented set — the tell is an inline enumeration comment like `op: String // "store" \| "ret" \| "branch"` — MUST be a variant type, so a `match` on it is exhaustiveness-backed: a case a consumer forgets is a COMPILE error, not a silent `"unknown"`/`_` fallthrough. A `String` match's only "exhaustiveness" is the `FUNGI-MATCH-001`-forced `_` arm, which is cosmetic. **Genuinely open** strings (user input, free text, paths, identifiers) stay `String`. Current offenders: `GIRExpr.op`/`GIRStmt.op`/`opcodeOf` (`gir-emitter.fungi`) → the `Opcode` enum-ify proposal. | A stringly-typed opcode set lets a new opcode a stage forgets to handle fall through silently (the fail-open class the runtime div0/missing-flow harden closed one instance of). Enforcement is code-review interim; **not** "every empty arm must be justified" (measured ~99% noise). |
| **CG-9** | **Code quality (owner-ratified 2026-07-25; self-hosted `.fungi` + dev tools).** (1) **No dead code** — remove unused bindings, unreachable branches, never-called flows; ⚠️ the `FUNGI-MATCH-001`-forced `_` on a match that already handles every real variant is *required*, not dead. (2) **No dead gates** — every gate actually checks (no fabricated-green assertion, no gate outside the standing battery, no stale mutation anchor); a red gate is the check working — never green it by disabling. (3) **Always a FAIL-CLOSED exit** — every branch/match/flow has a defined exit AND on the error/absence path FAULTS or returns `Err`, never a silent benign default (`0`/`""`/empty-sentinel = fail-OPEN; `div0→0` was "an exit" of the wrong kind). (4) **≥1 comment for understanding** — concept/use/role; the flow-level `intent{}` satisfies this per-flow, deeper mechanics (non-obvious idioms, cross-stage seams) need their own line. (5) **Balance readability with short, professional code** — clear names over explanatory comments, no verbose ceremony. (6) **Document-on-discovery** — find an undocumented element → document it then. | **Enforcement split:** (1)–(3) are **detector-gated** — unused-binding diagnostic (proposed, bridge 0239) · mutation-anchor-liveness · the `.fungi≡.ts` edge-differential gate. (4)–(6) are **review-guided** — a `--check` could *count* comment coverage but can't judge quality; don't fake a mechanical gate for a judgment rule. |

---

## Gates (dev tools that enforce the rules) — all wired into `run-phase-close.mjs`

| Gate | Enforces | Command | Blocks on |
|---|---|---|---|
| `scripts/audit-effect-canonicality.mjs` | CG-1, CG-2, CG-6 | `node scripts/audit-effect-canonicality.mjs [--strict]` | internal table drift (C1–C4, C7 capability-types, C8 gir-emitter, C10 deny-only-in-grantable-table); docs drift under `--strict` (C5–C6); Stage-B drift (C9) informational |
| `scripts/audit-corpus-effect-names.mjs` | CG-6 (corpus half) | `node scripts/audit-corpus-effect-names.mjs [--root <dir>]` | a teaching-corpus `.fungi` declaring an effect name a PRODUCTION compile rejects (unknown, non-broad alias, deny-only); broad aliases warn; `tests/` fixtures report-only; aspirational aerospace names on a reviewed allowlist (owner-gated additions) |
| `scripts/audit-muted-diagnostics.mjs` | CG-3 | `node scripts/audit-muted-diagnostics.mjs` | a security/governance code muted without a reviewed allowlist entry |
| `scripts/audit-signed-fixture-drift.mjs` | CG-7 | `node scripts/audit-signed-fixture-drift.mjs [--root <dir>]` | a **committed ceremony-signed** fusable package (manifest git-tracked AND real-signed **in HEAD** — #21 unification 2026-07-10; disk shape never decides, so a locally minted dev-key signature cannot raise a false red and a locally clobbered ceremony manifest cannot demote itself out of the gate) with ANY local modification (src or dist); writer guard (`galerina.mjs` `//fungi:` refresh, deliberately disk-based — a writer protects the widest set incl. a mid-ceremony not-yet-committed manifest) + rebuild guard (`rebuild-fusable-packages.mjs [--root <dir>]`, same shared discovery + committed predicate, `--force` to override — LOUDLY, naming each bypassed package) prevent the known paths. **Third end closed 2026-07-02 (owner-approved), committed-state refinement 2026-07-10:** direct `galerina build --package <pkg>` refuses when the package's `.lmanifest` is git-tracked real-signed in HEAD unless `--force`; an untracked/ignored dev-signed manifest (local rebuild artifact, e.g. api-protocol-rest's own tests) and a tracked-but-placeholder-in-HEAD manifest (fuse-demo awaiting its ceremony) build freely; outside a git repo the guard protects (most-secure, disk floor). Regression: `scripts/tests/signed-fixture-guard.test.mjs` §1b/§2/§4/§5/§6 |
| compiler (`cli.ts`) production-strict signing gate | CG-4 | (in-compiler; regression-tested) | signing a plain-`build` artifact that fails production strictness |
| bundled CLI (`galerina.mjs`) pre-signing gate | CG-4 | (in-CLI; `scripts/tests/cg4-signing-boundary.test.mjs`) | the SECOND minting site (`build` / `build --package`): a lenient build of a production-violating package emits `.wasm`/`.wat` but NO `.lmanifest`/`.fuse.json` — loudly, never silently (closed 2026-07-02; the cli.ts fix alone left this site signing) |
| regression tests | all | `node --test scripts/tests/dev-tools-scripts.test.mjs` | a gate that stops detecting its own defect class |

**How to run them all:** `node scripts/run-phase-close.mjs` (runs every gate + the dev-tool tests),
plus `node scripts/run-all-tests.cjs` (full suite). Green = every rule holds.

---

## Coverage status (Commit 2 — extended 2026-07-01)

`audit-effect-canonicality.mjs` now gates 6 tables. The Commit-2 full rename converged the effect and
capability vocabularies on domain names (filesystem→storage, unsafe.native→native.call, +ledger.mutate/
shell.execute), so these are now GATED and clean:
- ✅ `capability-types.ts` `SystemCapabilityType` / `CAPABILITY_BIT_POSITION` (the V_DPM vocabulary) — **C7** (blocking).
- ✅ `gir-emitter.ts` `EFFECT_TO_CAPABILITY` keys (host.* values exempt) — **C8** (blocking).
- ✅ Stage-A `CANONICAL_EFFECTS` vs Stage-B `self-hosted/effect-checker.fungi` `knownEffects()` — **C9**
  (INFORMATIONAL, never blocks — self-hosted is WIP). **RECONCILED 2026-07-02** (`6bb63a1`): `ai.infer`→
  `ai.inference` (one-way alias), `telemetry.read` promoted canonical (mask bit 14), `eval.execute` made
  **DENY-ONLY** (`FUNGI-EFFECT-006`, fails every profile). Stage-B `knownEffects` updated to match; C9 now
  surfaces **0 drift** (`audit-effect-canonicality --strict` clean). New **C10**: a DENY-ONLY name must never
  appear in any grantable table (blocking fail-open guard).

Still pending:
- Local inference sets (`MUTATION_EFFECTS`, `NETWORK_EFFECTS`, `AI_EFFECTS`, `HIGH_TRUST_EFFECTS`) — CG-5 regression guard (not yet gated).

Landed:
- ✅ **Runtime-enforceability (CG-2 extension) — Commit 3 DONE** (`c2492cb`): canonical effects now carry V_DPM
  bits — `payment.charge` = 20, `pii.read` = 21, `phi.read` = 22, `phi.write` = 23 (`capability-types.ts:16-17,33-36`;
  consumed by `dss/vdpm.fungi`). Runtime bit-enforceable via the single-cycle `(req & granted) == req` mask.

**Rule for new defect classes (the meta-rule):** when a defect turns out to be a toolchain
self-inconsistency, do not just fix the instance — add the invariant to the table above and a gate
that fails on it, so the *class* cannot silently return. (See the **error-to-tooling** rule in `.claude` memory — every recurring error becomes a dev-tool detector.)
