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
    return ofInstance(this, annotations(ctr).read(inherit));
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
    this: StaticThis<T>, ctr: Function | Constructor<any>, inherit?: boolean): boolean
  {
    return ofInstance(this, annotations(ctr).read(inherit)).length > 0;
  }
}
