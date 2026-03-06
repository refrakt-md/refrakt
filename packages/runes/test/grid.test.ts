import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('grid tag', () => {
  it('should transform a grid with sections divided by hr', () => {
    const result = parse(`{% grid layout="1 1" %}
First column content.

---

Second column content.
{% /grid %}`);

    expect(result).toBeDefined();

    const gridTag = findTag(result as any, t => t.attributes.typeof === 'Grid');
    expect(gridTag).toBeDefined();
    expect(gridTag!.name).toBe('section');
  });

  it('should also work with the columns alias', () => {
    const result = parse(`{% columns layout="1 1" %}
Left side.

---

Right side.
{% /columns %}`);

    const gridTag = findTag(result as any, t => t.attributes.typeof === 'Grid');
    expect(gridTag).toBeDefined();
  });

  it('should emit mode meta for auto mode', () => {
    const result = parse(`{% grid mode="auto" min="280px" %}

Card one.

---

Card two.

---

Card three.
{% /grid %}`);

    const gridTag = findTag(result as any, t => t.attributes.typeof === 'Grid');
    expect(gridTag).toBeDefined();

    const modeMeta = findTag(gridTag!, t => t.name === 'meta' && t.attributes.property === 'mode');
    expect(modeMeta).toBeDefined();
    expect(modeMeta!.attributes.content).toBe('auto');

    const minMeta = findTag(gridTag!, t => t.name === 'meta' && t.attributes.property === 'min');
    expect(minMeta).toBeDefined();
    expect(minMeta!.attributes.content).toBe('280px');
  });

  it('should not emit mode meta for default columns mode', () => {
    const result = parse(`{% grid %}
Content.

---

More content.
{% /grid %}`);

    const gridTag = findTag(result as any, t => t.attributes.typeof === 'Grid');
    const modeMeta = findTag(gridTag!, t => t.name === 'meta' && t.attributes.property === 'mode');
    expect(modeMeta).toBeUndefined();
  });

  it('should emit aspect meta when set', () => {
    const result = parse(`{% grid aspect="16/9" %}
Cell one.

---

Cell two.
{% /grid %}`);

    const gridTag = findTag(result as any, t => t.attributes.typeof === 'Grid');
    const aspectMeta = findTag(gridTag!, t => t.name === 'meta' && t.attributes.property === 'aspect');
    expect(aspectMeta).toBeDefined();
    expect(aspectMeta!.attributes.content).toBe('16/9');
  });

  it('should emit stack meta when set', () => {
    const result = parse(`{% grid stack="reverse" %}
Main content.

---

Sidebar.
{% /grid %}`);

    const gridTag = findTag(result as any, t => t.attributes.typeof === 'Grid');
    const stackMeta = findTag(gridTag!, t => t.name === 'meta' && t.attributes.property === 'stack');
    expect(stackMeta).toBeDefined();
    expect(stackMeta!.attributes.content).toBe('reverse');
  });

  it('should emit masonry mode meta', () => {
    const result = parse(`{% grid mode="masonry" %}
Short card.

---

Tall card.

---

Medium card.
{% /grid %}`);

    const gridTag = findTag(result as any, t => t.attributes.typeof === 'Grid');
    const modeMeta = findTag(gridTag!, t => t.name === 'meta' && t.attributes.property === 'mode');
    expect(modeMeta).toBeDefined();
    expect(modeMeta!.attributes.content).toBe('masonry');
  });

  it('should route layout="auto" deprecation to mode attribute', () => {
    const result = parse(`{% grid layout="auto" %}
Card one.

---

Card two.
{% /grid %}`);

    const gridTag = findTag(result as any, t => t.attributes.typeof === 'Grid');
    const modeMeta = findTag(gridTag!, t => t.name === 'meta' && t.attributes.property === 'mode');
    expect(modeMeta).toBeDefined();
    expect(modeMeta!.attributes.content).toBe('auto');
  });

  it('should route layout="2 1" deprecation to spans attribute', () => {
    const result = parse(`{% grid layout="2 1" %}
Wide column.

---

Narrow column.
{% /grid %}`);

    const gridTag = findTag(result as any, t => t.attributes.typeof === 'Grid');
    expect(gridTag).toBeDefined();
    // Should produce cells with colspan data (from spans processing)
    const cell = findTag(gridTag!, t => t.attributes['data-colspan'] === 2);
    expect(cell).toBeDefined();
  });
});
