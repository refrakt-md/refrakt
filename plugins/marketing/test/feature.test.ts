import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags, fields } from './helpers.js';

describe('feature tag', () => {
  it('should transform a feature section with heading-based definitions', () => {
    const result = parse(`{% feature %}
## Our Features

- ### Fast
  Lightning-fast performance out of the box.

- ### Secure
  Enterprise-grade security built in.

- ### Scalable
  Grows with your needs.
{% /feature %}`);

    expect(result).toBeDefined();

    const featureTag = findTag(result as any, t => t.attributes['data-rune'] === 'feature');
    expect(featureTag).toBeDefined();
    expect(featureTag!.name).toBe('section');

    const definitions = findAllTags(featureTag!, t => t.attributes['data-name'] === 'feature-item');
    expect(definitions.length).toBe(3);
  });

  it('should transform bold-text definitions with term in dt and description in dd', () => {
    const result = parse(`{% feature %}
## What you get

- **Semantic runes**

  Markdown primitives take on different meaning.

- **Type-safe output**

  Every rune produces typed, validated content.
{% /feature %}`);

    const featureTag = findTag(result as any, t => t.attributes['data-rune'] === 'feature');
    expect(featureTag).toBeDefined();

    const definitions = findAllTags(featureTag!, t => t.attributes['data-name'] === 'feature-item');
    expect(definitions.length).toBe(2);

    // Check that the term is in a dt element
    const firstDef = definitions[0];
    const dt = findTag(firstDef, t => t.name === 'dt');
    expect(dt).toBeDefined();

    // Check that the name is wrapped in a span
    const nameSpan = findTag(dt!, t => t.name === 'span');
    expect(nameSpan).toBeDefined();
    expect(nameSpan!.children).toContain('Semantic runes');

    // Check that the description is in a dd element
    const dd = findTag(firstDef, t => t.name === 'dd');
    expect(dd).toBeDefined();
  });

  it('should unwrap a paragraph-wrapped image in the media zone', () => {
    const result = parse(`{% feature %}
![alt](/shot.png)

---

# Title

Body text.
{% /feature %}`);

    const media = findTag(result as any, t => t.attributes['data-name'] === 'media');
    expect(media).toBeDefined();
    expect(media!.children.some((c: any) => c?.name === 'p')).toBe(false);
    expect(findTag(media!, t => t.name === 'img')).toBeDefined();
  });

  // SPEC-099 — the `layout` item-arrangement axis. The schema transform records a
  // single resolved `layout` field; the engine maps it to `data-layout`.
  describe('layout axis (SPEC-099)', () => {
    const layoutValue = (src: string): string | undefined => {
      const result = parse(src);
      const feature = findTag(result as any, t => t.attributes['data-rune'] === 'feature');
      return fields(feature!).layout;
    };

    it('defaults to grid for stacked media (the default media-position)', () => {
      expect(layoutValue(`{% feature %}\n## H\n\n- **A**\n\n  a\n{% /feature %}`)).toBe('grid');
    });

    it('derives list from beside media when layout is unset', () => {
      expect(layoutValue(`{% feature media-position="start" %}\n## H\n\n- **A**\n\n  a\n{% /feature %}`)).toBe('list');
    });

    it('lets an explicit layout override the media-derived default', () => {
      // beside media would derive `list`; explicit grid wins (axes independent)
      expect(layoutValue(`{% feature media-position="start" layout="grid" %}\n## H\n\n- **A**\n\n  a\n{% /feature %}`)).toBe('grid');
      // stacked media would derive `grid`; explicit list wins
      expect(layoutValue(`{% feature media-position="bottom" layout="list" %}\n## H\n\n- **A**\n\n  a\n{% /feature %}`)).toBe('list');
    });

    it('always records a layout value (no suppression)', () => {
      expect(layoutValue(`{% feature %}\n## H\n\n- **A**\n\n  a\n{% /feature %}`)).toBeDefined();
    });
  });

  // SPEC-100 — feature adopts the carousel layout mode + the collapse-to dial.
  describe('carousel adoption (SPEC-100)', () => {
    const featureOf = (src: string) => {
      const result = parse(src);
      return findTag(result as any, t => t.attributes['data-rune'] === 'feature')!;
    };

    it('accepts layout="carousel"', () => {
      expect(fields(featureOf(`{% feature layout="carousel" %}\n## H\n\n- **A**\n\n  a\n{% /feature %}`)).layout).toBe('carousel');
    });

    it('renders feature items as slides inside the dl track', () => {
      // The dl is labelled `data-name="items"` (the carousel track) by the engine
      // autoLabel — asserted at the engine/contract level; here we confirm the
      // slides (feature items) are the dl's children.
      const feature = featureOf(`{% feature %}\n## H\n\n- **A**\n\n  a\n\n- **B**\n\n  b\n{% /feature %}`);
      const dl = findTag(feature, t => t.name === 'dl');
      expect(dl).toBeDefined();
      const items = findAllTags(dl!, t => t.attributes['data-name'] === 'feature-item');
      expect(items.length).toBe(2);
    });

    it('records collapse-to only when non-default', () => {
      expect(fields(featureOf(`{% feature collapse-to="carousel" %}\n## H\n\n- **A**\n\n  a\n{% /feature %}`))['collapse-to']).toBe('carousel');
      expect(fields(featureOf(`{% feature %}\n## H\n\n- **A**\n\n  a\n{% /feature %}`))['collapse-to']).toBeUndefined();
    });
  });
});
