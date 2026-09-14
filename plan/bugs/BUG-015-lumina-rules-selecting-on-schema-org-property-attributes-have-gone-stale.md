{% bug id="BUG-015" status="confirmed" severity="minor" tags="lumina,css,schema-org,seo" milestone="v0.35.0" %}

# Lumina rules selecting on schema.org property attributes have gone stale

Six Lumina rules style runes by selecting on the RDFa `property` attribute
rather than the BEM element class the rune's `refs` already produce. Four of
them now match nothing: the schema property was renamed, moved onto a `<meta>`,
or removed entirely, and the stylesheet was never updated.

Nothing detected it. The CSS coverage test checks that the selectors *derived
from config* exist in the CSS; it has no way to notice a hand-written selector
that matches no element.

## Actual

Checked against `refrakt inspect <rune> --site main` for each rune:

| Selector | File | State | Why |
|----------|------|-------|-----|
| `.rf-tier h1[property="name"]` | `pricing.css:65` | live | `nameTag` is in both `refs` and `schema` |
| `.rf-plot > span[property="name"]` | `plot.css:2` | live | `titleTag` is in both |
| `.rf-tier p[property="price"]` | `pricing.css:71` | **dead** | `property="price"` lands on `parsedPriceMeta`, a `<meta>`; the `<p>` carries only `data-name="price"` |
| `.rf-lore > span[property="title"]` | `lore.css:14` | **dead** | the span carries `property="headline"` |
| `.rf-bond > span[property="from"]` | `bond.css:6` | **dead** | `bond` emits no schema.org at all — no `schema:` map, no `typeof` |
| `.rf-bond > span[property="to"]` | `bond.css:7` | **dead** | as above |

None of the four dead rules has a BEM equivalent elsewhere in its stylesheet, so
the declarations are simply lost:

- **`tier` price** — `font-size: var(--rf-text-4xl)`, `weight-bold`,
  `tracking-tight`, `margin-bottom: 1.5rem`. The most visible of the four: a
  pricing table's price renders at body size.
- **`lore` title** — `text-2xl`, `weight-bold`, `margin-bottom: 0.5rem`.
- **`bond` from / to** — `weight-semibold`, `white-space: nowrap`.

## Expected

These style on the BEM element classes the engine already emits from `refs` —
`.rf-tier__price`, `.rf-lore__title`, `.rf-bond__from`, `.rf-bond__to` — and the
two live rules move with them, so no rule depends on the schema.org channel.

## Steps to reproduce

```bash
node packages/cli/dist/bin.js inspect tier --site main
# <p data-name="price" …>  — no property attribute
node packages/cli/dist/bin.js inspect lore --site main
# <span data-name="title" … property="headline">  — not property="title"
node packages/cli/dist/bin.js inspect bond --site main
# <span data-name="from">  — no property attribute
```

## Why this is `minor`

Nothing is broken structurally and no page fails to render; three runes are
missing some type styling, on a theme whose own site does not use `bond` and
uses `lore` only in the storytelling examples. The `tier` price is the one a
user would actually notice.

## Notes

The deeper issue is the coupling, not the four renames: presentation selecting
on the SEO channel means a correction to structured data becomes a visual
regression, and `schema="none"` ({% ref "WORK-552" /%}) strips `property`
wholesale — so on `pricing` it would silently unstyle the tier heading via the
one rule that still works.

{% ref "SPEC-130" /%} records this as a constraint and proposes the rule
(presentation never selects on the schema.org channel) plus a CSS coverage
assertion to hold it. Fixing the six rules is worth doing ahead of that spec
either way, since four of them are broken today.

## References

- {% ref "SPEC-130" /%} — declarative schema.org mapping; where this surfaced
- {% ref "WORK-552" /%} — `schema="none"`, which makes the coupling load-bearing

{% /bug %}
