# Slice 87 TLS Socket Guard Adjudication

`packages-galerina/galerina-framework-api-server/src/index.ts#isTlsSocket` is
`BLOCKED_BY_HOST_DUCK_TYPED_METHOD_IDENTITY_ABI`. Source SHA-256 is
`6a6d86fcd96a8cd19277241a8718d14e203808a2063476e889a14685e106824b`.

The JavaScript guard observes an active object's `getPeerCertificate` property
and accepts any function-valued result. Accessors and proxies can execute during
that observation. Exact physical records instead refuse those shapes before
Fungi runs and expose no host method-identity ABI. API Server passes 26/26. No
candidate asset was created.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing active-object and exact-record refusal rules cover this boundary
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE
