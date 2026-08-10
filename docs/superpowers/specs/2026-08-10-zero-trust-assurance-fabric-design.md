# Zero-trust assurance fabric design

Date: 2026-08-10
Status: owner-approved binding implementation design

## Decision

Replace the current collection of partly implicit graph, audit, generated-output
and test relationships with one governed assurance fabric. The fabric keeps a
small private adjudication core and treats every detector, generator, test
runner and external consultant as a non-authoritative producer of observations.

No producer may report, encode or mint an authority-positive result. It may
report a typed finding, a measurement, a refusal, or an inability to decide.
The private core derives a candidate positive verdict only after it independently
checks the producer identity, subject identity, declared coverage, output shape,
freshness, detector liveness and every required predecessor.

The design copies Rust's useful safe-abstraction pattern: invariant-bearing
state is private, unchecked work is localised and enumerable, and callers see a
narrow safe API. It deliberately does not copy Rust's reliance on a programmer's
`unsafe` assertion as proof. Missing or unprovable facts remain K3 `0` and take a
terminal `_=>` path.

At every `.fungi` intake boundary, analyzer output and other externally supplied
bytes use Galerina's existing `unsafe` value-state. Rust `unsafe` and Galerina
`unsafe` remain distinct: the former marks a memory-safety proof obligation;
the latter marks memory-safe data whose security trust has not been established.

Each protected component also uses the existing RD-0793 component-private VOK
profile rather than carrying a reusable self-declared safety certificate. The
private mint and sink authority is the **Signet**; the exact-subject,
tamper-evident, terminal assurance receipt is the **Wax Seal**. A serialized
seal is evidence for inspection, never authority that can be presented back to
open a lease.

This design changes assurance structure. It grants no package-conversion,
SLIDE, signing, production or retirement authority.

## Problem

Fresh inspection at Galerina commit `e5c4e5dd` found that the current individual
checks remain valuable, but their composition can report a misleading shape:

- the complete exhaustive lane ran 90 checks, with 89 passing and `graph:all`
  failing because four Knowledge Base graph outputs were stale;
- the roadmap-subway generator nevertheless reported all four of its own outputs
  current because upstream graph and retirement freshness are not dependencies;
- the TypeScript-retirement generator independently found both tracked outputs
  stale;
- the committed percentage view matched regenerated content while its embedded
  Git provenance named an older dirty build, because Git identity is excluded
  from that freshness comparison;
- the structural index operation reported the repository head, but a query of
  its own `Branch` node returned an unrelated older branch and SHA; the same
  graph exposed only one `TESTS` edge, classified regex literals as routes and
  reported zero package fan-in/fan-out despite cross-package calls;
- the dev-tool index found 40 audit/lint tools outside cadence by scanning only
  direct filename literals in `run-phase-close.mjs`, so tools reached through an
  orchestrator can appear ungated;
- the phase-close result model collapses blocking, advisory, skipped and
  not-applicable states into one Boolean `ok` field.

These are composition defects. A collection of green children is not evidence
that every relevant subject was checked, every dependency was current, or every
reported pass was authority-bearing.

## Rust precedent and the stricter Galerina rule

Rust provides three patterns worth retaining:

1. privacy protects invariant-bearing internal state;
2. unsafe operations are explicit, local and mechanically enumerable;
3. a sound safe wrapper validates inputs before calling the unsafe primitive,
   allowing arbitrary safe callers without exposing the primitive.

Rust also defines the limit of that model. An `unsafe` block or `unsafe impl`
is a programmer assertion that an obligation the compiler cannot prove has
been discharged. If that assertion is wrong, safe callers can still encounter
undefined behaviour. Rust's safe API is a memory-soundness abstraction, not an
adversarial process sandbox and not a general security-authority proof.

Galerina therefore adopts the following stronger rule:

> An untrusted component may provide work or evidence that lowers a verdict. It
> may never convert unknown into allow. A positive candidate is derived outside
> that component from exact, independently rechecked facts.

This agrees with the internal engineering records RD-0677, "Unsafe Rust in
Polars", RD-0680, "Verified Native Operation, Hallmarks and VOK", and "The
Untrusted Governed Lane", as well as:

- the Rust Reference chapters on the `unsafe` keyword and unsafety;
- the Rustonomicon chapters on safe/unsafe interaction, module privacy, and
  `Send`/`Sync`.

The 2024 Rust rule requiring explicit unsafe blocks inside unsafe functions is
also adopted conceptually: declaring a component high-risk does not make every
operation inside it implicitly trusted. Each authority discharge remains a
small named site.

## Threat model

### Protected properties

The fabric protects:

- exact subject and tool identity;
- preservation of `unsafe` and derived-taint state from every external intake;
- completeness of required checks;
- freshness and provenance of generated evidence;
- the distinction between blocking, advisory and non-authorizing evidence;
- private authority state and signing material;
- deterministic reproduction of the final candidate verdict;
- fail-closed cleanup and refusal on every exit.

### Two untrusted classes

The design must never conflate these classes:

1. **Non-authoritative analyzer** - a normal same-user tool that may be buggy,
   incomplete, stale or hallucinated. It has no verdict-minting authority, but
   the current host does not claim to contain arbitrary filesystem writes by
   that process.
2. **Hostile executable** - code assumed actively malicious at the operating
   system boundary. It is not admitted to run through the ordinary phase-close
   process API. Admission requires a separately verified OS sandbox, separate
   principal, VM or equivalent containment profile.

A typed wrapper alone is sufficient for authority separation from class 1. It
is not sufficient containment for class 2.

### Out of scope

The first implementation does not claim:

- containment of a same-user malicious native process;
- production key custody or authenticated release publication;
- that test count equals semantic coverage;
- that a green affected-scope lane replaces full release admission;
- that current `.gate` v4 synthesize-only R&D replaces the checked
  Galerina -> GIR -> SLIDE/VOK route;
- permission to remove WAT, Wasm or DSS controls.

## Authority model

The verdict domain is `DENY = -1`, `UNKNOWN = 0`, `ALLOW = +1`.

An analyzer's admitted codomain is restricted to `{-1, 0}`. It may identify a
defect or state that it cannot complete its work. It cannot emit `+1`.

For required observation set `O`, the adjudicator derives a candidate:

```text
candidate(O) = +1
  only if every required subject is exact
      and every required observation is present
      and every observation schema is valid
      and every detector identity is admitted
      and every detector liveness proof is current
      and every dependency is fresh
      and no blocking finding exists
      and every independent verifier agrees;
  otherwise _=> DENY or UNKNOWN according to the typed failure class
```

An untrusted observation combines with an existing verdict by K3 minimum:

```text
combine(v, observation) = min(v, observation)
```

It can therefore preserve or lower a verdict but cannot raise it. Evidence is
not authority; the candidate remains non-production until the existing release
admission boundary binds it to its exact repository, platform and policy.

### Independent Tri-1 coordinates

Data trust, component assurance and execution authority are independent axes.
They must not be compressed into one stored trit:

```text
D = data trust
C = component assurance
A = execution authority

(D, C, A) in {-1, 0, +1}^3
V = min(D, C, A)
execute only when V = +1; otherwise _=>
```

The three-trit model has `3^3 = 27` vectors. Only `(+1, +1, +1)` can
authorize, so its maximum authorization density is `1/27 = 3.703703...%`.
Actual component admission retains RD-0793's finer eight-gate vector; the
three coordinates are the conceptual axes, not a replacement for those gates.

`unsafe` boundary data is `D = 0`, not `D = -1`: its trust has not yet been
established. A malformed, contradicted, revoked or independently proven-hostile
value is `D = -1`. Context-specific validation may establish `D = +1` for the
validated data shape, but cannot raise `C` or `A`. Consequently a validator
cannot turn format acceptance into component or execution authority.

In precise terminology, `0` is **untrusted** because no trust has been granted;
`-1` is **distrusted** because negative evidence exists; `+1` is **assured**
only for the exact stated context. All `0` and `-1` paths still fail closed.

The same distinction applies to a seal. A missing or unchecked seal is `0`; a
broken, wrong-subject, stale or revoked seal is `-1`; an exactly verified seal
is `+1` only on the provenance/integrity fact it proves. It does not prove the
truth of the sealed claims or grant execution by itself.

## Components

### 1. Governed assurance manifest

`governance/phase-close-commands.json` becomes the single command and cadence
registry. The current source-code fallback is retained only during a measured
differential migration and is then removed. Once the manifest is authoritative,
its absence or invalidity is terminal.

Every entry has a closed schema containing:

- stable tool and requirement identifiers;
- exact command and confined working directory;
- tool class and authority class;
- `changed`, `normal`, `nightly`, `exhaustive`, `release` or `on-demand`
  cadence membership;
- blocking, advisory, informational, legacy-oracle or not-applicable outcome
  policy;
- subject selectors and expected subject cardinality;
- timeout and resource budget;
- permitted generated outputs and mutation policy;
- platform applicability;
- detector self-test and planted-defect requirement;
- predecessor tools and generated inputs;
- replacement, overlap and retirement metadata.

Unknown fields, duplicate identities, unknown cadences, cwd escape, command
ambiguity, missing subject counts or a dependency cycle refuse before a child
process starts. JSON uses explicit tagged states; `null` and NaN are forbidden.

### 2. Private assurance host API

The runner owns an internal API analogous to a sound Rust wrapper. Private
state includes subject handles, exact digests, invocation budgets, dependency
state, candidate verdicts and publication authority. Analyzer code cannot
obtain references to or serialise that state.

The analyzer-facing API permits only:

- reading its declared immutable subject snapshot;
- emitting typed blocking or advisory findings;
- emitting bounded measurements with units and evidence class;
- returning a typed refusal or unknown outcome;
- proposing generated artifact bytes for separate validation and publication.

It does not permit:

- reporting `pass`, `allow`, `authorizing` or a positive K3 verdict;
- writing a source file, authority ledger or signing record through the API;
- minting a subject handle, VOK lease or publication receipt;
- expanding its subject set or capability set at runtime;
- inheriting ambient secrets or undeclared environment authority;
- treating process exit zero as semantic proof.

The first compatibility adapter may translate legacy exit-code tools into
observations, but those observations remain visibly `legacy-exit` and cannot
silently gain stronger authority than the existing runner. The old runner stays
authoritative until differential parity and negative controls are complete.

### 2a. Galerina `unsafe` intake state

Every byte sequence originating outside the private host enters the `.fungi`
authority path as `unsafe`. This includes analyzer stdout and stderr, exit
metadata, consultant output, environment input, external indexes, child-process
receipts and proposed generated-artifact bytes.

The normative value-state flow follows the live value-state checker and the
stable teaching examples such as
`docs/examples/Level-4-Security/151-http-request-boundary/example.fungi`:

```text
external analyzer bytes
  -> unsafe binding
  -> approved bounded parser and schema validator
  -> typed observation candidate
  -> independent subject and truth re-derivation
  -> K3 adjudication
  -> candidate receipt or _=>
```

The `unsafe` qualifier applies to data, not to the process as a sandbox and not
to the analyzer as an authority principal. An analyzer remains non-authoritative
even after its bytes are structurally validated.

Validation may establish canonical encoding, type, bounds and schema. It does
not establish that a claim is true, complete, fresh or authority-bearing. A
validated observation candidate therefore retains the analyzer codomain
`{-1, 0}` until an independent verifier re-derives its facts. It cannot become
`+1` merely because a `validate.*` gate accepted its format.

Direct or derived `unsafe` data cannot reach the verdict store, authority
ledger, signing boundary, publication boundary or another governed sink.
Ordinary transformations do not clear the state: derived values remain tainted
until an approved validator acts, matching `FUNGI-VALUESTATE-003` and
`FUNGI-VALUESTATE-005`. Validation clears the data-format trust state only; the
separate authority prohibition remains.

During bootstrap, a TypeScript host must preserve an exact equivalent
`boundary-untrusted` state and prove differential parity with the `.fungi`
value-state checker. It may not silently treat decoded JSON or exit zero as
trusted. The equivalent disappears when the admitted `.fungi` host replaces it.

`examples/ai-inference/classifyMessage.fungi` illustrates the intended
boundary-to-validation transition but is not normative at this build point.
Fresh strict checking refuses its undefined `MessageText` and warns about its
effect/tier contract. The canonical examples themselves currently expose a
separate linter defect that reports `unsafe` as an unused binding; the assurance
work must not claim that diagnostic as valid evidence.

### 2b. Component Signet and Wax Seal

The wax metaphor names, but does not replace, the RD-0680/RD-0793 authority
architecture:

- **Envelope** - the exact component digest plus policy, target, ABI, dependency
  closure, capability/effect declaration, build point, epoch and evidence-set
  identity;
- **sealing wax** - the canonical, domain-separated encoding over that closed
  subject;
- **Signet** - the private component-profile mint and protected-sink capability,
  retained only inside the admission host/VOK authority boundary;
- **Wax Seal** - the immutable exact-subject receipt emitted after independent
  derivation and terminal consumption.

`Wax Seal` is deliberately distinct from the existing **Hallmark Seal**, which
is the type-side fixed-AOT eligibility shape for GHP Lock-1. The names must not
alias, and neither kind of seal grants authority by itself.

A component may submit Hallmarks, measurements and proposed evidence. It cannot
possess a Signet, seal itself, choose its own assurance trits or convert its
serialized receipt into a live decision. Hallmarks remain taint-transparent
typed facts and cannot mint a seal or lease.

The authoritative live binding is private and one-use. The serialized Wax Seal
is deliberately value-only: copying, parsing, replaying or transplanting it
cannot recreate the private admitted object, opaque gate decisions, Signet,
sink capability or affine lease. A change to any Envelope member creates a new
subject and invalidates the old seal. Missing evidence produces `0`; mismatch,
tamper, replay or revocation produces `-1`; neither path defaults to `+1`.

This is tamper and provenance evidence, not a claim that sealed contents are
true. In the authenticated profile, a signature proves only that the admitted
Signet holder sealed those exact bytes under the named policy and epoch. Truth,
coverage, freshness and execution permission remain independently re-derived.

### 3. Typed result model

Replace Boolean-only result flattening with a tagged result:

- `BLOCKING_PASS` - derived by the host, never supplied by the tool;
- `BLOCKING_FAIL` - an admitted blocking finding;
- `UNKNOWN` - missing, stale, timed out, malformed or incomplete evidence;
- `ADVISORY_FINDINGS` - completed advisory work with one or more findings;
- `INFORMATIONAL` - measured evidence with no authority effect;
- `NOT_APPLICABLE` - explicit zero-subject result with a checked reason;
- `REFUSED` - invocation or boundary admission failed;
- `LEGACY_EXIT` - transitional result whose limitations remain visible.

Every tag has a terminal `_=>` route. No result disappears because a subject
count is zero, a platform is absent or an optional probe is unavailable.

### 4. Generated-evidence dependency graph

Generated outputs become nodes in a deterministic dependency DAG rather than
independent files with local checks. Required edge types are:

- `DERIVED_FROM`;
- `CHECKED_BY`;
- `TESTS`;
- `PRODUCES`;
- `BLOCKS`;
- `SUPERSEDES`;
- `REPLACES`.

Every generated node binds source digests, tool digest, repository head,
working-tree evidence class, external-input digest and predecessor identities.
If any predecessor is stale, absent, dirty beyond its admitted class or
inconsistent, the dependent node is `UNKNOWN`; a local byte-for-byte match does
not make it current.

The roadmap and subway views must therefore depend on the live project graph,
KB graph, dev-tool index, percentage evidence, TypeScript-family retirement
inventory, status ledger and pinned SLIDE evidence they display.

### 5. Semantic graph validator

Graph checks cover semantic conservation, not only parseability and node count:

- every test node maps to a requirement, subject or explicit system-contract
  classification;
- every `TESTS` edge has source provenance and a real endpoint;
- every route has parser provenance, file, line, method and normalised path;
- regex literals and documentation examples cannot become live routes;
- package fan-in/fan-out agrees with derived cross-package edges;
- written nodes and edges agree with expected counts;
- the live Git head, index response build point and queryable `Branch` node all
  agree exactly;
- every rule has a planted defect proving it becomes red.

The graph stores routing and relationships. Detailed reports remain in focused
artifacts linked by identity; the graph is an index, not a warehouse.

### 6. Requirement and test evidence graph

Raw test totals remain useful capacity evidence but do not claim coverage. Each
release-critical requirement maps to at least one positive test and one negative
or refusal test. Applicable requirements additionally map to mutation,
determinism, recovery, platform and cross-repository evidence.

Tests are classified as:

- unit;
- contract;
- negative/refusal;
- detector self-test;
- mutation;
- integration;
- platform;
- durability/recovery;
- differential/oracle.

No new unmapped release-critical test or requirement is admitted. Existing
unmapped tests use a visible shrink-only migration ledger; the baseline cannot
grow.

The conversion evidence chain is:

```text
.ts/.mts/.cts/.mjs source family
  -> admitted .fungi semantics and refusal parity
  -> deterministic canonical GIR
  -> physical .slide object
  -> independent SLIDE re-admission
  -> VOK/Lyth-Weaver decision and affine lifecycle
  -> terminal receipt or _=>
```

The retirement inventory covers the complete executable TypeScript/JavaScript
family, declarations, bootstrap floors, generated files and named host seams.
A `.ts`-only denominator cannot authorize retirement.

### 7. Cadence scheduler

Cadences remain distinct:

1. `changed` - affected scope, fast and explicitly non-authorizing;
2. `normal` - shared governance plus relevant package checks;
3. `nightly` - all packages, full examples, mutation and expensive analyzers;
4. `exhaustive` - complete deterministic repository closure;
5. `release` - exhaustive evidence plus authenticated external/platform inputs.

The manifest prevents duplicate execution. In particular, an exhaustive
all-package test run satisfies the compiler package test requirement once its
inclusion and exact count are independently checked; it does not rerun the same
compiler suite merely to produce a second green row. Tests are deduplicated,
not removed.

### 8. Legacy-control lifecycle

WAT, Wasm and DSS checks remain active while any executing, bootstrap,
differential or oracle route depends on them. A legacy check may move to nightly
or on-demand only when that cadence still protects every live consumer.

A legacy check can be archived only when all of the following are exact:

- zero live consumers;
- an admitted successor owns every invariant;
- negative and mutation controls prove the successor detects the old fault;
- the dependency graph records `REPLACES` and the reviewed evidence;
- the retirement gate independently authorizes removal;
- historical evidence remains reproducible without presenting itself as live.

The current `.gate` v4 synthesize-only design is experimental and does not
satisfy these removal conditions.

## Data flow

1. Resolve the owning repository from the runner location and verify custody.
2. Load and validate the governed manifest without fallback.
3. Build the required dependency closure for the selected cadence.
4. Resolve immutable subjects and bind exact digests before execution.
5. Admit each tool identity, capability set, platform and resource budget.
6. Execute analyzers through the owned process-tree boundary.
7. Decode observations; reject tool-supplied positive or authority fields.
8. Independently verify subject coverage, detector liveness, output schemas and
   generated proposals.
9. Build the semantic evidence DAG and propagate stale/unknown states forward.
10. Derive typed per-check results and a non-production candidate verdict.
11. Publish generated artifacts only through their declared owner after every
    predecessor is current.
12. Release no broader authority unless the separate existing release boundary
    admits the exact candidate.

## Refusal behavior

The fabric returns non-zero or a typed non-authorizing report, as appropriate,
when:

- the manifest is absent, malformed, ambiguous or cyclic;
- a tool, command, cwd, environment capability or platform is undeclared;
- a subject count is missing or differs from discovery;
- the repository, external input or generated predecessor is stale;
- an analyzer emits `pass`, `allow`, `authorizing`, `+1`, `null`, NaN or an
  unknown result tag;
- an analyzer times out, crashes, escapes its owned process tree or emits
  malformed/surplus output;
- a detector self-test or planted defect fails to make the detector red;
- a route, test edge or package summary fails semantic conservation;
- an output proposal targets an undeclared or foreign owner;
- an advisory or not-applicable result is presented as a blocking pass;
- a legacy control is removed without complete replacement evidence.

Diagnostic output names the boundary and stable subject identifier without
printing private corpus content, secrets or absolute local paths.

## Approaches considered

### A. Private host API plus independently derived verdict - adopted

This copies Rust's strongest abstraction lesson while preserving K3
no-coercion. It permits gradual adapters for existing tools and gives one exact
place to enforce provenance, cadence and result semantics.

### B. Trust each tool's signed pass receipt

A signature authenticates the producer and bytes; it does not prove that the
tool checked every subject or interpreted them correctly. A compromised or
buggy producer could sign a false allow. Rejected.

### C. Run every tool in a container and keep Boolean exits

Containment reduces filesystem blast radius but does not repair stale inputs,
missing subjects, advisory/pass confusion or self-asserted authority. Useful
later for hostile executables, but insufficient as the assurance model.

## Implementation decomposition

This is an umbrella assurance architecture, not one indivisible coding task.
Implementation is split into four separately reviewable chapters. No later
chapter may compensate for an incomplete earlier boundary.

1. **Adjudication foundation** - governed manifest, private host state, typed
   result model, `.fungi unsafe` intake contract, legacy adapter and differential
   runner. The old runner remains authoritative.
2. **Evidence dependency DAG** - exact generated-input provenance, freshness
   propagation and roadmap/subway dependency binding.
3. **Semantic coverage graphs** - route/package conservation, requirement-test
   mappings, detector liveness and complete TypeScript/JavaScript-family
   retirement inventory.
4. **Cadence and authority transition** - transitive tool indexing, execution
   deduplication, legacy replacement lifecycle and the final reviewed switch
   away from the source fallback.

Each chapter gets its own implementation plan, red-green tests, focused review
and non-authorizing checkpoint. The first writing plan covers chapter 1 only.
An authority switch is not in scope until all four chapters and the complete
existing release lane agree.

## Test design

Implementation follows red-green TDD and includes:

1. a fake analyzer that emits `ALLOW`; the host refuses it;
2. a zero-exit analyzer with incomplete subjects; the host returns `UNKNOWN`;
3. a blocking detector whose planted defect must produce `BLOCKING_FAIL`;
4. an advisory detector with findings that cannot raise blocking pass totals;
5. an absent platform that produces explicit `NOT_APPLICABLE`, never silence;
6. a stale KB graph that makes roadmap/subway dependants unknown;
7. a content-current percentage artifact with wrong Git provenance that refuses
   freshness;
8. regex literals planted beside real routes; only real parser-proven routes
   enter the graph;
9. package cross-calls whose derived fan-in/fan-out must conserve;
10. a missing test mapping and a dangling `TESTS` edge that make graph quality
    red;
11. a nested-orchestrator tool that is correctly recognised as in cadence;
12. duplicate compiler execution in exhaustive planning that is rejected;
13. malformed, cyclic, traversal-bearing and surplus-field manifest fixtures;
14. a legacy WAT/Wasm/DSS control whose premature retirement is refused;
15. a same-user hostile-process fixture explicitly demonstrating that the
    compatibility adapter is not an OS sandbox.
16. an index response that claims the current head while its queryable `Branch`
    node remains stale; the semantic graph gate must refuse it.
17. analyzer bytes that are used without an `unsafe` or equivalent
    `boundary-untrusted` state; the intake gate must refuse them.
18. a structurally valid observation whose claim is false; validation may clear
    its format state but independent adjudication must deny or remain unknown.
19. a value derived from raw analyzer output by trimming, decoding or field
    extraction; it remains tainted until an approved validation gate acts.
20. a component that emits its own syntactically valid Wax Seal; the host
    refuses it because the component has no Signet authority.
21. a valid serialized seal copied into another component, target, policy,
    build point or epoch; it cannot recreate a private admitted object or lease.
22. `D = +1`, `C = +1`, `A = 0`; the exact minimum remains `0` and execution
    terminates.
23. a missing seal and a broken seal remain observably distinct as `0` and
    `-1`, while both fail closed at the execution boundary.
24. a verified seal containing a structurally valid but false analyzer claim;
    the seal proves provenance only and independent adjudication refuses allow.

## Acceptance criteria

- The governed manifest is complete, schema-checked and the only cadence source.
- Every phase-close result carries a typed authority class and terminal exit.
- No analyzer schema can express a positive verdict or authority grant.
- Every external analyzer value enters as `.fungi unsafe` or the exact bootstrap
  equivalent, and derived taint cannot disappear through ordinary transforms.
- Structural validation never raises an analyzer observation above K3 `0`;
  independent re-derivation is mandatory before a positive candidate.
- Data trust, component assurance and execution authority remain separate
  Tri-1 coordinates; only exact `+1` on every required coordinate may execute.
- Every protected component retains its Signet in private VOK profile state;
  no component-carried or serialized value can mint a decision, sink capability
  or affine lease.
- Every Wax Seal binds the complete exact Envelope and is terminal,
  non-authorizing and non-replayable; a broken seal is not conflated with an
  absent or unchecked seal.
- Blocking totals exclude advisory, informational, not-applicable and legacy
  results.
- Roadmap/subway freshness becomes red or unknown when any displayed upstream
  authority is stale.
- Git provenance and external-input digests participate in freshness.
- The dev-tool index resolves transitive orchestrators and explains intentional
  on-demand/legacy exclusions.
- Structural graph quality tests build-point agreement, routes and package
  dependencies semantically, with a negative control for each invariant.
- Release-critical requirements have positive and refusal evidence mappings;
  the unmapped legacy baseline can only shrink.
- Exhaustive planning executes each package test obligation once.
- No WAT, Wasm or DSS invariant is removed without admitted successor evidence.
- The existing full runner remains authoritative until differential parity is
  demonstrated; migration cannot reduce current protection.
- Focused tests, all dev-tool tests, graph checks, all-package tests and the
  report-only exhaustive lane are green before any authority switch.

## Primary references

- Rust Reference, The `unsafe` keyword:
  <https://doc.rust-lang.org/reference/unsafe-keyword.html>
- Rust Reference, Unsafety:
  <https://doc.rust-lang.org/reference/unsafety.html>
- Rustonomicon, How Safe and Unsafe Interact:
  <https://doc.rust-lang.org/stable/nomicon/safe-unsafe-meaning.html>
- Rustonomicon, Working with Unsafe:
  <https://doc.rust-lang.org/stable/nomicon/working-with-unsafe.html>
- Rustonomicon, Send and Sync:
  <https://doc.rust-lang.org/nomicon/send-and-sync.html>
- Rust 2024 Edition Guide, `unsafe_op_in_unsafe_fn`:
  <https://doc.rust-lang.org/edition-guide/rust-2024/unsafe-op-in-unsafe-fn.html>
- Internal architecture ruling RD-0680, "Verified Native Operation, Hallmarks
  and VOK".
- Internal architecture ruling RD-0793, "SLIDE VOK live-gate profile and sink
  capability adjudication".
