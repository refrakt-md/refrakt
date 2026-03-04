---
title: Design Context
description: Unified design token card composing palette, typography, and spacing runes with cross-page sandbox injection
---

{% hint type="note" %}
This rune is part of **@refrakt-md/design**. Install with `npm install @refrakt-md/design` and add `"@refrakt-md/design"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Design Context

Wraps palette, typography, and spacing runes into a unified token card. Registers design tokens in the build pipeline so they can be injected as CSS custom properties into sandbox runes anywhere on the site.

## Basic usage

Compose child design runes inside a design-context block.

{% preview source=true %}

{% design-context title="Brand Tokens" %}

{% typography %}
- heading: Inter (400, 600, 700)
- body: Source Sans Pro (400, 600)
- mono: Fira Code (400)
{% /typography %}

{% palette %}
## Brand
- Primary: #2563EB
- Secondary: #7C3AED
- Accent: #F59E0B

## Neutral
- Gray: #F9FAFB, #E5E7EB, #9CA3AF, #374151, #111827
{% /palette %}

{% spacing %}
## Spacing
- unit: 4px
- scale: 4, 8, 12, 16, 24, 32, 48, 64

## Radius
- sm: 4px
- md: 8px
- lg: 12px
- full: 9999px
{% /spacing %}

{% /design-context %}

{% /preview %}

## Attributes

| Attribute | Type   | Default   | Description |
| --------- | ------ | --------- | ----------- |
| `title`   | string |           | Optional card title |
| `scope`   | string | `default` | Named scope for this context — referenced by sandbox runes via `context=` |

## Cross-page token injection

Tokens defined in a design-context are registered by the build pipeline and injected into any `{% sandbox context="..." %}` that references the same scope — even on a different page.

```markdoc
{% design-context scope="brand" title="Brand Tokens" %}
{% palette %}
## Brand
- Primary: #2563EB
- Secondary: #7C3AED
{% /palette %}
{% typography %}
- heading: Inter (600, 700)
- body: Inter (400, 500)
{% /typography %}
{% /design-context %}
```

On any other page, sandboxes receive these tokens automatically:

```markdoc
{% sandbox context="brand" %}
<div style="background: var(--color-primary); font-family: var(--font-heading); color: white; padding: 16px; border-radius: 8px;">
  Styled with brand tokens
</div>
{% /sandbox %}
```

The sandbox iframe receives:

- **Google Fonts** `<link>` tags for all typography fonts
- **CSS custom properties** on `:root` (`--font-heading`, `--color-primary`, `--spacing-unit`, etc.)
- **Base typography rules** mapping `body`, heading, and code elements to font variables
- **Tailwind config extension** (when `framework="tailwind"`) mapping tokens to Tailwind theme values

If no design-context with the referenced scope exists on the site, the build emits a warning and the sandbox renders without injected tokens.

## Multiple contexts

Use distinct `scope` values to maintain separate token sets — for example, separate brand identities or component library themes.

```markdoc
{% design-context scope="brand-a" title="Brand A" %}
...
{% /design-context %}

{% design-context scope="brand-b" title="Brand B" %}
...
{% /design-context %}
```

```markdoc
{% sandbox context="brand-a" %}...{% /sandbox %}
{% sandbox context="brand-b" %}...{% /sandbox %}
```
