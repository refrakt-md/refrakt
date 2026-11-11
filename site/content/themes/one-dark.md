---
title: One Dark preset
description: Atom's signature dark theme — blue-grey canvas with warm accents. The palette that defined a generation of modern editor themes.
---

# One Dark

One Dark is Atom's signature theme — the blue-grey canvas with warm accents that much of the modern editor scene descends from. It splits `type` (Yellow) from `function` (Blue), `regex` (Cyan) from `string` (Green) and `tag` (Red) from `keyword` (Purple). **Dark-only** — the One Light sibling is a separate theme and is not included, so pair it with `colorScheme: "dark"`.

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

## Palette

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

## Preview

{% codegroup tint="one-dark" %}
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

One Dark is the work of the [Atom](https://github.com/atom/atom) team at GitHub, MIT licensed. The preset is derived from the [one-dark-syntax package](https://github.com/atom/atom/tree/master/packages/one-dark-syntax) (`styles/colors.less`).
