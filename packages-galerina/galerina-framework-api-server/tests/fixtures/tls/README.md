# Disposable TLS fixtures

These certificates and private halves are public, disposable test vectors.
They are not secrets, governance keys, registry keys, developer credentials,
or valid production identities. Their private halves are deliberately
committed so Windows, Linux and macOS tests do not gain an ambient OpenSSL
dependency.

The `TEST-ONLY-` prefix is a structural warning. Production code must never
load this directory or accept a key whose provenance is inferred from that
prefix. Tests load the exact files by repository-relative path and use them
only on an ephemeral loopback HTTPS server.

`gen-certs.sh` deletes both CA private keys and all intermediate files after
regeneration. Regeneration changes fixture identity and therefore requires a
reviewed test run and local commit; it is not key rotation or custody work.
