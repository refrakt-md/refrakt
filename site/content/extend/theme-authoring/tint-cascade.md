---
title: Tint cascade
description: How the tint cascade resolves at build time, and the SSR contract a theme or adapter has to honour.
---

# Tint cascade

Every page resolves a `(tint, tintMode, locked)` tuple from four layers — site config, layout frontmatter, page frontmatter, and rune attribute — with later layers overriding earlier ones per field.

{% hint type="note" %}
This page is the implementation side: the resolution function, the SSR contract, and the anti-flash script. If you're writing content and want to know what `tint`, `tint-mode`, and `tint-lock` do in frontmatter, read [Tint and colour scheme](/docs/authoring/tint) instead — it covers the cascade order, the field semantics, and the YAML idioms.
{% /hint %}

## How it works under the hood

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

## What an adapter has to honour

Porting the cascade to a non-SvelteKit adapter means three things, in this order:

1. Call `resolveTintCascade` per page at build time and keep the tuple with the page.
2. Emit `htmlTintAttributes(cascade)` onto the `<html>` element during SSR, plus `colorSchemeMetaContent(cascade)` as the `color-scheme` meta.
3. Inject `prePaintScript()` **before any stylesheet link**. Injecting it later reintroduces the flash the script exists to prevent.

A theme that ships its own toggle must read `data-tint-lock` and hide itself when it is set, and must write to the `rf-theme` localStorage key so the pre-paint script picks the value up on the next navigation.

See {% ref "SPEC-052" preview="drawer" /%} for the full design rationale.
