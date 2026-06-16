{% work id="WORK-211" status="done" priority="high" complexity="moderate" tags="lumina, theme-toggle, ui, prerequisite" source="SPEC-052" milestone="v0.14.0" %}

# Add theme toggle to Lumina

Lumina currently does not ship a theme toggle. SPEC-052's tint cascade requires a toggle that honours `data-tint-lock` (hides on locked pages, shows + functions on unlocked pages). This work item adds the toggle — implementation, persistence, contract documentation.

## Acceptance Criteria

- [x] Theme toggle component shipped as `ThemeToggle.svelte` in `@refrakt-md/svelte` (not Lumina directly — adapter-level so any theme using SvelteKit can use it; Lumina styles it via the contract's `--rf-*` tokens)
- [x] Three states (auto / light / dark) cycle on click
- [x] State persists via `localStorage` (key `rf-theme`, in lockstep with the pre-paint script from {% ref "WORK-214" /%})
- [x] Pre-paint script applies saved preference before first paint *(shipped in Chunk 9 / WORK-214; hooks.server.ts now injects it)*
- [x] Hides itself when `<html data-tint-lock="true"`
- [x] `MutationObserver` watches `data-tint-lock` for client-side navigation between locked and unlocked pages
- [x] Locked pages preserve saved preference in localStorage — the toggle reads but doesn't apply on locked pages; reactivates on navigation to an unlocked page
- [x] Keyboard accessible (button element, `aria-label`, `title`, `:focus-visible` outline)
- [x] Built-in icon variants for auto/light/dark using inline SVG mask-images; `class` and `children` props allow custom presentation while keeping behaviour
- [x] Integrated on the refrakt site as a fixed top-right element via `+layout.svelte` (per {% ref "WORK-215" /%})
- [ ] Dedicated `/docs/themes/lumina/theme-toggle` documentation page *(deferred — the cascade docs page at `/docs/themes/tint-cascade` covers the toggle's behaviour in the "How it works" section; a dedicated reference page can come later if the contract grows)*

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
