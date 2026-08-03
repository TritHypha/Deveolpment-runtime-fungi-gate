# Governed CLI exact argument admission design

Date: 2026-08-03

Status: approved through the owner's full-autonomy direction

## Problem

The legacy governed CLI currently infers a positional argument's runtime tag
from its spelling rather than from the selected flow's declared parameter
type. It also ignores surplus arguments. A scalar supplied to an Array-typed
parameter can therefore reach the interpreter and execute the flow's
empty/default Array path instead of refusing. This can create false parity
evidence for external TypeScript-to-Fungi translation work.

## Considered approaches

1. **Exact declared-type admission for the existing CLI (selected).** Require
   exact arity, marshal only the existing scalar `Int`, `Bool` and `String`
   profiles according to declared types, and refuse every unsupported type.
   This closes the observed defect without inventing a structured CLI format.
2. **Add JSON or file-backed structured arguments.** This could represent
   Arrays and records, but it creates a new parser, resource limits, hostile
   input surface and compatibility contract. It belongs in a separate design.
3. **Leave the CLI permissive and require researchers to use SLIDE.** This
   retains a known false-positive evidence path and is incompatible with the
   project's fail-closed standard.

## Selected behavior

For `galerina run <file> --invoke <flow> ... --governed`:

1. Resolve the selected flow before admitting arguments.
2. Derive each parameter's name and exact declared type from `FlowMeta.params`.
   `readonly` and `tainted` prefixes do not change the type. A `source_from`
   suffix is metadata and is excluded from the type.
3. Require the number of positional values to equal the declared parameter
   count. Missing and surplus values both refuse with exit code 2 before
   interpreter execution.
4. Marshal by declared type:
   - `Bool`: only literal `true` or `false`;
   - `Int`: only a canonical signed decimal integer representable as a safe
     JavaScript integer;
   - `String`: the exact positional token, including numeric-looking and
     Boolean-looking text; and
   - every other declared type: refuse as unsupported by this CLI surface.
5. Do not add Array, Bytes, Float, record, variant, Result, Option or generic
   parsing. The independent typed SLIDE package API remains the correct
   reference surface for profiles it admits.
6. On refusal, name the argument position, parameter name and declared type
   without executing the flow. Do not echo secret values.

Raw non-governed `--invoke` behavior is outside this slice and remains
unchanged.

## Compatibility decision

The change intentionally rejects previously tolerated ambiguous inputs:
fractional/exponent/hex spellings for an `Int`, missing arguments, surplus
arguments and non-scalar declared types. Numeric-looking values declared as
`String` become correctly representable because admission follows the declared
type instead of lexical guessing.

This is a development CLI compatibility tightening, not a language syntax or
production runtime change.

## Test design

Extend the existing real-process CLI regression suite. Tests must prove:

- a scalar supplied to `Array<Int>` refuses before the empty path executes;
- missing and surplus arguments refuse;
- `Int`, `Bool` and `String` marshal by their declared types;
- a numeric-looking declared String remains String;
- malformed Bool and non-canonical/unsafe Int values refuse; and
- the existing no-argument governed flow and governance-refusal paths remain
  green.

No mocks are required. Each assertion observes the actual CLI exit status and
output from a temporary `.fungi` fixture.

## Nonclaims

This design does not add a general structured argument format, authorize an
external conversion candidate, change SLIDE admission, close package
retirement, or claim production authority.
