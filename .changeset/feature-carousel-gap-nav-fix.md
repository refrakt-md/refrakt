---
"@refrakt-md/behaviors": patch
"@refrakt-md/lumina": patch
"@refrakt-md/design": patch
---

**Fix the `feature` carousel layout: gap between slides and working prev/next buttons.** The shared carousel behavior computed its per-item scroll distance from `getComputedStyle(track).gap`, but an unset flex `gap` computes to the string `"normal"` in real browsers — `parseFloat("normal")` is `NaN`, so `scrollBy({ left: NaN })` was a silent no-op and the nav buttons did nothing. It now reads `columnGap` and falls back to `0` on any non-finite value. Lumina's `feature` styles also gained the missing `gap` on the `[data-layout="carousel"]` track (matching the existing `grid` gap), so carousel slides no longer butt together. Separately, the `preview` rune's `responsive` attribute description is corrected: it accepts viewport **presets** (`mobile`, `tablet`, `desktop`), not pixel widths.
