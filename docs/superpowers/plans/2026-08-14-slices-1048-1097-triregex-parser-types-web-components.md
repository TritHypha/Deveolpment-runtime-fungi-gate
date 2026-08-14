# Slices 1048-1097 TriRegex parser/types and Web Components plan

> **Execution custody:** root is the sole writer, tester and committer. Private
> Fungi skills remain private and unpushed. Repository commits are never pushed.

**Goal:** Account for the next 50 unique TypeScript conversion scopes in exact
source order after Slice 1047, without duplicating the already-adjudicated
TriRegex compiler, engine, `MAX_CP` or `D` scopes.

**Method:** Use the exact-head code graph for discovery, then bind every ruling
to current source bytes, focused tests, callers and package boundaries. A plan
commit changes graph freshness to `UNKNOWN`; exact bytes remain authoritative
until final dual-index refresh.

**Source build point:** `aad36fce80005a94df9e496a0859af6dfb5323a3`.

## Constraints and pins

- Owner directive superseding the original report-only constraint: author exact
  candidate `.fungi` twins in an owned governed overlay, with at least 40 new
  `.fungi` files before any conversion-report commit. Original TypeScript and
  mirrored Myco sources remain unchanged until separate consumer-switch gates.
- Do not promote a primitive constant beyond `CANDIDATE` without exact Fungi,
  GIR, physical `.slide`, independent re-admission/VOK and consumer evidence.
- Keep active arrays, parser state, mutable budget/AST aliases, exceptions,
  UTF-16/code-point behavior and report singleton state blocked until their
  exact physical ABI is admitted.
- Retain all erased TypeScript declarations as public `.d.ts` authority until
  governed binding/schema generation and every consumer are proved.
- Preserve prior Slice 1046 `MAX_CP` and Slice 1047 `D` as sole exact credit.
- Stop after `web-components/src/index.ts#KNOWN_COMPONENT_EFFECTS`; the exact
  next queue begins `ComponentContract` at line 88.
- Keep repository-wide conversion closure `UNKNOWN`.

Pinned sources:

- `galerina-tri-regex/src/parser.ts`: 305 lines, SHA-256
  `E969F6BF9C0023E7E8CC3F5685AC81A6B2FE1B0D517A89A6467C7B01E15CF257`.
- `galerina-tri-regex/src/types.ts`: 108 lines, SHA-256
  `9C32279DE695962B34E500A8AFCF6A18946476C137B6DD8C8B45C7CA913F4EFB`.
- `galerina-web-components/src/index.ts`: 365 lines, SHA-256
  `F963030DBB6E69D04D9CC50799E0E42106530658E27AD05B4F93CC27240BA57A`.

Focused test pins:

- TriRegex differential `D5822FA9A6780FA7A2FB59C91BCA48716C8C2911D93A403EB5A1A3B2F3EED61E`.
- TriRegex ReDoS `B0DF088998F475D529F96558874365FBCBD21DEBF9305D2E112B7F02772E7663`.
- TriRegex refusals `6A2A3BE0BA7A0C9C013D6150DD66BBCC24C37E7CC84D0D5C44A6D4EE5BC9DF3E`.
- TriRegex semantics `F9EBC88F64CA140C22C9850B0BC6000AB3ED3254B21A1D224C26B12AEB2BEB82`.
- TriRegex streaming `ACA74C99A4F3D03B2C27D5C555D50CF5764A0E931593E22C4F674A85AB88736B`.
- TriRegex version drift `0854185BA97278D0487B766D676ED44A7C7F8B1409ACC547412B374D78F05BD9`.
- Web Components contracts `C67166147919F559FBC97330DA06F78C80E7D8BCA8304120CFF507E1446BF9EA`.
- Web Components fail-closed `E6E6B1790C503492B825C6A12415DE2FA59614418EED2E80779695F618946A7D`.

Private skill heads are translation
`13c070f75cb4899dc46fc35b9d43a770f9116380` and authoring
`c4b10ae638c4daee09cab9ab1f3dc3d3ce35cd11`, clean/private/unpushed.

## Exact 50-scope map

| Slice | Exact scope and lines | Classification | Threadability |
|---:|---|---|---|
| 1048 | `parser.ts#W` line 20 | BLOCKED | SERIAL_HARD_PATH |
| 1049 | `parser.ts#S` line 21 | BLOCKED | SERIAL_HARD_PATH |
| 1050 | `parser.ts#normalizeRanges` lines 23-32 | BLOCKED | SERIAL_HARD_PATH |
| 1051 | `parser.ts#complementRanges` lines 34-43 | BLOCKED | SERIAL_HARD_PATH |
| 1052 | `parser.ts#one` line 45 | BLOCKED | PARALLEL_PURE |
| 1053 | `parser.ts#ParseOk` line 47 | NO_RUNTIME_BEHAVIOR | N/A |
| 1054 | `parser.ts#Res` line 48 | NO_RUNTIME_BEHAVIOR | N/A |
| 1055 | `parser.ts#veto` lines 49-51 | BLOCKED | PARALLEL_PURE |
| 1056 | `parser.ts#P` lines 53-299, class identity only | BLOCKED | SERIAL_HARD_PATH |
| 1057 | `parser.ts#P.constructor` line 57 | BLOCKED | SERIAL_HARD_PATH |
| 1058 | `parser.ts#P.atEnd` line 59 | BLOCKED | SERIAL_HARD_PATH |
| 1059 | `parser.ts#P.peek` line 60 | BLOCKED | SERIAL_HARD_PATH |
| 1060 | `parser.ts#P.next` lines 61-65 | BLOCKED | SERIAL_HARD_PATH |
| 1061 | `parser.ts#P.eat` lines 66-69 | BLOCKED | SERIAL_HARD_PATH |
| 1062 | `parser.ts#P.pos` line 70 | BLOCKED | SERIAL_HARD_PATH |
| 1063 | `parser.ts#P.parse` lines 72-77 | BLOCKED | SERIAL_HARD_PATH |
| 1064 | `parser.ts#P.alt` lines 79-88 | BLOCKED | SERIAL_HARD_PATH |
| 1065 | `parser.ts#P.concat` lines 90-99 | BLOCKED | SERIAL_HARD_PATH |
| 1066 | `parser.ts#P.repeated` lines 101-136 | BLOCKED | SERIAL_HARD_PATH |
| 1067 | `parser.ts#P.quant` lines 139-160 | BLOCKED | SERIAL_HARD_PATH |
| 1068 | `parser.ts#P.atom` lines 162-196 | BLOCKED | SERIAL_HARD_PATH |
| 1069 | `parser.ts#P.escapeRanges` lines 199-249 | BLOCKED | SERIAL_HARD_PATH |
| 1070 | `parser.ts#P.escape` lines 251-255 | BLOCKED | SERIAL_HARD_PATH |
| 1071 | `parser.ts#P.charClass` lines 258-298 | BLOCKED | SERIAL_HARD_PATH |
| 1072 | `parser.ts#parsePattern` lines 301-305 | BLOCKED | SERIAL_HARD_PATH |
| 1073 | `types.ts#TriVerdict` line 11 | NO_RUNTIME_BEHAVIOR | N/A |
| 1074 | `types.ts#MATCH` line 12 | CANDIDATE | PARALLEL_PURE |
| 1075 | `types.ts#INDETERMINATE` line 13 | CANDIDATE | PARALLEL_PURE |
| 1076 | `types.ts#SECURITY_VETO` line 14 | CANDIDATE | PARALLEL_PURE |
| 1077 | `types.ts#Budget` lines 17-24 | NO_RUNTIME_BEHAVIOR | N/A |
| 1078 | `types.ts#DEFAULT_BUDGET` lines 26-30 | BLOCKED | SERIAL_HARD_PATH |
| 1079 | `types.ts#CostCertificate` lines 33-57 | NO_RUNTIME_BEHAVIOR | N/A |
| 1080 | `types.ts#CompileVeto` lines 59-70 | NO_RUNTIME_BEHAVIOR | N/A |
| 1081 | `types.ts#Ranges` line 74 | NO_RUNTIME_BEHAVIOR | N/A |
| 1082 | `types.ts#AstNode` lines 76-84 | NO_RUNTIME_BEHAVIOR | N/A |
| 1083 | `types.ts#Instr` lines 87-93 | NO_RUNTIME_BEHAVIOR | N/A |
| 1084 | `types.ts#EngineStats` lines 95-102 | NO_RUNTIME_BEHAVIOR | N/A |
| 1085 | `types.ts#MatchOutcome` lines 104-108 | NO_RUNTIME_BEHAVIOR | N/A |
| 1086 | `web-components/src/index.ts#WebComponentsDiagnosticSeverity` line 16 | NO_RUNTIME_BEHAVIOR | N/A |
| 1087 | `web-components/src/index.ts#WebComponentsDiagnostic` lines 18-23 | NO_RUNTIME_BEHAVIOR | N/A |
| 1088 | `web-components/src/index.ts#ComponentPropKind` lines 25-32 | NO_RUNTIME_BEHAVIOR | N/A |
| 1089 | `web-components/src/index.ts#KNOWN_COMPONENT_PROP_KINDS` lines 34-42 | BLOCKED | SERIAL_HARD_PATH |
| 1090 | `web-components/src/index.ts#ComponentProp` lines 44-47 | NO_RUNTIME_BEHAVIOR | N/A |
| 1091 | `web-components/src/index.ts#ComponentTextChild` lines 52-55 | NO_RUNTIME_BEHAVIOR | N/A |
| 1092 | `web-components/src/index.ts#ComponentSafeHtmlChild` lines 57-61 | NO_RUNTIME_BEHAVIOR | N/A |
| 1093 | `web-components/src/index.ts#ComponentChildContent` line 63 | NO_RUNTIME_BEHAVIOR | N/A |
| 1094 | `web-components/src/index.ts#KNOWN_COMPONENT_CHILD_KINDS` lines 65-68 | BLOCKED | SERIAL_HARD_PATH |
| 1095 | `web-components/src/index.ts#ComponentSlotContent` lines 72-75 | NO_RUNTIME_BEHAVIOR | N/A |
| 1096 | `web-components/src/index.ts#ComponentEffect` line 79 | NO_RUNTIME_BEHAVIOR | N/A |
| 1097 | `web-components/src/index.ts#KNOWN_COMPONENT_EFFECTS` lines 81-86 | BLOCKED | SERIAL_HARD_PATH |

Exact arithmetic: **20 NO_RUNTIME_BEHAVIOR + 27 BLOCKED + 3 CANDIDATE**;
threadability **20 N/A + 25 SERIAL_HARD_PATH + 5 PARALLEL_PURE**; zero
superseded scopes or retirement credit.

## Task 1: Adjudicate Slices 1048-1072

- [ ] Bind mutable shorthand range aliases, live input arrays, sorting,
  normalization and complement semantics.
- [ ] Bind parser class/constructor/state identity, UTF-16/code-point iteration,
  recursive grammar, exact first-refusal/error order and budget alias behavior.
- [ ] Preserve separate class and child-method credit and prior `MAX_CP`/`D`.

## Task 2: Adjudicate Slices 1073-1085

- [ ] Retain all public erased declaration surfaces without execution credit.
- [ ] Treat the three exact Verdict scalar constants as candidates only.
- [ ] Block the exported mutable default budget identity and consumer effects.

## Task 3: Adjudicate Slices 1086-1097

- [ ] Retain public Web Components declarations and exact `.d.ts` surface.
- [ ] Bind each exported mutable known-value array identity/order/mutation ABI.
- [ ] Stop before `ComponentContract` and preserve the exact next queue.

## Task 4: Author and verify the 50 receipts

- [ ] Author receipt-local classifications, blocker-specific exits, hostile
  vectors, threadability, source/test hashes and one common manifest.
- [ ] Run focused no-emit typechecks/tests and the governed receipt audit.
- [ ] Perform a separate evidence-first verification pass and correct every
  Critical or Important discrepancy before the evidence commit.

## Task 5: Publish owners and close the checkpoint

- [ ] Run registered publishers by provenance layer, the hermetic
  generator-contract audit and the historical bounded close matrix.
- [ ] Commit owner and dependent graph layers separately; do not push.
- [ ] Refresh Myco and codebase-memory and independently verify exact final
  indexed build points plus one untruncated Slice-1097 query/snippet.

## Self-review

- [ ] Confirm 50 case-sensitive unique scopes in exact source order.
- [ ] Confirm prior-credit exclusions and class/method boundaries.
- [ ] Confirm arithmetic is 20 NRB + 27 BLOCKED + 3 CANDIDATE.
- [ ] Confirm every blocked receipt has an executable blocker-specific exit and
  every candidate has explicit consumer and physical-proof gates.
- [ ] Confirm no physical authority, switch, supersession or retirement claim.
