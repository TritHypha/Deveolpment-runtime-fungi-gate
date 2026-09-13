# RD-0873 direct Fungi conversion — waves 40–45

Date: 2026-09-13
Head: 675e1048304b11e109b1de4f68af97ebc64f5949
Tree: b20138180928ed9d787d157d1faedbe86050be64
Worker ceiling: **Luna - High**
Execution: local only; Git is storage, with no CI or hosted build.

Six bounded leaves were produced by the three designated Fungi workers
(fungi_translate_core_compute, fungi_translate_core_economics and
fungi_translate_core_reports). Each TypeScript shadow remains retained:

- galerina-db-firestore#validateFirestoreCredentialRef ->
  packages/fungi/products/galerina-db-firestore/validate-firestore-credential-ref.fungi
  (4,552 bytes), parity **10/10**.
- galerina-db-mysql#validateMysqlCredentialRef ->
  packages/fungi/products/galerina-db-mysql/validate-mysql-credential-ref.fungi
  (5,196 bytes), parity **12/12**.
- galerina-db-postgres#validatePostgresCredentialRef ->
  packages/fungi/products/galerina-db-postgres/validate-postgres-credential-ref.fungi
  (5,504 bytes), interpreter and signed-Wasm parity **11/11** each.
- galerina-db-opensearch#validateOpenSearchCredentialRef ->
  packages/fungi/products/galerina-db-opensearch/validate-opensearch-credential-ref.fungi
  (4,563 bytes), parity **10/10**.
- galerina-db-sqlite#validateSqliteCredentialRef ->
  packages/fungi/products/galerina-db-sqlite/validate-sqlite-credential-ref.fungi
  (5,217 bytes), parity **12/12**.
- galerina-substrate-math#flipProbability ->
  packages/fungi/products/galerina-substrate-math/flip-probability.fungi
  (1,135 bytes), finite interpreter and signed-Wasm parity **8/8** each; three
  nonfinite cases are recorded as an explicit host/manual boundary.

All six targets passed strict Fungi checks and serial local builds. The six
retained TypeScript package suites passed **126/126** tests in total
(Firestore 26, MySQL 24, Postgres 24, OpenSearch 25, SQLite 21 and
substrate-math 6). Ten fresh local strict-check invocations per target passed
**60/60**, with means from **241.7 ms to 250.5 ms** including Node/compiler
startup. The CLI benchmark subcommand remains an unimplemented diagnostic.

Root verification repaired the MySQL payload-scan Bool comparison and several
Postgres lexer/semantic issues: unsupported Char literals were replaced with
Char.fromCode, markerFound now compares explicitly to true, and the
passwordStopped typo was corrected to partStopped. The final aggregate Fungi run
passed **44/44 strict checks** and **44/44 serial builds**.

The direct-tree ledger is now **43/100** package roots with **44** buildable
leaves totalling **95,841 bytes**; **57** package roots remain. Credential
resolution, secret/key custody, provider/network effects, malformed host
objects, nonfinite numeric behavior where noted, physical ABI admission and
production authority remain host-owned boundaries. No production authority or
consumer switch changed.
