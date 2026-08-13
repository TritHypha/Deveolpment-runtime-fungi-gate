# Slice 197 health run-one Fungi conversion adjudication

## Outcome

Private `HealthRegistry.#runOne` is
`BLOCKED_BY_TIMER_RACE_CALLBACK_CLEANUP_TRANSACTION_ABI`. No placeholder Fungi
asset is created. It invokes an untrusted sync-or-async callback, races it
against an injected timer, maps callback/setup failures to a bounded `DOWN`
record and invokes the injected cleanup on every completed outer route. A
throwing cleanup currently rejects direct registry evaluation.

## Bound source dossier

- Source: `packages-galerina/galerina-observability/src/health.ts:137-156`
- Source SHA-256: `8EDCB6B5AC3E9110AAA7DA4AFAC0F96B809562E79F2CB823A3B85F81489079ED`
- Repository build point: `b06a727934c95469fcf28a34222fd1a6cdaa1c13`
- Caller: private `#evaluate`, once per captured registered check.
- Authority: retained callback, injected-or-host timer scheduler, timer handle
  and cleanup function; no static Fungi health example owns these capabilities.

## Decision and effect ledger

| Source operation | Observable contract | Effect/state | Required exit |
|---|---|---|---|
| create timeout Promise | schedule one `DOWN/timeout` result and retain its opaque handle | timer capability | participate in race |
| deferred `check()` | preserve sync throw and Promise/rejection behavior | untrusted callback capability | coerce success or fixed `DOWN` |
| `Promise.race` | first settlement wins; the losing check is not cancelled by this method | async scheduling | winning health record |
| outer catch | convert setup/race failure to fixed `DOWN/check threw` | failure mapping | callback/race exception does not cross caller |
| `finally clearTimer(handle)` | invoke cleanup once after the outer result/failure settles; an injected cleanup throw overrides the prior result | timer cleanup | cleanup outcome is observable |

An ordinary Fungi `Result` is not parity because it could return before timer
cleanup, duplicate cleanup, conceal the still-running losing callback, or erase
cleanup failure. The current profile has no admitted Promise race, opaque timer
handle, cancellation or exactly-once cleanup transaction with a typed cleanup
failure outcome.

## Evidence and exit

Observability passes **36/36**; focused health/kernel consumers pass **19/19**,
with zero failures and zero skips. The injected immediate-timer test proves the
timeout result, while throw and rejection tests prove the fixed failure route;
they do not prove cancellation of losing work. A separate exact probe with a
throwing injected `clearTimer` returns `REJECTED:clear failed`, proving that
direct `readiness()` currently can reject despite the file-level “never throws”
claim. This is tracked for repair rather than hidden by a conversion wrapper.

## Skill review

Existing rules already require typed async failure, retained-capability
identity and cleanup-before-failure with exactly-once ordering. No reusable
skill update is warranted.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: timer-race and cleanup-before-failure rules already cover the blocker
Threadability: ASYNC_HAPPY_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
