---
"@refrakt-md/runes": patch
---

Rune attribute tables are generated from the schemas (WORK-548, SPEC-128)

Every rune doc page now renders its attribute table from `refrakt reference`'s own data instead of a hand-copied table. 94 pages, one shared block, authored once.

```markdoc
## Attributes

{% include file="rune-attributes.md" variables={r: "rune:card"} /%}
```

**This is mostly new documentation, not a refactor.** 72 of the 108 runes with attributes had no table at all — 17 of them with a *required* attribute nobody had written down. Child runes (`accordion-item`, `tier`, `step`, `tab`, `form-field`, …) now appear on their parent's page, which is where a reader looks for them.

The block renders four things, each of which disappears when it has nothing to say:

- the rune's **own** attributes, with `` `name` `` in code and `✓` / `—` for required — matching the hand-written tables it replaces
- attributes inherited from a **base preset**, under a heading naming that preset
- the **universal axes** it carries, one collapsed disclosure each, with prose read from the facet contracts in `packages/transform/src/facets/`
- the axes it **does not** carry, grouped by reason — `badge`'s twelve collapse to a single row rather than saying "no" twelve times

Also removes the hand-written "Common attributes" table from 69 pages. It claimed all block runes share `width`/`spacing`/`inset`/`tint`/`tint-mode`/`bg`, which is wrong for every inline rune and every rune missing an axis; the generated section says which axes a rune actually carries, and why not for the rest.

The generated section agrees with `refrakt reference <name>` — both read the same serialized rune.

`check-rune-docs` gains the content half of its question: every rune with generated rows has a page that renders them, and no page hand-writes a table beside a generated one. `npm run runes:attributes -- --check` keeps the artifact fresh.
