// The engine
export { createTransform } from './engine.js';

// Configuration types
export type { ThemeConfig, RuneConfig, StructureEntry } from './types.js';

// Re-export serialized tree types for convenience
export type { SerializedTag, RendererNode } from '@refrakt-md/types';

// Helpers (useful for theme authors building custom transforms)
export { isTag, makeTag, findMeta, findByDataName, nonMetaChildren, readMeta } from './helpers.js';

// HTML rendering
export { renderToHtml } from './html.js';
export type { RenderOptions } from './html.js';

// Selector extraction
export { extractSelectors } from './selectors.js';
