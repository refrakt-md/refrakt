---
title: Solarized preset
description: Ethan Schoonover's iconic 16-hue palette with mode-symmetric accents on flipped canvases. Light and dark from the same family.
---

# Solarized

Solarized is Ethan Schoonover's 2011 palette, distinguished by a deliberate design constraint: **the eight accent hues (yellow, orange, red, magenta, violet, blue, cyan, green) are identical across light and dark modes**, with only the canvas / text family flipping. Light mode uses `base3` (`#fdf6e3`) on `base00`; dark mode uses `base03` (`#002b36`) on `base0`. The accent palette stays the same.

That makes Solarized the lineup's unified-mode test case. Most palettes shift their accent hues between modes — Nord adjusts Frost for darker contrast, Catppuccin retunes Mauve from Latte to Mocha. Solarized is the exception that validates refrakt's preset shape handles the mode-symmetric case as cleanly as the mode-asymmetric one. MIT licensed.

This page is rendered on a site whose active preset is **niwaki**. The Solarized look you see in the palettes and the live preview below is scoped to those subtrees via `tint="solarized"` — the surrounding prose stays in niwaki.

## Opt in

```jsonc
{
  "site": {
    "theme": {
      "package": "@refrakt-md/lumina",
      "presets": ["@refrakt-md/lumina/presets/solarized"]
    }
  }
}
```

Solarized ships both modes so the page renders coherently in either — system preference or user toggle picks which canvas the page renders against, with the accent palette unchanged.

## The palette

The Solarized 16-colour palette: eight base tones (the mode-flipped canvas / text family) plus eight accents (mode-symmetric).

{% palette title="Solarized — light" tint="solarized" tint-mode="light" showContrast=true showA11y=true %}
- base3 (canvas): #fdf6e3
- base2 (surface): #eee8d5
- base1 (muted): #93a1a1
- base0 (dark text): #839496
- base00 (light text): #657b83
- base01 (comments dark): #586e75
- base02 (dark surface): #073642
- base03 (dark canvas): #002b36
- Yellow (type): #b58900
- Orange (number): #cb4b16
- Red (keyword, tag): #dc322f
- Magenta (string-expression): #d33682
- Violet (constant, operator): #6c71c4
- Blue (function, attribute, primary): #268bd2
- Cyan (string): #2aa198
- Green (regex, comment-alt): #859900
{% /palette %}

{% palette title="Solarized — dark" tint="solarized" tint-mode="dark" showContrast=true showA11y=true %}
- base03 (canvas): #002b36
- base02 (surface): #073642
- base01 (muted, comments): #586e75
- base00 (light text): #657b83
- base0 (dark text): #839496
- base1 (light muted): #93a1a1
- Yellow (type): #b58900
- Orange (number): #cb4b16
- Red (keyword, tag): #dc322f
- Magenta (string-expression): #d33682
- Violet (constant, operator): #6c71c4
- Blue (function, attribute, primary): #268bd2
- Cyan (string): #2aa198
- Green (regex): #859900
{% /palette %}

The dark palette is shorter because the accents are identical — only the base tones change between modes. Compare any accent row to its sibling above; the hex value is the same.

## Live preview

The shared TypeScript+JSX snippet rendered through Solarized. The accents look the same in light and dark mode — only the canvas around them changes.

{% codegroup tint="solarized" %}
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

Solarized exercises the SPEC-056 extended roles thoroughly: **types** (`User`) in Yellow, distinct from **functions** (`findUser`) in Blue; **numbers** (`42`) in Orange, distinct from **constants** (which would also use violet) — the split that Nord first proved is meaningful; **regex** (`/^\d+$/`) in Green, distinct from string Cyan; **operators** in Violet, distinct from punctuation; **tags** and **attributes** in Red and Blue respectively.

## Composing with tideline

`presets: ["tideline", "solarized"]` gives tideline's IBM Plex typography with Solarized's coordinated canvases and accent palette:

```jsonc
{
  "theme": {
    "package": "@refrakt-md/lumina",
    "presets": [
      "@refrakt-md/lumina/presets/tideline",
      "@refrakt-md/lumina/presets/solarized"
    ]
  }
}
```

Order matters — Solarized ships after tideline so its chrome wins. Tideline's Plex Sans + Plex Mono survives in both modes.

## Attribution

Solarized is the work of [Ethan Schoonover](https://ethanschoonover.com/), released under the MIT licence. The refrakt preset module at `@refrakt-md/lumina/presets/solarized` is derived from the [official Solarized site](https://ethanschoonover.com/solarized/) and its [usage documentation](https://ethanschoonover.com/solarized/#usage-development). The canonical palette has powered dozens of editor, terminal, and tooling integrations since 2011.
