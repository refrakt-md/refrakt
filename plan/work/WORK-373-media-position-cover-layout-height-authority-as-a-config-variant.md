{% work id="WORK-373" status="done" priority="medium" complexity="complex" source="SPEC-089" tags="surfaces, runes, engine, lumina, layout" milestone="v0.20.0" %}

# media-position=cover layout + height authority (as a config variant)

Add `media-position="cover"` as an engine config variant (full/header scope) with the height-authority precedence, superseding the split knobs.

## Acceptance Criteria
- [x] `media-position` gains `cover`: the media well fills the rune interior (thin-edge frame + `--rf-radius-media` preserved) and content overlays it; switching from `top|bottom|start|end` is a one-attribute change on the same content.
- [x] Cover scope (`full`|`header`, rune-declared, override-able) bounds the overlay region; `header` flows the body below; content beyond the region always flows, never overlays.
- [x] Realized as a `media-position` engine variant (SPEC-091) supplying the cover structure; there is no overlay primitive in the layout config.
- [x] Height authority follows external grid track → media aspect → default portrait; `cover` supersedes `content-height`/`media-ratio`.

## Approach
Gated on WORK-361 (card/bento-cell flat-slot migration). `card.css` (`--rf-card-edge`,`--rf-radius-media`). SPEC-089 §1,§4.

## References

- {% ref "SPEC-089" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/spec-089-cover-layout`

### What was done
- `packages/runes/src/tags/common.ts` — `media-position` matches gain `cover` in `splitLayoutAttributes` (shared by card/recipe/etc.).
- `packages/runes/src/config.ts` (Card) — `cover` realized as a `media-position` engine variant (SPEC-091): `staticModifiers:['cover']` + `rootAttributes:{ 'data-cover-scope':'full' }`. No overlay primitive in the layout config; the base `layout` (media + content wrapper) is the prerequisite.
- `plugins/learning/src/config.ts` (Recipe) — header-scope cover variant: regroups the flat slots into a `cover-band` (media + preamble) over a `body` that flows below; the band carries `data-color-scheme="dark"` via its layout `attrs`.
- `packages/lumina/styles/dimensions/cover.css` — full-scope and header-scope grid stacking (media well + overlay share one cell), `--rf-radius-media` + thin edge preserved. Height authority: external grid track wins, else `--frame-aspect`, else a portrait default (`3/4`). `cover` doesn't apply the split grid, so `media-ratio` is inert.
- Imported `cover.css` in both `base.css` and `index.css`.
- `packages/transform/test/cover.test.ts` — engine contract tests for the variant + scope.

### Notes
- bento-cell cover is CSS-only (keyed on `data-media-position="cover"` from bento.ts) since `media-position` isn't a declared modifier there.

{% /work %}
