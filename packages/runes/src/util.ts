import { Ast, Config, Node, RenderableTreeNode, Tag } from '@markdoc/markdoc';
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
    if (Tag.isTag(child)) {
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

export function headingsToList(options?: HeadingsToListOptions) {
  const level = options?.level ?? 1;
  const include = options?.include;

  return (nodes: Node[]) => {
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
