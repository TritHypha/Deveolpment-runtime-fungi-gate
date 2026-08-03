# Receipt-Bound SLIDE Package Build Completion

Date: 2026-08-03
Status: bounded reference build green; production authority remains closed

## Outcome

Galerina now has one explicit command for building a closed `.fungi` package
with a content-pinned SLIDE reference compiler. Selection is by verified bytes,
not executable name, filesystem proximity or ambient dependency resolution.

The command is separate from ordinary `build`:

```text
node galerina.mjs build-slide-package \
  --root <package-root> \
  --manifest <canonical-source-manifest> \
  --out <new-output-directory> \
  --slide-tool-root <admitted-slide-tool-root> \
  --slide-tool-manifest <canonical-tool-manifest> \
  --slide-tool-digest <expected-tool-manifest-digest> \
  --runtime-digest <expected-bootstrap-runtime-digest>
```

Arguments are exact and ordered. Missing, duplicate, surplus or reordered
fields refuse.

## Verification boundary

Before execution, Galerina independently verifies:

- the canonical SLIDE reference-tool manifest and its expected digest;
- every stable, root-confined, non-symlinked tool source file;
- the exact registered compiler profile and entrypoint; and
- two stable reads of the current bootstrap runtime against the expected
  runtime digest.

The child is started through the existing owned-process boundary with a minimal
environment, bounded time and bounded output. No `PATH`, sibling-checkout,
`node_modules` or backend fallback search exists.

After execution, Galerina treats the child result only as a claim. It reopens
the canonical source manifest and its complete stable source closure, physical
receipt and every `.slide` artifact, then independently validates exact
directory closure, filenames, context, canonical descriptors, GIR and bundle
headers, artifact digests, package content, dependency topology and the
package-set identity. A child success code or Boolean cannot authorize an
invalid publication.

## Evidence

| Check | Result |
|---|---:|
| Focused verifier and CLI tests | 7/7 |
| Real cross-repository library and top-level CLI build | 1/1 |
| Complete serial SLIDE tests | 493/493 across 50 suites |
| SLIDE contract manifest | 29/29 |
| SLIDE security closure | verdict `+1`; evidence K3 `0` |
| Galerina complete phase-close | all blocking gates passed; 98 packages, 8,831 tests |
| Galerina tooling and examples | 343/343; 233/233 |
| Galerina generated evidence | graph 5/5; code index/registry/coverage current |
| Node processes around real integration | 1 before; 1 after |

## Refusal and non-claims

Any missing identity, digest drift, redirected file, unstable read, child
failure, malformed result, incomplete publication or independently detected
artifact mismatch returns a closed refusal. Partial output is never treated as
a successful package.

This route remains reference-only. It does not sign or admit production
sources, establish native power-loss durability, complete general language or
effect semantics, replace the production runtime, convert a package or release
execution authority. Ordinary Galerina build behaviour is unchanged.
