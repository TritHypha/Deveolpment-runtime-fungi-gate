# Verified native operation boundary: worked example

## Status

This document explains the adopted relationship between `unsafe let`,
Hallmarks and the SLIDE Verified Object Kernel (VOK). It deliberately separates:

- **current Galerina source forms**, which the compiler checks today; and
- the **planned Verified Native Operation path**, which is not application
  `.fungi` syntax and is not yet a general production authority.

The example makes no claim that a Hallmark removes a bounds check or that the
current compiler can emit a general VOK native operation.

## Example scenario

An HTTP request supplies an index and a collection. The application needs one
element. A future optimizer may remove repeated checks inside a proven bounded
kernel, but application code must remain memory-managed and pointer-free.

### 1. Mark boundary data as untrusted

The developer uses `unsafe let` for request-origin data:

```fungi
secure flow createUser(request: Request) -> CreateUserResult

contract {
  types {
    type CreateUserResult = Result<UserId, UserError>
  }

  intent {
    "Create a user from an HTTP request, treating all request body fields as unsafe at the trust boundary."
  }

  effects {
    database.write
    audit.write
  }
}
{
  unsafe let rawEmail: String = request.body.email
  let email: protected Email = validate.email(rawEmail)?
  let userId = UsersDB.insert({ email: email })?
  let auditEmail: redacted Email = redact(email)
  AuditLog.write({ action: "createUser", email: auditEmail, userId: userId })
  return Ok(userId)
}
```

This is an excerpt of current source syntax, drawn from
[151 - HTTP request boundary](Level-4-Security/151-http-request-boundary/example.fungi).
Here, `unsafe` means **security-untrusted input**. It does not grant raw-pointer,
unchecked-index, manual-free, effect or native-code authority.

### 2. Carry an assayed domain fact with a Hallmark

A Hallmark creates a nominal type only through its rejecting assay:

```fungi
hallmark CustomerRef of String {
  gate: flow assayCustomerRef
}

pure flow assayCustomerRef(raw: String) -> Result<CustomerRef, ValidationError> {
  contract { intent "Assay a raw string into a CustomerRef: 13 chars." }
  if raw.length() != 13 { return Err(ValidationError("wrong length")) }
  return Ok(CustomerRef(raw))
}
```

This is an excerpt of current source syntax, drawn from
[094 - Hallmark declaration](Level-2-Types/094-hallmark-declaration/example.fungi).
A future bounded-index Hallmark could carry a typed, assayed index fact, but its
name and successful assay still would **not** authorize unchecked memory access.

### 3. Re-prove the complete operation

The future compiler/VOK sequence is an internal authority protocol, not syntax
the application developer writes:

```text
flow-owned checked values
  -> canonical GIR and complete object facts
  -> compiler derives a closed bounds/lifetime proof
  -> independent verifier re-derives the required facts
  -> VOK binds proof + object + target + policy + generation
  -> one affine lease executes one bounded native operation
  -> value-only receipt; lease and local region close on every exit
```

For an indexed operation, admission requires at least:

- the exact collection generation and length;
- the complete index domain, including integer and overflow semantics;
- stable alias and mutation facts for the operation lifetime;
- the exact emitted object, target, compiler, verifier and policy identities;
- an admitted checked implementation with equivalent observable behaviour;
- a one-use VOK lease and terminal cleanup on allow, deny, indeterminate, error
  and trap paths.

If any required gate is `0` or `-1`, the native operation is not admitted. The
policy may select the separately verified checked implementation; if fallback
is forbidden or cannot be proved equivalent, execution terminates with `_=>`.

## Who owns which decision?

| Layer | Owns | Does not own |
|---|---|---|
| `unsafe let` | marks boundary-origin data as untrusted | memory or native authority |
| Hallmark assay | mints a nominal value after a rejecting domain test | capability, effect, pointer or VOK authority |
| compiler | derives a proposal and closed proof obligations from canonical source/GIR | final self-authorization |
| independent verifier | re-derives the required facts from the exact object and context | application policy or reusable authority |
| VOK | binds the exact admitted object and opens one affine execution lease | source meaning by itself |
| runtime | owns allocation, cleanup and result revalidation | developer-visible raw pointers or manual frees |

## Injection and forgery examples

These inputs must refuse the native path:

- a value renamed or forged to look like a bounded-index Hallmark;
- a Hallmark minted for one collection and replayed against another;
- a proof copied from an older object generation;
- a data-derived symbol, relocation, import, path or instruction sequence;
- an output buffer with one element not definitely initialized;
- overlapping worker regions or an alias that can escape the lease;
- a receipt replayed as if it were execution authority.

Refusal must not become a guessed default, silent continuation, authority
expansion or a retry-until-allow loop.

## Control-flow reminder for translators

Type comes first; terminality comes second:

- use `if` only when the subject is proven `Bool`;
- use `check` only for a typed K3 `Verdict`, with all three arms; for an
  authority decision, make the construct terminal by returning or trapping in
  every arm;
- use exhaustive `match` for `Int`, `Option`, `Result`, enums and other
  non-`Verdict` alternatives, including a terminal `_ =>` refusal;
- an `Int` carrying `+1`, `0` or `0 - 1` is still an `Int`, not a `Verdict`;
  do not feed it to `check` or silently coerce it.

If a K3 allow result needs more work, call that work from the `if:` arm and
return its typed result so the authority decision remains one auditable,
terminal construct.

## Evidence boundary

The current language examples prove frontend syntax and checking only. A
production claim additionally requires independent executable SLIDE/VOK
parity, hostile and mutation testing, platform evidence, lifecycle evidence,
and paired performance measurements against the checked implementation.

Architecture ruling:
`../../../ZTF-Knowledge-Bases/RD-0680-galerina-verified-native-operation-hallmark-vok-ruling.md`
