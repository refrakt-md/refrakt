---
title: Drawer
description: Addressable modal panel — declared once, opened from any xref on the page
category: Arrangement
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:drawer"} /%}

A body-only rune that declares a richer-than-a-tooltip, lighter-than-a-navigation panel. Trigger it from anywhere on the page via `{% ref "drawer-id" /%}`; without JS the body renders as an in-flow callout at its authored position so readers always have access to the content. With JS, the body is enhanced into a `<dialog>` and the xref click opens it as a modal — esc-to-close, focus trap, and `inert` background come from the platform. To link to an entity without showing its content, use [xref](/runes/xref); to place an entity's content in the flow of the page, use [expand](/runes/expand); to link to a project file, use [file-ref](/runes/file-ref).

## Declaring a drawer

A drawer has no trigger of its own: you write its content and give it an `id`, and links to that id open it. Until a link opens it, it renders in place, as it does here:

{% preview source=true %}

	{% drawer id="auth-system" title="Auth system" %}
	Sign-in issues a short-lived access token and a long-lived refresh token, both in HttpOnly cookies.

	- Access tokens expire after 15 minutes.
	- Refresh tokens last 30 days and rotate on every use.
	- Signing out revokes the refresh token on the server.
	{% /drawer %}

{% /preview %}

## How Markdown is read

The title comes from the `title` attribute, not from a heading.

| You write | It becomes |
|-----------|------------|
| Content with no `---` | The drawer's body |
| A top-level `---` | Splits the content into the body (before) and a footer (after) that stays in view ([Body and footer zones](#body-and-footer-zones)) |

## Triggering from xrefs

The drawer registers itself as a page-scoped entity. Any `{% ref %}` to its id on the same page resolves to `<a href="#drawer-{id}" data-target-type="drawer">…</a>` — a normal anchor without JS, an open-dialog trigger with JS.

{% preview source=true %}

Sessions follow the rules of {% ref "auth-system" label="the auth system" /%}, so a stolen access token is useful for 15 minutes at most.

{% /preview %}

The trigger anchor is just an anchor. Without JS, clicking scrolls to the drawer at its authored position via fragment navigation. With JS, the behaviors layer queries `a[data-target-type="drawer"]` whose href matches a drawer on this page and intercepts the click to call `dialog.showModal()`.

`data-target-type` is a **neutral convention** — any rune that wants to be "addressable as a trigger" can set `data-target-type="{rune-name}"` on its resolved xrefs. Future popover, modal, sheet runes can adopt the same hook-point without expanding the xref surface.

## Triggering from a link

A link whose target is a drawer on the same page opens it too: a Markdown link, a `{% link %}`, or an item in [`actions`](/runes/actions). The build gives it the same anchor and `data-target-type="drawer"` that `{% ref %}` gets. Because a link's text takes inline tags, a trigger can carry an [icon](/runes/icon), and any rune that places links can place one.

{% preview source=true %}

	{% actions %}
	- [{% icon name="shield" /%} Auth system](#auth-system)
	- [{% icon name="code" /%} View source](#page-source)
	{% /actions %}

{% /preview %}

- The target is the drawer's `id`, as with `{% ref %}`. Its anchor, `#drawer-{id}`, works as well.
- When a drawer and a heading share an id, the link opens the drawer.
- A link to an id no drawer on the page has is left alone: it is an ordinary same-page anchor.
- Without JS the link scrolls to the drawer at its authored position, as any trigger does.

## Triggers anywhere, multiple triggers free

Because the drawer is id-addressable, the same drawer can be referenced from N places on the same page without coordination. The body is authored once; refs to it are normal authoring.

Multiple xrefs to {% ref "auth-system" /%} or to {% ref "auth-system" label="this same drawer" /%} all resolve to the same anchor target — the drawer above. Clicking either opens it; the behaviors layer doesn't care which trigger fired.

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

## Title heading level

The title's heading sits one level below the heading before the drawer, so it fits the page outline. Set `headingLevel` to choose it yourself.

## Body and footer zones

The drawer body splits on a top-level `---` into two zones — **body** and **footer** — the same split `{% card %}` uses. Without a `---`, everything is body. The footer renders below the body with a top divider and slightly muted text. The canonical case is a body that embeds an entity with [`expand`](/runes/expand) and a footer that links onward with `{% ref %}`:

{% preview source=true %}

	Counting entities per group is the job of the {% ref "aggregate-spec" label="aggregate rune" /%}.

	{% drawer id="aggregate-spec" title="Aggregate rune" %}
		{% expand "SPEC-076" /%}

		---

		The {% ref "Aggregate" /%} page shows it at work.
	{% /drawer %}

{% /preview %}

The xref resolves the URL from the registry, so the link stays correct as the entity moves and the author doesn't memorise URLs.

### Always-visible footer

The header and footer stay in place while the body scrolls, so a long entity or file scrolls inside the drawer with the footer always one tap away.

## Hoisted drawers (`preview="drawer"`)

[`xref`](/runes/xref) and [`file-ref`](/runes/file-ref) each accept `preview="drawer"` which **hoists** a drawer for the referenced target. The inline link stays in prose; the drawer is emitted at the page root and opens on click:

{% preview source=true %}

See {% file-ref path="packages/types/src/config.ts" symbol="SiteConfig" label="SiteConfig" preview="drawer" /%} for the shape of a site's configuration.

{% /preview %}

Hoisted drawers use the same `<section class="rf-drawer">` shape as author-declared drawers — same chrome, same body / footer zones, same behaviors-layer enhancement. The chrome footer is populated by the rune that hoists (file-ref: GitHub link; xref: entity page link).

**Collision with author-declared drawers.** If an author writes `{% drawer id="X" %}` on the same page where a `preview="drawer"` reference would generate the same id, the **author drawer wins** — the hoist defers, the inline preview link points at the existing drawer. This lets authors customise a specific drawer's body or footer without losing the inline-link ergonomics. The build emits an info-level note naming both sources.

## Composition

Drawers compose like any block container — embed runes, code blocks, even the snippet rune for a "view source" drawer. Click {% ref "page-source" label="view this page's source" /%} (or press `.`) to open the one below.

{% preview source=true %}

	{% drawer id="page-source" title="View source" shortcut="." size="lg" %}
		{% snippet path=$file.path lang="markdoc" /%}
	{% /drawer %}

{% /preview %}

Nested drawers and multiple simultaneous open drawers aren't supported in v1 — native `<dialog>` enforces single-modal, and stacked modals are an antipattern.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:drawer"} /%}

## See also

- [xref](/runes/xref) — the trigger primitive. `data-target-type="{entity-type}"` propagation is what lets drawer (and any future addressable rune) opt into trigger behaviour.
- [file-ref](/runes/file-ref) — path-based sibling of xref. Same `preview="drawer"` attribute hoists a drawer with a file's snippet.
- [snippet](/runes/snippet) — embed a project file as a code block; pairs naturally with `{% drawer %}` for a view-source pattern, and is the body shape file-ref's preview drawer uses.
