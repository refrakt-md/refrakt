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

## Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| (positional) | String | Yes | Entity ID or name to resolve |
| `label` | String | No | Custom link text (defaults to entity title) |
| `type` | String | No | Entity type hint for disambiguation |

## Resolution order

1. **Exact ID match** — searches all entity types for an ID that equals the reference string
2. **Name match** — if no ID matches, searches `name` and `title` fields (case-insensitive)
3. **Type filter** — if `type` is provided, restricts the search to that entity type
4. **Single match** — resolved as a link
5. **Multiple matches** — build warning; first match used as link target
6. **No match** — renders as plain text with a dashed underline; build warning emitted

## Unresolved references

When an entity cannot be found, the reference renders as plain text with a visual indicator (dashed underline, muted colour). The build continues — this allows referencing entities that don't exist yet.

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
  color: var(--rf-color-text-muted);
  cursor: help;
}
```
