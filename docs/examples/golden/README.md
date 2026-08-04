# Executable Fungi Golden Pack

This directory is the smallest current-language lookup surface for humans and
code-generation tools. Copy the shape of a relevant example, then run the
checker. Do not infer unlisted syntax or runtime support.

The larger Canonical Example Corpus remains the teaching corpus. This Golden
Pack adds a narrow property the larger corpus does not claim for every example:
each source is strict-checker proven, and each declared execution vector is
replayed by a serial probe.

Run from the repository root:

```powershell
npm run audit:fungi-golden
```

Regenerate the tracked evidence after an intentional source or compiler change:

```powershell
npm run audit:fungi-golden:update
```

The generated manifest is bounded evidence, not an exhaustive language
specification. `CHECKER_PROVEN` does not imply executable parity. A construct
without a suitable Galerina CLI input surface is recorded as `NOT_EXECUTED`.
The manifest grants no package-conversion, retirement, release or production
authority.

## Construct map

| Source | Minimal construct | Galerina execution status |
|---|---|---|
| `001-bool-if.fungi` | Boolean-only `if` | raw CLI vectors |
| `002-int-match.fungi` | exhaustive non-K3 `match` | raw CLI vector |
| `003-result-match.fungi` | named `Result` failure | governed CLI vector |
| `004-k3-check.fungi` | three-arm `check` on `Verdict` | checker only |
| `005-array-count.fungi` | immutable `Array<Int>` count | checker only |
| `006-array-get-option.fungi` | checked `Array.get` and `Option` | checker only |
| `007-string-equality.fungi` | declared `String` arguments | governed CLI vector |
| `008-while-bool-guard.fungi` | Boolean `while` guard and mutation | raw CLI vector |
| `009-checked-division.fungi` | signed division and zero refusal | raw CLI vectors |
| `010-checked-remainder.fungi` | signed remainder and zero refusal | raw CLI vectors |
| `011-canonical-record.fungi` | canonical record declaration, named construction, and declaration-order layout | raw CLI vector |
