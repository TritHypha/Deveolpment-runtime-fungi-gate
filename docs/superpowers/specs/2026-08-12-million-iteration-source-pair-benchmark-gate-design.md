# Million-iteration source-pair benchmark gate design

## Decision

Extend the existing `verified-native-operation` benchmark with an exact source-
pair gate. Do not create a second benchmark group and do not count the same
one-million-element workload twice.

The gate binds these two subjects:

- `docs/examples/CHECKED-MILLION-ITERATION-LOOP.fungi`: permission absent,
  checked execution, proposal candidate `false`, K3 `-1`;
- `docs/examples/VERIFIED-MILLION-ITERATION-LOOP.fungi`: permission present,
  independent-verification candidate `true`, K3 `0`.

Both remain non-authorizing reference evidence. Neither may claim production
SLIDE performance, win a production ranking, or release authority.

## Alternatives considered

1. **Exact source-pair gate on the existing benchmark — selected.** This keeps
   one workload identity, binds the labels to the real source bytes and avoids
   inflating benchmark counts.
2. **Create a second benchmark group.** Rejected because the current benchmark
   already measures both roles and a duplicate would misstate coverage.
3. **Rely on the existing compiler example test.** Rejected because that test
   proves frontend behaviour but does not bind benchmark admission or
   publication to the exact sources.

## Contract

Add one benchmark-owned source-pair manifest with an exact schema. Each subject
contains a repository-relative path, lowercase SHA-256 digest and closed role.
The checker must read bounded, regular, single-link files beneath the repository
root and refuse missing, surplus, duplicate, reordered, symlinked or digest-
mismatched subjects.

For both subjects, the checker must run the live parser and production type,
value-state, effect and governance gates. It must derive the million-read-loop
proposal for `readMillionValues` and enforce:

| Fact | Checked subject | Verified subject |
|---|---|---|
| Production source errors | 0 | 0 |
| Candidate | `false` | `true` |
| K3 verdict | `-1` | `0` |
| Failure ID | `VERIFIED_NATIVE_PERMISSION_MISSING` | `INDEPENDENT_VERIFIER_UNAVAILABLE` |
| Execution when not admitted | `checked` | `checked` |
| Exact trip count | no proposal proof | `1,000,000` |

The parsed flow name, parameter types, return type and executable body must be
deep-equal. Only the documented contract intent and permission may differ. If
the parsed representation cannot prove that narrow relationship, refuse rather
than infer equivalence.

## Integration

- The benchmark adapter verifies the source pair before admitting the pinned
  SLIDE publication.
- The package audit runs the source-pair gate independently.
- The focused Markdown and SVG identify the exact checked and verified source
  filenames.
- The existing reference-only, K3 and authority boundaries remain unchanged.

## Tests

Add hostile tests for each independently meaningful failure:

- checked/verified role swap;
- wrong path, digest or source bytes;
- missing, extra or duplicate subject;
- symlink or non-regular input;
- permission removed from the verified source or added to the checked source;
- executable-body drift between the two sources;
- changed trip count, result, failure ID or K3 verdict;
- proxy, accessor and inherited manifest shapes.

The focused package suite, source-pair audit and benchmark stale-publication
check must pass before publication. No full repository-wide closure is implied.

## Non-goals

- Do not optimize or investigate the call-chain slowdown in this change.
- Do not regenerate the independent SLIDE measurement unless its own evidence
  contract changes.
- Do not add syntax, permissions or a production native backend.
- Do not convert K3 `0` into allow or treat a compiler proposal as VOK authority.
