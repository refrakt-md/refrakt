import { RenderableTreeNode, Tag } from '@markdoc/markdoc';
import { NodeType } from '@refract-md/types';
import { walkTag } from '../util.js';

export class RenderableNodeCursor<T extends RenderableTreeNode = RenderableTreeNode> {
  private offset = 0;

  constructor(public readonly nodes: T[]) {}

  static fromData<TagName extends NodeType>(data: any, tag: TagName) {
    return new RenderableNodeCursor([new Tag(tag, {}, [data])]);
  }

  wrap<TagName extends string>(tag: TagName, attributes: Record<string, any> = {}): RenderableNodeCursor<Tag<TagName>> {
    return new RenderableNodeCursor([new Tag(tag, attributes, this.nodes)]);
  }

  tag<TagName extends NodeType>(tag: TagName): RenderableNodeCursor<Tag<TagName>> {
    const nodes = this.nodes.filter(n => Tag.isTag(n) && n.name === tag) as unknown as Tag<TagName>[];
    return new RenderableNodeCursor(nodes);
  }

  tags<TagNames extends NodeType[]>(...tags: TagNames): RenderableNodeCursor<Tag<TagNames[number]>> {
    const nodes = this.nodes.filter(n => Tag.isTag(n) && (tags as string[]).includes(n.name)) as unknown as Tag<TagNames[number]>[];
    return new RenderableNodeCursor(nodes);
  }

  headings() {
    return this.tags('h1', 'h2', 'h3', 'h4', 'h5', 'h6');
  }

  typeof(type: string): RenderableNodeCursor<T> {
    return new RenderableNodeCursor(this.nodes.filter(n => Tag.isTag(n) && n.attributes.typeof === type));
  }

  concat(...other: (RenderableTreeNode | RenderableNodeCursor)[]) {
    const nodes = other.map(o => o instanceof RenderableNodeCursor ? o.nodes : o).flat();
    return new RenderableNodeCursor([...this.nodes, ...nodes]);
  }

  flatten() {
    const nodes = this.nodes.map(t => Tag.isTag(t) ? Array.from(walkTag(t)) : t).flat();
    return new RenderableNodeCursor(nodes);
  }

  limit(count: number) {
    return new RenderableNodeCursor(this.nodes.slice(0, count));
  }

  slice(start: number, end?: number) {
    return new RenderableNodeCursor(this.nodes.slice(start, end));
  }

  toArray(): T[] {
    return this.nodes;
  }

  count(): number {
    return this.nodes.length;
  }

  next(): T {
    return this.nodes[this.offset++];
  }
}
