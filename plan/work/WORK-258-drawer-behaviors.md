{% work id="WORK-258" status="done" priority="medium" complexity="moderate" source="SPEC-060" tags="behaviors, ui, progressive-enhancement, dialog" milestone="v0.15.0" %}

# Drawer behaviors (progressive enhancement, `<dialog>`, shortcut, URL hash sync)

Progressive-enhancement JS that turns the in-flow drawer body (rendered by WORK-257) into a `<dialog>` and intercepts xref clicks. esc-to-close, focus trap, and `inert` background come from the platform's native `<dialog>` semantics; the behaviors layer handles enhancement, trigger interception, keyboard shortcuts, URL hash sync, and back-button.

## Acceptance Criteria

- [x] On page load, for each `.rf-drawer` element: enhance into a `<dialog>` (or wrap/move accordingly — implementation detail, contract is no-JS-visible / JS-hidden); reveal the close button (`hidden` removed)
- [x] Query for `a[data-target-type="drawer"]` whose `href="#drawer-{id}"` matches a drawer on this page; attach click interceptor that calls `event.preventDefault()` and `dialog.showModal()`
- [x] Esc key closes the panel (native dialog behavior)
- [x] Backdrop click closes the panel (`event.target === dialog`)
- [x] Close button click closes the panel
- [x] Keyboard shortcut opens the panel; skipped when focus is in input/textarea/select/contenteditable
- [x] Shortcut parser supports bare keys and modifier prefixes (`cmd+`, `ctrl+`, `alt+`, `shift+`)
- [x] Multiple drawers with the same shortcut emit a dev-mode warning naming both rune locations; last-registered wins
- [x] URL hash sync: on page load, if `location.hash === "#drawer-{id}"`, the drawer opens automatically
- [x] Opening a drawer updates `location.hash` via replaceState; closing clears it
- [x] Browser back button closes an open drawer when the open-action set the hash
- [x] Opening one drawer while another is open closes the first (matches native `<dialog>` single-modal semantics; browsers enforce this)
- [x] Authoring docs cover the xref-as-trigger pattern, progressive enhancement model, keyboard shortcut conventions, and the `data-target-type` convention as a primitive available to other runes

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

## Resolution

Completed: 2026-05-23

Branch: `claude/v0.15.0`

### What was done
- `packages/behaviors/src/behaviors/drawer.ts` — progressive-enhancement module. On init for each `[data-rune="drawer"]` element:
  - Replaces the `<section>` with a `<dialog>`, preserving id and attributes so fragment navigation and downstream queries still work.
  - Reveals the close button (`hidden` removed).
  - Queries `a[data-target-type="drawer"]` whose href fragment matches this drawer's id and attaches click interceptors that `preventDefault()` and call `dialog.showModal()`.
  - Wires close button, backdrop click, and a global keydown listener for the `shortcut` (skipped when focus is in input/textarea/select/contenteditable).
  - URL hash sync: opens automatically when `location.hash` matches on init; updates the hash via `replaceState` on open and clears it on close; `popstate` closes drawers whose hash is no longer current (back-button support).
  - Single-modal: opening one drawer closes any other already open, matching native `<dialog>` semantics.
  - Same-shortcut collision warning names both drawers (last wins, matching the spec).
- `packages/behaviors/src/index.ts` — exported `drawerBehavior` and registered it in the rune-name → behavior map under `drawer`.
- `site/content/runes/drawer.md` — rewrote the docs to cover the full picture: xref-as-trigger pattern, the `data-target-type` neutral-primitive convention, progressive-enhancement contract (no-JS visible / JS hidden), keyboard-shortcut conventions, page-scoped ids, title-level auto-detection, and the snippet-in-drawer composition pattern.

### Tests
- `packages/behaviors/test/drawer.test.ts` — 23 tests covering enhancement (section → dialog with preserved attributes, close button revealed, initial `data-state="closed"`), trigger interception (fragment match, absolute href ending in fragment, non-matching href ignored), close paths (close button, backdrop click), hash sync (open updates hash, close clears it, hash-on-load auto-opens), keyboard shortcuts (bare key, focus-in-input skip, `cmd+k` modifier semantics, collision warning), multi-drawer single-modal, popstate, and cleanup. Also `parseShortcut` unit tests for the parser surface.
- The behavior module exports a `__resetDrawerState` helper so tests can clear per-document state between cases without leaking the module-level registry.
- JSDOM doesn't ship `<dialog>.showModal`, so the test file patches the prototype to flip the `open` attribute and emit `close` events deterministically. The behavior's `try/catch` around `showModal()` also makes production behaviour graceful in environments without native dialog support.
- 2809/2809 tests pass.

### Notes
- The behavior is scoped per-document, not per-element, because shortcuts and `popstate` are global. Each call to `drawerBehavior(el)` registers the drawer with a module-level `Map<Document, Map<id, DrawerRecord>>`; the global listeners are attached once per document. Cleanups remove per-drawer listeners and registry entries — the global listeners stay attached and no-op when the registry is empty.
- The `cmd+` and `ctrl+` prefixes both match "the platform's primary modifier" (Cmd on macOS, Ctrl elsewhere) because authors writing `cmd+k` typically mean the cross-platform "modifier+k" shortcut rather than literally requiring Meta. Multi-modifier combos work too (`ctrl+shift+/`).
- Same-page href compaction from WORK-257 means triggers carry fragment-only hrefs (`#drawer-x`) by default, but the behavior also accepts absolute hrefs that end with the matching fragment so cross-page xref-to-drawer mechanics work consistently.
- Phase 3 of the v0.15.0 milestone (drawer rune + behaviors) is now complete. Phase 4 (expand rune, WORK-259/260) is next.

{% /work %}
