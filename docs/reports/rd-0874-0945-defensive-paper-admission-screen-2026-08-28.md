# RD-0874–RD-0945 defensive-paper admission screen

**Date:** 2026-08-28

**Scope:** the 72-item transcript R&D corpus, screened under `docs/paper/README.md`.

**Outcome:** `COMPLETE / NO ADMISSION`. No new flagship, workshop, defensive, or measured-negative paper passes both filters.

## Binding publication standard

Galerina does not publish new-cryptography or new-science claims from this batch. A defensive publication must disclose established primitives, add a distinct defender-positive engineering composition, state its actual stage, avoid sensitive or deployment-specific weaknesses, and be supported by primary sources. A measured-negative paper additionally requires a fresh reproducible experiment on a named machine. The batch contains no qualifying experiment.

Transcript labels such as “paper” or “defensive” are research classifications, not publication admission.

## Strict pre-filter

Textbook explanations, general security advice, restatements of established concepts, transcript-only claims, unsupported metrics, and topics already covered by a Galerina disclosure were removed before external review. The 72 rows reduced to three consolidated challenge candidates:

| Candidate | Consolidated construction | Pre-filter | Reason |
|---|---|---|---|
| A | exact-revision evidence envelope for stochastic agent work | `HOLD` | possible composition, but substantial overlap with existing provenance, non-authority, and Unknown-by-construction disclosures |
| B | freshness-bound locator routing with mandatory source reopening and abstention | `HOLD` | possible retrieval composition, but likely restates the existing topology/reach authority boundary |
| C | passive worker-lifecycle observation without control or liveness-from-silence | `HOLD` | design-stage only; no implemented classifier, adapter, hostile-trace suite, or independent exact-revision receipt |

All other corpus entries were rejected before external review as educational summaries, duplicates, unsupported proposals, or topics without a distinct Galerina construction or fresh measurement.

## Grok challenge and advisory result

The source-minimal prompt disclosed no transcript body, repository body, local path, secret, deployment weakness, or unpublished implementation detail.

| Receipt field | Value |
|---|---|
| provider | Grok |
| model | Expert |
| status | `COMPLETE_NON_AUTHORIZING` |
| prompt bytes | `5811` UTF-8 bytes |
| prompt SHA-256 | `81dbad027bfc19302f457288e6838071ad669591936fb3e8b20b7fe6a26c3725` |
| rendered reply bytes | `5982` UTF-8 bytes |
| rendered reply SHA-256 | `6a0d155617ac92f6491e445c3a19a3873a580b04d0d105daae90295632977506` |
| started | `2026-08-28T09:50:20.383Z` |
| completed | `2026-08-28T09:51:33.988Z` |
| conversation | `https://grok.com/c/39a9e9f5-525f-4037-aadc-4f40cdf7856e` |

Grok returned A `HOLD`, B `REJECT`, and C `HOLD`; it admitted no candidate. Its stated limits were material: it had the supplied abstractions and disclosure identifiers, not the full disclosure texts. The answer is advisory evidence, not publication authority.

## Strict post-filter and local adjudication

| Candidate | Grok | Local post-filter | Controlling evidence | Publication action |
|---|---|---|---|---|
| A | `HOLD` | `HOLD` | the actual disclosures cover unverified model output, tool results as non-authorizing data, and bounded manifests/provenance, but the remaining combination of frozen exact-revision identity, separate reviewer custody, and a non-authorizing verdict is not shown to be fully disclosed | none pending a fresh overlap review and complete evidence package |
| B | `REJECT` | `REJECT` | `dp-rd-0417-topology-is-not-authority-reach-is-not-reasoning.md` already controls the retrieval/authority boundary; freshness binding and source reopening are implementation hygiene, not a separate publishable composition here | none |
| C | `HOLD` | `HOLD` | the worker-lifecycle classifier and provider adapter remain deferred; an effectful manager is rejected; no executable hostile lifecycle KAT or immutable implementation review exists | none |

For A, the overlapping disclosures include:

- `docs/paper/defensive-papers/dp-rd-0285b-signed-capability-bounded-mcp-tool-manifests.md`;
- `docs/paper/defensive-papers/dp-rd-0364-governed-ai-inference-output-unverified-by-construction.md`; and
- `docs/paper/defensive-papers/dp-rd-0524-governing-the-ai-control-plane-tool-results-are-data-value-state-not-wrappers.md`.

For B, the controlling overlap is:

- `docs/paper/defensive-papers/dp-rd-0417-topology-is-not-authority-reach-is-not-reasoning.md`.

A may be reopened only after a fresh side-by-side overlap review establishes whether its exact-revision and custody split is a distinct defender-positive composition, with an honest stage label and complete reproducible evidence. C may be reopened only if a future, separately authorized implementation provides exact hostile lifecycle traces, a closed provider contract, paired controls, independent review, an honest stage label, and a fresh overlap check. A timer, thread identifier, source-kind token, or silence cannot prove worker health or task success.

## Final decision

No candidate passes both the pre-filter and post-filter. No file is added to or changed under `docs/paper/`. This is the intended success condition of a strict admission screen: weak or duplicative material is rejected rather than converted into publication volume.

## Exact submitted prompt

SHA-256: `81dbad027bfc19302f457288e6838071ad669591936fb3e8b20b7fe6a26c3725`

~~~~~text
## 1. Role

You are an external, non-authorizing defensive-publication admission reviewer.

## 2. Intended use

Your answer will be independently adjudicated under Galerina's no-new-science paper standard before any public document is drafted.

## 3. Scope and access mode

Read-only source-minimal review of three consolidated candidate constructions derived from a 72-item transcript research batch. Use only this packet.

## 4. Binding constraints

- Galerina admits no flagship or workshop novelty papers. A candidate may pass only as a novelty-disclaimed defensive publication, or as a measured-negative backed by a fresh reproducible benchmark on a named machine.
- No new cryptography or science may be claimed. Established primitives must be acknowledged and unsupported quantitative claims removed.
- A passing defensive publication needs a distinct engineering composition, an honest implemented or design-stage label, a defender-positive harm filter, primary-source support, and no private or deployment-specific weakness.
- Treat the transcript batch and prior Grok reviews as research leads, not publication authority.

## 5. Facts already established

- Candidate A is an exact-revision evidence envelope for stochastic agent work: deterministic validators, prompt and tool provenance, frozen target identity, separate reviewer custody, and a non-authorizing verdict. Existing disclosures already cover integrity not implying fidelity, model output being Unknown by construction, and tool results being data rather than instructions.
- Candidate B is locator-only adaptive retrieval: route retrieval depth by question complexity, bind every locator to corpus and build identity, reopen authoritative source, preserve abstention, and forbid retrieved text from authorizing effects. An existing disclosure already states topology is not authority and reach is not reasoning.
- Candidate C is passive worker-lifecycle observation: bounded observation of running, idle, timed-out, exited, and unknown workers; no inference of liveness from silence; timeout and cancellation are explicit; observation cannot kill, restart, or mint authority. It is not yet implemented and would have to remain design-stage until exact tests and review exist.
- The corpus contains no fresh named-machine performance experiment that qualifies as a measured-negative paper.
- Existing public disclosures include DP-RD-0129, DP-RD-0364, DP-RD-0417, DP-RD-0524, and DP-RD-0285b; duplication with these is a rejection reason.

## 6. Questions

**Q1.** Vector A, novelty and overlap: for Candidate A, identify the smallest construction not already covered by the named disclosures, or mark it REJECT as duplicate; give the strongest prior-art or internal-overlap counterexample.

**Q2.** Vector B, authority and retrieval: for Candidate B, determine whether freshness-bound locator routing plus mandatory source reopening and abstention is a distinct defensive composition or only a restatement of DP-RD-0417; give one discriminating test.

**Q3.** Vector C, lifecycle safety: for Candidate C, determine whether passive observation without liveness authority is a distinct design-stage disclosure; identify the smallest hostile lifecycle trace that the design must handle before admission.

**Q4.** Vector D, harm and honesty: for each candidate, identify any sensitive weakness, attack recipe, private detail, misleading implementation claim, or unsupported metric that must be removed or causes rejection.

**Q5.** Vector E, evidence: list the minimum exact artifact, test, independent-review, citation, and stage-label evidence required before each candidate could be published.

**Q6.** Return a forced ranking for all three candidates as ADMIT, HOLD, or REJECT under the supplied standard; do not use a softer label.

## 7. Required inspection

- Inspect every candidate against every named existing disclosure and the supplied paper standard.
- Separate confirmed overlap from plausible distinct composition and say NOT VERIFIABLE when this packet cannot settle a fact.
- Prefer rejection or hold over inventing novelty, measurements, implementation status, citations, or legal conclusions.

## 8. Output contract

- Start with a three-row matrix: candidate, verdict, distinct contribution if any, strongest overlap, minimum missing evidence.
- Then provide one bounded paragraph per challenge vector and a final ranked recommendation.
- Label material claims CONFIRMED, PLAUSIBLE, or NOT VERIFIABLE.
- Deliverable budget: at most 1400 words.

## 9. Exclusions

- Do not claim a legal prior-art search, patent clearance, novelty, production safety, performance improvement, or token savings.
- Do not request or reconstruct private transcript bodies, local paths, repository contents, secrets, deployment details, or unpublished weaknesses.
- Do not propose autonomous publication, commits, pushes, policy changes, or implementation authority.

## 10. Self-rejection gate

- Mark the reply SELF-REJECTED if any candidate lacks a forced verdict, any challenge vector is omitted, overlap with the named disclosures is ignored, or a material claim is not labelled.

## Review posture

Try to falsify the supplied claims before recommending changes. Name the weakest claim, one control that cannot fail, and any evidence that would reverse the conclusion.

## Research verification

Separate primary evidence, secondary interpretation and supplied claims. State what was directly checked, what remains unresolved, and which exact source or experiment would settle each unresolved point.

## Grok continuation protocol

Do not treat the first answer as closure. On follow-up, identify the prior claim being challenged, answer only the unresolved delta, preserve claim labels, and state what evidence would change the answer.
~~~~~

## Completed Grok reply — exact rendered text

The browser DOM exposes rendered text rather than the provider's Markdown source. Table cells are therefore concatenated in this exact capture. SHA-256: `6a0d155617ac92f6491e445c3a19a3873a580b04d0d105daae90295632977506`.

~~~~~text
Admission matrix

CandidateVerdictDistinct contribution if anyStrongest overlapMinimum missing evidenceAHOLDExact-revision evidence envelope: deterministic validators + prompt/tool provenance + frozen target identity + separate reviewer custody + non-authorizing verdictIntegrity ≠ fidelity; model output Unknown by construction; tool results are data not instructions (named DPs)Full texts of DP-RD-0129/0364/0417/0524/0285b; implementation-or-design-stage label; independent non-author custody review; exact validator testsBREJECTNone admittedTopology ≠ authority and reach ≠ reasoning (explicitly tied to DP-RD-0417); locator binding and non-authorization of retrieved textDiscriminating comparison to full DP-RD-0417; any claim of distinctness is unsupported in this packetCHOLDDesign-stage passive bounded observation of running/idle/timed-out/exited/unknown with no liveness-from-silence and no kill/restart/authority mintPossible worker-state or timeout language in DP-RD-0364/0524/0285b (NOT VERIFIABLE)Exact hostile-trace tests; independent review; remain design-stage until tests exist; no performance numbers

Q1 (Vector A, novelty and overlap).
The packet CONFIRMS existing coverage of integrity-not-fidelity, Unknown-by-construction outputs, and tools-as-data. The smallest remainder that could be a composition rather than a restatement is the custody split: frozen target identity plus separate reviewer who cannot authorize, wrapped as an exact-revision evidence envelope for stochastic agent work. That remainder is only PLAUSIBLE, not CONFIRMED. Strongest internal-overlap counterexample available in-packet: any named disclosure that already pairs provenance with a non-authorizing verdict already swallows the envelope. Because the five DP-RD texts are absent, full-duplication vs. remainder is NOT VERIFIABLE; HOLD is required. Weakest claim in the packet is that the envelope is “exact-revision” and therefore new.

Q2 (Vector B, authority and retrieval).
Freshness-bound locator routing + mandatory authoritative-source reopen + preserved abstention + “retrieved text cannot authorize” is, on the supplied facts, a restatement of the already-disclosed pair “topology is not authority / reach is not reasoning” attributed to DP-RD-0417, plus ordinary locator hygiene. One discriminating test that would separate them: a complexity-routed query whose locator matches a prior build identity yet the system must still reopen the named authoritative source and may still abstain; if DP-RD-0417 already requires reopen-or-abstain independent of locator hit, the candidate collapses. That test is not in the packet, so distinctness is NOT VERIFIABLE and the conservative ruling under the no-duplication rule is REJECT. No new primitive is claimed; none is admitted.

Q3 (Vector C, lifecycle safety).
Passive observation that cannot infer liveness from silence and cannot kill, restart, or mint authority is a PLAUSIBLE distinct design-stage composition. It is CONFIRMED unimplemented. Smallest hostile lifecycle trace the design must handle before any admission: worker W reports “running,” then emits no event across the explicit timeout bound, then a later observation window reports “running” again with no intervening exit, cancel, or restart event (silence-replay / phantom-liveness). The observer must remain unable to change W’s state and must surface “unknown” rather than infer liveness. Until that trace (and the four other named states) has exact tests and independent review, the candidate stays HOLD at design-stage. Overlap with named DPs is NOT VERIFIABLE.

Q4 (Vector D, harm and honesty).
No private paths, deployment knobs, or unpublished weaknesses appear in the packet (CONFIRMED absent). No quantitative metrics or token/performance claims appear (CONFIRMED absent). Risk that must be stripped or that forces rejection: any sentence that could be read as “this envelope/locator/observer is implemented and safe” for A or B (status NOT VERIFIABLE) or for C (status CONFIRMED design-stage only). Any recipe that would let an observer’s “unknown” output be treated as a liveness or authority signal is a sensitive weakness and must be removed. Defender-positive filter is PLAUSIBLE if the non-authorization and non-inference rules are kept verbatim and unweakened.

Q5 (Vector E, evidence).
Before any candidate could be published as a novelty-disclaimed defensive publication: (1) the five named DP-RD texts cited side-by-side with the candidate so overlap can be checked, not assumed; (2) an honest implemented vs. design-stage label (C already has the latter); (3) at least one exact, reproducible artifact—validator suite for A, reopen-and-abstain cases for B, hostile lifecycle traces for C; (4) independent reviewer custody that cannot authorize the work under review; (5) no measured-negative path exists in this corpus because no fresh named-machine experiment is present. Primary-source support beyond the transcript-batch leads is NOT VERIFIABLE here.

Ranked recommendation.
B REJECT (duplication risk with DP-RD-0417 not dispelled). A HOLD (remainder custody envelope only PLAUSIBLE). C HOLD (design-stage composition PLAUSIBLE; tests and review missing). No candidate meets ADMIT. Directly checked: only the supplied packet and the five named disclosure identifiers. Unresolved: actual text of every DP-RD and implementation status of A/B. Those texts plus the hostile-trace tests for C would reverse any HOLD; a demonstration that DP-RD-0417 already contains complexity routing + mandatory reopen + abstention would confirm B’s REJECT. Weakest packet claim: that A’s envelope is not already covered. Control that cannot fail: observation (C) or retrieved text (B) or reviewer (A) must never mint authority.

SELF-REJECT gate: not triggered; every candidate has a forced verdict, every vector is answered, named disclosures are treated as overlap risks, and material claims are labelled.
~~~~~
