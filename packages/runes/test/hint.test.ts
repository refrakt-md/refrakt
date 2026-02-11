import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import Markdoc, { Tag } from '@markdoc/markdoc';
import { tags, nodes } from '../src/index.js';

function parse(content: string) {
  const ast = Markdoc.parse(content);
  const result = Markdoc.transform(ast, { tags, nodes });
  return result;
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

describe('hint tag', () => {
  it('should transform a basic hint', () => {
    const result = parse(`{% hint type="warning" %}
This is a warning message.
{% /hint %}`);

    expect(result).toBeDefined();

    // The result should contain a section with typeof="Hint"
    const hint = findTag(result as Tag, t => t.attributes.typeof === 'Hint');
    expect(hint).toBeDefined();
    expect(hint!.name).toBe('section');
    expect(hint!.attributes.typeof).toBe('Hint');
  });

  it('should default hint type to note', () => {
    const result = parse(`{% hint %}
This is a note.
{% /hint %}`);

    const hint = findTag(result as Tag, t => t.attributes.typeof === 'Hint');
    expect(hint).toBeDefined();

    // Should have a meta tag with content="note"
    const meta = findTag(hint!, t => t.name === 'meta');
    expect(meta).toBeDefined();
    expect(meta!.attributes.content).toBe('note');
  });
});
