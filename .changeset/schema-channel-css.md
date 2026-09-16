---
"@refrakt-md/lumina": minor
"@refrakt-md/skeleton": minor
"@refrakt-md/storytelling": patch
"@refrakt-md/marketing": patch
---

Style runes by BEM class, not the schema.org channel (WORK-564, BUG-015)

Fourteen CSS rules across Lumina and Skeleton selected on `[property=…]` — the
RDFa attribute the structured-data channel writes. That coupled a rune's
appearance to what it asserts about its content, so renaming a schema.org
property would unstyle a rune, and four of the rules were already dead because a
`property` had moved years ago.

All fourteen now select on the `data-name`-derived BEM element class instead
(`.rf-lore__title`, `.rf-plot__title`, and so on). Where a rule had a live
`meta[property]` half and a dead `span[property]` half, the dead half is gone
and the live one kept. A CSS coverage assertion walks every stylesheet under
`packages/` and `plugins/` and fails on any `[property…]` selector, so the
coupling cannot come back.

**Two defects this surfaced**, both of the kind a dead selector hides:

- `.rf-lore__title` and `.rf-plot__title` pinned `font-size`, which overrode the
  prominence chain — `{% plot prominence="display" %}` had been inert. The
  declarations are removed; `sections.css` already supplies the resting value.
- A `schema="none"` test passed vacuously: `stripSchemaOrg` has exactly one
  caller (`accordion`), so the attribute does nothing on `pricing`.

**If you override Lumina or Skeleton CSS** and your selectors mention
`[property=…]` on a rune's children, they no longer match the shipped markup's
intent — switch to the BEM element class. If you relied on `.rf-lore__title` or
`.rf-plot__title` carrying a fixed `font-size`, set it yourself or use the
`prominence` axis, which now works.
