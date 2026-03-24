{% work id="WORK-006" status="pending" priority="medium" tags="runes, core" milestone="v1.0.0" %}

# Build `math` Rune

> Ref: {% ref "SPEC-008" /%} (Unbuilt Runes)

## Summary

Mathematical notation rendered from LaTeX/KaTeX syntax. Supports both inline and block (display) mode. Aliases: `equation`, `formula`. This is a core rune.

## Attributes

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `display` | Boolean | `true` | No | Block display mode (centered, full-width) vs inline |
| `label` | String | — | No | Equation label for cross-referencing |

## Content Model

- Text content inside the tag is treated as raw LaTeX/KaTeX source — not parsed as Markdown
- Similar pattern to `{% diagram %}` treating content as Mermaid source

## Transform Output

- typeof: `Math`
- Tag: `<div>` (display) or `<span>` (inline)
- Properties: `source` (the raw LaTeX string), `label`

## Implementation Tasks

1. Create schema in `packages/runes/src/tags/math.ts` — raw source extraction pattern (like diagram)
2. Add RuneConfig entry in `packages/runes/src/config.ts`
3. Write CSS in `packages/lumina/styles/runes/math.css`
4. Import CSS in `packages/lumina/index.css`
5. Implement rendering: build-time KaTeX transform (preferred, like Shiki for code) or web component fallback
6. Write tests in `packages/runes/test/tags/math.test.ts`
7. Create inspector fixture
8. Run CSS coverage tests

## Implementation Notes

Rendering strategy mirrors the Diagram rune — either a build-time transform (like `@refrakt-md/highlight` does for code blocks) or a web component that initializes from the source attribute. Build-time is preferred for performance and SSR.

{% /work %}
