# Galerina Neuromorphic

`galerina-ai-neuromorphic` is the package for neuromorphic and spiking event model
contracts.

## Release status

This is a **private, post-v1, non-executable research package**. It is excluded
from the beta-v1 public package cut. Its current runtime surface validates
bounded records and produces reports; it does not execute spikes, configure
hardware, mutate neural topology, or control an external process.

`PAT-NEU-01` is a mandatory stop-and-review boundary. Before this package gains
an executor or any delay/refractory state, addressable neuron/synapse circuit
array, dynamic or evolutionary topology, neural-subgraph implantation,
failure-prediction loop, or actuator/control API, the change requires an
updated element map, architecture-test update, provenance review, and qualified
counsel decision. A passing architecture test is not patent clearance.

It belongs in:

```text
/packages-galerina/galerina-ai-neuromorphic
```

Use this package for:

```text
Spike
SpikeTrain
EventSignal<T>
SpikingModel
NeuromorphicPlan
neuromorphic reports
event-driven inference plans
```

## Boundary

Neuromorphic support is related to neural computing, but it is not the same as
normal tensor neural networks.

```text
galerina-ai-neural
  tensors, weights, layers, inference, training

galerina-ai-neuromorphic
  spikes, events, event-driven spiking models
```

`galerina-ai-neuromorphic` should consume compute target planning from `galerina-core-compute` and
target output planning from future accelerator packages. It must not own normal
neural-network layer definitions or Galerina core syntax.

Final rule:

```text
galerina-ai-neuromorphic owns spiking/event concepts.
galerina-ai-neural owns tensor neural network concepts.
target packages own hardware-specific plans.
```

The package-level `pat-neu-01-boundary.test.mjs` mechanically preserves this
non-execution boundary. Documentation alone is not treated as enforcement.
