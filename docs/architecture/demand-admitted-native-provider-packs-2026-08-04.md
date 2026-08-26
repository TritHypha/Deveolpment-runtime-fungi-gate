# Demand-Admitted Native Provider and Target Packs

Date: 2026-08-04

Status: approved future architecture; implementation deferred

## Decision

Galerina will keep stable language semantics, type/effect checking, contracts
and the provider ABI in a small core. Optional implementations may be supplied
as **Demand-Admitted Native Providers**. The compiler selects providers only
from canonical checked GIR, and production builds resolve, verify and AOT-link
the complete provider set before emitting the final `.slide` application
object.

All optional source packages may remain as flat top-level peers under
`packages-ts` without being installed. After canonical GIR first proves
that one is required, an interactive build asks whether to install the exact
local package for that build, permit that exact identity for the project, or
refuse. Installation does not activate code, grant a capability or change an
existing application.

This decision is recorded in R&D as RD-0695.

## Why this is not ordinary deferred loading

"Deferred" means deferred until a checked build proves that the operation is
required. It does not mean waiting until the first production call.

```text
required by canonical GIR
  -> exact provider selected
  -> verified and AOT-linked
  -> final .slide identity re-admitted
  -> VOK may open one execution lease
```

Production forbids request-time provider discovery, download, compilation and
fallback. Development may retain clearly non-authorising interpreter/reference
paths.

## Definitions

| state | meaning | authority |
|---|---|---:|
| source-present | exact source exists once under `packages-ts` with the canonical name | none; not installed |
| installed/registered | exact identity/version/digest was accepted and locally verified | none |
| selected | checked GIR and target profile require the provider | none |
| verified | exact identity, provenance, ABI and semantics pass | none |
| linked | bound into one `.slide` build | none by itself |
| admitted | all current K3/VOK gates allow | one bounded affine lease |

An application plugin remains an explicitly imported extension. A native
provider is a compiler-selected implementation of an already typed semantic
requirement.

The state order is strict:

```text
source-present -> installed -> selected -> verified -> linked -> admitted
```

No later state may be inferred from an earlier one.

## Two independent pack axes

### Capability packs

Capability packs answer **what the program needs**:

```text
core
web
database
algebra
scientific
data-mining
quantum-simulation
quantum-hardware
calendar
timezone
locale
ai
```

### Target and platform packs

Target packs answer **where the program may run**:

```text
architecture -> OS/ABI -> CPU features -> optional platform/board profile
```

Examples include `arm64-linux`, `armv7-linux`, `x86_64-windows`, an exact
Raspberry Pi model, or a future photonic target profile. Raspberry Pi is not a
single architecture: models use different SoCs, CPU cores, peripherals,
memory/power limits and thermal behaviour. Pico-class devices are also a
different bare-metal/microcontroller target from Linux SBCs.

Capability, target and effect authority remain independent. Selecting ARM64
does not grant GPIO. Installing a Raspberry Pi profile does not grant camera,
GPU, storage or network access. Those operations still require their own typed
effect provider and broker admission.

## Proposed CLI experience

The following commands describe intended behaviour and are not implemented:

```text
galerina pack search algebra
galerina pack inspect galerina-pack-algebra
galerina pack install galerina-pack-algebra --version <exact>
galerina pack install galerina-pack-scientific --version <exact>
galerina pack install galerina-pack-quantum-simulation --version <exact>
galerina pack install galerina-target-arm64-linux --version <exact>
galerina pack install galerina-platform-raspberry-pi-5 --version <exact>
galerina pack verify galerina-pack-algebra
galerina pack remove galerina-pack-algebra

galerina build app.fungi \
  --target arm64-linux \
  --platform raspberry-pi-5
```

Short setup profiles may later wrap these commands, but the canonical command
must expose the exact selected manifest. `--quantum` alone is too ambiguous:
quantum simulation and access to quantum hardware are different packs and
different authority surfaces.

An absent local requirement must produce an actionable refusal:

```text
BigFloat<256> requires numeric.bigfloat with the exact requested semantic
profile. No exact local provider is installed.

Suggested explicit action:
  galerina pack install galerina-pack-scientific --version <exact>

No lower-precision fallback was selected.
```

When exactly one matching source-present local package exists, the first
interactive build asks:

```text
This build requires:
  galerina-numeric-bigfloat
  Version: <exact>
  Digest: <exact>
  Source: local packages-ts peer
  Effects: <exact set or none>
  Reason: BigFloat<256> is required by canonical GIR

[1] Install for this build
[2] Automatically install this exact identity/version/digest for this project
[3] Refuse (default)
```

Choice 1 emits a build-scoped installation receipt. Choice 2 enables automatic
local installation only for the displayed exact identity/version/digest and
writes an exact project-policy/lock entry. It does not permit a different
package, version or digest. Choice 3 creates no installation and no `.slide`
object.

Non-interactive/CI builds never prompt. They may install a source-present local
candidate only when exact checked-in project policy permits it; otherwise they
fail closed with a copyable explicit command. A global `--yes` cannot approve
unknown packages. The first release never performs an automatic network fetch.
Offline/closed-network installation accepts separately transferred, signed and
reverified pack bundles.

### Consent and refusal matrix

| condition | result |
|---|---|
| no matching local source | refuse with exact requirement and explicit install guidance |
| more than one candidate | ambiguity refusal; no prompt |
| one candidate, interactive, no policy | display bounded prompt; refusal is the default |
| developer chooses build-only | verify, install for this build and emit a scoped receipt |
| developer chooses automatic project install | write exact identity/version/digest policy, then verify and install |
| exact project policy already exists | verify current bytes and install without prompting |
| package/version/digest differs from policy | refuse or prompt for fresh interactive consent |
| non-interactive build without exact policy | refuse; never prompt |
| network would be required | refuse in the first release |
| installation succeeds but effect/admission fails | no `.slide` authority and no VOK lease |

## Flat package rule

A pack is a signed convenience manifest, not a nested dependency directory.
Every pack/provider source follows the binding folder and identity form:

```text
packages-ts/galerina-[category]-[name]
```

`[category]` and `[name]` are registered lowercase kebab-case identifiers.
Examples of exact top-level peers are:

```text
packages-ts/
  galerina-pack-scientific
  galerina-numeric-binary128
  galerina-numeric-bigfloat
  galerina-math-linear-algebra
  galerina-math-symbolic
  galerina-compute-data-mining
  galerina-compute-quantum-simulation
  galerina-target-arm64-linux
  galerina-platform-raspberry-pi-5
  galerina-device-raspberry-pi-gpio
  galerina-time-calendar
  galerina-time-timezone
```

Each identity occurs once. Folder identity, manifest identity and registry
identity must agree exactly. Dependencies are exact direct peers. Aliases,
unprefixed folders, version ranges, ambient search paths, copied nested
packages, cycles, install scripts and transitive-only imports refuse.

## Compiler contract

The compiler remains responsible for:

1. parsing and type checking all source before provider selection;
2. deriving a closed semantic requirement set from canonical GIR;
3. deriving an explicit target requirement set;
4. checking that every provider signature exactly satisfies its requirement;
5. rejecting missing, duplicate, surplus or ambiguous implementations;
6. emitting provider and target identities into build provenance;
7. handing a closed link set to SLIDE;
8. distinguishing source-present, installed, selected, linked and admitted;
9. never treating source presence, installed bytes, prompt choice or a caller
   Boolean as execution authority.

Raw token spelling cannot trigger a native load. A malformed source file emits
no provider request and no `.slide` object.

## Numeric providers

Fixed common representations remain stable language names:

```fungi
Float32
Float64
Float128
```

Wider or unusual precision uses one bounded generic family:

```fungi
BigFloat<256>
BigFloat<512>
BigFloat<568>
```

The final spelling remains gated on the language-design process; these forms
state the intended type distinction, not newly implemented grammar.

Every numeric requirement includes representation, precision, exponent range,
rounding, NaN/infinity/subnormal behaviour, overflow/underflow, conversion,
endianness, determinism and timing obligations. Missing support refuses rather
than degrading to `Float64`.

LLVM's native IR includes binary32, binary64 and binary128 but target support
and floating-environment behaviour vary. Wider arithmetic is commonly supplied
by a library such as MPFR. Providers must therefore state semantics instead of
claiming that every width is a native hardware instruction.

Primary references:

- [LLVM Language Reference](https://llvm.org/docs/LangRef.html)
- [GCC libquadmath](https://gcc.gnu.org/onlinedocs/libquadmath/)
- [GNU MPFR](https://www.mpfr.org/)

## Date and time providers

Date/time is split so pure arithmetic cannot inherit clock authority:

| operation | provider/authority |
|---|---|
| calendar and duration arithmetic | pure deterministic provider |
| time-zone conversion | pure provider over a pinned dataset |
| locale formatting | pure provider over a pinned dataset |
| current wall/monotonic time | effectful provider requiring `time.read` |

IANA time-zone data changes as governments change offsets and daylight-saving
rules. A `.slide` build therefore binds an exact time-zone dataset version and
digest. An operating-system update cannot silently change the result of an
existing admitted build.

Primary reference: [IANA Time Zones](https://www.iana.org/time-zones).

## ARM and Raspberry Pi providers

An ARM target pack binds an exact target triple/ABI, CPU compatibility floor,
feature ceiling and calling/memory conventions. A Raspberry Pi platform pack
adds exact model/SoC, memory, thermal and peripheral-compatibility facts.

Hardware auto-detection is untrusted evidence. Build/install must canonicalise
and re-derive it. Unknown or contradictory architecture/model/features produce
K3 indeterminate and no admitted object. Cross-compilation supplies an explicit
target manifest. Optional multi-variant objects may be designed later only if
every variant and the boot selector are pre-admitted.

Primary references:

- [Raspberry Pi hardware documentation](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html)
- [LLVM static compiler target options](https://llvm.org/docs/CommandGuide/llc.html)

## Installation and lifecycle

### Install

1. Begin only from a canonical-GIR requirement or an explicit CLI command.
2. Resolve zero or one canonical local source package named
   `galerina-[category]-[name]`; ambiguity refuses.
3. Obtain explicit interactive consent or an exact checked-in project-policy
   record binding identity, version and digest.
4. Verify closed schema, identity, signatures, provenance, license/SBOM policy,
   revocation state, byte digests and flat direct peers.
5. Register the exact content-addressed artifact as installed, not authorised.
6. Emit an installation receipt containing no private material.

### Build

1. Derive canonical GIR requirements.
2. Resolve exact installed candidates; an interactive local source-present
   candidate may enter the consent/install sequence above.
3. Select an explicit target/platform profile.
4. Hand the closed set to SLIDE for deterministic AOT preparation.
5. Bind the complete provider-set digest into `.slide` identity.

### Update

Updating a pack does not alter an existing application. Rebuild, independent
reverification and a new receipt are mandatory. Old provider identities remain
verifiable while policy permits them; revocation prevents new admission.

### Remove

Removal refuses while retained builds or provenance policy require the exact
artifact, unless a separately governed archival policy preserves required
verification evidence.

## Security rules

- default deny and exact closed schemas;
- source-present never means installed; installed never means admitted;
- installed/native/local never means trusted;
- first-release automatic installation is local-only and consent/policy bound;
- CI never prompts and no broad `--yes` approves unknown packages;
- changed identity/version/digest requires fresh consent;
- no runtime ambient resolver or first-call loader;
- no hidden initialisation effects;
- no raw developer-managed pointers;
- typed bounded ownership at native boundaries;
- exact effect declarations and broker mediation;
- no precision, target or provider fallback without an explicitly compiled
  semantically equivalent alternative;
- provider, target, policy, compiler and dataset identities in provenance;
- VOK remains the only execution-lease authority;
- learned/proposal engines cannot mint admission;
- terminal cleanup and typed receipt on every outcome.

## Responsibility map

| component | responsibility |
|---|---|
| Galerina parser/type/effect checker | validate source and derive semantic requirements |
| Galerina CLI | show bounded consent, install, inspect, verify and remove exact local packs |
| package resolver/Tower Citizen | registry, policy, signature, revocation and flat-set decisions |
| SLIDE compiler/linker | deterministic target selection, AOT lowering and direct linking |
| Shape Fabric/VPEG/NSE | optional proposals/reuse only; no provider authority |
| VOK | exact object re-admission and affine execution lease |
| Tri-Pipe/effect brokers | typed bounded data movement and external operations |
| receipts/audit tools | bind source, provider set, target, datasets and terminal result |

## Performance claim discipline

The architecture is expected to reduce application bytes, admitted objects and
active implementation surface. It may improve startup, memory and instruction
cache behaviour. Hot execution improves only when AOT linking removes provider
lookup and enables direct calls/inlining.

No speed claim is currently admitted. The future benchmark must compare a
monolithic baseline, demand-selected AOT build and research-only first-use
loader across binary size, preparation, startup, RSS, first/steady latency,
throughput, instruction-cache, energy/thermal and update cost. ARM and
Raspberry Pi results must identify the exact board, OS, firmware, cooling,
power and throttling state.

## Implementation gates

This work begins only after the independent general SLIDE backend and current
package conversion/retirement dependencies are complete enough to prevent
rework. The ordered gates are:

1. freeze semantic-requirement and target-profile schemas;
2. append a provider descriptor to the flat ABI without reinterpreting frozen
   contracts;
3. implement one pure numeric provider and one target provider reference;
4. carry provider-set identity through `.slide`, VOK and typed receipts;
5. implement canonical naming, source-present discovery and consent-based local
   installation without automatic activation;
6. add hostile/mutation/cross-target matrices;
7. benchmark before production adoption;
8. publish only after production signing, durability and platform evidence.

## Non-claims

No CLI pack command, provider ABI, numeric provider, ARM/Raspberry Pi backend,
runtime loader or production authority is implemented by this document. It is
the approved deferred architecture and acceptance boundary.
