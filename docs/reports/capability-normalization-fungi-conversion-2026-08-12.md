# Capability normalization Fungi conversion proof

## Outcome

The compiler's exported `normalizeCapability` admission helper now has an exact
package-owned `.fungi` counterpart and a physical SLIDE/VOK proof. The work also
closed a prototype-inheritance bug in the retained TypeScript reference.
TypeScript and every consumer remain active.

## Closed decision

Five exact aliases normalize to their governed capability names. Every other
String, including prototype names, embedded NUL, differently normalized Unicode
and whitespace variants, is returned byte-for-byte unchanged. The Fungi flow
uses exhaustive `match` and contains no `null`, `NaN`, `else if`, `throw`,
`try`/`catch`, `for`, `while`, or `loop`.

The former TypeScript lookup used a prototype-bearing object directly. Inputs
such as `constructor`, `toString` and `__proto__` therefore returned inherited
non-String values despite the declared String return type. Commit `185705de`
replaced that lookup with exact own-entry admission and added hostile regression
coverage before the Fungi translation was admitted.

## Exact custody

| Item | Evidence |
|---|---|
| TypeScript reference | 10,597 bytes; SHA-256 `ACE8FBBEB12F0D292A98B028846992EEBC8E6DF29F4678F5921B793662A30286` |
| Fungi candidate | 571 bytes; SHA-256 `8A0BB2A2EC4CC512CB984D773B4B3CBE672929CBCE513D813A7B151A0386D0D4` |
| Differential test | 3,759 bytes; SHA-256 `E5A583B3FED0C6EB7ECC65996614F049535870C3B66CA84B7B86A4BF25C3AA80` |
| Physical SLIDE/VOK test | 6,631 bytes; SHA-256 `C16806E4DDA028BEF0BB17917E9C120A434049A69244C7EA1C80B99BC6159BB8` |
| Hostile TypeScript regression | 4,536 bytes; SHA-256 `8D887C48E9D54D3771F40022E115BA7E6A518C15092876B87056DB3DB31004CE` |
| Independent SLIDE build point | `dc1add78215cfce2b5d23fcf194076b56501fa53` |
| Executable registry | `slide.registry.executable-gir.v2c-bounded-wide-control-flow.v1` |
| Registry digest | `d805dae4b822392e5092126ce4f0fb27e8bfa6aa2de8862ee88e09e23eed43cc` |
| TypeScript repair commit | `185705de` |
| Galerina source/proof commit | `7351f17e` |
| Registry-binding test commit | `3455464d` |
| Retirement owner commit | `99eb639a` |

## Verification

- The repaired TypeScript helper, typed Fungi interpreter and public
  `isAdmissibleCapability` caller agree over 18 canonical and hostile Strings;
  the combined admission/conversion neighborhood passes **10/10**.
- Independent SLIDE compiles the exact Fungi bytes, publishes one physical
  `.slide`, independently re-admits it through VOK and verifies typed String
  receipts for every vector (**1/1**, zero skips).
- Wrong type or arity, surplus input, invalid UTF-16, step exhaustion, source
  mutation and one-byte artifact mutation all refuse. The physical proof also
  pins the exact executable registry identity and digest.
- Complete compiler package lane: **6,357/6,357** pass with zero failures and
  zero skips.
- Complete canonical owner: **100/100 packages and 9,577 tests** pass in
  **274.0 seconds** with captured exit code 0.
- Retirement evidence records **1,431 executable-family paths**, **900**
  `.mjs` paths, **489** source `.ts` paths and **121** `.fungi` source assets.

## Authority boundary

`capability-types.ts`, `normalizeCapability`, `isAdmissibleCapability` and every
caller remain active. This proof grants no consumer-switch, production,
release, signing, platform or terminal-retirement authority. Repository-wide
closure remains UNKNOWN because the crash-linked closure lanes remain excluded.
