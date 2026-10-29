{% spec id="SPEC-165" status="accepted" tags="runes, composition, primitives, design, inline, core, typography, fonts" %}

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

`typography` and `spacing` read the same kind of rows and have the same problems: hand-built
output, author values written straight into `style`, and in typography's case a request to
Google Fonts that nobody opted into.

This spec adds:

1. a core `color` primitive, inline or block by context;
2. inline compositions, measured as nearly working;
3. `swatch` and `palette` rebuilt on them. Palette also needs one level of nested `each` (D6) and
   grid cells from an `each` (D7). Item extraction from YAML patterns ({% ref "BUG-038" /%}) was
   fixed in v0.42.0. With those, it needs no imperative code of its own;
4. a core `font` primitive, with `typography` as a composition over it, and font loading made
   explicit (D8, D9);
5. `spacing` over a design-plugin `sample` primitive, converted last because it needs an
   authoring change (D10).

**Accepted on 2026-10-29**, with revisions marked *Revised 2026-10-29*: palette places a
`section` per group, because of {% ref "ADR-046" /%}'s header grammar (D5); BUG-038 is fixed;
D2 defers to {% ref "SPEC-173" /%}'s shared media-item reader; D7 is input to the `grid` spec;
each composition declares its native chrome defaults; and two open questions are settled.

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

*Revised 2026-10-29.* {% ref "SPEC-173" /%} defines one shared media-item reader for every media
zone, and already lists a colour (citing this decision) and an icon among its item kinds. The
unwrap is built there, once, not as a patch to today's helpers.

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
{% section %}
## {% $each.heading %}

{% grid mode="auto" min="8rem" cells="each" %}
{% slot name="colors" each %}
{% color value=$each.value label=$each.name contrast=$attrs.showContrast a11y=$attrs.showA11y /%}
{% /slot %}
{% /grid %}
{% /section %}
{% /slot %}
{% /section %}
```

A probe measured each piece:

| Piece | Measured | Needed |
|---|---|---|
| Extracting name and value from `- Primary: #2563EB` | Works once the patterns are compiled: `$each.name = Primary`, `$each.value = #2563EB`. When measured, a YAML pattern was silently ignored and every field was empty ({% ref "BUG-038" /%}). | BUG-038's fix, shipped in v0.42.0 |
| An item `each` inside a `##` group `each` | Rejected at construction: *"slot `colors` is placed inside the `each` slot `sections`, which would place it once per item."* | D6 |
| Grid taking the cells an `each` produces | Every item lands in one cell, because grid splits only on `---`. Emitting a `---` per item gives one cell each, plus an empty trailing cell. | D7 |
| Scales (`Accent: #F59E0B, #D97706`) | `$each.value` is the whole string. | D1's list form |

So palette needs no primitive of its own. Its cells, scales and contrast come from `color`, its
layout from `grid`, and its anatomy from `section`. The same split holds for the
row-shaped runes that do arithmetic: {% ref "SPEC-162" /%} reads rows the same way and adds an
`amount` value primitive and a `tally` aggregation primitive, so `ledger` is a composition
too.

The `title` attribute stays as a fallback heading for pages that use it.

**Each group is its own `section`.** *Revised 2026-10-29.* The first draft wrote each group's
`## {% $each.heading %}` straight into the one outer `section`. Under {% ref "ADR-046" /%}'s
header grammar, shipped in v0.43.0, a section's first heading is its headline, so the first
group's name ("Brand") would have become the whole palette's title, and the other group headings
body. A nested `section` per group makes each group name that region's headline, which is also
what a group is: a titled region of colours. The palette's own `title` is the outer section's
headline.

`palette`'s native config declares `defaultElevation: 'flat'`, so the composition declares
`defaults: { elevation: flat }` ({% ref "SPEC-145" /%} D34). `typography` and `spacing` declare
their native defaults the same way.

### D6 — an `each` may iterate a field of the item it is inside

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
exception to SPEC-145 D11's "every field placed": the field is placed through its attributes.

### D7 — grid takes the cells an `each` produces

`grid` splits its content into cells on `---` (`packages/runes/src/tags/grid.ts`). `cells="each"`
makes each top-level child a cell instead, which is what a composition's `each` produces. An
empty trailing zone is dropped in either mode, because it is never meant as a cell.

*Revised 2026-10-29.* This is input to the `grid` arrangement spec that {% ref "SPEC-156" /%} D1
leaves open. {% ref "ADR-030" /%} names `grid` as a topology, and `palette`, `typography`,
`feature`, `bento` and `cast` all want a grid of items from an `each`. That spec decides whether
`{% group layout="grid" %}` is the same thing under another name; this decision stands either
way, because the `grid` rune is what authors already write.

The same mode serves any composition that lays out a list as a grid: cast members, feature
cells, a team page.

### D8 — typography is a composition over a `font` primitive

`typography` (`plugins/design/src/tags/typography.ts`, 274 lines, 4 site pages) reads a flat
list, `- heading: Inter (400, 700)`, with a role, a family and optional weights. For each row it
builds a specimen:

- a header with the role and family;
- the sample sentence at five fixed sizes (48, 32, 24, 18 and 14px);
- a weight row with names ("700 — Bold") when there is more than one weight;
- optionally, the character set.

It picks a fallback stack by role (`mono` gives `monospace`). It shortens the sample by
character count at large sizes (`sample.slice(0, 60 / (size / 14))`), and it writes the family
straight into `style`, as palette does with colours.

**A `font` primitive** is `color`'s counterpart. It is core, because showing text in a face is
not specific to design documentation:

- **Block:** `{% font family="Inter" weights="400, 700" /%}` is a specimen. The `sizes`
  (default: today's five), `weights` and `charset` attributes control its parts. A weights list
  renders one sample per weight, the same list rule as `color`'s scales (D1).
- **Inline:** `{% font family="Inter" weight="700" %}Set in Inter{% /font %}` shows its content
  in that face.
- It owns the fallback stack by role, the weight names (which become i18n keys), and value
  checking: a family must be a font family name, or the primitive reports `font-invalid` and
  emits no style.
- Over-long samples are cut by CSS, on one line with an ellipsis, at the real width instead of
  a guessed character count. This is a visible change, recorded by D11.

**The composition** needs less than palette. The list has no headings, so D6 is not involved,
only BUG-038's fix and D7:

```md
---
tag: section
attributes:
  sample:      { type: string, default: "The quick brown fox jumps over the lazy dog" }
  showSizes:   { type: boolean, default: true }
  showWeights: { type: boolean, default: true }
  showCharset: { type: boolean, default: false }
  source:      { type: string, matches: [google, none], default: google }
content:
  type: sequence
  fields:
    fonts:
      match: list
      itemModel:
        fields:
          - { name: role,    match: text, pattern: "^\\s*([^:]+?)\\s*:" }
          - { name: weights, match: text, pattern: "\\(([^)]+)\\)\\s*$", optional: true }
          - { name: family,  match: text, pattern: remainder }
      emitTag: span
      emitAttributes: { role: $role, family: $family, weights: $weights }
---

{% section %}
{% grid mode="auto" min="20rem" cells="each" %}
{% slot name="fonts" each %}
{% section %}
{% $each.role %}

### {% $each.family %}

{% font family=$each.family weights=$each.weights role=$each.role source=$attrs.source sample=$attrs.sample sizes=$attrs.showSizes showWeights=$attrs.showWeights charset=$attrs.showCharset /%}
{% /section %}
{% /slot %}
{% /grid %}
{% /section %}
```

The header is plain template: the role is an eyebrow and the family a title.

### D9 — font loading is declared, not a side effect

Today typography emits `<link>` tags to `fonts.googleapis.com` for every family, always. Three
problems follow:

- every page with a specimen makes an outside request with no opt-in;
- a self-hosted or commercial family silently renders in its fallback, because Google is
  asked for a font it does not have;
- the only font loading refrakt has is buried in a documentation rune.

`font` takes `source`:

- `google` loads the family from Google Fonts, as today;
- `none` (the primitive's default) assumes the site already loads the face.

The `typography` composition passes `source="google"` by default, so its 4 pages do not change.
The request is now declared on the page and can be turned off.

A site-level setting for loading fonts, which a theme and `font` would both read, is the proper
home. It is a separate spec.

### D10 — spacing composes last, behind an authoring change

`spacing` (247 lines, 3 site pages) has three sections, chosen by keywords in their heading
text (`includes('spacing')`, `'radius'` or `'radii'`, `'shadow'`). Each draws differently:

- **Spacing** is two keyed settings, not rows: `- unit: 4px` and `- scale: 4, 8, 12, 16`. It
  draws bars sized relative to the largest value, and multipliers ("3×") from the unit.
- **Radius** is `name: value` rows, each drawn as a box with that `border-radius`.
- **Shadows** is `name: value` rows, each drawn as a box with that `box-shadow`.

Radius and shadow values go straight into `style`.

**What fits.** Radius and shadow rows have palette's shape: an `each` over items, one sample
per row. The scale is one row holding a list, so a primitive given the whole list can size its
bars against that list's own maximum. The cross-value arithmetic stays inside one primitive
call.

**What it costs:**

- **`unit` becomes an attribute**, `{% spacing unit="4px" %}`. A template reads one item at a
  time, so it cannot pair the `unit` row with the `scale` row. This changes the authoring
  contract on 3 pages. `design-context`'s extractor keeps reading the `- unit:` row for one
  release and reports a deprecation.
- **Sections are matched by name, not keyword.** `knownSections`, which also gives each section
  its own content model, matches canonical names and aliases exactly. The aliases list what the
  site uses ("Spacing scale", "Border radius", "Radii", "Box shadows"), and D11 checks every
  page.
- **One template draws three things.** It branches on the matched section,
  `{% if equals($each.kind, "radius") %}`, with `kind` bound to `$canonicalName` through
  `emitAttributes`. The resolver produces `$canonicalName`. That it reaches `$each` is
  expected, but it has not been probed.
- **A `sample` primitive** draws one design value as a picture, checking it against the CSS
  syntax for its kind:
  - `{% sample radius="8px" /%}`;
  - `{% sample shadow="0 1px 2px rgb(0 0 0 / 0.1)" /%}`;
  - `{% sample length="4, 8, 12, 16" unit="4px" /%}`.

  It stays in the design plugin, because it has no use outside design documentation yet.

That is an authoring change, a branching template and a primitive, to replace a rune used on 3
pages. **Spacing is converted last**, after palette and typography have proved D5–D8, and it is
the one rune here that may reasonably stay native.

### D11 — the migration is compared, not assumed

Each rune is compared against today's output on:

- its rune fixtures;
- the site pages that use it: 13 for `palette`, 4 for `typography`, 3 for `spacing`, and 4
  uses of `swatch`;
- `design-context`'s token extraction, on its 3 pages.

The comparison checks that:

- every colour, name, scale stop, contrast figure and AA/AAA mark is identical;
- every family, weight, size and character set is identical;
- every spacing value, multiplier, radius and shadow is identical;
- `design-context` extracts the same tokens.

Palette's AA/AAA marks test contrast against white only, which is today's behaviour, and the
comparison keeps it that way. Testing against both backgrounds is a separate, visible change.

**Expected visible changes**, each recorded on every page it touches:

- palette picks its column count from the number of colours (`autoColumns`), while
  `grid mode="auto"` fits columns to the width. `palette` keeps its `columns` attribute for an
  author who wants a fixed count;
- typography's samples are cut at the real width by CSS (D8), not at a guessed character count;
- spacing's bars may differ in width where the scale's maximum changes.

None of these runes emits structured data, so the SEO baseline does not apply.

## Not in scope

- **`preview`, `mockup`, `design-context`.** They are the rest of the design plugin. Each needs
  its own reading; nothing here assumes they compose.
- **A site-level font-loading setting** (D9).
- **Colour maths beyond contrast:** colour spaces, harmony, generated scales.
- **Tech chips and mentions.** D4 makes them a few lines of definition. Shipping them is a
  separate choice.

## Settled questions

- **`design-context` reads output, not source.** *Settled 2026-10-29.* It got its tokens by
  parsing each rune's source with plugin code (`extractPaletteTokens`, `extractTypographyTokens`,
  `extractSpacingTokens`), so a site that redefines `palette` with a different syntax would break
  extraction without a warning. {% ref "SPEC-166" /%} D2 says a container reads raw values from
  rendered elements, so `design-context` reads `color`'s value, `font`'s family and `sample`'s
  value from the rendered primitives. The source extractors stay for one release, with a
  deprecation report.
- **`color` and `typeface` are `metaType` values.** *Settled 2026-10-29, handed over from
  SPEC-166.* SPEC-166 D1.8 makes a field and a primitive of the same kind emit the same element,
  which only works through a `metaType`: a composed rune whose `hex` field is a colour renders a
  chip only if the field can say so. Both are added to the vocabulary. Each has a natural default
  in skeleton (a chip; text set in the face), so a theme that does nothing renders them sensibly,
  and {% ref "ADR-043" /%}'s coverage check reports them. A single `swatch` type was rejected,
  because it loses which kind a value is.

## Open questions

- **Whether `sample` and `color` are one primitive.** Both draw a design value. They are kept
  apart because `color` means something outside design documentation and `sample` does not
  yet.
- **`data-on` as a vocabulary attribute.** "Which text colour reads on this fill" is useful
  beyond `color`, for example on a cover image or a tinted section. Whether it becomes a general
  attribute is left open.

## Acceptance Criteria

- [ ] `{% color %}` exists as a core rune: `--color`, `data-on`, contrast data, a chip inline and a fill as a block
- [ ] A value that is not a CSS colour reports `color-invalid` and emits no style; contrast is computed for every value resolvable to sRGB
- [ ] `card`'s and `section`'s media zones unwrap a bare `color` and a bare `{% icon %}` through SPEC-173's shared media-item reader
- [ ] A definition may declare `inline: true`; the template's paragraph is unwrapped, block content is rejected with `composition-inline-block`, `schema.inline` is set, and the universal posture is `inline`
- [ ] A test pins that an inline composition inside a sentence renders with no nested `<p>`, and that block use reports `tag-placement-invalid`
- [ ] `swatch` is a composition over `badge` and `color` with its current attributes; the site's uses render without change in content
- [ ] `{% color %}` takes a comma-separated list as a scale, one stop per value, without splitting inside a colour function
- [ ] Inside an `each` over `sections`, a slot may iterate a `sectionModel` field (one level); deeper nesting and top-level fields inside an `each` are still rejected, naming the slots
- [ ] An `each` whose template reads only `$each.*` may omit the bare `{% slot /%}`
- [ ] `grid cells="each"` makes each top-level child a cell; an empty trailing zone is dropped in both modes
- [ ] `palette` is a composition over `section`, `grid` and `color` with no imperative code, placing a nested `section` per group so each group name is that region's headline; it declares `defaults: { elevation: flat }`; D11's comparison is recorded, including the column-count difference; `design-context` extracts identical tokens
- [ ] `design-context` reads tokens from rendered `color`, `font` and `sample` elements; its source extractors remain for one release with a deprecation report
- [ ] `color` and `typeface` are added to the single-source `metaType` vocabulary ({% ref "SPEC-166" /%} Prerequisites), with default skeleton rules
- [ ] `{% font %}` exists as a core rune: a specimen as a block, text in the face inline; a weights list renders one sample per weight; an invalid family reports `font-invalid` and emits no style
- [ ] `font` loads from Google only with `source="google"`; its default is `none`
- [ ] `typography` is a composition over `section`, `grid` and `font`, passing `source="google"` by default; D11's comparison is recorded; `design-context` extracts identical font tokens
- [ ] `spacing` takes `unit` as an attribute; `design-context` reads the `- unit:` row for one release with a deprecation report
- [ ] A `sample` primitive in the design plugin draws a radius, a shadow or a length scale, validating each value against its CSS syntax
- [ ] `spacing` is a composition over `section`, `knownSections` and `sample`, converted after palette and typography; D11's comparison is recorded on its 3 pages
- [ ] The theme migration note lists the removed `rf-swatch*`, `rf-palette*`, `rf-typography*` and `rf-spacing*` classes

## References

- {% ref "SPEC-160" /%}: `section` and its media zone; D3, where card itself becomes a composition.
- {% ref "SPEC-161" /%} D3: a primitive may own imperative code, and a composition may not.
- {% ref "SPEC-162" /%}: `amount` and `tally`, the same split for money: a value primitive, an aggregation primitive, and `ledger` as a composition.
- {% ref "SPEC-145" /%}: compositions. D3 here extends its definition format, and D6 amends its D26.
- {% ref "BUG-038" /%}: YAML `itemModel` patterns were never compiled; fixed in v0.42.0.
- {% ref "SPEC-166" /%}: the value-primitive contract `color` and `font` meet, and D2's raw values.
- {% ref "SPEC-173" /%}: the shared media-item reader D2 is built in.
- {% ref "ADR-046" /%}: the header grammar that sets palette's section per group.

{% /spec %}
