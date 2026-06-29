---
"@refrakt-md/transform": patch
---

**Fix carousel nav buttons rendering unstyled in production builds.** `carousel` is a shared layout mode (`data-layout="carousel"`, SPEC-100) that runes like `feature`, `cast`, and `gallery` adopt — it is not a `data-rune="carousel"`, so it never surfaced in the per-rune CSS usage analysis. As a result the production CSS tree-shaker (`computeUsedCssBlocks`) dropped the theme's `carousel.css` skin, and the JS-injected `.rf-carousel__nav` prev/next buttons rendered as unstyled UA squares (gray surface, no rounding) on built sites while looking correct in dev (which loads the full CSS barrel). `carousel.css` is now always included when the theme ships it, matching the existing `tint`/`bg` universal-axis handling. Applies to every adapter that tree-shakes theme CSS (SvelteKit, Next, Nuxt, Astro, Eleventy, HTML).
