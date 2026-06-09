{% work id="WORK-375" status="done" priority="low" complexity="simple" source="SPEC-089" tags="surfaces, runes, lumina, layout" milestone="v0.20.0" %}

# Default cover scrim bound to content-place

Turn on a default scrim in cover mode targeting the media surface, with direction following `content-place`.

## Acceptance Criteria
- [x] A default scrim is applied in `cover` mode (consuming the SPEC-088 scrim facet), targeting the media surface (SPEC-087 routing); `scrim="none"` disables.
- [x] Scrim direction follows `content-place` by default and is independently overridable; the scrim region tracks the content area.
- [x] The cover overlay's foreground colour follows `scrim-tone` (a scoped tint of the cover region — light text on a darkened light card by default; scoped to the band in `header` scope); an explicit `tint` overrides for a bespoke overlay colour.

## Approach
Depends on the SPEC-088 scrim facet (WORK-371). SPEC-089 §3.

## References

- {% ref "SPEC-089" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/spec-089-cover-layout`

### What was done
- `packages/lumina/styles/dimensions/cover.css` — a default scrim in cover mode on the media surface (`[data-media-position="cover"]:not([data-scrim="none"]) [data-section="media"]::after`), a gradient weighted toward the content edge via `--cover-scrim-dir`. `scrim="none"` disables it (host signal from the engine).
- Scrim direction follows `content-place` by default (`content-place` block-start → `to bottom`, else `to top`) and is independently overridable: `packages/transform/src/engine.ts` maps an explicit `scrim="top|bottom|left|right"` (the SPEC-088 facet, now matching `none`) to `--cover-scrim-dir`, overriding the content-place default.
- Cover foreground follows `scrim-tone`: full scope sets `data-color-scheme` (= scrim-tone, default `dark` → light text) on the root; header scope scopes it to the `cover-band` (variant layout `attrs`), leaving the body on the page palette. An explicit `tint`/`data-color-scheme` wins.
- `packages/runes/src/lib/index.ts` — `scrim` matches gain `none`; the bg-block scrim build + trigger are guarded with `scrimDir !== 'none'` so `scrim="none"` doesn't create a stray scrim element.

### Notes
- Header-scope foreground uses the band's static dark scheme (the common case); a bespoke tone there is reachable via `tint`.

{% /work %}
