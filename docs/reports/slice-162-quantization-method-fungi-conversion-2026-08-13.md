# Slice 162 QuantizationMethod Fungi conversion adjudication

## Outcome

Slice 162 classifies
`packages-galerina/galerina-inference-bridge-contract/src/precision-types.ts#QuantizationMethod`
as `NO_RUNTIME_BEHAVIOR`. No Fungi asset is created.

The seven-member string union is compile-time vocabulary with no executing
body. Its spellings cross manifests and governance consumers; a Fungi enum
would change the boundary unless a complete string/tag codec proves one-to-one
mapping and surplus refusal.

## Evidence and exit

- Both owning-package typechecks pass.
- Neutral contract **12/12**, focused consumers **37/37**, and complete
  Tower-Citizen **515/515** pass with zero skips.
- Reopen schema authoring only with exact `none/qat/gptq/awq/marlin/nf4/gguf`
  mapping, physical width/range and hostile unknown vectors.

The TypeScript declaration remains until its consuming file can retire.

## Skill review

The updated injective ABI-ledger rule covers this declaration.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: injective string union and surplus refusal rules already cover the declaration
Threadability: PARALLEL_PURE
Source classification: NO_RUNTIME_BEHAVIOR
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
