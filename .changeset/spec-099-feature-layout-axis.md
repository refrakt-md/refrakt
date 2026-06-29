---
"@refrakt-md/marketing": minor
"@refrakt-md/runes": minor
"@refrakt-md/lumina": minor
"@refrakt-md/skeleton": minor
---

**`feature` gains a canonical `layout` axis (grid / list / carousel).** Layout is now a first-class, named vocabulary (`LAYOUT.grid` / `LAYOUT.list` / `LAYOUT.carousel`) shared across runes instead of being inferred from incidental attributes. `feature` reads an explicit `layout=` with transform-level default resolution, and the old `media-position → definitions-grid` coupling is retired in favour of the explicit axis (structure contracts regenerated accordingly). Lumina/skeleton style the grid collapse-reflow off the canonical `[data-layout]` selector, and `layoutMatches()` lets themes and behaviors test layout intent without string-sniffing.
