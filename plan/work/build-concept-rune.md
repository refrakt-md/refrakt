{% work id="WORK-007" status="pending" priority="medium" tags="runes, learning" %}

# Build `concept` Rune

> Ref: SPEC-008 (Unbuilt Runes) — Package: `@refrakt-md/learning`

## Summary

Term definition with explanation, examples, and related concepts. The building block for glossaries and knowledge bases. Alias: `definition`. Schema.org: `DefinedTerm`.

## Attributes

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `term` | String | — | Yes | The term being defined |
| `id` | String | — | No | Unique identifier for cross-referencing (auto-derived from `term` if omitted) |

## Content Model

- First paragraph → the definition
- `## Examples` heading → examples section
- `## Related` heading → list of related term references
- Other headings → additional sections (etymology, usage notes, etc.)

## Transform Output

- typeof: `Concept`
- Tag: `<article>`
- Properties: `term` (dt), `id`
- Refs: `definition` (dd), `examples` (div), `related` (ul of links)

## Implementation Tasks

1. Create schema in `runes/learning/src/tags/concept.ts`
2. Add RuneConfig entry in `runes/learning/src/config.ts`
3. Write CSS in `packages/lumina/styles/runes/concept.css`
4. Import CSS in `packages/lumina/index.css`
5. Add SEO extractor for `DefinedTerm`
6. Write tests in `runes/learning/test/tags/concept.test.ts`
7. Create inspector fixture

## Dependencies

- The `glossary` rune (WORK-010) collects concept definitions and auto-links terms across the site

{% /work %}
