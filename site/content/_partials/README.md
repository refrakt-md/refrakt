# Shared blocks

Files here are reachable from any page in this site. Two runes pull them in, and
which one you need depends on what the file contains:

- **`partial`** — Markdoc's own tag, and the default. Use it for plain content.
- **`include`** — refrakt's, for a file containing `data` or `snippet`. Those
  resolve in the preprocess phase, which runs *before* Markdoc expands a
  partial, so a partial containing one fails the build. See `/runes/include`.

This file is never referenced, so it never renders. That is deliberate: neither
comment syntax survives to the page — `{# … #}` is not enabled (BUG-012) and an
HTML comment passes straight through to the output — so notes about a shared
block have to live beside it rather than inside it.

## `rune-attributes.md`

The attribute reference every `/runes/` page renders (SPEC-128 / WORK-548):

```markdoc
{% include file="rune-attributes.md" variables={r: "rune:card"} /%}
```

`$r` is the page's only binding, pre-formatted as a filter because `where` takes
a single string and nothing concatenates at preprocess time.

Five sections, each rendering nothing when its query is empty (BUG-011) — so a
rune with no base preset shows no preset heading, and one with no universal axes
shows no accordion at all. The per-axis tables come from a nested query
(WORK-553), keyed by axis alone because an axis's attributes are identical on
every rune that carries it.

Regenerate the data it reads with `npm run runes:attributes`.

## `rune-intro.md`

The header every `/runes/` page opens with (SPEC-187 / WORK-706), in place of
the page's own `# Title`:

```markdoc
{% include file="rune-intro.md" variables={r: "rune:hero"} /%}
```

It is a `section` at `prominent`, which matches a docs page's `<h1>` size: the
plugin's short name as eyebrow (`marketing`, or `core`; plain text, the plugin page link is in the Install drawer), the title as the
page's `<h1>`, and the frontmatter `description` as the blurb. Its body is a
`bar`. The left group holds what the rune is: a `Composition` badge, a status
badge when the page is not `stable`, and the schema.org type it publishes. The
right group is an `actions` region, styled by its `in-bar` context: `Install`
(plugin runes only) and `Source`, each an icon and a label, and each a plain
link to a drawer the partial declares (`rune-install`, `rune-source`), which the
build turns into a drawer trigger (SPEC-187 D10). The Source drawer is a
`snippet` of the defining file and a link to it on GitHub.

The data is `_data/rune-intro.json`, one record per rune page, written by the
same `npm run runes:attributes`. Nothing in it is hand-written: title,
description and status are the page's frontmatter, `composed` and `source` are
how the rune resolves, and `schemaType` is its resolved schema.org row. Flags
the partial tests are booleans (`composed`, `unstable`, `plugin`, `publishes`):
Markdoc's `{% if %}` treats an empty string as true.
