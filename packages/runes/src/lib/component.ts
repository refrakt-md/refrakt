import { ComponentType, Type } from '@refrakt-md/types';
import Markdoc from '@markdoc/markdoc';
import type { Tag, RenderableTreeNodes } from '@markdoc/markdoc';
import { RenderableNodeCursor } from './renderable.js';

export type PropertyInput<TSchema, T extends ComponentType<TSchema>> = {
  [P in keyof T["properties"]]:
    RenderableNodeCursor<Tag<T["properties"][P]>> |
    Tag<T["properties"][P]> |
    Tag<T["properties"][P]>[]
};

export type RefInput<TSchema, T extends ComponentType<TSchema>> = {
  [P in keyof T["refs"]]:
    RenderableNodeCursor<Tag<T["refs"][P]>> |
    Tag<T["refs"][P]> |
    Tag<T["refs"][P]>[]
};

export interface TransformResult<TSchema, T extends ComponentType<TSchema>> {
  tag: T["tag"],
  id?: string;
  class?: string;
  property?: string;
  properties: Partial<PropertyInput<TSchema, T>>,
  refs?: Partial<RefInput<TSchema, T>>,
  children: RenderableTreeNodes;
}

export function createComponentRenderable<TOutput extends ComponentType<object>>(
  type: Type<TOutput>,
  result: TransformResult<TOutput["schema"], TOutput>
) {
  for (const [k, v] of Object.entries(result.properties)) {
    const tags: Tag[] = v instanceof RenderableNodeCursor ? v.nodes : Array.isArray(v) ? v : [v];

    tags.forEach(n => {
      if (Markdoc.Tag.isTag(n)) {
        n.attributes.property = k
      }
    });
  }

  for (const [k, v] of Object.entries(result.refs || {})) {
    const tags: Tag[] = v instanceof RenderableNodeCursor ? v.nodes : Array.isArray(v) ? v : [v];

    tags.forEach(n => {
      if (Markdoc.Tag.isTag(n)) {
        n.attributes['data-name'] = k;
      }
    });
  }

  const tag = new Markdoc.Tag(result.tag, {
    id: result.id,
    property: result.property,
    typeof: type.name,
    class: result.class
  }, Array.isArray(result.children) ? result.children : [result.children]);

  return tag;
}
