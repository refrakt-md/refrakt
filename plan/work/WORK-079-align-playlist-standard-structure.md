{% work id="WORK-079" status="done" priority="high" complexity="moderate" tags="media, runes, transform" source="SPEC-028" %}

# Align Playlist Transform to Standard Structure

> Ref: SPEC-028 (Rune Output Standards — Standards 2, 3)

Depends on: WORK-076 (shared layout meta utility), WORK-077 (shared media unwrap utility)

## Summary

The playlist rune uses a custom header structure that diverges from the standard 3-section pattern (meta header, content wrapper with preamble, media zone). It also has missing config modifiers for schema-emitted meta tags. Align it to match the recipe reference implementation so it can participate in shared split layout CSS.

## Acceptance Criteria

- [ ] Playlist transform uses `pageSectionProperties` + `<header data-name="preamble">` pattern instead of custom `<div data-name="header">` with imperative title assignment
- [ ] Description paragraphs wrapped as a blurb inside the preamble header
- [ ] Config sections updated to recipe pattern: `{ meta: 'header', preamble: 'preamble', headline: 'title', blurb: 'description', media: 'media' }`
- [ ] Config declares modifiers for `artistMeta`, `hasPlayerMeta`, and `id` meta tags emitted by the schema
- [ ] Media zone uses shared unwrap utility from WORK-077
- [ ] Layout meta tags use shared utility from WORK-076
- [ ] Identity transform output follows standard 3-section structure: meta div, media div, content div (with preamble inside)
- [ ] Playlist CSS updated to target new BEM class names (e.g. `__preamble` instead of `__header`)
- [ ] All existing tests pass (update snapshots for new structure)

## Approach

1. Refactor `playlist.ts` transform to use `pageSectionProperties` for preamble extraction
2. Update config sections and add missing modifiers
3. Apply shared utilities from WORK-076 and WORK-077
4. Update `playlist.css` selectors to match new element names
5. Update test snapshots

## References

- {% ref "SPEC-028" /%} (Standard 2 — Preamble Groups with Content)
- {% ref "SPEC-028" /%} (Standard 3 — Config Must Match Schema Capabilities)
- {% ref "WORK-076" /%} (shared layout meta utility)
- {% ref "WORK-077" /%} (shared media unwrap utility)

{% /work %}
