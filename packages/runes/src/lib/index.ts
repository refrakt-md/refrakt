import { Newable } from '@refrakt-md/types';
import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes, Schema, SchemaAttribute, Tag, ValidationError } from '@markdoc/markdoc';

import { Model } from './model.js';
import { AttributeAnnotation } from './annotations/attribute.js';

export { createComponentRenderable } from './component.js';
export { attribute } from './annotations/attribute.js';
export { group, groupList } from './annotations/group.js';
export { id } from './annotations/id.js';
export { Model } from './model.js';

/** Rule for mapping a deprecated attribute to its replacement */
export interface DeprecationRule {
  /** New attribute name to copy the value to */
  newName: string;
  /** Optional transform — receives the old value and all attributes, returns the new value */
  transform?: (value: any, allAttrs: Record<string, any>) => any;
}

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

/**
 * Inject bg meta tags into the result renderable.
 * Transforms the extracted _bgNode and appends its meta tags to the parent.
 */
function injectBgMetas(result: RenderableTreeNodes, model: Model): RenderableTreeNodes {
  if (!Markdoc.Tag.isTag(result) || !model._bgNode) return result;

  const bgResult = Markdoc.transform(model._bgNode, model.config);
  if (Markdoc.Tag.isTag(bgResult)) {
    const metas: Tag[] = [];
    for (const child of bgResult.children) {
      if (Markdoc.Tag.isTag(child) && child.name === 'meta') {
        metas.push(child);
      }
    }
    if (metas.length > 0) {
      result.children = [...result.children, ...metas];
    }
  }

  return result;
}

export function createSchema<TInput extends Model>(
  ModelCtr: Newable<TInput>,
  deprecations?: Record<string, DeprecationRule>,
): Schema {
  const attributes: Record<string, SchemaAttribute> = {};

  for (const attr of AttributeAnnotation.onClass(ModelCtr, true)) {
    attributes[attr.propertyKey] = attr.schema;
  }

  // Add tint and tint-mode as universal attributes on all runes
  attributes['tint'] = { type: String, required: false };
  attributes['tint-mode'] = { type: String, required: false, matches: ['auto', 'dark', 'light'] };

  // Add width and spacing as universal layout attributes on all runes
  attributes['width'] = { type: String, required: false, matches: ['content', 'wide', 'full'] };
  attributes['spacing'] = { type: String, required: false, matches: ['flush', 'tight', 'default', 'loose', 'breathe'] };

  // Register deprecated attribute names so Markdoc accepts them
  if (deprecations) {
    for (const [oldName, rule] of Object.entries(deprecations)) {
      if (!attributes[oldName]) {
        // Inherit type from the target attribute if possible
        const target = attributes[rule.newName];
        attributes[oldName] = { type: target?.type ?? String, required: false };
      }
    }
  }

  const schema: Schema = {
    attributes,
    transform: (node, config) => {
      // Resolve deprecated attributes before model construction
      if (deprecations) {
        for (const [oldName, rule] of Object.entries(deprecations)) {
          if (node.attributes[oldName] !== undefined && node.attributes[rule.newName] === undefined) {
            const newVal = rule.transform
              ? rule.transform(node.attributes[oldName], node.attributes)
              : node.attributes[oldName];
            if (newVal !== undefined) {
              node.attributes[rule.newName] = newVal;
            }
          }
        }
      }

      const model = new ModelCtr(node, config);
      const attr = node.transformAttributes(config);
      for (const k of Object.keys(attr)) {
        (model as any)[k] = attr[k];
      }
      model.node.children = model.processChildren(node.children);

      const result = model.transform();
      const output = injectBgMetas(injectTintMetas(result, model), model);

      // Forward universal layout attributes to the output tag
      if (Markdoc.Tag.isTag(output)) {
        const width = (model as any).width as string | undefined;
        const spacing = (model as any).spacing as string | undefined;
        if (width) output.attributes.width = width;
        if (spacing) output.attributes.spacing = spacing;
      }

      return output;
    }
  };

  // Add validation for deprecation warnings
  if (deprecations) {
    schema.validate = (node) => {
      const errors: ValidationError[] = [];
      for (const [oldName, rule] of Object.entries(deprecations)) {
        if (node.attributes[oldName] !== undefined) {
          errors.push({
            id: 'deprecated-attribute',
            level: 'warning',
            message: `Attribute "${oldName}" is deprecated. Use "${rule.newName}" instead.`,
          });
        }
      }
      return errors;
    };
  }

  return schema;
}
