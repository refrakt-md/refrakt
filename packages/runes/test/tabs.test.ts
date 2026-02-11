import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import Markdoc, { Tag } from '@markdoc/markdoc';
import { tags, nodes } from '../src/index.js';

function parse(content: string) {
  const ast = Markdoc.parse(content);
  const config = { tags, nodes, variables: { generatedIds: new Set<string>() } };
  return Markdoc.transform(ast, config);
}

function findTag(node: any, predicate: (tag: Tag) => boolean): Tag | undefined {
  if (Tag.isTag(node)) {
    if (predicate(node)) return node;
    for (const child of node.children) {
      const found = findTag(child, predicate);
      if (found) return found;
    }
  }
  return undefined;
}

function findAllTags(node: any, predicate: (tag: Tag) => boolean): Tag[] {
  const results: Tag[] = [];
  if (Tag.isTag(node)) {
    if (predicate(node)) results.push(node);
    for (const child of node.children) {
      results.push(...findAllTags(child, predicate));
    }
  }
  return results;
}

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

    const tabGroup = findTag(result as Tag, t => t.attributes.typeof === 'TabGroup');
    expect(tabGroup).toBeDefined();
    expect(tabGroup!.name).toBe('section');

    const tabItems = findAllTags(tabGroup!, t => t.attributes.typeof === 'Tab');
    expect(tabItems.length).toBe(2);

    const panels = findAllTags(tabGroup!, t => t.attributes.typeof === 'TabPanel');
    expect(panels.length).toBe(2);
  });
});
