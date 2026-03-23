{% work id="WORK-012" status="pending" priority="low" tags="runes, learning" %}

# Build `objective` Rune

> Ref: {% ref "SPEC-008" /%} (Unbuilt Runes) — Package: `@refrakt-md/learning`

## Summary

Learning outcome statement. "After this lesson, you will be able to..." Typically placed at the top of a lesson page. Alias: `learning-outcome`.

## Attributes

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `verb` | String | — | No | Bloom's taxonomy verb (e.g., `understand`, `apply`, `analyze`) — used for metadata, not rendering |

## Content Model

- Unordered list → individual learning objectives
- Paragraphs → introductory context

## Transform Output

- typeof: `Objective`
- Tag: `<aside>`
- Properties: `verb`
- Refs: `objectives` (ul)

## Implementation Tasks

1. Create schema in `runes/learning/src/tags/objective.ts`
2. Add RuneConfig entry in `runes/learning/src/config.ts` — declarative: block, optional icon injection (target/goal icon), content wrapper
3. Write CSS in `packages/lumina/styles/runes/objective.css`
4. Import CSS in `packages/lumina/index.css`
5. Write tests in `runes/learning/test/tags/objective.test.ts`
6. Create inspector fixture

## Dependencies

None — fully declarative, no JS needed. One of the simplest runes to implement.

{% /work %}
