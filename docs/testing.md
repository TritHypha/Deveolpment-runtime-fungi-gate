# Testing

## Summary

This workspace currently uses the Galerina core prototype for checked Run Mode smoke
tests. These tests execute `.fungi` source directly and do not produce compiled
artefacts.

## Current Smoke Tests

The app-kernel package has checked Run Mode fixtures:

```text
packages-ts/galerina-framework-app-kernel/tests/hello-world.fungi
packages-ts/galerina-framework-app-kernel/tests/vector-function.fungi
packages-ts/galerina-framework-app-kernel/tests/sum.fungi
packages-ts/galerina-framework-app-kernel/tests/decimal-sum.fungi
packages-ts/galerina-framework-app-kernel/tests/json-return.fungi
```

Run all app-kernel fixtures from the workspace root:

```bash
npm.cmd --prefix packages-ts/galerina-framework-app-kernel test
```

Expected output includes:

```text
hello from Galerina app kernel test
vector total: 6
sum: 5
decimal sum: 3.50
json ids: 1,2,3 test: xxx
```

## Test Types

- Checked Run Mode smoke tests
- Unit tests
- Integration tests
- Security checks
- Manual testing
- Build verification

## Test Structure

```text
packages-ts/galerina-framework-example-app/tests/
|-- unit/
`-- integration/

packages-ts/galerina-framework-app-kernel/tests/
|-- hello-world.fungi
|-- vector-function.fungi
|-- sum.fungi
|-- decimal-sum.fungi
`-- json-return.fungi
```
