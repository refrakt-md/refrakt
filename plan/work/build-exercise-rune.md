{% work id="WORK-008" status="pending" priority="medium" tags="runes, learning" milestone="v1.0.0" %}

# Build `exercise` Rune

> Ref: {% ref "SPEC-008" /%} (Unbuilt Runes) — Package: `@refrakt-md/learning`

## Summary

Practice problem with a prompt, optional hints, and a revealable solution. Encourages active learning.

## Attributes

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `difficulty` | String | `'medium'` | No | `easy`, `medium`, `hard` |
| `points` | Number | — | No | Point value (for graded contexts) |
| `type` | String | `'open'` | No | `open` (free response), `code` (expects code), `multiple-choice` |

## Content Model

- First paragraph/section → the problem prompt
- `## Hints` or `## Hint` heading → progressive hints (each child is one hint, revealed sequentially)
- `## Solution` heading → the solution (hidden by default, revealed on click)
- Code fences in the solution section get syntax highlighting

## Transform Output

- typeof: `Exercise`
- Tag: `<article>`
- Properties: `difficulty`, `points`, `type`
- Refs: `prompt` (div), `hints` (ol, each li is a hint), `solution` (div, initially hidden)

## Implementation Tasks

1. Create schema in `runes/learning/src/tags/exercise.ts`
2. Add RuneConfig entry in `runes/learning/src/config.ts`
3. Write CSS in `packages/lumina/styles/runes/exercise.css`
4. Import CSS in `packages/lumina/index.css`
5. Add hint revelation + solution toggle behaviors in `packages/behaviors/`
6. Write tests in `runes/learning/test/tags/exercise.test.ts`
7. Create inspector fixture

## Dependencies

- Hint revelation and solution toggle need JS — candidate for `@refrakt-md/behaviors`

{% /work %}
