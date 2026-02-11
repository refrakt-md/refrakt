import 'reflect-metadata';
import Markdoc, { Tag } from '@markdoc/markdoc';
import { tags, nodes } from '../src/index.js';

export function parse(content: string, variables: Record<string, any> = {}) {
  const ast = Markdoc.parse(content);
  const config = { tags, nodes, variables: { generatedIds: new Set<string>(), path: '/test.md', ...variables } };
  return Markdoc.transform(ast, config);
}

export function findTag(node: any, predicate: (tag: Tag) => boolean): Tag | undefined {
  if (Tag.isTag(node)) {
    if (predicate(node)) return node;
    for (const child of node.children) {
      const found = findTag(child, predicate);
      if (found) return found;
    }
  }
  return undefined;
}

export function findAllTags(node: any, predicate: (tag: Tag) => boolean): Tag[] {
  const results: Tag[] = [];
  if (Tag.isTag(node)) {
    if (predicate(node)) results.push(node);
    for (const child of node.children) {
      results.push(...findAllTags(child, predicate));
    }
  }
  return results;
}
