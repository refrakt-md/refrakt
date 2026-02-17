import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

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

    const featureTag = findTag(result as any, t => t.attributes.typeof === 'Feature');
    expect(featureTag).toBeDefined();
    expect(featureTag!.name).toBe('section');

    const definitions = findAllTags(featureTag!, t => t.attributes.typeof === 'FeatureDefinition');
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

    const featureTag = findTag(result as any, t => t.attributes.typeof === 'Feature');
    expect(featureTag).toBeDefined();

    const definitions = findAllTags(featureTag!, t => t.attributes.typeof === 'FeatureDefinition');
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
});
