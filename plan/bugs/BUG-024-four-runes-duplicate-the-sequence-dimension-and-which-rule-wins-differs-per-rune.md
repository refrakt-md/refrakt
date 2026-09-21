{% bug id="BUG-024" status="confirmed" severity="minor" source="SPEC-137" tags="dimensions, sequence, css, skeleton, lumina, drift" %}

# Four runes duplicate the sequence dimension, and which rule wins differs per rune

`howto`, `recipe`, `steps` and `track` each hand-roll a CSS counter that the
`sequence` dimension already provides for them. The duplication is invisible
because the output looks identical — but the two rules land at different
specificities, so which one is actually in effect differs from rune to rune.

## The dimension already reaches all four

Each of the four declares `sequence:` in its config:

| Rune | Config | Items |
|---|---|---|
| `HowTo` | `plugins/learning/src/config.ts:24` | author-written `<ol>` in the content region |
| `Recipe` | `plugins/learning/src/config.ts:69` | `recipe.ts:218` — `new Tag('ol', {}, steps)` |
| `Steps` | `plugins/marketing/src/config.ts:198` | `steps.ts:166` — `new Tag('ol', …)`, items `tag: 'li'` at `:82` |
| `Playlist` | `plugins/media/src/config.ts:16` | `playlist.ts:354` — `new Tag('ol', …)`, `track.ts:210` is `tag: 'li'` |

And `annotateSequence` (`packages/transform/src/engine.ts:743`) **recurses into
wrappers**, so every one of those `<ol>` elements receives
`data-sequence="numbered"` — including HowTo's, which the author wrote rather
than the rune.

So `skeleton/styles/dimensions/sequence.css` is already styling all four. The
per-rune counters are vestigial: they predate the dimension and were never
removed.

## The actual defect

Duplication alone would be harmless. The problem is that it is **inconsistent**:

```
[data-sequence="numbered"] > li::before    → (0,1,2)
.rf-step::before                            → (0,1,1)   dimension wins
.rf-track::before                           → (0,1,1)   dimension wins
.rf-howto__content ol > li::before          → (0,1,3)   bespoke wins
.rf-recipe__content ol > li::before         → (0,1,3)   bespoke wins
```

Both rules live in `@layer skeleton`, so the layer order does not disambiguate
them and specificity decides. A theme author restyling
`[data-sequence="numbered"] > li::before` therefore affects `steps` and `track`
and is silently ignored on `howto` and `recipe`.

That is the dimension's whole promise — *style once, every rune follows* —
failing quietly on half the runes that opted in.

## Steps to reproduce

Render a `howto` and a `steps` on the same page with a theme rule that changes
the marker, e.g.:

```css
@layer skin { [data-sequence="numbered"] > li::before { content: "§"; } }
```

## Expected

Both runes show `§`.

## Actual

`steps` shows `§`. `howto` shows its number.

## Fix

Delete the duplicated counter blocks:

- `packages/skeleton/styles/runes/howto.css` — the `.rf-howto__content ol` reset,
  `counter-reset: howto-step`, and the `> li` / `> li::before` block
- `packages/skeleton/styles/runes/recipe.css` — the equivalent `recipe-step` block
- `packages/skeleton/styles/runes/steps.css` — `counter-reset: step`,
  `.rf-step { counter-increment }`, `.rf-step::before`
- `packages/skeleton/styles/runes/track.css` — `counter-increment: track` and
  `.rf-track::before`

Keep everything genuinely rune-specific. `track.css` in particular is only
half duplication: its row flex, cell `flex` sizing, ellipsis overflow and
duration auto-push are the track's own inner geometry and stay.

Roughly 60 lines across the four files, with the skin counterparts following.

## Note on the specificity arithmetic

The table above is computed by hand, not observed. The *duplication* is certain
— four counters for a mechanism the dimension provides — and so is the fact that
the two selector shapes differ. Which one wins in a real render should be
confirmed in the gallery harness before the fix is called behaviour-preserving,
since that determines whether removing the bespoke rules is a no-op (`steps`,
`track`) or a visible change (`howto`, `recipe`).

## Why this is filed against SPEC-137

Nothing detects this class of rot. `packages/lumina/test/css-coverage.test.ts`
checks the forward direction only — that every generated selector has CSS
somewhere. The reverse question, *is this per-rune rule shadowing a dimension it
should defer to*, has no instrument. {% ref "SPEC-137" /%} builds one, and this
bug is one of its two motivating cases.

{% /bug %}
