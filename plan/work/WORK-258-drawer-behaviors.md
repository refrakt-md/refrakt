{% work id="WORK-258" status="ready" priority="medium" complexity="moderate" source="SPEC-060" tags="behaviors, ui, progressive-enhancement, dialog" milestone="v0.15.0" %}

# Drawer behaviors (progressive enhancement, `<dialog>`, shortcut, URL hash sync)

Progressive-enhancement JS that turns the in-flow drawer body (rendered by WORK-257) into a `<dialog>` and intercepts xref clicks. esc-to-close, focus trap, and `inert` background come from the platform's native `<dialog>` semantics; the behaviors layer handles enhancement, trigger interception, keyboard shortcuts, URL hash sync, and back-button.

## Acceptance Criteria

- [ ] On page load, for each `.rf-drawer` element: enhance into a `<dialog>` (or wrap/move accordingly — implementation detail, contract is no-JS-visible / JS-hidden); reveal the close button (`hidden` removed)
- [ ] Query for `a[data-target-type="drawer"]` whose `href="#drawer-{id}"` matches a drawer on this page; attach click interceptor that calls `event.preventDefault()` and `dialog.showModal()`
- [ ] Esc key closes the panel (native dialog behavior)
- [ ] Backdrop click closes the panel (`event.target === dialog`)
- [ ] Close button click closes the panel
- [ ] Keyboard shortcut opens the panel; skipped when focus is in input/textarea/select/contenteditable
- [ ] Shortcut parser supports bare keys and modifier prefixes (`cmd+`, `ctrl+`, `alt+`, `shift+`)
- [ ] Multiple drawers with the same shortcut emit a dev-mode warning naming both rune locations; last-registered wins
- [ ] URL hash sync: on page load, if `location.hash === "#drawer-{id}"`, the drawer opens automatically
- [ ] Opening a drawer updates `location.hash` via replaceState; closing clears it
- [ ] Browser back button closes an open drawer when the open-action set the hash
- [ ] Opening one drawer while another is open closes the first (matches native `<dialog>` single-modal semantics; browsers enforce this)
- [ ] Authoring docs cover the xref-as-trigger pattern, progressive enhancement model, keyboard shortcut conventions, and the `data-target-type` convention as a primitive available to other runes

## Approach

Per the spec's Behavior section:

- `packages/behaviors/src/drawer.ts` — initialization scans for `.rf-drawer` elements and enhances each
- Exported via `packages/behaviors/src/index.ts`
- Global `keydown` listener with focus-element guard handles shortcuts
- `popstate` listener handles back-button-closes-drawer

No registry entry in `packages/svelte/src/registry.ts` — drawer is identity-transform + progressive enhancement, no Svelte component needed.

## Dependencies

- {% ref "WORK-257" /%} — drawer rune produces the `.rf-drawer` elements and `data-shortcut` markers that this layer enhances

## References

- {% ref "SPEC-060" /%} — drawer-rune spec (Behavior section)
- `packages/behaviors/` — pattern for progressive-enhancement runes (accordion, tabs)
- `<dialog>` MDN documentation — native modal semantics

{% /work %}
