---
title: Niwaki preset
description: Japanese-garden syntax palette — wakaba, sakura, matsu, momiji, ishi. Composes with any chrome.
---

# Niwaki

Niwaki is a **syntax-only** preset — it overrides only the syntax tokens, leaving chrome, fonts, and status colours to inherit from whatever theme sits beneath. The refrakt documentation site you're reading uses this preset on top of the [neutral default](/themes/neutral-default). Code blocks render in Japanese-garden colours; everything else stays neutral.

The name *niwaki* (庭木) refers to the cloud-pruned trees of Japanese gardens — most often pines. The art of niwaki is patient, multi-decade shaping: pruning what's there to reveal structural form. That maps remarkably well to what a syntax preset does — it doesn't generate code, it shapes how code's existing structure becomes legible. The colour names — wakaba (young leaf), sakura (cherry blossom), matsu (pine), momiji (autumn maple), ishi (stone) — are an homage to the tradition we drew the metaphor from.

## Opt in

```jsonc
{
  "site": {
    "theme": {
      "package": "@refrakt-md/lumina",
      "presets": ["@refrakt-md/lumina/presets/niwaki"]
    }
  }
}
```

## The palette

Five elements from a Japanese garden mapped to syntax roles. Each colour does specific cognitive work — wakaba freshens declarations (keywords), sakura calls attention (functions), matsu roots the references (links and constants), momiji warms the literals (strings and template expressions), ishi recedes (comments and punctuation).

{% palette title="Niwaki — light" tint="niwaki" tint-mode="light" showContrast=true showA11y=true %}
- Wakaba / Young leaf (keyword): #5e7d2a
- Sakura / Cherry (function): #b54a6b
- Matsu / Pine (link, constant): #3d6b3d
- Momiji / Maple (string): #a8521c
- Momiji punchy (string-expression): #c54a14
- Ishi / Stone (comment, punctuation): #8a857d
{% /palette %}

{% palette title="Niwaki — dark" tint="niwaki" tint-mode="dark" showContrast=true showA11y=true %}
- Wakaba (keyword): #b3d475
- Sakura (function): #f591a6
- Matsu (link, constant): #8ab589
- Momiji (string): #eba073
- Momiji punchy (string-expression): #fa9a61
- Ishi (comment, punctuation): #7d7062
{% /palette %}

## Live preview

Here's the same TypeScript+JSX snippet used across the preset doc pages, rendered through niwaki. Niwaki is foreground-only — chrome, fonts, and code-surface canvas all inherit from whatever theme sits beneath. On this page that's the refrakt site's active niwaki preset, so the snippet looks exactly like every other code block on the site (which is the point: niwaki *is* the site's syntax).

{% codegroup tint="niwaki" %}
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

Niwaki, like tideline, was authored at the 9-role tier and doesn't set SPEC-056's extended roles. `type`, `attribute`, and other identifier-family scopes paint like function (sakura); `tag` paints like keyword (wakaba); `number` and `regex` fall through to constant and string respectively. Compare with [Nord](/themes/nord), which splits them out into the Frost and Aurora families.

## Composing with tideline

Niwaki composes cleanly with any chrome theme. Use both presets together for tideline chrome with niwaki code:

```jsonc
{
  "theme": {
    "package": "@refrakt-md/lumina",
    "presets": [
      "@refrakt-md/lumina/presets/tideline",
      "@refrakt-md/lumina/presets/niwaki"
    ]
  }
}
```

Order matters — niwaki ships after tideline so its syntax overrides win. Since niwaki only touches the syntax namespace, every other token (body bg, surface, typography, status) cascades from tideline.

## Authoring a custom tint that pairs with niwaki

Niwaki demonstrates that *scoped* presets — overrides limited to one part of the token contract — are first-class in refrakt. The same pattern works for site-level tints. Define a brand tint inline in `refrakt.config.json`:

```jsonc
{
  "site": {
    "theme": {
      "package": "@refrakt-md/lumina",
      "presets": ["@refrakt-md/lumina/presets/niwaki"]
    },
    "tints": {
      "garden-hero": {
        "extends": "warm",
        "light": {
          "bg": "#f5efe6",
          "primary": "#3d6b3d"
        },
        "dark": {
          "bg": "#1a221a",
          "primary": "#8ab589"
        }
      }
    }
  }
}
```

Now any page section can opt in with `{% callout tint="garden-hero" %}…{% /callout %}`. The tint extends Lumina's `warm` preset and overrides only `bg` and `primary` per scheme. See [Tint](/runes/tint) for the full tint authoring surface.

## Why scoped?

The neutral default's chrome is already calm, deliberate, and pleasant to read against. A "full Japanese garden" preset would override good chrome with merely-different chrome, dilute the focus, and lock users into an all-or-nothing choice. Scoping niwaki to syntax keeps the strongest part of the metaphor (the colours on code) and lets users compose freely — niwaki on neutral, niwaki on tideline, niwaki on a future custom theme. The preset earns its name through what it commits to most clearly: the code surface.
