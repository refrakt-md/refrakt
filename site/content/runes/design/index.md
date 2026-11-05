---
title: "@refrakt-md/design"
description: Design system runes for color palettes, typography specimens, and token visualization
icon: palette
---

# @refrakt-md/design

Design system runes for documenting colors, typography, spacing, and component previews. Build living style guides and design token documentation — all from Markdown.

## Installation

```bash
npm install @refrakt-md/design
```

```json
{
  "plugins": ["@refrakt-md/design"]
}
```

## Runes

| Rune | Description |
|------|-------------|
| [swatch](/runes/design/swatch) | Inline color chip for referencing colors in prose |
| [palette](/runes/design/palette) | Color swatch grid with optional WCAG contrast and accessibility info |
| [typography](/runes/design/typography) | Font specimen display with live Google Fonts loading |
| [spacing](/runes/design/spacing) | Spacing scale, border radius, and shadow token display |
| [preview](/runes/design/preview) | Component showcase with theme toggle, responsive viewports, and adjustable width |
| [mockup](/runes/design/mockup) | Device frame mockups for screenshots |
| [design-context](/runes/design/design-context) | Unified design token card composing palette, typography, and spacing runes |

## When to use

Use this package for design system documentation, style guides, brand guidelines, or any project that needs to document visual design decisions. The `design-context` rune ties everything together — define your tokens once and reference them consistently across pages.
