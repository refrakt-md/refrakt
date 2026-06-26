---
"@refrakt-md/skeleton": patch
---

**Beside layouts collapse on their own column width, not the global viewport.** The shared `split.css` beside→stack collapse (used by card, recipe, hero, feature, step, realm, faction, playlist) moves from `@media` to `@container`, so a media-beside layout now collapses to a stack based on the width actually available to it — its nearest query container (`.rf-page-content` on a page) — rather than the browser viewport. A beside layout embedded in a narrow column (e.g. a docs page beside the sidebar) now collapses when *that column* is tight. The `data-collapse` breakpoints (sm/md/lg) and the `never` opt-out are unchanged. Additionally, the `preview` rune's viewport frame is now a query container, so container-query-driven layouts (this beside→stack collapse, and carousel `collapse-to`) are faithfully simulated when you narrow the preview's viewport selector.
