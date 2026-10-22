{% bug id="BUG-044" status="fixed" severity="major" source="SPEC-060" tags="drawer,behaviors,skeleton,ios" pr="refrakt-md/refrakt#707" %}

# After a drawer has been opened, the sticky site header trails behind page scrolling on iOS Safari

## Steps to Reproduce
1. On iOS Safari, open a page whose default layout has the sticky `.rf-header` (for example a release page under `/releases/`).
2. Open a drawer through a `{% ref preview="drawer" %}` link, then close it.
3. Scroll the page.

## Expected
The header stays pinned to the top of the viewport, as it does before any drawer is opened.

## Actual
The header trails behind the scroll and catches up once scrolling settles, as though it were animated. It begins only after a drawer has been opened, and it lasts until the page is reloaded.

## Environment
- Mobile Safari (reported on iOS, possibly other browsers too); not reproducible in headless Chromium
- `@refrakt-md/skeleton` 0.41.1, `@refrakt-md/behaviors` 0.41.1

## Cause
The drawer's scroll lock (`packages/skeleton/styles/runes/drawer.css`) set `overflow: hidden` on both `html` and `body` while a drawer was open. With both locked, `body` becomes a scroll container of its own. Toggling that is a long-standing WebKit trigger for sticky and fixed elements to be repositioned on the main thread rather than with the compositor's scroll, so they trail behind it. Locking the root alone is enough to stop the page scrolling under the modal: iOS Safari has honoured `overflow: hidden` on `html` since iOS 16.

## Acceptance Criteria
- [x] The scroll lock sets `overflow: hidden` on `html` only, not on `body`
- [x] Scrolling inside an open drawer's body does not chain to the page (`overscroll-behavior: contain`)
- [x] On iOS Safari, the sticky header stays pinned while scrolling after a drawer has been opened and closed

## Resolution

Completed: 2026-10-22

Branch: `claude/site-changelog-readability-k4p902`

### What was done
- `packages/skeleton/styles/runes/drawer.css`: the scroll lock sets `overflow: hidden` on `html.rf-drawer-open` only, no longer on `body` as well.
- `packages/skeleton/styles/runes/drawer.css`: `overscroll-behavior: contain` on `dialog.rf-drawer .rf-drawer__body`, so scrolling inside a drawer does not chain to the page.
- `packages/lumina/styles/runes/drawer.css`: header comment updated to match.
- `.changeset/skeleton-drawer-scroll-lock.md`: skeleton patch.

### Notes
- Not reproducible in headless Chromium; confirmed fixed on iOS Safari against the PR's Cloudflare preview.
- The mobile-menu behavior also locks `<body>` overflow and may cause the same lag; not changed here.

{% /bug %}
