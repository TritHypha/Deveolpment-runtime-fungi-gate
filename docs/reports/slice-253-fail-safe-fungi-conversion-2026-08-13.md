# Slice 253 failSafe Fungi conversion adjudication

## Outcome

`failSafe` is `BLOCKED_BY_ASYNC_CALLBACK_FAILURE_COLLAPSE_ABI`. It calls an
arbitrary async callback once and collapses synchronous throw or rejection to a
fixed 503 body, without timeout or cancellation and with a different body shape.

Required exit: a typed callback result, exact once-only invocation, cancellation
policy and one admitted response union; no `try`/`catch` translation is allowed.

Pinned source: `d357030d2847de0f0d9c5728ad3eab9556c6c2c4`;
`kernel-integration.ts` SHA-256
`23325713ABF12E4DB560B235F3058585F0D5CD2163736FC80670A7C74B315318`.

## Slice-close receipt

Skill disposition: SKILL_UPDATE 965388e0e6f9087a33a390eee4a51bd522d2ab6a
Threadability: ASYNC_HAPPY_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE
