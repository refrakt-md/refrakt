---
title: Extending Core Runes
description: How to add attributes to existing core runes from a community package
---

# Extending Core Runes

Community packages can extend core runes by adding new attributes to their schemas. This lets domain-specific packages enrich standard runes without forking them.

## RuneExtension

The `extends` field on a `RunePackage` maps core rune names to extension definitions:

```typescript
import type { RunePackage } from '@refrakt-md/types';

export const myPackage: RunePackage = {
  name: 'dnd-5e',
  version: '1.0.0',
  runes: { /* ... */ },
  extends: {
    'character': {
      schema: {
        'class': {
          type: 'string',
          matches: ['fighter', 'wizard', 'rogue', 'cleric'],
        },
        'level': {
          type: 'number',
        },
        'alignment': {
          type: 'string',
        },
      },
    },
  },
};
```

With this extension installed, the `{% character %}` rune accepts three additional attributes:

```markdoc
{% character class="wizard" level=12 alignment="neutral-good" %}
## Gandalf

A wandering wizard of great power.
{% /character %}
```

## What Extensions Can Do

`RuneExtension.schema` adds attributes that are accepted by the tag parser without causing validation errors. The extended attributes:

- Are accessible in AI prompts (if a `prompt` field accompanies the schema)
- Are available for tooling and autocompletion in the editor
- Are passed through to the identity transform as data attributes (`data-class`, `data-level`, etc.) if the theme config reads them

Extensions do **not** alter the rune's Markdoc transform logic. If you need to change how the rune processes its children or what it outputs, you need to define a new rune (see [Building a Custom Package](authoring)) or override the core rune using `runes.prefer`.

## CSS Coverage

If you add a new attribute that produces a new BEM modifier or data attribute, you'll need CSS to style it. The core rune's theme config will pass through the attribute as a data attribute on the root element, which you can target with a `[data-class]` selector:

```css
.rf-character[data-class="wizard"] .rf-character__portrait {
  border-color: var(--rf-color-arcane);
}
```

Check coverage with the inspect tool after installing your extension:

```bash
refrakt inspect character --class=wizard --audit
```

## Limitations

Extensions are additive only — you cannot:
- Remove or modify existing attributes
- Change the rune's transform logic or renderable structure
- Override the BEM block name or structural injection

For deeper modifications, define a new rune that shadows the core one using `runes.prefer: { "character": "my-package" }`.
