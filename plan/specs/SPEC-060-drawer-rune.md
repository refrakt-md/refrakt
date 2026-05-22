{% spec id="SPEC-060" status="draft" tags="runes, behaviors, ui, core, xref" %}

# Drawer rune

A modal panel rune that holds richer content than a tooltip but lighter than a navigation away. Inspired by Linear's pattern where in-page references expand to explainer panels rather than forcing the reader to leave context.

The drawer rune is **body-only**: it declares an addressable panel by ID, and any `{% ref %}` to that ID becomes a trigger. Triggers can appear anywhere — in prose, in a navbar, in multiple places at once — and the inline-flow case ("spec mentioned mid-sentence") is automatic because xrefs are already inline. Built on `<dialog>` for accessibility; progressive enhancement renders the body as a visible in-flow block without JS.

## Problem

Some inline references are too rich for a tooltip and too peripheral to navigate to. The author wants a quick-look explanation of a concept mentioned in passing — a sidebar of context — without sending the reader down a routing rabbit hole.

Today the choices are:

- **Link out** — loses context, breaks flow, and the destination page usually has too much surrounding chrome for what was a small clarification.
- **Inline accordion** — keeps context but balloons the source page when expanded, and doesn't read naturally for "click this term to learn more" patterns.
- **Custom dialog code** — every site rolls its own; no shared accessibility behavior; not authorable from Markdown.

The drawer pattern is the missing primitive: a side-attached panel that overlays the page, holds rich content (text, code blocks, embedded runes), and closes cleanly back to where the reader was.

-----

## Design Principles

**Body-only rune; triggers are xrefs.** The drawer rune holds only its body. It registers itself as an addressable entity; `{% ref "drawer-id" /%}` becomes the trigger. No trigger section in the rune, no `hr` delimiter, no "button or anchor" inference — the trigger is whatever xref normally produces.

**Triggers anywhere; multiple triggers free.** Because the drawer is ID-addressable, the same drawer can be referenced from N places on the same page without coordination. The body is authored once; refs to it are normal authoring.

**Inline-flow triggers, naturally.** xref is an inline tag, so trigger refs flow inline in prose without breaking paragraphs. The "spec mentioned in a sentence" pattern works straightforwardly because the trigger machinery is already inline-shaped.

**Progressive enhancement is automatic.** Without JS, the drawer body renders as a visible in-flow block at its authored position. xref triggers are normal anchors pointing at `#drawer-{id}`; clicking scrolls to the drawer. Readers always have access to the content; the side-panel UX is the enhancement.

**`<dialog>` for semantics.** With JS, the behaviors layer enhances the drawer body into a `<dialog>` and intercepts xref clicks. esc-to-close, focus trap, and `inert` background come from the platform.

**Keyboard shortcut as first-class.** The view-source pattern wants a `.` shortcut (GitHub convention). The rune accepts a `shortcut` attribute; the behaviors layer registers a global listener — opt-in per drawer.

**Page-scoped IDs.** A drawer's ID is meaningful within its page, not site-wide. Two pages can each declare `id="auth"` without collision. Cross-page drawer triggers are out of scope for v1 (see Open Questions).

-----

## Authoring Surface

### Syntax

```markdoc
Authentication is handled by {% ref "auth-explainer" /%}, which uses OAuth.

{# elsewhere on the page #}

{% drawer id="auth-explainer" title="Auth system" shortcut="." %}
A quick explainer with **rich content**:

- code blocks
- embedded runes
- {% expand "SPEC-023" /%}

Whatever fits the side panel.
{% /drawer %}
```

The xref `{% ref "auth-explainer" /%}` resolves to the drawer's address (`#drawer-auth-explainer`) and renders as a normal anchor. Without JS, clicking scrolls to the drawer at its authored position. With JS, the body is enhanced into a `<dialog>` and the xref click opens it via `showModal()`.

### Attributes

| Attribute | Type | Default | Meaning |
|-----------|------|---------|---------|
| `id` | string | **required** | Stable ID. Used for entity registration and rendered as the drawer element's `id="drawer-{id}"`. |
| `title` | string | — | Panel heading. Renders in the dialog header (with JS) or as a heading at the drawer's position (without JS). |
| `shortcut` | string | — | Keyboard shortcut to open the drawer (`"."`, `"k"`, `"cmd+k"`, etc.). |
| `side` | `"right" \| "left" \| "top" \| "bottom"` | `"right"` | Edge the panel slides from (when enhanced). |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Panel width (or height for top/bottom). |
| `headingLevel` | `1`–`6` | auto | Heading level for the title in no-JS rendering. Auto-detects from outline position if omitted (same convention as `nav`/`hint`). |

### Content model

Plain block content. Whatever the author writes between the opening and closing tags is the drawer body — rich Markdown, embedded runes, code blocks, anything. No delimiter; no trigger section.

-----

## Output Contract

### Drawer body

```html
<section class="rf-drawer rf-drawer--side-right rf-drawer--size-md"
         id="drawer-auth-explainer"
         data-rune="drawer"
         data-side="right"
         data-size="md"
         data-shortcut=".">
  <header class="rf-drawer__header">
    <h3 class="rf-drawer__title">Auth system</h3>
    <button class="rf-drawer__close" type="button" aria-label="Close" hidden>×</button>
  </header>
  <div class="rf-drawer__body">
    <!-- body content -->
  </div>
</section>
```

BEM selectors:
- `.rf-drawer` — drawer container
- `.rf-drawer__header` — title + close-button row
- `.rf-drawer__title` — title heading (level via `headingLevel` or auto-detected)
- `.rf-drawer__close` — close button (hidden by default; behaviors layer reveals when enhanced)
- `.rf-drawer__body` — content container
- `.rf-drawer--side-{right|left|top|bottom}` — slide direction modifier
- `.rf-drawer--size-{sm|md|lg}` — size modifier

Data attributes:
- `data-rune="drawer"` on the container
- `data-side`, `data-size`, `data-shortcut` as authored

### xref resolved to a drawer

```html
<a class="rf-xref rf-xref--drawer"
   href="#drawer-auth-explainer"
   data-xref-id="auth-explainer"
   data-xref-source="registry"
   data-target-type="drawer">
  the auth subsystem
</a>
```

The `data-target-type="drawer"` attribute is the marker the drawer behaviors layer queries for. It's a **neutral convention**: any rune that wants to be "addressable as a trigger" can set `data-target-type="{rune-name}"` on its resolved xrefs. Future popover, modal, sheet, etc. runes can adopt the same hook-point without expanding xref's surface.

-----

## xref Integration

### Drawer entity registration

The drawer rune's `register` pipeline hook adds the panel as a page-scoped entity:

```ts
registry.register({
  id: 'auth-explainer',
  type: 'drawer',
  scope: 'page',
  sourceUrl: `${pageUrl}#drawer-auth-explainer`,
  data: {
    title: 'Auth system',
    side: 'right',
    size: 'md',
    shortcut: '.',
  },
});
```

`scope: 'page'` is a new field on `EntityRegistration` (see Engine Changes). Page-scoped entities are namespaced internally by page URL so two pages can each declare `id="auth"` without conflict. Site-scoped entities (specs, characters, etc.) continue to be globally addressable.

### xref resolution

The existing xref resolver finds the drawer entity by ID, gets `sourceUrl` for the href, and propagates the entity `type` as `data-target-type` on the rendered anchor. The `type → data-target-type` propagation is a small generic extension to the resolver (see SPEC-065 — fits the same data-attribute convention already established there).

Same-page resolution: `sourceUrl` is `#drawer-{id}`; xref renders a same-page anchor.

Cross-page resolution: would yield `/path/to/page#drawer-{id}`; the destination page's behaviors layer would read the URL hash on load and open the drawer. Mechanically supported; UX deferred (see Open Questions).

-----

## Behavior

A `drawer` behavior in `@refrakt-md/behaviors` handles activation. On page load:

1. **Enhance each drawer**: for every `.rf-drawer` element, replace its `<section>` shell with a `<dialog>` (or move its contents into a hidden sibling `<dialog>`; either shape works as long as the no-JS-visible / JS-hidden contract holds). Reveal the close button (`hidden` removed).
2. **Wire trigger clicks**: query for `a[data-target-type="drawer"]` whose `href="#drawer-{id}"` matches a drawer on this page. Attach a click interceptor that calls `event.preventDefault()` and `dialog.showModal()`.
3. **Wire shortcut listeners**: for each drawer with `data-shortcut`, register a global `keydown` listener.
4. **Wire URL hash sync**: on load, if `location.hash === "#drawer-{id}"`, open the matching drawer.

### Runtime behavior

- **Esc key** → handled natively by `<dialog>`.
- **Backdrop click** → close. Detected by `event.target === dialog`.
- **Close button click** → `dialog.close()`.
- **Shortcut press** → open the drawer.
- **Opening a drawer** → update `location.hash` to `#drawer-{id}` (replaceState, so back-button closes it).
- **Closing a drawer** → clear the hash (replaceState).
- **Browser back button** → if the hash had been set by drawer open, the popstate fires; behaviors layer closes the open drawer.

### Shortcut handling rules

- Listener uses `keydown` at the document level.
- Skips when focus is inside `input`, `textarea`, `select`, or any `[contenteditable]` element.
- Multiple drawers with the same shortcut: last-registered wins. Dev mode logs a warning naming both rune locations.
- Modifier keys: `cmd+`, `ctrl+`, `alt+`, `shift+` prefixes supported; bare keys are also valid.

### Multiple drawers on one page

Each drawer is independent. Opening drawer A while drawer B is open closes B first (matches native `<dialog>` modality — browsers enforce single-modal).

-----

## Progressive Enhancement

### Without JS

- Drawer body renders as a styled in-flow `<section>` at its authored position
- Title renders at the level chosen by `headingLevel` or auto-detect
- Close button is hidden (`hidden` attribute)
- xref triggers are normal anchors; clicking scrolls to the drawer via fragment navigation
- Shortcut listener doesn't activate (no JS)
- Readers get full content access; just no side-panel UX

The in-flow rendering should be **visually distinct** from regular page content so the reader understands "this is set-aside material" — a callout treatment, a left border, a different background, etc. Theme responsibility; Lumina ships a sensible default.

### With JS

- Drawer body is enhanced into a `<dialog>` (visible only when open)
- Close button reveals
- xref clicks open the dialog via `showModal()`
- Shortcut and URL hash sync activate

### Styling for the dual-mode

The drawer's CSS targets both `.rf-drawer` (in-flow state) and `dialog.rf-drawer[open]` (panel state) — same BEM classes, different layout properties depending on context. Themes can override either.

-----

## Engine Changes

- New rune schema in `packages/runes/src/tags/drawer.ts` — block content model, no delimiter
- Config entry in `packages/runes/src/config.ts` keyed `Drawer`: modifier-from-meta for `side`/`size`/`shortcut`, structural injection for the header (title + hidden close button)
- `register` pipeline hook (extension of `corePipelineHooks` or new drawer-specific hook) that scans each page for drawer runes and registers them as page-scoped entities
- `EntityRegistration` interface gains optional `scope?: 'page' | 'site'` (default `'site'` for back-compat). Registry implementation internally namespaces page-scoped entries by page URL so IDs are page-local.
- xref resolver: propagate the resolved entity's `type` as `data-target-type` on the rendered anchor (generic, not drawer-specific — small extension to SPEC-065's resolver)
- CSS in `packages/lumina/styles/runes/drawer.css` covering both no-JS callout and dialog states
- Behavior in `packages/behaviors/src/drawer.ts`, exported via `packages/behaviors/src/index.ts`
- Registry entry in `packages/svelte/src/registry.ts` is **not** needed — drawer is identity-transform + progressive enhancement

-----

## Acceptance Criteria

- [ ] `{% drawer id="..." %}` produces the drawer body as a visible in-flow `<section>` at its authored position
- [ ] `id` attribute is required; missing `id` fails content load with a clear error
- [ ] `title` attribute renders as a heading in the drawer header
- [ ] `headingLevel` attribute controls the title's heading level
- [ ] When `headingLevel` is omitted, the title's level is auto-detected from outline position (same convention as `nav`/`hint`)
- [ ] `shortcut` attribute writes `data-shortcut` and registers a global keyboard listener when JS loads
- [ ] `side` attribute applies `rf-drawer--side-{value}` modifier and `data-side`
- [ ] `size` attribute applies `rf-drawer--size-{value}` modifier and `data-size`
- [ ] Drawer element gets `id="drawer-{author-id}"` so fragment navigation lands at it
- [ ] Drawer rune registers a page-scoped entity (`type: 'drawer'`, `scope: 'page'`) in the registry with `sourceUrl: "{page-url}#drawer-{id}"`
- [ ] `{% ref "drawer-id" /%}` on the same page resolves to `<a href="#drawer-{id}" data-target-type="drawer">…</a>`
- [ ] Multiple xrefs to the same drawer on the same page each resolve to the same anchor target
- [ ] Drawer IDs are page-scoped: two pages each declaring `id="foo"` do not collide in the registry
- [ ] xref resolver propagates the resolved entity's `type` as `data-target-type` on the rendered anchor (generic, used by drawer; available to any future addressable rune)
- [ ] `EntityRegistration` interface gains an optional `scope?: 'page' | 'site'` field (default `'site'`)
- [ ] Without JS: drawer body is visible in-flow; close button is hidden; clicking xref scrolls to drawer via fragment navigation
- [ ] With JS: drawer body is enhanced into a `<dialog>`; xref clicks open the dialog via `showModal()`
- [ ] Esc key closes the panel (native dialog behavior)
- [ ] Backdrop click closes the panel
- [ ] Close button in the drawer header closes the panel and is revealed when JS loads
- [ ] Keyboard shortcut opens the panel; skipped when focus is in input/textarea/select/contenteditable
- [ ] Multiple drawers with the same shortcut emit a dev-mode warning; last-registered wins
- [ ] URL hash deep linking: `#drawer-{id}` opens on load; opening updates hash via replaceState; closing clears the hash
- [ ] Browser back button closes an open drawer when the open-action set the hash
- [ ] Lumina CSS implements both no-JS (in-flow callout) and JS (panel) rendering for all four sides and three sizes
- [ ] `refrakt inspect drawer` shows the expected HTML
- [ ] CSS coverage tests pass for `.rf-drawer*` selectors
- [ ] Authoring docs cover: rune syntax, attribute reference, the xref-as-trigger pattern, progressive enhancement model, keyboard shortcut conventions, the `data-target-type` convention as a primitive available to other runes

-----

## Out of Scope

- **Cross-page drawer triggers** — mechanically supported (cross-page xref resolves to `/page#drawer-{id}`, destination's URL hash sync opens it on load), but the UX questions (smooth transition? confirm before navigating away? what if the destination page is large?) deserve their own design. v1 is page-local triggers only.
- **Detached body** (drawer body rendered somewhere other than its authored position) — body always renders in-flow. If the use case appears, that's a new design.
- **Multiple simultaneous open drawers** — `<dialog>.showModal()` enforces single-modal; opening one closes any other. Stacked modal dialogs are an antipattern.
- **Nested drawers** — out of v1; the modal stack semantics get murky.
- **Custom animation hooks** — slide-in is CSS transitions on `[open]` + transform; authors can override in their theme but no JS-level animation API.
- **Persistent (non-modal) drawer / sidebar pattern** — different primitive (always-visible drawer that pushes content). Could be a future `{% sidebar %}` rune.
- **Lazy-loaded body content** — body is rendered at build time, present in DOM. Lazy-load could be a v2 enhancement.
- **Trigger element customization per-occurrence** — xref handles this. If a particular ref wants different label/styling, the xref attributes (`label=`, etc.) cover it.
- **Drawer body heading shift to align with surrounding outline** — body headings render at their authored levels; the drawer's `headingLevel` only affects the title. Adding `level=`-style demotion (like expand) could be a future addition if real authoring practice wants it.

-----

## Open Questions

**How should the title's auto-detected `headingLevel` work?** Likely one level deeper than the drawer's outline position — if the drawer sits at H2 body context, the title becomes H3. Spell out the exact walk during implementation; align with the existing `nav`/`hint` auto-level convention.

**Should drawer entities surface in `EntityRegistry` consumers** (graph views, "what links to what" tooling)? Probably yes, with `scope: 'page'` so consumers can filter. A graph showing "all drawers on this page" or "all xrefs that target drawers" is a useful debugging affordance.

**Cross-page drawer triggers — when?** Defer to a follow-up once page-local usage settles. The hard part is UX (transition feel, scroll position on landing), not mechanics. Open the question explicitly when someone has a concrete use case.

**Should `shortcut` accept modifier combos (`cmd+.`) in v1?** Recommend yes — the parser is trivial and bare-key shortcuts have a tiny surface.

**For multi-drawer pages, should each shortcut listener be scoped to a region, or always global?** Recommend global for v1. Region-scoped requires focus-tracking complexity.

**Should `closeOn` exist?** No. Opting out of standard close affordances is an accessibility regression. Reconsider only if a specific use case (confirmation dialog requiring explicit dismissal) appears.

**Should the `scope: 'page' | 'site'` field live in this spec or a separate registry-evolution spec?** This spec is the motivating consumer. Recommend adding it here; future page-scoped entity types can adopt the same field.

**Should xref-to-drawer get a distinct visual treatment by default** (different from xref-to-spec, etc.) via the `rf-xref--drawer` modifier? Probably yes — drawer refs are interactive in a different way than refs to content pages, and a subtle visual cue (a chevron, an underline style) helps readers understand "click for context here, not navigation." Theme decision; Lumina ships a default.

**How does the drawer interact with frameworks that manage their own dialog stacks?** Probably fine — `<dialog>` is native and frameworks don't typically intercept it. Adapter snapshot tests should cover a page with a drawer to catch surprises.

-----

## References

- {% ref "SPEC-065" /%} — configurable xref resolution (the xref-as-trigger pattern; `data-target-type` extends SPEC-065's resolver)
- {% ref "SPEC-066" /%} — expand rune (composes inside drawer bodies; the inline embed pattern)
- {% ref "SPEC-061" /%} — page variables (`$file.path` for the view-source-of-current-page composition)
- {% ref "SPEC-062" /%} — code-file rune (the view-source body in the canonical "page source drawer" example)
- `packages/behaviors/` — pattern for progressive-enhancement runes (accordion, tabs)
- `packages/runes/src/config.ts` — engine config schema (modifiers, structure injection)
- `packages/lumina/styles/runes/` — reference CSS for existing runes
- `<dialog>` MDN documentation — native modal semantics this rune builds on

{% /spec %}
