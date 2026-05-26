---
title: Progress
description: A generic completion bar — render a ratio from supplied numbers, with an optional label and sentiment variant
---

# Progress

`{% progress %}` is a generic, presentational completion bar. You give it numbers — a `value`/`max` pair or a direct `percent` — and it renders a labelled bar. It computes nothing itself: the data is always supplied, either inline or fed from an aggregate (see [Feeding from data](#feeding-from-data)).

```markdoc
{% progress value=3 max=4 %}Acceptance criteria{% /progress %}
```

## Input

Two ways to express the ratio:

- **`value` + `max`** (primary) — a count, e.g. `value=12 max=20`. Yields a "12/20" readout.
- **`percent`** (alternative) — a direct `0–100` value when there's no count, e.g. `percent=60`.

If both are given, `value`/`max` wins. The percentage is clamped to 0–100; a `max` of `0` (or absent) renders an empty bar with no numeric readout — never `NaN`.

## Readout — `display`

`display` controls the text beside the bar:

| `display` | Output |
|-----------|--------|
| `fraction` (default with `value`/`max`) | `12/20` |
| `percent` | `60%` |
| `none` | *(no readout)* |

## Label

An optional **body** is the label — it may hold inline markup, and its text also becomes the bar's accessible name (`aria-label`):

```markdoc
{% progress percent=80 %}Funding goal{% /progress %}
```

## Variant

`variant` tints the fill (`positive` / `caution` / `negative`); the neutral `default` uses the theme primary. There is **no** automatic threshold coloring — the variant is always explicit.

```markdoc
{% progress value=2 max=10 variant="caution" /%}
```

## Feeding from data

`progress` reads only what you pass it, so a live value comes from a variable — typically an aggregate a plugin writes onto an entity. For example, a milestone page fed its completion rollup:

```markdoc
{% progress value=$item.data.progressDone max=$item.data.progressTotal %}Completion{% /progress %}
```

The rune stays generic; computing `progressDone`/`progressTotal` is the data layer's job.

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | number | — | Completed amount (paired with `max`). |
| `max` | number | — | Total amount (paired with `value`). |
| `percent` | number | — | Direct percentage 0–100, when there's no count. |
| `display` | `fraction` \| `percent` \| `none` | `fraction` (with value/max) | The numeric readout. |
| `variant` | string | `default` | Fill tint (`positive` / `caution` / `negative`). |

## Output contract

```html
<div class="rf-progress" data-rune="progress" data-variant="default"
     role="progressbar" aria-valuenow="3" aria-valuemin="0" aria-valuemax="4"
     aria-label="Acceptance criteria" style="--rf-progress: 75%">
  <span class="rf-progress__label">Acceptance criteria</span>
  <span class="rf-progress__value">3/4</span>
  <span class="rf-progress__track"><span class="rf-progress__fill"></span></span>
</div>
```

The fill width is driven by the `--rf-progress` custom property, so themes restyle the bar without touching the markup.

## See also

- [collection](/runes/collection) — pair `progress` with a per-item template to show a bar per entity.
- The `stat` rune (single big number + label) is a separate, complementary primitive.
