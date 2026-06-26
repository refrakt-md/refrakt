{% work id="WORK-481" status="ready" priority="medium" complexity="moderate" source="SPEC-100" tags="carousel,collapse,layout,container-queries,preview,css" milestone="v0.26.0" %}

# Container-query collapse contract + responsive-preview simulation

The shared `data-collapse` responsive contract ({% ref "WORK-469" /%}, {% ref "WORK-473" /%}) is
`@media`-based: beside→stack collapse (`split.css`), grid→1-column reflow (`feature.css`), and
collapse-to-carousel (`carousel.css`) all key off the **global viewport**. Two consequences:

1. A rune in a narrow column (e.g. a `feature` inside the docs layout beside a sidebar, or any
   nested context) collapses on *viewport* width, not its **own available width** — so it can stay
   in a multi-column grid while visibly cramped, or collapse while it actually has room.
2. The `preview` rune's responsive viewport selector (`responsive="mobile,tablet,desktop"`) only
   sets `max-width` on a plain `<div>` frame — it does **not** simulate `@media` breakpoints. So
   `collapse-to="carousel"` (and every other `data-collapse` flip) cannot be demonstrated via the
   selector; the frame just narrows and width-intrinsic layouts (auto-fit grids) reflow, but the
   media-query-gated flips never fire. This is why the `feature` carousel doc example ships as
   always-on `layout="carousel"` rather than the more representative grid + `collapse-to="carousel"`.

Container queries fix both: a rune should respond to the **container it sits in**, and the preview
frame can become that container so the selector drives the breakpoints accurately. The groundwork
exists — `.rf-page-content` is already `container-type: inline-size` (`default.css`) and `@container`
is already used in 9 style files.

## Scope

- Convert the shared `data-collapse` collapse rules from `@media (max-width: …)` to
  `@container (max-width: …)` in the three contract files: `split.css` (beside→stack),
  `feature.css` (grid→1-col), `carousel.css` (collapse-to-carousel + the existing `--constrained`
  blocks). Same sm/md/lg breakpoints and `data-collapse` hook; `never` still opts out.
- Make `.rf-preview__viewport-frame` a container (`container-type: inline-size`) so a previewed
  rune queries the **frame** width — the viewport selector then accurately drives the collapse
  breakpoints. Confirm the preview's own existing `@container` chrome rules (toolbar/canvas, which
  live *outside* the frame) are unaffected (they continue to query `.rf-page-content`).
- Restore the `feature` carousel doc example to grid + `collapse-to="carousel"` with
  `responsive="mobile,tablet,desktop"` once the flip is simulable, and update the prose.

## Non-goals

- No `matchMedia` mount/unmount in the behavior layer (SPEC-100 ruled this out; the responsive path
  stays CSS/touch-only — no JS nav on collapse).
- No change to the breakpoint *values* (sm/md/lg) or the `data-collapse` author API.

## Acceptance Criteria
- [ ] The `data-collapse` collapse rules in `split.css`, `feature.css`, and `carousel.css` are container-query driven (`@container`), keyed off the nearest container (`.rf-page-content` on real pages), with the sm/md/lg breakpoints and `never` opt-out unchanged.
- [ ] A rune in a narrow column collapses on its own available width, not the global viewport (verified for a `feature` in the docs layout beside the sidebar).
- [ ] `.rf-preview__viewport-frame` is a container, so a previewed rune's collapse flips track the viewport selector (`mobile` flips `collapse-to="carousel"` to a swipe row; `tablet`/`desktop` keep the grid).
- [ ] The preview's existing `@container` chrome rules (toolbar/canvas bleed) are unaffected by the new frame container.
- [ ] Cross-layout visual pass: marketing (full-bleed), docs (sidebar column), and anchored-measure page sections collapse at sensible points; document any intentional breakpoint shifts vs. the old viewport-relative behavior.
- [ ] The `feature` carousel doc example is restored to grid + `collapse-to="carousel"` with a responsive preview, and the prose explains the flip.

## Approach

Mechanical `@media`→`@container` swap in the three files, relying on the existing
`.rf-page-content` container. Key risk is **semantic shift**: `@container` measures the content
column, which is narrower than the viewport (especially docs pages with a sidebar), so flips will
fire at a *wider viewport* than today — arguably more correct, but a site-wide visual change that
needs the cross-layout pass above. Note a full-bleed `data-width="full"` rune still queries
`.rf-page-content` (its container ancestor), not its own bled width — confirm that collapse point is
acceptable or scope an explicit container on bled hosts. Land behind the v0.26.0 carousel epic so it
can be reverted independently if the breakpoint shift proves undesirable.

## Dependencies

- {% ref "WORK-469" /%} — the `data-collapse` hook being converted.
- {% ref "WORK-473" /%} — the collapse-to-carousel CSS target being converted.
- {% ref "WORK-474" /%} — `feature` carousel adoption (the doc example restored here).

## References

- Spec: {% ref "SPEC-100" /%} (carousel as a shared layout mode), {% ref "SPEC-099" /%} §3 (`collapse` semantics).
- Prior art: existing `@container` usage in `default.css`, `split.css`, `bento.css`, `hero.css`, `mockup.css`, `docs.css`.
- Origin: discovered while fixing the `feature` carousel doc example — the preview viewport selector could not demonstrate `collapse-to="carousel"` because the flip is `@media`-gated and the frame is width-only.

{% /work %}
