{% bug id="BUG-023" status="confirmed" severity="minor" source="SPEC-137" tags="dimensions, density, meta-rank, css, lumina, drift" %}

# data-meta-rank is styled and specified but emitted by nothing

`data-meta-rank` is the channel by which density compaction is meant to drop
secondary metadata. It is specified, it is styled, and no code path ever puts it
on an element.

## Where it exists

**Specified** — {% ref "SPEC-026" /%} (lines 242, 264, and `meta-ranks.css` in its
file list) and {% ref "SPEC-079" /%} (line 53, and the worked example at 461–465,
where a header zone emits `data-meta-type="id" data-meta-rank="primary"`).

**Styled** — four rules in `packages/lumina/styles/dimensions/density.css`:

```css
[data-density="compact"] [data-meta-rank="secondary"] { display: none; }
[data-density="minimal"] [data-meta-rank="secondary"] { … }
[data-density="compact"] [data-density="full"] [data-meta-rank="secondary"], { … }
[data-density="minimal"] [data-density="full"] [data-meta-rank="secondary"], { … }
```

## Where it doesn't

Nowhere else. A repo-wide search for `meta-rank` outside `node_modules` returns
only those four Lumina rules and the two specs. In particular it is absent from:

- `packages/transform/src/types.ts` — `MetaField` has `metaType`,
  `sentimentMap`, `label`, `condition`, `renderWhenEmpty`, `href`, `rating`,
  `icon`, `tag`, `splitOn`, `transform`. No `rank`.
- the identity transform — nothing emits the attribute
- every `RuneConfig` in `packages/runes/src/config.ts` and `plugins/*/src/config.ts`

## Consequence

Density compaction cannot drop anything. `[data-density="compact"]` currently
does three things only: shrinks `--rune-padding`, shrinks `--rf-title-size`, and
line-clamps `[data-section="description"]` to two lines. The "compact shows less
metadata" behaviour the dimension documents does not happen, and the four rules
are dead selectors.

## Steps to reproduce

Render any metadata-bearing rune at `density="compact"` and inspect the emitted
chips. Every field present at `full` is present at `compact`.

## Expected

Fields the rune marks as secondary are hidden at `compact` and `minimal`.

## Actual

All fields render at every density. No element in the document carries
`data-meta-rank`.

## Which half is the defect?

Genuinely open, and the reason this is filed rather than fixed.

**Wire it.** Add `rank?: 'primary' | 'secondary'` to `MetaField`, emit
`data-meta-rank` alongside `data-meta-type`, and annotate the existing
`metaFields` manifests. This is what {% ref "SPEC-079" /%} designed, and the rank
is a rune-level judgement — the rune knows which of its facts are essential —
so it belongs on the manifest rather than in theme config.

**Or delete the rules.** If density is deliberately spacing-only, the four
Lumina rules and the spec passages are misleading and should go.

The first is preferable, and not only for tidiness: {% ref "ADR-029" /%} decision 5
bounds what a theme may omit from a rune's rendered structure, and names the
density/rank channel as that bound. If the channel does not exist, the bound is
unenforceable and a theme's only way to hide a part is to drop it from a layout
tree — which is exactly the unbounded omission that decision was written to
prevent.

## Why this is filed against SPEC-137

This is the *reverse* direction of the drift {% ref "BUG-022" /%} shows. There,
per-rune CSS shadows a dimension that works. Here, theme CSS targets a dimension
that was never wired. Both are invisible to
`packages/lumina/test/css-coverage.test.ts`, which only asks whether generated
selectors have CSS — never whether CSS selectors have generators.
{% ref "SPEC-137" /%} covers both directions.

{% /bug %}
