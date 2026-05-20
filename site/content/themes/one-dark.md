---
title: One Dark preset
description: Atom's signature dark theme — blue-grey canvas with warm accents. The palette that defined a generation of modern editor themes.
---

# One Dark

One Dark is Atom's signature theme — the palette that defined the "blue-grey canvas + warm accents" aesthetic now common across modern editors. Tokyo Night and Catppuccin Mocha both trace lineage here. Atom itself was the first widely-adopted editor with custom theme APIs, and One Dark was the default that shipped with it.

Phase 1 of SPEC-057 ships One Dark as **dark-only**. The official "One Light" sibling is a separate published theme (not a `modes` overlay on the same hue family) and defers to a future milestone. MIT licensed.

This page is rendered on a site whose active preset is **niwaki**. The One Dark look you see in the palette and the live preview below is scoped to those subtrees via `tint="one-dark"` — the surrounding prose stays in niwaki.

## Opt in

```jsonc
{
  "site": {
    "theme": {
      "package": "@refrakt-md/lumina",
      "presets": ["@refrakt-md/lumina/presets/one-dark"],
      "colorScheme": "dark"
    }
  }
}
```

The `colorScheme: "dark"` forces One Dark on every page — One Dark has no light variant, so without this the page would render against Lumina's light base with One Dark only kicking in on dark toggle.

## The palette

Atom organises One Dark's palette into **mono** (grayscale text family) and **hue** (six accent families). The dark canvas (`syntax-bg #282c34`) is the recognisable signature; the warm-on-cool contrast (orange/red accents on blue-grey) is what makes it read as "Atom" decades later.

{% palette title="One Dark" tint="one-dark" tint-mode="dark" showContrast=true showA11y=true %}
- syntax-bg (canvas): #282c34
- mono-1 (text, punctuation): #abb2bf
- mono-2 (muted): #828997
- mono-3 (comment): #5c6370
- syntax-accent (primary): #528bff
- hue-1 (cyan — regex, operator): #56b6c2
- hue-2 (blue — function): #61afef
- hue-3 (purple — keyword): #c678dd
- hue-4 (green — string): #98c379
- hue-5 (red — tag, variable): #e06c75
- hue-6 (orange — number, constant, attribute): #d19a66
- hue-6-2 (yellow — type): #e5c07b
{% /palette %}

## Live preview

The shared TypeScript+JSX snippet rendered through One Dark. Notice the warm-on-cool contrast: **strings** in green, **numbers** in orange, **types** in yellow, all sitting on the cool blue-grey canvas.

{% codegroup tint="one-dark" %}
```ts
// A small user-service shape — exercises the SPEC-056 role splits
interface User {
  id: number;
  name: string;
  preferences: Record<string, unknown>;
}

async function findUser(id: number): Promise<User | null> {
  const re = /^\d+$/;
  if (!re.test(String(id))) return null;
  const user = await db.users.findOne({ where: { id } });
  return user ?? null;
}

const widget = <Button onClick={() => findUser(42)} variant="primary">Find</Button>;
```
{% /codegroup %}

One Dark exercises **4 of 7** SPEC-056 extended roles distinctly: `type` (Yellow) ≠ `function` (Blue), `regex` (Cyan) ≠ `string` (Green), `operator` (Cyan), `tag` (Red) ≠ `keyword` (Purple). `number` collapses with `constant`, `attribute` with `constant` (both orange) — Atom's intent.

## Composing with tideline

`presets: ["tideline", "one-dark"]` gives tideline's IBM Plex typography (and light chrome) with One Dark's dark-mode overrides:

```jsonc
{
  "theme": {
    "package": "@refrakt-md/lumina",
    "presets": [
      "@refrakt-md/lumina/presets/tideline",
      "@refrakt-md/lumina/presets/one-dark"
    ]
  }
}
```

Tideline's typography survives in both modes; tideline's light chrome stays unaffected since One Dark has no light values.

## Attribution

One Dark is the work of the [Atom](https://github.com/atom/atom) team at GitHub, released under the MIT licence. The refrakt preset module at `@refrakt-md/lumina/presets/one-dark` is derived from the [one-dark-syntax package](https://github.com/atom/atom/tree/master/packages/one-dark-syntax) — specifically the variables in `styles/colors.less`. Atom is no longer actively developed, but One Dark lives on in its influence on every modern theme that uses blue-grey-canvas + warm-accent.
