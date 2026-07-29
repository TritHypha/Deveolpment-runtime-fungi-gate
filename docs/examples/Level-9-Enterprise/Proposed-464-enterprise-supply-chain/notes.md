# 464 — Enterprise supply chain proposal

**Concept:** flow requiring a module capability that has not been accepted in a supply-chain policy

This is a proposed rule, not an implemented compiler claim. The package resolver currently enforces signed package provenance and capability expansion through the `FUNGI-PKG-*` family, while `FUNGI-MODULE-005` appears only in the module-system design document. The root `.fungi` check/build path has no admitted package-policy input from which it could prove this example.

Promotion requires explicit package-policy grammar, a signed canonical policy input, import-to-package identity resolution, fail-closed `check` and `build` wiring, and negative/control tests. Until then this stays under `Proposed-*` so the stable curriculum cannot report a false green.

**AI rule:** Never claim `FUNGI-MODULE-005` is enforced until the compiler and root CLI prove it.
