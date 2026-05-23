---
title: Expand
description: Substitute a registered entity's source content inline — symmetric with xref but inlines the content instead of linking to it
---

# Expand

`{% expand %}` resolves a registered entity by id and substitutes the entity's source content **inline** at the point of reference. Symmetric with `{% ref %}` — same registry lookup chain, same disambiguation rules — but the output is the entity's actual content, not a link.

The motivating use case is in-context plan-content previews: write a blog post about an architecture decision and embed the ADR directly; write a docs page that implements a spec and show the spec inline; or wrap an embed in a drawer for a "click for context" affordance that doesn't leave the page.

## Embed an entity

The minimum case — a single ID:

```markdoc
{% expand "SPEC-066" /%}
```

Renders the SPEC-066 entity's source content (its top-level `{% spec %}` rune) wrapped in `<section class="rf-expand">`. The wrapper carries `data-outline-scope="SPEC-066"` so the embed's headings stay out of the host page's TOC and their IDs get prefixed with `SPEC-066--` automatically.

{% expand "SPEC-066" /%}

(The block above is live — its content is read from `plan/specs/SPEC-066-expand-rune.md` at build time.)

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

## Attributes

| Attribute | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `primary` | string | yes | — | Entity ID or name. Same lookup shape as `{% ref %}`. |
| `level` | number | no | unset | Heading-demotion opt-in. When set, embedded headings shift by `N - 1` and the embed merges into the host outline. When unset (default), the embed reads as a peer document with its own outline scope. |
| `type` | string | no | — | Entity type hint for disambiguation. |
| `canonical` | boolean | no | `false` | Append a visible "view canonical" link pointing at the entity's URL. |
| `label` | string | no | — | Custom label for the canonical link (only meaningful when `canonical=true`). |

## Resolution model

For each `{% expand %}` placeholder the resolver:

1. Looks the entity up in the registry by `(type?, id)`. Name-match fallback applies the same way `{% ref %}` does.
2. Checks the entity has `sourceFile` + `extract` set. Entities registered without an extractor (pages, headings) can't be embedded — the build surfaces a clear error.
3. Reads the source file through the snippet sandbox (project-root-relative, no traversal escape).
4. Calls the plugin's `extract()` to grab the embeddable subtree from the parsed AST.
5. Optionally shifts heading levels (when `level=` is set).
6. Transforms the subtree using the same tags+nodes config the host page used — embedded plan runes execute normally.
7. Substitutes the result into the host page, wrapped in `<section class="rf-expand">`.

The substituted content is then re-walked by the rest of the postProcess pipeline, so refs inside the embed resolve through the host page's xref pass, the outline-scope walkers prefix the embed's heading IDs, and so on. One pass, consistent surface.

## Heading handling

Embedded entities are **quoted documents**, not subsections of the host. By default:

- Heading levels are preserved — a spec's H1 stays H1, its H2 stays H2.
- The wrapper carries `data-outline-scope="{entityId}"` so the [`data-outline-scope`](/extend/rune-authoring/patterns) walkers TOC-isolate the embed and namespace its heading IDs (`SPEC-066--acceptance-criteria` instead of `acceptance-criteria`).
- The host's TOC reflects host-only structure; embedded headings don't appear.

When the embed is genuinely meant to act as a sub-section of the host — rare — set `level=N` to demote headings and merge the embed into the host outline:

| `level=` | data-outline-scope | TOC includes? | H1 → | H2 → |
|----------|-------------------|---------------|------|------|
| unset (default) | set to entity id | no (isolated) | H1 | H2 |
| `1` | not emitted | yes (sub-section) | H1 | H2 |
| `2` | not emitted | yes (sub-section) | H2 | H3 |
| `3` | not emitted | yes (sub-section) | H3 | H4 |

Demotion clamps at H6 with a build warning. Demotion still applies only to `heading` nodes in the Markdoc tree, not to rune-emitted custom elements styled as headings.

## Cycle detection

The resolver tracks a stack of `(type, id)` tuples per-page-render. Embedding the same entity on two different pages is fine; embedding it inside itself transitively fails the build with the cycle path. `{% ref %}`s inside embedded content **do not** participate — refs are links, not expansions.

## Canonical-link affordance

When `canonical=true`, expand renders a `<a class="rf-expand__canonical-link">` after the embedded content with `href` resolved via the [xref chain](/runes/xref) — entity `sourceUrl` first, then patterns (per SPEC-065's xref resolver), then unresolved.

`data-canonical-href` on the wrapper is **always populated** when the URL resolves, regardless of the `canonical` attribute — themes and tooling can always reach the URL even when the visible link isn't rendered.

```markdoc
{% expand "SPEC-066" canonical=true label="Read the full spec on trace" /%}
```

## Output contract

```html
<section class="rf-expand"
         data-rune="expand"
         data-entity-id="SPEC-066"
         data-entity-type="spec"
         data-outline-scope="SPEC-066"
         data-canonical-href="/plan/specs/SPEC-066-expand-rune/"
         data-source="registry">
  <!-- The full rendered output of the embedded plan rune -->
  <section class="rf-spec" data-status="draft">…</section>

  <!-- Only rendered when canonical=true -->
  <a class="rf-expand__canonical-link" href="/plan/specs/SPEC-066-expand-rune/">
    View canonical
  </a>
</section>
```

## See also

- [xref](/runes/xref) — same resolution chain, different output (link rather than inline content).
- [drawer](/runes/drawer) — pairs naturally with `{% expand %}` for "click for context" affordances.
- [snippet](/runes/snippet) — embed a project file as a code block (different shape; snippet is for source files, expand is for registered entities).
- [Cross-cutting primitives](/extend/rune-authoring/patterns) — `data-outline-scope` is a neutral convention any rune can adopt; expand is the first consumer.
