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
