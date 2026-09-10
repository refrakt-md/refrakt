---
"@refrakt-md/media": patch
"@refrakt-md/runes": patch
"@refrakt-md/cli": patch
---

Make `music-playlist` / `music-recording` real aliases, and let the JSON reference dump carry child runes (BUG-009)

`music-playlist` and `music-recording` were registered as separate runes carrying a self-referential `aliases: ['music-playlist']`, rather than as aliases on `playlist` / `track`. They already shared the primary's transform, so rendering is unchanged — but the duplication printed "Aliases: music-playlist" in the reference, put a phantom duplicate of every playlist attribute in `reference dump --format json`, and forced duplicate theme config entries that then had to be kept in sync by hand. Both spellings still parse.

Separately, `EXCLUDED_RUNES` — the child-only runes the catalogue deliberately omits so they don't bury top-level ones — was applied inside `hydrateAllRuneInfos`, which made it a property of the rune data rather than of the rendered document. `refrakt reference dump --format json` therefore omitted nine child runes (`accordion-item`, `tab`, `form-field`, …) that `refrakt reference <name>` describes in full, including required attributes. The exclusion now applies where the catalogue is rendered; the JSON dump carries the complete rune set. Markdown catalogue output is unchanged.
