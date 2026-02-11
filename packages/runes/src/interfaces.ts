import { NodeType } from '@refract-md/types';
import { Ast, Config, Node, NodeType as MarkdocNodeType, Tag } from '@markdoc/markdoc';

export interface NodeFilterOptions {
  node?: MarkdocNodeType;
  limit?: number;
  descendant?: string;
  deep?: boolean;
}

export type NodeFilterFunction = (node: Node) => boolean;

export type NodeFilter = MarkdocNodeType | NodeFilterOptions | NodeFilterFunction;

export interface Group {
  section?: number,
  include?: NodeFilter[],
}

export class TypedNode<IN extends MarkdocNodeType, OUT extends NodeType> extends Ast.Node {
  constructor(
    type: IN,
    attributes: Record<string, any>,
    children: Node[],
    tag?: string,
  ) {
    super(type, attributes, children, tag);
  }

  transform(config: Config): Tag<OUT> {
    return super.transform(config) as Tag<OUT>;
  }
}

export type TransformFunction<T extends NodeType> = (node: Node, config: Config) => Tag<T>;
