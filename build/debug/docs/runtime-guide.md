# Runtime Guide

Generated from Galerina build output.

## Memory

- Run mode: checked
- Cache IR: false
- Hot reload: false
- Soft limit: not declared
- Hard limit: not declared
- Pressure actions: not declared

## Spill

- Enabled: false
- Path: not declared
- Max disk: not declared
- TTL: not declared
- Encryption: false
- Redact secrets: true

### Spill Allow List

- none

### Spill Deny List

- SecureString
- RequestContext
- SessionToken
- PaymentToken
- PrivateKey

## Policy

- Spill is aLOw-list only.
- Secret and request context types must not spill to disk.
- Memory pressure failure paths should be source-mapped.
- Pressure actions run in declared order.

## Diagnostics

- none
