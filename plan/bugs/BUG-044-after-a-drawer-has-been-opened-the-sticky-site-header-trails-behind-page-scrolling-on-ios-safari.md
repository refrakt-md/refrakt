{% bug id="BUG-044" status="in-progress" severity="major" source="SPEC-060" tags="drawer,behaviors,skeleton,ios" %}

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
- [ ] On iOS Safari, the sticky header stays pinned while scrolling after a drawer has been opened and closed

{% /bug %}
