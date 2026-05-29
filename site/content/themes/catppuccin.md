---
title: Catppuccin preset
description: Soft pastel palette family — Latte (light) + Mocha (dark). Modern, well-documented, integrated chrome + canvas + syntax.
---

# Catppuccin

Catppuccin is one of the most actively maintained palette projects in the modern editor era — a soft-pastel family with four flavours (Latte, Frappé, Macchiato, Mocha) and an unusually thorough published specification. Every hue has a name, a documented purpose, and a syntax-highlighting role.

Phase 1 of the SPEC-057 lineup ships the canonical pair: **Latte** as the light mode, **Mocha** as the dark mode. The mid-darks (Frappé and Macchiato) defer to a future milestone — the canonical pair is enough to demonstrate Catppuccin's identity, and the mechanism doesn't preclude shipping the siblings later as separate presets if there's demand. MIT licensed.

This page is rendered on a site whose active preset is **niwaki**. The Catppuccin look you see in the palettes and the live preview below is scoped to those subtrees via `tint="catppuccin"` — the surrounding prose stays in niwaki.

## Opt in

```jsonc
{
  "site": {
    "theme": {
      "package": "@refrakt-md/lumina",
      "presets": ["@refrakt-md/lumina/presets/catppuccin"]
    }
  }
}
```

System preference or user toggle picks between Latte (light) and Mocha (dark). Both ship together.

## The palette

Catppuccin's syntax style guide is the most thorough of the lineup imports. Mauve carries declarations, Blue carries functions, Yellow carries types, Peach carries numbers, Pink carries regex, and Sky carries operators — each role gets a dedicated hue. Maroon is reserved for **function parameters**, which Catppuccin is one of the few palettes to call out as a distinct role.

{% palette title="Catppuccin — Latte (light)" tint="catppuccin" tint-mode="light" showContrast=true showA11y=true %}
- Base (canvas): #eff1f5
- Mantle (surface): #e6e9ef
- Text (variable): #4c4f69
- Overlay0 (comment): #9ca0b0
- Mauve (keyword, tag): #8839ef
- Blue (function, attribute, primary): #1e66f5
- Yellow (type): #df8e1d
- Green (string): #40a02b
- Peach (constant, number): #fe640b
- Pink (regex, string-expression): #ea76cb
- Sky (operator): #04a5e5
- Maroon (parameter): #e64553
- Lavender (primary-hover): #7287fd
{% /palette %}

{% palette title="Catppuccin — Mocha (dark)" tint="catppuccin" tint-mode="dark" showContrast=true showA11y=true %}
- Base (canvas): #1e1e2e
- Mantle (surface): #181825
- Text (variable): #cdd6f4
- Overlay0 (comment): #6c7086
- Mauve (keyword, tag): #cba6f7
- Blue (function, attribute, primary): #89b4fa
- Yellow (type): #f9e2af
- Green (string): #a6e3a1
- Peach (constant, number): #fab387
- Pink (regex, string-expression): #f5c2e7
- Sky (operator): #89dceb
- Maroon (parameter): #eba0ac
- Lavender (primary-hover): #b4befe
{% /palette %}

## Live preview

The shared TypeScript+JSX snippet rendered through Catppuccin. Watch for the **Maroon parameters** — Catppuccin is one of the few palettes to give function parameters a dedicated hue, so `id`, `name`, and the destructured `{ id }` argument all read distinctly from their surrounding context.

{% codegroup tint="catppuccin" %}
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

Catppuccin exercises **six of the seven** {% ref "SPEC-056" preview="drawer" /%} extended optional roles distinctly: `type` (Yellow), `parameter` (Maroon), `number` (Peach), `regex` (Pink), `operator` (Sky), `string-expression` (Pink). `attribute` and `tag` collapse with `type` and `keyword` respectively — Catppuccin's intent, not the contract's limitation.

## Composing with tideline

`presets: ["tideline", "catppuccin"]` gives tideline's IBM Plex typography with Catppuccin's Latte+Mocha chrome and syntax:

```jsonc
{
  "theme": {
    "package": "@refrakt-md/lumina",
    "presets": [
      "@refrakt-md/lumina/presets/tideline",
      "@refrakt-md/lumina/presets/catppuccin"
    ]
  }
}
```

Tideline's Plex Sans + Plex Mono survives the composition; Catppuccin's chrome and syntax take over in both modes.

## Other flavours

Phase 1 ships only the Latte + Mocha canonical pair. Frappé and Macchiato — Catppuccin's mid-dark flavours, sometimes preferred over Mocha for less screen contrast — are deferred to a future milestone. If you'd like them shipped as separate presets (`catppuccin-frappe`, `catppuccin-macchiato`), [open an issue](https://github.com/refrakt-md/refrakt/issues/new).

## Attribution

Catppuccin is the work of [the Catppuccin organisation](https://github.com/catppuccin) — a community palette project led by Pocco81 and contributors. Released under the MIT licence. The refrakt preset module at `@refrakt-md/lumina/presets/catppuccin` is derived from the [official palette specification](https://catppuccin.com/palette/) and the [Catppuccin style guide for syntax highlighting](https://github.com/catppuccin/catppuccin#-style-guide). See [catppuccin.com](https://catppuccin.com/) for the canonical spec, the family of port integrations across editors and tools, and the design philosophy.
