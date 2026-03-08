// The engine
export { createTransform } from './engine.js';

// Layout transform
export { layoutTransform } from './layout.js';

// Computed content builders
export { buildBreadcrumb, buildToc, buildPrevNext, buildVersionSwitcher } from './computed.js';

// Configuration types
export type { ThemeConfig, RuneConfig, StructureEntry, TintTokenSet, TintDefinition, BgPresetDefinition } from './types.js';
export type { LayoutConfig, LayoutSlot, LayoutPageData, ComputedContent, LayoutStructureEntry } from './types.js';

// Re-export serialized tree types for convenience
export type { SerializedTag, RendererNode } from '@refrakt-md/types';

// Contract generation
export { generateStructureContract } from './contracts.js';
export type { StructureContract, RuneContract } from './contracts.js';

// Helpers (useful for theme authors building custom transforms)
export { isTag, makeTag, findMeta, findByDataName, nonMetaChildren, readMeta, resolveGap, ratioToFr, resolveOffset, resolveValign, parsePlacement } from './helpers.js';

// HTML rendering
export { renderToHtml } from './html.js';
export type { RenderOptions } from './html.js';

// Validation
export { validateThemeConfig, validateManifest } from './validate.js';
export type { ValidationResult, ValidationError, ValidationWarning } from './validate.js';

// Selector extraction
export { extractSelectors } from './selectors.js';

// Theme config merging
export { mergeThemeConfig, applyRuneExtensions } from './merge.js';
export type { ThemeConfigOverrides, RuneConfigExtension } from './merge.js';

// Layout configs
export { defaultLayout, docsLayout, blogArticleLayout } from './layouts.js';

// Provenance tracking
export type { RuneProvenance } from './provenance.js';

// Config assembly
export { assembleThemeConfig } from './assemble.js';
export type { AssembleInput, AssembleResult } from './assemble.js';
