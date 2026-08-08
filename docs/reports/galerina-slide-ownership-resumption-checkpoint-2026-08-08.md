# Galerina and SLIDE ownership-resumption checkpoint

Date: 2026-08-08  
Authority: local engineering evidence only; no push, release, production-signing or retirement authority

## Outcome

The current Galerina host/bootstrap estate is green after Hypha was admitted as
the 99th flat workspace peer and the 7-8 August compiler, `.gate`, retention and
tooling changes were reconciled.

| Surface | Fresh result |
|---|---:|
| Workspace aggregate | 99/99 packages; 9,452 tests; 0 failed |
| Compiler package | 6,313 tests |
| Tooling tests | 424 total; 422 pass; 2 intentional skip; 0 fail |
| Graph generation | 5/5 |
| Graph check | 5/5 |
| Fungi Golden Pack | 11/11 checked; 11/11 executed |
| Independent SLIDE bounded baseline | 713/713 across 73 suites |
| Exhaustive Galerina phase-close | 90/90; 1,038.2 seconds; all blocking gates passed |
| Post-run Node census | no phase-close-owned Node process remained |

## Defects closed in this chapter

1. `galerina-devtools-hypha` existed as a direct package but was absent from the
   workspace manifest. It is now one top-level peer with governed graph outputs;
   no nesting or exception was introduced.
2. The package-retirement status ledger still stated 497 TypeScript paths and
   38 host boundaries. It now derives and reports 516 and 42 respectively.
3. Four checked-decision frontend matches had no explicit wildcard terminal.
   Each now has a fail-closed `_ =>` return.
4. A control-flow example invented an unregistered bounds label, creating a new
   phantom diagnostic. It now uses the real `FUNGI-MEMORY-006` authority. The
   registry returned to 111 unadjudicated phantoms and the named membership
   ratchet.
5. A nested retention audit inherited `NODE_TEST_CONTEXT`, so 13 passing cache
   regressions became an unparseable child summary. Probe children now receive a
   fresh Node-test presentation boundary while retaining suite/process custody.
6. Direct phase-close tooling tests inherited the host CPU count. The phase-close
   command now fixes their worker ceiling at four and a source-shape regression
   test prevents removal.
7. Gate order six moved from planned/red to an implemented, non-authorizing link
   plan with 18/18 focused tests. It does not execute a circuit or grant release
   authority.
8. A clean worktree install/build exposed package-junction identity leakage in
   the first isolated setup. The verification environment now installs every
   flat peer locally; the full 99-package build and 9,452-test aggregate pass
   without borrowing another checkout's dependency identities.
9. Canonical evidence and governed text now have explicit LF attributes. Exact
   benchmark/Vade pins reproduce on Windows, SVG graphs no longer depend on
   checkout conversion, and the old example public key is test-fixture-only.
10. `graph-all` previously generated the project graph before generators that
    mutate its input set. Project graph now runs last; a fresh one-pass
    generate/check is 5/5 + 5/5.
11. The count-owning test runner previously sorted packages alphabetically.
    Local `file:` dependencies now run first, cycles refuse, and bounded npm
    diagnostics remain visible. The clean dependency-first aggregate is
    99/99 packages, 9,452 tests, 0 failed.
12. The first exact isolated exhaustive attempt exposed four checkout-state
    assumptions. Coverage output is regenerated after its index; phase-close
    builds and compiler-source-indexes Myco before the no-refresh audit; the
    path-leak self-test derives the actual checkout basename; and `.cc`/`.patch`
    checkouts preserve the LF bytes already named by static-host manifests.
    Focused combined evidence is 17/17; no signed digest was edited.

## Exact remaining retirement debt

- 516 tracked package TypeScript paths, 501 under package `src`;
- 111/111 tracked `.fungi` sources not yet production-executed;
- 0/42 host boundaries owned by the replacement path;
- 95 package-local `node_modules` trees;
- one nested native identity.

No debt was deleted, exempted or converted by this verification chapter.

## Fixed-point qualification

The initial 88/88 exhaustive result belongs to its recorded tree. The isolated
checkout now provides a stable full-build, full-aggregate and exhaustive fixed
point: the repaired tree passed 90/90 blocking gates in 1,038.2 seconds. This
does not release production, signing, package-conversion or retirement
authority; it closes the Galerina host/bootstrap verification gate for the next
independent SLIDE backend increment.

## Next critical path

1. Use the repository-owned Myco and Hypha tools to produce the next dependency,
   capability and host-boundary inventory; build a new tool only for a proven
   uncovered question.
2. Implement the smallest general independent SLIDE successor: general bodies,
   structured control/loops, exact CFG/SSA/type/K3 validation and bounded work.
3. Add owned memory, failures, effects/capabilities and host profiles one closed
   family at a time through physical `.slide`, affine VOK and typed receipts.
4. Close authenticated object/platform/anchor authority, then switch packages by
   exact executed parity tranches until the retirement ledger reaches zero.
