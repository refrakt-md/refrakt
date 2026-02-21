---
title: CSS Architecture
description: BEM conventions, design tokens, variant styling patterns, and dark mode support
---

# CSS Architecture

Every rune's visual presentation is defined in CSS. The identity transform produces semantic HTML with BEM classes and data attributes — your CSS targets these selectors to create the theme's look and feel.

## BEM naming

All selectors follow the BEM convention with a configurable prefix (default: `rf`):

| Pattern | Example | Meaning |
|---------|---------|---------|
| `.rf-{block}` | `.rf-hint` | Block — the rune's root element |
| `.rf-{block}--{modifier}` | `.rf-hint--warning` | Modifier — a variant of the block |
| `.rf-{block}__{element}` | `.rf-hint__icon` | Element — a child within the block |

The engine produces these classes automatically from the `RuneConfig`. You never write class names manually in content — the config drives the output, and your CSS matches it.

### Block classes

Every rune gets its block class from the `block` field in the config:

```css
/* Block selector — styles the rune's root element */
.rf-hint {
  border-left: 3px solid var(--hint-color);
  padding: 0.875rem 1.25rem;
  margin: 1.5rem 0;
  background: var(--hint-bg);
}
```

### Modifier classes

Modifier classes come from three sources:

**Dynamic modifiers** — values read from meta tags:
```css
/* hintType modifier with value "warning" → .rf-hint--warning */
.rf-hint--warning {
  --hint-color: var(--rf-color-warning);
  --hint-bg: var(--rf-color-warning-bg);
}
```

**Context modifiers** — applied when nested inside a parent rune:
```css
/* Hint inside a Hero gets compact styling */
.rf-hint--in-hero {
  margin: 1rem 0 0;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
}
```

**Static modifiers** — always applied to certain rune variants:
```css
/* FeaturedTier always has --featured */
.rf-tier--featured {
  border: 2px solid var(--rf-color-primary);
}
```

### Element classes

Element classes are derived from `data-name` attributes on children. The engine reads `data-name` and adds the corresponding `__element` class:

```css
/* Structural elements injected by the config */
.rf-hint__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.rf-hint__icon {
  display: flex;
  color: var(--hint-color);
}
.rf-hint__title {
  font-weight: 600;
  text-transform: capitalize;
}
```

## Data attribute styling

For variant-specific styling of child elements, use `[data-*]` attribute selectors instead of BEM modifier classes. The engine sets data attributes from resolved modifier values automatically.

This is the preferred pattern because the data attribute is set on the **root** element, and you can target **any descendant** based on it:

```css
/* API method colors — data-method is set on the root .rf-api element */
[data-method="GET"] .rf-api__method {
  color: var(--rf-color-success);
  background: var(--rf-color-success-bg);
}
[data-method="POST"] .rf-api__method {
  color: var(--rf-color-info);
  background: var(--rf-color-info-bg);
}
[data-method="DELETE"] .rf-api__method {
  color: var(--rf-color-danger);
  background: var(--rf-color-danger-bg);
}
```

```css
/* Recipe difficulty badge colors */
[data-difficulty="easy"] .rf-recipe__badge {
  color: var(--rf-color-success);
  background: var(--rf-color-success-bg);
}
[data-difficulty="medium"] .rf-recipe__badge {
  color: var(--rf-color-warning);
  background: var(--rf-color-warning-bg);
}
[data-difficulty="hard"] .rf-recipe__badge {
  color: var(--rf-color-danger);
  background: var(--rf-color-danger-bg);
}
```

{% hint type="note" %}
Data attributes follow kebab-case naming. A modifier named `hintType` in the config becomes `data-hint-type` in the HTML. The engine handles the conversion automatically.
{% /hint %}

## Context-aware styling

Context modifiers enable runes to adapt their appearance when nested inside other runes. The modifier class is added to the root element, so all CSS can be scoped under it:

```css
/* CTA standalone — centered with generous padding */
.rf-cta {
  text-align: center;
  padding: 3.5rem 2rem 3rem;
}

/* CTA inside a Hero — less top padding */
.rf-cta--in-hero {
  padding-top: 2rem;
  padding-bottom: 0;
}

/* CTA inside Pricing — left-aligned, compact */
.rf-cta--in-pricing {
  text-align: left;
  padding: 1.5rem 0 0;
}
```

Common context modifier patterns in the base config:

| Rune | Parent | Modifier | Purpose |
|------|--------|----------|---------|
| Hint | Hero | `in-hero` | Compact callout |
| Hint | Feature | `in-feature` | Narrow callout |
| CTA | Hero | `in-hero` | Reduced padding |
| CTA | Pricing | `in-pricing` | Left-aligned |
| Feature | Hero | `in-hero` | Hero-specific layout |
| Feature | Grid | `in-grid` | Grid-aware sizing |

## Design tokens

All visual values reference CSS custom properties (design tokens) rather than hard-coded values. This makes themes customizable and ensures dark mode works correctly.

### Token categories

Tokens are defined in a CSS file (e.g., `tokens/base.css`) on the `:root` selector:

**Typography:**
```css
:root {
  --rf-font-sans: 'Inter', system-ui, sans-serif;
  --rf-font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

**Color palette:**
```css
:root {
  /* Primary scale */
  --rf-color-primary-50: #f0f9ff;
  --rf-color-primary-500: #0ea5e9;
  --rf-color-primary-900: #0c4a6e;

  /* Core palette */
  --rf-color-text: #1a1a2e;
  --rf-color-muted: #64748b;
  --rf-color-border: #e2e8f0;
  --rf-color-bg: #ffffff;
  --rf-color-primary: var(--rf-color-primary-500);
  --rf-color-primary-hover: var(--rf-color-primary-600);
}
```

**Surfaces:**
```css
:root {
  --rf-color-surface: #f8fafc;
  --rf-color-surface-hover: #f1f5f9;
  --rf-color-surface-active: #e2e8f0;
  --rf-color-surface-raised: #ffffff;
}
```

**Semantic intent:**
```css
:root {
  --rf-color-info: #3b82f6;
  --rf-color-info-bg: #eff6ff;
  --rf-color-info-border: #bfdbfe;
  --rf-color-warning: #f59e0b;
  --rf-color-warning-bg: #fffbeb;
  --rf-color-danger: #ef4444;
  --rf-color-danger-bg: #fef2f2;
  --rf-color-success: #10b981;
  --rf-color-success-bg: #ecfdf5;
}
```

**Radii and shadows:**
```css
:root {
  --rf-radius-sm: 6px;
  --rf-radius-md: 10px;
  --rf-radius-lg: 16px;
  --rf-radius-full: 9999px;

  --rf-shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --rf-shadow-md: 0 4px 12px rgba(0,0,0,0.07);
  --rf-shadow-lg: 0 8px 24px rgba(0,0,0,0.08);
}
```

### Token naming convention

All tokens follow the pattern `--{prefix}-{category}-{name}`:

- `--rf-color-primary` — color category, primary name
- `--rf-font-sans` — font category, sans name
- `--rf-radius-md` — radius category, medium name
- `--rf-shadow-lg` — shadow category, large name

Semantic tokens reference the palette tokens, so changing the primary color scale automatically updates all UI that uses `--rf-color-primary`.

### Using tokens in rune CSS

Always reference tokens instead of hard-coded values:

```css
/* Good — uses tokens */
.rf-recipe {
  border: 1px solid var(--rf-color-border);
  border-radius: var(--rf-radius-lg);
  padding: 2rem;
}

/* Avoid — hard-coded values */
.rf-recipe {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 2rem;
}
```

### Rune-scoped custom properties

For runes with multiple variant colors, define scoped custom properties and override them per variant:

```css
.rf-hint {
  --hint-color: var(--rf-color-info);
  --hint-bg: var(--rf-color-info-bg);
  border-left: 3px solid var(--hint-color);
  background: var(--hint-bg);
}
.rf-hint--note {
  --hint-color: var(--rf-color-info);
  --hint-bg: var(--rf-color-info-bg);
}
.rf-hint--warning {
  --hint-color: var(--rf-color-warning);
  --hint-bg: var(--rf-color-warning-bg);
}
.rf-hint--caution {
  --hint-color: var(--rf-color-danger);
  --hint-bg: var(--rf-color-danger-bg);
}
```

This pattern keeps the base styles clean — you define the layout once using the scoped properties, then each variant only overrides the property values.

## Dark mode

Dark mode is implemented via CSS custom properties, overridden in a dark mode context. Lumina supports both explicit attribute toggle and system preference:

```css
/* Dark mode overrides — tokens/dark.css */
[data-theme="dark"] {
  --rf-color-text: #e2e8f0;
  --rf-color-muted: #94a3b8;
  --rf-color-border: #334155;
  --rf-color-bg: #0f172a;
  --rf-color-surface: #1e293b;
  /* ... all tokens overridden */
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --rf-color-text: #e2e8f0;
    /* same overrides */
  }
}
```

Because rune CSS references tokens, dark mode works automatically — you don't need per-rune dark mode styles. Only the token values change.

The theme's `manifest.json` declares dark mode support:

```json
{
  "darkMode": {
    "attribute": "data-theme",
    "values": { "dark": "dark", "light": "light" },
    "systemPreference": true
  }
}
```

## CSS custom property injection

The `styles` config field injects values as inline `style` attributes. This is used when CSS needs values that are truly dynamic per-instance:

```css
/* Storyboard uses --sb-columns set by the engine */
.rf-storyboard {
  display: grid;
  grid-template-columns: repeat(var(--sb-columns, 3), 1fr);
}
```

The config `styles: { columns: '--sb-columns' }` tells the engine to set `style="--sb-columns: 4"` when `columns=4` is specified. The CSS reads the custom property with a fallback default.

## File organization

### One file per rune block

Each BEM block gets its own CSS file:

```
styles/runes/
├── hint.css           # .rf-hint, .rf-hint--*, .rf-hint__*
├── recipe.css         # .rf-recipe, .rf-recipe__meta, etc.
├── api.css            # .rf-api, .rf-api__header, etc.
├── pricing.css        # .rf-pricing + .rf-tier (child rune)
└── ...
```

### Child runes in parent files

Runes that are always children of another rune are styled in the parent's CSS file. For example, `.rf-tier` selectors live in `pricing.css`, not in a separate `tier.css`.

Common parent-child groupings:

| Parent CSS file | Contains selectors for |
|-----------------|----------------------|
| `accordion.css` | `.rf-accordion`, `.rf-accordion-item` |
| `pricing.css` | `.rf-pricing`, `.rf-tier` |
| `steps.css` | `.rf-steps`, `.rf-step` |
| `tabs.css` | `.rf-tabs`, `.rf-tab` |
| `timeline.css` | `.rf-timeline`, `.rf-timeline-entry` |
| `conversation.css` | `.rf-conversation`, `.rf-conversation-message` |

### Barrel import

A single `index.css` imports all token and rune CSS files:

```css
/* index.css */
@import './tokens/base.css';
@import './tokens/dark.css';
@import './styles/global.css';
@import './styles/runes/hint.css';
@import './styles/runes/recipe.css';
/* ... all rune CSS files */
```

This is the theme's main CSS entry point, consumed by site builds.
