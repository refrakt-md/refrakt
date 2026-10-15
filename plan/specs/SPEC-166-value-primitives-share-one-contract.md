{% spec id="SPEC-166" status="draft" tags="runes, primitives, composition, vocabulary, theme, accessibility, i18n" %}

# Value primitives share one contract

## Summary

A recurring shape has emerged across this round of specs. A primitive reads **one value** from
text and emits **one element**, and a container or a layout does the rest:

- `color` reads a colour, and `grid` lays the cells out ({% ref "SPEC-165" /%} D1);
- `font` reads a family and weights ({% ref "SPEC-165" /%} D8);
- `amount` reads money, and `tally` sums it ({% ref "SPEC-162" /%} D1–D2).

Each was designed on its own, and each would drift on its own: one emits `data-value`, another
`value`; one formats by locale, another does not; one has a text alternative, another a bare
glyph. {% ref "SPEC-145" /%} D28 already defined what a *field's* value element looks like to a
theme. This spec makes that the contract for every value primitive, so each new one is a small
instance of a known shape. It adds the one primitive the rune inventory shows is missing,
`date`, and records two more candidates.

## What the inventory found

A pass over every core and plugin rune (61 core, plus all nine plugins) against the composition
plans found three value kinds that runes read by hand, each with its own parsing:

| Kind | Read today by | How |
|---|---|---|
| A date or time | `timeline` (`date` item field, `plugins/business/src/tags/timeline.ts`), `itinerary` (`time`, `plugins/places/src/tags/itinerary.ts`), `changelog` (`VERSION_DATE_PATTERN`), plan history and activity | per-rune patterns, no shared formatting |
| A place | `map` (coordinates and address, `plugins/places/src/tags/map.ts`), `itinerary` (`location`), `event`, `organization` | per-rune parsing |
| Included, not included, partial | `comparison` (task-list markers, drawn as ✓/✗, `plugins/marketing/src/tags/comparison.ts`) | a glyph whose `aria-label` sits on a span with no role, so it is not reliably announced |

The forms on the site include partial and written dates: `## 2023 - Founded`, `## v1.2.0 -
January 2025`, and times such as `### 9:00 AM — Narita Airport`.

`timeline` and `itinerary` already read their items with `itemModel`, so once {% ref "BUG-038" /%}
is fixed they are close to compositions. What they lack is a primitive that turns the extracted
text into a value.

## Decisions

### D1 — the contract

A **value primitive** reads one value from text or an attribute and emits a **value element**.
Every value primitive meets all of the following.

1. **One element per value.** The element fits the kind: `<time datetime>` for a time,
   `<data value>` for a number, `<address>` for a place, `<span>` otherwise. A list of values
   (a colour scale, a font's weights, `splitOn` parts) is one element per value, as siblings.
2. **`data-meta-type` names the kind**, from the closed `metaType` vocabulary: `temporal` for a
   date, `quantity` for an amount, and so on. A kind with no fitting value adds one, as a
   vocabulary change governed by {% ref "ADR-036" /%}. The additions this spec expects are
   listed in D3.
3. **The raw value is always present, as data.** It goes in `datetime` on `<time>`, `value` on
   `<data>`, or `data-value` otherwise, beside the displayed text. A theme or a container never
   has to parse displayed text. This is D28's decision 9, generalised.
4. **The displayed text is formatted and translated.** Formatting follows the locale and
   {% ref "ADR-043" /%}'s theme-wide `formats`, with the site able to override. Words in the
   display come through translation keys under `core.<primitive>.*` (SPEC-145 D29).
5. **A non-text display has a text alternative.** A colour chip, marks, or a check glyph
   carries an accessible name (visually hidden text, or `role="img"` with `aria-label`). A
   purely decorative part is `aria-hidden`.
6. **Invalid input is reported, never guessed, and never trusted.** Text the primitive cannot
   read reports `<primitive>-invalid`, naming the text, and is rendered as written with no raw
   value. An author's value never reaches a `style` attribute without passing the kind's
   syntax check (SPEC-165 found both design runes doing exactly that).
7. **Context decides size, not the primitive.** The same element is a chip inline and a fill
   in a block or media zone, as `color` is. A primitive declares no layout.
8. **It is the same element a placed field emits.** A `{% field %}` whose `metaType` matches a
   kind renders through that kind's renderer, so a field value and a primitive value are
   interchangeable to a theme and to a container. Rendering happens at different times for a
   good reason: a primitive reads fixed content at stage 2, and a field is filled at stage 4
   because its value can be written late (D28, "the bag is the record").

### D2 — value kinds are implemented once and shared

Each kind is one module with three parts: a **reader** (text to raw value), a **formatter**
(raw value and locale to display), and an **element builder**. The kinds are used by:

- the value primitive's transform, at stage 2;
- the engine's field rendering, at stage 4, which today has its own `transform: 'duration'`
  path (`formatDurationLocale`);
- containers, which read the raw value back from the element and never parse display text.

So `tally` reads amounts through the amount kind's raw value, a future `map` reads places
through the place kind's coordinates, and `design-context` can read colours and fonts from
rendered elements instead of from each rune's source syntax. That last point answers the open
question in SPEC-165 that `design-context` breaks when a site redefines `palette`.

### D3 — the members

| Primitive | Kind | `data-meta-type` | Element | Status |
|---|---|---|---|---|
| `color` | colour | `color` (new) | `<span>` with `--color`, `data-value`, `data-on` | proposed, SPEC-165 D1 |
| `font` | typeface | `typeface` (new) | `<span>` with `data-value` (the family) | proposed, SPEC-165 D8 |
| `amount` | money, number | `quantity` | `<data value>` with `data-currency`, or `data-low`/`data-high` | proposed, SPEC-162 D1 |
| `date` | date, time, range | `temporal` | `<time datetime>` | **new, D4** |
| marks | a count out of a total | the field's own `metaType` | `role="img"` with marks inside | field shape, {% ref "WORK-639" /%} |
| `progress` | a fraction | `quantity` | already has `role="progressbar"` and `aria-value*` | existing core rune; gains `data-meta-type` and `data-value` |
| `badge` | an authored chip | `tag` by default | `<span class="rf-badge">` | existing; already conforms |

### D4 — `date` is a core value primitive

```md
{% date value="2024-03-01" /%}
{% date value="January 2025" /%}
{% date value="9:00 AM" /%}
{% date value="2024-03-01 – 2024-03-05" /%}
```

- **It reads** ISO 8601 dates and times, and partial dates (`2023`, `2024-03`). It also reads
  written dates with English month names (`January 2025`, `1 March 2025`), times with `AM`/`PM`
  or 24-hour clock, and ranges joined by an en dash or a hyphen.
- **It emits** `<time datetime="2025-01" data-meta-type="temporal">January 2025</time>`. The
  `datetime` keeps exactly the precision written, so a year stays a year. A range emits two
  `<time>` elements inside one wrapper with `data-range`.
- **It formats** through `formats.date` and `formats.time` (ADR-043) and the locale.
- **It does not guess ambiguous forms.** `03/04/2024` is March 4 in one locale and April 3 in
  another, so it reports `date-invalid` and renders as written. An author who wants it read
  writes it unambiguously.
- **Consumers:** `timeline` and `itinerary` place it on their extracted `date` and `time`
  fields; `changelog` places it on the date it extracts from a version heading with
  `headingExtract`; plan history and activity format their commit dates through the same kind.

### D5 — two candidates, recorded and not yet decided

- **A place primitive.** It would read an address or coordinates and emit `<address>` with
  `data-lat` and `data-lng`. A `map` would then collect the places inside it, as `tally`
  collects amounts, and draw them as an ADR-044 tier-3 visual. `event`, `itinerary` and
  `organization` would compose over it. It waits until a map composition is planned, because
  that is the consumer that defines what it must carry.
- **An inclusion value** for `comparison`: included, not included, or partial. It is a value,
  not a glyph, and needs a text alternative. The skeleton already has a checklist dimension for
  task lists (`packages/skeleton/styles/dimensions/checklist.css`), so this may be a
  `metaType` with sentiment rather than a new rune. *Decided by {% ref "SPEC-167" /%} D4: a
  `metaType` with sentiment, read from task-list markers, with no rune of its own.*

## Not in scope

- `mediatext` and floated images. They were discussed beside this, and are held for a
  separate spec.
- Units other than currency on `amount` (SPEC-162's open question).
- Writing the `formats` spec itself. This spec depends on it but does not define it.

## Open questions

- **Written dates in other languages.** D4 reads English month names. Reading `januari 2025` on
  a Swedish site means reading in the site's locale. The month names are available through
  `Intl`, but parsing them is not, so this needs a small table per locale or is left to
  authors writing ISO dates.
- **`typeface` and `color` as `metaType` values.** They are proposed in D3 so the design
  primitives meet D1.2, but they widen a vocabulary every theme is expected to cover
  (ADR-043's coverage check). The alternative is a `metaType` of `swatch` or no `metaType` at
  all for design-only primitives.

## Acceptance Criteria

- [ ] The value-element contract (D1) is documented in the theme-authoring and rune-authoring guides, with the attribute list a theme reads
- [ ] Value kinds are shared modules (reader, formatter, element builder) used by both value primitives and the engine's field rendering; `transform: 'duration'` goes through the shared temporal kind
- [ ] `color`, `font` and `amount` are built on the shared kinds and meet every point of D1, asserted by one contract test that runs against every value primitive
- [ ] `{% date %}` exists as a core rune: reads ISO, partial and written English dates, times and ranges; keeps the written precision in `datetime`; formats by locale and `formats`; reports `date-invalid` for ambiguous forms
- [ ] `timeline`, `itinerary` and `changelog` read their dates through the temporal kind, asserted against their current fixtures with no change in displayed text
- [ ] `progress` gains `data-meta-type` and `data-value` and passes the contract test
- [ ] A container reads values only through raw values: `tally` from amounts, and `design-context` from rendered `color` and `font` elements
- [ ] The new `metaType` values are added to the vocabulary and to ADR-043's coverage check

## References

- {% ref "SPEC-145" /%} D28: the value element a placed field emits, which this spec generalises.
- {% ref "SPEC-162" /%}: `amount` and `tally`.
- {% ref "SPEC-165" /%}: `color` and `font`; the open question on `design-context`.
- {% ref "ADR-043" /%}: `formats`, and the theme's vocabulary coverage.
- {% ref "ADR-044" /%}: tier 3, where a map's drawing belongs.
- {% ref "WORK-639" /%}: marks as a field shape.
- {% ref "BUG-038" /%}: item extraction from YAML, which `timeline` and `itinerary` depend on.

{% /spec %}
