import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import Markdoc, { Tag } from '@markdoc/markdoc';
import { tags, nodes } from '../src/index.js';

function parse(content: string) {
  const ast = Markdoc.parse(content);
  return Markdoc.transform(ast, { tags, nodes });
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

describe('steps tag', () => {
  it('should transform headings into steps', () => {
    const result = parse(`{% steps %}
# Step One
Do the first thing.

# Step Two
Do the second thing.
{% /steps %}`);

    expect(result).toBeDefined();

    const stepsTag = findTag(result as Tag, t => t.attributes.typeof === 'Steps');
    expect(stepsTag).toBeDefined();

    const stepItems = findAllTags(stepsTag!, t => t.attributes.typeof === 'Step');
    expect(stepItems.length).toBe(2);
  });
});
