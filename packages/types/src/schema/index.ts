import { ComponentType, Newable } from "../interfaces.js";

export class Type<T extends ComponentType<object>> {
  constructor(
    public readonly name: string,
    private schemaCtr: Newable<T["schema"]>,
    public context: Record<string, string> = {},
  ) {}

  create() {
    return new this.schemaCtr();
  }
}

export class TypeFactory<TSchema extends object> {
  constructor(private schema: Newable<TSchema>) {}

  defineType<T extends ComponentType<TSchema>>(name: string, context: Record<string, string> = {}) {
    return new Type<T>(name, this.schema, context);
  }
}

export function useSchema<T extends object>(schema: Newable<T>) {
  return new TypeFactory(schema);
}
