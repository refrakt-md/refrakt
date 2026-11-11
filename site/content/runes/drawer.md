---
title: Drawer
description: Addressable modal panel — declared once, opened from any xref on the page
category: Arrangement
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:drawer"} /%}

A panel for detail that is too much for a tooltip and too little for a page of its own. You write it once, give it an `id`, and any reference or link to that id on the page opens it as a side panel. To link to an entity without showing its content, use [xref](/runes/xref); to place an entity's content in the flow of the page, use [expand](/runes/expand); to link to a project file, use [file-ref](/runes/file-ref).

## Basic usage

A drawer has no trigger of its own: you write its content and give it an `id`, and links to that id open it. Until a link opens it, it renders in place, as it does here:

{% preview source=true %}

	{% drawer id="auth-system" title="Auth system" %}
	Sign-in issues a short-lived access token and a long-lived refresh token, both in HttpOnly cookies.

	- Access tokens expire after 15 minutes.
	- Refresh tokens last 30 days and rotate on every use.
	- Signing out revokes the refresh token on the server.
	{% /drawer %}

{% /preview %}

The id needs to be unique only on its own page. `side` sets the edge the panel slides in from, and `size` how large it is: `sm`, `md` (the default), `lg`, which is wide enough for code, or `full`, the whole screen. The title's heading sits one level below the heading before the drawer; set `headingLevel` to choose it yourself.

## How Markdown is read

The title comes from the `title` attribute, not from a heading.

| You write | It becomes |
|-----------|------------|
| Content with no `---` | The drawer's body |
| A top-level `---` | Splits the content into the body (before) and a footer (after) that stays in view ([Body and footer zones](#body-and-footer-zones)) |

## Open it from a reference

A `{% ref %}` to the drawer's id opens it. Any number of references can open the same drawer.

{% preview source=true %}

Sessions follow the rules of {% ref "auth-system" label="the auth system" /%}, so a stolen access token is useful for 15 minutes at most.

{% /preview %}

The panel closes with Esc, a click outside it, or its close button. The page's URL carries the drawer's anchor, `#drawer-{id}`, while it is open, so a link to that URL opens the drawer, and the browser's back button closes it. Without JavaScript, the drawer stays in place and a reference scrolls to it.

## Triggering from a link

A link whose target is a drawer on the same page opens it too: a Markdown link, a `{% link %}`, or an item in [`actions`](/runes/actions). Because a link's text takes inline tags, a trigger can carry an [icon](/runes/icon).

{% preview source=true %}

	{% actions %}
	- [{% icon name="shield" /%} Auth system](#auth-system)
	- [{% icon name="code" /%} View source](#page-source)
	{% /actions %}

{% /preview %}

The target is the drawer's `id`, or its anchor `#drawer-{id}`. When a drawer and a heading share an id, the link opens the drawer; a link to an id no drawer has is an ordinary same-page link.

## Open it with a key

`shortcut` opens the drawer from the keyboard, unless the reader is typing in a field:

| Form | Example |
|------|---------|
| Bare key | `shortcut="."` |
| Primary modifier (Cmd on macOS, Ctrl elsewhere) | `shortcut="cmd+k"` |
| Several modifiers | `shortcut="ctrl+shift+/"` |

`cmd+` and `ctrl+` both mean the platform's primary modifier. Give each drawer on a page its own shortcut; when two share one, the last wins and the dev server warns.

## Body and footer zones

A top-level `---` splits the drawer into a body and a footer, as in a `{% card %}`. The header and footer stay in view while the body scrolls, so a long embed keeps its onward links one tap away:

{% preview source=true %}

	Counting entities per group is the job of the {% ref "aggregate-spec" label="aggregate rune" /%}.

	{% drawer id="aggregate-spec" title="Aggregate rune" %}
		{% expand "SPEC-076" /%}

		---

		The {% ref "Aggregate" /%} page shows it at work.
	{% /drawer %}

{% /preview %}

## Preview a reference without writing a drawer

[xref](/runes/xref) and [file-ref](/runes/file-ref) accept `preview="drawer"`, which keeps the inline link and builds the drawer for you, with a footer link to the entity's page or the file's source:

{% preview source=true %}

See {% file-ref path="packages/types/src/config.ts" symbol="SiteConfig" label="SiteConfig" preview="drawer" /%} for the shape of a site's configuration.

{% /preview %}

To change what such a drawer shows, write a `{% drawer %}` with the same id on the page; the reference opens yours instead.

## Put any content in it

A drawer holds any block content: embeds, code blocks, other runes. A [snippet](/runes/snippet) makes a "view source" drawer; click {% ref "page-source" label="view this page's source" /%} (or press `.`) to open the one below.

{% preview source=true %}

	{% drawer id="page-source" title="View source" shortcut="." size="lg" %}
		{% snippet path=$file.path lang="markdoc" /%}
	{% /drawer %}

{% /preview %}

One drawer is open at a time.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:drawer"} /%}

## See also

- [xref](/runes/xref) — references that open a drawer, or build one with `preview="drawer"`.
- [file-ref](/runes/file-ref) — links a project file; `preview="drawer"` shows the file in a drawer.
- [snippet](/runes/snippet) — embeds a project file as a code block, for a "view source" drawer.
