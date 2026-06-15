---
"@refrakt-md/runes": minor
"@refrakt-md/lumina": minor
---

**Image-src scheme sugar** (SPEC-106) — standard Markdown image syntax now resolves two custom URL schemes to inline SVG at transform time. `![Portrait](placeholder:portrait)` emits a deterministic, theme-token-tinted placeholder (shapes: `cover`/`wide`/`banner`/`square`/`portrait`/`thumbnail`/`avatar`), and `![GitHub](icon:github)` inlines a named icon from the theme's icon set — the same source the `{% icon %}` rune uses, with `alt` as the accessible label. Unknown schemes, relative paths, and absolute URLs pass through to `<img>` unchanged, and the scheme set is a small registry a plugin can extend. Authors can draft image-heavy pages before the assets exist and swap in real paths later. The image-consuming runes (`figure`, `gallery`, `juxtapose`, `mediatext`, `showcase`, `card`, `cast`, `recipe`, `realm`, `testimonial`, `storyboard`) now accept scheme-resolved `<svg>` media, not just `<img>`.
