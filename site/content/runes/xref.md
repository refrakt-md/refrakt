---
title: Xref
description: Inline cross-references that resolve entities by ID or name from the entity registry
---

# Xref

Inline cross-reference that resolves an entity by ID or name through the entity registry. The author provides an identifier — the system finds the page, constructs the link, and uses the entity's title as link text. Self-closing tag.

{% hint type="note" %}
The `xref` rune requires the cross-page pipeline (Level 2). At Level 1 (static transform), references render as plain text.
{% /hint %}

## By ID

Reference an entity by its unique identifier. The registry resolves the URL and title automatically.

```markdoc
Depends on {% xref "RF-138" /%}
See {% xref "SPEC-008" /%} for details.
This implements {% xref "ADR-007" /%}.
```

## By name

Reference an entity by its display name. Name lookup is case-insensitive and searches `name` and `title` fields across all registered entities.

```markdoc
{% xref "Veshra" /%} never forgave the betrayal.
The {% xref "authentication" /%} guide covers setup.
```

## Custom label

Override the default link text with the `label` attribute. The link still points to the resolved entity.

```markdoc
{% xref "RF-138" label="the base implementation" /%}
{% xref "Veshra" label="the exile" /%}
```

## Type hint

When a name is ambiguous (multiple entities share the same name), the `type` attribute narrows the lookup to a specific entity type.

```markdoc
{% xref "Sanctuary" type="realm" /%}
{% xref "Sanctuary" type="character" /%}
```

Without a type hint, ambiguous references use the first match and emit a build warning.

## Preview drawer

Set `preview="drawer"` to keep the inline link *and* hoist a drawer containing the entity's expanded body, opening on click. Same shape `{% file-ref %}` uses — one preview vocabulary across both reference runes (SPEC-078).

{% preview source=true %}

This page is itself the work of {% ref "SPEC-078" preview="drawer" /%}: a single shared `preview` attribute on every reference rune that hoists a drawer instead of navigating away.

{% /preview %}

When the reader clicks the inline link, a drawer slides in containing the entity's `{% expand %}`-equivalent content. The drawer's chrome footer links to the entity's resolved page URL (or hides silently when the entity has no `sourceUrl` — heading entities, drawer-target entities, plan content scanned without a route). The link itself reads like a normal xref in prose; the only visible difference is that clicking opens a drawer rather than navigating away.

Per-page **dedup**: N mentions of the same entity collapse to one hoisted drawer.

**Composition note.** The drawer body is just an expand-pending placeholder that the regular `{% expand %}` resolver substitutes downstream. So `{% ref "X" preview="drawer" /%}` is structurally identical to a manual `{% drawer id="X" %}{% expand "X" /%}{% /drawer %}` — the preview attribute is the ergonomic shortcut, not a different rendering path.

**Nested-preview caveat.** A `{% ref "X" preview="drawer" /%}` inside another drawer's body or footer still hoists, but it produces a drawer-from-within-a-drawer shape. Supported but discouraged; the build emits an info-level note when detected.

See [file-ref](/runes/file-ref) for the path-based sibling that uses the same `preview` attribute over file content rather than registered entities.

## Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| (positional) | String | Yes | Entity ID or name to resolve |
| `label` | String | No | Custom link text (defaults to entity title) |
| `type` | String | No | Entity type hint for disambiguation |
| `preview` | `drawer` | No | Hoist a preview drawer with the entity's expanded body; the inline link opens it (SPEC-078). |

## Resolution order

Resolution splits entity lookup from URL resolution so the two can succeed independently:

1. **Entity lookup** — exact ID match across all types (or the type-hinted one); falls through to case-insensitive `name`/`title` match. The matched entity supplies metadata (label, type) for the rendered anchor — whether or not the URL ends up coming from a configured pattern.
2. **URL resolution** — if the matched entity has a usable `sourceUrl`, that's the href (`data-xref-source="registry"`). Otherwise the resolver iterates the patterns configured in `refrakt.config.json#/xrefs`; first regex that matches the ID wins (`data-xref-source="pattern"`).
3. **Unresolved** — if neither the entity's `sourceUrl` nor any pattern produces a URL, the ref renders as a styled `rf-xref--unresolved` span with a build warning.

This means a registered entity *without* a canonical URL — like plan content scanned outside any site's content tree (SPEC-064) — still resolves correctly: the registry provides label and type; a configured pattern provides the URL.

## Configurable URL patterns

Configure external-system URL templates in `refrakt.config.json`:

```jsonc
{
  "xrefs": [
    {
      "match": "^SPEC-\\d+$",
      "template": "https://trace.refrakt.md/myuser/myrepo/specs/{id}",
      "type": "spec",
      "label": "{id}"
    },
    {
      "match": "^GH-(?<num>\\d+)$",
      "template": "https://github.com/myuser/myrepo/issues/{num}",
      "type": "github-issue",
      "label": "GitHub #{num}"
    },
    {
      "match": "^RFC-(?<num>\\d+)$",
      "template": "https://datatracker.ietf.org/doc/html/rfc{num}",
      "type": "rfc",
      "label": "RFC {num}"
    },
    {
      "match": "^npm:(?<pkg>[a-z0-9-/@.]+)$",
      "template": "https://www.npmjs.com/package/{pkg}",
      "type": "npm",
      "label": "{pkg}"
    }
  ]
}
```

### Pattern fields

| Field | Required | Meaning |
|-------|----------|---------|
| `match` | yes | JavaScript regex matched against the ref ID. Anchored to whole-string match by default (`^` and `$` are auto-applied unless explicit anchors are present at both ends). Named groups (`(?<name>...)`) are addressable in `template` / `label` as `{name}`. |
| `template` | yes | URL template. `{id}` is the full matched ID; `{name}` substitutes a named group. |
| `type` | no | Maps to `rf-xref--{type}` CSS modifier. Default: `"external"`. The value `"unresolved"` is reserved. |
| `label` | no | Link-text template using the same placeholder syntax. Default: `"{id}"`. Overridden by a per-ref `label=` attribute when set. |

### URL encoding

Each substituted value is encoded per URL segment: split on `/`, encode each segment via `encodeURIComponent`, rejoin with `/`. This preserves slash structure in path-shaped captures — a `(?<path>[a-z0-9/-]+)` group capturing `guide/intro` renders as `.../guide/intro`, not `.../guide%2Fintro`. Reserved characters within a single segment are still encoded normally.

### Pattern recipes

```jsonc
// External plan host (refrakt trace)
{ "match": "^SPEC-\\d+$", "template": "https://trace.refrakt.md/user/repo/specs/{id}" }

// Issue tracker (GitHub)
{ "match": "^GH-(?<num>\\d+)$", "template": "https://github.com/user/repo/issues/{num}" }

// Standards / RFCs
{ "match": "^RFC-(?<num>\\d+)$", "template": "https://datatracker.ietf.org/doc/html/rfc{num}" }

// Package registry
{ "match": "^npm:(?<pkg>[a-z0-9-/@.]+)$", "template": "https://www.npmjs.com/package/{pkg}" }

// Wikipedia
{ "match": "^wiki:(?<title>.+)$", "template": "https://en.wikipedia.org/wiki/{title}" }
```

## Unresolved references

When neither the registry nor any pattern produces a URL, the reference renders as a styled `rf-xref--unresolved` span with a build warning. The build continues — this allows referencing entities that don't exist yet or that resolve only in a future build (after content is added).

## Entity types

Every package that registers entities works with `xref` automatically. Common types:

| Source | Entity types | Example |
|--------|-------------|---------|
| Core | `page`, `heading` | `{% xref "getting-started" /%}` |
| @refrakt-md/storytelling | `character`, `realm`, `faction`, `lore`, `bond` | `{% xref "Veshra" /%}` |
| @refrakt-md/learning | `term`, `lesson` | `{% xref "polymorphism" /%}` |
| @refrakt-md/business | `person`, `organization` | `{% xref "Acme Corp" /%}` |
| @refrakt-md/places | `event`, `location` | `{% xref "Launch Party" /%}` |

## Theme styling

Themes can style cross-references by entity type using BEM modifier classes:

```css
.rf-xref { /* base link styling */ }
.rf-xref--character { /* person icon prefix */ }
.rf-xref--page { /* plain link */ }
.rf-xref--unresolved {
  text-decoration: underline dashed;
  color: var(--rf-color-muted);
  cursor: help;
}
```
