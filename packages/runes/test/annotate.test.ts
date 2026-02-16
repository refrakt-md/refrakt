import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('annotate tag', () => {
  it('should create an Annotate component', () => {
    const result = parse(`{% annotate %}
This is the main text with an annotation.
{% /annotate %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Annotate');
    expect(tag).toBeDefined();
    expect(tag!.name).toBe('div');
  });

  it('should pass style attribute as meta', () => {
    const result = parse(`{% annotate style="tooltip" %}
Main text content.
{% /annotate %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Annotate');
    expect(tag).toBeDefined();

    const styleMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.content === 'tooltip');
    expect(styleMeta).toBeDefined();
  });

  it('should default style to margin', () => {
    const result = parse(`{% annotate %}
Text.
{% /annotate %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Annotate');
    const styleMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.content === 'margin');
    expect(styleMeta).toBeDefined();
  });
});
