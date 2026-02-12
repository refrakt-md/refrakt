import { getContext, setContext } from 'svelte';
import type { Component } from 'svelte';

export type ComponentRegistry = Record<string, Component<any>>;
export type ElementOverrides = Record<string, Component<any>>;

const REGISTRY_KEY = Symbol('refrakt-registry');
const ELEMENT_OVERRIDES_KEY = Symbol('refrakt-element-overrides');

/** Set the component registry in Svelte context. Call during component init (e.g. in a layout). */
export function setRegistry(registry: ComponentRegistry): void {
	setContext(REGISTRY_KEY, registry);
}

/** Look up a component by its typeof name from the context registry. */
export function getComponent(typeName: string): Component<any> | undefined {
	return getContext<ComponentRegistry>(REGISTRY_KEY)?.[typeName];
}

/** Set theme-global element overrides in Svelte context. */
export function setElementOverrides(overrides: ElementOverrides): void {
	setContext(ELEMENT_OVERRIDES_KEY, overrides);
}

/** Get theme-global element overrides from Svelte context. */
export function getElementOverrides(): ElementOverrides | undefined {
	return getContext<ElementOverrides>(ELEMENT_OVERRIDES_KEY);
}
