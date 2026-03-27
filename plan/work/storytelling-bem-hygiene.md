{% work id="WORK-078" status="done" priority="medium" complexity="trivial" tags="storytelling, runes, transform" %}

# BEM Modifier Hygiene for Storytelling Runes

> Ref: SPEC-028 (Rune Output Standards — Standard 1)

## Summary

Several storytelling rune configs emit BEM modifier classes for free-form string attributes (aliases, tags, parent, scale, factionType, id, track, follows). These produce unusable CSS selectors like `.rf-character--"Gandalf the Grey,Mithrandir"`. Add `noBemClass: true` to these modifiers so only `data-*` attributes are emitted.

## Acceptance Criteria

- [ ] `character` config: `aliases` and `tags` modifiers have `noBemClass: true`
- [ ] `realm` config: `scale`, `tags`, and `parent` modifiers have `noBemClass: true`
- [ ] `faction` config: `factionType` and `tags` modifiers have `noBemClass: true`
- [ ] `lore` config: `tags` modifier has `noBemClass: true`
- [ ] `plot` config: `tags` modifier has `noBemClass: true`
- [ ] `beat` config: `id`, `track`, and `follows` modifiers have `noBemClass: true`
- [ ] Data attributes still emitted for all modified fields (verified via `refrakt inspect`)
- [ ] CSS coverage tests still pass (no selectors should depend on these classes)

## Approach

Config-only changes in `runes/storytelling/src/config.ts`. Add `noBemClass: true` to each identified modifier. Run tests to verify data attributes are preserved and no CSS breaks.

## References

- SPEC-028 (Standard 1 — BEM Modifier Classes for Enumerable Values Only)

{% /work %}
