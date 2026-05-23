---
title: Drawer
description: Addressable modal panel — declared once, opened from any xref on the page
---

# Drawer

A body-only rune that declares a richer-than-a-tooltip, lighter-than-a-navigation panel. Trigger it from anywhere on the page via `{% ref "drawer-id" /%}`; without JS the body renders as an in-flow callout at its authored position so readers always have access to the content.

{% hint type="note" %}
The progressive-enhancement layer that turns the drawer body into a `<dialog>` and intercepts xref clicks lands with WORK-258. The schema, identity-transform output, and registry hookup described on this page work today; the dialog UX activates once `@refrakt-md/behaviors` ships its drawer module.
{% /hint %}

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

Renders as a styled in-flow `<section>` at the authored position:

{% drawer id="auth-system" title="Auth system" %}
A short explainer that lives next to wherever it's mentioned, without forcing the reader to navigate away.

- code blocks
- embedded runes
- rich Markdown

…fit naturally in the body.
{% /drawer %}

## Triggering from xrefs

The drawer registers itself as a page-scoped entity. Any `{% ref %}` to its id on the same page resolves to `<a href="#drawer-{id}" data-target-type="drawer">…</a>` — a normal anchor without JS, the open-dialog trigger with JS.

```markdoc
Reading about {% ref "auth-system" label="our auth subsystem" /%}? It's
the kind of detail that lives in a drawer, not a separate page.
```

Reading about {% ref "auth-system" label="our auth subsystem" /%}? It's the kind of detail that lives in a drawer, not a separate page.

The `data-target-type="drawer"` attribute is the [generic primitive](/runes/xref) the progressive-enhancement layer queries for. Future popover, modal, sheet runes can adopt the same convention.

## Attributes

| Attribute | Type | Default | Meaning |
|-----------|------|---------|---------|
| `id` | string | **required** | Stable id. Becomes `id="drawer-{value}"` on the wrapper. |
| `title` | string | — | Heading text shown in the drawer header. |
| `headingLevel` | 1-6 | auto | Title heading level. Out-of-range values clamp to 1-6. When omitted, auto-resolves to one deeper than the nearest preceding heading on the page (default h2 if none). |
| `side` | `right` \| `left` \| `top` \| `bottom` | `right` | Edge the panel slides from when enhanced into a `<dialog>`. |
| `size` | `sm` \| `md` \| `lg` | `md` | Panel size — width for left/right, height for top/bottom. |
| `shortcut` | string | — | Keyboard shortcut to open the panel (`.`, `cmd+k`, etc.). Behaviors layer registers the listener; surfaces as `data-shortcut` for tooling. |

## Page-scoped ids

Two pages can each declare `id="auth"` without colliding in the registry — drawer ids are scoped to the page they're declared on. Same-page xrefs find their page-local drawer; cross-page xref-to-drawer is supported in mechanics but the UX is deferred to a future spec.

## Title-level auto-detection

`{% drawer id="x" title="T" %}` (no explicit `headingLevel`) emits an `h3` placeholder marked with `data-drawer-title-auto`. The pipeline's postProcess pass walks the page renderable, tracks the most recent heading level, and rewrites the placeholder to `h{n+1}` (clamped to h1-h6). Default behaviour when no preceding heading exists: the title becomes `h2` (one deeper than the page-title `h1` that lives in layout).

Explicit `headingLevel=` always wins.

## Composition

Drawers compose like any block container — embed runes, code blocks, even nested drawers if a future spec ever wants them (not in v1; native `<dialog>` enforces single-modal). The progressive-enhancement contract is "no-JS visible / JS hidden" so authors can rely on the body always being reachable.

## See also

- [xref](/runes/xref) — the trigger primitive. `data-target-type="{entity-type}"` propagation is what lets drawer (and any future addressable rune) opt into trigger behaviour.
- [Drawer behaviors](#) — progressive enhancement (lands with WORK-258).
