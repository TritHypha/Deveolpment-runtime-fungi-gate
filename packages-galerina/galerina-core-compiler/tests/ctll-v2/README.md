# CTLL v2 compiler probes

These fixtures measure current Galerina source semantics against the proposed
CTLL R1 boundary. They are not `.ctll` artifacts and must not be presented as
an executable-GIR, CTLL container, native runner, or benchmark implementation.

`ctll-k3-checked-add-probe.fungi` is the positive source probe. It combines:

- an exhaustive `check` over `Verdict`;
- separate DENY and INDETERMINATE typed failures;
- checked `Int` addition on ALLOW;
- a total `Result<Int, String>` exit.

The dated capability report in
`../../../../docs/reports/ctll-v2-g1-capability-probe-2026-07-29.md` records
which current compiler tiers can execute each property and which CTLL
requirements remain absent.
