import Markdoc from '@markdoc/markdoc';
import type { Tag, Config, Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast } = Markdoc;
import { NodeFilter } from './interfaces.js';
import { isFilterMatching } from './lib/node.js';

export function generateIdIfMissing(node: Node, config: Config) {
  if (!config.variables?.generatedIds) {
    (config.variables as Record<string, any>).generatedIds = new Set<string>();
  }
  const generatedIds = config.variables?.generatedIds as Set<string>;

  if (!node.attributes.id) {
    const prefix = node.type === 'tag' ? node.tag : node.type;

    if (node.type === 'tag') {
      let index = 0;

      while (generatedIds.has(`${prefix}-${index}`)) {
        index++;
      }
      const id = `${prefix}-${index}`;
      generatedIds.add(id);
      node.attributes.id = id;
    }
  }
}

export function *walkTag(tag: Tag): Generator<RenderableTreeNode> {
  yield tag;
  for (const child of tag.children) {
    if (Markdoc.Tag.isTag(child)) {
      yield* walkTag(child);
    } else {
      yield child;
    }
  }
}

export interface HeadingsToListOptions {
  level?: number;

  include?: NodeFilter[];
}

export interface HeadingInfo {
  level: number;
  text: string;
  id: string;
}

/**
 * Pre-scan an AST for heading nodes, extracting their text and generating
 * IDs using the same algorithm as nodes.ts heading transform.
 */
export function extractHeadings(node: Node): HeadingInfo[] {
  const headings: HeadingInfo[] = [];

  function walk(n: Node) {
    if (n.type === 'heading') {
      const textParts: string[] = [];
      for (const child of n.walk()) {
        if (child.type === 'text' && child.attributes.content) {
          textParts.push(child.attributes.content);
        }
      }
      const text = textParts.join(' ');
      const id = n.attributes.id || text
        .replace(/[?]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase();

      headings.push({
        level: n.attributes.level,
        text,
        id,
      });
    }

    for (const child of n.children) {
      walk(child);
    }
  }

  walk(node);
  return headings;
}

export function headingsToList(options?: HeadingsToListOptions) {
  const explicitLevel = options?.level;
  const include = options?.include;

  return (nodes: Node[]) => {
    // Auto-detect level from first heading if not specified
    const level = explicitLevel ?? nodes.find(n => n.type === 'heading')?.attributes.level;
    if (!level) return nodes;
    let start: number | undefined;
    const list = new Ast.Node('list');
    const head: Node[] = [];
    let tail: Node[] = [];

    for (let i=0; i<nodes.length; i++) {
      const node = nodes[i];

      if (node.type === 'heading' && node.attributes.level === level) {
        list.children.push(new Ast.Node('item', {}, [node]));
        start = i;
      } else if (start === undefined) {
        head.push(node);
      } else if (!include || include.some(filter => isFilterMatching(node, filter))) {
        const lastItem = list.children.at(-1);
        if (lastItem) {
          lastItem.children.push(node);
        }
      } else {
        tail = nodes.slice(i);
        break;
      }
    }

    if (list.children.length === 0) {
      return nodes;
    }

    return [...head, list, ...tail];
  }
}
