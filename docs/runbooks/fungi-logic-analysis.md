# Fungi logic analysis

The Fungi logic analyzer is one parser/checker-backed engine with focused
views for `if`, `match`, `check`, `contract`, `flow`, `global`, `vault` and
`hallmark`. It reports construct evidence; it does not generate Fungi, compile
a candidate, invoke SLIDE/VOK, switch a consumer, retire TypeScript, commit,
push or release production authority.

`global` is a deliberate refusal view over vault scope. The current canonical
parser implements `vault secure` and rejects `vault global` and
`vault session` with `FUNGI-VAULT-008`. The analyzer records that fact; it does
not invent a separate global AST node or new syntax.

## Self-test first

Run the planted green and controlled-red checks before analyzing a file:

```powershell
npm run analyze:fungi-logic:self-test
```

The result must use schema `galerina.fungi-logic-analysis.v1` and report
`passed: true`. A failed self-test refuses a real run.

## Analyze a tracked project file

Supply the exact fresh graph build point, which must also equal the current Git
HEAD:

```powershell
npm run analyze:fungi-logic -- scan --file packages-galerina/example/src/example.fungi --out build/fungi-logic-analysis/example.json --graph-build-point <40-lower-hex-head>
```

Replace `scan` with one construct name to request only that view. `scan`
returns the constructs present in the canonical parser/checker result. An
individual construct command that is absent returns `MANUAL_REVIEW` rather
than fabricating evidence.

The initial profile is `dev`; `--profile dev` may be supplied explicitly.
Inputs must be bounded regular UTF-8 `.fungi` files inside the repository.
`galerina-test`, test conversion overlays, symlinks and redirected output
ancestors are refused. Output is canonical JSON beneath
`build/fungi-logic-analysis/` and is atomic no-overwrite.

## Result contract

Each envelope is compact and body-free. It binds:

- source and compiler digests;
- selected profile digest;
- exact graph build point;
- canonical AST kinds;
- declared and observed effects;
- governance obligations and diagnostic codes;
- explicit non-authority actions, all `false`.

The only statuses are:

- `SUPPORTED`: the bounded construct obligations are proved by the current
  parser/checker profile;
- `BLOCKED`: a known semantic, diagnostic or physical-profile blocker exists;
- `MANUAL_REVIEW`: the requested construct is absent or the current profile
  cannot make a deterministic ruling.

Cache identity changes when the source, canonical compiler entry, analysis
profile or graph build point changes. A prior envelope is not reusable across
any such drift.

Conservative rules include effect-free `if` conditions, a terminal wildcard
for `match` until exact checker exhaustiveness is exposed, the closed
`check` arms `deny | ambig | if`, a contract attached to every analyzed flow,
secure vault permissions limited to `read | write` with an audit policy, and
exactly one hallmark assay gate.

## Exit codes

- `0`: requested analysis is `SUPPORTED`, or the self-test passed;
- `1`: a valid `BLOCKED` or `MANUAL_REVIEW` envelope was published;
- `2`: malformed input, stale identity, failed self-test or failed atomic
  publication.

Standalone `--graph-build-point` comparison proves equality with Git HEAD but
does not independently prove the graph server indexed that head. Use the
constellation preflight/identity resolver before treating graph freshness as
known. The TypeScript-to-Fungi sandbox does this and requires `SUPPORTED`
analysis before it invokes compiler or physical proof stages.
