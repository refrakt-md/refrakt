import Markdoc from '@markdoc/markdoc';
import type { Config, Node, NodeType, RenderableTreeNodes, Schema } from '@markdoc/markdoc';
import { NodeType as RenderableNodeType } from '@refrakt-md/types';
import { RenderableNodeCursor } from './renderable.js';
import { makeSchema } from './node.js';
import { GeneratedAttributeAnnotation } from './annotations/id.js';
import { AbstractGroupAnnotation } from './annotations/group.js';

export class Model {
  /** Extracted tint child node (set by processChildren before @group runs) */
  _tintNode: Node | null = null;

  constructor(
    public readonly node: Node,
    public readonly config: Config
  ) {
    for (const annotation of GeneratedAttributeAnnotation.onClass(this.constructor, true)) {
      annotation.create(node, config);
    }
  }

  processChildren(nodes: Node[]) {
    // Extract tint tag before @group processing so it doesn't interfere
    // with header/body splitting (tint has type 'tag', which breaks @group)
    const tintIdx = nodes.findIndex(n => n.type === 'tag' && n.tag === 'tint');
    if (tintIdx !== -1) {
      this._tintNode = nodes[tintIdx];
      nodes = [...nodes.slice(0, tintIdx), ...nodes.slice(tintIdx + 1)];
    }

    let index = 0;

    for (const annotation of AbstractGroupAnnotation.onClass(this.constructor, true)) {
      index = annotation.create(nodes, index, this.config);
    }
    return nodes;
  }

  transform(): RenderableTreeNodes {
    return this.transformChildren({}).nodes;
  }

  transformChildren(
    nodes: Partial<Record<NodeType, Schema | RenderableNodeType | ((node: Node, config: Config) => RenderableTreeNodes)>> = {}
  ): RenderableNodeCursor {
    const extraNodes: any = {};
    for (const [name, t] of Object.entries(nodes)) {
      extraNodes[name] = makeSchema(t);
    }
    const config = { ...this.config, nodes: { ...this.config.nodes, ...extraNodes } };
    return new RenderableNodeCursor(Markdoc.transform(this.node.children, config));
  }
}
