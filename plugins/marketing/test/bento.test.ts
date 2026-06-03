import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags, fields } from './helpers.js';

describe('bento tag', () => {
  it('should create a Bento component from headings', () => {
    const result = parse(`{% bento %}
## Large Cell

Content for large cell.

### Medium Cell

Content for medium cell.
{% /bento %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'bento');
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

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'bento');
    const cells = findAllTags(tag!, t => t.attributes['data-rune'] === 'bento-cell');
    expect(cells.length).toBe(3);

    // h2 = large, h3 = medium, h4 = small
    expect(fields(cells[0]).size).toBe('large');
    expect(fields(cells[1]).size).toBe('medium');
    expect(fields(cells[2]).size).toBe('small');
  });

  it('should pass columns attribute as meta', () => {
    const result = parse(`{% bento columns=3 %}
## Cell One

Content.
{% /bento %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'bento');
    expect(fields(tag).columns).toBe('3');
  });

  it('should map h2 to large, h3 to medium, h4 to small', () => {
    const result = parse(`{% bento %}
## Large

Content.

### Medium

Content.

#### Small

Content.
{% /bento %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'bento');
    const cells = findAllTags(tag!, t => t.attributes['data-rune'] === 'bento-cell');

    expect(fields(cells[0]).size).toBe('large');
    expect(fields(cells[1]).size).toBe('medium');
    expect(fields(cells[2]).size).toBe('small');
  });

  it('should produce span values in span mode with default columns=6', () => {
    const result = parse(`{% bento sizing="span" %}
## Full Width

Spans 6 columns.

### Wide

Spans 5 columns.

#### Medium

Spans 4 columns.

##### Narrow

Spans 3 columns.

###### Small

Spans 2 columns.
{% /bento %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'bento');
    const cells = findAllTags(tag!, t => t.attributes['data-rune'] === 'bento-cell');
    expect(cells.length).toBe(5);

    // All cells should have size='span'
    for (const cell of cells) {
      expect(fields(cell).size).toBe('span');
    }

    // Span values: h2→5, h3→4, h4→3, h5→2, h6→1
    expect(fields(cells[0]).span).toBe('5');
    expect(fields(cells[1]).span).toBe('4');
    expect(fields(cells[2]).span).toBe('3');
    expect(fields(cells[3]).span).toBe('2');
    expect(fields(cells[4]).span).toBe('1');
  });

  it('should use effective columns=6 in span mode when columns not set', () => {
    const result = parse(`{% bento sizing="span" %}
## Wide

Content.
{% /bento %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'bento');
    // Default columns=4 should become 6 in span mode
    expect(fields(tag).columns).toBe('6');
  });

  it('should respect explicit columns in span mode', () => {
    const result = parse(`{% bento sizing="span" columns=8 %}
## Wide

Spans 8 columns.

### Medium

Spans 7 columns.
{% /bento %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'bento');
    const cells = findAllTags(tag!, t => t.attributes['data-rune'] === 'bento-cell');

    expect(fields(cells[0]).span).toBe('7');
    expect(fields(cells[1]).span).toBe('6');
  });

  it('should extract icon from heading into a separate icon element', () => {
    const result = parse(`{% bento %}
## {% icon name="rocket" /%} Fast

Performance content.

## {% icon name="shield" /%} Secure

Security content.
{% /bento %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'bento');
    expect(tag).toBeDefined();

    const cells = findAllTags(tag!, t => t.attributes['data-rune'] === 'bento-cell');
    expect(cells.length).toBe(2);

    // Each cell should have an icon wrapper with data-name="icon"
    for (const cell of cells) {
      const iconWrapper = findTag(cell, t => t.attributes?.['data-name'] === 'icon');
      expect(iconWrapper).toBeDefined();
      // Icon falls back to span.rf-icon when __icons not configured
      const iconSpan = findTag(iconWrapper!, t => t.attributes?.class === 'rf-icon');
      expect(iconSpan).toBeDefined();
    }
  });

  it('should extract icon from heading with resolved SVG when __icons provided', () => {
    const result = parse(`{% bento %}
## {% icon name="rocket" /%} Launch

Content here.
{% /bento %}`, {
      __icons: { global: { rocket: '<svg viewBox="0 0 24 24"><path d="M1 1"/></svg>' } },
    });

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'bento');
    const cells = findAllTags(tag!, t => t.attributes['data-rune'] === 'bento-cell');
    expect(cells.length).toBe(1);

    const iconWrapper = findTag(cells[0], t => t.attributes?.['data-name'] === 'icon');
    expect(iconWrapper).toBeDefined();
    // Should contain an SVG element
    const svg = findTag(iconWrapper!, t => t.name === 'svg');
    expect(svg).toBeDefined();
  });

  it('should not create icon wrapper when heading has no icon', () => {
    const result = parse(`{% bento %}
## Plain Cell

No icon here.
{% /bento %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'bento');
    const cells = findAllTags(tag!, t => t.attributes['data-rune'] === 'bento-cell');
    expect(cells.length).toBe(1);

    const iconWrapper = findTag(cells[0], t => t.attributes?.['data-name'] === 'icon');
    expect(iconWrapper).toBeUndefined();
  });

  it('should not duplicate icon in the body when heading has an icon', () => {
    const result = parse(`{% bento %}
## {% icon name="rocket" /%} Fast

Performance content.
{% /bento %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'bento');
    const cells = findAllTags(tag!, t => t.attributes['data-rune'] === 'bento-cell');
    expect(cells.length).toBe(1);

    // Icon should exist in the icon wrapper
    const iconWrapper = findTag(cells[0], t => t.attributes?.['data-name'] === 'icon');
    expect(iconWrapper).toBeDefined();

    // Icon should NOT exist inside the body
    const body = findTag(cells[0], t => t.attributes?.['data-name'] === 'body');
    expect(body).toBeDefined();
    const iconInBody = findTag(body!, t => t.attributes?.class === 'rf-icon' || t.name === 'svg');
    expect(iconInBody).toBeUndefined();
  });

  it('should preserve cell name text when icon is present', () => {
    const result = parse(`{% bento %}
## {% icon name="rocket" /%} Fast Performance

Content.
{% /bento %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'bento');
    const cells = findAllTags(tag!, t => t.attributes['data-rune'] === 'bento-cell');
    expect(cells.length).toBe(1);

    // The name property should contain the heading text (without the icon)
    const nameTag = findTag(cells[0], t => t.attributes?.['data-field'] === 'name');
    expect(nameTag).toBeDefined();
    expect(nameTag!.children.join('').trim()).toBe('Fast Performance');
  });
});
