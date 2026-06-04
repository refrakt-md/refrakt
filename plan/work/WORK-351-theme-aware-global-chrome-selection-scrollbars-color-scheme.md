{% work id="WORK-351" status="ready" priority="medium" complexity="simple" source="" milestone="v0.19.0" tags="lumina,chrome,dark-mode,a11y,polish" %}

# Theme-aware global chrome: selection, scrollbars, color-scheme

Three pieces of browser chrome currently ignore the theme. Make them token-driven
and mode-aware.

## Acceptance Criteria
- [ ] A branded `::selection` rule exists globally (primary-tinted background, legible foreground) — replacing the native/OS blue currently shown on text selection.
- [ ] `color-scheme` is declared per mode on `:root` (light / dark) so native chrome — including the main scrollbar — tracks the theme instead of always rendering dark.
- [ ] Scrollbars are styled consistently and theme-aware via tokens (`scrollbar-color` + a thin `::-webkit-scrollbar` treatment), applied globally and to overflow containers (codegroup, datatable, drawer body, nav/sidebar). No hard-coded always-dark scrollbar.
- [ ] All three respect light and dark; verified in both modes.

## Approach
Add `::selection` and `:root { color-scheme }` to `global.css`; define
`--rf-color-scrollbar*`/reuse muted+surface tokens for `scrollbar-color`; apply a
shared scrollbar treatment (custom-property-driven) to the known overflow
surfaces. Keep it minimal — `color-scheme` alone fixes the native main-scroll
"always dark"; explicit scrollbar styling refines the overflow containers.

## References
- `packages/lumina/styles/global.css`; existing per-container scrollbar rules in `styles/layouts/{docs,plan}.css`
- Selection state precedent: `packages/lumina/styles/dimensions/state.css`

{% /work %}
