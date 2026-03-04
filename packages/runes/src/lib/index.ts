import { Newable } from '@refrakt-md/types';
import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes, Schema, SchemaAttribute, Tag } from '@markdoc/markdoc';

import { Model } from './model.js';
import { AttributeAnnotation } from './annotations/attribute.js';

export { createComponentRenderable } from './component.js';
export { attribute } from './annotations/attribute.js';
export { group, groupList } from './annotations/group.js';
export { id } from './annotations/id.js';
export { Model } from './model.js';

/**
 * Inject tint meta tags into the result renderable.
 * Handles both the attribute form (tint="warm", tint-mode="dark") and
 * the inline child rune form (extracted _tintNode on the model).
 */
function injectTintMetas(result: RenderableTreeNodes, model: Model): RenderableTreeNodes {
  if (!Markdoc.Tag.isTag(result)) return result;

  const metas: Tag[] = [];
  const tintAttr = (model as any).tint as string | undefined;
  const tintModeAttr = (model as any)['tint-mode'] as string | undefined;

  // Inline tint child rune takes priority — transform it and extract metas
  if (model._tintNode) {
    const tintResult = Markdoc.transform(model._tintNode, model.config);
    if (Markdoc.Tag.isTag(tintResult)) {
      for (const child of tintResult.children) {
        if (Markdoc.Tag.isTag(child) && child.name === 'meta') {
          metas.push(child);
        }
      }
    }
  }

  // Attribute form: only add if inline tint didn't already set the same property
  const hasMetaProp = (prop: string) => metas.some(
    m => Markdoc.Tag.isTag(m) && m.attributes.property === prop
  );

  if (tintAttr && !hasMetaProp('tint')) {
    metas.push(new Markdoc.Tag('meta', { property: 'tint', content: tintAttr }));
  }
  if (tintModeAttr && tintModeAttr !== 'auto' && !hasMetaProp('tint-mode')) {
    metas.push(new Markdoc.Tag('meta', { property: 'tint-mode', content: tintModeAttr }));
  }

  if (metas.length === 0) return result;

  // Append tint metas to the result's children
  result.children = [...result.children, ...metas];
  return result;
}

export function createSchema<TInput extends Model>(ModelCtr: Newable<TInput>): Schema {
  const attributes: Record<string, SchemaAttribute> = {};

  for (const attr of AttributeAnnotation.onClass(ModelCtr, true)) {
    attributes[attr.propertyKey] = attr.schema;
  }

  // Add tint and tint-mode as universal attributes on all runes
  attributes['tint'] = { type: String, required: false };
  attributes['tint-mode'] = { type: String, required: false, matches: ['auto', 'dark', 'light'] };

  return {
    attributes,
    transform: (node, config) => {

      const model = new ModelCtr(node, config);
      const attr = node.transformAttributes(config);
      for (const k of Object.keys(attr)) {
        (model as any)[k] = attr[k];
      }
      model.node.children = model.processChildren(node.children);

      const result = model.transform();
      return injectTintMetas(result, model);
    }
  }
}
