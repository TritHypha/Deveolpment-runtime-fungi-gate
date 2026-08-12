# Discharge Trust Fungi Conversion Implementation Plan

**Goal:** Physically execute an exact typed-K3 Fungi twin for TypeScript
`dischargeTrust` without changing or retiring consumers.

## Constraints

- Map `true -> Allow`, `false -> Deny`, and `undefined -> Unknown` explicitly.
- Keep current Deny sticky.
- Add no null, NaN, `else if`, `else`, throw, try/catch, `for`, `while` or
  `loop`.
- Keep TypeScript and all consumers active; commit locally and never push.
- Exclude full tooling, normal phase-close and monolithic memory evaluation.

## Tasks

1. Add a RED differential test for the complete 3 x 3 table and prohibited
   source shapes.
2. Add minimal `dischargeTrustFungi(current: Verdict, verification: Verdict)`
   to the existing hardening trust module and make the focused test green.
3. Add a physical SLIDE/VOK package proof covering nine typed pairs plus
   malformed ABI, fuel and mutation refusals.
4. Run bounded compiler, canonical, Golden, retirement, graph, roadmap and
   index owners; update TODO, roadmap, SVG and a custody report.
