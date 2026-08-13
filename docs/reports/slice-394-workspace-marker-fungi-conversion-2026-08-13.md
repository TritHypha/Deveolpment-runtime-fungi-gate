# Slice 394 WORKSPACE_MARKER Fungi conversion adjudication

Scope: `packages-galerina/galerina-test/src/paths.ts#WORKSPACE_MARKER`.

The exact immutable String constant is superseded by package-owned
`src/self-hosted/workspace-marker.fungi`. The candidate passes strict checking,
interpretation and signed-Wasm admission **2/2**. Filesystem marker identity
and attestation remain separate blockers in Slices 395-396. TypeScript remains.

Evidence: source build point `ce842d8e20c2139f7bfc65f212a635cac224e8f9`;
source SHA-256 `40785B8B394705CF309832755556C2554557967B61E51FD28D587130F04409D9`;
package typecheck, focused foundation tests and the exact candidate **2/2** pass.
The package manifest binds the Fungi asset. The candidate is reference evidence,
not a consumer switch, filesystem attestation or TypeScript retirement.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: current private translation rules already cover this reusable boundary
Authoring skill disposition: NO_SKILL_UPDATE: existing String-return rules proved the candidate without a new reusable rule
Threadability: PARALLEL_PURE
Source classification: SUPERSEDED_BY_EXISTING_FUNGI
Bounded closure: COMPLETE
