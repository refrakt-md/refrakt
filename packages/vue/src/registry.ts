import type { Component } from 'vue';

export type ComponentRegistry = Record<string, Component>;

/**
 * Default component registry — empty by default.
 *
 * All runes render through the identity transform + @refrakt-md/behaviors.
 * Theme authors register component overrides for runes that need
 * custom Vue rendering.
 */
export const registry: ComponentRegistry = {};
