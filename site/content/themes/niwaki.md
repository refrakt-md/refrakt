---
title: Niwaki preset
description: Japanese-garden syntax palette — wakaba, sakura, matsu, momiji, ishi. Composes with any chrome.
---

# Niwaki

Niwaki is refrakt's own **syntax-only** preset: it sets the syntax colors and nothing else, so chrome, fonts and the code canvas come from whatever sits beneath — which is why it composes with any other preset. It is named for the cloud-pruned trees of Japanese gardens, and its five colors are garden elements: wakaba (young leaf) for keywords, sakura (cherry) for functions, matsu (pine) for links and constants, momiji (maple) for strings, ishi (stone) for comments. It sets only the nine base syntax roles, so types paint like functions and tags like keywords. This documentation site uses it.

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

## Palette

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

## Preview

{% codegroup tint="niwaki" %}
```ts
// A small user-service shape
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

## Attribution

Original to refrakt; ships in `@refrakt-md/lumina` under the MIT license.
