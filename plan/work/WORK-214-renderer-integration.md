{% work id="WORK-214" status="ready" priority="high" complexity="medium" tags="ssr, renderer, tint, cascade" source="SPEC-052" milestone="v0.14.0" %}

# Renderer integration + pre-paint script

Wire the cascade-resolved `(tint, tintMode, locked)` tuple into SSR — emit `data-theme`, `data-tint`, `data-tint-lock` on `<html>`, plus a matching `<meta name="color-scheme">`. Add the inline pre-paint script that applies saved user preference on unlocked pages and no-ops on locked pages, so there's no flash of incorrect theme on dark-locked marketing.

## Acceptance Criteria

- [ ] The renderer (likely `@refrakt-md/svelte` `ThemeShell` or equivalent in other adapters) emits:
  - [ ] `data-theme="dark"` (or `"light"`) on `<html>` when the page's resolved `tintMode` is `dark` or `light`
  - [ ] No `data-theme` attribute when resolved `tintMode` is `auto` (lets the pre-paint script + system pref decide)
  - [ ] `data-tint="<name>"` when a named tint is resolved
  - [ ] `data-tint-lock="true"` when resolved `locked` is true (omit or set `"false"` otherwise)
  - [ ] `<meta name="color-scheme" content="dark">` (or `light`) when locked; `content="light dark"` when unlocked
- [ ] Inline pre-paint script (the small `<script>` that runs before first paint) reads `data-tint-lock`; if locked, does nothing; if unlocked, applies saved preference from localStorage, falls back to `prefers-color-scheme`
- [ ] The pre-paint script lives in `<head>` before any styles so it runs before paint
- [ ] No flash of incorrect theme on a dark-locked marketing page — verified by a Lighthouse trace or manual frame-by-frame on a slow connection
- [ ] The pre-paint script is small and inline (not a separate file request) — sub-1KB
- [ ] Unit tests verify the rendered HTML output for each combination of (tint, tintMode, locked)

## Approach

Most of this is straightforward — pass the resolved tuple from {% ref "WORK-212" /%} into the layout/renderer and produce the right HTML.

The pre-paint script is the most subtle piece. The contract from {% ref "WORK-211" /%}'s toggle:

```html
<script>
  (function() {
    if (document.documentElement.dataset.tintLock === 'true') return;
    var saved = localStorage.getItem('rf-theme');
    var resolved = saved && saved !== 'auto'
      ? saved
      : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', resolved);
  })();
</script>
```

This script and {% ref "WORK-211" /%}'s toggle need to use the same `localStorage` key (`rf-theme` here, but pick the canonical name during implementation and use it consistently).

For other adapters (Astro, Next, Eleventy, plain HTML) — the same `<html>` attributes and the same pre-paint script need to be emitted by their respective render pipelines. Likely a single shared utility in `@refrakt-md/content` that all adapters call.

## Dependencies

- {% ref "WORK-212" /%} — cascade resolution produces the tuple this consumes.
- {% ref "WORK-213" /%} — frontmatter schema must accept the fields.
- {% ref "WORK-189" /%} — `theme.colorScheme` field already exists at site level (this work generalises its emit to per-page).

## References

- {% ref "SPEC-052" /%} — "SSR & Rendering" section
- {% ref "WORK-211" /%} — toggle that pairs with this pre-paint script

{% /work %}
