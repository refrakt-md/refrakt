---
'@refrakt-md/lumina': patch
---

An open drawer on a page using the default layout now reaches the top and bottom of the viewport. The layout's section spacing (`* + [data-rune]`, 4rem above and below each rune block in an article) also matched the drawer's `<dialog>`, which the drawer pipeline places at the end of the article, and its specificity beat the drawer's own `margin: 0`. The panel therefore stopped 4rem short of both edges. Both section-spacing rules now skip `dialog`, so prose after a closed drawer gains no gap either. The no-JS fallback, a `<section>` in the flow, keeps its spacing, and docs-layout pages were never affected.
