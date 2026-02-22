---
title: Creating a Theme
description: Step-by-step guide to building a custom refrakt.md theme from scratch
---

# Creating a Theme

This guide walks through building a custom theme package from scratch, using the base configuration as a foundation and adding your own visual identity.

## Prerequisites

- Familiarity with CSS and BEM naming
- Basic knowledge of Node.js and npm
- Understanding of the [theme overview](/docs/themes/overview) and [configuration reference](/docs/themes/configuration)

## Step 1: Create the package

Set up a new package in your project or monorepo:

```shell
mkdir packages/my-theme
cd packages/my-theme
npm init -y
```

Configure `package.json` with the required exports:

```json
{
  "name": "@my-org/my-theme",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/transform.js",
  "types": "dist/transform.d.ts",
  "exports": {
    ".": "./index.css",
    "./transform": {
      "types": "./dist/transform.d.ts",
      "default": "./dist/transform.js"
    },
    "./manifest": "./manifest.json",
    "./sveltekit": {
      "svelte": "./sveltekit/index.ts",
      "default": "./sveltekit/index.ts"
    }
  },
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "@refrakt-md/theme-base": "0.4.0",
    "@refrakt-md/transform": "0.4.0",
    "@refrakt-md/types": "0.4.0",
    "@refrakt-md/svelte": "0.4.0"
  }
}
```

The key exports:
- `.` — Your CSS entry point (tokens + rune styles)
- `./transform` — Your theme config, compiled to JS
- `./manifest` — Theme metadata
- `./sveltekit` — SvelteKit adapter (registry re-export)

## Step 2: Write your config

Create `src/config.ts`:

```typescript
import { baseConfig, mergeThemeConfig } from '@refrakt-md/theme-base';

export const myThemeConfig = mergeThemeConfig(baseConfig, {
  // Optional: use a different BEM prefix
  // prefix: 'mt',

  // Add icon SVGs for runes that use them
  icons: {
    hint: {
      note: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>',
      warning: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>',
      caution: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>',
      check: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>',
    },
  },

  // Optional: override specific rune configs
  runes: {
    // Example: change the default hint type
    // Hint: {
    //   modifiers: { hintType: { source: 'meta', default: 'info' } },
    // },
  },
});
```

The base config already defines all 45+ rune configurations. Your config only needs to provide:
- **Icons** for runes that display them (currently just Hint)
- **Overrides** for runes where you want different defaults or behavior

{% hint type="note" %}
If you change the `prefix` (e.g., from `'rf'` to `'mt'`), all your CSS selectors must use the new prefix: `.mt-hint` instead of `.rf-hint`. Most themes keep `'rf'` for compatibility.
{% /hint %}

## Step 3: Define design tokens

Create `tokens/base.css` with your visual language:

```css
:root {
  /* Typography */
  --rf-font-sans: 'Your Font', system-ui, sans-serif;
  --rf-font-mono: 'Your Mono Font', monospace;

  /* Primary color scale */
  --rf-color-primary-50: #faf5ff;
  --rf-color-primary-100: #f3e8ff;
  --rf-color-primary-500: #a855f7;
  --rf-color-primary-600: #9333ea;
  --rf-color-primary-900: #581c87;

  /* Core palette */
  --rf-color-text: #1a1a2e;
  --rf-color-muted: #64748b;
  --rf-color-border: #e2e8f0;
  --rf-color-bg: #ffffff;
  --rf-color-primary: var(--rf-color-primary-500);
  --rf-color-primary-hover: var(--rf-color-primary-600);

  /* Surfaces */
  --rf-color-surface: #f8fafc;
  --rf-color-surface-hover: #f1f5f9;
  --rf-color-surface-active: #e2e8f0;
  --rf-color-surface-raised: #ffffff;

  /* Semantic */
  --rf-color-info: #3b82f6;
  --rf-color-info-bg: #eff6ff;
  --rf-color-info-border: #bfdbfe;
  --rf-color-warning: #f59e0b;
  --rf-color-warning-bg: #fffbeb;
  --rf-color-warning-border: #fde68a;
  --rf-color-danger: #ef4444;
  --rf-color-danger-bg: #fef2f2;
  --rf-color-danger-border: #fecaca;
  --rf-color-success: #10b981;
  --rf-color-success-bg: #ecfdf5;
  --rf-color-success-border: #a7f3d0;

  /* Radii */
  --rf-radius-sm: 6px;
  --rf-radius-md: 10px;
  --rf-radius-lg: 16px;
  --rf-radius-full: 9999px;

  /* Shadows */
  --rf-shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --rf-shadow-md: 0 4px 12px rgba(0,0,0,0.07);
  --rf-shadow-lg: 0 8px 24px rgba(0,0,0,0.08);
}
```

Create `tokens/dark.css` for dark mode:

```css
[data-theme="dark"] {
  --rf-color-text: #e2e8f0;
  --rf-color-muted: #94a3b8;
  --rf-color-border: #334155;
  --rf-color-bg: #0f172a;
  --rf-color-surface: #1e293b;
  --rf-color-surface-hover: #334155;
  --rf-color-surface-active: #475569;
  --rf-color-surface-raised: #1e293b;
  /* Override all semantic colors for dark backgrounds */
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* Same overrides as above */
  }
}
```

## Step 4: Write rune CSS

Create a `styles/runes/` directory. Start with a simple rune and build from there.

### Starting with a simple rune

`styles/runes/grid.css`:

```css
.rf-grid {
  margin: 1.5rem 0;
}
.rf-grid [data-layout="grid"] {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}
```

### Adding a rune with structural elements

`styles/runes/hint.css`:

```css
.rf-hint {
  --hint-color: var(--rf-color-info);
  --hint-bg: var(--rf-color-info-bg);
  border-left: 3px solid var(--hint-color);
  padding: 0.875rem 1.25rem;
  margin: 1.5rem 0;
  background: var(--hint-bg);
}
.rf-hint__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
}
.rf-hint__icon {
  display: flex;
  color: var(--hint-color);
}
.rf-hint__title {
  font-weight: 600;
  text-transform: capitalize;
  color: var(--hint-color);
}
/* Variant colors */
.rf-hint--note { --hint-color: var(--rf-color-info); --hint-bg: var(--rf-color-info-bg); }
.rf-hint--warning { --hint-color: var(--rf-color-warning); --hint-bg: var(--rf-color-warning-bg); }
.rf-hint--caution { --hint-color: var(--rf-color-danger); --hint-bg: var(--rf-color-danger-bg); }
.rf-hint--check { --hint-color: var(--rf-color-success); --hint-bg: var(--rf-color-success-bg); }
```

### Working through all runes

The base config defines 45+ runes. You don't need CSS for all of them immediately — the identity transform still produces valid HTML with BEM classes even without CSS. Prioritize the runes your content uses most.

A good order:
1. **Layout basics**: grid, tabs, accordion, details
2. **Content blocks**: hint, steps, figure, cta, hero, feature
3. **Structural runes**: recipe, api, event, howto
4. **Everything else**: design tokens, code, data, creative runes

## Step 5: Add icons

Runes that use `icon` in their structure config need SVG strings provided in the theme config. Currently this is just the Hint rune, which expects icons for each hint type.

The SVGs should be inline strings — no file references:

```typescript
icons: {
  hint: {
    note: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    // ... other variants
  },
}
```

Use `stroke="currentColor"` so the icon inherits color from CSS.

## Step 6: Create your manifest

Create `manifest.json` at the package root:

```json
{
  "name": "My Theme",
  "description": "A custom theme for refrakt.md",
  "version": "0.1.0",
  "author": "Your Name",
  "prefix": "rf",
  "tokenPrefix": "--rf",
  "darkMode": {
    "attribute": "data-theme",
    "values": { "dark": "dark", "light": "light" },
    "systemPreference": true
  }
}
```

The manifest declares your theme's identity and capabilities to tooling and documentation generators.

## Step 7: Create the CSS entry point

Create `index.css` that imports everything:

```css
@import './tokens/base.css';
@import './tokens/dark.css';
@import './styles/global.css';
@import './styles/runes/grid.css';
@import './styles/runes/hint.css';
@import './styles/runes/recipe.css';
/* Add imports as you create more rune CSS files */
```

## Step 8: SvelteKit integration

Create `sveltekit/index.ts` to re-export the component registry from theme-base:

```typescript
export { registry } from '@refrakt-md/theme-base/sveltekit/registry';
```

This gives SvelteKit sites access to the interactive components (Chart, Map, Diagram, etc.) that are shared across all themes.

If your theme needs to override or add components, you can create your own registry:

```typescript
import { registry as baseRegistry } from '@refrakt-md/theme-base/sveltekit/registry';
import MyCustomComponent from './components/MyComponent.svelte';

export const registry = {
  ...baseRegistry,
  'MyRune': MyCustomComponent,
};
```

## Step 9: Build and test

Add a `tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

Build:

```shell
npm run build
```

### Testing CSS coverage

You can add CSS coverage tests similar to Lumina's. Create `test/css-coverage.test.ts` that:

1. Reads the base config
2. Parses your CSS files with PostCSS
3. Asserts that expected selectors exist

See Lumina's `packages/lumina/test/css-coverage.test.ts` for the full pattern.

## Using your theme in a site

In your SvelteKit site's layout, import the theme CSS and configure the transform:

```typescript
// In your Vite/SvelteKit config
import { myThemeConfig } from '@my-org/my-theme/transform';
import { createTransform } from '@refrakt-md/transform';

const transform = createTransform(myThemeConfig);
```

```html
<!-- In your root layout -->
<link rel="stylesheet" href="@my-org/my-theme" />
```

## Final directory structure

```
packages/my-theme/
├── src/
│   └── config.ts
├── sveltekit/
│   └── index.ts
├── tokens/
│   ├── base.css
│   └── dark.css
├── styles/
│   ├── global.css
│   └── runes/
│       ├── hint.css
│       ├── grid.css
│       └── ...
├── test/
│   └── css-coverage.test.ts
├── index.css
├── manifest.json
├── tsconfig.json
└── package.json
```
