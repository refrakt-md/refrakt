---
"@refrakt-md/lumina": minor
---

Two-tier surface rounding + inset media on mobile.

- New semantic radius tokens: `--rf-radius-container` (→ `lg`, 16px) for outer
  surfaces and `--rf-radius-media` (→ `md`, 10px) for media guests nested inside
  them. Cards, the card/inset surface groups, feature items and bento cells move
  to the container tier; the shared `[data-section="media"]` zone and figure /
  recipe images move to the media tier, so a guest never reads as more rounded
  than its container. SPEC-086's `frame` will override these per-instance.
- Media in a `data-media-position="top"` container no longer becomes a full-bleed
  square banner when the layout collapses on mobile — it stays inset within the
  card padding and fully rounded, matching its desktop framed look.
