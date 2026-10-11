{% spec id="SPEC-165" status="draft" tags="runes, composition, primitives, design, inline, core" %}

# A color primitive, inline compositions, and the design runes

## Summary

`swatch` and `palette` (`plugins/design`) each draw colours by hand, and neither can be
reused:

- **`swatch`** is an inline `<span>` built from a chip (an inline `background-color` style), a
  label and an optional value (`plugins/design/src/tags/swatch.ts`).
- **`palette`** does not use `swatch`. In 277 lines it:
  - parses `Name: value, value` rows grouped under headings;
  - renders a single value as a swatch cell and several values as a scale strip, choosing a
    readable text colour for each stop;
  - computes contrast against white and black, and AA/AAA marks;
  - picks a column count (`plugins/design/src/tags/palette.ts`).

There is no way to put a colour where a picture would go. A card representing a colour needs
the colour in its media zone, and nothing can stand there.

This spec adds three things:

1. a core `color` primitive, inline or block by context;
2. inline compositions, measured as nearly working;
3. `swatch` and `palette` rebuilt on them. Palette also needs item extraction to work from YAML
   ({% ref "BUG-038" /%}), one level of nested `each` (D7) and grid cells from an `each` (D8).
   With those, it needs no imperative code of its own.

## Measured: compositions used inline

A throwaway probe placed composed runes, both self-closing and with a body slot, in the middle
of a sentence (`Our primary is {% chip label="Ultramarine" /%} today.`):

- **It validates and renders in place.** There are no errors, the rune lands inside the
  sentence's `<p>`, inline markup in a body slot keeps its formatting, and `$attrs` and
  `{% icon %}` work in the template.
- **Every template shape adds a stray `<p>`.**
  - A one-line template is parsed as its own document, so its line becomes a paragraph. The
    output is `<p>… <span data-rune="chip"><p><span class="rf-badge">…`, a paragraph inside a
    paragraph. A browser closes the outer one early.
  - Putting the tags on their own lines moves the `<p>` inside the badge instead.
  - No template the author can write avoids it.
- **Placement is not enforced.** A composed schema never sets `inline`, so Markdoc accepts it
  anywhere. With `schema.inline = true` set by hand, Markdoc rejects block use
  (`tag-placement-invalid: 'chip' tag should be inline`) and accepts inline use, so that check
  needs no work of its own.

## Decisions

### D1 — `color` is a core primitive, sized by its context

```md
{% color value="#2563EB" /%}
{% color value="#2563EB" label="Ultramarine" /%}
```

It renders one element with `data-rune="color"`, the value as `--color`, and the facts the
design runes compute today, as data:

- `data-on="light|dark"`: which text colour reads on it (palette's `textColorFor`);
- `data-contrast-light` and `data-contrast-dark`: its contrast ratio against white and black.

Two boolean attributes show those facts as text, as palette's do today: `contrast` shows the two
ratios, and `a11y` shows the AA/AAA marks.

Context decides its size, as `data-media` decides an image's:

- inline in a sentence, it is a chip, the size of a line of text;
- alone in a block, or in a media zone, it fills the space it is given.

It may own imperative code (the contrast maths), because it is a primitive ({% ref "SPEC-161" /%}
D3).

**The value must parse as a CSS colour.** Both runes today write the author's string straight
into a `style` attribute. `color` accepts the CSS colour syntax only: hex, the colour functions
and named colours. Anything else is reported as `color-invalid` and emits no style. Contrast is
computed for every value the primitive can resolve to sRGB, not only for hex as today.

`label` is the colour's accessible name. Without one, the element is decorative.

**A list of values is a scale.** `value="#F59E0B, #D97706, #B45309"` renders one stop per value,
each with its own `data-on`, in the order given. This is how palette's scales are drawn (D5).
The comma separates colours: a comma inside a colour function (`rgb(1, 2, 3)`) is part of that
colour.

### D2 — media zones treat a bare `color` like a bare image

`card` unwraps a bare image in its media zone (`packages/runes/src/tags/card.ts`), and
{% ref "SPEC-160" /%} D2 gives `section` the same zone. The unwrap learns two more bare media
elements: `color`, and `{% icon %}`, which has the same need.

A colour card then needs nothing new:

```md
{% card media-position="top" %}
{% color value="#2563EB" /%}
---
## Ultramarine
Primary action colour. Use for one action per view.
{% /card %}
```

**Rejected:** a `color:` image scheme (`![Ultramarine](color:#2563EB)`), beside `placeholder:`
and `icon:`. It would work through today's image unwrap with no change. But a colour is not an
image, the scheme would duplicate D1, and its output would carry `<img>` semantics a screen
reader announces wrongly.

### D3 — a definition may declare `inline: true`

```yaml
---
tag: span
inline: true
attributes: …
---
```

When a definition declares it, the compiler:

- **unwraps the template's single paragraph**, so the template contributes inline content only;
- **rejects block content** in the template (a heading, a list, a second paragraph) with
  `composition-inline-block`, naming the line;
- **sets `schema.inline = true`**, so a misplaced use gets Markdoc's own
  `tag-placement-invalid`;
- **declares the rune's universal posture `inline`**, so block axes (density, spacing, frame)
  are not offered on it, as `badge` and `icon` declare today.

`metablock` stays rejected in an inline template: its existing check already says a meta block
is a block.

### D4 — swatch is a composition over badge and color

`badge` already takes free-form inline children (`packages/runes/src/tags/badge.ts`), so a
swatch is a badge whose content starts with a colour:

```md
---
tag: span
inline: true
attributes:
  color:     { type: string, required: true }
  label:     { type: string, required: true }
  showValue: { type: boolean, default: false }
content:
  type: sequence
  fields: []
---

{% badge %}{% color value=$attrs.color /%} {% $attrs.label %}{% if $attrs.showValue %} {% $attrs.color %}{% /if %}{% /badge %}
```

The shape is general, a visual followed by a label. The same template with `{% icon %}` or an
avatar is a tech chip or a mention. Those are definitions a site can write, not runes core
ships.

`swatch` keeps its attributes, so the four uses on the site keep working. Its `rf-swatch*`
classes go (`packages/lumina/styles/runes/swatch.css`, 24 lines), which is a migration note for
third-party themes.

### D5 — palette is a declarative composition: section, grid, item extraction and color

`design-context` reads palette's source rows directly (`extractPaletteTokens`). So
`Name: #hex, #hex` under `##` headings is a contract the composition keeps, and the composition
has to read those rows itself.

It can, without a primitive. A composition's content field already accepts `itemModel`,
`emitTag` and `emitAttributes`. This is the item extraction `cast` uses in TypeScript to read
`- Name - Role`. An `each` over the field binds the extracted parts as `$each.*`. The
definition:

```md
---
tag: section
attributes:
  showContrast: { type: boolean, default: false }
  showA11y:     { type: boolean, default: false }
content:
  type: sections
  sectionHeading: heading:2
  emitAttributes: { heading: $heading }
  sectionModel:
    type: sequence
    fields:
      colors:
        match: list
        itemModel:
          fields:
            - { name: name,  match: text, pattern: "^\\s*([^:]+?)\\s*:" }
            - { name: value, match: text, pattern: remainder }
        emitTag: span
        emitAttributes: { name: $name, value: $value }
---

{% section %}
{% slot name="sections" each %}
## {% $each.heading %}

{% grid mode="auto" min="8rem" cells="each" %}
{% slot name="colors" each %}
{% color value=$each.value label=$each.name contrast=$attrs.showContrast a11y=$attrs.showA11y /%}
{% /slot %}
{% /grid %}
{% /slot %}
{% /section %}
```

A probe measured each piece:

| Piece | Measured | Needed |
|---|---|---|
| Extracting name and value from `- Primary: #2563EB` | Works once the patterns are compiled: `$each.name = Primary`, `$each.value = #2563EB`. Today a YAML pattern is silently ignored and every field is empty ({% ref "BUG-038" /%}). | BUG-038's fix |
| An item `each` inside a `##` group `each` | Rejected at construction: *"slot `colors` is placed inside the `each` slot `sections`, which would place it once per item."* | D7 |
| Grid taking the cells an `each` produces | Every item lands in one cell, because grid splits only on `---`. Emitting a `---` per item gives one cell each, plus an empty trailing cell. | D8 |
| Scales (`Accent: #F59E0B, #D97706`) | `$each.value` is the whole string. | D1's list form |

So palette needs no primitive of its own. Its cells, scales and contrast come from `color`, its
layout from `grid`, and its anatomy from `section`. Only `ledger` keeps imperative code among
the row-shaped runes, because it does arithmetic ({% ref "SPEC-162" /%}), not because it reads
rows.

The `title` attribute stays as a fallback heading for pages that use it.

### D7 — an `each` may iterate a field of the item it is inside

{% ref "SPEC-145" /%} D26 binds `$each` to one item. The check that rejected the probe's nested
slot exists so that a slot is not placed once per item by accident. That reasoning holds for a
**top-level** field, but not for a field of the section's own `sectionModel`. Such a field has
a different value for each section, so iterating it inside the section's `each` places it
exactly once per value.

The amendment to D26:

- inside an `each` over `sections`, a slot may name a field of the `sectionModel`, and it
  resolves against the current section;
- `{% slot name="x" each %}` there binds an inner `$each`, which shadows the outer one;
- the outer `$each` is not reachable inside the inner one, so a template uses it before the
  inner `each` opens, as D5 does with the heading;
- one level only: an `each` inside a nested `each` is still rejected, naming both slots;
- a top-level field placed inside an `each` is still rejected, as today.

This also lifts the noise BUG-038 records. An `each` whose template reads only `$each.*` (the
`colors` slot in D5) may omit the bare `{% slot /%}`. Its items are emitted tags carrying only
the attributes `$each` already exposes, so there is no content to drop. This is the one
exception to D11's "every field placed": the field is placed through its attributes.

### D8 — grid takes the cells an `each` produces

`grid` splits its content into cells on `---` (`packages/runes/src/tags/grid.ts`). `cells="each"`
makes each top-level child a cell instead, which is what a composition's `each` produces. An
empty trailing zone is dropped in either mode, because it is never meant as a cell.

The same mode serves any composition that lays out a list as a grid: cast members, feature
cells, a team page.

### D9 — the migration is compared, not assumed

Swatch and palette are compared against today's output on:

- their rune fixtures;
- the 13 site pages that use `palette`;
- `design-context`'s token extraction.

The comparison checks that:

- every colour, name, scale stop, contrast figure and AA/AAA mark is identical;
- `design-context` extracts the same tokens.

Palette's AA/AAA marks test contrast against white only, which is today's behaviour, and the
comparison keeps it that way. Testing against both backgrounds is a separate, visible change.

**One visible change is expected.** Palette picks its column count from the number of colours
(`autoColumns`). `grid mode="auto"` fits columns to the width instead. The comparison records
the difference on every page that uses `palette`, and `palette` keeps its `columns` attribute
for an author who wants a fixed count.

Neither rune emits structured data, so the SEO baseline does not apply.

## Not in scope

- **`typography`, `spacing`, `preview`, `mockup`.** They are the rest of the design plugin. Each
  needs its own reading; nothing here assumes they compose.
- **Colour maths beyond contrast:** colour spaces, harmony, generated scales.
- **Tech chips and mentions.** D4 makes them a few lines of definition. Shipping them is a
  separate choice.

## Open questions

- **`typography` and `spacing`** read `Label: value` rows the same way (`parseFontEntry`,
  `parseNameValue`). D5's pattern (item extraction plus a visual primitive) may fit them too,
  if a font sample and a spacing bar can be primitives. Each needs its own reading.
- **`data-on` as a vocabulary attribute.** "Which text colour reads on this fill" is useful
  beyond `color`, for example on a cover image or a tinted section. Whether it becomes a general
  attribute is left open.

## Acceptance Criteria

- [ ] `{% color %}` exists as a core rune: `--color`, `data-on`, contrast data, a chip inline and a fill as a block
- [ ] A value that is not a CSS colour reports `color-invalid` and emits no style; contrast is computed for every value resolvable to sRGB
- [ ] `card`'s media zone, and `section`'s once SPEC-160 D2 lands, unwrap a bare `color` and a bare `{% icon %}` as they unwrap a bare image
- [ ] A definition may declare `inline: true`; the template's paragraph is unwrapped, block content is rejected with `composition-inline-block`, `schema.inline` is set, and the universal posture is `inline`
- [ ] A test pins that an inline composition inside a sentence renders with no nested `<p>`, and that block use reports `tag-placement-invalid`
- [ ] `swatch` is a composition over `badge` and `color` with its current attributes; the site's uses render without change in content
- [ ] `{% color %}` takes a comma-separated list as a scale, one stop per value, without splitting inside a colour function
- [ ] Inside an `each` over `sections`, a slot may iterate a `sectionModel` field (one level); deeper nesting and top-level fields inside an `each` are still rejected, naming the slots
- [ ] An `each` whose template reads only `$each.*` may omit the bare `{% slot /%}`
- [ ] `grid cells="each"` makes each top-level child a cell; an empty trailing zone is dropped in both modes
- [ ] `palette` is a composition over `section`, `grid` and `color` with no imperative code (BUG-038 fixed first); D9's comparison is recorded, including the column-count difference; `design-context` extracts identical tokens
- [ ] The theme migration note lists the removed `rf-swatch*` and `rf-palette*` classes

## References

- {% ref "SPEC-160" /%}: `section` and its media zone; D3, where card itself becomes a composition.
- {% ref "SPEC-161" /%} D3: a primitive may own imperative code, and a composition may not.
- {% ref "SPEC-162" /%}: `ledger`, the one row-shaped rune that keeps a primitive, for its arithmetic.
- {% ref "SPEC-145" /%}: compositions. D3 here extends its definition format, and D7 amends its D26.
- {% ref "BUG-038" /%}: YAML `itemModel` patterns are never compiled; palette depends on the fix.

{% /spec %}
