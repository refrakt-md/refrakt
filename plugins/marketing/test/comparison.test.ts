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

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'comparison');
    expect(tag).toBeDefined();
    expect(tag!.name).toBe('section');
  });

  it('should build a column header per heading', () => {
    const result = parse(`{% comparison %}

## Plan A

- **Price** — $10

## Plan B

- **Price** — $20

{% /comparison %}`);

    // SPEC-081: the transform builds the table directly (no intermediate
    // column/row renderables) — assert the column headers.
    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'comparison');
    const colHeaders = findAllTags(tag!, t =>
      t.name === 'th' && !String(t.attributes.class ?? '').includes('label-col')
        && !String(t.attributes.class ?? '').includes('row-label'));
    expect(colHeaders.length).toBe(2);
    expect(JSON.stringify(tag)).toContain('Plan A');
    expect(JSON.stringify(tag)).toContain('Plan B');
  });

  it('should mark the highlighted column header', () => {
    const result = parse(`{% comparison highlighted="Plan B" %}

## Plan A

- **Price** — $10

## Plan B

- **Price** — $20

{% /comparison %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'comparison');
    const highlighted = findTag(tag!, t =>
      t.name === 'th' && String(t.attributes.class ?? '').includes('col-header--highlighted'));
    expect(highlighted).toBeDefined();
    expect(JSON.stringify(highlighted)).toContain('Plan B');
  });

  it('should build a labelled row for each aligned feature', () => {
    const result = parse(`{% comparison %}

## Plan A

- **Feature** — Yes

{% /comparison %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'comparison');
    const rowLabel = findTag(tag!, t =>
      t.name === 'th' && String(t.attributes.class ?? '').includes('row-label'));
    expect(rowLabel).toBeDefined();
    expect(rowLabel!.children).toContain('Feature');
  });
});
