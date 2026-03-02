import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('comparison tag', () => {
  it('should create a Comparison component', () => {
    const result = parse(`{% comparison %}

## Option A

- **Feature 1** — Yes
- **Feature 2** — Yes

## Option B

- **Feature 1** — No
- **Feature 2** — Yes

{% /comparison %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Comparison');
    expect(tag).toBeDefined();
    expect(tag!.name).toBe('section');
  });

  it('should create ComparisonColumn children from headings', () => {
    const result = parse(`{% comparison %}

## Plan A

- **Price** — $10

## Plan B

- **Price** — $20

{% /comparison %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Comparison');
    const columns = findAllTags(tag!, t => t.attributes.typeof === 'ComparisonColumn');
    expect(columns.length).toBe(2);
  });

  it('should pass highlighted attribute as meta', () => {
    const result = parse(`{% comparison highlighted="Plan B" %}

## Plan A

- **Price** — $10

## Plan B

- **Price** — $20

{% /comparison %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Comparison');
    const highlightMeta = findTag(tag!, t =>
      t.name === 'meta' && t.attributes.content === 'Plan B'
    );
    expect(highlightMeta).toBeDefined();
  });

  it('should create ComparisonRow children within columns', () => {
    const result = parse(`{% comparison %}

## Plan A

- **Feature** — Yes

{% /comparison %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Comparison');
    const row = findTag(tag!, t => t.attributes.typeof === 'ComparisonRow');
    expect(row).toBeDefined();
  });
});
