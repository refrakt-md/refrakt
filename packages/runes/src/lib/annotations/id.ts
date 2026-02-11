import { Config, Node } from '@markdoc/markdoc';
import { Annotation } from './annotation.js';
import { propertyDecorator } from './decoration.js';
import { generateIdIfMissing } from '../../util.js';

export interface IdOptions {
  generate: boolean;
}

export class GeneratedAttributeAnnotation<T> extends Annotation {
  constructor(
    private target: any,
    public propertyKey: string,
  ) { super(); }

  create(node: Node, config: Config): void {
    this.target[this.propertyKey] = this.generate(node, config);
  }

  protected generate(node: Node, config: Config): T {
    throw Error('generate method not implemented');
  }
}

export class IdAnnotation extends GeneratedAttributeAnnotation<string> {
  constructor(
    target: any,
    propertyKey: string,
    private options: IdOptions,
  ) { super(target, propertyKey); }

  generate(node: Node, config: Config): string {
    if (this.options.generate) {
      generateIdIfMissing(node, config);
    }
    return node.attributes.id;
  }
}

export function id(options: IdOptions) {
  return propertyDecorator<string>(({ target, propertyKey }) => new IdAnnotation(target, propertyKey, options));
}
