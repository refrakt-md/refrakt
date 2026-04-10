{% work id="WORK-082" status="done" priority="high" complexity="moderate" tags="lumina, css, transform, architecture" source="SPEC-028" %}

# Shared Split Layout CSS with Two-Mode Mobile Collapse

> Ref: SPEC-028 (Rune Output Standards — Standard 7)

Depends on: WORK-079 (Playlist alignment), WORK-080 (Realm/Faction alignment)

## Summary

Migrate duplicated split layout grid placement CSS from per-rune files into the shared `split.css` using structural attribute selectors. Implement two-mode mobile collapse: preamble-first (default, for marketing runes) and content-first (opt-in via `data-media-position="top"`, for content runes).

## Acceptance Criteria

- [ ] `split.css` defines explicit grid column/row placement for the 3-section pattern using `[data-section]` and `[data-name]` attribute selectors
- [ ] `split.css` handles split-reverse placement via the same selectors
- [ ] Default mobile collapse resets to DOM order (preamble-first — marketing runes like Hero, Feature, Step)
- [ ] Content-first mobile collapse hoists media above preamble via `order: -1`, gated on `[data-media-position="top"]`
- [ ] Full-bleed card header treatment (negative margins, border-radius reset) in shared layer, gated on `[data-media-position="top"]`
- [ ] Split media box-shadow moved to shared layer
- [ ] Media zone container base styles (border-radius, overflow, img block sizing) moved to shared `media.css` or dimension layer
- [ ] Content rune configs (recipe, playlist, realm, faction) emit `data-media-position="top"` via engine config modifier or meta tag
- [ ] Marketing rune configs (hero, feature, step) do NOT emit `data-media-position` (use default preamble-first behavior)
- [ ] Per-rune split layout CSS removed from `recipe.css` (~60 lines), `playlist.css` (~55 lines)
- [ ] Per-rune CSS files retain only domain-specific body content styling
- [ ] CSS coverage tests pass
- [ ] Visual regression check: recipe and playlist split layouts render correctly at desktop and mobile breakpoints
- [ ] Visual regression check: hero, feature, and step split layouts render correctly at desktop and mobile breakpoints (preamble leads on mobile)

## Approach

1. Add `data-media-position` modifier support to the engine config for content runes (recipe, playlist, realm, faction)
2. Extend `split.css` with explicit grid placement rules using `[data-section]`/`[data-name]` selectors
3. Add two-mode mobile collapse rules: default (DOM order) and `[data-media-position="top"]` (media hoisted)
4. Move shared media container styles to the dimension layer
5. Strip duplicated grid/collapse CSS from per-rune files
6. Run CSS coverage tests and verify visually

## References

- SPEC-028 (Standard 7 — Shared Split Layout CSS via Structural Selectors)
- SPEC-028 (Two-Mode Mobile Collapse section)
- WORK-079 (Playlist structural alignment — prerequisite)
- WORK-080 (Realm/Faction structural alignment — prerequisite)

{% /work %}
