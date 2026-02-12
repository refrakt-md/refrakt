import { Newable } from '@refrakt-md/types';

export { Newable };

export interface Abstract<T> {
  prototype: T;
}

export interface Constructor<T> extends Newable<T> {
  name?: string;
}

export interface Metadata<T> {
  mutate(fn: (data: T) => T): void;

  read(inherit?: boolean): T;
}

export type ClassDecorator<T> = <C extends Newable<T>>(target: C) => C;

export type PropertyDecorator<T> = <K extends string, C extends Record<K, T>>(
  target: C, propertyKey: K) => void;

export type MethodDecorator<T> = <K extends string, C extends Record<K, T>>(
  target: C, propertyKey: K, descriptor: PropertyDescriptor) => void;

export type ParameterDecorator = (target: any, propertyKey: string, parameterIndex: number) => void;

export interface PropertyDecoratorConfig {
  target: any;
  propertyKey: string;
}

export interface MethodDecoratorConfig extends PropertyDecoratorConfig {
  descriptor: PropertyDescriptor;
}

export interface ParameterDecoratorConfig extends PropertyDecoratorConfig {
  parameterIndex: number;
}
