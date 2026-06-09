{% work id="WORK-378" status="done" priority="low" complexity="moderate" source="SPEC-090" tags="composability, runes, engine, a11y, lumina" milestone="v0.20.0" %}

# href demotion of media guests + cover backdrop pointer-events

Demote a clickable container's media guest to presentational + `pointer-events: none`, and make a cover guest an inert backdrop unconditionally.

## Acceptance Criteria
- [x] A clickable container (`card`/`bento-cell` with `href`) demotes its media guest: renders the static fallback and is `pointer-events: none` so the whole tile links reliably; the demotion is scoped to the media guest only (content-overlay controls stay interactive).
- [x] In `cover` mode the media guest is `pointer-events: none` regardless of `href`; interactive full-bleed guests with overlaid UI are out of scope.
- [x] A container without `href` (and not `cover`) hosts interactive guests normally.

## Approach
Stretched link + z-index lift in `bento.css`/`card.css`. SPEC-090 §2,§4,§5.

## References

- {% ref "SPEC-090" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/spec-090-media-guest-posture`

### What was done
- `packages/transform/src/engine.ts` — after layout assembly, when a rune is a clickable container (a `link` child present, i.e. `card`/`bento-cell` with `href`) OR is `cover` (SPEC-089), the media zone is marked `data-guest-posture="presentational"`. `findInteractiveGuest` scans the media subtree (by `data-rune` → config `interactive`); in a *linked* tile an interactive guest triggers `warnInteractiveGuestInLink` (once per container:guest).
- `packages/lumina/styles/dimensions/guest-posture.css` (new, imported in base.css + index.css) — `[data-section="media"][data-guest-posture="presentational"] { pointer-events: none }`, so clicks over the media fall through to the stretched link / the cover overlay owns interaction.
- Scoped to the media zone only — content-overlay controls (body/footer links, the lifted z-index layer) are outside it and stay interactive.
- Cover: the posture is set regardless of `href` (inert backdrop); the warning fires only for linked tiles (cover full-bleed widgets are out of scope).
- A non-linked, non-cover container sets no posture, so its guest stays fully interactive.
- `packages/transform/test/guest-posture.test.ts` — 6 tests covering all five branches.

### Notes
- Detection is rune-agnostic (any rune with a `link` child + media zone), so it covers card and bento-cell without container-side coupling.

{% /work %}
