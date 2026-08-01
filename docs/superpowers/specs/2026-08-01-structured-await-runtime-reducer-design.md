# Structured Await Runtime Reducer Design

**Date:** 2026-08-01

**Status:** approved by the owner's standing full-auto, zero-trust and
use-own-intuition direction; implementation evidence pending

## Outcome

Add a syntax-neutral deterministic plan/reducer contract to
`@galerina/core-runtime`. Do not execute arbitrary callbacks in this chapter.
The reducer emits explicit start/cancel/terminal decisions from admitted events
and never equates a cancellation request with observed termination.

The research authority is
`../../../../ZTF-Knowledge-Bases/RD-0651-galerina-structured-await-deterministic-runtime-reducer.md`.

## Closed plan

- exact version `galerina.runtime.await.v1`;
- bounded stable `scopeId` and 1..1024 unique task IDs;
- positive safe-integer `timeoutMs`;
- positive safe-integer `maxInFlight` no greater than task count; and
- completion policy `all` with `cancel_remaining` or `wait_for_all`,
  `first_success`, or `first_result`.

The runtime contract does not select source syntax. Current and future frontend
spellings lower to this plan only after their own lexer/parser/type/effect
admission.

## State and events

The reducer owns `pending`, `running`, `succeeded`, `failed` and `cancelled`
task states plus scope state `running`, `cancelling`, `succeeded`, `failed`,
`timed_out` or `cancelled`.

Accepted events are scope start, monotonic tick, explicit cancellation, task
success, task failure and task-cancel acknowledgement. Unknown, duplicate,
contradictory, backwards-time or post-terminal events refuse with a structured
runtime error.

## Load-bearing rule

Timeout/cancel/race emits cancel commands for running losers and marks
never-started tasks cancelled. The scope remains `cancelling` until all started
tasks acknowledge a terminal state. Only then may the requested terminal
outcome be published.

Deadline equality has precedence over a result event. `elapsedMs >= timeoutMs`
therefore selects `timed_out`; the event may acknowledge that its task stopped,
but it cannot turn the expired scope into success.

An isolated host adapter will later perform hard termination. This reference
reducer grants no in-process callback or `AbortSignal` hard-stop claim.

## Verification

Tests must fail before source changes and cover:

- every malformed plan bound and closed-enum violation;
- all completion policies;
- exact timeout equality and backwards time;
- cancellation request versus acknowledgement;
- duplicate, unknown, late and contradictory task events;
- `maxInFlight` never exceeded; and
- deterministic replay of the same plan/event stream.

Package verification is followed by graph, generator, security and exhaustive
workspace gates. Documentation must retain the hard-termination non-claim.
