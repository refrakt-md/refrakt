{% spec id="SPEC-050" status="draft" tags="branding, design, logo" %}

# Refrakt Brand Logo — Prism Redesign

As refrakt closes in on v1.0, the brand mark deserves a refresh. The next logo should be a monochrome flat icon — something that reads instantly at favicon size, scales cleanly to hero size, and feels honest to the product.

The brand metaphor we keep coming back to is a **prism**: refrakt takes one input (markdown) and refracts it into many outputs (themes, layouts, components, frameworks). Two prism variants are captured below for comparison. Both are equilateral triangles pointing downward, drawn in white on the lumina dark navy background (`--rf-color-bg` = `#152238`).

## Constraints

- Equilateral triangle, pointing down
- Monochrome — white strokes/fills only, no gradients or shadows
- Single SVG, no rasters
- Must read clearly from 16px (favicon) to 200px+ (hero)
- Background is lumina dark navy (`#152238`)

## Geometry

Both variants share the same outer triangle so they're visually comparable. ViewBox is `0 0 100 100`; vertices are `(10, 16)`, `(90, 16)`, `(50, 86)` — side length 80, height 70, near-equilateral (true equilateral height for side 80 is 69.28, so we're 0.7 units off — visually indistinguishable, mathematically convenient).

-----

## Variant 1 — Parallel Cuts

Three lines run parallel to the **left** edge of the triangle, close to that edge and tightly spaced. They cut the triangle into four parts: three thin slices on the left, and one larger triangle in the top right (negative space, no fill).

Reads as ordered, structural — input on the left being progressively organised toward the right.

{% sandbox height=320 %}
<style>
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    background: #152238;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 56px;
    flex-wrap: wrap;
    padding: 32px;
    box-sizing: border-box;
  }
  svg {
    stroke: #ffffff;
    fill: none;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    overflow: visible;
  }
  .lg { width: 200px; height: 200px; }
  .md { width: 96px; height: 96px; }
  .sm { width: 32px; height: 32px; }
</style>
<svg class="lg" viewBox="0 0 100 100" aria-label="Refrakt logo, variant 1, large">
  <path d="M 10 16 L 90 16 L 50 86 Z" />
  <line x1="18" y1="16" x2="54" y2="79" />
  <line x1="26" y1="16" x2="58" y2="72" />
  <line x1="34" y1="16" x2="62" y2="65" />
</svg>
<svg class="md" viewBox="0 0 100 100" aria-label="Refrakt logo, variant 1, medium">
  <path d="M 10 16 L 90 16 L 50 86 Z" />
  <line x1="18" y1="16" x2="54" y2="79" />
  <line x1="26" y1="16" x2="58" y2="72" />
  <line x1="34" y1="16" x2="62" y2="65" />
</svg>
<svg class="sm" viewBox="0 0 100 100" aria-label="Refrakt logo, variant 1, favicon">
  <path d="M 10 16 L 90 16 L 50 86 Z" />
  <line x1="18" y1="16" x2="54" y2="79" />
  <line x1="26" y1="16" x2="58" y2="72" />
  <line x1="34" y1="16" x2="62" y2="65" />
</svg>
{% /sandbox %}

### Construction

| Element | Coordinates |
|---|---|
| Outline | `(10, 16) → (90, 16) → (50, 86) → close` |
| Cut 1 | `(18, 16) → (54, 79)` |
| Cut 2 | `(26, 16) → (58, 72)` |
| Cut 3 | `(34, 16) → (62, 65)` |

Cuts spaced 8 units apart along the top edge. All four strokes share the same weight (3 in viewBox units, ≈3% of width).

### Notes

- Negative-space triangle in the top-right is intentional — no fill, the prism shape carries it
- At 32px the cuts may visually merge into a thicker single stroke. Inspect the favicon-sized SVG above
- Cut count is fixed at 3 — fewer reads as a "Z" shape; more loses the "thin slices" character

-----

## Variant 2 — Open Prism with Bottom Fill

The outline is intentionally incomplete: only the **top and right** edges are drawn, leaving the left side open. Inside, two horizontal lines run parallel to the top edge — shorter than it, inset from where the left side would have been. Below the second line, a small triangular space is filled solid, anchoring the mark.

Reads as light entering from the upper-left through the open edge, refracting downward, and concentrating into the saturated bottom point.

{% sandbox height=320 %}
<style>
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    background: #152238;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 56px;
    flex-wrap: wrap;
    padding: 32px;
    box-sizing: border-box;
  }
  svg {
    stroke: #ffffff;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    overflow: visible;
  }
  svg .stroke { fill: none; }
  svg .fill { fill: #ffffff; stroke: none; }
  .lg { width: 200px; height: 200px; }
  .md { width: 96px; height: 96px; }
  .sm { width: 32px; height: 32px; }
</style>
<svg class="lg" viewBox="0 0 100 100" aria-label="Refrakt logo, variant 2, large">
  <path class="stroke" d="M 10 16 L 90 16 L 50 86" />
  <line class="stroke" x1="30" y1="37" x2="78" y2="37" />
  <line class="stroke" x1="40" y1="58" x2="66" y2="58" />
  <path class="fill" d="M 40 58 L 66 58 L 50 86 Z" />
</svg>
<svg class="md" viewBox="0 0 100 100" aria-label="Refrakt logo, variant 2, medium">
  <path class="stroke" d="M 10 16 L 90 16 L 50 86" />
  <line class="stroke" x1="30" y1="37" x2="78" y2="37" />
  <line class="stroke" x1="40" y1="58" x2="66" y2="58" />
  <path class="fill" d="M 40 58 L 66 58 L 50 86 Z" />
</svg>
<svg class="sm" viewBox="0 0 100 100" aria-label="Refrakt logo, variant 2, favicon">
  <path class="stroke" d="M 10 16 L 90 16 L 50 86" />
  <line class="stroke" x1="30" y1="37" x2="78" y2="37" />
  <line class="stroke" x1="40" y1="58" x2="66" y2="58" />
  <path class="fill" d="M 40 58 L 66 58 L 50 86 Z" />
</svg>
{% /sandbox %}

### Construction

| Element | Coordinates |
|---|---|
| Open outline | `(10, 16) → (90, 16) → (50, 86)` (no closing segment) |
| Inner line 1 | `(30, 37) → (78, 37)` — at one-third depth, right end on right edge |
| Inner line 2 | `(40, 58) → (66, 58)` — at two-thirds depth, right end on right edge |
| Bottom fill | `(40, 58) → (66, 58) → (50, 86) → close` |

The right end of each inner line sits exactly on the right edge of the triangle. Left ends are inset from the conceptual (undrawn) left edge by ~8 units. The filled triangle's top edge coincides with inner line 2 — the line and fill visually merge into one tapered, weight-shifting form.

### Notes

- The missing left edge is the whole point — light has somewhere to enter
- Line + fill weight progression (thin line, thicker line, solid fill) mimics increasing refraction toward the apex
- At 32px the open edge may not register; what survives is "two strokes plus a downward triangle pointing." That may actually still work
- More directional than Variant 1 — has an obvious top-left "in" and bottom "out"

-----

## Decision Criteria

When picking between them, prioritise in this order:

1. **Recognizability at 16–32px.** Whichever survives the favicon sandbox above wins. If both survive, continue.
2. **Brand fit.** Variant 1 is structural, ordered, neutral. Variant 2 is kinetic, directional, more "refraction-y." Refrakt the product is closer to the latter, but the mark doesn't need to over-explain.
3. **Wordmark pairing.** A symmetric mark (V1) sits more comfortably to the left of a wordmark; an asymmetric mark (V2) needs more breathing room.

## Open Questions

- **Stroke weight.** Currently `3` in a 100-unit viewBox. Try `2.5` for finer linework and `3.5` for bolder. Especially relevant at small sizes.
- **Line caps and joins.** Currently `round`. Sharp `miter` joins with `butt` caps would emphasise the optical/geometric reading at the cost of a slightly harder feel. Worth a side-by-side.
- **Wordmark.** Does the v1.0 brand pair the mark with a "refrakt" wordmark? If so, does the wordmark sit beside or below the mark, and what typeface?
- **Light-mode rendering.** This spec covers white-on-navy only. Light-mode treatment (navy on white? navy on light grey?) is a follow-up.

## Out of Scope

- Animated or interactive variants
- Wordmark typography selection
- Favicon `.ico` packaging, social card variants, app icon padding
- Light-mode colour treatment (deferred until dark-mode mark is locked)

{% /spec %}
