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
});
