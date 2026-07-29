# Independent-review prompt — SLIDE name, prefix, low-level-language identity, and cryptography

## Why this review is requested

The former working name CTLL was abandoned after an official Companies House
record showed an existing `CTLL LTD` (company 11508100). The replacement
working name is:

> **SLIDE — Substrate Layout Interconnect Deterministic Engine**

SLIDE is intended to be an independent, Apache-2.0, zero-trust low-level
execution substrate usable by projects other than Galerina. Galerina is its
first planned frontend and integration case, not part of the SLIDE name.

Preliminary research is not a clearance:

- “SLIDE” is a common English word and is used by many products and research
  acronyms.
- `.slide` is reported in the wild for presentation software, although there
  is no universal file-extension authority.
- IANA registers media types, not globally exclusive filename extensions; its
  media-type registry already contains several presentation “slide” subtype
  names.
- Company-name, package-name, domain, file-extension, and trademark searches
  answer different questions.
- An AI/web search is not legal advice or a trademark clearance.

## Prompt to give another AI

```text
You are an independent naming, ecosystem-compatibility, low-level-language,
and cryptographic-design reviewer. Work from current evidence as of the date
you run this review. Browse the web. Prefer primary sources and direct registry
records. Cite every material claim with a direct link and access date. Clearly
separate facts, inferences, risks, recommendations, and items that need a
qualified trademark solicitor or cryptographer.

PROJECT FACTS

Working name:
  SLIDE

Expansion:
  Substrate Layout Interconnect Deterministic Engine

Intended identity:
  An independent low-level execution substrate/language and deterministic AOT
  system. It is not a Galerina-only component. Galerina is the first frontend.
  The implementation is planned under Apache-2.0.

Security posture:
  zero trust; verify, never assume; fail closed; explicit terminal outcomes;
  K3 tri-logic on conventional silicon; deterministic canonical artifacts;
  memory-safety admission; capability/effect control; provenance; revocation;
  no silent fallback; compatibility horizon of 20+ years.

Current tentative public identifiers:
  project/display name: SLIDE
  expansion: Substrate Layout Interconnect Deterministic Engine
  command candidate: slide
  repository candidate: SLIDE
  package prefix candidates: slide-, @slide/, org.slide.*
  container/compiled-artifact extension candidate: .slide
  internal schemas currently use slide-* and galerina.slide.* identifiers

Important distinction:
  .fungi is the Galerina source language. SLIDE needs its own independent
  identity. Determine whether .slide should denote source, a compiled
  container, neither, or whether a different extension is required.

Known collision that caused the rename:
  CTLL LTD, UK Companies House company 11508100:
  https://find-and-update.company-information.service.gov.uk/company/11508100/more

CURRENT CRYPTOGRAPHIC DIRECTION

New Galerina registry indexes use a domain-separated application
dual-signature envelope:
  schema: galerina-registry-index/v2
  algorithms: Ed25519 AND ML-DSA-65
  canonicalization: JCS / RFC 8785
  domain/context: galerina.registry.index.sig.v2
  preimage: domain || NUL || suite || NUL || authority key id || NUL ||
            canon tag || NUL || canonical unsigned artifact
  verifier rule: both components must return literal true
  v1 Ed25519: verify-only historical compatibility
  downgrade, missing half, revocation, or unknown authority: terminal refusal

This is deliberately described as an application dual-signature envelope, not
as the still-draft IETF Composite ML-DSA encoding.

PRIORITY 1 — NAME AND LOW-LEVEL-LANGUAGE IDENTITY

1. Investigate “SLIDE” and the full expansion in:
   - UK Companies House;
   - UKIPO, EUIPO/TMview, WIPO Global Brand Database, and USPTO trademark
     records, especially software/compiler/developer-tool classes;
   - programming-language and compiler projects;
   - GitHub/GitLab project names;
   - package registries: npm, crates.io, PyPI, Maven Central, NuGet, Homebrew,
     Debian, Fedora, Arch/AUR, and other relevant ecosystems;
   - executable/command names on Windows, macOS, Linux, BSD, LLVM tooling, and
     common shells;
   - domains and social/developer namespaces, without buying or reserving
     anything;
   - academic systems, hardware, neural engines, graph compilers, CAD,
     presentation software, and security products.

2. Investigate `.slide` as a filename extension:
   - existing documented formats and applications;
   - OS/file-association collisions;
   - editor syntax registries and GitHub Linguist;
   - MIME/media-type implications;
   - source-versus-compiled-artifact ambiguity;
   - case-insensitive filesystem risks;
   - magic-byte and content-sniffing requirements.

3. Evaluate whether the acronym expansion accurately describes a low-level
   language/substrate. Identify any misleading implication: layout engine,
   interconnect fabric, presentation software, hardware-only system, neural
   network, or GUI product.

4. Recommend a complete, internally consistent identifier set:
   - display name;
   - spoken name;
   - acronym and expansion;
   - CLI command;
   - repository name;
   - package scope/prefix;
   - source extension, if SLIDE has source;
   - compiled/container extension;
   - MIME/media type strategy;
   - schema URI/prefix;
   - diagnostic prefix;
   - environment-variable prefix;
   - C ABI symbol prefix;
   - Rust crate/module prefix;
   - Windows file association/progID;
   - macOS UTType;
   - Linux desktop MIME name.

5. Score at least five candidate strategies, including:
   A. keep SLIDE and .slide;
   B. keep SLIDE but choose a different compiled extension;
   C. use “SLIDE Engine” publicly and a namespaced technical prefix;
   D. keep the expansion but use a coined short name;
   E. a reviewer-proposed alternative.

   Score 0-5 for collision risk, clarity, memorability, searchability,
   package availability, cross-platform safety, legal-review burden,
   low-level-language credibility, and 20-year stability.

6. Do not declare a name legally safe merely because searches return no exact
   hit. Give a precise solicitor handoff: jurisdictions, classes, similar
   marks, common-law use, and questions requiring professional clearance.

PRIORITY 2 — CRYPTOGRAPHIC DESIGN

7. Review the Ed25519 + ML-DSA-65 logical-AND envelope against current primary
   standards:
   - FIPS 204 and current errata;
   - RFC 8032;
   - current ML-DSA PKIX/CMS/JOSE/COSE RFCs;
   - RFC 9958;
   - the current IETF composite-signature draft;
   - NIST crypto-agility guidance.

8. Decide whether the NUL-separated domain, suite, authority key id, canon tag,
   and canonical artifact plus the same FIPS 204 context provide sound domain
   separation and identity binding. Check encoding ambiguity, context-size
   limits, algorithm identifiers, key-id binding, public-key binding,
   canonicalization, signature malleability, parser differentials, and
   cross-protocol attacks.

9. Review hybrid-composition risks:
   - both-signatures versus either-signature policy;
   - downgrade and stripping;
   - key substitution and shared/different key identifiers;
   - one component implementation failing open;
   - verification order and timing/DoS;
   - large ML-DSA keys/signatures;
   - harvest-now-forge-later considerations;
   - migration if ML-DSA or Ed25519 is later weakened;
   - retaining v1 verification without enabling new v1 signing.

10. Review operational authority:
    - cold root versus separate operational registry key;
    - exact root-signed delegation fields and constraints;
    - expiry, sequence, scope, maximum certification tier, and registry id;
    - revocation, rotation, anti-rollback, recovery, and offline ceremony;
    - whether the existing application envelope should wait for a final
      composite-signature RFC or remain separately versioned.

REQUIRED OUTPUT

Return:

1. Executive verdict: KEEP / KEEP WITH CHANGES / RENAME / OWNER OR LEGAL
   DECISION NEEDED.
2. A collision table with direct registry/source links and dates.
3. A complete recommended identifier table.
4. A five-strategy scoring matrix with weights and arithmetic shown.
5. A file-extension recommendation, including magic bytes and MIME/UTType
   approach.
6. A cryptographic threat table: threat, present control, gap, severity,
   exact recommendation.
7. A proposed minimal root-to-operational-key delegation schema, canonical
   signing preimage, and fail-closed verification pseudocode.
8. A list of claims you could not verify.
9. A legal/cryptographic expert handoff checklist.
10. A one-page answer suitable for committing to the project as an
    architecture decision record.

Do not invent benchmark results, registrations, standards status, package
availability, or legal conclusions. If a registry cannot be searched, mark it
UNVERIFIED rather than treating silence as availability.
```

## Primary starting points for the reviewer

- Companies House CTLL record:
  <https://find-and-update.company-information.service.gov.uk/company/11508100/more>
- IANA media-type registry:
  <https://www.iana.org/assignments/media-types/media-types.xhtml>
- EUIPO availability guidance and TMview entry point:
  <https://www.euipo.europa.eu/trade-marks/before-applying/availability>
- NIST FIPS 204:
  <https://csrc.nist.gov/pubs/fips/204/final>
- RFC 8032:
  <https://www.rfc-editor.org/info/rfc8032/>
- RFC 9958:
  <https://www.rfc-editor.org/rfc/rfc9958.html>
- RFC 9964:
  <https://www.rfc-editor.org/info/rfc9964/>
- Current Composite ML-DSA draft:
  <https://datatracker.ietf.org/doc/html/draft-ietf-lamps-pq-composite-sigs>
- NIST crypto-agility white paper:
  <https://csrc.nist.gov/pubs/cswp/39/upd1/considerations-for-achieving-crypto-agility/final>

## Current project interpretation

SLIDE remains the engineering working name, not a legal-clearance claim.
`.slide` remains a provisional compiled-container extension until the
independent review is adjudicated. The public architecture should use
namespaced schema and diagnostic identifiers even if the display name remains
SLIDE.
