{% spec id="SPEC-171" status="draft" tags="runes, composition, marketing, grid, card, layout" %}

# Bento is a grid of cards

## Summary

{% ref "SPEC-151" /%} recorded `bento` as needing "the attribute cascade, or stays", and
{% ref "SPEC-161" /%} left it as a plugin rune. Read against the primitives planned since, it
is a composition waiting on three capabilities of `grid`. `bento-cell` is a `card` written a
second time by hand, and bento's parent-to-child cascade is template forwarding once bento is
a composition.

## What bento does, measured

From `plugins/marketing/src/tags/bento.ts` (488 lines):

**`bento-cell` repeats `card`:**

| `bento-cell` | `card` |
|---|---|
| Splits content on `---` into media / body / footer by count (`splitZones`, `zoneRoles`, `bento.ts:18-34`; the comment says "mirroring `card`") | `splitMediaBodyFooter`, the same count rule (`packages/runes/src/tags/common.ts`) |
| A leading heading is the title | title detection |
| `href` becomes a stretched whole-cell link | `href`, the same stretched link ({% ref "SPEC-160" /%} D8 generalises it) |
| Unwraps images in the media zone | `extractMediaImage` |
| `media-position`, `media-ratio` | the split preset ({% ref "SPEC-168" /%} D1) |

What is bento's own about a cell:

- **its footprint** (`size`, `cols`, `rows`): where the cell sits in the grid, not what the
  card is;
- **a uniform title level**: every title renders as `h3` whatever level it was written at,
  because the input level only sets the tile size (`CELL_TITLE_LEVEL`, `bento.ts:16`);
- **a media position derived from size**: large and full cells default to media beside the
  text, smaller cells to media on top (`bento.ts:198-203`).

**`bento` is `grid` plus three things.** `grid` (`packages/runes/src/tags/grid.ts`) already
has `columns`, `rows`, `flow` (with `dense`), per-cell spans through `spans="2:1 1 1"` (emitted
as `data-colspan` and `data-rowspan`), the `gap` token scale, `valign`, `collapse`, `mode`
(columns, auto, masonry), `aspect` and `stack`. Bento adds:

| Bento feature | What it is |
|---|---|
| A footprint on each cell (`cols`, `rows`) | a grid span carried by the cell rather than listed on the parent |
| Heading level sets the footprint (`h1` full, `h2` large, `h3` medium, otherwise small, proportional to `columns`; or a `levels="4x2,3x1"` ladder) | a sizing rule from a per-cell key to a footprint (`tieredSize`, `presetSpans`, `parseLevels`, `bento.ts:206-253`) |
| `row-height` | a row-track sizing token |
| `content-height` | a per-card height variable, with a grid-level default |
| Grid-level `media-position` and frame/elevation pushed down to cells (`bento.ts:380-432`) | the cascade {% ref "SPEC-156" /%} D8 counts toward a `childDefaults` mechanism |
| Two inputs: headings, or explicit `{% bento-cell %}` | a content-model choice |

**Usage:** about 22 `{% bento %}` instances in tracked content, mostly on its own documentation
page and the media and section docs. Explicit cells are used 25 times; `cols`/`rows` on a few
cells; `levels` twice. `grid spans=` is used three times.

## Decisions

### D1 — grid takes a footprint from each cell

A cell may carry its own span: `span="4"` (columns) or `span="4x2"` (columns by rows), as an
attribute on the placed child. `grid` reads it from the child and emits `data-colspan` and
`data-rowspan` as it does for `spans` today. A child's own span wins over the parent's `spans`
list.

This is the general need, not a bento one: a composition that places cells with `each` cannot
build a parent `spans` list, because it does not know the cell count in advance.

### D2 — grid owns the sizing ladder

The one computation in bento moves into `grid`, where it serves every grid:

- **`sizes="tiered"`**: a cell's size key (`full`, `large`, `medium`, `small`) maps to a
  footprint proportional to `columns`, as `presetSpans` does today.
- **`sizes="4x2, 3x1, 2x1"`**: an explicit ladder, as `levels` does today; a key past the end
  clamps to the last rung.
- **The key comes from the cell**, as `size="large"` or as a heading level. A composition passes
  the level through `$each`, which needs the sections content model to expose the heading's
  level (`emitAttributes: { level: $level }`).
- Malformed rungs are reported as `grid-sizes-invalid` with the rung, instead of today's
  `console.warn`.

### D3 — grid gets a row-height token

`row-height="sm | md | lg | xl"`, from bento, as a grid track token. `content-height` stays a
card-level variable that a composition passes per cell.

### D4 — the cascade is template forwarding, and SPEC-156 D8 is re-examined

Bento's grid-level `media-position` and frame/elevation defaults are values the composition
passes to each card it places (`forward="split"`, or the attributes written out). No
`childDefaults` mechanism is needed for bento.

SPEC-156 D8 counted three cascade cases toward such a mechanism: bento's, and `playlist`'s
artist and child kind. All three parents become compositions that place their children, so the
same reasoning applies to all three. D8 carries a note that its evidence is to be re-checked
against the compositions before the mechanism is specified.

### D5 — bento is a composition over grid and card

```md
{% grid columns=$attrs.columns sizes=$attrs.sizes row-height=$attrs["row-height"] cells="each" %}
	{% slot name="sections" each %}
		{% card size=$each.level forward="split" %}
			### {% $each.heading %}

			{% slot /%}
		{% /card %}
	{% /slot %}
{% /grid %}
```

- The template writes every title as `###`, so the uniform title level needs no code.
- `cells="each"` is {% ref "SPEC-165" /%} D7.
- **Explicit cells become cards with a span**: `{% card span="4x2" %}` inside a `grid`. A
  `bento-cell` alias composition can keep existing content working during migration.
- Content before the first heading stays as lead content above the grid, as today.

### D6 — the size-derived media position moves to CSS

A template conditional cannot pick a media position per size: a slot placed in both branches
counts twice ({% ref "SPEC-145" /%} D30 rule 3). The behaviour belongs in CSS anyway: a card
whose container is wide enough places media beside the text, through a container query.
SPEC-145 D23 ("structure resolves once; responsive variation is CSS's work") points the same
way. An author's explicit `media-position` still wins.

### D7 — the migration is compared, and the visible changes are recorded

| Change | Why |
|---|---|
| `gap` accepts the grid tokens (`none`, `tight`, `default`, `loose`), not a CSS length | one gap scale; an author's length is reported and mapped to the nearest token by a codemod |
| Large cells place media beside the text by container width, not by size name | D6 |
| `rf-bento*` classes give way to grid and card vocabulary | Lumina's `bento.css` is drained ({% ref "ADR-044" /%}) |
| `levels` becomes `sizes` | D2 |

## Not in scope

- A general `childDefaults` mechanism (D4 defers it).
- `masonry` and `auto` grid modes, which bento does not use.

## Acceptance Criteria

- [ ] A grid child's `span="N"` or `span="NxM"` sets its column and row span, and wins over the parent's `spans` list
- [ ] `grid sizes="tiered"` and `sizes="<ladder>"` map each cell's size key to a footprint proportional to `columns`; malformed rungs report `grid-sizes-invalid`
- [ ] `grid row-height` accepts `sm`, `md`, `lg` and `xl`
- [ ] The sections content model can expose a heading's level as `$each.level`
- [ ] `bento` is a composition over `grid` and `card`; the bento documentation page renders with only the differences in D7
- [ ] Explicit `{% bento-cell %}` content keeps working through an alias, and a codemod rewrites it to `{% card span=… %}`
- [ ] A card in a wide grid cell places its media beside the text by container query, and an explicit `media-position` wins
- [ ] SPEC-156 D8 carries a note that its three cascade cases dissolve under composition
- [ ] `bento.ts`'s zone splitting and `bento-cell` transform are removed

## References

- {% ref "SPEC-151" /%}, {% ref "SPEC-161" /%}: bento's earlier verdicts, replaced.
- {% ref "SPEC-156" /%} D8: the cascade, re-examined in D4.
- {% ref "SPEC-160" /%}: `card` as a section with a surface; the stretched link (D8).
- {% ref "SPEC-165" /%} D7: `grid cells="each"`.
- {% ref "SPEC-168" /%}: the split preset and `forward`.
- {% ref "SPEC-145" /%}: D23 (responsive variation is CSS), D30 (conditionals at expansion).

{% /spec %}
