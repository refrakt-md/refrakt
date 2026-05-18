{% work id="WORK-181" status="done" priority="high" complexity="moderate" tags="nav, behaviors, a11y, mobile" source="SPEC-046" milestone="v0.13.0" %}

# Menubar interactive behavior — dropdowns, hamburger, keyboard

Layer interaction on top of the static menubar layout from {% ref "WORK-178" /%}. On desktop, group triggers open submenus on click (and optionally hover); on mobile, the entire menubar collapses behind a hamburger trigger and groups become accordion sections. Includes keyboard navigation, focus management, and dismissal — all the affordances a real navigation menu needs.

## Acceptance Criteria

- [x] `@refrakt-md/behaviors` ships a `nav-menubar` behavior that initialises on `[data-layout="menubar"]` nav elements
- [x] Each group trigger toggles its submenu via `data-open="true|false"` on the group; only one submenu open at a time on desktop
- [x] Submenu closes on: trigger click again, `Escape`, click outside the nav, focus moving outside the nav
- [x] Keyboard navigation: `ArrowDown` from a trigger focuses the first submenu item; `ArrowUp` / `ArrowDown` move within a submenu; `Escape` closes and returns focus to the trigger; `ArrowLeft` / `ArrowRight` move between triggers (with submenu auto-switching if one was open)
- [x] `aria-haspopup="true"`, `aria-expanded` reflecting open state, `aria-controls` pointing at the submenu, `role="menu"` / `role="menuitem"` where appropriate
- [x] Mobile hamburger: when viewport is below the breakpoint, the menubar collapses to a single trigger button (emitted by the rune in a `data-name="trigger"` slot), and clicking it expands the full menubar inline (or as an overlay — theme decides via CSS, behaviour is style-agnostic)
- [x] Mobile expanded state uses the same group expand/collapse mechanism (reuse `data-open` on groups), so a single mental model covers both viewports
- [x] Lumina ships CSS for the desktop dropdown styles, mobile hamburger button, and the mobile expanded panel — all keyed off `[data-open]` and the existing layout modifier
- [x] The trigger button is emitted by the nav rune itself when `layout="menubar"` (inside a `data-name="trigger"` element); themes position it via CSS without needing a separate `nav-toggle` rune
- [x] CSS coverage tests updated for the new selectors

Reference doc page (`site/content/runes/nav.md`) updates noting the built-in keyboard / mobile affordances are owned by {% ref "WORK-183" /%}.

## Approach

The behavior is a single module that progressively enhances any nav with `data-layout="menubar"`. It does **not** need to know about layout or theme — it manipulates `data-open` and ARIA attributes; CSS does the visual work.

Open / close is purely DOM state. No framework dependency, no portal. Submenus are siblings of their triggers in the DOM (the existing `NavGroup` structure already nests items under each group); the behavior toggles `data-open` on the group element.

The hamburger trigger is emitted by the rune itself (via the engine's `structure` config — a `data-name="trigger"` element added when `layout="menubar"`). Themes show it only on mobile via media queries. The behavior treats it like any other group trigger — clicking it toggles `data-open` on the whole nav, which the CSS interprets as "show the expanded mobile menu."

Hover-to-open on desktop is **out of scope** for this item. Click-to-open is the modern accessible default; hover-only menus are a UX antipattern (especially for users on hybrid devices). If a theme wants hover behaviour it can add it with a few lines of CSS; no need to bake it into the behavior.

## Dependencies

- {% ref "WORK-178" /%} — needs `layout="menubar"` plumbing and the `data-name="trigger"` structural element. Confirm the trigger element is emitted there or land that change as part of this item.

## References

- {% ref "SPEC-046" /%} — "Mobile Strategy" section, plus the open question on hamburger placement (resolved: rune emits the trigger).
- `packages/behaviors/` — existing behaviors (tabs, accordion, datatable) as patterns for module structure, init signatures, and a11y.
- WAI-ARIA Authoring Practices — menu pattern for keyboard model; cite in PR description.

## Resolution

Completed: 2026-05-18

Branch: `claude/v0.13-pagination-nav-bvuEP`

### What was done
- `packages/runes/src/tags/nav.ts` — when `layout="menubar"`, the nav rune emits a `<button data-name="trigger" type="button" aria-label="Toggle navigation" aria-expanded="false">` as the first child. Themes show it only on mobile via the existing CSS (set up in WORK-178). Non-menubar layouts are unaffected (byte-identical).
- `packages/behaviors/src/behaviors/nav-menubar.ts` — new behavior. Activates on `data-layout="menubar"`. For each group: assigns ids, sets ARIA (`role="button"`, `aria-haspopup`, `aria-expanded`, `aria-controls`, `role="menu"` on the panel). Click and Enter/Space toggle `data-open`; only one group open at a time. Arrow-key navigation: ArrowDown enters submenu, ArrowUp/Down moves within submenu, ArrowLeft/Right moves between triggers (auto-switching submenu when one was open), Escape closes and returns focus. Document-level click-outside and `focusout` listeners close all submenus. The hamburger button toggles `data-open` on the nav element itself for mobile mode.
- `packages/behaviors/src/index.ts` — single `navBehavior` dispatcher registered under the `nav` rune key. Internally invokes both `navCollapsibleBehavior` and `navMenubarBehavior`, which each short-circuit if their layout/attribute doesn't apply, so non-interactive navs cost nothing.

### Notes
- Hover-to-open is intentionally out of scope (per work item approach). Click-to-open with full keyboard support is the WAI-ARIA menu pattern default.
- The `<button data-name="trigger">` lives inside the nav element. Themes already had it hidden on desktop and shown on mobile via the breakpoint media query added in WORK-178; the behavior just wires its click handler.
- The collapsible and menubar behaviors are intentionally separate modules — they share the `nav` rune dispatcher but have distinct activation predicates (`data-collapsible="true"` vs `data-layout="menubar"`) and zero overlap in DOM mutations.
- WAI-ARIA reference: https://www.w3.org/WAI/ARIA/apg/patterns/menubar/

{% /work %}
