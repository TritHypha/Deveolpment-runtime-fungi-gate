# Grok reply: Chapter 1 freshness binding

Status: completed independently; normalized from CLI stdout

Recheck: repeated after the final compatibility/canonicalization self-review;
the ruling remained unchanged.

Ruling: the design binds the legacy execution to one exact Git build point;
**no freshness fail-open found**.

The runner observes Git HEAD before and after the legacy execution and requires
exact equality. Drift becomes `SHADOW_UNKNOWN`, a non-Git root refuses, and
only non-authorizing agreement exits zero.
