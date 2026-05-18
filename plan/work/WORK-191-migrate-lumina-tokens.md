{% work id="WORK-191" status="ready" priority="high" complexity="medium" tags="lumina, tokens, migration" source="SPEC-048" milestone="v0.14.0" %}

# Migrate existing Lumina tokens to the new contract

Move Lumina's current token values (the implicit set in `packages/lumina/tokens/base.css`) into a `ThemeTokensConfig` exported from `packages/lumina/src/`. The generated stylesheet from that config replaces the hand-authored `base.css` and `dark.css`. End state: Lumina ships a config object, not a CSS file, and renders identically to today.

This is the *migration* step — it preserves the current cream-and-navy appearance. The actual neutral default palette swap happens in {% ref "WORK-200" /%} after this lands.

## Acceptance Criteria

- [ ] Every `--rf-*: value;` declaration in `packages/lumina/tokens/base.css` has a corresponding entry in the new `ThemeTokensConfig`
- [ ] Every dark-mode declaration in `packages/lumina/tokens/dark.css` migrated to `modes.dark` per {% ref "WORK-188" /%}
- [ ] `packages/lumina/tokens/base.css` and `dark.css` deleted; the generated stylesheet from the config replaces them in the published package
- [ ] CSS coverage tests in `packages/lumina/test/css-coverage.test.ts` pass against the generated output
- [ ] Visual regression: a baseline screenshot of the refrakt site rendered against today's Lumina matches the same site rendered against the new config-driven Lumina, pixel for pixel
- [ ] The published `@refrakt-md/lumina` package's runtime output (CSS file, types) preserves the current `--rf-*` custom property names
- [ ] No site or plugin needs to change anything to render identically — Lumina remains a drop-in for what existed before

## Approach

Mechanical conversion. Read `base.css` and `dark.css`, build the equivalent `ThemeTokensConfig` object, run side-by-side visual checks.

Where the current CSS does things the JSON config can't directly express (e.g. `color-mix()` calculations, media queries beyond `prefers-color-scheme`), keep those as a small supplementary CSS file imported alongside the generated stylesheet. Document any such exceptions in the config or a comment in the lumina package — they're escape hatches the contract intentionally leaves open.

The Plex Sans / Plex Mono fonts that tideline will use are *not* set on Lumina's base here — Lumina's base keeps Outfit for the migration step. The font swap is part of {% ref "WORK-203" /%} (Google Fonts loading) and {% ref "WORK-200" /%} / {% ref "WORK-204" /%} (which surface gets which fonts).

This is the work item that lets later items in the milestone proceed against a config-driven Lumina without rebuilding the migration each time.

## Dependencies

- {% ref "WORK-185" /%} — types must exist.
- {% ref "WORK-187" /%} — stylesheet generation pipeline must work.
- {% ref "WORK-188" /%} — mode overlay support must work.
- {% ref "WORK-186" /%} — syntax token rename must land first so the contract reflects the new names.

## References

- {% ref "SPEC-048" /%} — the contract this work materialises in Lumina
- `packages/lumina/tokens/base.css`, `packages/lumina/tokens/dark.css` — files being migrated

{% /work %}
