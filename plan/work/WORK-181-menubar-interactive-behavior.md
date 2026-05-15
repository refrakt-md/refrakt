{% work id="WORK-181" status="ready" priority="high" complexity="moderate" tags="nav, behaviors, a11y, mobile" source="SPEC-046" milestone="v0.13.0" %}

# Menubar interactive behavior — dropdowns, hamburger, keyboard

Layer interaction on top of the static menubar layout from {% ref "WORK-178" /%}. On desktop, group triggers open submenus on click (and optionally hover); on mobile, the entire menubar collapses behind a hamburger trigger and groups become accordion sections. Includes keyboard navigation, focus management, and dismissal — all the affordances a real navigation menu needs.

## Acceptance Criteria

- [ ] `@refrakt-md/behaviors` ships a `nav-menubar` behavior that initialises on `[data-layout="menubar"]` nav elements
- [ ] Each group trigger toggles its submenu via `data-open="true|false"` on the group; only one submenu open at a time on desktop
- [ ] Submenu closes on: trigger click again, `Escape`, click outside the nav, focus moving outside the nav
- [ ] Keyboard navigation: `ArrowDown` from a trigger focuses the first submenu item; `ArrowUp` / `ArrowDown` move within a submenu; `Escape` closes and returns focus to the trigger; `ArrowLeft` / `ArrowRight` move between triggers (with submenu auto-switching if one was open)
- [ ] `aria-haspopup="true"`, `aria-expanded` reflecting open state, `aria-controls` pointing at the submenu, `role="menu"` / `role="menuitem"` where appropriate
- [ ] Mobile hamburger: when viewport is below the breakpoint, the menubar collapses to a single trigger button (emitted by the rune in a `data-name="trigger"` slot), and clicking it expands the full menubar inline (or as an overlay — theme decides via CSS, behaviour is style-agnostic)
- [ ] Mobile expanded state uses the same group expand/collapse mechanism (reuse `data-open` on groups), so a single mental model covers both viewports
- [ ] Lumina ships CSS for the desktop dropdown styles, mobile hamburger button, and the mobile expanded panel — all keyed off `[data-open]` and the existing layout modifier
- [ ] The trigger button is emitted by the nav rune itself when `layout="menubar"` (inside a `data-name="trigger"` element); themes position it via CSS without needing a separate `nav-toggle` rune
- [ ] CSS coverage tests updated for the new selectors
- [ ] Authoring docs note that menubars include keyboard / mobile affordances out of the box — no additional authoring required

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

{% /work %}
