# SLIDE V2-E frontend-receipt exit-gate adjudication

- Date: 2026-07-29
- Branch: `codex/slide-v2-architecture`
- Decision: bounded frontend-evidence V2-E exit gate satisfied
- Replacement authority: none

## Frozen identities

V2-E is a separately canonical producer receipt. It does not create another
GIR minor or modify frontend-neutral executable semantics.

| Artifact | Length | SHA-256 identity |
|---|---:|---|
| Normalized `.fungi` source | 1,492 bytes | `8bdc2c2961d0c13c66132d3d506ebe24c050e1a618631c18b30eba6539694bde` |
| Frozen V2-D semantic body | 791 bytes | `b744e3076e99404e5cc424f89939236b1377f8515970d3077b0fc18eefe78e38` |
| Frozen V2-D semantic digest | n/a | `a762d59c1552e6b3c8be45fd202b9767e52dbdfbd8684a6ea0b3cb2e029932f4` |
| V2-E canonical receipt body | 1,739 bytes | `1041154e66fc9fddd578031534d98fcbc0a058d30221ac6edc7e578cdcb1eba0` |
| Domain-separated V2-E receipt digest | n/a | `068f4d63564bc3e544b3768b4a6bb760793c4384ac194928564987e7d846bb14` |

## Implemented boundary

Galerina now has:

1. a shared `.fungi` V2-E schema separated from the producer;
2. a bounded producer that materializes source, complete source-map, semantic,
   plan, conformance, and reproducibility evidence;
3. an independent logical validator and shortest-form canonical CBOR
   encoder/importer;
4. a raw-byte source-verification entry point that rejects invalid UTF-8,
   UTF-8 BOM, CR/CRLF, NUL, drift, and ceiling violations;
5. fresh-process verification of the pinned receipt without loading the V2-E
   producer or encoder;
6. complete mapping of all 40 admitted instructions and terminators;
7. nine domain-separated plan commitments re-derived from the independently
   admitted V2-D body;
8. canonical lowercase SHA-256 validation plus comparison with a separate
   caller-owned external-evidence expectation record;
9. a minimal host primitive that verifies both Ed25519 and ML-DSA-65 under the
   registered frontend domain/context; and
10. `.fungi` signature-evidence policy that binds the expected key, independently
    recomputes the framed verifier-evidence digest, enforces freshness, rejects
    development keys under production policy, and never releases authority.

The independent SLIDE repository implements a zero-dependency canonical V2-E
decoder/verifier. It accepts source only as bytes, independently validates the
frozen V2-D body, reconstructs the complete source map, recomputes all nine
plan digests, compares caller-owned external evidence, and pins every canonical
receipt byte. It imports no Galerina producer, encoder, or package dependency.

## Verification evidence

| Gate | Fresh result |
|---|---:|
| Galerina focused V2-E logical/canonical/import/signature suite | 117/117 |
| Independent SLIDE V2-E suite | 17/17 |
| Complete independent SLIDE V2-C/V2-D/V2-E suite | 30/30 |
| Complete Galerina `slide-*.test.mjs` regression surface | 477/477 |
| Galerina core-compiler TypeScript typecheck | passed |
| Galerina core-compiler TypeScript build | passed |

The negative matrix directly covers malformed canonical bytes, version and
profile identities, source normalization and naming, missing/surplus/duplicate
or reordered source evidence, node and span lies, semantic and registry drift,
all nine plan digests, independently false signed plans, caller-owned
conformance/reproducibility mismatches, cryptographic downgrade/tamper,
wrong key/role/suite/subject/context, revocation, unavailable evidence,
malformed evidence, stale evidence, development-key production use, native
claims, and authority claims. Every refusal returns no verified receipt
digest, semantic digest, producer identity, native certificate, or authority.

## Fail-closed result

A producer signature authenticates attribution only. It cannot make a false
plan, false semantic body, false source map, or false external-evidence binding
pass. Failed V2-E verification cannot select AST, WAT/Wasm, interpreter, host,
Tower Citizen, Tri-Pipe, broker, native, or driver execution as a fallback.

## What this does not prove

This bounded gate does not prove a general Galerina source-to-GIR frontend,
native code generation, optimizer preservation, machine-code memory safety,
final-artifact binding, `.slide` container admission, runtime isolation,
production key custody, production ML-DSA implementation independence,
hardware/driver admission, broker authority, or benchmark performance.

No current Galerina component is removed. The current interpreter, bytecode,
WAT/Wasm, runtime, Tower Citizen, Tri-Pipe, database/network, and hardware
paths remain in place. They may become optional or be cut only after their own
documented replacement gates pass.

## Next boundary

Generalize the Galerina frontend so real checked `.fungi` compilation emits
the complete detached GIR plus V2-E evidence through one public seam, without
post-GIR AST recovery. Preserve this bounded vector as permanent conformance
evidence. Native, container, driver, broker, and component-removal work remains
behind their later gates.
