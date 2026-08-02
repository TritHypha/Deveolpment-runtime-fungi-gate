# Galerina patent and provenance register

Status: technical change-control register; no entry is legal clearance

This register records technical separation evidence needed for the approved
UK, United States and EPO/UPC Europe counsel review. `PASS`, an absent search
hit, an Apache-2.0 header or a passing architecture test is never an FTO
opinion. Unknown or unverified legal facts remain `INDETERMINATE` and block any
feature whose release gate depends on them.

## Entry `PAT-NEU-01`

| Required field | Current record |
|---|---|
| Patent/application and family | `US10019470B2`, `US10095718B2`; complete family/continuation identity is `INDETERMINATE` pending primary-record and counsel verification |
| Jurisdictions and legal status | Approved review scope: UK, US and EPO/UPC Europe. Current status in every jurisdiction is `INDETERMINATE`; no repository document grants a legal conclusion |
| Assignee/owner and licence | RD-0661 associates the family with the University of Tennessee Research Foundation. Official ownership, assignments and licence availability remain `INDETERMINATE` pending counsel evidence |
| Claims retained for review | Addressable reconfigurable neuron/synapse circuit arrays; firing events; delay/refractory state; evolutionary reconfiguration; neural-subgraph extraction/storage/implantation; component-failure prediction; actuator/external-process control. This is a technical issue list, not a substitute for complete claims |
| Galerina feature and source | private post-v1 `packages-galerina/galerina-ai-neuromorphic/src/index.ts`; validators for spike/event records, scalar model counts and bounded non-executing plans |
| Present/absent/uncertain map | Spike/event records and scalar `neurons`/`synapses` counts are present. Circuit arrays, programmable delay/refractory state, dynamic/evolutionary topology, implantation, failure-control loops, actuator control and an executor are absent in the current source. Equivalents analysis is `INDETERMINATE` |
| Intentional omissions and tests | `tests/pat-neu-01-boundary.test.mjs` pins the scalar record shape, absence of the named APIs, no execute/run entrypoint, private metadata and post-v1 non-executable classification |
| Equivalents/indirect questions | Whether event records, target planning, downstream hardware adapters or future composition could satisfy an element directly or equivalently; whether distribution, hosted use, examples or contributor guidance creates inducement/contributory risk. Counsel decision required |
| Clean-room/third-party provenance | No external TENNLab code, HDL, weights or model artefact is identified in the package. A signed contribution and third-party provenance manifest is still required before a public cut |
| Review owner, decision and expiry | Owner: project owner plus qualified counsel. Decision: `RESEARCH-ONLY`; public execution and production release refused. Re-review on every material source/deployment change and before the first public cut |
| Evidence hashes/authenticated copies | Not yet admitted. Current local source/test results are development evidence only. Counsel bundle must bind tagged source, test receipts, primary patent records and provenance artefacts cryptographically |

### Mandatory change triggers

Any addition of an executor, delay/refractory state, addressable circuit-array
topology, dynamic/evolutionary mutation, neural-subgraph reuse/implantation,
failure-prediction control, actuator/external-process control, or public
shipping classification stops the change pending a refreshed element map,
provenance review, architecture tests and counsel decision.

## Register backlog

RD-0661 identifies additional families for authenticated partial-field query
proofs, regex vulnerability analysis, quantum backend brokerage, container
registry services, learned graph compilation, ahead-of-demand scaling,
fine-grained neural quantization and graphical hardware deployment. Those
entries must be completed before their relevant feature reaches a public
release boundary. Their absence from this first entry is visible debt, not an
implicit PASS.
