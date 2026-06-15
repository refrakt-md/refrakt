{% work id="WORK-437" status="done" priority="medium" complexity="simple" source="SPEC-094" milestone="v0.23.0" tags="theme,icons,css,skeleton-skin,config" %}

# Icon-from-config: lift embedded data-URI glyphs out of CSS

The "content, not CSS" finding from the {% ref "WORK-410" /%} spike ({% ref "SPEC-094" /%} §8's
icon-from-config): rune CSS embeds glyph shapes as `data:image/svg+xml` mask-images. Move them to
the theme icon registry so a theme swaps glyph sets without touching CSS.

## Scope

- The embedded mask-image data-URIs (repo-wide: **9 occurrences across 2 files** — `hint`,
  `accordion`) move into the theme icon registry (`config.icons`, the same source the
  `{% icon %}` rune + `icon:` scheme use).
- The skeleton's `::before` reads a CSS custom property (e.g. `mask-image: var(--rf-hint-icon)`)
  fed from config, instead of hard-coding the glyph (see the spike's `icons.json`).
- A theme overriding the icon group re-glyphs the hint/accordion without CSS edits.

## Acceptance Criteria

- [x] No `data:image/svg+xml` mask-image glyphs remain in `hint`/`accordion` CSS; the glyphs come from the icon registry, surfaced via a CSS custom property the skeleton reads.
- [x] Overriding the icon group in theme config re-glyphs the affected runes with no CSS change; tests cover the wiring.

## Dependencies

- Independent; best landed alongside the surface-axis work ({% ref "WORK-423" /%}) since both remove rune-name / embedded-data debt.

## References

- {% ref "SPEC-094" /%} §8 (icon-from-config) · {% ref "WORK-410" /%} FINDINGS §4 + `spike/skeleton-skin/icons.json` · `packages/lumina/styles/runes/{hint,accordion}.css`.

## Resolution

Completed: 2026-06-15

Branch: `claude/v023-skeleton-infra`

### What was done
- Lifted the embedded `data:image/svg+xml` mask-image glyphs out of `hint.css` (4 types × webkit/standard) and `accordion.css` (the disclosure chevron) into the theme icon registry (`config.icons`). The accordion chevron is now `config.icons.accordion.chevron`; the hint glyphs already lived in `config.icons.hint`.
- **Token generator** (`scripts/generate-tokens.mjs`): a new `iconMaskTokenCss(icons, groups)` step emits `:root { --rf-icon-<group>-<name>: url("data:image/svg+xml,…"); }` from the theme icon registry into `tokens/base.css` (loaded in both dev and build). Scoped to the `hint`/`accordion` mask groups; the `global` Lucide set is excluded (those are `{% icon %}` glyphs, not surface masks). `currentColor` is pinned to `black` so the isolated mask renders an opaque silhouette (`background-color` tints it).
- `hint.css` / `accordion.css` now read `var(--rf-icon-hint-*)` / `var(--rf-icon-accordion-chevron)` — no embedded glyph data.

### Verification
- `packages/lumina/test/icon-from-config.test.ts` (6 tests): the generator surfaces the right custom properties; it is **config-driven** (a different glyph in config → a different generated token, same property name → re-glyph with no CSS edit); `currentColor` is pinned; `global` excluded; no `data:image/svg+xml` remains in hint/accordion CSS and they reference the registry-fed properties; the committed `base.css` ships the tokens.
- Token-drift + CSS-coverage tests green; the gallery inlines the icon tokens and still renders the hint icon element.

### Notes
- Build-time generation reads the **theme's** config (`luminaConfig.icons`), satisfying "override in theme config re-glyphs." A future enhancement could route *site-level* `theme.icons` overrides through the runtime token pipeline, but that's beyond this item's "theme config" scope.

{% /work %}
