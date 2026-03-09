import { NodeType, Type } from '@refrakt-md/types';
import Markdoc from '@markdoc/markdoc';
import type { Tag, RenderableTreeNodes } from '@markdoc/markdoc';
import { toKebabCase } from '@refrakt-md/transform';
import { RenderableNodeCursor } from './renderable.js';

export { toKebabCase };

export interface TransformResult {
  tag: NodeType;
  id?: string;
  class?: string;
  property?: string;
  properties?: Record<string, RenderableNodeCursor<Tag> | Tag | Tag[] | undefined>;
  refs?: Record<string, RenderableNodeCursor<Tag> | Tag | Tag[] | undefined>;
  children: RenderableTreeNodes;
}

export function createComponentRenderable(
  type: Type,
  result: TransformResult
) {
  for (const [k, v] of Object.entries(result.properties ?? {})) {
    if (v === undefined) continue;
    const tags: Tag[] = v instanceof RenderableNodeCursor ? v.nodes : Array.isArray(v) ? v : [v];

    tags.forEach(n => {
      if (Markdoc.Tag.isTag(n)) {
        n.attributes['data-field'] = toKebabCase(k)
      }
    });
  }

  for (const [k, v] of Object.entries(result.refs || {})) {
    if (v === undefined) continue;
    const tags: Tag[] = v instanceof RenderableNodeCursor ? v.nodes : Array.isArray(v) ? v : [v];

    tags.forEach(n => {
      if (Markdoc.Tag.isTag(n)) {
        n.attributes['data-name'] = k;
      }
    });
  }

  const tag = new Markdoc.Tag(result.tag, {
    id: result.id,
    'data-field': result.property ? toKebabCase(result.property) : result.property,
    'data-rune': toKebabCase(type.name),
    typeof: type.schemaOrgType,
    class: result.class
  }, Array.isArray(result.children) ? result.children : [result.children]);

  return tag;
}
