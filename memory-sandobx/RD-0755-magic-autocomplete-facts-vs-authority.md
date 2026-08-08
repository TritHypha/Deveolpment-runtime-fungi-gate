# RD-0755 — `--magic` auto-completion: the facts/authority split, and what Laravel/Rails/ESLint teach

> **R&D hub · 2026-08-08. LIVING DOCUMENT, v1 — "we will continue making it stronger."** From the
> owner's concept: after a developer writes `.fungi`, a CLI `--magic` pass fills obviously-missing
> things — types, contract permissions, hallmarks, vault-variable effects — with a **Y/N question
> per authority grant**. Grounded in the estate's existing `computeAutoFix` / `FUNGI-VAULT-003/004`
> machinery and cross-checked against how mature OSS frameworks handle the same problem.
> **ID:** RD-0755 (RD-0754 taken by another session).

---

## §0 · The one rule everything else serves

**Auto-completing a FACT is safe. Auto-completing AUTHORITY is a privilege-escalation.** A tool that
adds `contract.permission { database.write }` because it saw a write call has let **the code grant
itself the permission it uses** — which is the definition of the vulnerability the whole governance
design exists to prevent. So `--magic` splits on exactly one test — *does this completion grant
authority?* — and treats the two halves completely differently.

| tier | claim |
|---|---|
| the facts/authority split, propose-not-grant, per-secret Y/N | **REASONED**, and convergent with three mature frameworks (§6) |
| the estate already detects the vault gap (`FUNGI-VAULT-003/004`) | **VERIFIED in source** (§5) |
| the estate already has a re-check-gated, fail-closed auto-fix (`computeAutoFix`) | **VERIFIED in source** (§1) |
| a built `--magic` | **NOT BUILT** — this RD is the design |

---

## §1 · `--magic` is not a new tool — it is more fix-kinds on an existing safe rail

The estate already ships **`galerina fix` / `computeAutoFix`**: a diagnostic can carry a precise,
machine-applicable `FixEdit`, and the orchestrator is **re-check-gated and fail-closed**
(`fix-edit.ts`, `fix-edit.test.mjs`):

- *"ACCEPTS a fix when the re-check shows no new errors"*
- *"REJECTS a fix that increases the error count"*
- *"a recheck that THROWS rejects the fix"*

So a fix only lands if re-checking proves it did not make things worse. `--magic` = **additional fix
kinds on this rail**, plus one new thing the rail does not yet have: an **interactive authority
lane**.

---

## §2 · The two lanes

| lane | what | how | applies to |
|---|---|---|---|
| **FACTS** | type inference, comments, obvious data scaffolding | **auto-apply**, re-check-gated, fail-closed (the existing rail) | missing types (`Int`), comments |
| **AUTHORITY** | anything that grants an effect or touches a secret | **propose only — Y/N per grant, default-N, recorded; never silent** | contract permissions, vault effects, capability globals |

The facts lane is convenience. The authority lane is a **decision surface**: the tool *names* the
gap; a human *grants* it, one at a time.

---

## §3 · Facts lane — auto-apply (types, comments)

Types are facts about values; comments carry no authority. Both ride `computeAutoFix` unchanged: the
`FixEdit` is applied, the re-check confirms no new errors, done. This is the half that is *almost
already built* — it is what `galerina fix` does today, extended with a type-inference and
comment fix-kind.

---

## §4 · Authority lane — propose, never grant (permissions)

For a permission gap (`database.write` used, undeclared), `--magic` must **detect and ask**, never
add:

```text
$ galerina fix payments.fungi --magic
  flow chargeCard (line 34) calls database.write() · declares no permission
  ↳ granting adds:  contract.permission { database.write }
  ↳ blast radius:   this flow may write to the database
  Grant database.write?  [y / N / show]  N
  1 gap · 0 granted · re-checking… → nothing changed
```

Guardrails that keep the Y/N zero-trust:

- **Default `N`** (fail-closed) — a rushed Enter denies.
- **Non-interactive = refuse** — in CI or a pipe (no TTY) it stops and reports the gaps; it never
  auto-`y`. *(ESLint already does exactly this — §6.)*
- **Per-permission, no "grant all"** — an "All" option is the blanket grant in disguise.
- **The prompt names the RESOLVED effect**, from the effect system, not a source-supplied label — so
  a malicious file cannot make a dangerous grant read as benign.
- **A `y` writes a declaration AND a receipt** — what, when, and the triggering call site.
- **Every grant still passes the re-check gate.**
- **The `y` never bypasses runtime enforcement** — it makes the *source declaration* deliberate;
  SLIDE admission and K3 still enforce it downstream.

---

## §5 · The vault case — the detector already exists, and it is the sharpest one

Vault variables **are secrets**, and the governance verifier **already emits the exact gap**:

- **`FUNGI-VAULT-003`** — *"Flow accesses vault state via `secure.*` but does not declare
  'vault.read'… Add vault.read to the contract effects."*
- **`FUNGI-VAULT-004`** — *"Flow mutates vault state via `mut secure.*` but does not declare
  'vault.write'… Add vault.write."*

So for vault, `--magic` is **a Y/N `FixEdit` attached to a diagnostic that already exists.** Two
facts fall straight out: read vs write are **already syntactic** (`secure.*` vs `mut secure.*`), so
they are **two separate prompts**; and the fix text is already known.

Vault-specific guardrails, sharper than database because these are secrets:

- **Two questions, never one** — `vault.read` and `vault.write` are separate `y`s. Reading a secret
  is not permission to change it.
- **Touch the effect DECLARATION only — never the vault variable, never the value.** `--magic` adds
  `vault.read` to the effects block; it must **never provision a secret slot** and **never write a
  secret value into source** (the estate's `secretReportMode: redacted-only` invariant is the same
  doctrine). A referenced-but-absent `secure.*` name is an **error to surface, not a slot to create.**
- **Write-grants sort to the very top** (dangerous-first): `vault.write` before `vault.read` before
  `database.write` — highest blast-radius gets the freshest attention, before rubber-stamp fatigue.
- **The receipt is mandatory** — granting a flow read access to a secret is a PCI/GDPR-relevant
  decision; the audit trail is not optional here.

**The reframe:** `FUNGI-VAULT-003/004` firing is the single most valuable signal the system produces
— *"this code wants a secret it isn't cleared for."* Auto-filling it would hand out secret access on
demand. The per-secret, read-XOR-write, default-deny, recorded `y` turns that signal into *exactly
how secret access should be granted*.

---

## §6 · ★ What other open-source projects do — three converge on this exact discipline

Researched against primary docs this session. The convergence is strong: **the facts/authority split
is not novel — it is what mature frameworks already enforce, and the one thing never to do
(auto-grant) is a named vulnerability class.**

### Rails Strong Parameters — the canonical "auto-granting IS the vulnerability" lesson

The **mass-assignment vulnerability**: without protection, an attacker submits `admin: true` and
escalates privilege, because the controller assigned *all* incoming parameters. Rails' fix:
*"parameters cannot be used in mass assignments until they have been **explicitly permitted**"* —
`params.expect(person: [:name, :age])`. The Rails guide's own framing:

> *"This shift from implicit acceptance to explicit allowlisting fundamentally changes the security
> posture… the principle of least privilege… By requiring developers to make this decision **visible
> in code**, Rails catches oversights that could otherwise become security breaches. The guard rails
> are **intentional and unavoidable**."*

**This is `--magic`'s authority lane, proven by a real vulnerability class.** Auto-granting the
permission the code happens to use is *precisely* mass assignment. `--magic` must never do it; it
must make the human permit, explicitly and visibly — the Y/N.

### Laravel `make:policy` — scaffold the structure, the human writes the decision

`php artisan make:policy` generates an **empty policy class** (or, with `--model`, stub methods for
`view/create/update/delete`). It **never writes the authorization logic** — the developer fills in
`return $user->id === $post->user_id`. Authorization is **always explicitly declared** (Gates in a
`boot` method, Policy methods) and is **never inferred from what the code does**; gates
**default-deny** for unauthenticated requests. This validates the split exactly: **scaffolding
(structure) is safe to generate; the grant (decision) is always human-authored.** `--magic` may add
the empty `contract.permission { }` block (structure) but the *contents* are a human `y`.

### ESLint `--fix` — auto-fix only what is safe, refuse on a pipe, dry-run to preview

`--fix` applies fixes to files, but **not everything is fixable**, it **"throws an error when code is
piped"** (non-interactive = refuse — the same guardrail), and `--fix-dry-run` previews without
writing. Fix *types* (`problem` / `suggestion` / …) separate mechanical fixes from suggestions.
Maps cleanly: **facts lane = auto-fixable; authority lane = suggestion + refuse-on-pipe + dry-run
preview.**

### The pattern across all three (and the estate)

| framework | the discipline | maps to |
|---|---|---|
| Rails Strong Params | explicit allowlist; auto-accept *was* the CVE | authority lane must propose, never grant |
| Laravel Policies | scaffold structure, human writes the grant; default-deny | facts vs authority split |
| ESLint `--fix` | safe-only, refuse-on-pipe, dry-run | facts auto-apply · authority refuse-non-interactive · preview |
| Terraform `apply` | interactive `yes` for any blast-radius change | the per-grant Y/N |
| **Galerina (this estate)** | `computeAutoFix` re-check-gated · `FUNGI-VAULT-003/004` gap detector · least-privilege effects | the rail `--magic` extends |

**The estate is already aligned with the industry's hard-won answer.** `--magic` is the ergonomics
on top — and the guardrails are not caution, they are the *reason those frameworks converged*.

---

## §7 · What exists vs what to build

| piece | status |
|---|---|
| re-check-gated fail-closed auto-fix rail (`computeAutoFix`) | **exists** |
| effect-gap detectors (`FUNGI-VAULT-003/004`, and the effect-declaration diagnostics) | **exist** |
| type inference (facts-lane fix-kind) | partly exists (type checker) — wire as a `FixEdit` |
| the interactive **authority lane** (Y/N, default-N, refuse-non-interactive, receipt) | **build** |
| dangerous-first ordering + receipt log | **build** |

---

## §8 · Prototype — BUILT and PROVEN on real fixtures (2026-08-08)

The safe slice is prototyped in `Galerina/memory-sandobx/magic-vault-detector.mjs`, run against the
estate's **own** Level-5 examples — `230-vault-access-denied-invalid` (reads `secure.*` without
`vault.read`) and `227-global-vault-declaration` (declares it, the control). All controls pass:

| control | result |
|---|---|
| detector **fires** on 230 (FUNGI-VAULT-003 on `unauthorisedFlow`) and **stays silent** on 227 | ✅ discriminates |
| **default-N** — bare Enter DECLINES (fail-closed) | ✅ |
| **non-interactive / piped REFUSES** — never auto-`y` | ✅ |
| explicit `y` emits the **FixEdit + receipt** (`{grantedEffect, flow, triggeredBy, when, by}`) | ✅ |
| the FixEdit adds the **effect declaration only** — never a secret value | ✅ |
| read (`vault.read`) and write (`vault.write`) are **separate grants** | ✅ |

**The code cannot grant itself vault access; only a human `y` can, one effect at a time, with a
trail.** The propose-only authority lane works.

⚠️ **Prototype limits (stated):** the parser is lexical — a production `--magic` reads the compiler
AST, not a regex; the receipt's `when`/`by` are stubs; and only the vault read/write gap is wired
(database and the facts lane are next). What is proven is the **control flow**, on real code — the
part that had to be right before any `y` writes a grant.

## §9 · Next, to strengthen (v2)

- Wire the same propose-only decision to the **database-effect gaps** (§4) and the **facts lane**
  (types/comments, auto-apply on `computeAutoFix`).
- Two more OSS angles to fold in: **Rails/Laravel migrations** (reviewable + reversible changes —
  informs the receipt/rollback of a grant) and **Terraform plan/apply** (propose the whole
  change-set, then one approval — informs a `--magic --plan` that lists every gap before any `y`).
- Replace the lexical parser with the compiler AST so the RESOLVED effect (not a source label)
  drives every prompt.

*Provenance: owner concept 2026-08-08 · `computeAutoFix`/`fix-edit.ts` · `governance-verifier.ts`
FUNGI-VAULT-003/004 · `secretReportMode` invariant · RD-0391 Lock-1 (request-not-assert) · primary
docs: laravel.com/docs/11.x/authorization, guides.rubyonrails.org (strong parameters),
eslint.org (`--fix`). Living document — v1. Contact hello@trithypha.dev.*
