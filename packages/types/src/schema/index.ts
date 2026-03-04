import { Newable } from "../interfaces.js";

export class Type<TSchema extends object = object> {
  constructor(
    public readonly name: string,
    private schemaCtr: Newable<TSchema>,
    public context: Record<string, string> = {},
  ) {}

  create() {
    return new this.schemaCtr();
  }
}

export class TypeFactory<TSchema extends object> {
  constructor(private schema: Newable<TSchema>) {}

  defineType(name: string, context: Record<string, string> = {}) {
    return new Type<TSchema>(name, this.schema, context);
  }
}

export function useSchema<T extends object>(schema: Newable<T>) {
  return new TypeFactory(schema);
}
