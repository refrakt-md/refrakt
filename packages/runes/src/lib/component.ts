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
  /** Structural property name — becomes data-field on the wrapper (BEM/theming) */
  property?: string;
  properties?: Record<string, RenderableNodeCursor<Tag> | Tag | Tag[] | undefined>;
  refs?: Record<string, RenderableNodeCursor<Tag> | Tag | Tag[] | undefined>;
  /** Schema.org property mappings — sets RDFa `property` attribute on referenced tags */
  schema?: Record<string, RenderableNodeCursor<Tag> | Tag | Tag[] | undefined>;
  /** Override the schema.org type (defaults to Type.schemaOrgType) */
  typeof?: string;
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

  for (const [k, v] of Object.entries(result.schema ?? {})) {
    if (v === undefined) continue;
    const tags: Tag[] = v instanceof RenderableNodeCursor ? v.nodes : Array.isArray(v) ? v : [v];

    tags.forEach(n => {
      if (Markdoc.Tag.isTag(n)) {
        n.attributes['property'] = k;
      }
    });
  }

  const tag = new Markdoc.Tag(result.tag, {
    id: result.id,
    'data-field': result.property ? toKebabCase(result.property) : result.property,
    'data-rune': toKebabCase(type.name),
    typeof: result.typeof ?? type.schemaOrgType,
    class: result.class
  }, Array.isArray(result.children) ? result.children : [result.children]);

  return tag;
}
