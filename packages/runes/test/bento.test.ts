import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('bento tag', () => {
  it('should create a Bento component from headings', () => {
    const result = parse(`{% bento %}
## Large Cell

Content for large cell.

### Medium Cell

Content for medium cell.
{% /bento %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Bento');
    expect(tag).toBeDefined();
    expect(tag!.name).toBe('section');
  });

  it('should create BentoCell children with size inference', () => {
    const result = parse(`{% bento %}
## Large

Large content.

### Medium

Medium content.

#### Small

Small content.
{% /bento %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Bento');
    const cells = findAllTags(tag!, t => t.attributes.typeof === 'BentoCell');
    expect(cells.length).toBe(3);

    // h2 = large, h3 = medium, h4 = small
    const sizeMetas = cells.map(cell =>
      findTag(cell, t => t.name === 'meta')
    );
    expect(sizeMetas[0]!.attributes.content).toBe('large');
    expect(sizeMetas[1]!.attributes.content).toBe('medium');
    expect(sizeMetas[2]!.attributes.content).toBe('small');
  });

  it('should pass columns attribute as meta', () => {
    const result = parse(`{% bento columns=3 %}
## Cell One

Content.
{% /bento %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Bento');
    const columnsMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.content === '3');
    expect(columnsMeta).toBeDefined();
  });
});
