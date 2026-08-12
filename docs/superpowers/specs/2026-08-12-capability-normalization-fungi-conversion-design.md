# Capability normalization Fungi conversion design

## Objective

Give the compiler's exported `normalizeCapability` border decision an exact
package-owned `.fungi` counterpart and prove it through physical SLIDE/VOK.
Keep TypeScript and every caller active.

## Security precondition

The former TypeScript lookup inherited properties from `Object.prototype`.
Names such as `constructor`, `toString`, and `__proto__` therefore escaped the
declared String result. A test-first repair now admits only own alias-table
entries and keeps all other Strings unchanged. The Fungi translation binds to
that repaired source, not to the unsafe behavior.

## Closed semantics

Exactly five aliases are mapped:

- `db.read` to `database.read`
- `db.write` to `database.write`
- `filesystem.read` to `storage.read`
- `filesystem.write` to `storage.write`
- `time.read` to `clock.read`

Every other String is returned byte-for-byte unchanged. There is no case
folding, trimming, Unicode normalization, wildcarding, or prototype lookup.

## Source and proof shape

The pure Fungi flow accepts and returns `String`, uses exhaustive `match` with
a terminal `_ =>`, and contains no `null`, `NaN`, `else if`, `throw`,
`try`/`catch`, `for`, `while`, or `loop`. Differential evidence covers every
alias plus canonical, hostile, Unicode, embedded-NUL, and prototype-property
names. Physical evidence must publish a `.slide`, independently re-admit it
through VOK, verify typed String receipts, and refuse malformed arguments,
work exhaustion, source mutation, and artifact mutation.

## Authority boundary

This remains reference-only. It does not switch `isAdmissibleCapability`,
border-check, plugin validation, fusion admission, or any production consumer;
it grants no release or TypeScript-retirement authority.
