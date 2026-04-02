{% work id="WORK-091" status="ready" priority="medium" complexity="moderate" tags="frameworks, nextjs" %}

# Create @refrakt-md/next adapter package

Build the Next.js framework adapter. Uses React Server Components + `renderToHtml()` for zero-hydration content rendering, with a thin client component for behavior initialization.

## Acceptance Criteria

- [ ] `packages/next/` package exists with correct `package.json` (peer dep `next@^14.0.0 || ^15.0.0`)
- [ ] `RefraktContent` Server Component renders via `renderToHtml()` + `dangerouslySetInnerHTML` (no `'use client'`)
- [ ] `BehaviorInit` Client Component (`'use client'`) initializes behaviors via `useEffect`, cleans up on unmount, re-initializes on route change
- [ ] `metadata.ts` helper transforms page SEO data into Next.js `Metadata` objects for `generateMetadata()`
- [ ] `loader.ts` wraps `loadContent()` for Next.js patterns (caching, revalidation)
- [ ] Content loading works via `generateStaticParams()` + async Server Component
- [ ] CSS injection works via `import '@refrakt-md/lumina'` in root `app/layout.tsx`
- [ ] Lumina Next.js adapter exports theme config + types
- [ ] Custom elements (`rf-*`) render correctly via raw HTML string (bypasses React's custom element issues)
- [ ] Example site renders core runes, layouts, behaviors, and web components correctly
- [ ] Adapter documentation page at `site/content/docs/adapters/nextjs.md` with installation, project structure, configuration, code examples (RefraktContent server component, BehaviorInit client component, generateMetadata helper, generateStaticParams, CSS import, layout setup), and getting-started guide matching the depth of existing SvelteKit adapter docs

## Approach

The key insight is that `renderToHtml()` produces complete HTML strings, and RSC can inject them via `dangerouslySetInnerHTML` with zero hydration cost. This sidesteps all React custom element issues since React never processes the `rf-*` elements as components.

Behaviors need a separate `'use client'` component since they require DOM access. This component renders nothing (`return null`) and manages behavior lifecycle via `useEffect`.

No custom HMR in Phase 1 — rely on Next.js dev server defaults. Custom Webpack/Turbopack plugin for content HMR is a future optimization.

## Dependencies

- WORK-088 (shared utility extraction)

## References

- SPEC-030 (Phase 3)
- ADR-002 (Next.js section)

{% /work %}
