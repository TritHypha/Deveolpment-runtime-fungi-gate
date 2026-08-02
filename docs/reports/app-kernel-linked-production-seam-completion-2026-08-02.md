# App-kernel linked production seam completion

Date: 2026-08-02

Status: implementation green; real signed-host activation remains external

## Outcome

The app-kernel can now consume the statically linked native publication seam
without accepting a caller adapter, pathname-loaded module, claimed Boolean or
static executable digest allow-list.

`publishRegistryGenerationWithLinkedHost` requires a private production
durability profile already admitted through both hybrid root-verification
components. It then:

1. verifies the registry generation and derives its canonical bytes/identity;
2. binds generation, operational key, delegation serial and index time to the
   signed profile;
3. reads and re-hashes the exact running executable and requires the profile's
   signed binary digest;
4. obtains only the non-configurable, non-enumerable, non-writable linked
   process binding;
5. publishes through the in-process native function;
6. consumes its unforgeable receipt identity exactly once and proves replay
   fails;
7. checks platform, generation, byte length and embedded native-source digest;
8. reopens and independently verifies the immutable generation bytes; and
9. only then mints the app-kernel's private production-generation identity.

The native receipt continues to say `productionAuthorizing: false`; it cannot
authorize itself. Authority comes only from the separate signed profile plus
the app-kernel's private composition.

## Fresh evidence

- registry generation focused tests: **10/10**;
- complete app-kernel: **206/206** across 14 suites;
- typecheck and build: pass;
- copied/plain objects do not satisfy the private profile or generation brands;
- the ordinary host-evidence adapter path remains outside the linked receipt
  set and cannot become production by matching a digest.

The exact previously built linked executable is not present in the current
workspace, so its earlier raw 2/2 binding evidence was not re-run in this
chapter. A real production activation still requires the offline-signed host
profile and current external durability/platform receipts. No private key was
used and no executable digest was added to source.
