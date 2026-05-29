{% work id="WORK-289" status="done" priority="high" complexity="simple" source="SPEC-073" tags="theme,toggle,lumina,css" milestone="v0.16.0" %}

# Lumina theme-toggle styling (identical look)

Style the chrome toggle (WORK-288) in Lumina so it renders **pixel-identical to today's `ThemeToggle.svelte`** — same chrome, same three icons. The component's appearance lives in its scoped `<style>`; that moves into a Lumina stylesheet, keyed off the `data-theme-pref` attribute the behavior sets rather than a component-swapped class.

## Acceptance Criteria
- [x] `.rf-theme-toggle` chrome (size, border, radius, hover, focus-visible) is reproduced in a Lumina stylesheet, matching the current component exactly.
- [x] The three mask-image icons (auto / light / dark) are ported and selected via `[data-theme-pref]` (e.g. `.rf-theme-toggle[data-theme-pref="dark"] .rf-theme-toggle__icon`), so the icon tracks the behavior's state.
- [x] Tint-locked pages hide the toggle purely in CSS — `html[data-tint-lock="true"] .rf-theme-toggle { display: none }` — with no JS observer (the lock state already lands on `<html>`).
- [x] The stylesheet is imported into Lumina's entry and shows up in CSS tree-shaking for the block.
- [ ] Visual parity is confirmed against the current toggle (docs site before/after).

## Approach
Lift the rules from `ThemeToggle.svelte`'s `<style>` into `packages/lumina/styles/runes/theme-toggle.css` (or the chrome stylesheet), rekeying the icon selectors from `.rf-theme-toggle__icon--{pref}` to `.rf-theme-toggle[data-theme-pref="{pref}"] .rf-theme-toggle__icon`. Add the tint-lock hide rule. Import in `packages/lumina/index.css`. Mechanism stays in core (WORK-288); only appearance lives here, per the rune core/theme split.

## Dependencies
- {% ref "WORK-288" /%} — needs the chrome markup + `data-theme-pref` hook to style against.

## References
- {% ref "SPEC-073" /%}

## Resolution

Completed: 2026-05-27

Branch: `claude/v0.16.0`

### What was done
- `packages/lumina/styles/layouts/theme-toggle.css`: new chrome stylesheet. Ported `.rf-theme-toggle` chrome (2rem square, border, `--rf-radius-md`, hover, focus-visible, transition) and the three mask-image icons verbatim from the former `ThemeToggle.svelte`, rekeying the icon selector from a swapped class to `data-theme-pref` — base `.rf-theme-toggle__icon` carries the auto glyph (so the SSR'd button isn't iconless before hydration), with `[data-theme-pref="light"]`/`[data-theme-pref="dark"]` swapping in the sun/moon. Tint-lock hide via `html[data-tint-lock="true"] .rf-theme-toggle { display: none }` (no JS observer).
- `packages/lumina/index.css`: import the new stylesheet next to `search.css`.

### Notes
- Placement needs no header CSS: `.rf-header__inner` is a flex row (`gap: 1rem`) with `.rf-search-trigger { margin-left: auto }`, so the toggle sits right after search automatically.
- **Visual-parity criterion left unchecked**: the CSS is a verbatim port (identical by construction), but I can't run a browser in this environment to do a before/after diff. Recommend a quick visual check when convenient.
- Lumina suite green (265, incl. CSS coverage). The toggle is now visible + styled; tint-lock hides it.
- Transient note: until WORK-291 removes the old `ThemeToggle.svelte`, the docs site renders *two* toggles (the chrome one + the still-mounted component). WORK-291 is next to resolve that.

{% /work %}
