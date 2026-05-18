{% work id="WORK-211" status="ready" priority="high" complexity="medium" tags="lumina, theme-toggle, ui, prerequisite" source="SPEC-052" milestone="v0.14.0" %}

# Add theme toggle to Lumina

Lumina currently does not ship a theme toggle. SPEC-052's tint cascade requires a toggle that honours `data-tint-lock` (hides on locked pages, shows + functions on unlocked pages). This work item adds the toggle — implementation, persistence, contract documentation.

## Acceptance Criteria

- [ ] A theme toggle UI component ships with Lumina — likely as a Svelte component exported from `@refrakt-md/lumina` (mirror the existing component-registration pattern other themes use)
- [ ] The toggle button has three states: light, dark, auto (system pref). User clicks cycle through them
- [ ] Selected state persists across navigations and reloads via `localStorage`
- [ ] On page load, the toggle reads the saved preference and applies `data-theme` on `<html>` *before first paint* (anti-FOIT inline script)
- [ ] When `<html>` has `data-tint-lock="true"`, the toggle hides itself entirely (per SPEC-052 — locked pages shouldn't show a toggle that does nothing meaningful)
- [ ] When the page is locked, the user's saved preference is *preserved* but not applied — navigating to an unlocked page restores their saved choice
- [ ] The toggle is keyboard-accessible (Tab + Enter / Space) and screen-reader-accessible (clear `aria-label`)
- [ ] The toggle integrates naturally with the existing site header/chrome — placement decided during implementation (likely top-right of header); matches Lumina's visual language
- [ ] A `/docs/themes/lumina/theme-toggle` page documents the contract for downstream themes — what attributes the toggle reads, how it persists state, what it does on locked pages
- [ ] Visual regression check: toggle renders cleanly in light and dark mode against both the neutral default and tideline

## Approach

The toggle is a small UI component, not a deep architectural change. Most of the work is plumbing — the inline pre-paint script, the localStorage contract, the lock-detection.

The pre-paint script is the tricky part:

```html
<script>
  (function() {
    var locked = document.documentElement.dataset.tintLock === 'true';
    if (locked) return; // honour SSR-resolved lock
    var saved = localStorage.getItem('rf-theme');
    var resolved = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', resolved);
  })();
</script>
```

This runs before paint, so there's no flash. It deliberately no-ops on locked pages — SSR has already set the correct `data-theme` for those.

The toggle component itself is straightforward: button, three states, click handler that writes to localStorage and updates `data-theme`. Hide-when-locked is a CSS rule on the toggle component: `[data-tint-lock="true"] .lumina-theme-toggle { display: none }`.

Pre-paint script and toggle component land together — they share state (the localStorage key, the data-theme attribute) and only work as a pair.

## Dependencies

- {% ref "WORK-189" /%} — `theme.colorScheme` field at site level is the toggle's site-wide ancestor. The toggle reads `data-tint-lock` which SPEC-052 will emit (per {% ref "WORK-214" /%}); for now, design the toggle's hide-when-locked behaviour so it works the moment `data-tint-lock` starts appearing.

## References

- {% ref "SPEC-052" /%} — "Toggle UI" section explains the contract
- {% ref "WORK-214" /%} — renderer integration that will emit `data-tint-lock` on locked pages
- Linear's, Vercel's, Stripe's theme toggles — references for placement / interaction patterns

{% /work %}
