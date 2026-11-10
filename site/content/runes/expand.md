---
title: Expand
description: Substitute a registered entity's source content inline — symmetric with xref but inlines the content instead of linking to it
category: Reuse & references
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:expand"} /%}

`{% expand %}` finds an entity the way `{% ref %}` does, and places the entity's content on the page instead of a link to it: embed a decision record in a blog post about it, or show the spec beside the docs that implement it. The content stays in one file, so every embed updates when it changes. To link to the entity instead, use [xref](/runes/xref); to link to a project file rather than an entity, use [file-ref](/runes/file-ref); to keep the content one click away, put it in a [drawer](/runes/drawer).

## Basic usage

Give the entity's ID. The work item below is rendered from its plan file:

{% preview source=true %}

	{% expand "WORK-026" /%}

{% /preview %}

## What can be embedded

Any entity whose source the build can read back: a spec, a work item, a decision, a character. Pages and headings cannot be embedded; the build reports an error naming the entity. Runes inside the embedded content render as they would on their own page, and references inside it resolve as they do on the host page.

An entity cannot embed itself, directly or through another embed; the build fails and names the loop. Embedding the same entity on several pages is fine.

## Show it in a drawer

Put the embed in a [drawer](/runes/drawer) and open it with a `{% ref %}`: the reader gets the full entity in a side panel and stays on the page.

{% preview source=true %}

	The expand rune has a written specification. {% ref "spec-066-preview" label="Open it" /%} (or press `s`) to read it without leaving the page.

	{% drawer id="spec-066-preview" title="SPEC-066 — Expand rune" shortcut="s" size="lg" %}
		{% expand "SPEC-066" canonical=true label="View full spec source" /%}
	{% /drawer %}

{% /preview %}

`canonical=true` adds a link to the entity's own page after the content, for when the embed is a peek; `label` sets its text.

## Fit the headings into the page

An embed is a quoted document, not a part of the host page. Its headings keep their levels, stay out of the page's table of contents, and their anchors are prefixed with the entity's ID (`SPEC-066--acceptance-criteria`), so they never clash with the page's own.

When the embed really is a subsection of the page, set `level` to the level its top heading should take. Its headings shift down to match and join the table of contents, with unprefixed anchors:

| `level=` | H1 becomes | H2 becomes | In the table of contents |
|----------|------------|------------|--------------------------|
| not set | H1 | H2 | no |
| `2` | H2 | H3 | yes |
| `3` | H3 | H4 | yes |

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:expand"} /%}

## See also

- [xref](/runes/xref) — the same lookup, with a link as the output.
- [drawer](/runes/drawer) — pairs with `{% expand %}` for "click for context".
- [snippet](/runes/snippet) — embed a project file as a code block rather than a registered entity.
