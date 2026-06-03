// The engine
export { createTransform } from './engine.js';

// Layout transform
export { layoutTransform } from './layout.js';

// Computed content builders
export { buildBreadcrumb, buildToc, buildPrevNext, buildVersionSwitcher } from './computed.js';

// Configuration types
export type { ThemeConfig, RuneConfig, StructureEntry, TintTokens, TintDefinition, BgPresetDefinition, LayoutPrimitive, BlockDef, MetaField, LayoutEntry } from './types.js';
export type { LayoutConfig, LayoutSlot, LayoutPageData, ComputedContent, LayoutStructureEntry } from './types.js';

// Re-export serialized tree types for convenience
export type { SerializedTag, RendererNode } from '@refrakt-md/types';

// Contract generation
export { generateStructureContract } from './contracts.js';
export type { StructureContract, RuneContract } from './contracts.js';

// Helpers (useful for theme authors building custom transforms)
export { toKebabCase, fromKebabCase, isTag, makeTag, findMeta, findByDataName, nonMetaChildren, readMeta, parseFields, readField, extractComponentInterface, resolveGap, ratioToFr, resolveOffset, resolveValign, parsePlacement } from './helpers.js';
export type { ComponentInterface } from './helpers.js';

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

// GitHub source URL builder (SPEC-078) — used by file-ref to produce
// deep-link "View source" URLs from a site's `repoUrl` + `repoBranch`.
export { buildGithubBlobUrl, formatLineAnchor } from './github-url.js';

// Token contract merging (SPEC-048) — deep-merge PartialTokenContract / ThemeTokensConfig
export { mergeTokenContracts, mergeThemeTokensConfigs } from './token-merge.js';

// Token stylesheet generation (SPEC-048) — emit :root + mode CSS from a config
export {
	generateTokenStylesheet,
	generateThemeStylesheet,
	generateScopedTintStylesheet,
	tokenPathToCssVar,
} from './token-stylesheet.js';
export type { GenerateStylesheetOptions } from './token-stylesheet.js';

// Token config validation (SPEC-048) — runtime checks against the contract shape
export { validateThemeTokensConfig, formatTokenValidationErrors } from './token-validate.js';
export type { TokenValidationError, TokenValidationResult } from './token-validate.js';

// Layout configs
export { defaultLayout, docsLayout, blogArticleLayout, planLayout } from './layouts.js';

// Provenance tracking
export type { RuneProvenance } from './provenance.js';

// Config assembly
export { assembleThemeConfig } from './assemble.js';
export type { AssembleInput, AssembleResult } from './assemble.js';

// Route rules
export { matchRouteRule } from './route-rules.js';

// Serialization
export { serialize, serializeTree } from './serialize.js';

// Adapter utilities (shared across Astro, Nuxt, Next.js, Eleventy)
export { renderPage, hasMatchingRunes, extractSeoData, seoToHtml, escapeAttr, CORE_PACKAGES } from './adapter.js';
export type { AdapterTheme, RenderPageInput, OgMeta, PageSeo, SeoInput, SeoData, SeoToHtmlOptions } from './adapter.js';

