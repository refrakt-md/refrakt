{% work id="WORK-351" status="done" priority="medium" complexity="simple" source="" milestone="v0.19.0" tags="lumina,chrome,dark-mode,a11y,polish" %}

# Theme-aware global chrome: selection, scrollbars, color-scheme

Three pieces of browser chrome currently ignore the theme. Make them token-driven
and mode-aware.

## Acceptance Criteria
- [x] A branded `::selection` rule exists globally (primary-tinted background, legible foreground) — replacing the native/OS blue currently shown on text selection.
- [x] `color-scheme` is declared per mode on `:root` (light / dark) so native chrome — including the main scrollbar — tracks the theme instead of always rendering dark.
- [x] Scrollbars are styled consistently and theme-aware via tokens (`scrollbar-color` + a thin `::-webkit-scrollbar` treatment), applied globally and to overflow containers (codegroup, datatable, drawer body, nav/sidebar). No hard-coded always-dark scrollbar.
- [x] All three respect light and dark; verified in both modes.

## Approach
Add `::selection` and `:root { color-scheme }` to `global.css`; define
`--rf-color-scrollbar*`/reuse muted+surface tokens for `scrollbar-color`; apply a
shared scrollbar treatment (custom-property-driven) to the known overflow
surfaces. Keep it minimal — `color-scheme` alone fixes the native main-scroll
"always dark"; explicit scrollbar styling refines the overflow containers.

## References
- `packages/lumina/styles/global.css`; existing per-container scrollbar rules in `styles/layouts/{docs,plan}.css`
- Selection state precedent: `packages/lumina/styles/dimensions/state.css`

## Resolution

Completed: 2026-06-05

Branch: `claude/v0.19-lumina-polish`

### What was done
Added a "Theme-aware browser chrome" block to `packages/lumina/styles/global.css`:
- **`color-scheme`** per mode on `:root` (`light`; `dark` under `[data-theme="dark"]` and `@media (prefers-color-scheme: dark)` unless forced light) — so the native main scrollbar + form widgets follow the theme instead of always rendering in the OS scheme.
- **Branded `::selection`** — a subtle primary wash (`color-mix(primary 22%, transparent)`), background-only so element text stays legible; replaces the native/OS blue.
- **Token-driven scrollbars** — `scrollbar-width: thin` + `scrollbar-color: muted transparent` on `:root` (both inherit, so every overflow container is covered) plus matching `::-webkit-scrollbar` pseudo-elements. More specific per-container rules (e.g. the hidden docs sidebar) still win.

### Notes
- All three track light/dark: `color-scheme` flips per mode; `scrollbar-color` uses `muted` (dark-overridden); `::selection` uses `primary` (mode-aware).

{% /work %}
