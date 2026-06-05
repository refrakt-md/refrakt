{% work id="WORK-338" status="draft" priority="medium" complexity="moderate" source="SPEC-084" milestone="v0.19.0" tags="composability,docs,cli" %}

# Composability authoring contract + CLI coverage audit

The *authoring-facing* half of SPEC-084: a contract guide for rune authors plus a
CLI audit. (The end-user *catalog* of concrete compositions lives separately in
the "Compositions" docs category, WORK-346 — this item is the
"how the contract works" reference, not the recipe book.)

## Acceptance Criteria
- [ ] A composability page under `site/content/extend/rune-authoring/` documents the contract: the open-world principle (dependency asymmetry), open containers vs strict `requiresParent` children, the name-agnostic media-zone/slot styling model, and when to reach for a context modifier.
- [ ] `refrakt inspect`/audit reports context modifiers that lack CSS coverage.
- [ ] The audit reports `requiresParent` violations (a child outside its self-declared required parent) for a given content tree.
- [ ] Audit output documented in the tooling docs.
- [ ] The authoring guide cross-links to the "Compositions" catalog (WORK-346).

## Approach
Extend the existing inspect/audit tooling (`packages/cli`) — it already derives
selectors from config and checks CSS coverage, so the context-modifier check is an
extension of that path. The guide is the contract reference; concrete worked
patterns live in the compositions category.

## References
- `packages/cli` (inspect/audit), `site/content/extend/rune-authoring/`
- Depends on {% ref "SPEC-084" /%}; complements {% ref "WORK-337" /%}; pairs with WORK-346

{% /work %}
