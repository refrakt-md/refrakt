{% work id="WORK-289" status="ready" priority="high" complexity="simple" source="SPEC-073" tags="theme,toggle,lumina,css" milestone="v0.16.0" %}

# Lumina theme-toggle styling (identical look)

Style the chrome toggle (WORK-288) in Lumina so it renders **pixel-identical to today's `ThemeToggle.svelte`** — same chrome, same three icons. The component's appearance lives in its scoped `<style>`; that moves into a Lumina stylesheet, keyed off the `data-theme-pref` attribute the behavior sets rather than a component-swapped class.

## Acceptance Criteria
- [ ] `.rf-theme-toggle` chrome (size, border, radius, hover, focus-visible) is reproduced in a Lumina stylesheet, matching the current component exactly.
- [ ] The three mask-image icons (auto / light / dark) are ported and selected via `[data-theme-pref]` (e.g. `.rf-theme-toggle[data-theme-pref="dark"] .rf-theme-toggle__icon`), so the icon tracks the behavior's state.
- [ ] Tint-locked pages hide the toggle purely in CSS — `html[data-tint-lock="true"] .rf-theme-toggle { display: none }` — with no JS observer (the lock state already lands on `<html>`).
- [ ] The stylesheet is imported into Lumina's entry and shows up in CSS tree-shaking for the block.
- [ ] Visual parity is confirmed against the current toggle (docs site before/after).

## Approach
Lift the rules from `ThemeToggle.svelte`'s `<style>` into `packages/lumina/styles/runes/theme-toggle.css` (or the chrome stylesheet), rekeying the icon selectors from `.rf-theme-toggle__icon--{pref}` to `.rf-theme-toggle[data-theme-pref="{pref}"] .rf-theme-toggle__icon`. Add the tint-lock hide rule. Import in `packages/lumina/index.css`. Mechanism stays in core (WORK-288); only appearance lives here, per the rune core/theme split.

## Dependencies
- {% ref "WORK-288" /%} — needs the chrome markup + `data-theme-pref` hook to style against.

## References
- {% ref "SPEC-073" /%}

{% /work %}
