import type { SchemaAttribute } from '@markdoc/markdoc';
import { Annotation } from './annotation.js';
import { propertyDecorator } from './decoration.js';

export type AttributeAnnotationOptions = Omit<SchemaAttribute, 'default'>;

export class AttributeAnnotation extends Annotation {
  constructor(
    private target: any,
    public propertyKey: string,
    private options: AttributeAnnotationOptions,
  ) { super(); }

  get schema(): SchemaAttribute {
    return this.options;
  }
}

export function attribute(options: AttributeAnnotationOptions) {
  return propertyDecorator(({ target, propertyKey }) => new AttributeAnnotation(target, propertyKey, options));
}
