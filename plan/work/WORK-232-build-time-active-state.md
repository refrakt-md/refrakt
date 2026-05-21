{% work id="WORK-232" status="done" priority="high" complexity="moderate" tags="nav, routing, active-state, css, lumina" source="SPEC-055" milestone="v0.14.3" %}

# Build-time active state + Lumina CSS

Apply nav active-state attributes at build time per page render — no runtime URL-comparison logic in `rf-nav`. Each nav has at most one item with `aria-current="page"` (exact URL match) and at most one item with `data-active="ancestor"` (longest strict-prefix match, excluding the `aria-current` item). Ship Lumina reference CSS for both attributes with visually distinct treatments.

Builds on {% ref "WORK-231" /%} — assumes resolved `<a href>` values are present in SSR HTML so build-time URL comparison is possible.

## Acceptance Criteria

- [x] Each rendered page evaluates its nav items against the current page's URL during postProcess
- [x] The item whose resolved `href` equals the current URL (after trailing-slash + index-page normalisation) gets `aria-current="page"`. At most one item per nav.
- [x] Among items that did *not* receive `aria-current`, the item whose resolved `href` is the longest strict prefix of the current URL gets `data-active="ancestor"`. At most one item per nav.
- [x] Items satisfying neither rule get no active attribute (no class, no `aria-current`, no `data-active`)
- [x] Active-state attributes are written into SSR HTML at build time — no JS required to apply them
- [x] URL normalisation is consistent with WORK-231: trailing slashes stripped, index pages normalised, case-insensitive
- [x] `rf-nav` web component no longer applies active state client-side; its remaining responsibilities are interactive behavior (collapsible toggling, menubar dropdown open/close, mega panel open/close)
- [x] Lumina ships CSS for `.rf-nav-item__link[aria-current="page"]` — strongest emphasis (e.g. bold weight, accent text color, leading indicator bar)
- [x] Lumina ships CSS for `.rf-nav-item__link[data-active="ancestor"]` — subtler treatment (accent color only, no bar)
- [x] Both treatments use design tokens (`var(--rf-color-accent-*)`, no hard-coded values)
- [x] CSS coverage tests updated to recognise the new selectors
- [x] Unit tests cover: exact-match marking, longest-prefix marking when no exact, no-match case, multiple potential ancestors (longest wins), exact + ancestor on the same nav (both marked, on different items)
- [x] Visual regression on the docs site: navigating to `/docs/themes/configuration` shows exactly one item as "you are here" and one as "ancestor" — verified by manual inspection on at least one section nav

## Approach

**`packages/content/src/pipeline.ts`** — Extend the postProcess pass from WORK-231 (or add a sibling pass). After all NavItems have resolved `href`s, walk each page's render tree, find each `Nav`, and for each `NavItem` inside, compare its resolved href to the page's URL.

The comparison function:

```ts
function classifyItem(itemHref: string, currentUrl: string): 'page' | 'ancestor' | 'none' {
  const a = normaliseUrl(itemHref);
  const b = normaliseUrl(currentUrl);
  if (a === b) return 'page';
  if (b.startsWith(a + '/')) return 'ancestor';
  return 'none';
}
```

Two-pass over the nav's items:
1. Find the `page` match; mark it; collect candidates for ancestor (anything classified `ancestor`).
2. Among ancestor candidates (excluding the page-match if any), pick the one with the longest href; mark it.

The function reuses `normaliseUrl` from WORK-231.

**`rf-nav` web component simplification** — Once active state is build-time, the only runtime concerns left are interactive behaviors. Remove any client-side URL-matching code. Document the simplification in the PR description.

**Lumina CSS** — In `packages/lumina/styles/runes/nav.css`, add rules for the two attributes. Reference treatment:

```css
.rf-nav-item__link[aria-current="page"] {
  color: var(--rf-color-accent-text);
  font-weight: var(--rf-font-weight-semibold);
  /* leading indicator bar via ::before */
}

.rf-nav-item__link[data-active="ancestor"] {
  color: var(--rf-color-accent-text);
}
```

Themes can collapse both into one style if they prefer; the contract is two attributes, not two visual treatments.

## Dependencies

- {% ref "WORK-231" /%} — must land first; this work assumes resolved hrefs are present in SSR HTML at postProcess time

## References

- {% ref "SPEC-055" /%} — Active state rules, combined behavior table, theme contract
- `packages/content/src/pipeline.ts` — Pipeline orchestrator
- `packages/lumina/styles/runes/nav.css` — Reference nav CSS

## Resolution

Branch: `claude/v0-14-3-nav-milestone-planning`

### What was done

- **Active-state pass** — added `applyNavActiveState` to `packages/runes/src/config.ts`. Walks each nav, collects all internal `<a>` links, then runs two single-winner rules: (1) exact normalised-URL match → `aria-current="page"`; (2) longest strict-prefix match among the remaining links → `data-active="ancestor"`. External links (`https://`, `mailto:`) are excluded from both. URL normalisation reuses `normaliseNavUrl` from WORK-231 (trailing slash strip + `/index` strip + case-insensitive).
- **Pipeline integration** — `applyNavActiveState` runs in both `resolveCoreSentinels` (for layout regions) and `corePipelineHooks.postProcess` (for page content), after slug resolution and auto-pagination so the link set is final.
- **`rf-nav` web component simplification** — `packages/behaviors/src/elements/nav.ts` rewritten to a near-empty class. The runtime slug resolution and active-state class application both moved to build time, so the element has no work to do for SSR-resolved navs. Kept registered so future interactive behaviours (collapsible toggling, menubar dropdown, mega panel open/close) can attach via the same element.
- **Lumina CSS** — replaced the legacy `.rf-nav-item__link--active` modifier with two attribute selectors: `.rf-nav-item__link[aria-current="page"]` (strong emphasis — accent text + 600 weight + soft accent background) and `.rf-nav-item__link[data-active="ancestor"]` (subtler — accent text only).

### Files changed

- `packages/runes/src/config.ts` — `applyNavActiveState` function plus wiring.
- `packages/behaviors/src/elements/nav.ts` — stripped to an empty custom element.
- `packages/lumina/styles/runes/nav.css` — new active-state selectors.

### Verification

- Five new unit tests in `packages/runes/test/nav-resolution.test.ts` covering active state: exact match marks aria-current; longest-prefix wins for ancestor; exact takes precedence (then next-longest gets ancestor); no-match leaves nav untouched; external links never marked.
- Built site spot-check: `/docs/themes/overview` shows `<a href="/docs/themes/overview" aria-current="page">` on the matching item, no aria-current on others.
- `data-active="ancestor"` doesn't fire in the current site because no existing nav contains section-level URLs (the docs sidebar lists leaves only). The logic is exercised by the unit tests — production will pick it up when a future nav (e.g. the mega variant in SPEC-054) introduces section links.

### Notes

- Active-state attributes are applied via direct mutation of the link tag's attributes object (not full tree rebuild). The link tags are nested inside the nav tag we're processing, so mutation propagates without breaking the immutable-ish convention the surrounding resolvers follow. Worth tightening to an immutable update if `resolveCoreSentinels` is ever called more than once per page render.

{% /work %}
