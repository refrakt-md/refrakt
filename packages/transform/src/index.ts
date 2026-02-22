// The engine
export { createTransform } from './engine.js';

// Configuration types
export type { ThemeConfig, RuneConfig, StructureEntry } from './types.js';

// Re-export serialized tree types for convenience
export type { SerializedTag, RendererNode } from '@refrakt-md/types';

// Contract generation
export { generateStructureContract } from './contracts.js';
export type { StructureContract, RuneContract } from './contracts.js';

// Helpers (useful for theme authors building custom transforms)
export { isTag, makeTag, findMeta, findByDataName, nonMetaChildren, readMeta } from './helpers.js';
