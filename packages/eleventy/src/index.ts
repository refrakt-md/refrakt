// Plugin
export { refraktPlugin } from './plugin.js';

// Data file factory
export { createDataFile } from './data.js';
export type { EleventyPageData } from './data.js';

// Behaviors
export { hasInteractiveRunes } from './behaviors.js';

// Site-level token-overrides CSS (SPEC-048 + SPEC-056). Build-time helper:
// composes the CSS and writes it to a file the consumer's eleventy.config.js
// can passthrough-copy.
export { writeSiteTokensCss, getUsedCssCopyMap, getUsedCssImports } from './tokens.js';

// Types
export type { EleventyTheme, RefraktEleventyOptions } from './types.js';
