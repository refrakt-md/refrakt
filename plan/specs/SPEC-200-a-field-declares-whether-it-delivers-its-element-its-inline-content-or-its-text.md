{% spec id="SPEC-200" status="draft" tags="content-model, composition, template, schema, editor, marquise" %}

# A field declares whether it delivers its element, its inline content or its text

## Summary

When a content model matches a heading or a paragraph, every consumer receives the node as the
author wrote it: a `##` arrives as an `h2`, a paragraph as a `p`. Whether that element *means*
anything is never stated. Is the author's `##` part of what they said, or only how Markdown
spells "a title"? Each consumer guesses on its own:

- a template unwraps a paragraph when its `{% slot %}` sits inside a line, and cannot unwrap a
  heading at all;
- a schema.org row takes the node's `textContent`;
- the block editor reads an `editHints` entry declared on the presentation side;
- an author, or an AI writing content, gets no signal.

This spec makes it a fact the content model declares, once, on the field:

```yaml
fields:
  eyebrow:  { match: paragraph, optional: true, as: text }
  headline: { match: heading, as: inline }
  body:     { match: heading|paragraph, optional: true, greedy: true }   # as: block, the default
```

It lands in refrakt first and graduates to Marquise ({% ref "SPEC-199" /%}), where it decides
whether a component's prop is the author's element, its inline content or a string.

## Prerequisites

| Needs | From | State on 2026-11-12 |
|---|---|---|
| Declarative content models | `packages/types/src/content-model.ts` | implemented |
| Compositions and their slots | {% ref "SPEC-145" /%} | accepted |
| `text()` and the value vocabulary | {% ref "SPEC-195" /%} | accepted |

## What exists, measured

*Measured 2026-11-12.*

| Consumer | How it decides today | Where |
|---|---|---|
| Templates | a `{% slot %}` written inside a line of text places a paragraph's inline content; a heading always arrives as written | `inlineContent`, `packages/runes/src/lib/composition.ts:1491` |
| Native runes' `emits` | `as: value | region`: whether a node is named directly or wrapped in an element. Not whether its element is kept | `packages/runes/src/lib/slots.ts`, {% ref "SPEC-143" /%} |
| Expressions | `text($slots.x)` returns a slot's plain text | {% ref "SPEC-195" /%} |
| schema.org rows | `textContent` of the source node | `packages/runes/src/seo.ts:23` |
| Block editor | `editHints: { name: 'inline' }`, declared in engine config | `packages/transform/src/types.ts` |
| Framework components | ADR-008 renders each named ref as HTML with its element | `packages/react/src/Renderer.tsx` |

`ContentFieldDefinition` (`packages/types/src/content-model.ts:15`) has `match`, `optional`,
`greedy`, `itemModel`, `fills`, `emitTag` and `emitAttributes`, and nothing about the matched
node's element.

## Decisions

### D1: a field declares `as: block | inline | text`

| `as` | Delivers | For a component (ADR-049) | Lost |
|---|---|---|---|
| `block` (default) | the nodes as written: element, heading level, list type | the framework's renderable | nothing |
| `inline` | the matched node's inline content: text with emphasis, links, code | the framework's renderable | the element, the heading level, any id or class on the element |
| `text` | a plain string | `string` | all formatting |

- **The default is `block`.** It is lossless, and every existing definition and native rune
  keeps its output unchanged.
- **It is a statement about the content**, not about any presentation: "the level of this
  heading is not part of what the author said." So it belongs in the content model, beside
  `match`, and every consumer reads the same answer.

### D2: `inline` and `text` take one paragraph or one heading

- Allowed on a non-greedy field whose `match` is `paragraph`, `heading` or `heading:N`.
- On a greedy field, or on `list`, `blockquote`, `fence`, `image` or `any`, it is a definition
  error: `field-as-invalid`, naming the field and what it matches.
- Per-item values stay with `itemModel`, whose fields are already strings. Whether an item field
  may take `as: inline` (a link label keeping its emphasis) is open question 1.

### D3: what `inline` delivers

- The children of the matched node's `inline` node, unchanged: text, `strong`, `em`, links,
  inline code, images, inline tags.
- **An attribute on the element is dropped**, and validation reports it as a warning:
  `field-as-drops-attributes`. `# Welcome {% #intro %}` on an `inline` headline loses `#intro`.
- **An `inline` heading is no longer a heading in the document.** It has no generated id, and
  `toc`, the heading index and the outline do not see it, unless a presentation makes it a heading
  again. That is right for a hero's headline and wrong for a section's title, which stays `block`.

### D4: what `text` delivers

- The node's text content: every text node concatenated, a soft line break read as a space,
  whitespace collapsed and trimmed. The same function serves `text()` (SPEC-195) and schema.org
  values, so the three never disagree.
- **Formatting the author wrote is reported as information**, not an error:
  `field-text-formatting-dropped`. An author who bolds part of an eyebrow learns it will not show.

### D5: every consumer reads the declaration

| Consumer | Behaviour |
|---|---|
| Templates | a slot for an `inline` field places inline content wherever it stands. Placed on its own line, it needs a primitive that chooses the element ({% ref "SPEC-194" /%} D11); placed bare at block level, it is wrapped in a paragraph, as fallback content is today (`composition.ts:1529`). A `text` field is placed as text |
| The inline slot form | keeps unwrapping a `block` paragraph for one release, with a deprecation warning pointing at `as: inline` ({% ref "SPEC-189" /%}). After that, inline placement requires an `inline` or `text` field |
| Primitives | may choose the element an `inline` heading becomes, for example a section header deriving its level from the page outline rather than the author's `#` |
| schema.org rows | a `text` field is the property's value directly; an `inline` field is read with D4's function |
| Block editor | `inline` and `text` fields are edited as one line, `text` without formatting controls. An `editHints` entry that contradicts the field reports `edit-hint-conflicts-field` |
| `refrakt reference`, the AI prompt, the language server | state the declaration: "headline: one heading; its text is used, its level is not" |
| Framework components (ADR-049) | an `inline` field arrives as a renderable of its inline content, a `text` field as a `string`; generated types follow |

### D6: the first users

`hero` and `cta` (`plugins/marketing/runes/`) gain declarations where the element carries no
meaning:

| Rune | Field | `as` |
|---|---|---|
| `hero`, `cta` | `eyebrow` | `text` |
| `hero`, `cta` | `headline` | `inline` |
| `hero`, `cta` | `blurb` | `inline` |

Each change is reviewed against the structure contracts and the structured-data baseline;
every difference is listed and accepted or fixed. Whether the section primitive then chooses the
headline's heading level is a follow-up, not part of this spec.

### D7: `as` beside SPEC-143's `as`

SPEC-143's `emits.slots` also uses `as` (`value | region`). It belongs to native runes' engine
config, which SPEC-194 converts to definitions, so the two never appear in the same place and
the overlap ends with that conversion. Until then, the reference documents both, each where it
is used.

### D8: it graduates to Marquise

The change is additive: a new optional key with an unchanged default. It joins Marquise 1.0 if
it lands in refrakt before the cut ({% ref "SPEC-199" /%}, "What 1.0 contains"), and otherwise
arrives as a minor release.

## Acceptance criteria

- [ ] `ContentFieldDefinition` accepts `as: block | inline | text`, default `block`
- [ ] `inline` or `text` on a greedy field or a non-paragraph, non-heading match reports `field-as-invalid`
- [ ] An `inline` field delivers its node's inline content; attributes on the element report `field-as-drops-attributes`
- [ ] A `text` field delivers a plain string by the same function `text()` and schema.org values use; formatting reports `field-text-formatting-dropped`
- [ ] Templates place `inline` and `text` fields as D5 describes, and the inline slot form on a `block` paragraph warns for one release
- [ ] The block editor edits `inline` and `text` fields as one line, and a contradicting `editHints` entry is reported
- [ ] `refrakt reference`, the AI prompt and the language server state each field's declaration
- [ ] `hero` and `cta` declare `eyebrow`, `headline` and `blurb` as D6 lists, with contract and baseline differences accepted or fixed

## Open questions

1. **`as: inline` on `itemModel` fields.** Item fields return strings today. A link label with
   emphasis would need `inline` there too.
2. **The key's name.** `as` reads naturally and SPEC-143's use is temporary (D7); `form` would
   avoid the overlap entirely.
3. **Exposing a heading's level beside `inline`.** A presentation could want the author's level
   as a hint while still choosing the element. Not proposed: a field that needs its level stays
   `block`.

## References

- {% ref "SPEC-199" /%}: Marquise, where this decides a component's prop types
- {% ref "ADR-049" /%}: components receive a definition's resolved input
- {% ref "SPEC-143" /%}: `emits` slots and their `as`
- {% ref "SPEC-145" /%}: compositions and slots
- {% ref "SPEC-194" /%}: D11, elements come from primitives
- {% ref "SPEC-195" /%}: `text()`
- {% ref "SPEC-189" /%}: migrations

{% /spec %}
