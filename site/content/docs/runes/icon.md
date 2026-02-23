---
title: Icon
description: Inline icons from the theme's icon registry
---

# Icon

Inline SVG icons resolved by name from the theme's icon registry. Self-closing tag that produces an inline `<svg>` element inheriting `currentColor` for theme-adaptive coloring.

## Basic usage

Reference any icon from the theme's curated set by name.

{% preview source=true %}

{% icon name="rocket" /%} Launch your project

{% icon name="shield" /%} Secure by default

{% icon name="zap" /%} Lightning fast

{% /preview %}

## Inside Feature

Icons work naturally inside feature definitions. Place an icon before the bold name — the Feature rune extracts it into the image slot.

{% preview source=true %}

{% feature %}
## What you get

- {% icon name="puzzle" /%} **Semantic runes**
  Markdown primitives take on different meaning based on context.

- {% icon name="shield-check" /%} **Type-safe output**
  Every rune produces typed, validated content.

- {% icon name="sparkles" /%} **Automatic SEO**
  Structured data falls out of the content model.
{% /feature %}

{% /preview %}

## Grouped icons

Use `group/name` syntax to reference icons from specific groups. Without a prefix, icons resolve from the `global` group.

{% preview source=true %}

{% icon name="rocket" /%} Global icon (same as `global/rocket`)

{% icon name="hint/warning" /%} Structural icon from the `hint` group

{% /preview %}

## Size override

Use the `size` attribute to override the icon's dimensions.

{% preview source=true %}

{% icon name="star" size="16px" /%} Small

{% icon name="star" /%} Default (24px)

{% icon name="star" size="32px" /%} Large

{% /preview %}

## Available icons

Lumina ships ~80 curated icons from [Lucide](https://lucide.dev) (MIT licensed), organized by category:

**Actions**: arrow-right, arrow-left, arrow-up, arrow-down, download, upload, share, link, external-link, search, settings, plus, minus, check, x, copy, edit, trash-2, refresh-cw, filter, arrow-up-down

**Objects**: book-open, file-text, folder, image, video, camera, code, terminal, database, server, cloud, cpu, monitor, smartphone, globe, map-pin, home, building, key, lock, unlock, mail, phone, bell, calendar, clock, flag, bookmark, star, heart

**Status**: info, alert-triangle, alert-circle, check-circle, x-circle, help-circle, shield, shield-check, eye, eye-off, thumbs-up, thumbs-down

**Commerce & Business**: dollar-sign, credit-card, shopping-cart, package, truck, briefcase, target, trending-up, bar-chart-2, users, user, zap, rocket, sparkles, lightbulb, puzzle, layers, layout, palette

## Custom icons

Site users can add or override icons without modifying the theme. Add an `icons` field to your theme config override:

```typescript
import { luminaConfig } from '@refrakt-md/lumina/transform';
import { mergeThemeConfig } from '@refrakt-md/theme-base';

const config = mergeThemeConfig(luminaConfig, {
  icons: {
    global: {
      'my-logo': '<svg viewBox="0 0 24 24" ...>...</svg>',
      'rocket': '<svg ...>...</svg>',  // overrides the default rocket
    },
  },
});
```

Then use `{% icon name="my-logo" /%}` in your content.

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | `string` | — | Icon name, optionally prefixed with group (`"rocket"` or `"hint/warning"`) |
| `size` | `string` | — | CSS size override (e.g., `"16px"`, `"2rem"`) |
