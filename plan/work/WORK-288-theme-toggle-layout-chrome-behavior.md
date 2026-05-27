{% work id="WORK-288" status="done" priority="high" complexity="moderate" source="SPEC-073" tags="theme,toggle,chrome,behaviors,layout" milestone="v0.16.0" %}

# Theme-toggle layout chrome + behavior

Make the light/dark/auto toggle framework-agnostic by turning it into **layout chrome + a behavior**, exactly mirroring the search trigger (`searchButton` + `searchBehavior`). This is the foundation of {% ref "SPEC-073" /%}: a `<button>` emitted by the layout engine plus a vanilla behavior that any adapter loading `@refrakt-md/behaviors` enhances — replacing the Svelte-only `ThemeToggle.svelte`.

## Acceptance Criteria
- [x] A `themeToggleButton` `LayoutStructureEntry` in `packages/transform/src/layouts.ts` emits `<button class="rf-theme-toggle" data-theme-toggle aria-label="…">` containing `<span class="rf-theme-toggle__icon">` — peer to `searchButton`.
- [x] The `defaultLayout`, `docsLayout`, and blog layouts add it to their `chrome` map and reference it in the header region `children` next to `chrome:searchButton`.
- [x] Each of those layouts adds `'theme-toggle'` to its `behaviors` array.
- [x] A `themeToggleBehavior` in `@refrakt-md/behaviors` discovers `[data-theme-toggle]` buttons and, on click, cycles `auto → light → dark → auto`.
- [x] The behavior persists the choice in `localStorage['rf-theme']` (silent when unavailable) and applies it as `document.documentElement.dataset.theme` (removed for `auto`), in lockstep with `prePaintScript()`.
- [x] The behavior reflects the current preference onto the button as `data-theme-pref` (the icon hook for Capability 3).
- [x] The behavior is registered in the layout-behaviors map as `'theme-toggle'` and runs via `initLayoutBehaviors`; it has no external dependency.

## Approach
Add `themeToggleButton` alongside `searchButton`/`menuButton` in `layouts.ts` (a static SVG isn't enough since the icon is per-state, so the button holds a single `__icon` span the CSS swaps via `[data-theme-pref]`). Port the cycle/persist/apply logic out of `ThemeToggle.svelte` into `packages/behaviors/src/behaviors/theme-toggle.ts`, register it in the `LAYOUT_BEHAVIORS` map next to `'search'`, and export it from the behaviors index. Tint-lock hiding is deferred to CSS (WORK-289), so the behavior drops the component's `MutationObserver`.

## Dependencies
_None — this is the foundation for the rest of SPEC-073._

## References
- {% ref "SPEC-073" /%}

## Resolution

Completed: 2026-05-27

Branch: `claude/v0.16.0`

### What was done
- `packages/transform/src/layouts.ts`: added a `themeToggleButton` `LayoutStructureEntry` (peer to `searchButton`) — `<button class="rf-theme-toggle" data-theme-toggle aria-label>` with a `<span class="rf-theme-toggle__icon">`. Added it to the `chrome` map of `defaultLayout`, `docsLayout`, `planLayout`, and `blogArticleLayout`, referenced as `chrome:themeToggleButton` next to `chrome:searchButton` (header `__inner` for default/docs/blog, toolbar for plan), and appended `'theme-toggle'` to each layout's `behaviors` array.
- `packages/behaviors/src/behaviors/theme-toggle.ts`: new `themeToggleBehavior` — discovers `[data-theme-toggle]`, cycles auto→light→dark→auto on click, persists `rf-theme`, applies `data-theme` on `<html>` (removed for auto), reflects `data-theme-pref` + aria/title on the button. No observer (tint-lock hide is CSS, WORK-289).
- `packages/behaviors/src/index.ts`: registered `'theme-toggle'` in the `layoutBehaviors` map and exported `themeToggleBehavior`.
- `packages/behaviors/test/theme-toggle.test.ts`: 5 jsdom tests (init reflect, default auto, full cycle persist/apply, no-op when absent, cleanup).

### Notes
- Added to `planLayout` too (beyond the literal criteria's "default/docs/blog") so plan-site gets the toggle — the original motivation. Runs automatically: `ThemeShell.svelte` already calls `initLayoutBehaviors()`.
- Icon is a bare span; per-state mask icon + chrome styling land in WORK-289. The button is functional but unstyled until then.
- Verified by rendering the real `defaultLayout`/`planLayout` (button present, `data-layout-behaviors` includes `theme-toggle`) and the behavior unit tests. transform (560) + behaviors + svelte (60) suites green.

{% /work %}
