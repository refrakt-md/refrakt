{% work id="WORK-009" status="pending" priority="low" tags="runes, learning" source="SPEC-008" %}

# Build `quiz` Rune

> Ref: {% ref "SPEC-008" /%} (Unbuilt Runes) — Package: `@refrakt-md/learning`

## Summary

Assessment with multiple questions, answer options, and scoring. Supports multiple-choice, true/false, and fill-in-the-blank. Schema.org: `Quiz`.

## Attributes

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `title` | String | — | No | Quiz title |
| `passingScore` | Number | — | No | Minimum score to pass (percentage) |
| `shuffle` | Boolean | `false` | No | Randomize question order |

## Content Model

- Each `##` heading → a question
- Unordered list under a question → answer options
- List items marked with `[x]` → correct answer(s)
- Blockquotes under a question → explanation shown after answering
- Paragraphs → question context

## Transform Output

- typeof: `Quiz`
- Tag: `<form>`
- Properties: `title`, `passingScore`, `shuffle`
- Refs: `questions` (ol), each containing `prompt`, `options` (ul of radio/checkbox inputs), `explanation` (blockquote)

## Implementation Tasks

1. Create schema in `runes/learning/src/tags/quiz.ts`
2. Add RuneConfig entry in `runes/learning/src/config.ts`
3. Write CSS in `packages/lumina/styles/runes/quiz.css`
4. Import CSS in `packages/lumina/index.css`
5. Implement interactive form behavior: score calculation, answer checking, result display
6. Write tests in `runes/learning/test/tags/quiz.test.ts`
7. Add SEO extractor for `Quiz`
8. Create inspector fixture

## Implementation Notes

This is the most complex learning rune — significant JS for interactive form with score calculation, answer checking, and result display. Likely a web component or full behavior in `@refrakt-md/behaviors`.

The `[x]` checkbox syntax for correct answers needs custom parsing in the content model — similar to how GFM task lists work but repurposed for quiz answers.

{% /work %}
