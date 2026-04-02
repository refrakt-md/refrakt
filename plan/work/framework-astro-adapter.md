{% work id="WORK-089" status="ready" priority="high" complexity="moderate" tags="frameworks, astro" %}

# Create @refrakt-md/astro adapter package

Build the Astro framework adapter — the first non-SvelteKit target. Astro is MPA-first and SSG-focused, making it the simplest adapter to build and validate.

## Acceptance Criteria

- [ ] `packages/astro/` package exists with correct `package.json` (peer dep `astro@^5.0.0`)
- [ ] Astro integration (`integration.ts`) reads `refrakt.config.json`, injects Lumina CSS, configures SSR noExternal list
- [ ] `BaseLayout.astro` selects layout via `matchRouteRule()`, runs `layoutTransform()`, renders via `renderToHtml()` + `set:html`
- [ ] SEO meta tags (Open Graph, JSON-LD) rendered in `<head>` from page SEO data
- [ ] Behavior initialization script calls `initRuneBehaviors()`, `initLayoutBehaviors()`, `registerElements()` and sets `RfContext`
- [ ] Behavior script conditionally included — only on pages that use interactive runes (tabs, accordion, datatable, etc.), shipping zero JS for static-only pages
- [ ] Content loading works via `getStaticPaths()` using `loadContent()`
- [ ] `AstroTheme` type interface exported for theme authors
- [ ] Lumina Astro adapter exists (`packages/lumina/astro/index.ts`) exporting theme config + CSS entry point
- [ ] Content HMR works in dev mode via Vite `server.watcher`
- [ ] Example site renders core runes, layouts (docs + default), behaviors, and web components correctly

## Approach

Use `renderToHtml()` as the primary rendering strategy — no recursive `Renderer.astro` component needed while the component registry is empty. The integration hooks into Astro's `astro:config:setup` to inject CSS and configure Vite. Content is loaded at build time via `getStaticPaths()`.

For View Transitions support, the behavior init script should listen to the `astro:page-load` event as an alternative to DOMContentLoaded.

**`@astrojs/markdoc` coexistence:** This adapter replaces `@astrojs/markdoc`, not supplements it — refrakt needs the full schema transform pipeline (rune models, content models, meta tag injection) which can't be expressed as simple Markdoc tag registrations. Users wanting a lighter integration that preserves Astro's content collections and `@astrojs/markdoc` should use `@refrakt-md/vite` (SPEC-031) instead.

## Dependencies

- WORK-088 (shared utility extraction)

## References

- SPEC-030 (Phase 1, including Compatibility Notes subsection)
- SPEC-031 (Vite plugin — lighter Astro integration alternative)
- ADR-001 (Astro readiness investigation)
- SPEC-013 (layout transform architecture)

{% /work %}
