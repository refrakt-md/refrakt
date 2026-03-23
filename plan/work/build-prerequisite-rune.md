{% work id="WORK-011" status="pending" priority="low" tags="runes, learning" %}

# Build `prerequisite` Rune

> Ref: {% ref "SPEC-008" /%} (Unbuilt Runes) — Package: `@refrakt-md/learning`

## Summary

Declares dependencies between content pages. "Complete X before starting this lesson." Themes can render these as a learning path or dependency graph.

## Attributes

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `path` | String | — | Yes | Path to the prerequisite page (relative URL) |
| `label` | String | — | No | Display label (defaults to the target page's title) |
| `required` | Boolean | `true` | No | Whether this is a hard requirement or a recommendation |

## Content Model

- Self-closing tag (no children). All data comes from attributes.
- Multiple `{% prerequisite %}` tags can appear on a page.

## Transform Output

- typeof: `Prerequisite`
- Tag: `<a>` or `<div>`
- Properties: `path`, `label`, `required`

## Implementation Tasks

1. Create schema in `runes/learning/src/tags/prerequisite.ts`
2. Add RuneConfig entry in `runes/learning/src/config.ts`
3. Write CSS in `packages/lumina/styles/runes/prerequisite.css`
4. Import CSS in `packages/lumina/index.css`
5. Implement cross-page dependency graph collection via `@refrakt-md/learning` package's `register()` pipeline hook
6. Write tests in `runes/learning/test/tags/prerequisite.test.ts`
7. Create inspector fixture

## Implementation Notes

The rune itself is simple — the complexity is in the build pipeline integration. The content pipeline collects all prerequisite declarations and builds a dependency graph. Themes can render this as a progress tracker, learning path visualization, or simple prerequisite list.

{% /work %}
