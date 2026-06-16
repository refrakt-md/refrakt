---
"@refrakt-md/runes": minor
"@refrakt-md/transform": minor
"@refrakt-md/types": minor
"@refrakt-md/behaviors": minor
"@refrakt-md/lumina": minor
"@refrakt-md/marketing": minor
"@refrakt-md/media": minor
---

**Scroll-reveal motion — a token-driven entrance dimension (SPEC-105).** Sections can now animate in as they scroll into view. The author declares *intent* with two universal attributes; the theme owns the choreography; a behaviour owns the timing — JS = when, CSS = how.

- **`reveal`** — a closed entrance vocabulary on every block rune: `none` (default), `fade`, `slide`, `scale`, `blur`. An unknown value is a build error.
- **`stagger`** — cascades a multi-child block's items in (feature/bento/steps/pricing/playlist); a silent no-op on single-child runes. The engine stamps `--rf-reveal-index` on the cascade items.
- **The motion dimension** (`dimensions/motion.css` + `--rf-reveal-*` physics tokens) renders each character keyed on `data-reveal` × `data-in-view`, from one stylesheet covering all section runes. It animates the individual `translate`/`scale` properties (never the `transform` shorthand) so it composes with existing rune transforms. The physics are a first-class token group, retunable site-wide via `refrakt.config.json` `theme.tokens.reveal.*`.
- **An IntersectionObserver behaviour** flips `data-in-view` on first intersection. Opt-in and enhancement-gated: SSR/no-JS/crawler and `prefers-reduced-motion` render the fully-visible final state — nothing is hidden behind JS.
