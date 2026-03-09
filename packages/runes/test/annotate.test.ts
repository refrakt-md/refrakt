import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('annotate tag', () => {
  it('should create an Annotate component', () => {
    const result = parse(`{% annotate %}
This is the main text with an annotation.
{% /annotate %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'Annotate');
    expect(tag).toBeDefined();
    expect(tag!.name).toBe('div');
  });

  it('should pass variant attribute as meta', () => {
    const result = parse(`{% annotate variant="tooltip" %}
Main text content.
{% /annotate %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'Annotate');
    expect(tag).toBeDefined();

    const variantMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.content === 'tooltip');
    expect(variantMeta).toBeDefined();
  });

  it('should default variant to margin', () => {
    const result = parse(`{% annotate %}
Text.
{% /annotate %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'Annotate');
    const variantMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.content === 'margin');
    expect(variantMeta).toBeDefined();
  });
});
