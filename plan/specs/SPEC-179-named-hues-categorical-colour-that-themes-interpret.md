{% spec id="SPEC-179" status="draft" tags="theme, axes, vocabulary, tokens, colour, hint, chart, composition" %}

# Named hues: categorical colour that themes interpret

## Summary

refrakt has two ways to colour something, and nothing between them:

- **Sentiment** is a judgement: `positive | negative | caution | neutral`, plus `info` in
  {% ref "SPEC-163" /%}. A theme can draw it however it likes, because it carries meaning.
- **Literal colour** comes from `tint` ({% ref "SPEC-053" /%}) and the `color` primitive
  ({% ref "SPEC-165" /%}). It is fully expressive, but no theme can reinterpret it.

Most of the colours authors ask for are neither. A purple "important" callout, a teal "tip",
colour-coded timeline phases, tag badges and chart series pass no judgement, so sentiment
cannot say them. They should still follow the theme: Nord's purple is not Dracula's.

The chart rune has already run into this gap. `--rf-chart-series-1…6` is a categorical
palette written as hex in `packages/lumina/styles/runes/chart.css`, outside the token contract.
{% ref "SPEC-083" /%} calls it "categorical; **not** the status tokens", and no preset can
reach it.

Stretching sentiment (`sentiment="purple"`) would empty the word of meaning. This spec adds a
**closed palette of named hues** to the token contract instead. A **`hue` axis** lets regions
and values pick one, and the chart series becomes a theme-ordered list of hues. Sentiment is
unchanged.

The result is three layers:

| Layer | Says | Who decides the colour |
|---|---|---|
| Sentiment (SPEC-163) | a judgement: good, bad, worrying, notice this | the theme, from the meaning |
| Hue (this spec) | an identity: "this one is purple" | the theme, from the name |
| Tint / `color` | an exact colour | the author |

## Decisions

### D1 — the hue vocabulary is closed and named

`gray | red | orange | yellow | green | teal | blue | purple | pink`, plus `primary` (D4).

- **Named, not numbered.** An author thinks "purple". `color-3` means nothing in prose, and it
  would mean something different in every theme. Numbered positions are right only for
  automatic assignment, which is the series role (D5).
- **Closed.** {% ref "ADR-043" /%} says a theme renders a vocabulary and configures no rune. If
  a theme could add `hue="coral"`, content written for it would break on every other theme. A
  value outside the set is rejected at parse time by `matches`, like every other axis.
- **Nine hues.** Every integrated preset has to fill each one, so each extra hue costs every
  preset author something. Nine covers the categorical palettes refrakt draws today (chart
  series, the Notion-style tag set) without asking presets for colours they don't have.

`gray` is not `neutral`. `neutral` is sentiment's "skip this", drawn as `--rf-color-muted`.
`gray` is a hue an author chose, and a preset may give it its own value.

**Rejected names:**

- **`color`** — that is the SPEC-165 primitive, and on a region it would read as a literal
  colour.
- **`accent`** — it was tint's old name for the primary colour, which SPEC-053 removed because
  of exactly that collision.
- **`tone`** — taken by the background layer (`scrim-tone`), as SPEC-163 D2 records.

### D2 — the token contract gains `color.hue`, with fallbacks

```ts
color: {
  // …existing tokens…
  hue?: Partial<Record<HueName, HueTokens>>;
}

/** Same shape as SentimentTokens: saturated base, pale bg, border. */
export type HueTokens = SentimentTokens;
```

The generator emits `--rf-color-hue-<name>`, `--rf-color-hue-<name>-bg` and
`--rf-color-hue-<name>-border`, following the existing `color.info` → `--rf-color-info`
mapping in `packages/transform/src/token-stylesheet.ts`.

**Every hue is optional and has a fallback.** This is {% ref "SPEC-056" /%}'s fallback pattern
for syntax roles: a preset that sets nothing still renders, just less faithfully.

| Hue | Falls back to |
|---|---|
| `blue` | `color.info.*` |
| `green` | `color.success.*` |
| `yellow` | `color.warning.*` |
| `red` | `color.danger.*` |
| `gray` | `color.muted`, `color.surface.base`, `color.border` |
| `orange`, `teal`, `purple`, `pink` | Lumina's defaults in `packages/lumina/tokens/base.css` |

The first five come from tokens every preset already defines, so they stay coherent with each
preset straight away. The last four do not. An integrated preset (Nord, Dracula, …) that leaves
them unset gets Lumina's values on its own canvas. `token-validate` reports that as a
`hue-unset` note for integrated presets, and the first-party presets fill all nine (see the
acceptance criteria).

**The fallback runs from hue to sentiment, not from sentiment to hue.** Re-deriving
`--rf-color-info` from `hue.blue` would change the colour of every existing preset that sets
`info` explicitly. A theme that wants the two tied sets one from the other in its own preset.

**Hues are scope-eligible for tints.** `filterScopeEligible` keeps `syntax.*` and the chrome
accents because together they are a palette's visible identity. Hues are the same kind of
thing. A Nord-tinted subtree should draw Nord's purple, so `color.hue.*` joins the included
set. Sentiments stay excluded, as they are today.

### D3 — `hue` is a universal axis for regions, beside `sentiment`

`hue` gets its own `hue` axis in `AXIS_ATTRIBUTES` (`packages/runes/src/universal-attributes.ts`).
Its facet has `elevation`'s shape (`packages/transform/src/facets/elevation.ts`): it resolves
the attribute or the rune's `defaultHue`, emits `data-hue="…"` on the chrome carrier, and sets
no class and no colour.

**Both axes write one property.** SPEC-163 D3 has the skin map `[data-sentiment]` to
`--sentiment-color`. This spec renames that property to **`--region-color`** (SPEC-163 is still
a draft, so nothing ships under the old name). `[data-hue]` writes the same property. Lumina's
region rules (the hint header, and anything later) read only `--region-color`.

There is one property, not `var(--hue-color, var(--sentiment-color))`, because custom
properties inherit. A nested region with only a `sentiment` would inherit its parent's
`--hue-color` and be drawn in the parent's hue. With one property, each region that declares
either axis overwrites it, and a region that declares neither inherits its parent's colour,
which is SPEC-163's existing behaviour.

**Precedence:**

1. An author attribute beats a rune or definition default, on each axis independently.
2. When a region carries both markers, the hue wins. The skin declares its `[data-hue]` rules
   after its `[data-sentiment]` rules at the same specificity. A hue is the more specific
   statement about colour, and the sentiment still holds for everything that isn't colour.
3. An author who writes **both** attributes on one tag gets a validate warning,
   `sentiment-hue-conflict`. A hue that overrides a definition's *default* sentiment is the
   normal case and is not warned.

The facet emits both markers when both resolve. `data-sentiment` keeps its meaning even when
the hue decides the colour, so a theme can still key icons, borders or screen-reader text on
it, and another theme may choose to let sentiment win.

### D4 — `primary` is the one role in the hue vocabulary

`hue="primary"` maps to `--rf-color-primary` / `--rf-color-primary-bg`, with `--rf-color-border`
for the border. It means "the brand colour" and passes no judgement, which is what GitHub's
IMPORTANT alert means.

It belongs in the hue vocabulary rather than in sentiment: it is an identity, not a judgement.
Without it, a definition author who wants "stands out" would pick a literal hue such as
`purple`, and the theme could no longer reinterpret it (D7).

### D5 — the chart series is a theme-ordered list of hues

```ts
color: {
  series?: [HueName, HueName, HueName, HueName, HueName, HueName];   // default: ['blue', 'teal', 'green', 'yellow', 'purple', 'pink']
}
```

The generator emits `--rf-chart-series-<n>: var(--rf-color-hue-<name>)` for each entry. The six
hex declarations leave `packages/lumina/styles/runes/chart.css`. The `--rf-chart-series-*`
names, and with them SPEC-083's theming contract, do not change.

Auto-assigned colour is the one place an index is right: nobody chooses series 3, it is just the
third. The theme chooses which hue comes third. A preset may reorder the list or repeat a hue, but the
list has exactly six entries. The renderer wraps series at a fixed `SERIES_COUNT = 6`
(`packages/behaviors/src/elements/chart.ts`) and `chart.css` has one rule per index, so a
variable length would be a renderer change. It is left for when a theme asks for one.

Lumina's series colours move from the current Tailwind-like hex to Lumina's hues. That is a
visible change, reviewed in the gallery. Pinning the old hex values would keep a second,
unreachable palette alive, which is what this decision removes.

Sentiment-coloured chart marks (`[data-meta-sentiment]` in `chart.css`) are unchanged and still
override the series colour.

### D6 — values get hue too: `data-meta-hue`

At the value scope, `{% badge hue="purple" %}` emits `data-meta-hue="purple"`. Lumina maps it to
`--meta-color` in `packages/lumina/styles/dimensions/metadata.css`, next to the sentiment rules,
with the same rule that hue wins when a value carries both.

`badge` is inline and carries no universal axes (SPEC-163 D5), so it declares its own `hue`
attribute with the same vocabulary, just as it keeps its own `sentiment`. Tag badges are the
most common categorical colour authors write today.

`data-meta-hue` is distinct from `data-hue` for the reason SPEC-163 D2 gives for sentiment: a
`teal` region holding a `pink` badge must not be matched by one selector.

### D7 — definitions say roles; content says hues

The layers suggest who uses which:

- **A rune config or composition definition** maps its own vocabulary to **roles**: sentiment,
  or `hue="primary"`. A composed `hint` maps `type: warning → sentiment: caution`, not
  `→ hue: yellow`, so a theme can still decide how a warning looks.
- **A content author** picks a **hue** when the colour carries no judgement, for example
  "this phase is purple".

A definition *may* default to a named hue: `defaultHue` accepts the whole vocabulary, and some
definitions are categorical by nature. This is guidance in the rune-authoring docs, not a check.
Enforcing it would forbid the legitimate cases and catch little.

## Not in scope

- **Field-level `hueMap`.** A `sentimentMap` beside a `hueMap` is a natural pair, but a
  definition-level map from values to hues is exactly what D7 tells definitions to avoid. Add it
  when a categorical field asks for it, naming that field.
- **Composing `hint`.** This spec and SPEC-163 both serve it. The conversion stays gated on
  SPEC-145 D13 and D14, as SPEC-163 records.
- **Hue-keyed icons.** SPEC-163 leaves the question of how intent maps to icons open. Hue adds
  nothing to it.
- **Aggregate and collection group colours.** {% ref "WORK-357" /%} projects sentiment per
  group. Colouring groups by series hue is a natural follow-up and reuses D5 unchanged.
- **Contrast enforcement.** `token-validate` could check each hue's `base` against its `bg` and
  the page background. That is worth doing for every role token, not just hues, so it is its own
  change.

## Acceptance Criteria

- [ ] `HueName` (`gray | red | orange | yellow | green | teal | blue | purple | pink`) and an optional `color.hue` of `HueTokens` exist in `packages/types/src/token-contract.ts`, and `theme-tokens.schema.json` accepts them
- [ ] The token stylesheet emits `--rf-color-hue-<name>[-bg|-border]` with the D2 fallback chain, and `token-validate` reports `hue-unset` for an integrated preset that leaves `orange`, `teal`, `purple` or `pink` unset
- [ ] `color.hue.*` is scope-eligible in `filterScopeEligible`; sentiments stay excluded
- [ ] `hue` is a universal attribute (the nine hues plus `primary`) owned by a new `hue` axis in `AXIS_ATTRIBUTES`; its facet emits `data-hue` on the chrome carrier, and `RuneConfig.defaultHue` exists
- [ ] SPEC-163's `--sentiment-color` is renamed `--region-color`; Lumina maps both `[data-sentiment]` and `[data-hue]` to it in a dimension file, hue rules after sentiment rules
- [ ] `refrakt validate` warns `sentiment-hue-conflict` when one tag carries both attributes, and not when a hue overrides a default sentiment
- [ ] `color.series` (six hue names) exists with the D5 default; the generator emits `--rf-chart-series-1…6` from it; the hex declarations are removed from `chart.css`
- [ ] `{% badge hue %}` emits `data-meta-hue`, and Lumina colours it through `--meta-color`
- [ ] Every first-party integrated preset in `packages/lumina/src/presets/` sets all nine hues from its own palette
- [ ] Contracts are regenerated on both copies and the diff reviewed; the SEO baseline does not move; the gallery's chart change is reviewed
- [ ] The theme-authoring dimensions and token pages document the hue palette, its fallbacks and the series list; the rune-authoring patterns page records D7's roles-vs-hues guidance

## References

- {% ref "SPEC-163" /%}: the sentiment axis this sits beside. This spec renames its `--sentiment-color` (D3).
- {% ref "SPEC-056" /%}: the optional-role-with-fallback pattern D2 follows.
- {% ref "SPEC-083" /%}: the chart theming contract whose series palette D5 moves into the token contract.
- {% ref "SPEC-053" /%} and {% ref "SPEC-165" /%}: tint and the `color` primitive, the literal-colour layer.
- {% ref "SPEC-107" /%}: the `elevation` axis, whose facet shape `hue` follows.
- {% ref "ADR-043" /%}: why the vocabulary is closed.

{% /spec %}
