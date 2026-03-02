import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('steps tag', () => {
  it('should transform headings into steps', () => {
    const result = parse(`{% steps %}
# Step One
Do the first thing.

# Step Two
Do the second thing.
{% /steps %}`);

    expect(result).toBeDefined();

    const stepsTag = findTag(result as any, t => t.attributes.typeof === 'Steps');
    expect(stepsTag).toBeDefined();

    const stepItems = findAllTags(stepsTag!, t => t.attributes.typeof === 'Step');
    expect(stepItems.length).toBe(2);
  });

  it('should auto-detect h2 heading level', () => {
    const result = parse(`{% steps %}
## Step One
Do the first thing.

## Step Two
Do the second thing.
{% /steps %}`);

    const stepsTag = findTag(result as any, t => t.attributes.typeof === 'Steps');
    expect(stepsTag).toBeDefined();

    const stepItems = findAllTags(stepsTag!, t => t.attributes.typeof === 'Step');
    expect(stepItems.length).toBe(2);
  });

  it('should auto-detect h3 heading level', () => {
    const result = parse(`{% steps %}
### Step One
Content.

### Step Two
Content.
{% /steps %}`);

    const stepsTag = findTag(result as any, t => t.attributes.typeof === 'Steps');
    expect(stepsTag).toBeDefined();

    const stepItems = findAllTags(stepsTag!, t => t.attributes.typeof === 'Step');
    expect(stepItems.length).toBe(2);
  });

  it('should still respect explicit headingLevel', () => {
    const result = parse(`{% steps headingLevel=2 %}
## Step One
Do the first thing.

## Step Two
Do the second thing.
{% /steps %}`);

    const stepsTag = findTag(result as any, t => t.attributes.typeof === 'Steps');
    expect(stepsTag).toBeDefined();

    const stepItems = findAllTags(stepsTag!, t => t.attributes.typeof === 'Step');
    expect(stepItems.length).toBe(2);
  });
});
