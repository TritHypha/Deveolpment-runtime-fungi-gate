# Slice 245 instrumentDispatch Fungi conversion adjudication

## Outcome

`instrumentDispatch` is `BLOCKED_BY_ASYNC_HANDLER_CALLBACK_CLOCK_METRICS_TRANSACTION_ABI`. It wraps active async handlers, observes a clock, preserves rejection identity and commits to shared mutable metrics. No placeholder Fungi asset is created.

Required exit: Admit async callback/cancellation semantics and a serialized metrics commit sub-edge; make dispatch construction prototype-safe.

## Evidence

Pinned source: `52a36bcd`. `logger.ts` SHA-256 is
`A3383D45A38197F686F645D8DD9D7FF628D2FC2E3128F79DCE6ABBF81FFCEB1E`;
`kernel-integration.ts` SHA-256 is
`23325713ABF12E4DB560B235F3058585F0D5CD2163736FC80670A7C74B315318`.
Observability passes **36/36**, focused logger/kernel consumers pass **17/17**,
and TypeScript typecheck passes, with zero failures and zero skips. No exact
package-owned Fungi twin or physical SLIDE/VOK receipt exists.

## Skill review

The slice-end review updated both private skills with prototype-safe dynamic
record and non-string host JSON discriminators at translation commit
`ed2cc43` and authoring commit `dcd99f8`. Both repositories remain private
and unpushed.

## Slice-close receipt

Skill disposition: SKILL_UPDATE ed2cc43fa0ff1cb5789d063ade3597d6ae04b4f3
Threadability: ASYNC_HAPPY_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
