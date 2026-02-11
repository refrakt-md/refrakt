import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('tabs tag', () => {
  it('should transform explicit tab tags', () => {
    const result = parse(`{% tabs %}
{% tab name="First" %}
Content for first tab.
{% /tab %}
{% tab name="Second" %}
Content for second tab.
{% /tab %}
{% /tabs %}`);

    expect(result).toBeDefined();

    const tabGroup = findTag(result as any, t => t.attributes.typeof === 'TabGroup');
    expect(tabGroup).toBeDefined();
    expect(tabGroup!.name).toBe('section');

    const tabItems = findAllTags(tabGroup!, t => t.attributes.typeof === 'Tab');
    expect(tabItems.length).toBe(2);

    const panels = findAllTags(tabGroup!, t => t.attributes.typeof === 'TabPanel');
    expect(panels.length).toBe(2);
  });
});
