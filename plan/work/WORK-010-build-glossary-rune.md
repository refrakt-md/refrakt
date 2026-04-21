{% work id="WORK-010" status="pending" priority="medium" tags="runes, learning" source="SPEC-008" %}

# Build `glossary` Rune

> Ref: {% ref "SPEC-008" /%} (Unbuilt Runes) — Package: `@refrakt-md/learning`

## Summary

Collection of terms with definitions, rendered as a navigable index. At build time, auto-links term occurrences across the site. Schema.org: `DefinedTermSet`.

## Attributes

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `autoLink` | Boolean | `true` | No | Enable site-wide auto-linking of terms |
| `groupBy` | String | `'letter'` | No | Grouping: `letter` (alphabetical), `category`, `none` |

## Content Model

- Child `{% concept %}` runes → individual terms
- Or: definition list (`term\n: definition`) syntax → auto-converted to concept entries
- Headings → category group labels (when `groupBy="category"`)

## Transform Output

- typeof: `Glossary`
- Tag: `<section>`
- Properties: `autoLink`, `groupBy`
- Refs: `terms` (dl or grouped divs), `index` (alphabetical jump links)

## Implementation Tasks

1. Create schema in `runes/learning/src/tags/glossary.ts`
2. Add RuneConfig entry in `runes/learning/src/config.ts`
3. Write CSS in `packages/lumina/styles/runes/glossary.css`
4. Import CSS in `packages/lumina/index.css`
5. Add SEO extractor for `DefinedTermSet`
6. Implement cross-page auto-linking pipeline hook in `@refrakt-md/learning` package's `PackagePipelineHooks`
7. Write tests in `runes/learning/test/tags/glossary.test.ts`
8. Create inspector fixture

## Implementation Notes

The auto-linking feature requires build pipeline integration beyond standard rune transforms. During the content build, the pipeline collects all glossary terms and rewrites matching text nodes across other pages into links. This should be implemented as a post-build pass via the `@refrakt-md/learning` package's `postProcess()` pipeline hook — similar to how `toc` collects headings, but cross-page.

## Dependencies

- Requires the `concept` rune ({% ref "WORK-007" /%}) to exist first — glossary collects concept definitions

{% /work %}
