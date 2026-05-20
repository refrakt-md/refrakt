---
title: Nord preset
description: Nord — Arctic, north-bluish colour palette with integrated canvas. Frost, Aurora, Polar Night, Snow Storm.
---

# Nord

Nord is an **integrated** palette preset — unlike [niwaki](/themes/niwaki), which leaves chrome and code surface to whichever theme sits beneath, Nord ships its chrome, code surface, *and* syntax foreground together. The 16 hues were tuned against the Polar Night / Snow Storm canvas families specifically; rendering Nord's foreground on a warm or neutral canvas misrepresents the palette's intent. So Nord claims chrome and canvas as part of the package. Typography, spacing, status sentiments, and radius stay with whatever theme is active — Nord's scope is colour identity, not structural identity.

The palette is structured as four named groups: **Polar Night** (the dark canvas family), **Snow Storm** (light text / light canvas), **Frost** (cool blue accents — types, functions, keywords), and **Aurora** (warm accents — red, orange, yellow, green, purple). Read [the Nord palette spec](https://www.nordtheme.com/docs/colors-and-palettes) for the design philosophy.

## Opt in

```jsonc
{
  "site": {
    "theme": {
      "package": "@refrakt-md/lumina",
      "presets": ["@refrakt-md/lumina/presets/nord"]
    }
  }
}
```

## The palette

The palette swatches below sit on Nord's canonical canvas (Polar Night nord0 in dark mode, Snow Storm nord6 in light mode) so the contrast story is honest — Nord wasn't designed to be read on a warm-cream canvas, and showing it that way would lie about the palette.

This page is rendered on a site whose active preset is **niwaki**, not Nord. The Nord look you see in the swatches and the live code example below is scoped to those subtrees via the `tint="nord"` universal attribute — the surrounding prose stays in niwaki. That's the SPEC-056 scoped-tint projection working end-to-end.

{% palette title="Nord — light" tint="nord" tint-mode="light" showContrast=true showA11y=true %}
- Polar Night nord0 / Text (variable): #2e3440
- Polar Night nord3 / Comment: #4c566a
- Snow Storm nord6 / Canvas (code-bg): #eceff4
- Frost nord7 / Mint (type, attribute): #8fbcbb
- Frost nord8 / Cyan (function): #88c0d0
- Frost nord9 / Deep blue (operator): #81a1c1
- Frost nord10 / Deep navy (keyword, tag): #5e81ac
- Aurora nord12 / Orange (number): #d08770
- Aurora nord13 / Yellow (regex): #ebcb8b
- Aurora nord14 / Green (string): #a3be8c
- Aurora nord15 / Purple (constant): #b48ead
{% /palette %}

{% palette title="Nord — dark" tint="nord" tint-mode="dark" showContrast=true showA11y=true %}
- Polar Night nord0 / Canvas (code-bg): #2e3440
- Snow Storm nord4 / Text (variable, punctuation): #d8dee9
- Snow Storm 'nord3.5' / Comment: #616e88
- Frost nord7 / Mint (type, attribute): #8fbcbb
- Frost nord8 / Cyan (function): #88c0d0
- Frost nord9 / Deep blue (keyword, tag, operator): #81a1c1
- Aurora nord13 / Yellow (regex): #ebcb8b
- Aurora nord14 / Green (string): #a3be8c
- Aurora nord15 / Purple (constant, number): #b48ead
{% /palette %}

## Live preview

Here's a TypeScript snippet rendered through Nord's full integrated look — chrome, syntax colours, and code-surface canvas. The `codegroup` below sets `tint="nord"`, so its subtree inherits Nord's chrome, syntax tokens, and code background while the rest of the page stays in niwaki.

{% codegroup tint="nord" %}
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

Notice the role splits Nord makes that earlier 9-role syntax presets couldn't carry: **types** (`User`) read in Frost mint, distinct from **functions** (`findUser`, `db.users.findOne`) in Frost cyan; **JSX tags** (`Button`) take a different Frost hue than **keywords**; **JSX attributes** (`onClick`, `variant`) get their own Frost shade; **numbers** (`42`) sit in Aurora orange; **regex** (`/^\d+$/`) reads in Aurora yellow. These are SPEC-056's optional extended roles doing real work.

## Composing with tideline

Nord composes cleanly with chrome presets like `tideline`. Use both for tideline's typography + body chrome with Nord's syntax + code-surface:

```jsonc
{
  "theme": {
    "package": "@refrakt-md/lumina",
    "presets": [
      "@refrakt-md/lumina/presets/tideline",
      "@refrakt-md/lumina/presets/nord"
    ]
  }
}
```

Order matters — Nord ships after tideline so Nord's code surface and syntax tokens win. Tideline's body bg, surfaces, primary, fonts, and status colours stay in place; only the code blocks flip to Nord's canvas.

## Attribution

The Nord palette is the work of [Arctic Ice Studio](https://arcticicestudio.com/) and Sven Greb, released under the MIT licence. The refrakt preset module at `@refrakt-md/lumina/presets/nord` is derived from their published palette and syntax-highlighting reference. See the [Nord website](https://www.nordtheme.com/) for the canonical spec, tooling for other editors, and the design philosophy.
