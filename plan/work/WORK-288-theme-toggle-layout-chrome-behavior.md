{% work id="WORK-288" status="ready" priority="high" complexity="moderate" source="SPEC-073" tags="theme,toggle,chrome,behaviors,layout" milestone="v0.16.0" %}

# Theme-toggle layout chrome + behavior

Make the light/dark/auto toggle framework-agnostic by turning it into **layout chrome + a behavior**, exactly mirroring the search trigger (`searchButton` + `searchBehavior`). This is the foundation of {% ref "SPEC-073" /%}: a `<button>` emitted by the layout engine plus a vanilla behavior that any adapter loading `@refrakt-md/behaviors` enhances — replacing the Svelte-only `ThemeToggle.svelte`.

## Acceptance Criteria
- [ ] A `themeToggleButton` `LayoutStructureEntry` in `packages/transform/src/layouts.ts` emits `<button class="rf-theme-toggle" data-theme-toggle aria-label="…">` containing `<span class="rf-theme-toggle__icon">` — peer to `searchButton`.
- [ ] The `defaultLayout`, `docsLayout`, and blog layouts add it to their `chrome` map and reference it in the header region `children` next to `chrome:searchButton`.
- [ ] Each of those layouts adds `'theme-toggle'` to its `behaviors` array.
- [ ] A `themeToggleBehavior` in `@refrakt-md/behaviors` discovers `[data-theme-toggle]` buttons and, on click, cycles `auto → light → dark → auto`.
- [ ] The behavior persists the choice in `localStorage['rf-theme']` (silent when unavailable) and applies it as `document.documentElement.dataset.theme` (removed for `auto`), in lockstep with `prePaintScript()`.
- [ ] The behavior reflects the current preference onto the button as `data-theme-pref` (the icon hook for Capability 3).
- [ ] The behavior is registered in the layout-behaviors map as `'theme-toggle'` and runs via `initLayoutBehaviors`; it has no external dependency.

## Approach
Add `themeToggleButton` alongside `searchButton`/`menuButton` in `layouts.ts` (a static SVG isn't enough since the icon is per-state, so the button holds a single `__icon` span the CSS swaps via `[data-theme-pref]`). Port the cycle/persist/apply logic out of `ThemeToggle.svelte` into `packages/behaviors/src/behaviors/theme-toggle.ts`, register it in the `LAYOUT_BEHAVIORS` map next to `'search'`, and export it from the behaviors index. Tint-lock hiding is deferred to CSS (WORK-289), so the behavior drops the component's `MutationObserver`.

## Dependencies
_None — this is the foundation for the rest of SPEC-073._

## References
- {% ref "SPEC-073" /%}

{% /work %}
