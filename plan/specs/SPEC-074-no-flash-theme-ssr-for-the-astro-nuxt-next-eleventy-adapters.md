{% spec id="SPEC-074" status="draft" tags="theme, adapters, astro, nuxt, next, eleventy, ssr, no-flash" source="SPEC-073" %}

# No-flash theme SSR for the astro / nuxt / next / eleventy adapters

{% ref "SPEC-073" /%} made the light/dark/auto toggle framework-agnostic (layout chrome + a behavior) and gave **SvelteKit** ({% ref "WORK-290" /%}) and the **html** adapter ({% ref "WORK-292" /%}) the no-flash SSR plumbing: a pre-paint script + `color-scheme` meta in `<head>`, and tint `data-*` attributes on `<html>`, driven by each route's tint cascade. The remaining four adapters — **astro, nuxt, next, eleventy** — have **no theme SSR at all**: no pre-paint script, no `data-tint`/`data-theme`/`data-tint-lock`, and no cascade threading to their document boundary. Sites built on them flash on load and ignore tint-lock and the saved theme. This spec brings them to parity, each verified with a demo app.

## Problem

The toggle button (chrome), its behavior, and its CSS are already shared via the layout engine + `@refrakt-md/behaviors` + Lumina ({% ref "SPEC-073" /%}). What's missing in the four non-SvelteKit/non-html adapters is the **document-boundary no-flash seam**, and it's different per framework:

- **astro** — `BaseLayout.astro` renders `<html>`/`<head>` but receives no tint cascade (only `LayoutPageData`, which carries none); nothing injects the pre-paint script or tint attrs. Separately, behaviors load only when the *page content* has interactive runes (`hasInteractiveRunes(page.renderable)`), so the always-present chrome toggle/search aren't enhanced on a plain page.
- **eleventy** — output is assembled through Eleventy templates/transforms; no transform injects the pre-paint chrome, and the per-page cascade isn't surfaced into the data cascade.
- **nuxt** — the module renders content but never contributes to `app.head` / nitro output; no pre-paint, no html attrs, no cascade access at the document level.
- **next** — the **app** owns `<html>`/`<head>` in its root layout (RSC); the adapter offers no way to inject the pre-paint script or `<html>` tint attrs, and can't without the app's root layout cooperating.

None of these adapters has a runnable demo/example app in the repo — which is why this work is specced and verified per app rather than landed blind across four published packages.

## Goals

- Each of astro / nuxt / next / eleventy injects, per route: the anti-FOIT **pre-paint script** + **`color-scheme` meta** in `<head>`, and the **tint `data-*` attributes** on `<html>`, from the route's resolved tint cascade — matching the SvelteKit hook and the html `renderFullPage` injection.
- Each adapter's scaffold loads the **behaviors bundle** so the chrome toggle (and other interactive runes) are enhanced.
- Fix the **astro chrome-behaviors gap** so layout chrome behaviors load regardless of page content.
- Each adapter is **verified with a demo/example app** (golden path + a tint-locked page + the toggle).

## Non-goals

- The toggle UI, behavior, and CSS — delivered in {% ref "SPEC-073" /%} and shared across adapters.
- SvelteKit ({% ref "WORK-290" /%}) and html ({% ref "WORK-292" /%}) — already done.
- The html scaffold's client-JS bundle — tracked by {% ref "WORK-293" /%} (html-specific), though the same "ship the behaviors bundle" need recurs per adapter here.

## Capability sketch (per adapter)

**Shared:** reuse `prePaintScript()`, `htmlTintAttributes(cascade)`, and `colorSchemeMetaContent(cascade)` from `@refrakt-md/content` — the same helpers SvelteKit and html use. The per-framework work is *threading the route cascade to the document boundary* and *injecting* there; the cascade→attrs logic is not re-implemented.

- **astro** — add a `tintCascade` prop to `BaseLayout.astro` (threaded from the page/route), inject pre-paint + color-scheme in `<head>` and tint attrs on `<html>`; load layout behaviors unconditionally (or whenever the layout declares chrome behaviors), not only on interactive page content.
- **eleventy** — an output transform (string injection, closest to html's `renderFullPage`) that splices the chrome using a per-page cascade surfaced via the Eleventy data cascade.
- **nuxt** — contribute the pre-paint script + html attrs via the module (`app.head` / a nitro render hook), reading the route cascade.
- **next** — expose an exported `<RefraktThemeScript />` (or a metadata + html-attribute helper) for the app's root layout to include, since the app owns `<html>`; document the one-time wiring.

## Acceptance Criteria

- [ ] astro: `BaseLayout.astro` injects the pre-paint script + `color-scheme` meta and writes tint attrs on `<html>` from a route cascade; verified on a demo astro app (incl. a tint-locked page).
- [ ] astro: layout chrome behaviors (search, theme-toggle) are enhanced on a page with no interactive content runes — the `hasInteractiveRunes` gap is fixed.
- [ ] eleventy: an output transform injects the pre-paint chrome + html attrs per page; verified on a demo eleventy app.
- [ ] nuxt: the module injects the pre-paint chrome + html attrs per route; verified on a demo nuxt app.
- [ ] next: the adapter exposes a documented way for the app root layout to inject the pre-paint chrome + html attrs; verified on a demo next app.
- [ ] Each adapter's scaffold/demo loads the behaviors bundle so the toggle cycles.
- [ ] All four reuse the `@refrakt-md/content` helpers; no per-framework re-implementation of the cascade→attrs logic.

## References

- {% ref "SPEC-073" /%} — framework-agnostic toggle (chrome + behavior); SvelteKit + html plumbing.
- {% ref "SPEC-052" /%} — tint cascade and `data-tint-lock`.
- {% ref "WORK-290" /%} — the SvelteKit adapter hook this mirrors.
- {% ref "WORK-292" /%} — the html `renderFullPage` injection this mirrors.
- {% ref "WORK-293" /%} — html scaffold behaviors-bundle gap (the same need recurs per adapter).

{% /spec %}
