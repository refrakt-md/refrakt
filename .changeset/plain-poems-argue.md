---
'@refrakt-md/transform': minor
'@refrakt-md/lumina': minor
---

Enforce rune identity on theme overrides (ADR-028)

`block`, `modifiers` and `sections` are rune identity: they say what a rune *is*, and universal-attribute applicability derives from them — `reading` needs a `body` section role, `prominence` a header-ish one, `cover` a declared `media-position` modifier. Until now the `IDENTITY_FIELDS` rule guarded only SPEC-091 variant deltas, while the theme-override path shallow-merged without restriction, so a theme could write `runes: { Card: { sections: {} } }` and silently disable `reading` on every card in a site.

`mergeThemeConfig` now drops any of the three from a theme override and reports it, naming the rune and the field; the rune's own declaration stands. The rule itself moved to a single shared module (`identity-fields.ts`, exported as `IDENTITY_FIELDS` / `VARIANT_DELTA_RESERVED_FIELDS`) that both merge paths consume, so the two cannot drift.

This is a no-op against everything the project ships — Lumina overrides no rune, and none of the nine official plugins collides with a core rune — and a test now guards that. The one capability removed is a theme reaching into `modifiers` to restate a modifier (e.g. to add a `valueMap`); that belongs on the rune's own declaration. Themes keep `layout`, `structure`, `styles`, `contentWrapper`, `staticModifiers`, `autoLabel`, `editHints`, `projection` and `variants` unchanged.

`@refrakt-md/lumina` additionally exports its overrides object as `luminaOverrides` alongside the merged `luminaConfig`.
