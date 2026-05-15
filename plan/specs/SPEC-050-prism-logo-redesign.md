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

## Variant 2 — Filled Apex

Identical construction to Variant 1, but the top-right region — the triangle beyond the third cut — is filled solid instead of left as negative space. The three thin slices remain on the left; the right side becomes a saturated apex.

Reads as light entering through the cuts and accumulating into a brighter region on the right — same prism, with weight redistributed.

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
  svg .fill { fill: #ffffff; stroke: none; }
  .lg { width: 200px; height: 200px; }
  .md { width: 96px; height: 96px; }
  .sm { width: 32px; height: 32px; }
</style>
<svg class="lg" viewBox="0 0 100 100" aria-label="Refrakt logo, variant 2, large">
  <path class="fill" d="M 34 16 L 90 16 L 62 65 Z" />
  <path d="M 10 16 L 90 16 L 50 86 Z" />
  <line x1="18" y1="16" x2="54" y2="79" />
  <line x1="26" y1="16" x2="58" y2="72" />
  <line x1="34" y1="16" x2="62" y2="65" />
</svg>
<svg class="md" viewBox="0 0 100 100" aria-label="Refrakt logo, variant 2, medium">
  <path class="fill" d="M 34 16 L 90 16 L 62 65 Z" />
  <path d="M 10 16 L 90 16 L 50 86 Z" />
  <line x1="18" y1="16" x2="54" y2="79" />
  <line x1="26" y1="16" x2="58" y2="72" />
  <line x1="34" y1="16" x2="62" y2="65" />
</svg>
<svg class="sm" viewBox="0 0 100 100" aria-label="Refrakt logo, variant 2, favicon">
  <path class="fill" d="M 34 16 L 90 16 L 62 65 Z" />
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
| Apex fill | `(34, 16) → (90, 16) → (62, 65) → close` |

The fill triangle's vertices are exactly Cut 3's top endpoint, the outer triangle's top-right vertex, and Cut 3's bottom endpoint. The strokes bounding the filled region (top edge, right edge, Cut 3) are visually absorbed into the fill since both are white — no special handling needed.

### Notes

- The thin-slice rhythm on the left is preserved, so the mark still reads as "ordered cuts" not just "triangle with corner filled"
- Mass shifts to the right, giving the mark more visual weight than V1 at the same size — useful when the logo sits next to a heavy wordmark
- At favicon scale, the fill survives even if the cuts merge; V1 risks reading as a single triangle, while V2 still has an unambiguous bright/dark asymmetry

-----

## Decision Criteria

Both variants share the same construction — V2 just adds a fill in the top-right region. Pick on visual weight:

1. **Recognizability at 16–32px.** V2 holds together better at the favicon end because the fill remains unambiguous even when the cut strokes merge.
2. **Visual weight.** V1 is all linework — lighter, more delicate, reads as a diagram. V2 has a solid mass — heavier, more present, reads as a mark. Pick to match the rest of the v1.0 visual system.
3. **Wordmark pairing.** V1's lighter weight balances better next to a regular-weight wordmark; V2's heavier weight pairs better with a bold or display wordmark.

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
