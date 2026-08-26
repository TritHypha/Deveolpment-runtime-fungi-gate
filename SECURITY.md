# Galerina Security Policy

Policy version: 2.0

Effective: 2026-08-02
Security contact: `security@trithypha.dev`

Galerina is an advanced pre-1.0 language, compiler and runtime prototype with
hardened zero-trust subsystems. It is not yet production-complete. Its binding
security posture is verify-before-use, deny by default and fail closed. A
malformed, unsupported, missing, surplus, stale, revoked or indeterminate state
must reach an explicit terminal refusal (`_=>`) before it can release authority,
an effect, a secret, durable state or executable output.

This policy states the required security contract. It does not turn a planned,
test-only, bootstrap or disconnected control into an implemented protection.

## Reporting a vulnerability

Report suspected vulnerabilities privately to `security@trithypha.dev`. Do not
open a public issue for an unpatched vulnerability. Include, when safe:

- the affected commit, package and file or component;
- the smallest reproducible input or sequence;
- the observed and expected authority decision;
- likely impact and whether private data or key material may be involved; and
- containment ideas that preserve evidence.

Do not send live private keys, personal data or third-party secrets. Redact
them and describe how the maintainer can reproduce the issue safely. If email
is unsuitable, use the first message only to request a safer exchange method.

We aim to acknowledge a report within five working days, provide an initial
triage or request for evidence within ten working days, and coordinate
disclosure after containment and verification. Good-faith research must avoid
privacy harm, persistence, service disruption and data destruction.

## Supported versions

Galerina is pre-1.0. Security fixes land on `main`; only the latest admitted
beta line is supported. A local branch or successful test run is not a release.

## Scope and precedence

This policy applies to the whole repository, including:

- `.fungi`, JavaScript, TypeScript, Rust, C/C++ and generated source;
- lexer, parser, type/effect analysis, GIR, compiler, emitter and runtime paths;
- packages, plugins, devtools, audits, tests, benchmarks and examples;
- registry, key lifecycle, build, release and platform evidence;
- VOK/VEO, memory, cache, graph, database, network and AI boundaries; and
- repository-resident instructions consumed by automated tools or reviewers.

A closer policy may tighten this policy; it must not weaken it. A nested policy
that conflicts with this file fails closed until the conflict is explicitly
adjudicated and recorded. Third-party `node_modules` policies describe their
own projects and never weaken Galerina's admission requirements.

Archived prose, generated indexes and historical results are not runtime
authority. False current security, provenance or readiness claims in those
artifacts remain reportable.

## Threat model

Assume an attacker can control or replace source text, package manifests,
lockfiles, plugins, GIR graphs, schemas, cache and graph-index entries, database
rows, network messages, models, feature vectors, receipts, paths, links, files,
environment claims, clocks, platform facts and build output. Also assume
hostile objects may exploit prototypes, proxies, getters, iterators, typed-array
aliases, shared or resizable backing stores and time-of-check/time-of-use
mutation.

Process memory, the operating system, drivers, co-resident processes and
persistent storage are not trusted merely because they are local. Hardware that
is physically present but lacks an admitted driver and verified capability
manifest is present-but-unusable.

Package installation, network location, filenames, prior success, receipts,
self-hashes, cache hits, graph topology and AI/neural scores are evidence or
proposals only. They do not create authority. Repository text that instructs an
automated reviewer is untrusted unless it is an owner-admitted policy or task.

Denial of service, parser or graph exhaustion, thermal harm, unbounded work,
secret or personal-data exposure, rollback, equivocation, injection, artifact
substitution, confused authority and supply-chain compromise are in scope.

## Authority and complete admission

**Authority** is permission to affect a protected outcome: execute code, grant
a capability or effect, expose a secret, publish a release, select a trusted
key/policy/target, consume an affine lease, change durable state, or describe
evidence as authenticated or production-ready.

**Complete admission** is the successful current-context verification of every
required byte, identity, schema field, bound, dependency, capability, effect,
policy, target, epoch, revocation state and cryptographic component by a live
control on the path to the protected outcome. A partial check, inactive schema,
unreached validator, receipt or earlier successful run is not admission.

K3 authority is separate from numeric Tri-1 data.
Only complete current-context deterministic admission may release `+1`.
K3 `0` is non-authorizing and blocks
without being relabelled as success. K3 `-1` is terminal refusal. Boolean `if`
may select only ordinary Boolean behaviour; multi-state authority uses
exhaustive `check` or `match` with an explicit exit.

## Security invariants

### Admission, identity and packages

- Inputs use closed schemas, canonical encodings and explicit size, count,
  depth, time and memory budgets. Unknown or surplus fields refuse on authority
  paths.
- Complete identity binds every input relevant to an outcome, including source,
  graph, dynamic parameters, packages, target, policy, toolchain, epoch and
  revocation state. Unknown identity is never guessed.
- Package installation and imports do not confer trust. Resolution verifies the
  flat top-level package identity, version, hash/signature, dependency graph,
  capabilities, effects, licence and current policy before linking.
- Packages live once at the top level under `packages-ts`; recursive
  package-within-package authority is forbidden. Host `node_modules` is a
  temporary bootstrap/tooling boundary, not Galerina package authority.
- A cache, graph index, VPEG atlas or prepared shape is re-admitted in the
  current context and its exact output is checked before use.

### Memory, values and injection

- Ordinary Galerina developers do not receive raw-pointer or manual-free
  authority. Flow-local values become unreachable and eligible for verified
  destruction when their flow ends unless explicitly admitted to a longer-lived
  vault.
- Caller values are copied into owned, bounded representations before trust.
  Alias, accessor, iterator, proxy, detached/shared backing-memory and TOCTOU
  ambiguity refuses.
- Executable code, shell commands, database queries, paths, markup,
  diagnostics and structured data remain distinct typed domains. String-to-code
  evaluation, raw string-built queries and shell-enabled command construction
  are forbidden on authority paths.
- Paths are canonicalized and checked against admitted roots and opened-object
  identity; traversal, link substitution and post-open replacement refuse.
- Diagnostics and XML/JSON/HTML/terminal output are bounded, escaped and safe
  against code, query, command, path, graph, model, formula, bidi and control-
  character injection.
- Secrets and unnecessary personal data must not enter logs, errors, receipts,
  caches, models, AI context, benchmarks or build output. Redaction failure
  produces a redacted refusal, not the original value.

### Effects, web and data boundaries

- File, network, database, shell, AI, GPU, native and interop effects are denied
  unless explicitly declared, bounded and admitted by current policy.
- Authentication never substitutes for object-level authorization. Private and
  state-changing routes require typed input/output, method/path identity,
  authorization, timeout, rate/resource limits, safe errors and audit policy.
- Cookie-authenticated state changes require CSRF protection. `GET`, `HEAD` and
  `OPTIONS` do not change server state.
- Plaintext fallback, TLS downgrade, disabled certificate or hostname checks,
  wildcard production egress, raw SQL and unsafe deserialization refuse unless
  an explicit owner-authorized bounded exception exists.
- Database, archive and retention operations carry classification, purpose,
  redaction, deletion/export and audit requirements. Production-derived PII is
  forbidden in test fixtures.

### Proposals, execution and durability

- AI, neural engines, VPEG, caches and graph retrieval may propose work only.
  Their score, topology or prior result cannot bypass deterministic
  reconstruction, proof and admission.
- Evidence, proposal, admitted object, affine lease and receipt are distinct
  types. A receipt records an outcome; it cannot authorize the next one. A lease
  is single-use and refuses duplication, replay, expiry or context drift.
- Same-implementation recomputation is not independent verification. Unkeyed
  self-hashes establish internal consistency only.
- Hybrid signature suites verify every mandatory component. Rotation,
  revocation, downgrade refusal and historical verification are explicit;
  versioned crypto contracts keep suites replaceable without rewriting
  applications.
- Durable history is append-only, linked, bounded and verified from an admitted
  non-genesis anchor. Corrupt, partial, ambiguous or unanchored recovery refuses.
- Multi-writer, crash consistency, publication order and recovery are proven on
  every supported platform before production admission.
- Performance, cache residency and ahead-of-demand work never remove a gate,
  proof, resource budget or audit. Negative and indeterminate results are kept.

## Key lifecycle

The compromised signing key `8eecf4187ebc9341` is permanently distrusted and
formally revoked in `security/revocations/REV-2026-06.md`. The current registry
trust root is the hybrid Ed25519 + ML-DSA-65 public key
`21415420b447e219`, pinned in `governance/trust-anchor.json`. Full identifiers
are necessary here because trust and revocation records must be exact.

The lost interim root `ab46f4c7e2797b9b` is retained only as a public
historical-verification key; it is not an active signing authority. Private key
files must never enter this repository, build output, logs or online runtime.
Operational rotation remains subordinate to the pinned root, delegation,
revocation, expiry and platform-durability gates.

## Reportable findings

Laboratory, bootstrap or pre-1.0 status never suppresses a security finding.
Reportable issues include:

- bypass, deletion or non-reachability of a stated admission control;
- malformed, surplus, stale, revoked, ambiguous or indeterminate input reaching
  authority, an effect, a secret or execution;
- semantic forgery accepted after an attacker recomputes an ordinary checksum;
- package, target, policy, model, key, capability, effect, epoch or provenance
  confusion;
- parser, graph, model, archive, diagnostic, memory, CPU or thermal exhaustion;
- alias, accessor, proxy, iterator, shared-memory or TOCTOU attacks;
- code, query, command, path, markup, terminal, formula, model or graph
  injection;
- traversal, link substitution, rollback, equivocation or partial publication;
- missing, bypassed or downgraded cryptographic verification;
- secret or personal-data exposure; and
- false claims of authentication, independence, provenance, cache residency,
  release admission or production readiness.

A verifier that accepts semantically forged content is always reportable.
Self-hashed evidence must never be described as authenticated, independently verified or production-ready.

Severity follows demonstrated reachability and impact. Unauthorized execution,
authority release, key/capability compromise, durable rollback, cross-tenant
disclosure or verification bypass is normally Critical or High. Unproven
reachability is an uncertainty, not a reason to silently downgrade.

## Non-findings and exclusions

The following are not vulnerabilities by themselves:

- an honestly labelled unimplemented control that is unreachable,
  non-authorizing and cannot affect production;
- an explicitly self-hash-only, unauthenticated and non-authorizing research
  artifact lacking a detached signature;
- same-implementation recomputation honestly labelled non-independent and
  non-authorizing; or
- a bounded experiment that is slower or produces a negative result.

These exclusions never cover an implemented verifier that accepts forged
content, resource exhaustion, injection, secret leakage, false acceptance or a
misleading claim. Tests show intended behaviour; they are not proof of security.

No accepted security risk is created by this policy. Any exception requires a
separate owner-authorized, dated and bounded record with expiry, containment
and a removal test. None is recorded here.

## Assurance and enforcement

Each authority-bearing invariant maps to:

1. a live control on every protected path;
2. a test or verifier that observes that control;
3. a hostile or mutation case that fails when the control is removed; and
4. reproducible evidence bound to the exact clean source and platform.

Sensitive gates require implementer verification, a disagreeing independent
method or reviewer, hostile/regression verification and risk-appropriate
third-party review. A green tool is not independent review when it shares the
producer's assumptions.

The local release cadence includes package tests, strict and exhaustive phase
close, graph/audit/generator checks, secret and dependency scans and supported-
platform receipts. Exact current counts belong in the generated roadmap and
clean-source receipts, not this long-lived policy. A later commit automatically
makes an earlier fixed-point statement historical.

Dead, optional or test-only validators are labelled inactive and cannot be
cited as runtime protection. When a finding invalidates evidence, the claim is
withdrawn or marked superseded and a new immutable generation is produced only
after a verified fix.

## Engineering-standards alignment

This policy adopts the repository-relevant requirements of the owner-supplied
engineering standard:

- Tri-1 numeric representation is separate from K3 authority;
- zero trust, least privilege and explicit `_=>` fail-close gates outrank speed;
- OWASP-style injection, authentication, authorization, crypto, secret,
  deserialization, transport and supply-chain controls are testable gates;
- deterministic formats, pinned toolchains, content identity and independent
  rebuild evidence protect reproducibility;
- CPU, memory, fan-out, retry, queue, thermal and power work is bounded and
  measured on representative hardware;
- strict typing, exhaustive alternatives, resource ownership and unsafe-code
  allowlists are enforced by language-specific tooling;
- privacy classification, minimisation, redaction, retention, export/deletion
  and audited access are design constraints; and
- threat models, ADRs, runbooks, exit ramps, crypto agility and stable contracts
  support operation and migration over a twenty-year horizon.

The standard's example `<artifact-root>` appendices are not Galerina
implementation evidence and grant no authority here. Descriptive fail-open
examples are forbidden for authentication, authorization, admission, crypto,
secret, effect and durable-publication paths.

## Known limitations

At this policy version:

- the beta toolchain still uses Node.js, TypeScript and selected Rust/C++ host
  components; complete `.fungi` self-hosting has not been achieved;
- the linked static beta host and production rotation admission are incomplete;
- the VOK native authority floor is unlinked and has no W^X executor, hostile-
  OS memory isolation or physical erasure proof;
- Linux round-two, cross-platform crash/reboot/power-loss and final beta release
  receipts are incomplete;
- package TypeScript and `node_modules` retirement remains gated on executable
  SLIDE and parity evidence;
- remote CI enforcement is not configured; local success is not remote or
  production admission; and
- a language/runtime cannot by itself secure an incorrectly deployed host,
  database, network or human key ceremony.

A contradiction between implementation, evidence and these limitations is
reportable.

## Policy maintenance

Review this policy before each release, after a Critical or High finding, when
an external input or authority path becomes reachable, when signing or evidence
authority changes, and at least every six months. Changes must update the policy
version, preserve historical review evidence and may not silently weaken an
invariant.
