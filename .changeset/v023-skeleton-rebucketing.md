---
"@refrakt-md/skeleton": minor
"@refrakt-md/lumina": minor
---

**Skeleton/skin re-bucketing — the skeleton layer is now filled (SPEC-094 §3, WORK-438).** The follow-up promised by the skeleton-package infrastructure change: Lumina's framework-agnostic *structure* is moved out of `@layer skin` into `@refrakt-md/skeleton`'s `@layer skeleton`, group by group and strictly bottom-up (foundation → dimensions → layouts → runes).

- **`@refrakt-md/skeleton`** now ships the structural CSS for ~81 runes plus the shared dimension layers (state, media, cover, metadata, sections, checklist, sequence, guest-posture) and the page-shell layouts (default, docs, blog, mobile, on-this-page, search, theme-toggle, version-switcher, plan, split). Each file is imported with `layer(skeleton)`, so the cut line — `display` / `grid-*` / `flex-*` / `position` / `inset` / `z-index` / `overflow` / sizing / zone resets / disclosure mechanisms — lives in one framework-agnostic package.
- **Lumina** keeps only the skin remainder (colour, border, radius, shadow, font, and spacing *values*), which wins over the skeleton layer purely by cascade-layer order — ordinary single-class/attribute selectors, no `!important`. Rendered output is unchanged: the split is a re-bucketing, verified declaration-for-declaration against the pre-split CSS.

This is what makes a second theme a token file + skin rather than a fork: the structure is now shared infrastructure, and a skin overrides only the aesthetic deltas.
