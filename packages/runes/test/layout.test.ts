import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('layout tag', () => {
  it('should transform a basic layout', () => {
    const result = parse(`{% layout %}
{% region name="header" %}
Header content.
{% /region %}
{% /layout %}`);

    expect(result).toBeDefined();

    const layout = findTag(result as any, t => t.attributes['data-layout-def'] === true);
    expect(layout).toBeDefined();
    expect(layout!.name).toBe('div');
    expect(layout!.attributes['data-extends']).toBe('parent');
  });

  it('should support extends attribute', () => {
    const result = parse(`{% layout extends="base" %}
{% region name="main" %}
Content.
{% /region %}
{% /layout %}`);

    const layout = findTag(result as any, t => t.attributes['data-layout-def'] === true);
    expect(layout).toBeDefined();
    expect(layout!.attributes['data-extends']).toBe('base');
  });

  it('should contain region children', () => {
    const result = parse(`{% layout %}
{% region name="header" %}
Header.
{% /region %}

{% region name="footer" %}
Footer.
{% /region %}
{% /layout %}`);

    const layout = findTag(result as any, t => t.attributes['data-layout-def'] === true);
    expect(layout).toBeDefined();

    const regions = findAllTags(layout!, t => t.attributes['data-region'] !== undefined);
    expect(regions.length).toBe(2);

    const regionNames = regions.map(r => r.attributes['data-region']);
    expect(regionNames).toContain('header');
    expect(regionNames).toContain('footer');
  });
});
