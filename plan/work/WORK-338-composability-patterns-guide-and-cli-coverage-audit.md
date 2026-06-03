{% work id="WORK-338" status="draft" priority="medium" complexity="moderate" source="SPEC-084" milestone="v0.19.0" tags="composability,docs,cli" %}

# Composability patterns guide and CLI coverage audit

Socialize the composability contract: a patterns guide for authors plus a CLI
audit that flags declared-but-unstyled context modifiers and nesting-contract
violations.

## Acceptance Criteria
- [ ] A "Composability patterns" page under `site/content/extend/rune-authoring/` documents: the open-world principle (dependency asymmetry), open containers vs strict `requiresParent` children, name-agnostic slot styling, when to use a context modifier, and worked nesting examples.
- [ ] `refrakt inspect`/audit reports context modifiers that lack CSS coverage.
- [ ] The audit reports `requiresParent` violations (a child outside its self-declared required parent) for a given content tree.
- [ ] Audit output documented in the tooling docs.

## Approach
Extend the existing inspect/audit tooling (`packages/cli`) — it already derives
selectors from config and checks CSS coverage, so the context-modifier check is
an extension of that path. The guide draws on the composability research
inventory.

## References
- `packages/cli` (inspect/audit), `site/content/extend/rune-authoring/`
- Depends on {% ref "SPEC-084" /%}, complements {% ref "WORK-337" /%}

{% /work %}
