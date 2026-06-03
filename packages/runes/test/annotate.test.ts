import { describe, it, expect } from 'vitest';
import { parse, findTag, fields } from './helpers.js';

describe('annotate tag', () => {
  it('should create an Annotate component', () => {
    const result = parse(`{% annotate %}
This is the main text with an annotation.
{% /annotate %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'annotate');
    expect(tag).toBeDefined();
    expect(tag!.name).toBe('div');
  });

  it('should pass variant attribute as meta', () => {
    const result = parse(`{% annotate variant="tooltip" %}
Main text content.
{% /annotate %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'annotate');
    expect(tag).toBeDefined();

    expect(fields(tag).variant).toBe('tooltip');
  });

  it('should default variant to margin', () => {
    const result = parse(`{% annotate %}
Text.
{% /annotate %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'annotate');
    expect(fields(tag).variant).toBe('margin');
  });
});
