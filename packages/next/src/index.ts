// Rendering
export { renderPage } from './render.js';
export type { RenderPageInput } from './render.js';
export { RefraktContent } from './RefraktContent.js';

// SEO
export { buildMetadata, buildJsonLd } from './metadata.js';
export type { RefraktMetadataInput } from './metadata.js';

// Content loading helpers
export { buildUrlFromParams } from './loader.js';
export type { PageParams } from './loader.js';

// Behaviors (server-side detection only)
export { hasInteractiveRunes } from './behaviors.js';

// Site-level token-overrides CSS (SPEC-048 + SPEC-056). Async helper consumers
// call at module-scope in `app/layout.tsx` and inline via `<style />`.
export { getSiteTokensCss } from './tokens.js';

// Tree-shaken per-rune CSS imports. Async helper returns the ordered list of
// module specifiers the consumer should import in `app/layout.tsx` (via
// generated code or a pre-build script).
export { getUsedCssImports } from './tokens.js';

// Pipeline-stats summary writer — matches the SvelteKit reference's build
// output across the refrakt stack.
export { printPipelineSummary } from './tokens.js';

// Pre-configured loader factory — typed shorthand around createRefraktLoader
// for the common Next.js case (configPath + site + variables + security).
export { createNextLoader } from './tokens.js';

// Types
export type { NextTheme } from './types.js';
