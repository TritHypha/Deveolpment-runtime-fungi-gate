# WAT 64-bit type TypeScript-to-Fungi conversion proof

## Outcome

The compiler's private `is64BitWatType` decision has an exact package-owned
`.fungi` counterpart and a physical SLIDE/VOK execution proof. The TypeScript
WAT emitter and all consumers remain active. This is a bounded reference-only
conversion slice, not TypeScript retirement or production authority.

## Closed decision

The flow returns true only for exact `Int64` or `UInt64`. Empty, unknown,
case-changed, space-prefixed/suffixed and embedded-NUL Strings return false.
The `.fungi` source is pure and uses no effect, capability, contract
permission, Hallmark, border grant or host API. It contains none of null, NaN,
`else if`, exception syntax, `for` or `loop`.

## Exact custody

| Item | Evidence |
|---|---|
| TypeScript reference | SHA-256 `8938297D073CB4E7E7EE39D01F90E5DBDAB42137A878FA458CCC7636021551B0` |
| Fungi candidate | SHA-256 `85DF0D1188168D2CC6BF80BECE042D7EEC2C11A2C12374353F9E6072B2681791` |
| Package differential test | SHA-256 `76AD9569A75E8C94FDA2064CB3910C9BFFCD1D02BC9CBA6C16D1435DFBAE080E` |
| Physical SLIDE/VOK test | SHA-256 `1A299262A046838157308EBD4598CBFA48F7C9958867BA11906C626893D6A049` |
| Fungi implementation commit | `b29baed03022786135782dd37d0b0fb3bea73434` |
| Physical proof commit | `3544af9b310a025b43745b159360af0471b6b410` |
| Independent SLIDE build point | `ac8a0418ec0bfe6443807db1b100b0a02d5b1ea8` |

## Verification evidence

- Isolated strict Fungi check: 1 file passed with no errors or warnings.
- Focused compiler/interpreter/signed-Wasm/public-WAT proof: 3/3 pass.
- Owning compiler package: 6,351/6,351 pass, zero failures and zero skips.
- Physical SLIDE/VOK path: 1/1 pass with zero skips.
- Tooling-contract audit: 100 packages, 188 tools and zero violations;
  focused tooling-contract tests pass 13/13.
- Complete package owner: 100/100 packages and 9,563 tests in 286.1 seconds.
- Graph umbrella: 7/7; semantic outputs: 3/3; roadmap outputs: 5/5;
  canonical count consumers: 7/7; Golden Pack: 11/11 checked and 11/11
  execution vectors.
- Codebase-memory committed 49,867 nodes and 132,886 edges at the exact indexed
  head; Myco indexes 4,970 files and 77,466 terms.

The physical proof compiles the exact Fungi bytes into a checked package,
publishes one `.slide`, and independently re-admits it through VOK before
typed execution. It refuses missing, wrong and surplus arguments, an unpaired
surrogate, mutated source bytes and a one-byte physical artifact mutation.

## Authority boundary

`wat-emitter.ts`, its private `is64BitWatType` helper and all WAT-emission
callers remain active. The proof grants no consumer switch, bootstrap fixpoint,
production, signing, durability, release or retirement authority. Full tooling
and normal phase-close remain excluded because their prior isolated execution
coincided with the host crash; repository-wide closure is UNKNOWN.
