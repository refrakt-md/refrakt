import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('hint tag', () => {
  it('should transform a basic hint', () => {
    const result = parse(`{% hint type="warning" %}
This is a warning message.
{% /hint %}`);

    expect(result).toBeDefined();

    const hint = findTag(result as any, t => t.attributes.typeof === 'Hint');
    expect(hint).toBeDefined();
    expect(hint!.name).toBe('section');
    expect(hint!.attributes.typeof).toBe('Hint');
  });

  it('should default hint type to note', () => {
    const result = parse(`{% hint %}
This is a note.
{% /hint %}`);

    const hint = findTag(result as any, t => t.attributes.typeof === 'Hint');
    expect(hint).toBeDefined();

    const meta = findTag(hint!, t => t.name === 'meta');
    expect(meta).toBeDefined();
    expect(meta!.attributes.content).toBe('note');
  });
});
