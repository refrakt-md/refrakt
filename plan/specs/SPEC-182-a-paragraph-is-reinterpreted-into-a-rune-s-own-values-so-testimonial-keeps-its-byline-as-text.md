{% spec id="SPEC-182" status="accepted" tags="runes, composition, content-model, testimonial, reinterpretation, seo" %}

# A paragraph is reinterpreted into a rune's own values, so testimonial keeps its byline as text

A content model can already read structured values out of inline Markdown, but only from a list
item (`itemModel`) or a section heading (`headingExtract`). This spec lets a **paragraph** field
take the same item model, and lets what it extracts **fill the rune's own attributes**. A
composed rune can then read `**Sarah Chen** — Head of Content` the way the plugin
`testimonial` does today, declaratively, with no transform.

It reverses one part of {% ref "SPEC-161" /%} D1. That decision moved `testimonial`'s author and
role from content to attributes, because no composition could reach a value inside a
paragraph. This spec supplies the missing reach, so the author's byline stays text.

## Why

**Reinterpretation is what refrakt is.** A heading inside `{% nav %}` becomes a group title. A
list inside `{% recipe %}` becomes ingredients. `- Ada Lovelace — Analyst` inside `{% cast %}`
becomes a `cast-member` with a name and a role. The byline of a testimonial is the same kind of
thing: text a reader sees, which a rune gives meaning to.

**SPEC-161 D1 took it away for a mechanical reason, not a design one.** It found that "a value
read from content placed inside a primitive is not reachable by the schema harvest", and moved
the author to attributes. That was the right call while compositions had no way to extract a
value. It is the wrong place to leave things:

- The byline is **visible text**. `**Sarah Chen** — Head of Content` reads correctly as plain
  Markdown, on GitHub or in any preview. `author="Sarah Chen"` does not appear at all.
- It is **inconsistent** with the rest of the catalogue. `cast` reads `Name — Role` from a list
  item. A testimonial is the same shape in a paragraph.
- The extraction it needs **already exists**, for list items. `cast` uses
  `itemModel: { name: text remainder, role: text /\s*[-–—]\s*(.+)$/ }` with
  `emitAttributes: { name: $name, role: $role }`. What is missing is narrow: the item model on
  a paragraph, and a way for its values to become the rune's own.

**A rule falls out of this, worth stating once.** What the reader sees as text is written as
text and reinterpreted. What configures or annotates the rune, and is never read as prose, is
an attribute. A testimonial's `rating` drives a widget, so it is an attribute. Its author and
role are read, so they are text. Attributes stay available for the same values (D4), because an
attribute is sometimes the better tool: generated content, or a byline the author does not want
in a plain-Markdown rendering.

## What exists, and what is missing

| Piece | Exists | Where |
|---|---|---|
| Inline extraction: `strong`, `em`, `link`, `code`, `image`, `text` with a regex or `remainder`, `extract: href` | yes, list items only | `resolveListItems`, `packages/runes/src/lib/resolver.ts` |
| Extraction from heading text | yes | `headingExtract` |
| Extracted values as attributes of an **emitted child tag** | yes | `emitTag` + `emitAttributes` (`cast-member`) |
| Extracted values as `$each` bindings in a template | yes | SPEC-145 D4a, SPEC-169 |
| Inline extraction from a **paragraph** | **no** | D1 |
| Extracted values as the **rune's own** attributes | **no** | D2 |

The second gap is the one that matters for structured data. A composed rune's meta blocks
(`{% metablock name="byline" /%}`), its schema table (`author: { properties: { author: name } }`)
and its registration all read the rune's own values, from its field bag. A value that reaches
the field bag is published exactly like an attribute, whichever way the author wrote it.

## Decisions

### D1 — a paragraph field takes an item model, and resolves to one record

A sequence field that matches `paragraph` may declare `itemModel`, in the vocabulary list items
already use. The paragraph's inline children are matched exactly as a list item's are, and the
field resolves to one record rather than one per item.

```yaml
attribution:
  match: paragraph
  optional: true
  itemModel:
    fields:
      - { name: name, match: strong }
      - { name: role, match: text, pattern: '^\s*[-–—,]\s*(.+)$', optional: true }
```

The vocabulary is reused rather than extended: no new match kinds, no new pattern forms. A
pattern written in a definition's YAML is a string, compiled as a regular expression, as list
item patterns already are.

### D2 — `fills` names the rune's attributes an extracted value supplies

A field with an item model may declare `fills`, mapping the rune's **declared** attributes to
extracted fields:

```yaml
  fills: { author: $name, role: $role }
```

- **Precedence: the author's attribute wins.** A value written as an attribute is never replaced
  by one extracted from content. The resolved value is `attrs.author ?? extracted.name`.
- **It lands in the field bag**, where the attribute would have. Everything that reads the
  rune's values reads it the same way: `metaFields`, `blocks`, the schema table, `registers`,
  the engine's modifiers.
- **Only declared attributes.** `fills` naming an attribute the definition does not declare is
  rejected at definition load, naming it. So is a `$` reference to a field the item model does
  not declare.
- **Values are flattened text**, as SPEC-145 D4a decided for headings. `**Ada** _Lovelace_`
  fills `Ada Lovelace`. The loss is the rune author's declared choice, not a surprise.

`fills` is a new key rather than `emitAttributes` without an `emitTag`. `emitAttributes` writes
on an emitted child, and reading the same key as "write on the rune itself" when `emitTag` is
absent would give one key two targets depending on a sibling.

### D3 — a filling field matches a paragraph only when its required fields match

A plain `match: paragraph` takes any paragraph. A field with an item model is narrower: it
matches only a paragraph in which every non-optional item-model field matches. An ordinary
paragraph is left for the next field, or reported as `content-unmatched`.

This is what keeps reinterpretation from swallowing prose. A second quote paragraph, or a
paragraph holding only the avatar image, has no `strong`, so it is not read as a byline.

### D4 — attribute and content forms are both supported, and composing both costs no branching

A rune that fills an attribute from content also keeps the attribute. Supporting both adds
nothing to the template: D2's precedence happens before the template expands, so the template
only ever sees one value. There is no `{% if %}` on the form the author chose.

When both are written, the attribute wins, the paragraph is consumed, and validation reports a
warning (`fill-overridden`), naming the attribute and the line, because content an author wrote
then does not render. *(Severity settled 2026-10-30: a warning, not an info.)* A paragraph that fills nothing is never consumed.

### D5 — a filling field is placed into values, not by a slot

SPEC-145 D11 rejects a content-model field that no slot places (`field-unplaced`), because its
content would silently disappear. A field with `fills` is not dropped: its content becomes the
rune's values, which the template places through meta blocks or `$attrs`. So D11 counts a filling
field as placed, and the template may not also place it with a slot, which would render the
byline twice.

### D6 — `testimonial` reads its byline from the paragraph, and keeps `author` and `role`

The composed `testimonial` (`site/staged-runes/testimonial.md`) gains an `attribution` field per
D1–D2, after the quote and before the trailing avatar:

```yaml
content:
  type: sequence
  fields:
    avatar:       { match: image, optional: true }
    quote:        { match: blockquote }
    attribution:
      match: paragraph
      optional: true
      itemModel:
        fields:
          - { name: name, match: strong }
          - { name: role, match: text, pattern: '^\s*[-–—,]\s*(.+)$', optional: true }
      fills: { author: $name, role: $role }
    avatar-after: { match: image, optional: true }
```

- **Both forms render identically**, and both publish the same `Review` / `Person` / `Rating`
  graph. The comparison tests assert both against the plugin.
- **The paragraph is the documented form.** The reference page, the snippet and the editor
  snippet teach `**Name** — Role`; `author` and `role` are documented as the alternative.
- **`content-unmatched` no longer fires** on the paragraph form, so SPEC-161 D1's "a page still
  written the old way reports `content-unmatched`" is withdrawn. The form is not old.

**The comma attribution (BUG-019) is fixed in the composition, not carried.** The separator
pattern accepts a comma, so `**Alex Rivera**, CTO at Acme` fills `role: "CTO at Acme"`, where the
plugin's parser keeps `", CTO at Acme"`. That is a difference from the SEO baseline, explained
by the fix, and recorded when `testimonial` goes live rather than regenerated away.

### D7 — the WORK-685 content migration is reverted, and the codemod is withdrawn before release

{% ref "WORK-685" /%} rewrote this repository's five testimonials into attributes, and
{% ref "WORK-668" /%} shipped `refrakt marketing migrate-testimonial` to do it for users. Under
D6 the paragraph is the documented form, so both point the wrong way. Neither is released yet
(v0.44.0 is unpublished), so the cost of reversing them is a changeset edit, not a migration.

- **The plugin keeps `author` and `role`.** They are D4's alternative form, and the plugin
  accepting them stays additive.
- **The site content and the SEO fixtures return to the paragraph form.** The fixtures are what
  exercise the attribution parser, and `testimonial.comma` exists to probe it (BUG-019); as an
  attribute it probes nothing.
- **`migrate-testimonial` is removed** with its `./cli-plugin` export, and its changeset entry
  is dropped. `parseAttribution` stays exported for the plugin's own use. No user has the
  command, so nothing needs a deprecation.

## What it unlocks beyond testimonial

- **`pull-quote`'s attribution** (SPEC-161 D2) is the same shape, and its open question
  (attribute or trailing paragraph) is answered by D4: both, with the paragraph documented.
- **`cast-member` as a composition** can read `Name — Role` from a paragraph as well as from
  `cast`'s list shorthand.
- Any byline, credit or caption line where the reader sees the values as text.

## Not in scope

- **Rich values.** A filled value is flattened text (D2). Keeping a link in the role needs a
  second attribute filled with `extract: href` (e.g. `role-url`); no rune needs that yet.
- **Filling from headings.** `headingExtract` already serves sections; extending `fills` to
  heading fields is a separate, small step if a rune wants it.
- **Changing the plugin `testimonial`'s parser.** It keeps its behaviour, BUG-019 included,
  until it is replaced.

## Open questions

- **Whether `fills` should also be allowed on a list field without `emitTag`**, filling from the
  first item. No rune needs it; left out until one does.

## Acceptance Criteria

- [ ] A sequence field matching `paragraph` accepts `itemModel`, resolving to one record, with the list-item vocabulary unchanged
- [ ] `fills` maps declared attributes to extracted fields; an undeclared attribute or an unknown `$` field is rejected at definition load, naming it
- [ ] The author's attribute wins over a filled value, and the filled value reaches the field bag, so meta blocks, the schema table and registration read it as they read the attribute
- [ ] A field with an item model matches only a paragraph in which its required fields match
- [ ] A filling field counts as placed for SPEC-145 D11, and placing it with a slot as well is rejected
- [ ] Writing both forms keeps the attribute, consumes the paragraph and warns `fill-overridden`
- [ ] The staged `testimonial` reads `**Name** — Role`, renders and publishes identically from either form, and the comparison tests assert both
- [ ] The site content and SEO fixtures return to the paragraph form; `migrate-testimonial` and its changeset entry are removed before v0.44.0 is released
- [ ] The composed-runes guide documents paragraph item models and `fills`, and the reference page documents the paragraph as testimonial's form with `author` / `role` as the alternative

## References

- {% ref "SPEC-161" /%}: D1 (amended by D6–D7 here), D2 (answered by D4).
- {% ref "SPEC-145" /%}: D4a (flattening is the rune author's choice), D11 (placed fields).
- {% ref "SPEC-169" /%}: the content models a composition takes.
- {% ref "SPEC-181" /%}: D7, a plugin rune accepts the composition's authoring form first.
- {% ref "WORK-668" /%}, {% ref "WORK-685" /%}: the attribute form and its migration.
- {% ref "BUG-019" /%}: the comma attribution.

{% /spec %}
