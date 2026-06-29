---
"@refrakt-md/behaviors": minor
"@refrakt-md/marketing": minor
"@refrakt-md/business": minor
"@refrakt-md/runes": minor
"@refrakt-md/lumina": minor
"@refrakt-md/skeleton": minor
---

**Carousel is now a shared layout mode any rune can adopt, not a one-off.** `layout="carousel"` is a canonical layout token backed by a shared DOM contract (a `data-name="items"` track whose direct children are the slides) and an attribute-triggered behavior dispatch path: the carousel behavior enhances any block carrying `[data-layout="carousel"]`, lifted out of the gallery to be block-agnostic. A CSS-only `collapse-to` dial lets a grid/list collapse into a carousel at a breakpoint. `feature` (marketing) and `cast` (business) are the first adopters; the shared track + `collapse-to` contract is documented for further runes.
