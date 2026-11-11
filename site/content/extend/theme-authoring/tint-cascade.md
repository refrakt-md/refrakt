---
title: Tint cascade
description: How a theme implements tint — named tint definitions, the CSS bridge, how the page cascade resolves at build time, and the SSR contract an adapter has to honor.
---

# Tint cascade

Tint works at two scales: a single rune recolored by a named or inline tint, and a whole page whose `(tint, tintMode, locked)` tuple resolves from four layers — site config, layout frontmatter, page frontmatter, and rune attribute — with later layers overriding earlier ones per field.

{% hint type="note" %}
This page is the implementation side: tint definitions, the CSS bridge, the resolution function, the SSR contract, and the anti-flash script. For authoring, read [Tint and color scheme](/docs/concepts/tint) (what `tint`, `tint-mode`, and `tint-lock` do in frontmatter, the cascade order, the YAML idioms) and the [tint rune](/runes/tint) (the `{% tint %}` rune and the `tint` / `tint-mode` attributes).
{% /hint %}

## Named tints and the CSS bridge

A theme defines named tints in the `tints` registry of its config (a site can add more in `refrakt.config.json`). Each definition carries a `light` and an optional `dark` token set over the six tint tokens — `bg`, `surface`, `text`, `muted`, `primary`, `border` — and an optional `lockMode` that forces the color scheme wherever the tint is applied:

```javascript
// theme config
tints: {
  warm: {
    light: {
      bg: '#fdf6e3',
      text: '#5c4a32',
      primary: '#c47d3b',
      border: '#e0d5c0',
    },
    dark: {
      bg: '#2a2118',
      text: '#e8d5b7',
      primary: '#e0a86e',
      border: '#4a3f33',
    },
  },
  dark: {
    lockMode: 'dark',
    dark: {
      bg: '#1a1a2e',
      text: '#e0e0e0',
      primary: '#e94560',
    },
  },
}
```

A definition can `extends` another; see [Config API](/extend/theme-authoring/config-api).

When a rune carries `tint` (or an inline `{% tint %}` child), the identity transform resolves the named definition, layers any inline token values on top, and writes the result onto the rune's root:

- inline `--tint-{token}` custom properties for the light values and `--tint-dark-{token}` for the dark ones, so no value waits on a stylesheet;
- `data-tint` (the tint's name, or `custom` for inline-only), `data-color-scheme` when the scheme is forced, and `data-tint-dark` when dark values exist;
- the `.rf-{block}--tinted` class, only when color tokens actually resolved — a bare `tint-mode` locks the scheme without tinting anything.

The theme's **bridge CSS** maps those properties onto its own color tokens — under `[data-tint]`, `--rf-color-bg: var(--tint-bg)` and so on, switching to the `--tint-dark-*` values under dark mode. A theme without bridge CSS simply ignores tint tokens, and the section renders with the page defaults. Lumina's bridge is `packages/lumina/styles/runes/tint.css`.

## The page cascade

### How it resolves

The cascade resolution is a pure function in `@refrakt-md/content`:

```ts
import { resolveTintCascade } from '@refrakt-md/content';

const cascade = resolveTintCascade(page, rootDirectory, {
  colorScheme: 'auto',  // from refrakt.config.json
});
// → { tint: null, tintMode: 'dark', locked: true }
```

The SvelteKit adapter calls this for every page at build time; the result is stashed on `SitePage.tintCascade`. A `hooks.server.ts` consumes that tuple via three helpers also exported from `@refrakt-md/content`:

```ts
import { htmlTintAttributes, colorSchemeMetaContent, prePaintScript } from '@refrakt-md/content';

htmlTintAttributes(cascade);    // → 'data-theme="dark" data-tint-lock="true"'
colorSchemeMetaContent(cascade); // → 'dark'
prePaintScript();                // → '(function(){...})();' anti-FOIT script
```

The hook rewrites `<html>` with the attributes and injects the meta tag + pre-paint script before any stylesheets. The script reads `data-tint-lock`; on locked pages it no-ops, so the SSR-emitted mode is final. On unlocked pages it applies the user's saved preference (or system pref) before paint — no flash of incorrect theme.

The theme toggle component (`ThemeToggle` from `@refrakt-md/svelte`) reads the same `data-tint-lock` and hides itself on locked pages, writing to the same `rf-theme` localStorage key the pre-paint script reads.

## What an adapter has to honor

Porting the cascade to a non-SvelteKit adapter means three things, in this order:

1. Call `resolveTintCascade` per page at build time and keep the tuple with the page.
2. Emit `htmlTintAttributes(cascade)` onto the `<html>` element during SSR, plus `colorSchemeMetaContent(cascade)` as the `color-scheme` meta.
3. Inject `prePaintScript()` **before any stylesheet link**. Injecting it later reintroduces the flash the script exists to prevent.

A theme that ships its own toggle must read `data-tint-lock` and hide itself when it is set, and must write to the `rf-theme` localStorage key so the pre-paint script picks the value up on the next navigation.

Background: {% ref "SPEC-052" preview="drawer" /%}
