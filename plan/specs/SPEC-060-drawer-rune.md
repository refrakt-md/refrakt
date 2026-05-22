{% spec id="SPEC-060" status="draft" tags="runes, behaviors, ui, core" %}

# Drawer rune

A modal panel rune that slides in from one edge of the viewport, holding richer content than a tooltip but lighter than a navigation away. Inspired by Linear's pattern where in-page references expand to explainer panels rather than forcing the reader to leave context.

The rune wraps a small trigger and a richer body in a single block, separated by an `hr` delimiter so authors don't need to coordinate IDs across the page. Built on `<dialog>` for accessibility, with a keyboard-shortcut attribute as a first-class affordance.

## Problem

Some inline references are too rich for a tooltip and too peripheral to navigate to. The author wants to give the reader a quick-look explanation of a concept mentioned in passing — a sidebar of context — without sending them down a routing rabbit hole.

Today the choices are:

- **Link out** — loses context, breaks flow, and the destination page usually has too much surrounding chrome for what was a small clarification.
- **Inline accordion** — keeps context but balloons the source page when a section is expanded, and doesn't read naturally for "click this term to learn more" patterns.
- **Custom dialog code** — every site rolls its own; no shared accessibility behavior; not authorable from Markdown.

The drawer pattern is the missing primitive: a side-attached panel that overlays the page, holds rich content (text, code blocks, embedded runes), and closes cleanly back to where the reader was.

-----

## Design Principles

**One rune, one block.** Trigger and body live inside a single `{% drawer %}` block. No separate `{% drawer-trigger %}` rune, no detached-trigger coordination via IDs. Since the open panel is overlay-positioned, where the trigger sits in the DOM is decoupled from where the panel renders — so the "trigger somewhere distant" case has no real motivation.

**Markdown-native delimiter.** The split between trigger and body is an `hr` (`---`), not a child rune. Reinterpreting a primitive matches refrakt's wider approach and keeps the author surface tight.

**`<dialog>` for semantics.** Built on the platform's modal-dialog element so esc-to-close, focus trap, and `inert` background behavior come free. Themes can style via the `[open]` attribute; behaviors don't have to re-implement anything the platform already does.

**Keyboard shortcut as first-class.** Sites doing the view-source pattern want a `.` shortcut (GitHub convention). The rune accepts a `shortcut` attribute and the behaviors layer registers a global listener — opt-in per drawer.

**Progressive enhancement.** Without JS, the trigger is a link or button; clicking does nothing (or scrolls to an anchor) but the page remains functional. With JS, the dialog opens. v1 doesn't promise a no-JS rendering of the body; that's a future enhancement if a clear use case appears.

-----

## Authoring Surface

### Syntax

```markdoc
{% drawer title="Page source" shortcut="." %}
View source

---

{% code-file path=$page.path lang="md" /%}
{% /drawer %}
```

Trigger content lives above the `hr`; body content lives below. The trigger renders as a button (or anchor, with `href=`) inline at the rune's position. The body renders inside a `<dialog>` that's appended at the end of the page and shown on trigger activation.

### Attributes

| Attribute | Type | Default | Meaning |
|-----------|------|---------|---------|
| `title` | string | — | Panel heading. Renders in the panel header above the body. |
| `shortcut` | string | — | Keyboard shortcut to open the drawer. Single key or modifier+key (e.g. `"."`, `"k"`, `"cmd+k"`). |
| `side` | `"right"` \| `"left"` \| `"top"` \| `"bottom"` | `"right"` | Edge the panel slides from. |
| `size` | `"sm"` \| `"md"` \| `"lg"` | `"md"` | Panel width (or height for top/bottom). |
| `id` | string | auto-generated | Stable ID for deep linking (`#drawer-{id}` in URL). |
| `href` | string | — | If set, the trigger renders as an `<a>` instead of `<button>`. Used when the body content has a canonical page to link to as a no-JS fallback. |

### Content model

`delimited` — the first `hr` in the block splits trigger from body. Subsequent `hr`s in the body are preserved as content. If no `hr` is present, all content is treated as the body and the trigger falls back to a generic "Open" label (build warning suggesting an explicit trigger).

-----

## Output Contract

```html
<span class="rf-drawer rf-drawer--side-right rf-drawer--size-md" data-rune="drawer" data-shortcut=".">
  <button class="rf-drawer__trigger" type="button" aria-controls="drawer-abc123">
    View source
  </button>
  <dialog class="rf-drawer__panel" id="drawer-abc123">
    <header class="rf-drawer__panel-header">
      <h2 class="rf-drawer__panel-title">Page source</h2>
      <button class="rf-drawer__panel-close" type="button" aria-label="Close">×</button>
    </header>
    <div class="rf-drawer__panel-body">
      <!-- body content -->
    </div>
  </dialog>
</span>
```

BEM selectors:
- `.rf-drawer` — inline wrapper (the trigger lives here)
- `.rf-drawer__trigger` — clickable trigger (button or anchor)
- `.rf-drawer__panel` — `<dialog>` element
- `.rf-drawer__panel-header` — title + close-button row
- `.rf-drawer__panel-title` — title heading
- `.rf-drawer__panel-close` — close button
- `.rf-drawer__panel-body` — content container
- `.rf-drawer--side-{right|left|top|bottom}` — slide direction modifier
- `.rf-drawer--size-{sm|md|lg}` — size modifier

Data attributes:
- `data-rune="drawer"` on the wrapper (component dispatch)
- `data-shortcut` on the wrapper when `shortcut` is set (behaviors-layer pickup)
- `data-side`, `data-size` for variant styling

-----

## Behavior

A `drawer` behavior in `@refrakt-md/behaviors` handles activation:

1. **Trigger click** → `panel.showModal()`.
2. **Close button click** → `panel.close()`.
3. **Esc key** → handled natively by `<dialog>`.
4. **Backdrop click** → close. Implemented by listening to `click` on the dialog and closing when `event.target === dialog` (clicks outside the inner content but on the dialog backdrop).
5. **Shortcut key** → global keydown listener registered when `data-shortcut` is present. Opens the drawer when the key (and modifiers, if any) match.
6. **URL hash sync** (optional) → on page load, if `location.hash === "#drawer-{id}"`, the drawer opens automatically. Opening updates the hash; closing clears it.

### Shortcut handling rules

- Listener uses `keydown` at the document level.
- Skips when focus is inside `input`, `textarea`, `select`, or any `[contenteditable]` element.
- Multiple drawers with the same shortcut: last-registered wins. Dev mode logs a warning naming both rune locations.
- Modifier keys: `cmd+`, `ctrl+`, `alt+`, `shift+` prefixes supported; bare keys (no modifier) are also valid.

### Multiple drawers on one page

Each drawer is independent. Opening drawer A while drawer B is open closes B first (matches native `<dialog>` modality — only one modal dialog can be open at a time, browsers enforce this).

-----

## Engine Changes

- New rune schema in `packages/runes/src/tags/drawer.ts` with `createContentModelSchema` using a delimited content model
- Config entry in `packages/runes/src/config.ts` keyed `Drawer`, with modifier-from-meta for `side`/`size`, structural injection for the panel header (title + close)
- CSS in `packages/lumina/styles/runes/drawer.css`
- Behavior in `packages/behaviors/src/drawer.ts`, exported via `packages/behaviors/src/index.ts`
- Registry entry in `packages/svelte/src/registry.ts` is **not** needed — drawer is a pure identity-transform rune, behavior is progressive enhancement only

-----

## Acceptance Criteria

- [ ] `{% drawer %}` produces a wrapper with trigger and panel as described in the output contract
- [ ] Trigger and body are split by the first `hr` in the block
- [ ] Block without an `hr` renders body-only with a generic "Open" trigger and emits a build warning
- [ ] `title` attribute renders in the panel header
- [ ] `shortcut` attribute writes `data-shortcut` and registers a global keyboard listener
- [ ] `side` attribute applies `rf-drawer--side-{value}` modifier and `data-side`
- [ ] `size` attribute applies `rf-drawer--size-{value}` modifier and `data-size`
- [ ] `id` attribute (or auto-generated ID) is used for `dialog.id` and URL hash sync
- [ ] `href` attribute renders the trigger as `<a href>` instead of `<button>`
- [ ] Panel uses `<dialog>` element with `showModal()` for activation
- [ ] Esc key closes the panel (native dialog behavior)
- [ ] Backdrop click closes the panel
- [ ] Close button in panel header closes the panel
- [ ] Keyboard shortcut opens the panel; skipped when focus is in input/textarea/select/contenteditable
- [ ] Multiple drawers with the same shortcut emit a dev-mode warning; last-registered wins
- [ ] URL hash deep linking: `#drawer-{id}` opens on load; opening updates hash; closing clears it
- [ ] Lumina CSS implements all four sides and three sizes with smooth slide-in transitions
- [ ] `refrakt inspect drawer` shows the expected HTML
- [ ] CSS coverage tests pass for `.rf-drawer*` selectors
- [ ] Authoring docs document the rune syntax, attributes, content model, and keyboard shortcut conventions

-----

## Out of Scope

- **Detached trigger** (trigger somewhere distant from body) — overlay positioning makes this unnecessary; the rune can be placed anywhere in the source and the panel still renders as a viewport overlay.
- **Multiple simultaneous open drawers** — `<dialog>.showModal()` enforces single-modal; opening one closes any other. Stacked modal dialogs are an antipattern.
- **Nested drawers** — out of v1; the modal stack semantics get murky and there's no current use case.
- **Custom animation hooks** — slide-in is CSS transitions on `[open]` + transform; authors can override in their theme but no JS-level animation API.
- **Persistent (non-modal) drawer / sidebar pattern** — this is a different primitive (always-visible drawer that pushes content). Could be a future `{% sidebar %}` rune; out of scope here.
- **Swipe-to-close gesture on touch** — defer; standard close affordances (button, backdrop) are sufficient for v1.
- **Drawer content fetched lazily** — body is rendered at build time, present in DOM, just hidden until shown. Lazy-load could be a v2 enhancement for very large bodies.

-----

## Open Questions

**Should `shortcut` accept modifier combos (`cmd+.`) in v1, or only bare keys?** Recommend supporting modifier prefixes from the start — the parser is trivial and the bare-key surface is too small for shortcuts that need to coexist with browser defaults. Document the supported modifier set explicitly.

**For multi-drawer pages, should each drawer's shortcut listener be scoped to the drawer's containing region (e.g. nav vs. article), or always global?** Recommend global for v1. Region-scoped listeners require focus-tracking complexity that doesn't pay for itself yet.

**Should the rune live in core (`packages/runes`) or a new overlays plugin?** Settled: core, since drawer is a generic structural/behavioral primitive in the same family as accordion and tabs. If an overlay family grows (popover, sheet, dialog with explicit form semantics), revisit; until then, core is the right home.

**Should we ship a `closeOn` attribute (`outside-click`, `esc`, `button`) so authors can opt out of certain close affordances?** Recommend no — opting out of standard close affordances is an accessibility regression. If a use case appears (a confirmation drawer that requires explicit dismissal), revisit then.

**How does the drawer interact with frameworks that manage their own dialog stacks (SvelteKit transitions, Nuxt page transitions)?** Probably fine — `<dialog>` is native and frameworks don't manage it. But adapter snapshot tests should cover a page with a drawer to catch surprises.

-----

## References

- `packages/behaviors/` — pattern for progressive-enhancement runes (accordion, tabs)
- `packages/runes/src/config.ts` — engine config schema (modifiers, structure injection)
- `packages/lumina/styles/runes/` — reference CSS for existing runes
- `<dialog>` MDN documentation — native modal semantics this rune builds on

{% /spec %}
