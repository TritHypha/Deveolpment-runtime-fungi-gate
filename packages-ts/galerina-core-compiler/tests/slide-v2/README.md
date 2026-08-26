# SLIDE v2 compiler probes

These fixtures measure current Galerina source semantics against the proposed
SLIDE R1 boundary. They are not `.slide` artifacts and must not be presented as
an executable-GIR, SLIDE container, native runner, or benchmark implementation.

`slide-k3-checked-add-probe.fungi` is the positive source probe. It combines:

- an exhaustive `check` over `Verdict`;
- separate DENY and INDETERMINATE typed failures;
- checked `Int` addition on ALLOW;
- a total `Result<Int, String>` exit.

The dated capability report in
`../../../../docs/reports/slide-v2-g1-capability-probe-2026-07-29.md` records
which current compiler tiers can execute each property and which SLIDE
requirements remain absent.
