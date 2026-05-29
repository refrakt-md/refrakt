---
title: Dracula preset
description: The iconic dark theme — purple, pink, cyan, and green on near-black. Integrated chrome + canvas + syntax.
---

# Dracula

Dracula is the most-installed dark editor theme on the planet, distinguished by its purple/pink/cyan accents on a near-black canvas. Created by Zeno Rocha and shipped across hundreds of editor and tooling integrations. MIT licensed.

This preset is **dark-only** — Dracula has no official light variant, so applying it on a light-mode page won't change the chrome. When opted in as the active site preset, Dracula effectively forces dark rendering. When used as a scoped tint (`{% tint preset="dracula" %}`), the dark values apply only to subtrees rendered against a dark surrounding scheme or to palettes locked via `tint-mode="dark"`.

This page is rendered on a site whose active preset is **niwaki**. The Dracula look you see in the palette swatches and the live preview below is scoped to those subtrees via `tint="dracula"` — the surrounding prose stays in niwaki.

## Opt in

```jsonc
{
  "site": {
    "theme": {
      "package": "@refrakt-md/lumina",
      "presets": ["@refrakt-md/lumina/presets/dracula"],
      "colorScheme": "dark"
    }
  }
}
```

The `colorScheme: "dark"` forces Dracula's dark canvas on every page; without it the page would render against Lumina's base (light) chrome with Dracula values only kicking in when the user toggles to dark.

## The palette

Dracula publishes a formal [palette spec](https://spec.draculatheme.com/) with named hues. Each accent has a documented syntax role; the contract surface {% ref "SPEC-056" preview="drawer" /%} carries lands all of them on distinct refrakt roles — most notably `type` (Cyan) separated from `function` (Green), the splits Nord first validated.

{% palette title="Dracula" tint="dracula" tint-mode="dark" showContrast=true showA11y=true %}
- Background (canvas): #282a36
- Current Line (surface): #44475a
- Foreground (text, variable): #f8f8f2
- Comment (muted): #6272a4
- Cyan (type): #8be9fd
- Green (function, attribute): #50fa7b
- Orange (constant alt): #ffb86c
- Pink (keyword, tag, operator): #ff79c6
- Purple (primary, constant, number): #bd93f9
- Red (regex): #ff5555
- Yellow (string): #f1fa8c
{% /palette %}

## Live preview

The shared TypeScript+JSX snippet used across the preset doc pages, rendered through Dracula's full integrated look — chrome canvas, syntax tokens, and code surface all from the same palette.

{% codegroup tint="dracula" %}
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

Notice the role splits Dracula exercises: **types** (`User`) read in Cyan, distinct from **functions** (`findUser`, `db.users.findOne`) in Green; **keywords** (`interface`, `async`, `function`, `return`) in Pink; **strings** (`"id"`) in Yellow; **numbers** (`42`) in Purple alongside constants; **regex** (`/^\d+$/`) in Red, distinct from string Yellow. JSX tags and attributes follow Dracula's "tags-as-keywords, attributes-as-functions" convention.

## Composing with tideline

`presets: ["tideline", "dracula"]` gives tideline's IBM Plex typography and cream-paper light chrome with Dracula's dark-mode canvas and syntax on top:

```jsonc
{
  "theme": {
    "package": "@refrakt-md/lumina",
    "presets": [
      "@refrakt-md/lumina/presets/tideline",
      "@refrakt-md/lumina/presets/dracula"
    ]
  }
}
```

Order matters — Dracula ships after tideline so its dark-mode chrome and syntax overrides win when the user toggles to dark. Tideline's typography stays in both modes; tideline's light chrome is unaffected since Dracula has no light values.

## Attribution

The Dracula palette is the work of [Zeno Rocha](https://zenorocha.com/) and contributors, released under the MIT licence. The refrakt preset module at `@refrakt-md/lumina/presets/dracula` is derived from the [official palette specification](https://spec.draculatheme.com/) and Dracula's published syntax-highlighting reference. See [draculatheme.com](https://draculatheme.com/) for the canonical spec, the family of editor + tooling integrations, and the design philosophy.
