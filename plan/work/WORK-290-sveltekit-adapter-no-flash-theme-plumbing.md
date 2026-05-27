{% work id="WORK-290" status="ready" priority="high" complexity="moderate" source="SPEC-073" tags="theme,adapters,sveltekit,ssr" milestone="v0.16.0" %}

# SvelteKit adapter no-flash theme plumbing

The no-flash theme plumbing — `prePaintScript()`, `htmlTintAttributes()`, `colorSchemeMetaContent()` from `@refrakt-md/content` — is hand-wired into each app's `hooks.server.ts` (the docs site and plan-site carry near-identical copies). Move it into the SvelteKit adapter so any app gets correct no-flash theming (and, with the chrome toggle, a working toggle) with zero boilerplate.

## Acceptance Criteria
- [ ] `@refrakt-md/sveltekit` provides the theme SSR injection (a `Handle` / hook, or composed into the adapter's existing hook) — pre-paint script in `<head>`, tint attributes on `<html>`, and the `color-scheme` meta — driven by each page's resolved tint cascade.
- [ ] The docs site's `hooks.server.ts` no longer hand-rolls the theme injection; it uses the adapter-provided path.
- [ ] plan-site's `hooks.server.ts` no longer hand-rolls it either; both sites render identically to before (no-flash preserved).
- [ ] A fresh `create-refrakt` scaffold gets no-flash theming with no theme-specific hook code.
- [ ] The cascade lookup (per-URL tint/lock) is preserved; locked pages still set `data-tint-lock` on `<html>`.

## Approach
Lift the shared logic out of the two `hooks.server.ts` files into a reusable hook in `@refrakt-md/sveltekit` that takes the site (for the per-URL cascade) and runs `transformPageChunk` to inject the `<html>` attrs + `<head>` script/meta. Re-export or wire it so an app's `hooks.server.ts` is a one-liner (or unnecessary). Update the `create-refrakt` template accordingly.

## Dependencies
_None hard — independent of the toggle button, but completes the "out of the box" story alongside WORK-288/289. Sequence before WORK-291 so the docs/plan sites are fully adapter-driven before the component is removed._

## References
- {% ref "SPEC-073" /%}

{% /work %}
