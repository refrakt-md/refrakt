import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('region tag', () => {
  it('should transform a basic region with name', () => {
    const result = parse(`{% region name="header" %}
# Welcome

Some header content.
{% /region %}`);

    expect(result).toBeDefined();

    const region = findTag(result as any, t => t.attributes['data-region'] === 'header');
    expect(region).toBeDefined();
    expect(region!.name).toBe('div');
    expect(region!.attributes['data-mode']).toBe('replace');
  });

  it('should support append mode', () => {
    const result = parse(`{% region name="sidebar" mode="append" %}
Extra sidebar content.
{% /region %}`);

    const region = findTag(result as any, t => t.attributes['data-region'] === 'sidebar');
    expect(region).toBeDefined();
    expect(region!.attributes['data-mode']).toBe('append');
  });

  it('should support prepend mode', () => {
    const result = parse(`{% region name="footer" mode="prepend" %}
Footer prefix.
{% /region %}`);

    const region = findTag(result as any, t => t.attributes['data-region'] === 'footer');
    expect(region).toBeDefined();
    expect(region!.attributes['data-mode']).toBe('prepend');
  });

  it('should contain transformed children', () => {
    const result = parse(`{% region name="main" %}
# Title

A paragraph.
{% /region %}`);

    const region = findTag(result as any, t => t.attributes['data-region'] === 'main');
    expect(region).toBeDefined();
    expect(region!.children.length).toBeGreaterThan(0);

    const heading = findTag(region!, t => t.name === 'h1');
    expect(heading).toBeDefined();
  });
});
