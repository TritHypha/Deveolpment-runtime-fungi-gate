# Fungi staging logic and syntax resolution

Status: static repair complete; candidates remain non-authorizing

Date: 2026-07-31

## Outcome

Every reproducible logic or syntax issue in the external GPU, native and Wasm
candidate chapter is repaired at its correct seam. The audit now proves that a
candidate is flat, explicitly scoped and accompanied by a non-empty dossier.
The compiler now resolves `for x in xs` with the same lexical-scope discipline
already used by the parser, interpreter and WAT emitter.

No candidate has been copied into `packages-galerina/`, no TypeScript oracle
has been removed, and no staging result has gained execution or governance
authority.

## Repairs

| Surface | Previous failure | Resolution |
|---|---|---|
| staging schema | any truthy schema value passed | require exact `galerina.staging-candidate/v1` |
| dossier | missing or empty status/vector/plan files still passed | require all three, non-empty, with bounded vector/refusal arrays |
| manifest/source parity | declared exports could name absent flows | compare every export with a declared source flow |
| match exhaustiveness | empty `None` or wildcard arms could silently continue | refuse empty terminal arms; candidates trap impossible/unknown states |
| diagnostics | GPU/native/Wasm report builders returned only the report | return report plus the complete accumulated diagnostic collection |
| diagnostic identity | repeated artefacts lost their index in paths | restore deterministic indexed paths |
| array invariants | an impossible `Array.get` miss could skip an artefact | trap on `None` and wildcard states |
| enum handling | unknown values could collapse to strings or Booleans | trap on wildcard states |
| `for x in xs` | resolver reported the loop binding as unknown | create a lexical loop scope and bind the pattern before `where` and body |
| test-process boundary | Windows tests launched fixed `node`/`npm` commands with `shell: true`, producing Node `DEP0190` | invoke the current Node executable and npm JS entry directly with argument arrays and `shell: false` |

## Developer experience ruling

Fail-close does not require opaque diagnostics. Senior developers should see
the exact candidate, indexed field and stable compiler code that caused a
refusal. The repaired result builders preserve all diagnostics rather than
returning only a Boolean or aggregate count.

The language discipline remains:

- use `if` only for Boolean conditions;
- use `check` for K3 authority and terminal refusal;
- use `match` when two or more non-K3 states must be exhausted;
- make impossible states explicit and terminal with `_=>`/trap behavior;
- never use a default arm to manufacture a plausible value.

## Fresh evidence required at closure

1. staging audit tests: **10/10**, then live audit PASS;
2. strict frontend checks: all four staged candidates report **0 errors and
   0 governance warnings**;
3. core compiler package: **5,755/5,755**, including all resolver tests;
4. shell-boundary regression subset: **47/47** with no `DEP0190`;
5. independent SLIDE: **54/54**, plus the exact 15-file V2 contract.

Even when all four are green, executable differential parity, negative
controls, mutation resistance, provenance, flat dependency admission and the
governed package switch remain mandatory before adoption.

## Remaining engineering gates

- execute every parity and refusal vector through the independent backend;
- prove byte/diagnostic parity with the admitted oracle;
- mutation-kill each validation and refusal branch;
- bind dependencies and generated artifacts into immutable receipts;
- admit one package edge at a time and rerun the complete graph/audit/test
  fixed point;
- delete a TypeScript oracle only after the replacement independently passes
  its retirement gate.

## Owner questions

None. The remaining items are engineering evidence, not policy choices.
