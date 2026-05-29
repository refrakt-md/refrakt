{% work id="WORK-290" status="done" priority="high" complexity="moderate" source="SPEC-073" tags="theme,adapters,sveltekit,ssr" milestone="v0.16.0" %}

# SvelteKit adapter no-flash theme plumbing

The no-flash theme plumbing — `prePaintScript()`, `htmlTintAttributes()`, `colorSchemeMetaContent()` from `@refrakt-md/content` — is hand-wired into each app's `hooks.server.ts` (the docs site and plan-site carry near-identical copies). Move it into the SvelteKit adapter so any app gets correct no-flash theming (and, with the chrome toggle, a working toggle) with zero boilerplate.

## Acceptance Criteria
- [x] `@refrakt-md/sveltekit` provides the theme SSR injection (a `Handle` / hook, or composed into the adapter's existing hook) — pre-paint script in `<head>`, tint attributes on `<html>`, and the `color-scheme` meta — driven by each page's resolved tint cascade.
- [x] The docs site's `hooks.server.ts` no longer hand-rolls the theme injection; it uses the adapter-provided path.
- [x] plan-site's `hooks.server.ts` no longer hand-rolls it either; both sites render identically to before (no-flash preserved).
- [x] A fresh `create-refrakt` scaffold gets no-flash theming with no theme-specific hook code.
- [x] The cascade lookup (per-URL tint/lock) is preserved; locked pages still set `data-tint-lock` on `<html>`.

## Approach
Lift the shared logic out of the two `hooks.server.ts` files into a reusable hook in `@refrakt-md/sveltekit` that takes the site (for the per-URL cascade) and runs `transformPageChunk` to inject the `<html>` attrs + `<head>` script/meta. Re-export or wire it so an app's `hooks.server.ts` is a one-liner (or unnecessary). Update the `create-refrakt` template accordingly.

## Dependencies
_None hard — independent of the toggle button, but completes the "out of the box" story alongside WORK-288/289. Sequence before WORK-291 so the docs/plan sites are fully adapter-driven before the component is removed._

## References
- {% ref "SPEC-073" /%}

## Resolution

Completed: 2026-05-27

Branch: `claude/v0.16.0`

### What was done
- `packages/sveltekit/src/theme-hook.ts`: new server-safe `createThemeHandle(getSite)` factory returning a SvelteKit `Handle`. Resolves the route's tint cascade from the loaded Site and splices the no-flash chrome (pre-paint script + `color-scheme` meta in `<head>`, tint `data-*` on `<html>`) — the exact logic lifted verbatim from the apps' hooks.
- `packages/sveltekit/package.json`: added a `./hooks` subpath export (server-safe, does not pull in the Vite plugin), `@refrakt-md/content` dependency, and `@sveltejs/kit` peer dependency.
- `site/src/hooks.server.ts` and `plan-site/src/hooks.server.ts`: collapsed to the one-liner `export const handle = createThemeHandle(getSite)`.
- `packages/create-refrakt/template/src/hooks.server.ts`: new — scaffolded SvelteKit sites now ship no-flash theming + the toggle out of the box (previously the template had no theme hook at all).

### Notes
- The factory takes `getSite` (rather than importing the virtual module) because the adapter is pre-built and `virtual:refrakt/content` only resolves in the consuming app. The app passes its own `getSite` (from `$lib/content` or `virtual:refrakt/content`); a minimal structural `SiteLike` keeps the real `Site` assignable.
- `./hooks` is a separate entry so importing the hook into the server runtime doesn't load the Vite plugin (`.` entry).
- Verified: adapter builds + emits `theme-hook.{js,d.ts}`; a runtime harness against the built dist confirmed identical injection — `/locked` → `<html ... data-theme="dark" data-tint="niwaki" data-tint-lock="true">`, `/open` and unknown routes → `<html lang="en">`, all with the pre-paint script + color-scheme meta. sveltekit suite green (38).
- Not run here: live `svelte-check`/build of the apps (needs the Vite plugin to resolve the virtual modules). The hook logic is byte-identical to the previous app hooks and runtime-verified, and the wiring typechecks structurally.

{% /work %}
