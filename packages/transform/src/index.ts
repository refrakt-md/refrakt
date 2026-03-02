// The engine
export { createTransform } from './engine.js';

// Layout transform
export { layoutTransform } from './layout.js';

// Computed content builders
export { buildBreadcrumb, buildToc, buildPrevNext, buildVersionSwitcher } from './computed.js';

// Configuration types
export type { ThemeConfig, RuneConfig, StructureEntry } from './types.js';
export type { LayoutConfig, LayoutSlot, LayoutPageData, ComputedContent, LayoutStructureEntry } from './types.js';

// Re-export serialized tree types for convenience
export type { SerializedTag, RendererNode } from '@refrakt-md/types';

// Contract generation
export { generateStructureContract } from './contracts.js';
export type { StructureContract, RuneContract } from './contracts.js';

// Helpers (useful for theme authors building custom transforms)
export { isTag, makeTag, findMeta, findByDataName, nonMetaChildren, readMeta } from './helpers.js';

// HTML rendering
export { renderToHtml } from './html.js';
export type { RenderOptions } from './html.js';

// Validation
export { validateThemeConfig, validateManifest } from './validate.js';
export type { ValidationResult, ValidationError, ValidationWarning } from './validate.js';

// Selector extraction
export { extractSelectors } from './selectors.js';
