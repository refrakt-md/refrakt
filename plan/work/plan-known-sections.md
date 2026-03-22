{% work id="WORK-024" status="blocked" priority="low" complexity="moderate" tags="runes, plan, content-model" %}

# Add `knownSections` to Plan Rune Content Models

> Ref: SPEC-021 (Plan Runes), SPEC-003 (Declarative Content Model)

## Summary

SPEC-021 defines named sections with aliases for work, bug, and decision runes. The current implementation uses a generic `sections` content model — any H2 heading creates a section, but headings aren't validated or aliased.

The `knownSections` feature would let content models declare expected section names and aliases, enabling:
- Validation: warn if a required section is missing (e.g., work item without "Acceptance Criteria")
- Aliases: "AC", "Criteria", "Done When" all map to "Acceptance Criteria"
- Templates: editor can suggest section names when authoring

## Proposed Known Sections

**work:**
- Acceptance Criteria (aliases: Criteria, AC, Done When)
- Edge Cases (aliases: Exceptions, Corner Cases)
- Approach (aliases: Technical Notes, Implementation Notes, How)
- References (aliases: Refs, Related, Context)
- Verification (aliases: Test Cases, Tests)

**bug:**
- Steps to Reproduce (aliases: Reproduction, Steps, Repro)
- Expected (aliases: Expected Behaviour)
- Actual (aliases: Actual Behaviour)
- Environment (aliases: Env)

**decision:**
- Context
- Options Considered (aliases: Options, Alternatives)
- Decision
- Rationale (aliases: Reasoning, Why)
- Consequences (aliases: Impact, Trade-offs)

## Acceptance Criteria

- [ ] `knownSections` supported in the content model framework (`packages/runes/src/content-model/`)
- [ ] Work rune declares known sections with aliases
- [ ] Bug rune declares known sections with aliases
- [ ] Decision rune declares known sections with aliases
- [ ] Alias matching is case-insensitive
- [ ] Unknown sections still pass through via `sectionModel` fallback
- [ ] Validation warns on missing required sections (if any declared as required)
- [ ] Tests for alias resolution and fallback behaviour

## Status

**Blocked** — the `knownSections` feature does not exist in the content model framework yet. It appears in SPEC-003 (Declarative Content Model) as a planned extension but has not been implemented. This work item is blocked until the framework support ships.

{% /work %}
