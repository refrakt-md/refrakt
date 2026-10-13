{% spec id="SPEC-167" status="draft" tags="runes, primitives, composition, marketing, tables, accessibility, i18n" %}

# Crosstab aligns definition lists, and comparison becomes a composition

## Summary

{% ref "SPEC-151" /%} D1 kept the marketing plugin alive on `comparison` alone, because its
cross-column alignment is a computation over the whole child set that no declarative content
model can express. That is still true. What has changed since is the route around it:
{% ref "ADR-044" /%} tier 2 and {% ref "SPEC-162" /%} established that a **primitive may own
imperative code and the domain rune composes over it**.

`comparison`'s one computation is lining up several labelled lists by their labels. That is a
generic operation: a pivot of definition lists into a table of entities by attributes. This
spec makes it a core primitive, `{% crosstab %}`, and makes `comparison` a composition with two
templates ({% ref "SPEC-145" /%} D15), `table` over `crosstab` and `cards` over `grid` and
`card`. It adds a universal `featured` intent for "the one option singled out", decides the
inclusion value {% ref "SPEC-166" /%} D5 left open, and records the visible changes.

## What `comparison` does today, measured

From `plugins/marketing/src/tags/comparison.ts` and `plugins/marketing/src/config.ts`:

- **Input.** Each `##` heading is a column. In each column, a list item whose text starts with
  a bold label is a row (`- **Learning curve** — Low`), and the label aligns it with the same
  label in other columns. `[x]` and `[ ]` at the start of an item mark it supported or not
  supported, `~~strikethrough~~` marks it negative, a blockquote is a callout, and an item with
  no bold label is a secondary row.
- **Alignment.** `convertComparisonChildren` collects every label across all columns in
  first-seen order, then emits each column's rows in that order, with an empty placeholder
  where a column lacks a label.
- **Two layouts**, chosen by `layout`. `buildComparisonTable` builds a `<table>`, and
  `buildComparisonCards` builds one card per column.
- **The table drops content.** `buildComparisonTable` iterates the master label list only, so
  secondary rows and callouts never appear in the table layout. Only the cards show them.
- **"Recommended" is hard-coded English**, in both builders, so it cannot be translated.
- **Classes are hard-coded** `rf-comparison*`; the source says the rune was never
  theme-prefix aware.
- **The ✓ and ✗ marks** are `<span aria-label="Supported">` and `aria-label="Not supported"`
  with no role. ARIA 1.2 does not allow naming a generic element, so screen readers often
  ignore the label.
- **`collapse` is declared and read nowhere.** The schema describes it as "rows collapse into
  an accordion on small screens"; neither the transform nor the `Comparison` engine config
  reads it.
- **`highlighted`** names a column by its heading, and the builders add `--highlighted`
  classes to that column's header and cells.
- **Usage:** three instances, all on the rune's own documentation page
  (`site/content/runes/marketing/comparison.md`). Lumina's `comparison.css` is 210 lines.

The same "singled out" idea exists a second time in `pricing`: `tier featured` renames the rune
to `featured-tier` (`plugins/marketing/src/tags/pricing.ts`), which gets a static `--featured`
modifier, and `pricing.css` draws it with a primary border, a large shadow and a filled button.

## Why SPEC-151's verdict changes

SPEC-151 D4 rejected generalising `comparison`'s *content model*, because that would mean
inventing an expression language for one consumer ({% ref "ADR-036" /%}). This spec does not do
that. `crosstab` is a primitive with code, and its content model is simple: a heading and some
content, per column. The computation lives in its transform, as `tally`'s does. ADR-036's
objection is about content-model vocabulary and does not apply.

## Decisions

### D1 — `{% crosstab %}` is a core primitive that aligns definition lists into a table

```md
{% crosstab featured="Astro" %}
### SvelteKit
- **Learning curve** — Low
- **SSR** — Built-in

### Astro
- **Learning curve** — Low
- **Islands** — Yes
{% /crosstab %}
```

**Input.** A column is one of two shapes, and both may be mixed:

- **A heading**, of any level, and everything up to the next heading. This is plain Markdown,
  for direct use. It follows ordinary section semantics: a paragraph before a heading belongs
  to the column above it. So a heading column has no eyebrow, and `featured` names it by its
  heading text.
- **A placed `section` or `card`.** Its rendered header supplies the column name (the
  headline) and the eyebrow, and its `featured` intent (D2) marks it. The boundary is the rune,
  so nothing is ambiguous.

A paragraph immediately before a heading could otherwise be either the end of one column or the
eyebrow of the next. The two shapes keep that question from arising: an eyebrow exists only
where a rune gives the column a start, as `card` already does ("a leading paragraph immediately
followed by a heading", `packages/runes/src/tags/card.ts`).

```md
{% crosstab %}
{% section %}
### SvelteKit
- **Learning curve** — Low
- **SSR** — Built-in
{% /section %}

{% section featured=true %}
Our pick

### Astro
- **Learning curve** — Low
- **Islands** — Yes
{% /section %}
{% /crosstab %}
```

**How it works.** In its transform, `crosstab` wraps each bare list in a `deflist` node, renders
its children, and reads the rendered `dt`/`dd` pairs. It never parses term syntax itself: that
stays in `deflist`, which gains the bold-lead term shape with a dash separator in
{% ref "SPEC-161" /%} D3. Everything happens at stage 2, inside this one rune, on its own
children, so it is not a pipeline post-process.

Because it reads rendered rows, **anything that renders definition-list rows can be a column**:
an explicit `{% deflist %}`, a `deflist` of `{% field %}` rows (SPEC-145 D28), or an engine
metadata block, which renders the same markup. A composition can compare entities by their
metadata without re-wrapping it.

**Output**, for the second example:

```html
<div data-rune="crosstab">
  <table>
    <colgroup><col><col><col data-featured></colgroup>
    <thead>
      <tr>
        <td></td>
        <th scope="col">SvelteKit</th>
        <th scope="col" data-featured><span data-name="eyebrow">Our pick</span> Astro</th>
      </tr>
    </thead>
    <tbody>
      <tr><th scope="row">Learning curve</th><td>Low</td><td data-featured>Low</td></tr>
      <tr><th scope="row">SSR</th><td>Built-in</td><td data-featured data-empty></td></tr>
      <tr><th scope="row">Islands</th><td data-empty></td><td data-featured>Yes</td></tr>
    </tbody>
  </table>
</div>
```

1. **Rows** are the union of terms across columns, in first-seen order. A column without a term
   gets an empty cell marked `data-empty`, with a visually hidden "Not listed" from
   `core.crosstab.empty` (SPEC-145 D29).
2. **Column state is carried to every cell of the column.** A column's `data-featured` (from a
   placed section or card carrying the D2 intent, or, for a heading column, the `featured`
   attribute naming its heading) and its `data-sentiment` ({% ref "SPEC-163" /%}) are stamped on its header cell,
   each of its cells and its `<col>`. A row's state is stamped on its row. A theme styles
   `[data-featured]` on cells without knowing `crosstab` exists.
3. **The eyebrow goes in the header cell**, so a screen reader hears "Our pick, Astro", and the
   emphasis is not only visual. `crosstab` renders no label of its own: the label is content.
4. **Content that is not a row** (a paragraph after the list, a blockquote, an actions link)
   goes into a `<tfoot>` row, under its column. Nothing an author wrote is dropped, which fixes
   the table's loss of callouts and secondary rows.
5. **`labels="hidden"`** omits the row-header column visually; the `th scope="row"` cells stay
   in the markup, visually hidden, so rows keep their names.
6. The table sits in a horizontally scrolling wrapper, as today's does.

**The name.** `crosstab` is the established reporting and BI term for a text table with
dimensions on both axes, which is what this builds. `matrix` was the first draft's name and was
dropped because other runes have stronger claims to it:

- **a 2×2 quadrant** (priority, effort and impact, likelihood and impact, which is a risk
  matrix): the most common meaning of "matrix" in business and planning content, and a
  plausible plugin rune with a different shape (two axes, items placed into cells);
- **a mathematical matrix**, which is what LaTeX calls a bracketed grid of numbers.

A RACI grid is the one "matrix" with this shape, and would be a composition over `crosstab`.
Names near "compare" were avoided too: core already has `compare` (code comparison) and
marketing has `comparison`. `pivot` was rejected because it implies aggregation.

**Placement in core.** The input is core vocabulary (`deflist`, headings), and there is a
second consumer beside `comparison`: a "compare plans" table for `pricing`, where a tier's
feature list already has this shape. If a reviewer holds the stricter bar of two plugins,
`crosstab` ships in the marketing plugin first; nothing else here changes.

### D2 — `featured` is a universal intent

**Contract:** *this item is the one singled out among its siblings.* It is statable without
naming a rune, which is {% ref "SPEC-159" /%}'s first gate.

It is not an existing axis:

- `elevation` is depth. A theme may *draw* featured with elevation, but that is its reading of
  an intent (SPEC-159 D5), not the meaning.
- `prominence` is a header's type register.
- `sentiment` (SPEC-163) is good or bad.

`featured` is a boolean available on `section` and so on `card`, emitting `data-featured` on
the chrome carrier. `crosstab` carries it into table cells (D1.2). It replaces:

- `tier`'s `featured-tier` rune name and its `--featured` static modifier, amending
  {% ref "SPEC-161" /%} D4, which left the choice between elevation and a `prominence` value
  open. `pricingSchema` lists `featured-tier` only because of the rename, and drops it.
- `comparison`'s `--highlighted` classes.

### D3 — the label is the eyebrow, written as content

"Recommended" is content, not chrome: it needs translating, and authors want "Most popular" or
"Our pick". It is the eyebrow of the featured column or card. There is **no `eyebrow`
attribute** on `section` or `card`: one slot with two sources is ambiguous, and the eyebrow
stays the paragraph before the heading.

A template that adds the label to one item only does so with a conditional, which
SPEC-145 D30 resolves during expansion, so the rune around it sees a paragraph and not an
`if` tag. D5 shows it.

### D4 — the inclusion value

This decides SPEC-166 D5's second candidate.

- **Values:** `included`, `excluded`, `partial`.
- **Authoring:** a task-list marker at the start of a definition, `[x]`, `[ ]` or `[~]`,
  read by the inclusion kind's reader (SPEC-166 D2), which `deflist` calls on each
  definition. `[x]` and `[ ]` are what `comparison` reads today; `[~]` is new.
- **Element:** per SPEC-166 D1, `<span data-meta-type="inclusion" data-value="included"
  data-meta-sentiment="positive">`, with `excluded` → `negative` and `partial` → `caution`. It
  carries visually hidden text from `core.inclusion.<value>` ("Included", "Not included",
  "Partly"), and its mark is a glyph ({% ref "SPEC-164" /%}) named `included`, `excluded` or
  `partial`, so the theme draws it. Any text after the marker stays in the definition.
- **Strikethrough loses its special meaning.** `~~text~~` renders as Markdown's `<s>`, as
  everywhere else. "Not supported" is the inclusion value's job. This is a visible change,
  recorded in D6.
- `inclusion` is added to the `metaType` vocabulary, subject to ADR-043's coverage check.

### D5 — `comparison` is a composition with two templates

It stays in the marketing plugin, and authors' content does not change.

```md
---
tag: section
description: Options compared side by side, as a table or as cards.
attributes:
  title:       { type: string }
  highlighted: { type: string, description: "Heading of the option to feature." }
  layout:      { type: string, matches: [table, cards], default: table }
  labels:      { type: string, matches: [left, hidden], default: left }
  verdict:     { type: string }
content:
  type: sections
  sectionHeading: heading
  emitAttributes: { heading: $heading }
  preamble:
    intro: { match: any, optional: true, greedy: true }
templates: { by: layout }
---

{% fragment name="opening" %}
	{% if $attrs.title %}
		## {% $attrs.title %}
	{% /if %}

	{% slot name="intro" /%}
{% /fragment %}

{% fragment name="item-heading" %}
	{% if equals($each.heading, $attrs.highlighted) %}
		{% t key="recommended" %}Recommended{% /t %}
	{% /if %}

	### {% $each.heading %}
{% /fragment %}

{% fragment name="closing" %}
	{% if $attrs.verdict %}
		{% $attrs.verdict %}
	{% /if %}
{% /fragment %}

{% template layout="table" %}
	{% partial file="#opening" /%}

	{% crosstab labels=$attrs.labels %}
		{% slot name="sections" each %}
			{% section featured=equals($each.heading, $attrs.highlighted) %}
				{% partial file="#item-heading" /%}

				{% slot /%}
			{% /section %}
		{% /slot %}
	{% /crosstab %}

	{% partial file="#closing" /%}
{% /template %}

{% template layout="cards" %}
	{% partial file="#opening" /%}

	{% grid cells="each" %}
		{% slot name="sections" each %}
			{% card featured=equals($each.heading, $attrs.highlighted) %}
				{% partial file="#item-heading" /%}

				{% deflist %}
					{% slot /%}
				{% /deflist %}
			{% /card %}
		{% /slot %}
	{% /grid %}

	{% partial file="#closing" /%}
{% /template %}
```

- **Two templates, not a runtime switch.** D15 gives each layout its own assembly, its own
  contract expansion and its own fixture. Each template places every field once.
- **What the two share is written once**, as fragments ({% ref "SPEC-168" /%} D8): the title
  and intro, each item's eyebrow and heading, and the verdict. The `item-heading` fragment is
  used inside an `each`, so `$each` is bound where it lands.
- **The two templates differ in two words.** Each item is a `section` in a `crosstab` or a
  `card` in a `grid`, with the same featured flag, eyebrow and heading. Only `crosstab` reads
  the sections as columns.
- **The label is resolved at expansion** (SPEC-145 D30). The featured item's content starts
  with a paragraph and then a heading, so `section` and `card` both read it as the eyebrow, and
  `crosstab` takes it from the section's header. The key is `marketing.comparison.recommended`.
- **The cards template places `deflist` explicitly**, because `card` does not know terms. The
  table template does not, because `crosstab` wraps bare lists itself.
- **`collapse` is removed.** It was never read. A narrow screen gets the scrolling table, as
  today; an author who wants cards on every screen chooses `layout="cards"`.
- **`comparison-row` and `comparison-column`** are removed with the native transform.

### D6 — the migration is compared, and the visible changes are recorded

As {% ref "SPEC-165" /%} D11 does for the design runes, the three instances on the
documentation page are rendered before and after, and the differences are recorded:

| Change | Why |
|---|---|
| `rf-comparison*` classes replaced by `crosstab`, `grid`, `card` and `deflist` vocabulary | the composition emits shared vocabulary; Lumina's `comparison.css` is drained (ADR-044) |
| "Recommended" is translatable and replaceable | D3 |
| Secondary rows and callouts appear in the table, in `<tfoot>` | D1.4 |
| ✓ and ✗ become inclusion values with real text alternatives | D4 |
| `~~text~~` renders as plain strikethrough, without negative styling | D4 |
| The featured column is drawn by the theme's `[data-featured]` rule | D2 |

Third-party themes that style `rf-comparison__*` lose those selectors. This is the same
accepted cost as `card` moving onto `section` ({% ref "ADR-041" /%}).

### D7 — SPEC-151 D1 and D4 are amended

- **D1** ("marketing stays a plugin, on `comparison` alone") no longer holds as stated.
  `comparison` becomes a composition. Whether the marketing plugin remains, as a home for its
  compositions, is a packaging question that this spec does not decide.
- **D4** stands as written: no content-model vocabulary is invented. Its conclusion that
  `comparison` must stay native is replaced, because the primitive-plus-composition route did
  not exist when it was written.

## Dependencies

- {% ref "SPEC-145" /%} D15 (several templates per rune), which is specified but not yet built:
  `composition.ts` has no `templates` handling.
- SPEC-145 D29 (`t`) and D30 (conditionals resolved at expansion).
- {% ref "SPEC-161" /%} D3: `deflist` reads a bold lead with a dash separator as the term.
- {% ref "SPEC-165" /%} D7: `grid cells="each"`.
- {% ref "SPEC-160" /%}: `card` as a section with a surface, and its eyebrow.
- {% ref "SPEC-166" /%}: the value contract the inclusion value meets.

## Open questions

- **An `each` slot expands before the placed rune's content model runs**, so `crosstab` sees the
  repeated sections. `expand` runs over the whole template before any placed rune transforms
  (`composition.ts:886`), and `card` already sees a `---` written around slots in
  `character`'s template, so it should hold; the first implementation step is a probe, not an
  assumption.
- **`equals($each.heading, $attrs.highlighted)` in an attribute position.** `substitute`
  replaces variables inside function parameters (`composition.ts:771`), so this should
  evaluate at transform. The probe covers it.
- **Partial marker syntax.** `[~]` is proposed. Markdown has no standard for it.
- **A standalone inclusion rune** for prose ("Offline mode {% … %}") is not proposed until a
  case appears.

## Acceptance Criteria

- [ ] `{% crosstab %}` exists: a column is a heading or a placed `section`/`card`, bare lists are wrapped in `deflist`, rows are the union of terms in first-seen order, and missing cells are `data-empty` with a visually hidden "Not listed"
- [ ] A paragraph before a heading in a heading column belongs to the column above it; only a placed `section` or `card` supplies an eyebrow
- [ ] `crosstab` reads only rendered `dt`/`dd` rows; a column built from `{% field %}` rows or an engine metadata block aligns the same as one built from a list
- [ ] A featured column's state is stamped on its header cell, its cells and its `<col>`; a column's eyebrow renders inside its header cell
- [ ] Content in a column that is not a row renders in `<tfoot>` under that column; nothing authored is dropped
- [ ] `labels="hidden"` hides row headers visually and keeps them in the accessibility tree
- [ ] `featured` is a universal intent on `section` and `card` emitting `data-featured`; `tier` uses it, and `featured-tier` is removed from the rune names and `pricingSchema`
- [ ] The inclusion value reads `[x]`, `[ ]` and `[~]`, meets every point of SPEC-166 D1, and is in the `metaType` vocabulary
- [ ] `comparison` is a composition in the marketing plugin with `table` and `cards` templates; the three instances on its documentation page render with the differences in D6 and no others
- [ ] "Recommended" is the eyebrow of the featured item, keyed `marketing.comparison.recommended`, and an author can replace it
- [ ] `comparison`'s native transform, `comparison-row`, `comparison-column` and the `collapse` attribute are removed, and Lumina's `comparison.css` is deleted
- [ ] SPEC-151 D1 and D4 carry a note pointing here

## References

- {% ref "SPEC-151" /%}: D1 and D4, amended by D7.
- {% ref "SPEC-145" /%}: D15 templates, D28 field rows, D29 `t`, D30 conditionals at expansion.
- {% ref "SPEC-161" /%}: D3 `deflist` term shapes; D4 `tier`, amended by D2.
- {% ref "SPEC-162" /%}: `tally`, the precedent for a container that reads rendered children.
- {% ref "SPEC-163" /%}: `sentiment`, carried to cells like `featured`.
- {% ref "SPEC-164" /%}: glyphs for the inclusion marks.
- {% ref "SPEC-166" /%}: the value contract; D5's inclusion candidate, decided by D4.
- {% ref "SPEC-159" /%}: the gates an intent passes, and chrome as intent.
- {% ref "ADR-036" /%}: why no content-model vocabulary is invented.
- {% ref "ADR-044" /%}: tier 2, and draining per-rune theme CSS.

{% /spec %}
