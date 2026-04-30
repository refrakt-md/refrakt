{% work id="WORK-089" status="in-progress" priority="high" complexity="moderate" tags="frameworks, astro" milestone="v1.0.0" source="ADR-001,SPEC-013,SPEC-030,SPEC-031" %}

# Create @refrakt-md/astro adapter package

Build the Astro framework adapter — the first non-SvelteKit target. Astro is MPA-first and SSG-focused, making it the simplest adapter to build and validate.

## Acceptance Criteria

- [x] `packages/astro/` package exists with correct `package.json` (peer dep `astro@^5.0.0`)
- [x] Astro integration (`integration.ts`) reads `refrakt.config.json`, injects Lumina CSS, configures SSR noExternal list
- [x] `BaseLayout.astro` selects layout via `matchRouteRule()`, runs `layoutTransform()`, renders via `renderToHtml()` + `set:html`
- [x] SEO meta tags (Open Graph, JSON-LD) rendered in `<head>` from page SEO data
- [x] Behavior initialization script calls `initRuneBehaviors()`, `initLayoutBehaviors()`, `registerElements()` and sets `RfContext`
- [x] Behavior script conditionally included — only on pages that use interactive runes (tabs, accordion, datatable, etc.), shipping zero JS for static-only pages
- [x] Content loading works via `getStaticPaths()` using `loadContent()`
- [x] `AstroTheme` type interface exported for theme authors
- [x] Lumina Astro adapter exists (`packages/lumina/astro/index.ts`) exporting theme config + CSS entry point
- [x] Content HMR works in dev mode via Vite `server.watcher`
- [x] Example site renders core runes, layouts (docs + default), behaviors, and web components correctly
- [x] Adapter documentation page at `site/content/docs/adapters/astro.md` with installation, project structure, configuration, code examples (integration setup, page component, layout, content loading, behavior init, SEO injection), and getting-started guide matching the depth of existing SvelteKit adapter docs

## Approach

Use `renderToHtml()` as the primary rendering strategy — no recursive `Renderer.astro` component needed while the component registry is empty. The integration hooks into Astro's `astro:config:setup` to inject CSS and configure Vite. Content is loaded at build time via `getStaticPaths()`.

For View Transitions support, the behavior init script should listen to the `astro:page-load` event as an alternative to DOMContentLoaded.

**`@astrojs/markdoc` coexistence:** This adapter replaces `@astrojs/markdoc`, not supplements it — refrakt needs the full schema transform pipeline (rune models, content models, meta tag injection) which can't be expressed as simple Markdoc tag registrations. Users wanting a lighter integration that preserves Astro's content collections and `@astrojs/markdoc` should use `@refrakt-md/vite` (SPEC-031) instead.

## Dependencies

- {% ref "WORK-088" /%} (shared utility extraction)

## References

- {% ref "SPEC-030" /%} (Phase 1, including Compatibility Notes subsection)
- {% ref "SPEC-031" /%} (Vite plugin — lighter Astro integration alternative)
- {% ref "ADR-001" /%} (Astro readiness investigation)
- {% ref "SPEC-013" /%} (layout transform architecture)

{% /work %}
