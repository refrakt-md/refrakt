---
title: Drawer
description: Addressable modal panel — declared once, opened from any xref on the page
---

# Drawer

A body-only rune that declares a richer-than-a-tooltip, lighter-than-a-navigation panel. Trigger it from anywhere on the page via `{% ref "drawer-id" /%}`; without JS the body renders as an in-flow callout at its authored position so readers always have access to the content. With JS, the body is enhanced into a `<dialog>` and the xref click opens it as a modal — esc-to-close, focus trap, and `inert` background come from the platform.

## Declaring a drawer

A drawer is body-only — no trigger section, no `hr` delimiter. The author writes the content; the rune assigns it an addressable id.

```markdoc
{% drawer id="auth-system" title="Auth system" %}
A short explainer that lives next to wherever it's mentioned, without forcing
the reader to navigate away.

- code blocks
- embedded runes
- rich Markdown

…fit naturally in the body.
{% /drawer %}
```

Renders as a styled in-flow `<section>` at the authored position (progressively enhanced into a `<dialog>` when the behaviors script loads):

{% drawer id="auth-system" title="Auth system" %}
A short explainer that lives next to wherever it's mentioned, without forcing the reader to navigate away.

- code blocks
- embedded runes
- rich Markdown

…fit naturally in the body.
{% /drawer %}

## Triggering from xrefs

The drawer registers itself as a page-scoped entity. Any `{% ref %}` to its id on the same page resolves to `<a href="#drawer-{id}" data-target-type="drawer">…</a>` — a normal anchor without JS, an open-dialog trigger with JS.

```markdoc
Reading about {% ref "auth-system" label="our auth subsystem" /%}? It's
the kind of detail that lives in a drawer, not a separate page.
```

Reading about {% ref "auth-system" label="our auth subsystem" /%}? It's the kind of detail that lives in a drawer, not a separate page.

The trigger anchor is just an anchor. Without JS, clicking scrolls to the drawer at its authored position via fragment navigation. With JS, the behaviors layer queries `a[data-target-type="drawer"]` whose href matches a drawer on this page and intercepts the click to call `dialog.showModal()`.

`data-target-type` is a **neutral convention** — any rune that wants to be "addressable as a trigger" can set `data-target-type="{rune-name}"` on its resolved xrefs. Future popover, modal, sheet runes can adopt the same hook-point without expanding the xref surface.

## Triggers anywhere, multiple triggers free

Because the drawer is id-addressable, the same drawer can be referenced from N places on the same page without coordination. The body is authored once; refs to it are normal authoring.

Multiple xrefs to {% ref "auth-system" /%} or to {% ref "auth-system" label="this same drawer" /%} all resolve to the same anchor target — the drawer above. Clicking either opens it; the behaviors layer doesn't care which trigger fired.

## Attributes

| Attribute | Type | Default | Meaning |
|-----------|------|---------|---------|
| `id` | string | **required** | Stable id. Becomes `id="drawer-{value}"` on the wrapper. |
| `title` | string | — | Heading text shown in the drawer header. |
| `headingLevel` | 1-6 | auto | Title heading level. Out-of-range values clamp to 1-6. When omitted, auto-resolves to one deeper than the nearest preceding heading on the page (default h2 if none). |
| `side` | `right` \| `left` \| `top` \| `bottom` | `right` | Edge the panel slides from when enhanced into a `<dialog>`. |
| `size` | `sm` \| `md` \| `lg` | `md` | Panel size — width for left/right, height for top/bottom. |
| `shortcut` | string | — | Keyboard shortcut to open the panel (`.`, `cmd+k`, etc.). |

## Progressive enhancement

The drawer is built on the **no-JS-visible / JS-hidden** contract: the body always renders, the dialog UX is the enhancement.

**Without JS:**
- The drawer body is a styled `<section class="rf-drawer">` at its authored position.
- Title is a heading at the level chosen by `headingLevel` (or auto-detected from outline depth).
- Close button is `hidden` (no point exposing a control without script).
- xref triggers are plain anchors; clicking scrolls to the drawer via fragment navigation.
- Keyboard shortcut listener doesn't activate.

**With JS** (when `@refrakt-md/behaviors` is loaded):
- The `<section>` is replaced with a `<dialog>`, preserving id and attributes.
- Close button reveals (`hidden` removed).
- xref clicks call `dialog.showModal()` instead of scrolling.
- Esc closes the panel (native dialog behaviour).
- Backdrop click closes the panel.
- Close button click closes the panel.
- Keyboard shortcut opens the panel (global listener; skipped when focus is in `input`/`textarea`/`select`/`[contenteditable]`).
- URL hash sync: a page load with `#drawer-{id}` opens the matching drawer automatically; opening updates `location.hash` via `replaceState`; closing clears it; the browser back button closes an open drawer.

## Keyboard shortcuts

Bare keys (`"."`, `"k"`) and modifier prefixes are both supported:

| Form | Example |
|------|---------|
| Bare key | `shortcut="."` |
| Primary modifier (cmd on macOS, ctrl elsewhere) | `shortcut="cmd+k"` |
| Multiple modifiers | `shortcut="ctrl+shift+/"` |
| Plain function keys | `shortcut="?"` |

The behaviors layer collapses `cmd+` and `ctrl+` into "the platform's primary modifier" — `cmd+k` matches Cmd-K on macOS and Ctrl-K on Windows/Linux.

Two drawers on the same page declaring the same shortcut emit a dev-mode warning naming both; last-registered wins.

## Page-scoped ids

Two pages can each declare `id="auth"` without colliding in the registry — drawer ids are scoped to the page they're declared on. Same-page xrefs find their page-local drawer. Cross-page xref-to-drawer is mechanically supported (the registry has a cross-page fallback so the lookup succeeds, and the resulting href is the destination page plus the fragment) but the end-to-end UX is deferred to a future spec.

## Title-level auto-detection

`{% drawer id="x" title="T" %}` (no explicit `headingLevel`) emits an `h3` placeholder marked with `data-drawer-title-auto`. The pipeline's postProcess pass walks the page renderable, tracks the most recent heading level, and rewrites the placeholder to `h{n+1}` (clamped to h1-h6). Default behaviour when no preceding heading exists: the title becomes `h2` (one deeper than the page-title `h1` that lives in layout).

Explicit `headingLevel=` always wins.

## Composition

Drawers compose like any block container — embed runes, code blocks, even the snippet rune for a "view source" drawer. The drawer below is live on this page; click {% ref "page-source" label="view this page's source" /%} (or press `.`) to open it.

```markdoc
{% drawer id="page-source" title="View source" shortcut="." %}
{% snippet path=$file.path lang="markdoc" /%}
{% /drawer %}

Trigger with {% ref "page-source" label="view this page's source" /%}.
```

{% drawer id="page-source" title="View source" shortcut="." %}
{% snippet path=$file.path lang="markdoc" /%}
{% /drawer %}

Nested drawers and multiple simultaneous open drawers aren't supported in v1 — native `<dialog>` enforces single-modal, and stacked modals are an antipattern.

## See also

- [xref](/runes/xref) — the trigger primitive. `data-target-type="{entity-type}"` propagation is what lets drawer (and any future addressable rune) opt into trigger behaviour.
- [snippet](/runes/snippet) — embed a project file as a code block; pairs naturally with `{% drawer %}` for a view-source pattern.
