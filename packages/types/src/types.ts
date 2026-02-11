import { ComponentType } from "./interfaces.js";
import { Type } from "./schema/index.js";

export function trimNamespace(name: string) {
  return name.includes(':') ? name.split(':').at(-1) : name;
}

export function extractType(name: string) {
  return trimNamespace(name);
}

export function extractProperty(name: string) {
  const properties = name.split(' ');

  const defaultProperty = properties.find(n => !n.includes(':'));
  if (!defaultProperty) {
    return trimNamespace(properties[0]);
  }
  return defaultProperty;
}

export class PropertyNode<TElem, TSchema> {
  parent: TypeNode<TElem, any> | undefined;

  constructor(
    public propertyName: string,
    public element: TElem,
    public data: TSchema
  ) {}

  *walk(): Generator<PropertyNode<TElem, TSchema>> {
    yield this;
  }
}

export class TypeNode<TElem, TSchema extends object> extends PropertyNode<TElem, TSchema> {
  constructor(
    propertyName: string,
    element: TElem,
    data: TSchema,
    public propertyNodes: PropertyNode<TElem, any>[] = [],
    public refs: Record<string, TElem> = {},
  ) { super(propertyName, element, data); }

  *walk(): Generator<PropertyNode<TElem, TSchema>> {
    yield this;
    for (const p of this.propertyNodes) {
      yield* p.walk();
    }
  }

  addProperty(node: PropertyNode<TElem, any>) {
    this.propertyNodes.push(node);
    node.parent = this;
    const k = node.propertyName;
    if (k in this.data) {
      if (Array.isArray((this.data as any)[k])) {
        (this.data as any)[k].push(node.data);
      } else {
        (this.data as any)[k] = node.data;
      }
    }
  }

  property<TName extends keyof TSchema>(name: TName): PropertyNode<TElem, TSchema[TName]>[] {
    return this.propertyNodes.filter(p => p.propertyName === name);
  }
}


export abstract class AbstractElementWrapper<T> {
  constructor(public readonly elem: T) {}

  abstract readonly text: string;

  abstract readonly attributes: Record<string, any>;

  abstract readonly children: AbstractElementWrapper<T>[];

  get type(): string | undefined {
    return this.attributes.typeof ? extractType(this.attributes.typeof) : undefined;
  }

  get ref(): string | undefined {
    return this.attributes['data-name'];
  }

  get property() : string | undefined {
    return this.attributes.property ? extractProperty(this.attributes.property) : undefined;
  }

  get value(): string | undefined {
    if (this.attributes.href) {
      return this.attributes.href;
    }
    if (this.attributes.src) {
      return this.attributes.src;
    }
    if (this.attributes.content) {
      return this.attributes.content;
    }
    return this.text;
  }

  *walk(): Generator<AbstractElementWrapper<T>> {
    yield this;
    for (const c of this.children) {
      yield *c.walk();
    }
  }

  parseStrict<U extends ComponentType<object>>(type: Type<U>, schema: Record<string, Type<any>>): TypeNode<T, U["schema"]> {
    if (!this.type) {
      throw Error('Not a type');
    }

    if (!schema[this.type]) {
      throw Error('Type not in schema');
    }

    if (schema[this.type] !== type) {
      throw Error('Given type is not same as one found in element');
    }

    const node = this.process(schema);

    return node;
  }

  process(
    schema: Record<string, Type<any>>,
    parentNode: TypeNode<T, any> | undefined = undefined
  ) {
    let node: any = undefined;
    const property = this.property;

    if (this.type) {
      if (schema[this.type]) {
        node = new TypeNode<T, any>(property || '', this.elem, schema[this.type].create());
      }
    }

    if (property && parentNode) {
      if (property in parentNode.data) {
        const value = node ? node.data : this.value;
        parentNode.addProperty(node ? node : new PropertyNode(property, this.elem, value));
      }
    }

    if (this.ref && parentNode) {
      parentNode.refs[this.ref] = this.elem;
    }

    for (const c of this.children) {
      c.process(schema, node ? node : parentNode);
    }

    return node;
  }
}
