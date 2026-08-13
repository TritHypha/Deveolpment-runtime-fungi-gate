# Slice 250 ObservabilitySurface Fungi conversion adjudication

## Outcome

`ObservabilitySurface` is `BLOCKED_BY_ACTIVE_ROUTE_DISPATCH_CAPABILITY_ABI`.
Its dispatch table retains synchronous and asynchronous callbacks; immutable
route transport cannot prove handler identity, effects, rejection or revocation.

Required exit: admit exact routes, affine handlers, route-handler binding and
callback lifecycle through physical SLIDE and VOK.

Pinned source: `d357030d2847de0f0d9c5728ad3eab9556c6c2c4`;
`kernel-integration.ts` SHA-256
`23325713ABF12E4DB560B235F3058585F0D5CD2163736FC80670A7C74B315318`.

## Slice-close receipt

Skill disposition: SKILL_UPDATE 965388e0e6f9087a33a390eee4a51bd522d2ab6a
Threadability: ASYNC_HAPPY_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE
