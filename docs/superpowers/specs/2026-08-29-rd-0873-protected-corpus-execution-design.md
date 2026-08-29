# RD-0873 Protected Corpus Execution Design

**Status:** OWNER APPROVED FOR IMPLEMENTATION

**Date:** 2026-08-29

**Parent design:** `docs/superpowers/specs/2026-08-28-rd-0873-native-fungi-bootstrap-design.md`

**Review input:** independent Task 3 review at commit
`e42f319cba4cce4da407e8d4732a7d7a6cef519b` (`Critical 0 / Important 5`)

## 1. Decision

Corpus Audit v2 may mint a PROJECT receipt only when the exact source and
compiler bytes used by every checker child remain authenticated and
non-substitutable for the child's complete lifetime. On the currently admitted
platform this is enforced by the verified Windows process warden.

The repair has three bounded parts:

1. the owned-process controller enforces independent stdout and stderr limits
   and reports raw byte counts for each stream;
2. the Windows warden admits an exact digest-bound protected-file manifest,
   rejects reparse ancestry, opens and hashes every named file, and retains the
   file and ancestor handles until the owned child tree closes;
3. Corpus Audit v2 supplies the source/compiler closure to that owner and
   hardens AbortSignal, exit classification, Git environment and platform
   routing.

The change does not redesign the main compiler CLI, snapshot source into a
temporary tree, or widen native execution authority.

## 2. Trust and authority boundary

The repository's generated-artifact lifecycle design identifies the invoked
Node runtime, operating-system filesystem provider and Git executable as
trusted process roots. This design retains that boundary. It does not treat
ambient Git repository redirects, path lookup, source paths or compiler module
paths as trusted merely because those roots are trusted.

The child command is the already-selected `process.execPath`; no shell and no
PATH lookup is used for Node. Git observations run with `shell:false`, the
canonical repository root as `cwd`, `-c safe.directory=<canonical-root>`,
and a closed environment derived by removing repository-redirecting and
interactive Git variables.

The scrubbed Git names are:

```text
GIT_DIR
GIT_WORK_TREE
GIT_INDEX_FILE
GIT_OBJECT_DIRECTORY
GIT_ALTERNATE_OBJECT_DIRECTORIES
GIT_COMMON_DIR
GIT_ASKPASS
GIT_CONFIG
GIT_CONFIG_COUNT
GIT_CONFIG_KEY_*
GIT_CONFIG_VALUE_*
GIT_CONFIG_GLOBAL
GIT_CONFIG_NOSYSTEM
GIT_CONFIG_SYSTEM
GIT_SSH
GIT_SSH_COMMAND
```

The adapter sets `GIT_TERMINAL_PROMPT=0`, `GIT_OPTIONAL_LOCKS=0`,
`GIT_NO_LAZY_FETCH=1` and `GIT_NO_REPLACE_OBJECTS=1`. It inherits only
ordinary host variables needed to locate the trusted Git executable and operate
the host; redirecting variables cannot cross the boundary.

## 3. Owned-process interface

`runOwnedProcess` keeps `maxOutputBytes` as the compatibility default and
adds:

```js
{
  maxStdoutBytes: positiveSafeInteger,
  maxStderrBytes: positiveSafeInteger,
  protectedFileSet: {
    schema: "galerina.protected-file-set.v1",
    root: canonicalAbsoluteDirectory,
    files: [
      { path: "repository/relative/direct.file", sha256: "64 lowercase hex" }
    ]
  } | null
}
```

If a per-stream value is absent it inherits `maxOutputBytes`. Each stream owns
its own counter and ceiling. Returned evidence adds `stdoutBytes` and
`stderrBytes`, counting received bytes before UTF-8 decoding or truncation.
Exceeding either ceiling terminates the whole owned tree and sets
`outputLimitExceeded`; it never borrows unused capacity from the other stream.

`protectedReadTree` remains a compatibility surface for existing callers. It
cannot satisfy Corpus Audit v2 because it binds a mutable traversal rather than
an exact file/digest set. Supplying both protection modes is invalid.

`runOwnedProcessSync` carries the independent stream limits through its JSON
request and sizes the wrapper buffer from both explicit ceilings plus the fixed
wrapper allowance. Child evidence returns through an internal binary frame:
fixed magic/version, bounded closed JSON metadata, explicit raw payload lengths,
then the already-bounded stdout and stderr buffers. The parent uses
`encoding:null`, validates the exact frame and only then decodes the two
public strings. This avoids JSON body escaping and a false
`MAX_STRING_LENGTH` ceiling while preserving the existing synchronous API.
The protected-file manifest remains asynchronous-only in this chapter; a
synchronous caller that supplies it is refused before spawn.

## 4. Protected-file manifest

The manifest is canonical JSON encoded as UTF-8 and delivered to the verified
warden over its standard input. It is not placed in argv, a repository file or
a receipt. The controller closes stdin after writing the complete bounded
manifest; the warden parses and authenticates it before target creation. The
target therefore inherits an already-closed stdin when protection is active.

The admitted limits are:

- schema exactly `galerina.protected-file-set.v1`;
- exact keys only at every object level;
- root is an existing canonical absolute direct directory;
- 1 through 8192 files;
- encoded manifest at most 4 MiB;
- each path is NFC, slash-separated, relative, traversal-free and at most
  4096 UTF-8 bytes;
- entries are lexically sorted and contain no exact or Windows
  case-insensitive aliases;
- each digest is exactly 64 lowercase hexadecimal SHA-256 characters.

The controller validates the closed shape without invoking getters, Proxies or
foreign prototypes. The warden independently applies the same semantic limits;
controller validation is not authority for the native side.

## 5. Windows authentication and retention

For every protected entry, the warden performs this sequence before creating
the target:

1. join the validated relative path beneath the canonical root;
2. walk root-to-leaf and reject any component with
   `FILE_ATTRIBUTE_REPARSE_POINT` or an unsupported file type;
3. open each not-yet-held ancestor directory for attributes with share-read
   only, then re-observe its direct, non-reparse identity;
4. open the leaf for read with share-read only and no write/delete sharing;
5. verify the final handle path remains beneath and corresponds to the
   canonical root/path;
6. hash the bytes read from that retained handle and compare the declared
   SHA-256 digest;
7. keep leaf and ancestor handles live through target exit, timeout, owner exit
   or setup-refusal cleanup.

Root-to-leaf retention prevents later rename/delete substitution of admitted
ancestors. Opening and hashing the same leaf handle prevents a path re-open
between authentication and execution. Any malformed manifest, reparse point,
path mismatch, unreadable file, digest mismatch, duplicate, size excess or
native observation failure exits `126` with `WARDEN_SETUP_REFUSED` before
the target receives authority.

The warden build remains source-bound by its existing receipt. Adding `sha2`,
`serde` and `serde_json` updates `Cargo.toml` and `Cargo.lock`; the build
runs offline with `--locked` and the resulting source, manifest, lock and
binary digests must match the regenerated receipt.

## 6. Corpus semantic closure

For each checker child, the protected set is the union of:

- the exact admitted `.fungi` source file;
- root `galerina.mjs`;
- every direct regular `.js` or `.cjs` file recursively below
  `packages-ts/galerina-core-compiler/dist/`.

The existing compiler identity digest is the canonical digest of the latter
compiler set. The executor now retains the ordered file/digest rows used to
derive that digest and supplies those same rows to the warden. The root CLI has
only Node built-in top-level imports; the `check` route loads the compiler
through the protected `dist` closure. A later external semantic dependency
requires an explicit closure design change and new digest identity; it cannot
silently fall outside protection.

The expectation owner is parsed and digest-bound by the controller before child
authority. A sidecar is not a checker-child input, so it is not in the protected
execution set; its identity remains bound by the request and held controller
read.

## 7. Platform routing

Windows x64 with the verified warden is the only Corpus Audit v2 execution
platform admitted by this chapter. Absence, stale receipt, manifest refusal or
protection failure is a non-PASS terminal refusal.

Linux and macOS retain the blocking legacy corpus audit so repository checking
does not disappear. They cannot mint or reuse a Corpus Audit v2 WORKSET or
PROJECT receipt until an equivalent exact-byte protected execution owner is
designed, implemented and reviewed. A v2 request on those platforms returns an
explicit platform refusal before any checker child starts; it never falls back
and relabels legacy evidence as v2.

## 8. Task 3 classification repairs

Abort authority is admitted only for `undefined` or an exact ordinary native
`AbortSignal` instance with the expected own-property shape and built-in
prototype identity. Validation uses safe descriptor/proxy checks before any
prototype operation. After admission the executor snapshots only the native
`aborted` Boolean through the built-in getter; hostile inherited or own
accessors never run.

Process termination classification is:

- warden/controller timeout -> `TIMEOUT`;
- either output ceiling -> `OUTPUT_OVERFLOW`;
- spawn error, OS signal, invalid negative/missing status, or failed tree
  cleanup -> `CRASH`;
- any ordinary numeric exit, including `128`, without a clean marker or exact
  diagnostic -> `MISSING_RESULT`;
- a numeric exit with exact diagnostic codes remains classifiable as a
  finding/expected diagnostic.

The numeric value `128` alone is not proof of an operating-system signal.

## 9. Verification matrix

RED/GREEN controls cover:

- stdout and stderr can each consume their complete independent ceiling;
- one-byte stdout or stderr overflow terminates the tree and reports the raw
  counter;
- malformed, accessor-bearing, unsorted, duplicate and oversized manifests
  refuse before target execution;
- wrong digest, direct symlink, junction/reparse ancestor, rename/write/delete
  substitution and case alias refuse or remain locked;
- the child can read admitted bytes but cannot replace them;
- compiler and source mutation attempts cannot change checked bytes or produce
  PASS;
- hostile AbortSignal Proxy/prototype/own-accessor shapes execute zero traps;
- plain exit `128` without a diagnostic maps to `MISSING_RESULT`;
- ambient Git repository/index/object/config/askpass/SSH redirects cannot
  change repository identity or cause interaction;
- Windows v2 executes under protection, while non-Windows v2 refuses before
  child authority;
- focused process-owner and corpus suites pass with the rebuilt verified
  warden, and all five independent findings are re-reviewed at the exact repair
  commit.

Mutation evidence changes one stream cap, one manifest digest, one protected
path, the exit-128 mapping and one Git scrub name in turn. Each mutation must
turn a permanent focused control red, then be reverted and re-run green.

## 10. Custody and completion

Implementation remains on
`codex/rd-0873-native-fungi-bootstrap-implementation` in its isolated
worktree. Each bounded unit is committed with explicit pathspecs and sent to a
fresh independent reviewer. Generated warden receipt bytes are committed only
if they are declared tracked outputs; transient target-cache binaries are not
added merely because they were rebuilt.

No push, merge, publication, external source disclosure, destructive cleanup,
profile expansion, TypeScript retirement, production authority or Task 7
native-source authorship is granted by this design. Task 3 becomes accepted
only at `Critical 0 / Important 0` with all focused controls green at one
exact clean commit.
