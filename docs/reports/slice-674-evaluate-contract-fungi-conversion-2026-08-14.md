# Slice 674 evaluateContract Fungi conversion adjudication

Scope: `packages-galerina/galerina-tower-citizen/src/epistemic-type-state.ts#evaluateContract`.

`BLOCKED` (BLOCKED_BY_UNVALIDATED_ENFORCEMENT_MODE_CALLBACK_VERDICT_AUDIT_ORDER_ABI): Preserve source order exactly: invoke the contract first, mint and decide its Verdict with diagnostic effects, then decode the mode through a deny/refusal wildcard before returning. Decoding first requires an owner-approved versioned contract change.

Minimum vectors: Three modes x three verdicts; bogus/case/wrong mode combined separately with a callback side effect, invalid Verdict 2 and callback throw; sink throw/re-entry; exact contract then diagnostic then mode-decode precedence.

Evidence: source build point `e0ba95f789837672e3225e044d5a95e39e18ddc0`;
source SHA-256 `90419EB0C24283C93B97AFA298D2105557FEC1C9AC32710B1E1A96CF62DCDF4C`;
live scoped bytes remain identical through the authored plan. Focused Tower evidence is pinned by `epistemic-type-state.test.mjs` SHA-256 `B5488B6A5A13AE01DD061F45681ACC87C928FC6F51601EAAD4216CB25FC2AFFA`, `hardening-trit-conformance.test.mjs` SHA-256 `C48A81AFF544315D5263F65DC077E4CD0C8950441FBC066CC1A359BF8DFF04B4`, and `gate-cache.test.mjs` SHA-256 `468E5B5EBB0F86229CBA202CDD9B9774524474A49637401C57CB57B0161BADBC`. Fresh Tower no-emit typecheck and 515/515 existing tests pass. These checks are regression evidence only. No exact scoped Fungi/GIR/physical `.slide`/independent re-admission/VOK replacement, consumer switch or TypeScript retirement exists.

Private skill commits: translation `e7b3af182261eb17b8362143781628290a5d1792`; authoring `9c74a4774435e3428b5d3bff34725f65de41f844`. Both remain private and unpushed.

## Slice-close receipt

Skill disposition: SKILL_UPDATE e7b3af182261eb17b8362143781628290a5d1792
Authoring skill disposition: SKILL_UPDATE 9c74a4774435e3428b5d3bff34725f65de41f844
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE
