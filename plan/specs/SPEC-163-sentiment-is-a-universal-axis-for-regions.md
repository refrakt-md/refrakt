{% spec id="SPEC-163" status="draft" tags="theme, axes, vocabulary, intent, hint, composition, metadata" %}

# Sentiment is a universal axis for regions

## Summary

refrakt can already say that a **value** is good, bad or worrying: `data-meta-sentiment`
(`positive | negative | caution | neutral`), set by a field's `sentimentMap`, by
`{% badge sentiment %}` and by `{% progress sentiment %}`. Lumina colours it through
`--meta-color` (`packages/lumina/styles/dimensions/metadata.css`).

It cannot say the same of a **region**. The one rune that needs it, `hint`, keeps its own
copy:

- `type` (`note | warning | caution | check`) is a BEM modifier;
- `packages/lumina/styles/runes/hint.css` maps each modifier to a colour by hand
  (`.rf-hint--note { --hint-color: var(--rf-color-info) }`, and so on).

A theme that has never seen `hint` cannot colour it, and a composition cannot express it. That
is the third of the three things {% ref "ADR-042" /%}'s follow-up found standing between `hint`
and a composition. The other two are the keyed strings of {% ref "SPEC-145" /%} D13 and the
chrome carrier of D14.

This spec adds `sentiment` as a universal axis. It uses the value vocabulary plus `info`,
emits `data-sentiment` on the region, and is keyed by themes the same way `data-elevation` is.

## Decisions

### D1 — the vocabulary is the value vocabulary plus `info`

`positive | negative | caution | neutral | info`.

The first four are `data-meta-sentiment`'s existing values, with the same meanings. One
vocabulary at two scopes lets a theme draw them from the same tokens.

`info` is new. It means "notice this" with no judgement attached, which is what a `note` hint
is. `neutral` is not that: Lumina draws `neutral` as muted (`--rf-color-muted`), the colour of
something you can skip. A note is drawn in `--rf-color-info`. Folding the two together would
turn every note grey.

`info` is added at the value scope too. A `sentimentMap` may then map to it, and a
`{% badge sentiment="info" %}` becomes possible. That keeps one closed vocabulary rather than
two that almost match.

### D2 — the attribute is `sentiment`, the marker is `data-sentiment`

Two names were taken or misleading:

- **`tone`** is taken. It is part of the background layer (`scrim-tone`, owned by `bg` in
  `AXIS_ATTRIBUTES`, `packages/runes/src/universal-attributes.ts`), and two meanings of "tone"
  on one rune would read as one.
- **`intent`** is too broad. Everything in the presentation vocabulary is intent.

`sentiment` is already the author-facing word on `badge` and `progress`, with these values, so
the universal attribute reuses it rather than adding a synonym.

The region marker is `data-sentiment`, distinct from `data-meta-sentiment`. A region and a
value inside it can then disagree, for example a `caution` hint containing a `positive` badge.
A selector for one must not match the other.

### D3 — what the axis emits, and what a theme draws

The facet resolves the attribute, or the rune's `defaultSentiment`, and emits
`data-sentiment="…"` on the chrome carrier. It sets no class and no colour. This is
`elevation`'s shape (`packages/transform/src/facets/elevation.ts`). A value outside the
vocabulary is rejected at parse time by `matches`.

The skin maps each value to one custom property, `--sentiment-color`, from the existing
tokens:

| Value | Token |
|---|---|
| `positive` | `--rf-color-success` |
| `negative` | `--rf-color-danger` |
| `caution` | `--rf-color-warning` |
| `info` | `--rf-color-info` |
| `neutral` | `--rf-color-muted` |

What a region does with the colour is the theme's choice. Lumina's choice, carried over from
`hint.css`, is that the colour reaches the region's **header** (icon and title) and the surface
stays neutral. In `hint.css`'s words: "a quiet panel, not a saturated banner". A theme that
wants a tinted panel keys `[data-sentiment]` and does that.

`sentiment` does not change the region's surface, elevation or tint. A region that wants a
sentiment-coloured surface combines it with `tint`, which already owns colour overrides
(SPEC-053).

### D4 — hint moves onto the axis without changing output

`hint` declares `defaultSentiment` from its `type`:

| `type` | sentiment |
|---|---|
| `note` | `info` |
| `warning` | `caution` |
| `caution` | `negative` |
| `check` | `positive` |

This is a declared mapping from a modifier to an axis value. `sentimentMap` already does the
same job for fields, so the rune config takes a `sentimentFrom: { modifier, map }` entry rather
than a hand-written `postTransform`.

The four per-variant rules in `hint.css` are deleted. The header colour comes from
`--sentiment-color`, and the comparison is pixel-identical in Lumina.

The `rf-hint--note` and other BEM modifiers stay, because `type` is still a modifier. An author
may override the sentiment (`{% hint type="note" sentiment="positive" %}`). That is legal and
renders as positive, because the attribute wins over the default.

### D5 — progress's own attribute becomes the axis

`progress` declares its own `sentiment` attribute (`positive | caution | negative`,
`packages/runes/src/tags/progress.ts`) and passes it through as a meta. It has the same name and
meaning, over a subset of the vocabulary.

The axis replaces it: `progress` stops declaring the attribute and reads the axis. Its accepted
values widen to the full vocabulary. Its output keeps `data-meta-sentiment` on the bar, because
that is a value scope, so existing CSS keeps matching.

`badge` is inline (`declareUniversalPosture(badge, 'inline')`), carries no universal axes, and
keeps its own attribute.

### D6 — the axis is available to compositions like any other

A composed rune gets `sentiment` like any universal attribute. Its definition may set a default
through the frontmatter defaults of SPEC-145 D14.

A composed `hint` therefore has every prerequisite once D13 and D14 land:

- its icon and label come from a keyed enum;
- its colour comes from this axis;
- its surface comes from `elevation: sunken`.

That case is recorded in ADR-042's follow-up, not decided here.

## Not in scope

- **Composing `hint`.** This spec makes it possible and states what is left. The conversion is
  a separate change, gated on SPEC-145 D13 and D14.
- **Icons per sentiment.** Today `hint` draws a different icon per `type` through the `hint`
  icon group. Whether an icon can be keyed on sentiment rather than on a rune's own enum belongs
  to the wider question of how intent maps to icons. That question is open and not decided
  here.
- **Other runes.** No other region in the catalog has a sentiment today. A plan `bug`'s
  severity, or a `decision`'s status, could plausibly use one. Each would be a separate change
  that names its mapping.

## Acceptance Criteria

- [ ] `sentiment` is a universal attribute (`positive | negative | caution | neutral | info`) owned by a new `sentiment` axis in `AXIS_ATTRIBUTES`, and its facet emits `data-sentiment` on the chrome carrier
- [ ] `RuneConfig.defaultSentiment` and `sentimentFrom: { modifier, map }` exist; an author attribute overrides both
- [ ] `info` is accepted by `sentimentMap` and by `{% badge sentiment %}`, and Lumina colours `[data-meta-sentiment="info"]`
- [ ] Lumina maps `[data-sentiment]` to `--sentiment-color` from the existing tokens, in a dimension file, not in a rune file
- [ ] `hint` declares `sentimentFrom` on `type`; the four per-variant rules in `hint.css` are deleted; the gallery shows no visual change
- [ ] `progress` reads the axis instead of declaring its own `sentiment`; its output still carries `data-meta-sentiment`
- [ ] Contracts are regenerated on both copies and the diff reviewed; the SEO baseline does not move
- [ ] The theme-authoring dimensions page documents the axis, and the difference between `data-sentiment` (a region) and `data-meta-sentiment` (a value)

## References

- {% ref "ADR-042" /%}: hint is one of the three native runes it left open; this is one of the three prerequisites for composing it.
- {% ref "SPEC-145" /%} D13 (keyed strings) and D14 (the chrome carrier): the other two prerequisites.
- {% ref "SPEC-107" /%}: the `elevation` axis, whose shape this follows.
- {% ref "SPEC-053" /%}: `tint`, which owns colour overrides; sentiment does not.

{% /spec %}
