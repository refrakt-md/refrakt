---
title: Patterns & Best Practices
description: Canonical patterns for writing consistent, maintainable runes
---

# Patterns & Best Practices

This page documents the canonical patterns used across the rune library. Follow these when writing new runes or reviewing existing ones.

## Heading-based splitting

Many runes use headings as structural boundaries — each heading starts a new step, tab, accordion item, etc. Heading level is determined automatically, not by the content author.

### Auto-detect

Runes that split on headings auto-detect the level from the first heading in the content. Use `headingsToList()` with no arguments:

```typescript
processChildren(nodes: Node[]) {
  return headingsToList()(nodes);
}
```

This works because content authors typically use a consistent heading level within a rune. It also handles AI-generated content seamlessly.

### Fixed level

Some runes hardcode a specific heading level as part of their design contract — for example, Bento always splits at h2, and Symbol uses h3 for groups and h4 for members:

```typescript
const converted = headingsToList({ level: 2 })(nodes);
```

---

## Header + body group split

The standard pattern for runes with a title area:

```typescript
@group({ include: ['heading', 'paragraph'] })
header: NodeStream;

@group({ include: ['list', 'tag'] })
body: NodeStream;
```

Use `pageSectionProperties(header)` for consistent extraction of eyebrow, headline, image, and blurb:

```typescript
transform() {
  const header = this.header.transform();

  return createComponentRenderable(schema.MyRune, {
    tag: 'section',
    property: 'contentSection',
    properties: {
      ...pageSectionProperties(header),
      // adds: eyebrow, headline, image, blurb
    },
    children: [...],
  });
}
```

This pattern gives you:
- **Eyebrow** — the first heading when there are 2+ headings (small label above the main heading)
- **Headline** — the main heading
- **Image** — first image in the header area
- **Blurb** — first paragraph

---

## Child item runes

When a rune has repeating items (Steps, Accordion, Tabs), create a separate Model class for the child:

```typescript
// Parent
class AccordionModel extends Model {
  processChildren(nodes) {
    return super.processChildren(this.convertHeadings(nodes));
  }
  // ...
}

// Child — separate Model class
class AccordionItemModel extends Model {
  @attribute({ type: String, required: true })
  name: string;

  transform() {
    return createComponentRenderable(schema.AccordionItem, {
      tag: 'details',
      // ...
    });
  }
}

export const accordion = createSchema(AccordionModel);
export const accordionItem = createSchema(AccordionItemModel);
```

Don't inline item logic in the parent's `transform()`. Separate item models:
- Get their own `typeof` marker for engine config
- Can have their own attributes and groups
- Are reusable as explicit child tags: `{% accordion-item name="..." %}`
- Can be registered independently in the schema registry

---

## Choosing the interactivity path

| Path | When to use | Examples |
|------|-------------|---------|
| **Identity transform + CSS** | Layout, styling, structural decoration | Grid, Hint, Recipe, Feature, Hero |
| **Behaviors library** | Progressive enhancement of native HTML | Accordion, Tabs, DataTable, Form, Reveal |
| **postTransform hooks** | Data rendering, custom elements | Chart, Map, Diagram, Comparison, Sandbox |

**Default to CSS.** About 75% of runes need nothing beyond the identity transform and CSS. If you can achieve the interaction with `:target`, `:checked`, sibling selectors, or scroll-driven effects, you don't need JavaScript.

**Use behaviors** for progressive enhancement. The behaviors library adds ARIA attributes, keyboard navigation, and event listeners to existing HTML. The rune still works without JavaScript — it just gets enhanced.

**Use postTransform hooks** when you need to generate complex HTML structure from metadata, produce custom element tags for client-side initialization, or integrate with external libraries. These hooks run during the identity transform and keep rendering framework-agnostic.

---

## Modifier naming

Use **camelCase** for modifier names in code. The engine auto-converts to kebab-case for data attributes:

```typescript
// In the rune:
properties: { hintType }

// Engine outputs:
// class="rf-hint--warning"
// data-hint-type="warning"
```

Use **semantic names** that describe the variant's purpose, not its visual treatment:

```typescript
// Good
difficulty: 'medium'
hintType: 'warning'
align: 'center'

// Bad
color: 'yellow'
style: 'bordered'
size: 'large'
```

---

## Don't hardcode structure in transform

Rune schemas should produce **semantic output** — meta tags with values and content in named containers. The **engine config** should inject visual structure.

{% diff language="typescript" mode="split" %}

```typescript
// Hardcoding visual structure in the rune
transform() {
  const icon = new Tag('span', { class: 'icon' });
  const title = new Tag('span', {}, [this.type]);
  const header = new Tag('div', {}, [icon, title]);
  return new Tag('section', {}, [header, body]);
}
```

```typescript
// Semantic output, visual structure in engine config
transform() {
  const hintType = new Tag('meta', { content: this.type });
  return createComponentRenderable(schema.Hint, {
    tag: 'section',
    properties: { hintType },
    refs: { body: children.tag('div') },
    children: [hintType, children.next()],
  });
}
```

{% /diff %}

The engine config then handles the visual structure declaratively:

```typescript
structure: {
  header: { tag: 'div', before: true, children: [
    { tag: 'span', ref: 'icon', icon: { group: 'hint', variant: 'hintType' } },
    { tag: 'span', ref: 'title', metaText: 'hintType' },
  ]},
}
```

This separation means:
- Rune output is framework-agnostic (works with any renderer)
- Themes can override structure without forking the rune
- Icons, badges, and meta displays are configurable per-theme

---

## Group ordering

Groups consume nodes **in declaration order**. Each group takes matching nodes from where the previous group stopped.

```typescript
// These groups are evaluated top to bottom:
@group({ include: ['heading', 'paragraph'] })
header: NodeStream;          // takes headings + paragraphs first

@group({ include: ['list'] })
ingredients: NodeStream;     // then takes lists

@group({ include: ['tag'] })
body: NodeStream;            // finally takes remaining tags
```

Design group `include` filters to be **mutually exclusive** when possible. If two groups can match the same node type, the first one wins.

Use **section-based grouping** (HR delimiter) when content has explicit visual breaks:

```typescript
@group({ section: 0 })       // before first ---
main: NodeStream;

@group({ section: 1 })       // after first ---
showcase: NodeStream;
```

---

## Content boundaries

A rune's content model should include exactly what it **reinterprets** — content that gains new semantic meaning by being inside the rune. Content that would render identically whether inside or outside the rune belongs on the page, not in the rune.

### Three tests

1. **Does the rune give this content new meaning?** A list inside `{% recipe %}` becomes ingredients — with `data-name="ingredient"`, schema.org markup, and dedicated styling. That's reinterpretation. A paragraph that's just a paragraph is pass-through.
2. **Does it map to a structured data field?** If schema.org/Recipe has no `story` field, a narrative paragraph doesn't belong inside the recipe rune.
3. **Is the rune still portable without it?** A recipe card should work on an index page, a blog post, or a sidebar. Narrative content couples it to a single page context.

### What goes where

| Rune | Inside (reinterpreted) | Outside (page content) |
|------|----------------------|----------------------|
| Recipe | Ingredients, steps, tips, metadata, headline, blurb, media | Story, editorial, famous quotes |
| Playlist | Tracks, cover art, name, description | Album review, discovery story |
| Character | Stats, abilities, portrait, name | Chapter featuring the character |
| Event | Date, venue, schedule, location | Blog post about why to attend |

### Page composition

A recipe blog post demonstrates the pattern — the rune is a **semantic island** within surrounding page content:

```markdown
# My Summer in Tuscany

That long story about grandma's kitchen
goes here, as regular page content...

{% recipe prepTime="PT15M" cookTime="PT30M" servings=4 difficulty="easy" %}
# Classic Pasta Carbonara

A rich and creamy Italian pasta dish.

- 400g spaghetti
- 200g pancetta
- 4 egg yolks

1. Cook pasta in salted boiling water
2. Fry pancetta until crispy
3. Whisk egg yolks with grated cheese

> Never add eggs directly to a hot pan.
{% /recipe %}

More thoughts on the trip, or a second
recipe rune, or any other page content.
```

Everything inside the `{% recipe %}` tags is reinterpreted: the heading becomes the recipe name, the list becomes ingredients, the ordered list becomes steps, the blockquote becomes a chef's tip. Everything outside is regular Markdown rendered as-is.

---

## Testing

Every rune should have a test file at `packages/runes/test/{name}.test.ts`.

### Test helpers

```typescript
import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';
```

- `parse(markdown)` — runs the full Markdoc parse + transform pipeline
- `findTag(node, predicate)` — finds the first matching Tag in a tree
- `findAllTags(node, predicate)` — finds all matching Tags

### What to test

**Basic output structure:**

```typescript
it('should produce the expected structure', () => {
  const result = parse(`{% hint type="warning" %}
Be careful.
{% /hint %}`);

  const hint = findTag(result as any, t => t.attributes.typeof === 'Hint');
  expect(hint).toBeDefined();
  expect(hint!.name).toBe('section');
});
```

**Auto-detection behavior** (headings are automatically detected):

```typescript
it('should auto-detect h2 heading level', () => {
  const result = parse(`{% steps %}
## Step One
Content.

## Step Two
Content.
{% /steps %}`);

  const steps = findTag(result as any, t => t.attributes.typeof === 'Steps');
  const items = findAllTags(steps!, t => t.attributes.typeof === 'Step');
  expect(items.length).toBe(2);
});
```

**Child tags still work** (for runes that support both heading syntax and explicit child tags):

```typescript
it('should support explicit child tags', () => {
  const result = parse(`{% accordion %}
{% accordion-item name="Item One" %}
Content.
{% /accordion-item %}
{% /accordion %}`);

  const items = findAllTags(acc!, t => t.attributes.typeof === 'AccordionItem');
  expect(items.length).toBe(1);
});
```

### Run tests

```bash
# All tests
npm test

# Single file
npx vitest run packages/runes/test/mystep.test.ts

# Watch mode
npm run test:watch
```
