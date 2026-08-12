# Residency tighten Fungi conversion implementation plan

**Goal:** Add and physically execute a fail-closed Fungi twin for exported
TypeScript `stricterResidency` without switching or retiring consumers.

## Constraints

- Preserve exact 25-pair canonical behavior and the left-biased equal case.
- Return `register_only` if either runtime String is outside the closed tier set.
- Add no null, NaN, `else if`, `else`, throw, try/catch, `for`, `while` or `loop`.
- Keep TypeScript and consumers active; do not claim production authority.
- Do not run full tooling, normal phase-close or whole-memory evaluation.
- Commit locally only; never push.

## Tasks

1. Add a RED differential test that requires `stricterResidencyFungi`, checks
   the 25 canonical pairs, hostile inputs and prohibited source shapes.
2. Add the minimal flow to the existing governed residency Fungi module and
   make the differential test green.
3. Add a physical SLIDE/VOK integration test with typed String receipts and
   wrong-shape, Unicode, work-budget and mutation refusals.
4. Run the bounded compiler/canonical owners, update the conversion report,
   TODO, roadmap, graphs and indexes, then commit explicit paths without push.
