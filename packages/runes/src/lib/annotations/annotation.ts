import { annotations, parameters, propMetadata } from './decoration.js';
import { Constructor } from './interfaces.js';

export type StaticThis<T> = { new (...args: any[]): T };

function ofInstance<T>(cls: StaticThis<T>, annotations: any[] = []) {
  return annotations.filter(a => a instanceof cls);
}

export class Annotation {
  public static onClass<T extends Annotation>(
    this: StaticThis<T>, ctr: Function | Constructor<any>, inherit?: boolean): T[]
  {
    if (!inherit) {
      return ofInstance(this, annotations(ctr).read(false));
    }
    // Walk prototype chain explicitly and merge annotations from all ancestors.
    // Reflect.getMetadata returns only the first match, which misses parent
    // annotations when a child class defines its own decorators.
    const seen = new Set<any>();
    const all: any[] = [];
    let current: any = ctr;
    while (current && current !== Function.prototype) {
      for (const a of (annotations(current).read(false) || [])) {
        if (!seen.has(a)) {
          seen.add(a);
          all.push(a);
        }
      }
      current = Object.getPrototypeOf(current);
    }
    return ofInstance(this, all);
  }

  public static onProperty<T extends Annotation>(
    this: StaticThis<T>, ctr: Function | Constructor<any>, key: string): T[]
  {
    return ofInstance(this, propMetadata(ctr).read(true)[key]);
  }

  public static onParameters<T extends Annotation>(
    this: StaticThis<T>, ctr: Function | Constructor<any>, methodName?: string): T[]
  {
    return ofInstance(this, methodName
      ? parameters(ctr, methodName).read(true)
      : parameters(ctr.constructor).read(true)
    );
  }

  public static existsOnClass<T extends Annotation>(
    this: StaticThis<T> & typeof Annotation, ctr: Function | Constructor<any>, inherit?: boolean): boolean
  {
    return this.onClass(ctr, inherit).length > 0;
  }
}
