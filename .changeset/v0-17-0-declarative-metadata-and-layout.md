---
"@refrakt-md/types": minor
"@refrakt-md/transform": minor
"@refrakt-md/runes": minor
"@refrakt-md/lumina": minor
"@refrakt-md/marketing": minor
"@refrakt-md/docs": minor
"@refrakt-md/storytelling": minor
"@refrakt-md/places": minor
"@refrakt-md/media": minor
"@refrakt-md/learning": minor
---

**v0.17.0 — Declarative metadata & layout.**

A new, fully declarative model for how metadata-bearing and media-bearing runes are assembled — replacing per-rune imperative structure code with a small, orthogonal config vocabulary, and giving every rune a consistent metadata treatment. Additive: existing content keeps rendering; meta-bearing runes simply gain a cleaner, theme-overridable structure.

### The block-and-layout model (SPEC-080)

Three orthogonal fields on a rune's config describe its whole structure:

- **`metaFields`** — a pure data manifest of a rune's meta-bearing fields (each declares its `metaType`, `label`, `condition`, sentiment, and any rich rendering). No layout, no placement.
- **`blocks`** — named metadata blocks projected from `metaFields`, each a flat field list rendered by one layout primitive.
- **`layout`** — explicit, ordered placement of block names and content children per container (reserved `root` key for flat runes); unlisted content always appends, never drops.

A field's render **shape** is intrinsic to its `metaType` — a chip (`.rf-badge`) for `status` / `category` / `tag`, bare inline text for `id` / `quantity` / `temporal` / `code` — independent of the block's layout. Themes override a rune's `metaFields` / `blocks` / `layout` by inner key.

### New layout primitives & authoring runes

- **`bar`** — a horizontal flex row of fields; per-field `align: 'end'` pushes a field (and everything after) to the right edge, `wrap` toggles single-line.
- **`definition-list`** — labelled `<dt>` / `<dd>` rows in a responsive multi-column grid.
- **`{% bar %}`** and **`{% deflist %}`** — prose authoring handles that emit the same DOM as the projected primitives, for hand-authored rows and definition lists.

### Universal metadata chip system

A single chip primitive — `.rf-badge` plus `[data-meta-type]` / `[data-meta-sentiment]` — is shared by the standalone `{% badge %}` rune and every chip-rendered field. `data-meta-type` carries typography only (monospace for `id` / `code`, tabular-nums for `quantity` / `temporal`, primary color for `id`); geometry comes from the layout primitive and the badge class; sentiment drives color.

### Rich field renderings

Beyond chip / bare, a field can declare:

- **`href`** — render as a link (`<a>`), the named modifier holds the URL.
- **`rating`** — a filled-marks-out-of-total widget (stars, dots).
- **`icon`** — a leading glyph selected by the field's value (e.g. the hint header's note / warning / caution / check).
- **`renderWhenEmpty`** — gate on *presence* rather than truthiness, so a present-but-empty value still projects its block (e.g. `{% codegroup title="" %}` renders the window chrome without a filename).

### Coverage & tooling

- Every meta-bearing first-party rune is migrated to the model: docs `api` / `symbol`; learning `recipe` / `howto`; storytelling `character` / `realm` / `faction` / `lore` / `plot`; places `event`; media `playlist`; marketing `testimonial`; core `budget` / `codegroup` / `hint`; and the plan entities.
- **Structure contracts** (`refrakt contracts`) now surface each projected block as an addressable element with its layout primitive and fields, and derive child order from `layout`.

### Deprecated (not yet removed)

The legacy `slots` + `structure` config path still renders, but is superseded by `metaFields` + `blocks` + `layout` and emits a one-time migration warning. Its removal — and the removal of `RuneConfig.slots` — is a breaking change planned for a later release; third-party plugins on the legacy path should migrate. `projection` (hide / group / relocate) and `postTransform` remain as escape hatches.
