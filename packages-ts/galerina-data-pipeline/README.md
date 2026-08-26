# Galerina Data Pipeline

`galerina-data-pipeline` defines bounded streaming pipeline contracts.

Use this package for:

```text
stream sources
stream transforms
batch windows
backpressure
checkpointing
retry policy
quarantine policy
memory budgets
timeout policy
processing reports
```

## Backpressure contract

A blocking saturation policy must carry its own finite per-block bound:

```ts
const blocking = {
  maxInFlight: 64,
  onSaturation: "block",
  blockTimeoutMs: 5_000,
};
```

Non-blocking arms omit that field:

```ts
const failFast = {
  maxInFlight: 64,
  onSaturation: "fail",
};
```

`blockTimeoutMs` must be a positive safe integer. Missing or invalid bounds on
`block` refuse, and a timeout field on `fail` or `shed_oldest` also refuses so
dead configuration cannot imply protection that the selected arm never uses.
The whole-pipeline timeout is deliberately not inherited as a substitute.

This package validates the policy contract. It does not by itself prove that
every runtime scheduler enforces the declared wait or authorize production.
