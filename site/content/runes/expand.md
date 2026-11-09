---
title: Expand
description: Substitute a registered entity's source content inline — symmetric with xref but inlines the content instead of linking to it
category: Reuse & references
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:expand"} /%}

`{% expand %}` resolves a registered entity by id and substitutes the entity's source content **inline** at the point of reference. Symmetric with `{% ref %}` — same registry lookup chain, same disambiguation rules — but the output is the entity's actual content, not a link. To link to the entity instead, use [xref](/runes/xref); to link to a project file rather than an entity, use [file-ref](/runes/file-ref); to keep the content one click away, put it in a [drawer](/runes/drawer).

The motivating use case is in-context plan-content previews: write a blog post about an architecture decision and embed the ADR directly; write a docs page that implements a spec and show the spec inline; or wrap an embed in a drawer for a "click for context" affordance that doesn't leave the page.

## Embed an entity

The minimum case — a single ID:

```markdoc
{% expand "SPEC-066" /%}
```

This renders the spec in place. Its headings stay out of the page's table of contents, and their anchors are prefixed with the entity's ID so they never clash with the page's own.

The block is live below — wrapped in a `{% drawer %}` so the spec doesn't dominate the docs page. Click {% ref "spec-066-preview" label="open the embedded spec" /%} (or press `s`) to open it.

{% drawer id="spec-066-preview" title="SPEC-066 — Expand rune" shortcut="s" size="lg" %}
	{% expand "SPEC-066" canonical=true label="View full spec source" /%}
{% /drawer %}

## Compose with a drawer

The "see it in action" pitch is `{% expand %}` inside `{% drawer %}`: the reader stays on the host page, clicks an inline `{% ref %}` to open a side panel containing the full embedded entity, closes it, keeps reading. Same content lives in one place (the plan file); both the link and the inline embed update when the source does.

```markdoc
This implementation is described in {% ref "auth-spec" /%}, which is also
embedded in the {% ref "auth-spec-drawer" label="auth spec drawer" /%}.

{% drawer id="auth-spec-drawer" title="Auth spec" shortcut="s" %}
	{% expand "SPEC-066" canonical=true /%}
{% /drawer %}
```

The `canonical=true` attribute appends a "view canonical" link to the embedded content — useful when the embed is a peek and the canonical lives elsewhere.

## What can be embedded

Any entity whose source the build can read back: a spec, a work item, a decision, a character. Pages and headings cannot be embedded; the build reports an error naming the entity. Runes inside the embedded content render as they would on their own page, and references inside it resolve as they do on the host page.

## Heading handling

Embedded entities are **quoted documents**, not subsections of the host. By default:

- Heading levels are preserved — a spec's H1 stays H1, its H2 stays H2.
- Heading anchors are prefixed with the entity's ID (`SPEC-066--acceptance-criteria` instead of `acceptance-criteria`).
- The host's TOC reflects host-only structure; embedded headings don't appear.

When the embed is genuinely meant to act as a sub-section of the host — rare — set `level=N` to demote headings and merge the embed into the host outline:

| `level=` | Anchors prefixed? | TOC includes? | H1 → | H2 → |
|----------|-------------------|---------------|------|------|
| unset (default) | yes | no (isolated) | H1 | H2 |
| `1` | no | yes (sub-section) | H1 | H2 |
| `2` | no | yes (sub-section) | H2 | H3 |
| `3` | no | yes (sub-section) | H3 | H4 |

Demotion clamps at H6 with a build warning. Demotion still applies only to `heading` nodes in the Markdoc tree, not to rune-emitted custom elements styled as headings.

## Cycle detection

The resolver tracks a stack of `(type, id)` tuples per-page-render. Embedding the same entity on two different pages is fine; embedding it inside itself transitively fails the build with the cycle path. `{% ref %}`s inside embedded content **do not** participate — refs are links, not expansions.

## Canonical-link affordance

When `canonical=true`, expand renders a `<a class="rf-expand__canonical-link">` after the embedded content with `href` resolved via the [xref chain](/runes/xref) — entity `sourceUrl` first, then patterns, then unresolved.

`data-canonical-href` on the wrapper is **always populated** when the URL resolves, regardless of the `canonical` attribute — themes and tooling can always reach the URL even when the visible link isn't rendered.

```markdoc
{% expand "SPEC-066" canonical=true label="Read the full spec on trace" /%}
```

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:expand"} /%}

## See also

- [xref](/runes/xref) — same resolution chain, different output (link rather than inline content).
- [drawer](/runes/drawer) — pairs naturally with `{% expand %}` for "click for context" affordances.
- [snippet](/runes/snippet) — embed a project file as a code block (different shape; snippet is for source files, expand is for registered entities).
- [Cross-cutting primitives](/extend/rune-authoring/patterns) — `data-outline-scope` is a neutral convention any rune can adopt; expand is the first consumer.
