{% work id="WORK-214" status="done" priority="high" complexity="moderate" tags="ssr, renderer, tint, cascade" source="SPEC-052" milestone="v0.14.0" %}

# Renderer integration + pre-paint script

Wire the cascade-resolved `(tint, tintMode, locked)` tuple into SSR — emit `data-theme`, `data-tint`, `data-tint-lock` on `<html>`, plus a matching `<meta name="color-scheme">`. Add the inline pre-paint script that applies saved user preference on unlocked pages and no-ops on locked pages, so there's no flash of incorrect theme on dark-locked marketing.

## Acceptance Criteria

- [x] `@refrakt-md/content` exports SSR helpers that adapters consume to emit the right `<html>` attributes:
  - [x] `htmlTintAttributes(cascade)` — returns `data-theme="dark"` etc., empty string for the default auto/unlocked cascade
  - [x] `colorSchemeMetaContent(cascade)` — returns the `<meta name="color-scheme">` content (`'dark'` / `'light'` when locked, `'light dark'` otherwise)
  - [x] `prePaintScript()` — returns the canonical anti-FOIT script (IIFE, ~250 bytes, reads `rf-theme` localStorage, falls back to `prefers-color-scheme`, no-ops on `data-tint-lock="true"`)
- [x] Pre-paint script reads `data-tint-lock`; if locked, does nothing; if unlocked, applies saved preference from localStorage, falls back to `prefers-color-scheme`
- [x] Pre-paint script is small and inline-friendly — sub-1KB (~250 bytes)
- [x] Unit tests verify HTML attribute output and `<meta>` content for each combination of (tint, tintMode, locked) — 17 new tests in `tint-ssr.test.ts`
- [ ] Adapter integration that actually wires the SSR helpers onto `<html>` for the refrakt site *(deferred to {% ref "WORK-215" /%} in Chunk 10 — the site-adoption work item is the natural home for the `hooks.server.ts` that consumes these helpers)*
- [ ] No flash of incorrect theme verification *(deferred to {% ref "WORK-215" /%} — meaningful only once the adapter wiring lands)*

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

## Resolution

Completed: 2026-05-19

Shipped: `@refrakt-md/content` exports `htmlTintAttributes`, `colorSchemeMetaContent`, and `prePaintScript` from `tint-ssr.ts`. The pre-paint script is ~250 bytes (IIFE), reads `data-tint-lock` and no-ops on locked pages, otherwise applies `localStorage.rf-theme` with a `prefers-color-scheme` fallback. 17 unit tests in `tint-ssr.test.ts` cover the (tint, tintMode, locked) combination matrix. Adapter wiring + FOIT spot-check belong to WORK-215, which has also shipped.

{% /work %}
