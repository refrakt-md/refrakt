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
3. `swatch` and `palette` rebuilt on both.

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

### D5 — palette is a section of colour cells, and its row parsing stays in a primitive

As a composition, `palette` gets:

- `section`'s anatomy: a heading in place of the `title` attribute, which stays as a fallback;
- its cells drawn by `color`, so a single colour is a cell and a scale is a row of cells;
- output in the shared vocabulary.

**What does not become declarative is reading the rows.** `design-context` reads palette's
source rows directly (`extractPaletteTokens`), so `Name: #hex, #hex` under `##` headings is a
contract a composition must keep. Turning those rows into cells is parsing, so it lives in a
primitive, as budget's does in {% ref "SPEC-162" /%}'s `ledger`.

Before a palette-only primitive is written, the open question below is answered first.

### D6 — the migration is compared, not assumed

Swatch and palette are compared against today's output on:

- their rune fixtures;
- the 13 site pages that use `palette`;
- `design-context`'s token extraction.

The comparison checks that:

- every colour, name, scale stop, contrast figure and AA/AAA mark is identical;
- `design-context` extracts the same tokens.

Palette's AA/AAA marks test contrast against white only, which is today's behaviour, and the
comparison keeps it that way. Testing against both backgrounds is a separate, visible change.

Neither rune emits structured data, so the SEO baseline does not apply.

## Not in scope

- **`typography`, `spacing`, `preview`, `mockup`.** They are the rest of the design plugin. Each
  needs its own reading; nothing here assumes they compose.
- **Colour maths beyond contrast:** colour spaces, harmony, generated scales.
- **Tech chips and mentions.** D4 makes them a few lines of definition. Shipping them is a
  separate choice.

## Open questions

- **One row primitive for ledger and palette.** Both read `Label: value` rows grouped by `##`
  headings, and only the value differs: an amount in `ledger`, colours in `palette`. A single
  primitive with a typed value (`amount`, `color`, and later `duration` or `number`) would serve
  both, and answer SPEC-162's open question on non-currency units. The alternative is two
  primitives that share a parsing helper. This should be settled before either is built.
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
- [ ] `palette` is a composition over `section` and `color`; D6's comparison is recorded; `design-context` extracts identical tokens
- [ ] The theme migration note lists the removed `rf-swatch*` and `rf-palette*` classes

## References

- {% ref "SPEC-160" /%}: `section` and its media zone; D3, where card itself becomes a composition.
- {% ref "SPEC-161" /%} D3: a primitive may own imperative code, and a composition may not.
- {% ref "SPEC-162" /%}: `ledger`, whose row parsing this spec's open question would share.
- {% ref "SPEC-145" /%}: compositions; D3 here extends its definition format.

{% /spec %}
