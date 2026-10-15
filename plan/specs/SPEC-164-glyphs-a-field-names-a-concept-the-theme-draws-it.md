{% spec id="SPEC-164" status="draft" tags="theme, icons, vocabulary, intent, composition, metadata" %}

# Glyphs: a field names a concept, the theme draws it

## Summary

Under {% ref "ADR-042" /%}, a theme styles a composed rune through the shared vocabulary and
cannot see its fields. That works for colour, spacing and type, because `data-meta-type`,
`data-zone-layout` and the axes carry them. It does not work for icons, because nothing in the
vocabulary says what a field is precisely enough to draw a picture of it.

- `metaType` is too coarse. A recipe's servings, a recipe's calories and a work item's
  complexity are all `quantity`. A theme can draw a clock for every `temporal` field, but it
  cannot pick a plate for servings.
- The only icon a field can carry today is keyed on its **value**. `icon: { group }` emits
  `data-icon-group` and `data-icon="{value}"` (`buildIconValue`,
  `packages/transform/src/engine.ts`): hint's `type="warning"` draws `hint.warning`. Nothing
  keys an icon on what the field is.
- Keying a theme's icons on rune and field names (`recipe.servings`) is what ADR-042 rules out.
  Two sites can define `recipe` with different fields.

This spec adds a **glyph**: a field names a concept from a shared list, a theme supplies a
drawing for each concept, and the site can replace any of them.

## What exists

- **A theme's icons** are named groups of SVGs, `ThemeConfig.icons: Record<group,
  Record<name, svg>>`. Lumina ships three groups:
  - `hint`, with the four types;
  - `accordion`, with the disclosure chevron;
  - `global`, a curated Lucide subset (`packages/lumina/src/icons.ts`).
- **Each icon becomes a custom property** (`--rf-icon-hint-note`). The skeleton draws it as a
  mask, keyed on `[data-icon-group][data-icon]` (`packages/skeleton/styles/runes/hint.css`).
- **Layering already exists:**
  - `assembleThemeConfig` merges core, then plugin `theme.icons`, then the theme
    (`packages/transform/src/assemble.ts`).
  - The site's `icons` config is merged over the theme's `global` group
    (`packages/content/src/refract-loader.ts`).
  - `{% icon name %}` and the `icon:` image scheme resolve through the same registry.

So the mechanism is in place. What is missing is a key that a definition can name and a theme
can cover without knowing the definition.

## Decisions

### D1 — a field may name a glyph

A `metaFields` entry gains `glyph: string`:

```yaml
metaFields:
  prepTime: { metaType: temporal, label: Prep, glyph: time }
  servings: { metaType: quantity, label: Serves, glyph: servings }
```

The engine emits a leading `<span data-glyph="servings" aria-hidden="true">` before the
field's value. The glyph is decoration: the field's label and value carry the meaning, and a
screen reader is not told about a plate.

`glyph` and `icon: { group }` are different things and both stay:

- `glyph` is keyed on what the field **is**, and is the same for every value;
- `icon` is keyed on what the field **holds**, so it differs per value.

A field with both renders the value icon, because it says more.

`glyph` is part of the definition. For a composed rune it is frontmatter, and under ADR-042 a
theme cannot change it. For a native rune it is presentation, as `icon` is today, and a theme
may override it.

### D2 — core publishes a recommended concept list, and names stay open

A concept is any string. Core publishes a short list that themes are expected to cover:

| Concept | For |
|---|---|
| `time`, `duration`, `date` | when and how long |
| `servings`, `person`, `people` | who and how many |
| `location` | where |
| `difficulty`, `price` | how hard, how much |
| `link`, `source` | where it comes from |
| `info`, `positive`, `negative`, `caution`, `neutral` | the {% ref "SPEC-163" /%} sentiment values |

The list is a recommendation, not a closed vocabulary. A plugin may name a concept it needs
(`faction`) and ship a default drawing for it (D3).

The trade is stated in the open questions: an open list cannot promise that a theme covers
everything, so D4 makes a gap visible instead.

### D3 — resolution is site, then theme, then plugin, then nothing

Glyphs live in a new `glyph` icon group, resolved through the existing merge, highest first:

1. the site's config (`icons.glyph` in `refrakt.config.json`);
2. the theme's `icons.glyph`;
3. the plugin's `theme.icons.glyph`, so a plugin that names `faction` can ship a drawing for
   it;
4. nothing.

**Nothing means no span.** The engine emits `data-glyph` only when some layer resolves the
concept, so a gap never renders as an empty box. A theme may also draw glyphs from
`data-meta-type` (a clock for any `temporal` field). That is CSS the theme writes, and it
applies when no concept glyph is set.

### D4 — an unresolved glyph is reported

A placed field whose `glyph` resolves through no layer reports `glyph-unresolved` at warning
level, naming the concept, the rune and every layer consulted. This is the same visibility rule
as `field-unplaced`: a missing glyph is not an error, but it should not be silent either.

### D5 — sentiment glyphs replace hint's own icon group

Once SPEC-163 lands, a region with a sentiment can draw its glyph from the sentiment concepts:

- `hint`'s header icon comes from `glyph` concept `info`, `caution`, `negative` or `positive`;
- the `hint` icon group stays as an alias for one release, so a theme that overrides
  `icons.hint.warning` keeps working.

This was the one part of hint with no answer in ADR-042's follow-up.

### D6 — stretching ornaments are a separate shape

Some decorations are not icons, because they must stretch:

- `bond`'s connector is an empty `<span data-name="arrow">` that `bond.css` draws as a line,
  with border triangles for the heads (`packages/lumina/styles/runes/bond.css`);
- a divider between sections is a rule of any width.

A theme can recolour these today but cannot replace them with a drawing. A fixed-aspect mask
cannot stand in for a line of variable length.

An **ornament** is three pieces: a start cap, a repeating middle and an end cap. A
bidirectional connector mirrors the start cap.

- A rune marks the element `data-ornament="connector"`.
- A theme supplies `icons.ornament.connector` as `{ start?, middle, end? }`.
- The skeleton draws the pieces with `mask-image`, and the middle repeats on the x axis.

The first members are `connector`, `divider` and `disclosure`. `disclosure` is accordion's
chevron, which is already in the icon registry. When no layer supplies an ornament, today's CSS
drawing stays, so nothing changes for a theme that does not opt in.

## Not in scope

- **Replacing value-keyed icons.** `icon: { group }` stays for enums whose values each want a
  picture.
- **Author-chosen icons in prose.** `{% icon name %}` is unchanged. It resolves through
  `global`, not `glyph`.
- **Glyphs on things other than fields.** Section headers and list bullets could plausibly take
  one. Each is a separate change, once a consumer exists.

## Open questions

- **How small the list can stay, and who curates it.** A list nobody can extend becomes the
  bottleneck for every plugin, and a list anyone can extend promises nothing. This spec takes
  the open option with D4's visibility. A closed list is the alternative if themes report that
  coverage cannot be planned.
- **schema.org as a hint.** Many fields already map to a schema.org property
  (`recipeYield`, `prepTime`). That could suggest a concept when a definition names none. It is
  too domain-specific to be the key itself (`recipeYield` and `numberOfServings` are the same
  plate).

## Acceptance Criteria

- [ ] `metaFields.*.glyph` exists; the engine emits `<span data-glyph="…" aria-hidden="true">` before the value only when the concept resolves
- [ ] A field with both `glyph` and `icon` renders the value icon
- [ ] The `glyph` icon group resolves site, then theme, then plugin; the site's `icons.glyph` config is accepted and documented
- [ ] `glyph-unresolved` is reported for a placed field whose concept resolves through no layer, naming the layers consulted
- [ ] Lumina covers every concept in D2's list
- [ ] `recipe`'s fields declare glyphs (`time` for prep and cook, `servings`, `difficulty`), and the gallery shows them
- [ ] `hint` draws its icon from the sentiment glyphs once SPEC-163 lands; `icons.hint.*` still resolves as an alias
- [ ] Ornaments: `bond`'s connector carries `data-ornament="connector"`; a theme-supplied three-piece ornament replaces the CSS drawing, and without one the output is unchanged
- [ ] Contracts are regenerated on both copies and the diff reviewed; the SEO baseline does not move

## References

- {% ref "ADR-042" /%}: why a theme cannot key icons on a composed rune's fields.
- {% ref "SPEC-163" /%}: the sentiment values the sentiment glyphs are named after.
- {% ref "WORK-639" /%}: the same split for marks; the shape is the engine's, the meaning is `metaType`'s.

{% /spec %}
