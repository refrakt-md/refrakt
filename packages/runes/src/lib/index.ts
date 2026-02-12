import { Newable } from '@refrakt-md/types';
import type { Schema, SchemaAttribute } from '@markdoc/markdoc';

import { Model } from './model.js';
import { AttributeAnnotation } from './annotations/attribute.js';

export { createComponentRenderable } from './component.js';
export { attribute } from './annotations/attribute.js';
export { group, groupList } from './annotations/group.js';
export { id } from './annotations/id.js';
export { Model } from './model.js';

export function createSchema<TInput extends Model>(ModelCtr: Newable<TInput>): Schema {
  const attributes: Record<string, SchemaAttribute> = {};

  for (const attr of AttributeAnnotation.onClass(ModelCtr, true)) {
    attributes[attr.propertyKey] = attr.schema;
  }

  return {
    attributes,
    transform: (node, config) => {

      const model = new ModelCtr(node, config);
      const attr = node.transformAttributes(config);
      for (const k of Object.keys(attr)) {
        (model as any)[k] = attr[k];
      }
      model.node.children = model.processChildren(node.children);

      return model.transform();
    }
  }
}
