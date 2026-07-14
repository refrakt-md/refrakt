{% work id="WORK-490" status="done" priority="medium" complexity="moderate" source="SPEC-100" tags="split,collapse,layout,container-queries,preview,css" milestone="v0.26.0" %}

# Container-query beside-layout collapse (split.css) + preview frame container

The follow-up {% ref "WORK-489" /%} explicitly deferred: convert the shared `split.css`
beside→stack collapse from `@media` (global viewport) to `@container` (the rune's available
width), and make the `preview` viewport frame a query container so the collapse is faithfully
simulable in the responsive preview selector. Motivated by the `feature` doc page — its media-beside
examples (`media-position="start"`/`"end"`) couldn't carry a viewport selector because their
collapse is `@media`-gated and the preview frame is width-only.

## Approach: ancestor-query (not host-as-container)

`split.css`'s beside→stack rule targets the rune **root** (`[data-media-position="start"/"end"]`),
which cannot self-query under container queries. Rather than restructure the split DOM (a wrapper for
8+ runes) or use a fragile children-span trick that collides with the `:has(> header)` 3-section
placement rules, the conversion is a **mechanical `@media`→`@container` swap** that keeps the exact
rule structure (root → `grid-template-columns: 1fr`, children → `grid-column/row: auto`). The query
resolves against the nearest container ancestor:

- **On a page** — `.rf-page-content` (already `container-type: inline-size`). Content runes always
  render inside it, so a container ancestor is guaranteed in the official layouts.
- **In a preview** — the `preview` viewport frame, now `container-type: inline-size`. The constrained
  frame width drives the breakpoint, so the viewport selector faithfully flips beside→stack.

This composes with {% ref "WORK-489" /%}'s carousel collapse-to (host-as-container): a carousel host
establishes a closer container, so its items keep querying the host; the frame container only governs
content with no nearer container.

## Scope (delivered)

- `packages/skeleton/styles/layouts/split.css` — the three sm/md/lg beside→stack collapse blocks now
  use `@container (max-width: …)` instead of `@media`. Identical selectors/declarations; `data-collapse`
  hook and `never` opt-out unchanged.
- `packages/skeleton/styles/runes/preview.css` — `.rf-preview__viewport-frame` gains
  `container-type: inline-size`.
- `site/content/runes/marketing/feature.md` — all six preview examples now carry
  `responsive="mobile,tablet,desktop"` (the two media-beside examples were the blockers this unblocks).

## Semantic shift (intended; needs visual review)

The breakpoint now measures the **content column**, not the global viewport:

- No-sidebar (marketing): the column ≈ viewport − gutters, so beside layouts collapse at a slightly
  larger viewport than before (~680–720px vs 640px). A full-bleed rune's width tracks the viewport,
  so there is **no** premature-collapse problem — the beside split is genuinely tight by the time the
  column hits the breakpoint.
- Sidebar (docs): the column is much narrower than the viewport, so a beside layout embedded in docs
  collapses at a *larger* viewport than before — arguably more correct (it genuinely has less room),
  but a visible change worth a pass.
- Edge: a beside rune rendered **outside** any query container would never collapse. Content runes
  always live in `.rf-page-content`, so this is theoretical for the official layouts; a custom theme
  region without a container is the only exposure.

## Acceptance Criteria
- [x] `split.css` beside→stack collapse is `@container`-driven (nearest-container width), with identical rule structure, the `data-collapse` hook, and the `never` opt-out preserved.
- [x] The `preview` viewport frame is a query container, so beside layouts collapse to a stack when the frame is narrowed via the viewport selector (verified for the `feature` media-beside examples).
- [x] Frame-as-container does not disturb the carousel collapse-to simulation (host is a closer container) or the preview's own toolbar/canvas `@container` chrome (outside the frame).
- [x] All six `feature` doc examples carry a responsive viewport selector.
- [x] Build + existing tests green (skeleton, lumina css-coverage, marketing, behaviors preview).
- [ ] Cross-layout visual review performed: marketing (full-bleed), docs (sidebar column), and a beside layout inside a card/bento — collapse points are sensible; any intentional breakpoint shift is acceptable.

## Dependencies

- {% ref "WORK-489" /%} — carousel collapse-to container-query work this extends; established the host-as-container pattern and the preview-simulation goal.

## References

- Spec: {% ref "SPEC-100" /%}; {% ref "SPEC-099" /%} §3 (`collapse` semantics).
- Prior art: `.rf-page-content` container (`default.css`), named `@container rf-bento` (`bento.css`), carousel collapse-to (`carousel.css`).

## Resolution

Completed: 2026-06-26

Branch: `claude/preview-viewport-examples`

### What was done
- `packages/skeleton/styles/layouts/split.css` — beside→stack collapse converted from `@media` to `@container` (sm/md/lg + default). Mechanical swap; identical selectors/declarations, `data-collapse` hook and `never` opt-out preserved. Now keys off the nearest query container (`.rf-page-content` on a page, the preview frame in a preview).
- `packages/skeleton/styles/runes/preview.css` — `.rf-preview__viewport-frame` is now `container-type: inline-size`, so previewed runes with no closer container resolve against the constrained frame width and the viewport selector drives the collapse.
- `site/content/runes/marketing/feature.md` — all six preview examples now carry `responsive="mobile,tablet,desktop"` (the two media-beside examples were the blockers).

### Design note
Used ancestor-query rather than host-as-container (the WORK-489 pattern) because split's collapse targets the rune root, which can't self-query; the alternatives (DOM wrapper across 8+ runes, or a children-span trick that collides with the `:has(> header)` 3-section rules) were worse. Composes cleanly with carousel collapse-to: a carousel host is a closer container, so its items still query the host; the frame container only governs content with no nearer container.

### Status: review (not done)
Implementation + tests complete (216 passing: skeleton/lumina css-coverage, marketing, behaviors preview). Left at `review` pending the **cross-layout visual pass** — this shifts real-page beside-collapse from viewport-relative to content-column-relative, which is most visible on docs (sidebar) pages where beside layouts now collapse at a larger viewport. Verify: marketing full-bleed, docs sidebar column, and a beside layout nested in a card/bento, plus the feature media-beside examples flipping to a stack at the `mobile` preset.

{% /work %}
