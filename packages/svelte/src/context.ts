import { getContext, setContext } from 'svelte';
import type { Component } from 'svelte';

export type ComponentRegistry = Record<string, Component<any>>;

const REGISTRY_KEY = Symbol('refract-registry');

/** Set the component registry in Svelte context. Call during component init (e.g. in a layout). */
export function setRegistry(registry: ComponentRegistry): void {
	setContext(REGISTRY_KEY, registry);
}

/** Look up a component by its typeof name from the context registry. */
export function getComponent(typeName: string): Component<any> | undefined {
	return getContext<ComponentRegistry>(REGISTRY_KEY)?.[typeName];
}
