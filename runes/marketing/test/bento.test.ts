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

  it('should map h1 to full size when headingLevel=1', () => {
    const result = parse(`{% bento headingLevel=1 %}
# Hero Cell

Full-width hero content.

## Secondary

Large content.

### Tertiary

Medium content.

#### Small

Small content.
{% /bento %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Bento');
    const cells = findAllTags(tag!, t => t.attributes.typeof === 'BentoCell');
    expect(cells.length).toBe(4);

    const sizeMetas = cells.map(cell =>
      findTag(cell, t => t.name === 'meta' && t.attributes.property === 'size')
    );
    expect(sizeMetas[0]!.attributes.content).toBe('full');
    expect(sizeMetas[1]!.attributes.content).toBe('large');
    expect(sizeMetas[2]!.attributes.content).toBe('medium');
    expect(sizeMetas[3]!.attributes.content).toBe('small');
  });

  it('should keep backward-compatible sizes for headingLevel=2', () => {
    const result = parse(`{% bento %}
## Large

Content.

### Medium

Content.

#### Small

Content.
{% /bento %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Bento');
    const cells = findAllTags(tag!, t => t.attributes.typeof === 'BentoCell');

    const sizeMetas = cells.map(cell =>
      findTag(cell, t => t.name === 'meta' && t.attributes.property === 'size')
    );
    expect(sizeMetas[0]!.attributes.content).toBe('large');
    expect(sizeMetas[1]!.attributes.content).toBe('medium');
    expect(sizeMetas[2]!.attributes.content).toBe('small');
  });

  it('should produce span values in span mode with default columns=6', () => {
    const result = parse(`{% bento sizing="span" headingLevel=1 %}
# Full Width

Spans 6 columns.

## Wide

Spans 5 columns.

### Medium

Spans 4 columns.

#### Narrow

Spans 3 columns.

##### Small

Spans 2 columns.

###### Tiny

Spans 1 column.
{% /bento %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Bento');
    const cells = findAllTags(tag!, t => t.attributes.typeof === 'BentoCell');
    expect(cells.length).toBe(6);

    // All cells should have size='span'
    const sizeMetas = cells.map(cell =>
      findTag(cell, t => t.name === 'meta' && t.attributes.property === 'size')
    );
    for (const meta of sizeMetas) {
      expect(meta!.attributes.content).toBe('span');
    }

    // Span values: h1→6, h2→5, h3→4, h4→3, h5→2, h6→1
    const spanMetas = cells.map(cell =>
      findTag(cell, t => t.name === 'meta' && t.attributes.property === 'span')
    );
    expect(spanMetas[0]!.attributes.content).toBe('6');
    expect(spanMetas[1]!.attributes.content).toBe('5');
    expect(spanMetas[2]!.attributes.content).toBe('4');
    expect(spanMetas[3]!.attributes.content).toBe('3');
    expect(spanMetas[4]!.attributes.content).toBe('2');
    expect(spanMetas[5]!.attributes.content).toBe('1');
  });

  it('should use effective columns=6 in span mode when columns not set', () => {
    const result = parse(`{% bento sizing="span" headingLevel=1 %}
# Wide

Content.
{% /bento %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Bento');
    // Default columns=4 should become 6 in span mode
    const columnsMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.content === '6');
    expect(columnsMeta).toBeDefined();
  });

  it('should respect explicit columns in span mode', () => {
    const result = parse(`{% bento sizing="span" columns=8 headingLevel=1 %}
# Wide

Spans 8 columns.

## Medium

Spans 7 columns.
{% /bento %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Bento');
    const cells = findAllTags(tag!, t => t.attributes.typeof === 'BentoCell');

    const spanMetas = cells.map(cell =>
      findTag(cell, t => t.name === 'meta' && t.attributes.property === 'span')
    );
    expect(spanMetas[0]!.attributes.content).toBe('8');
    expect(spanMetas[1]!.attributes.content).toBe('7');
  });
});
