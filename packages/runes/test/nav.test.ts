import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('nav tag', () => {
  it('should transform a flat nav with page slugs', () => {
    const result = parse(`{% nav %}
- getting-started
- installation
- configuration
{% /nav %}`);

    expect(result).toBeDefined();

    const nav = findTag(result as any, t => t.attributes.typeof === 'Nav');
    expect(nav).toBeDefined();
    expect(nav!.name).toBe('nav');
  });

  it('should create nav groups from headings', () => {
    const result = parse(`{% nav %}
## Getting Started

- installation
- quickstart

## Reference

- api
- config
{% /nav %}`);

    const nav = findTag(result as any, t => t.attributes.typeof === 'Nav');
    expect(nav).toBeDefined();

    const groups = findAllTags(nav!, t => t.attributes.typeof === 'NavGroup');
    expect(groups.length).toBe(2);
  });

  it('should support ordered attribute', () => {
    const result = parse(`{% nav ordered=true %}
- intro
- setup
- deploy
{% /nav %}`);

    const nav = findTag(result as any, t => t.attributes.typeof === 'Nav');
    expect(nav).toBeDefined();
    expect(nav!.attributes.class).toBe('ordered');
  });

  it('should produce nav items with slug spans', () => {
    const result = parse(`{% nav %}
- getting-started
- installation
{% /nav %}`);

    const nav = findTag(result as any, t => t.attributes.typeof === 'Nav');
    expect(nav).toBeDefined();

    const slugSpans = findAllTags(nav!, t => t.name === 'span' && t.attributes.property === 'slug');
    expect(slugSpans.length).toBeGreaterThan(0);
  });
});
