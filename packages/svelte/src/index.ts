export { default as Renderer } from './Renderer.svelte';
export type { SerializedTag, RendererNode } from './types.js';
export { serialize, serializeTree } from './serialize.js';
export { setRegistry, getComponent } from './context.js';
export type { ComponentRegistry } from './context.js';
