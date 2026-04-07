import type { ComponentType } from 'react';

export type ComponentRegistry = Record<string, ComponentType<any>>;

/**
 * Default component registry — empty by default.
 *
 * All runes render through the identity transform + @refrakt-md/behaviors.
 * Theme authors register component overrides for runes that need
 * custom React rendering.
 */
export const registry: ComponentRegistry = {};
