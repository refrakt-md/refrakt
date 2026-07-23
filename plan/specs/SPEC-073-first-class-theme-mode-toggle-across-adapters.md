{% spec id="SPEC-073" status="shipped" tags="theme, toggle, chrome, layout, behaviors, adapters, lumina, sveltekit" source="SPEC-052" released-in="v0.16.0" %}

# First-class theme-mode toggle across adapters

The light/dark/auto mode toggle is a Svelte-only component (`ThemeToggle.svelte`) that each host app must hand-render and JS-reparent into its header. So only Svelte-based sites get it, those that do carry boilerplate, and plan-site — itself SvelteKit — simply omits it. Its sibling in the top bar, the **search trigger**, is already built the right way: framework-agnostic *layout chrome + a behavior*. This spec brings the toggle up to the search pattern so every adapter gets a working toggle out of the box, and moves the no-flash SSR plumbing into the adapters so it stops being per-app boilerplate.

## Problem

**The toggle is framework-bound and manually wired.** `ThemeToggle.svelte` (`packages/svelte/src/ThemeToggle.svelte`) is a Svelte component. A non-Svelte adapter (html, astro, nuxt, next, eleventy) cannot render it at all. Even on Svelte sites it isn't automatic: the docs site's `site/src/routes/+layout.svelte` renders `<ThemeToggle />` *outside* the page content and then runs an effect that reparents the button into whichever header is present (`.rf-header__inner` / `.rf-docs-header__inner` / `.rf-blog-header__inner`) on every navigation. plan-site's `+layout.svelte` is just `{@render children()}`, so it has no toggle — despite the rest of the theme-mode plumbing being present.

**`tint-lock` is a red herring.** The component reads `data-tint-lock` and renders nothing while locked, so the lock only *hides* an already-rendered toggle. `tint-lock=false` cannot *create* one; plan-site has nothing to reveal.

**The SSR plumbing is copy-pasted per app.** The no-flash setup — `prePaintScript()`, `htmlTintAttributes()`, `colorSchemeMetaContent()` from `@refrakt-md/content` — is hand-wired into each app's `hooks.server.ts` (the docs site and plan-site carry near-identical copies). New sites must re-derive this boilerplate to get correct theming.

**Search already shows the answer.** `searchButton` is a `LayoutStructureEntry` in `packages/transform/src/layouts.ts` emitting `<button class="rf-search-trigger" data-search-trigger>`; layouts place it via `chrome:searchButton` in the header region and opt in with `behaviors: ['search']`; `searchBehavior` (`@refrakt-md/behaviors`) enhances `[data-search-trigger]` framework-agnostically. The toggle is the lone exception to a pattern the rest of the top bar (search, mobile-menu) already follows.

## Goals

- The theme toggle becomes framework-agnostic **layout chrome + a behavior**, mirroring `searchButton` / `searchBehavior` exactly.
- Layouts place it in the header next to search and opt in via `behaviors: ['theme-toggle']`; it works on every adapter that renders refrakt layouts and loads behaviors.
- Lumina renders it **identically to today** (same icons and chrome).
- The no-flash SSR plumbing is injected by the adapters, not hand-rolled per app.
- The Svelte-only component and the docs-site reparenting effect are deleted; plan-site gets the toggle with no plan-site-specific code.

## Non-goals

- Changing search — it already follows the pattern and is the reference. (Wiring the **Pagefind index build** out-of-the-box per adapter is a related but separate concern.)
- A content `{% theme-toggle /%}` rune for arbitrary in-body placement — the header case is chrome, consistent with search; a rune would be a thin wrapper deferred under YAGNI.
- New theme tokens or dark palettes — themes already define them; this spec only surfaces the control.

## Capability 1 — Theme toggle as layout chrome

A `themeToggleButton` `LayoutStructureEntry` in `packages/transform/src/layouts.ts`, peer to `searchButton`:

```
<button class="rf-theme-toggle" data-theme-toggle aria-label="Toggle theme">
  <span class="rf-theme-toggle__icon"></span>
</button>
```

Each built-in layout (`defaultLayout`, `docsLayout`, blog, …) adds it to its `chrome` map and references it in the header region `children` next to `chrome:searchButton`, and adds `'theme-toggle'` to its `behaviors` array. Placement is layout-config-level — exactly how search and the mobile-menu button are placed — so the button is SSR'd inside the header region and needs **no** client reparenting.

## Capability 2 — Theme toggle behavior

A `themeToggleBehavior` in `@refrakt-md/behaviors`, registered in the layout-behaviors map as `'theme-toggle'` (alongside `'search'`), run by `initLayoutBehaviors`. It ports the logic from `ThemeToggle.svelte`:

- discover `[data-theme-toggle]` buttons;
- on click, cycle `auto → light → dark → auto`;
- persist the choice in `localStorage['rf-theme']` (silent if unavailable);
- apply it as `document.documentElement.dataset.theme` (remove for `auto`, letting `@media (prefers-color-scheme)` take over) — in lockstep with `prePaintScript()`;
- reflect the current preference onto the button as `data-theme-pref` (drives the icon).

The **tint-lock hide moves to pure CSS** (`html[data-tint-lock="true"] .rf-theme-toggle { display: none }`). CSS reacts to the attribute on client navigation automatically, so the component's `MutationObserver` is dropped. The behavior has no external dependency and is pure client state.

## Capability 3 — Lumina appearance (unchanged look)

Move the `.rf-theme-toggle` styles and the three mask-image icons (auto / light / dark) from `ThemeToggle.svelte`'s scoped `<style>` into a Lumina stylesheet, keyed off `[data-theme-pref]` rather than a component-swapped class — pixel-identical to today. Mechanism (the chrome entry + behavior) is **core**; appearance (CSS, icon set, chrome shape) is the **theme**, the same split every rune uses. A theme with no dark tokens can hide the control purely in CSS.

## Capability 4 — Adapter-injected no-flash plumbing

The pre-paint script + `htmlTintAttributes` + `colorSchemeMetaContent` injection (today duplicated in each app's `hooks.server.ts`) moves into the adapters: `@refrakt-md/sveltekit` first (a provided `handle` / hook), then each of html / astro / nuxt / next / eleventy injecting at its own document boundary. Apps stop hand-rolling theme hooks; a fresh scaffold gets no-flash theming **and** the toggle with zero setup.

## Capability 5 — Remove the Svelte-only path

- Delete `ThemeToggle.svelte` and its export from `@refrakt-md/svelte`.
- Delete the docs-site `+layout.svelte` `<ThemeToggle />` render and its reparenting effect; the toggle now appears via layout chrome.
- plan-site gets the toggle automatically — it renders the same layouts and loads the same behaviors.

## Acceptance Criteria

- [ ] A `themeToggleButton` layout chrome entry emits `<button class="rf-theme-toggle" data-theme-toggle>` with an icon span; the default / docs / blog layouts place it in the header next to search and declare `behaviors: ['theme-toggle']`.
- [ ] A `theme-toggle` behavior cycles auto→light→dark, persists `rf-theme`, applies `data-theme` on `<html>`, and reflects `data-theme-pref` on the button.
- [ ] Tint-locked pages hide the toggle via CSS (`html[data-tint-lock="true"]`), with no JS observer.
- [ ] Lumina renders the toggle identically to the current `ThemeToggle.svelte` (same icons + chrome), keyed off `[data-theme-pref]`.
- [ ] The no-flash SSR plumbing is injected by the SvelteKit adapter; the docs site and plan-site no longer hand-roll it in `hooks.server.ts`.
- [ ] `ThemeToggle.svelte` and its `@refrakt-md/svelte` export are removed; the docs-site reparenting effect is removed; the docs site still shows a working toggle.
- [ ] plan-site shows a working light/dark/auto toggle in its header with no plan-site-specific code.
- [ ] The toggle works framework-agnostically — verified on SvelteKit and on the html adapter (the no-Svelte proof).

## Out of scope / follow-ups

- **Search index (Pagefind) out-of-the-box** per adapter — the toggle's top-bar sibling; the chrome+behavior is already shared, but the index build is still app-wired. Separate spec.
- **Author-configurable chrome** — which controls appear and where. This applies uniformly to search, the mobile-menu button, and the toggle; if per-site control is wanted it should be solved for all chrome at once, not special-cased for the toggle. The toggle ships in the default-layout header by default until then.
- A content `{% theme-toggle /%}` rune for arbitrary placement — a thin wrapper over the same chrome/behavior, deferred under YAGNI.

## References

- {% ref "SPEC-052" /%} — tint cascade and `data-tint-lock`, which the toggle respects.
- The search trigger (`searchButton` in `packages/transform/src/layouts.ts`) + `searchBehavior` in `@refrakt-md/behaviors` — the chrome+behavior precedent this mirrors.

{% /spec %}
