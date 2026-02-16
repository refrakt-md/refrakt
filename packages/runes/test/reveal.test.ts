import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('reveal tag', () => {
  it('should create a Reveal component', () => {
    const result = parse(`{% reveal %}
First content to show.

Then more content appears.
{% /reveal %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Reveal');
    expect(tag).toBeDefined();
    expect(tag!.name).toBe('section');
  });

  it('should pass mode attribute as meta', () => {
    const result = parse(`{% reveal mode="scroll" %}
Content here.
{% /reveal %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Reveal');
    const modeMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.content === 'scroll');
    expect(modeMeta).toBeDefined();
  });

  it('should create RevealStep children when headingLevel is set', () => {
    const result = parse(`{% reveal headingLevel=2 %}
## Step One

First step content.

## Step Two

Second step content.
{% /reveal %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Reveal');
    const steps = findAllTags(tag!, t => t.attributes.typeof === 'RevealStep');
    expect(steps.length).toBe(2);
  });

  it('should default mode to click', () => {
    const result = parse(`{% reveal %}
Content.
{% /reveal %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Reveal');
    const modeMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.content === 'click');
    expect(modeMeta).toBeDefined();
  });
});
